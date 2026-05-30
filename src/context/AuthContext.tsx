import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInAnonymously, 
  signOut, 
  User as FirebaseUser,
  linkWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider, facebookProvider } from '../lib/firebase';
import { doc, getDoc, getDocs, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove, collection, query, where, addDoc, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { sendNotification } from '../lib/notifications';
import { User, ListingRequest, Transaction, Property, ListingType, AgentTier, ROILevel, AreaTrend } from '../types';
import { TrustScoreEvent, calculateTrustScoreDelta } from '../lib/trustScore';
import { generateEstateIntelligence } from '../lib/estateIntelligence';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  listingRequests: ListingRequest[];
  platformListings: ListingRequest[];
  savedProperties: string[];
  isLocalGuest: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  signInWithGoogleMock: () => Promise<void>;
  signInWithFacebookMock: () => Promise<void>;
  logout: () => Promise<void>;
  toggleSavedProperty: (id: string) => Promise<void>;
  addListingRequest: (request: ListingRequest) => Promise<void>;
  updateListingRequest: (id: string, updates: Partial<ListingRequest>) => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  addTransaction: (transaction: Transaction) => Promise<void>;
  updateAgentTrustScore: (agentId: string, event: TrustScoreEvent) => Promise<void>;
}

export const DEFAULT_PREFERENCES = {
  theme: 'system' as const,
  notifications: {
    bidReceived: true,
    listingApproved: true,
    inspectionConfirmed: true,
    messageReceived: true,
    dealStatusUpdate: true,
    marketingUpdates: true,
  },
  language: 'en' as const,
  currency: 'NGN' as const,
  defaultSearchView: 'list' as const,
  defaultListingType: 'All' as const,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
    const unsubscribeAuth = onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);
      setError(null);
      if (fUser) {
        // Listen to User Profile
        const userDocRef = doc(db, 'users', fUser.uid);
        unsubscribeUserRef.current = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as User;
            const updatedUserData = { ...userData };
            let needsDbUpdate = false;

            const isTargetAdmin = 
              userData.email === 'uojemeni15@gmail.com' || 
              (userData.name && userData.name.toUpperCase().includes('LENZY'));

            if (isTargetAdmin && userData.role !== 'Admin') {
              updatedUserData.role = 'Admin';
              needsDbUpdate = true;
            }

            setUser(updatedUserData);
            setSavedProperties(updatedUserData.savedProperties || []);

            if (needsDbUpdate) {
              updateDoc(userDocRef, { role: 'Admin' }).catch(err => 
                console.error("Auto-assign Admin role error on Firestore:", err)
              );
            }

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
            sessionStorage.setItem('isSignUpFlow', 'true');
            const nameParts = (fUser.displayName || '').trim().split(/\s+/);
            const firstName = nameParts[0] || '';
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
            const isTargetAdmin = 
              (fUser.email || '').toLowerCase() === 'uojemeni15@gmail.com' || 
              (fUser.displayName || '').toUpperCase().includes('LENZY');
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
              role: isTargetAdmin ? 'Admin' : 'Buyer',
              onboardingCompleted: false,
              phoneVerified: false,
              preferences: DEFAULT_PREFERENCES,
              profileVisible: true,
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
  }, []);

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
        console.warn('Google Sign In popup was closed or blocked. Falling back to Google Mock.');
        await signInWithGoogleMock();
        return;
      }
      console.error('Google Sign In Error:', error);
      throw error;
    }
  };

  const signInWithGoogleMock = async () => {
    try {
      sessionStorage.setItem('isSignUpFlow', 'true');
      const userCredential = await signInAnonymously(auth);
      const fUser = userCredential.user;
      const userDocRef = doc(db, 'users', fUser.uid);
      const newUser: User = {
        id: fUser.uid,
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
        phoneVerified: false,
        preferences: DEFAULT_PREFERENCES,
        profileVisible: true,
      } as any;
      await setDoc(userDocRef, newUser);
    } catch (err: any) {
      console.error('Google Mock Sign In Error:', err);
      setError(err.message);
    }
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
        console.warn('Facebook Sign In popup was closed or blocked. Falling back to Facebook Mock.');
        await signInWithFacebookMock();
        return;
      }
      console.error('Facebook Sign In Error:', error);
      throw error;
    }
  };

  const signInWithFacebookMock = async () => {
    try {
      sessionStorage.setItem('isSignUpFlow', 'true');
      const userCredential = await signInAnonymously(auth);
      const fUser = userCredential.user;
      const userDocRef = doc(db, 'users', fUser.uid);
      const newUser: User = {
        id: fUser.uid,
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
        phoneVerified: false,
        preferences: DEFAULT_PREFERENCES,
        profileVisible: true,
      } as any;
      await setDoc(userDocRef, newUser);
    } catch (err: any) {
      console.error('Facebook Mock Sign In Error:', err);
      setError(err.message);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      console.error('Email sign in error:', err);
      throw err;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    try {
      sessionStorage.setItem('isSignUpFlow', 'true');
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const fUser = userCredential.user;
      await updateProfile(fUser, { displayName: name });
      
      const nameParts = name.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      
      const newUser: User = {
        id: fUser.uid,
        name: name,
        firstName: firstName,
        lastName: lastName,
        email: email,
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
        phoneVerified: false,
        preferences: DEFAULT_PREFERENCES,
        profileVisible: true,
      } as any;
      
      await setDoc(doc(db, 'users', fUser.uid), newUser);
    } catch (err) {
      console.error('Email sign up error:', err);
      throw err;
    }
  };

  async function logout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout Error:', error);
      throw error;
    }
  }

  const toggleSavedProperty = async (id: string) => {
    if (!user) return;
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
    const nowStr = new Date().toISOString();
    const expiresAtStr = new Date(Date.now() + 30 * 86400000).toISOString();

    const parts = (listingRequest.location || '').split(',');
    const area = parts[0]?.trim() || '';
    const state = parts[1]?.trim() || '';

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

    if (listingRequest.assignedAgentId) {
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

    let lat = 9.0765;
    let lng = 7.3986;
    const pin = listingRequest.listingRequirements?.locationPin;
    if (pin) {
      const coordsMatch = pin.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
      if (coordsMatch) {
        lat = parseFloat(coordsMatch[1]);
        lng = parseFloat(coordsMatch[2]);
      } else {
        const parts = pin.split(',');
        if (parts.length >= 2) {
          const latVal = parseFloat(parts[0]);
          const lngVal = parseFloat(parts[1]);
          if (!isNaN(latVal) && !isNaN(lngVal)) {
            lat = latVal;
            lng = lngVal;
          }
        }
      }
    }

    const marketIntelligence = await generateEstateIntelligence(
      lat,
      lng,
      listingRequest.type || 'House',
      listingRequest.listingType || 'Sale'
    );

    const priceNum = listingRequest.price || 0;
    const computedYield = listingRequest.listingType === 'Rent' 
      ? parseFloat(((priceNum * 0.08) / 12).toFixed(1))
      : 7.5;

    const newPropertyData = {
      title: listingRequest.title || 'Approved Property',
      type: listingRequest.type || 'House',
      propertyCategory: listingRequest.propertyCategory || 'Building',
      landDetails: listingRequest.landDetails,
      price: priceNum,
      listingType: listingRequest.listingType || ('Sale' as ListingType),
      sizeSqm: listingRequest.sizeSqm || 850,
      bedrooms: listingRequest.bedrooms || 5,
      bathrooms: listingRequest.bathrooms || 6,
      estateName: listingRequest.estateName || 'Golden Gate Estate',
      location: {
        state: state || 'Lagos',
        city: area || 'Ikeja',
        area: area || 'Ikeja',
        address: listingRequest.googlePinLink || `${area}, ${state}`,
        coordinates: { lat, lng }
      },
      image: '/regenerated_image_1778928319302.png',
      gallery: [
        '/regenerated_image_1778928319302.png',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800'
      ],
      agent: agentObj,
      roiPotential: (marketIntelligence.roiPotential || 'High') as ROILevel,
      developmentInsight: {
        infrastructureGrowth: (marketIntelligence.roiPotential || 'High') as ROILevel,
        areaTrend: (marketIntelligence.areaTrend || 'Emerging Hot Zone') as AreaTrend,
        nearbyKeyAdditions: marketIntelligence.nearbyKeyAdditions || ['Primary School', 'Shopping Mall'],
        expectedAppreciation: marketIntelligence.expectedAppreciation || '20% Annually',
        aiSummary: marketIntelligence.aiSummary || 'This location is experiencing rapid infrastructure expansion and solid investment stability.',
        score: marketIntelligence.infrastructureScore || 85
      },
      estateIntelligence: {
        infrastructureScore: marketIntelligence.infrastructureScore || 80,
        securityRating: marketIntelligence.securityRating || 90,
        powerReliability: marketIntelligence.powerReliability || 85,
        roadAccessibility: marketIntelligence.roadAccessibility || 85,
        internetCoverage: marketIntelligence.internetCoverage || 80,
        waterAvailability: marketIntelligence.waterAvailability || 85,
        appreciationTrend: marketIntelligence.appreciationTrend || 18,
        rentalDemand: marketIntelligence.rentalDemand || 8,
        livabilityScore: marketIntelligence.livabilityScore || 85
      },
      appreciationScore: marketIntelligence.appreciationTrend || 18,
      rentalYieldEstimate: computedYield,
      aiInsights: [],
      amenities: listingRequest.amenities && listingRequest.amenities.length > 0 ? listingRequest.amenities : ['Electricity', 'Security', 'Road Accessibility'],
      createdAt: nowStr,
      expiresAt: expiresAtStr,
      commission: listingRequest.commission || 5,
      acceptsDownPayment: listingRequest.acceptsDownPayment || false,
      listingRequirements: listingRequest.listingRequirements || {},
      listingRequestId: listingRequest.id,
      assignedAgentId: listingRequest.assignedAgentId || null,
      verificationFeePaid: listingRequest.verificationFeePaid || false
    };

    try {
      const newDocRef = doc(collection(db, 'properties'));
      await setDoc(newDocRef, newPropertyData);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'properties');
    }
  };

  const updateListingRequest = async (id: string, updates: Partial<ListingRequest>) => {
    try {
      const docRef = doc(db, 'listingRequests', id);
      const snap = await getDoc(docRef);
      let listingOwnerId = '';
      let listingTitle = 'Property Listing';
      if (snap.exists()) {
        const data = snap.data();
        listingOwnerId = data?.ownerId || '';
        listingTitle = data?.title || listingTitle;
      }

      await updateDoc(docRef, updates);

      if (updates.status === 'Approved') {
        if (snap.exists()) {
          const listingRequest = { id: snap.id, ...snap.data(), ...updates } as ListingRequest;
          await promoteToProperty(listingRequest);
        }
        if (listingOwnerId) {
          sendNotification(listingOwnerId, {
            type: 'listing_approved',
            title: 'Listing Approved',
            body: `Your listing "${listingTitle}" has been approved!`,
            data: { listingId: id }
          });
        }
      } else if (updates.status === 'Rejected' && listingOwnerId) {
        sendNotification(listingOwnerId, {
          type: 'listing_rejected',
          title: 'Listing Rejected',
          body: `Your listing "${listingTitle}" has been rejected.`,
          data: { listingId: id }
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `listingRequests/${id}`);
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
    }
  };

  const addTransaction = async (transaction: Transaction) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        tokens: user.tokens + (transaction.type === 'Credit' ? transaction.amount : -transaction.amount)
      });
      await addDoc(collection(db, `users/${user.id}/transactions`), transaction);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.id}/transactions`);
    }
  };

  const updateAgentTrustScore = async (agentId: string, event: TrustScoreEvent) => {
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
      user, firebaseUser, loading, error, listingRequests, platformListings, savedProperties, isLocalGuest: false,
      signInWithGoogle, signInWithFacebook, signInWithEmail, signUpWithEmail, signInWithGoogleMock, signInWithFacebookMock, logout,
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
