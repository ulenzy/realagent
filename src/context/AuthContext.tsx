import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInAnonymously, 
  signOut, 
  User as FirebaseUser,
  linkWithPopup
} from 'firebase/auth';
import { auth, googleProvider, facebookProvider } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove, collection, query, where, addDoc, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { User, ListingRequest, Transaction } from '../types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  listingRequests: ListingRequest[];
  savedProperties: string[];
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  toggleSavedProperty: (id: string) => Promise<void>;
  addListingRequest: (request: ListingRequest) => Promise<void>;
  updateListingRequest: (id: string, updates: Partial<ListingRequest>) => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  addTransaction: (transaction: Transaction) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLocalGuest, setIsLocalGuest] = useState(() => localStorage.getItem('isLocalGuest') === 'true');
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listingRequests, setListingRequests] = useState<ListingRequest[]>([]);
  const [savedProperties, setSavedProperties] = useState<string[]>([]);
  const unsubscribeUserRef = React.useRef<(() => void) | null>(null);
  const unsubscribeListingsRef = React.useRef<(() => void) | null>(null);

  useEffect(() => {
    if (isLocalGuest) {
      const cachedUser = localStorage.getItem('localGuestUser');
      if (cachedUser) {
        const parsed = JSON.parse(cachedUser);
        setUser(parsed);
        setSavedProperties(parsed.savedProperties || []);
      } else {
        const guestUser: User = {
          id: 'guest_local_user',
          name: 'Guest User',
          firstName: 'Guest',
          lastName: 'User',
          email: '',
          phoneNumber: '',
          isAgent: false,
          isSubscriber: false,
          kycStatus: 'None',
          kycDocuments: [],
          profileScore: 0,
          tokens: 100,
          savedProperties: [],
          role: 'Buyer',
          onboardingCompleted: false,
          isGuest: true,
        } as any;
        setUser(guestUser);
        setSavedProperties([]);
        localStorage.setItem('localGuestUser', JSON.stringify(guestUser));
      }
      setFirebaseUser({ uid: 'guest_local_user', isAnonymous: true, email: null } as any);
      const localListings = localStorage.getItem('localGuestListings');
      if (localListings) {
        setListingRequests(JSON.parse(localListings));
      } else {
        setListingRequests([]);
      }
      setLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);
      setError(null);
      if (fUser) {
        // Listen to User Profile
        const userDocRef = doc(db, 'users', fUser.uid);
        unsubscribeUserRef.current = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as User;
            setUser(userData);
            setSavedProperties(userData.savedProperties || []);
          } else {
            // Initial profile creation
            const nameParts = (fUser.displayName || '').trim().split(/\s+/);
            const firstName = nameParts[0] || '';
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
            const newUser: User = {
              id: fUser.uid,
              name: fUser.displayName || '',
              firstName: firstName,
              lastName: lastName,
              email: fUser.email || '',
              phoneNumber: fUser.phoneNumber || '',
              isAgent: false,
              isSubscriber: false,
              kycStatus: 'None',
              kycDocuments: [],
              profileScore: 0,
              tokens: 100, // Initial tokens
              savedProperties: [],
              role: 'Buyer',
              onboardingCompleted: false,
            } as any;
            setDoc(userDocRef, newUser);
          }
          setLoading(false);
        }, (err) => {
          console.error("User snapshot error:", err);
          setError(err.message);
          setLoading(false);
        });

        // Listen to User's Listing Requests
        const listingsQuery = query(collection(db, 'properties'), where('ownerId', '==', fUser.uid));
        unsubscribeListingsRef.current = onSnapshot(listingsQuery, (snapshot) => {
          const listings = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as any));
          setListingRequests(listings);
        }, (err) => {
          console.error("Listings snapshot error:", err);
        });
      } else {
        if (unsubscribeUserRef.current) unsubscribeUserRef.current();
        if (unsubscribeListingsRef.current) unsubscribeListingsRef.current();
        setUser(null);
        setListingRequests([]);
        setSavedProperties([]);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserRef.current) unsubscribeUserRef.current();
      if (unsubscribeListingsRef.current) unsubscribeListingsRef.current();
    };
  }, [isLocalGuest]);

  const setupLocalGuest = () => {
    const guestUser: User = {
      id: 'guest_local_user',
      name: 'Guest User',
      firstName: 'Guest',
      lastName: 'User',
      email: '',
      phoneNumber: '',
      isAgent: false,
      isSubscriber: false,
      kycStatus: 'None',
      kycDocuments: [],
      profileScore: 0,
      tokens: 100,
      savedProperties: [],
      role: 'Buyer',
      onboardingCompleted: false,
      isGuest: true,
    } as any;
    setUser(guestUser);
    setSavedProperties([]);
    localStorage.setItem('localGuestUser', JSON.stringify(guestUser));
    setFirebaseUser({ uid: 'guest_local_user', isAnonymous: true, email: null } as any);
    setListingRequests([]);
    setIsLocalGuest(true);
    localStorage.setItem('isLocalGuest', 'true');
    setLoading(false);
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google Sign In Error:', error);
      throw error;
    }
  };

  const signInWithFacebook = async () => {
    try {
      await signInWithPopup(auth, facebookProvider);
    } catch (error) {
      console.error('Facebook Sign In Error:', error);
      throw error;
    }
  };

  const signInAsGuest = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.warn('Firebase signInAnonymously failed, falling back to local guest session:', error);
      setupLocalGuest();
    }
  };

  const logout = async () => {
    try {
      if (isLocalGuest) {
        setIsLocalGuest(false);
        localStorage.removeItem('isLocalGuest');
        localStorage.removeItem('localGuestUser');
        localStorage.removeItem('localGuestListings');
        localStorage.removeItem('localGuestTransactions');
        setUser(null);
        setFirebaseUser(null);
        setListingRequests([]);
        setSavedProperties([]);
        setLoading(false);
        return;
      }
      await signOut(auth);
    } catch (error) {
      console.error('Logout Error:', error);
      throw error;
    }
  };

  const toggleSavedProperty = async (id: string) => {
    if (!user) return;
    if (isLocalGuest) {
      const isSaved = savedProperties.includes(id);
      const updatedSavedProperties = isSaved 
        ? savedProperties.filter(savedId => savedId !== id)
        : [...savedProperties, id];
      setSavedProperties(updatedSavedProperties);
      const updatedUser = { ...user, savedProperties: updatedSavedProperties };
      setUser(updatedUser);
      localStorage.setItem('localGuestUser', JSON.stringify(updatedUser));
      return;
    }
    const userRef = doc(db, 'users', user.id);
    const isSaved = savedProperties.includes(id);
    try {
      await updateDoc(userRef, {
        savedProperties: isSaved ? arrayRemove(id) : arrayUnion(id)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
    }
  };

  const addListingRequest = async (request: ListingRequest) => {
    if (!user) return;
    if (isLocalGuest) {
      const updatedListings = [...listingRequests, { ...request, ownerId: user.id }];
      setListingRequests(updatedListings);
      localStorage.setItem('localGuestListings', JSON.stringify(updatedListings));
      return;
    }
    try {
      await setDoc(doc(db, 'properties', request.id), {
        ...request,
        ownerId: user.id
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `properties/${request.id}`);
    }
  };

  const updateListingRequest = async (id: string, updates: Partial<ListingRequest>) => {
    if (isLocalGuest) {
      const updatedListings = listingRequests.map(item => 
        item.id === id ? { ...item, ...updates } : item
      );
      setListingRequests(updatedListings);
      localStorage.setItem('localGuestListings', JSON.stringify(updatedListings));
      return;
    }
    try {
      await updateDoc(doc(db, 'properties', id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `properties/${id}`);
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    if (isLocalGuest) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('localGuestUser', JSON.stringify(updatedUser));
      return;
    }
    try {
      await updateDoc(doc(db, 'users', user.id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
    }
  };

  const addTransaction = async (transaction: Transaction) => {
    if (!user) return;
    if (isLocalGuest) {
      const updatedUser = {
        ...user,
        tokens: user.tokens + (transaction.type === 'Credit' ? transaction.amount : -transaction.amount)
      };
      setUser(updatedUser);
      localStorage.setItem('localGuestUser', JSON.stringify(updatedUser));
      
      const localTrans = localStorage.getItem('localGuestTransactions') || '[]';
      const parsedTrans = JSON.parse(localTrans);
      parsedTrans.push(transaction);
      localStorage.setItem('localGuestTransactions', JSON.stringify(parsedTrans));
      return;
    }
    try {
      // For this app, transactions might be in a subcollection or just update the tokens
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        tokens: user.tokens + (transaction.type === 'Credit' ? transaction.amount : -transaction.amount)
      });
      // Also potentially log the transaction document
      await addDoc(collection(db, `users/${user.id}/transactions`), transaction);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.id}/transactions`);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, firebaseUser, loading, error, listingRequests, savedProperties,
      signInWithGoogle, signInWithFacebook, signInAsGuest, logout,
      toggleSavedProperty, addListingRequest, updateListingRequest, updateUser, addTransaction
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
