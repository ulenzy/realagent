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
import { doc, getDoc, getDocs, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove, collection, query, where, addDoc, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { User, ListingRequest, Transaction, Property, ListingType, AgentTier, ROILevel, AreaTrend } from '../types';
import { TrustScoreEvent, calculateTrustScoreDelta } from '../lib/trustScore';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  listingRequests: ListingRequest[];
  platformListings: ListingRequest[];
  savedProperties: string[];
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signInWithGoogleMock: () => void;
  signInWithFacebookMock: () => void;
  logout: () => Promise<void>;
  toggleSavedProperty: (id: string) => Promise<void>;
  addListingRequest: (request: ListingRequest) => Promise<void>;
  updateListingRequest: (id: string, updates: Partial<ListingRequest>) => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  addTransaction: (transaction: Transaction) => Promise<void>;
  updateAgentTrustScore: (agentId: string, event: TrustScoreEvent) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLocalGuest, setIsLocalGuest] = useState(() => localStorage.getItem('isLocalGuest') === 'true');
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listingRequests, setListingRequests] = useState<ListingRequest[]>([]);
  const [platformListings, setPlatformListings] = useState<ListingRequest[]>([]);
  const [savedProperties, setSavedProperties] = useState<string[]>([]);
  const unsubscribeUserRef = React.useRef<(() => void) | null>(null);
  const unsubscribeListingsRef = React.useRef<(() => void) | null>(null);
  const unsubscribePlatformListingsRef = React.useRef<(() => void) | null>(null);

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
        const parsedListings = JSON.parse(localListings);
        setListingRequests(parsedListings);
        setPlatformListings(parsedListings.filter((l: any) => l.status === 'Agent Bidding'));
      } else {
        setListingRequests([]);
        setPlatformListings([]);
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

            if (userData.accountStatus === 'Suspended' || userData.accountStatus === 'Banned') {
              setTimeout(() => {
                logout().catch((err) => console.error("Auto-logout on suspension/ban failed:", err));
              }, 3000);
            }

            // Dynamically set up listingRequests subscription depending on role
            if (unsubscribeListingsRef.current) {
              unsubscribeListingsRef.current();
            }

            let listingsQuery;
            if (userData.role === 'Agent' || userData.role === 'Admin') {
              // Agents and Admins can view all listing requests in the platform
              listingsQuery = collection(db, 'listingRequests');
            } else {
              // Sellers/Buyers view their own listing requests
              listingsQuery = query(collection(db, 'listingRequests'), where('ownerId', '==', fUser.uid));
            }

            unsubscribeListingsRef.current = onSnapshot(listingsQuery, (snapshot) => {
              const listings = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              } as any));
              setListingRequests(listings);

              // Client-side expiry check for monthly fee expiration
              const nowISO = new Date().toISOString();
              listings.forEach(async (listing) => {
                if (listing.status === 'Approved' && listing.monthlyFeeExpiresAt && listing.monthlyFeeExpiresAt < nowISO) {
                  // update listing request status to Inactive and Monthly Unpaid
                  await updateListingRequest(listing.id, { status: 'Inactive', listingFeeStatus: 'Monthly Unpaid' });
                  
                  // update the promoted property document linked to this listingRequestId
                  if (!isLocalGuest) {
                    try {
                      const qProps = query(collection(db, 'properties'), where('listingRequestId', '==', listing.id));
                      const querySnapshot = await getDocs(qProps);
                      const promises = querySnapshot.docs.map(docSnap => 
                        updateDoc(doc(db, 'properties', docSnap.id), { status: 'Inactive' })
                      );
                      await Promise.all(promises);
                    } catch (err) {
                      console.error("Failed to mark property status as Inactive on Firestore:", err);
                    }
                  } else {
                    const guestProps = localStorage.getItem('localGuestProperties') || '[]';
                    const parsedProps = JSON.parse(guestProps);
                    const updatedProps = parsedProps.map((p: any) => 
                      p.listingRequestId === listing.id ? { ...p, status: 'Inactive' } : p
                    );
                    localStorage.setItem('localGuestProperties', JSON.stringify(updatedProps));
                    window.dispatchEvent(new Event('local_guest_properties_updated'));
                  }
                }
              });
            }, (err) => {
              console.error("Listings dynamic snapshot error:", err);
            });

            // Platform listings query (runs independently of user's own listings)
            if (unsubscribePlatformListingsRef.current) {
              unsubscribePlatformListingsRef.current();
            }

            const platformQuery = query(collection(db, 'listingRequests'), where('status', '==', 'Agent Bidding'));
            unsubscribePlatformListingsRef.current = onSnapshot(platformQuery, (snapshot) => {
              const pListings = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              } as any));
              setPlatformListings(pListings);
            }, (err) => {
              console.error("Platform listings snapshot error:", err);
            });
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
      } else {
        if (unsubscribeUserRef.current) unsubscribeUserRef.current();
        if (unsubscribeListingsRef.current) unsubscribeListingsRef.current();
        if (unsubscribePlatformListingsRef.current) unsubscribePlatformListingsRef.current();
        setUser(null);
        setListingRequests([]);
        setPlatformListings([]);
        setSavedProperties([]);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserRef.current) unsubscribeUserRef.current();
      if (unsubscribeListingsRef.current) unsubscribeListingsRef.current();
      if (unsubscribePlatformListingsRef.current) unsubscribePlatformListingsRef.current();
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
    setPlatformListings([]);
    setIsLocalGuest(true);
    localStorage.setItem('isLocalGuest', 'true');
    setLoading(false);
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (
        error?.code === 'auth/popup-closed-by-user' || 
        error?.message?.includes('popup-closed-by-user') ||
        error?.code === 'auth/popup-blocked' ||
        error?.message?.includes('popup-blocked') ||
        error?.code === 'auth/cancelled-popup-request' ||
        error?.message?.includes('cancelled-popup-request')
      ) {
        console.warn('Google Sign In popup was closed or blocked. Falling back to local Google user.');
        signInWithGoogleMock();
        return;
      }
      console.error('Google Sign In Error:', error);
      throw error;
    }
  };

  const signInWithGoogleMock = () => {
    const googleUser: User = {
      id: 'google_local_user',
      name: 'Google User',
      firstName: 'Google',
      lastName: 'User',
      email: 'user@gmail.com',
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
    } as any;
    setUser(googleUser);
    setSavedProperties([]);
    localStorage.setItem('localGuestUser', JSON.stringify(googleUser));
    setFirebaseUser({ uid: 'google_local_user', isAnonymous: false, email: 'user@gmail.com', displayName: 'Google User' } as any);
    setListingRequests([]);
    setPlatformListings([]);
    setIsLocalGuest(true);
    localStorage.setItem('isLocalGuest', 'true');
    setLoading(false);
  };

  const signInWithFacebook = async () => {
    try {
      await signInWithPopup(auth, facebookProvider);
    } catch (error: any) {
      if (
        error?.code === 'auth/popup-closed-by-user' || 
        error?.message?.includes('popup-closed-by-user') ||
        error?.code === 'auth/popup-blocked' ||
        error?.message?.includes('popup-blocked') ||
        error?.code === 'auth/cancelled-popup-request' ||
        error?.message?.includes('cancelled-popup-request')
      ) {
        console.warn('Facebook Sign In popup was closed or blocked. Falling back to local Facebook user.');
        signInWithFacebookMock();
        return;
      }
      console.error('Facebook Sign In Error:', error);
      throw error;
    }
  };

  const signInWithFacebookMock = () => {
    const facebookUser: User = {
      id: 'facebook_local_user',
      name: 'Facebook User',
      firstName: 'Facebook',
      lastName: 'User',
      email: 'user@facebook.com',
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
    } as any;
    setUser(facebookUser);
    setSavedProperties([]);
    localStorage.setItem('localGuestUser', JSON.stringify(facebookUser));
    setFirebaseUser({ uid: 'facebook_local_user', isAnonymous: false, email: 'user@facebook.com', displayName: 'Facebook User' } as any);
    setListingRequests([]);
    setPlatformListings([]);
    setIsLocalGuest(true);
    localStorage.setItem('isLocalGuest', 'true');
    setLoading(false);
  };

  const signInAsGuest = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.warn('Firebase signInAnonymously failed, falling back to local guest session:', error);
      setupLocalGuest();
    }
  };

  async function logout() {
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
        setPlatformListings([]);
        setSavedProperties([]);
        setLoading(false);
        return;
      }
      await signOut(auth);
    } catch (error) {
      console.error('Logout Error:', error);
      throw error;
    }
  }

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
      setPlatformListings(updatedListings.filter(item => item.status === 'Agent Bidding'));
      localStorage.setItem('localGuestListings', JSON.stringify(updatedListings));
      return;
    }
    try {
      await setDoc(doc(db, 'listingRequests', request.id), {
        ...request,
        ownerId: user.id
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `listingRequests/${request.id}`);
    }
  };

  const promoteToProperty = async (listingRequest: ListingRequest) => {
    // 1. Set dates
    const nowStr = new Date().toISOString();
    const expiresAtStr = new Date(Date.now() + 30 * 86400000).toISOString();

    // 2. Location
    const parts = (listingRequest.location || '').split(',');
    const area = parts[0]?.trim() || '';
    const state = parts[1]?.trim() || '';

    // 3. Fetch agent info if not in guest mode
    let agentObj = {
      id: listingRequest.assignedAgentId || 'a1',
      name: 'Professional Agent',
      verified: true,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ProfessionalAgent',
      trustScore: 95,
      rating: 5,
      specialization: 'Verified Agent',
      responseTime: '< 30 mins',
      propertiesSold: 12,
      agentTier: 'Platform Agent' as AgentTier
    };

    if (listingRequest.assignedAgentId && !isLocalGuest) {
      try {
        const agentDoc = await getDoc(doc(db, 'users', listingRequest.assignedAgentId));
        if (agentDoc.exists()) {
          const u = agentDoc.data();
          agentObj = {
            id: u.id,
            name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Professional Agent',
            verified: u.kycStatus === 'Verified',
            avatar: u.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name || 'Musa'}`,
            trustScore: u.profileScore || 85,
            rating: u.rating || 5,
            specialization: u.specializationArea || 'Real Estate Consultant',
            responseTime: u.onlineHours || 'Within 1 hour',
            propertiesSold: u.propertiesSold || 12,
            agentTier: u.agentTier || 'Platform Agent'
          };
        }
      } catch (err) {
        console.error("Failed to fetch agent profile for property promotion:", err);
      }
    }

    const newPropertyData = {
      title: listingRequest.title || 'Approved Property',
      type: listingRequest.type || 'House',
      price: listingRequest.price || 0,
      listingType: 'Sale' as ListingType,
      sizeSqm: 850,
      bedrooms: 5,
      bathrooms: 6,
      estateName: 'Golden Gate Estate',
      location: {
        state: state || 'Lagos',
        city: area || 'Ikeja',
        area: area || 'Ikeja',
        address: listingRequest.googlePinLink || `${area}, ${state}`
      },
      image: '/regenerated_image_1778928319302.png',
      gallery: [
        '/regenerated_image_1778928319302.png',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800'
      ],
      agent: agentObj,
      roiPotential: 'High' as ROILevel,
      developmentInsight: {
        infrastructureGrowth: 'High' as ROILevel,
        areaTrend: 'Emerging Hot Zone' as AreaTrend,
        nearbyKeyAdditions: ['Primary School', 'Shopping Mall'],
        expectedAppreciation: '20% Annually',
        aiSummary: 'This location is experiencing rapid infrastructure expansion and solid investment stability.',
        score: 85
      },
      estateIntelligence: {
        infrastructureScore: 80,
        securityRating: 90,
        powerReliability: 85,
        roadAccessibility: 85,
        internetCoverage: 80,
        waterAvailability: 85,
        appreciationTrend: 18,
        rentalDemand: 8,
        livabilityScore: 85
      },
      aiInsights: [],
      amenities: ['Electricity', 'Security', 'Road Accessibility'],
      createdAt: nowStr,
      expiresAt: expiresAtStr,
      commission: listingRequest.commission || 5,
      acceptsDownPayment: listingRequest.acceptsDownPayment || false,
      listingRequirements: listingRequest.listingRequirements || {},
      listingRequestId: listingRequest.id,
      assignedAgentId: listingRequest.assignedAgentId || null,
      verificationFeePaid: listingRequest.verificationFeePaid || false
    };

    if (isLocalGuest) {
      const guestProps = localStorage.getItem('localGuestProperties') || '[]';
      const parsedProps = JSON.parse(guestProps);
      const guestPropDoc = { id: `prop-${Date.now()}`, ...newPropertyData };
      parsedProps.push(guestPropDoc);
      localStorage.setItem('localGuestProperties', JSON.stringify(parsedProps));
      window.dispatchEvent(new Event('local_guest_properties_updated'));
    } else {
      try {
        const newDocRef = doc(collection(db, 'properties'));
        await setDoc(newDocRef, newPropertyData);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'properties');
      }
    }
  };

  const updateListingRequest = async (id: string, updates: Partial<ListingRequest>) => {
    if (isLocalGuest) {
      const updatedListings = listingRequests.map(item => 
        item.id === id ? { ...item, ...updates } : item
      );
      setListingRequests(updatedListings);
      setPlatformListings(updatedListings.filter(item => item.status === 'Agent Bidding'));
      localStorage.setItem('localGuestListings', JSON.stringify(updatedListings));

      if (updates.status === 'Approved') {
        const listing = updatedListings.find(item => item.id === id);
        if (listing) {
          promoteToProperty(listing);
        }
      }
      return;
    }
    try {
      await updateDoc(doc(db, 'listingRequests', id), updates);

      if (updates.status === 'Approved') {
        const docRef = doc(db, 'listingRequests', id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const listingRequest = { id: snap.id, ...snap.data(), ...updates } as ListingRequest;
          await promoteToProperty(listingRequest);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `listingRequests/${id}`);
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

  const updateAgentTrustScore = async (agentId: string, event: TrustScoreEvent) => {
    if (isLocalGuest) {
      const currentScore = user?.id === agentId ? (user?.profileScore ?? 50) : 50;
      const dClosed = user?.id === agentId ? (user?.dealsClosedCount ?? 0) : 0;
      const delta = calculateTrustScoreDelta(event);
      const newScore = Math.max(0, Math.min(100, currentScore + delta));
      const updates: Partial<User> = { profileScore: newScore };
      if (newScore >= 90 && dClosed >= 25) {
        updates.commissionRate = 3;
      } else if (newScore >= 80 && dClosed >= 10) {
        updates.commissionRate = 4;
      } else {
        updates.commissionRate = 5;
      }
      if (user && user.id === agentId) {
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        localStorage.setItem('localGuestUser', JSON.stringify(updatedUser));
      }
      return;
    }

    try {
      const agentRef = doc(db, 'users', agentId);
      const agentSnap = await getDoc(agentRef);
      if (agentSnap.exists()) {
        const agentData = agentSnap.data();
        const currentScore = agentData.profileScore !== undefined ? agentData.profileScore : 50;
        const dClosed = agentData.dealsClosedCount || 0;
        const delta = calculateTrustScoreDelta(event);
        const newScore = Math.max(0, Math.min(100, currentScore + delta));
        
        const updates: any = { profileScore: newScore };
        if (newScore >= 90 && dClosed >= 25) {
          updates.commissionRate = 3;
        } else if (newScore >= 80 && dClosed >= 10) {
          updates.commissionRate = 4;
        } else {
          updates.commissionRate = 5;
        }

        await updateDoc(agentRef, updates);

        if (user && user.id === agentId) {
          setUser(prev => prev ? { ...prev, ...updates } : null);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${agentId}`);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, firebaseUser, loading, error, listingRequests, platformListings, savedProperties,
      signInWithGoogle, signInWithFacebook, signInAsGuest, signInWithGoogleMock, signInWithFacebookMock, logout,
      toggleSavedProperty, addListingRequest, updateListingRequest, updateUser, addTransaction, updateAgentTrustScore
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
