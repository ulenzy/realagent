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
  updateProfile,
  fetchSignInMethodsForEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  linkWithCredential,
  GoogleAuthProvider,
  updateEmail,
  sendEmailVerification
} from 'firebase/auth';
import { auth, googleProvider, facebookProvider } from '../lib/firebase';
import { doc, getDoc, getDocs, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove, collection, query, where, addDoc, deleteDoc, Timestamp, runTransaction, increment, orderBy, limit, startAfter } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { sendNotification } from '../lib/notifications';
import { User, ListingRequest, ListingStatus, Transaction, Property, ListingType, AgentTier, ROILevel, AreaTrend } from '../types';
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
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signInWithEmail: (email: string, pass: string, rememberMe?: boolean) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  signInWithGoogleMock: () => Promise<void>;
  signInWithFacebookMock: () => Promise<void>;
  logout: () => Promise<void>;
  toggleSavedProperty: (id: string) => Promise<void>;
  addListingRequest: (request: ListingRequest) => Promise<void>;
  updateListingRequest: (id: string, updates: Partial<ListingRequest>) => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  updateUserEmail: (newEmail: string) => Promise<void>;
  updateTokens: (delta: number) => Promise<void>;
  addTransaction: (transaction: Transaction) => Promise<void>;
  updateAgentTrustScore: (agentId: string, event: TrustScoreEvent) => Promise<void>;
  drafts: ListingRequest[];
  saveDraft: (draftData: Partial<ListingRequest>) => Promise<string>;
  updateDraft: (draftId: string, data: Partial<ListingRequest>) => Promise<void>;
  deleteDraft: (draftId: string) => Promise<void>;
  promoteDraftToListing: (draftId: string) => Promise<void>;
  loadMorePlatformListings: () => Promise<void>;
  loadMoreListingRequests: () => Promise<void>;
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
  const [liveListingRequests, setLiveListingRequests] = useState<ListingRequest[]>([]);
  const [loadedMoreListingRequests, setLoadedMoreListingRequests] = useState<ListingRequest[]>([]);
  const [livePlatformListings, setLivePlatformListings] = useState<ListingRequest[]>([]);
  const [loadedMorePlatformListings, setLoadedMorePlatformListings] = useState<ListingRequest[]>([]);

  const [platformListingsLastDoc, setPlatformListingsLastDoc] = useState<any>(null);
  const [listingRequestsLastDoc, setListingRequestsLastDoc] = useState<any>(null);

  const platformListings = React.useMemo(() => {
    const seenIds = new Set(livePlatformListings.map(p => p.id));
    const filteredLoaded = loadedMorePlatformListings.filter(p => !seenIds.has(p.id));
    return [...livePlatformListings, ...filteredLoaded];
  }, [livePlatformListings, loadedMorePlatformListings]);

  const listingRequests = React.useMemo(() => {
    const seenIds = new Set(liveListingRequests.map(r => r.id));
    const filteredLoaded = loadedMoreListingRequests.filter(r => !seenIds.has(r.id));
    return [...liveListingRequests, ...filteredLoaded];
  }, [liveListingRequests, loadedMoreListingRequests]);

  const [savedProperties, setSavedProperties] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<ListingRequest[]>([]);
  const unsubscribeUserRef = React.useRef<(() => void) | null>(null);
  const unsubscribeListingsRef = React.useRef<(() => void) | null>(null);
  const unsubscribePlatformListingsRef = React.useRef<(() => void) | null>(null);
  const unsubscribeDraftsRef = React.useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);
      setError(null);
      if (fUser) {
        // Fast-path client-side optimization to retrieve profile details instantly and prevent duplicate Firestore initial reads
        const cachedComplete = localStorage.getItem(`realagents_profile_completed_${fUser.uid}`) === 'true';
        if (cachedComplete) {
          const cachedUserStr = localStorage.getItem(`realagents_user_profile_${fUser.uid}`);
          if (cachedUserStr) {
            try {
              const cachedUser = JSON.parse(cachedUserStr);
              setUser(cachedUser);
              setSavedProperties(cachedUser.savedProperties || []);
              setLoading(false);
            } catch (e) {
              console.warn("Error parsing user cache payload:", e);
            }
          }
        }

        // Listen to User Profile
        const userDocRef = doc(db, 'users', fUser.uid);
        unsubscribeUserRef.current = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as User;
            setUser(userData);
            setSavedProperties(userData.savedProperties || []);

            // Secure user-level localStorage cache payload
            if (userData.onboardingCompleted || userData.profileComplete) {
              localStorage.setItem(`realagents_profile_completed_${fUser.uid}`, 'true');
              localStorage.setItem(`realagents_user_profile_${fUser.uid}`, JSON.stringify(userData));
            }

            if (userData.accountStatus === 'Suspended' || userData.accountStatus === 'Banned') {
              setTimeout(() => {
                logout().catch((err) => console.error("Auto-logout on suspension/ban failed:", err));
              }, 3000);
            }

            // Listen to draft collection
            if (unsubscribeDraftsRef.current) {
              unsubscribeDraftsRef.current();
            }
            const draftsQuery = query(collection(db, 'drafts'), where('ownerId', '==', fUser.uid));
            unsubscribeDraftsRef.current = onSnapshot(draftsQuery, (snapshot) => {
              const uDrafts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              } as any));
              setDrafts(uDrafts);
            }, (err) => {
              console.error("Drafts subscription error:", err);
            });

            // Dynamically set up listingRequests subscription depending on role
            if (unsubscribeListingsRef.current) {
              unsubscribeListingsRef.current();
            }

            let listingsQuery;
            if (userData.role === 'Agent' || userData.role === 'Admin') {
              // Paginated query for Agents/Admin
              listingsQuery = query(
                collection(db, 'listingRequests'),
                orderBy('submittedAt', 'desc'),
                limit(15)
              );
            } else {
              // Sellers/Buyers view their own listing requests
              listingsQuery = query(
                collection(db, 'listingRequests'),
                where('ownerId', '==', fUser.uid),
                orderBy('submittedAt', 'desc')
              );
            }

            unsubscribeListingsRef.current = onSnapshot(listingsQuery, (snapshot) => {
              const listings = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              } as any));
              setLiveListingRequests(listings);
              if (userData.role === 'Agent' || userData.role === 'Admin') {
                if (snapshot.docs.length > 0) {
                  setListingRequestsLastDoc(snapshot.docs[snapshot.docs.length - 1]);
                } else {
                  setListingRequestsLastDoc(null);
                }
              }
            }, (err) => {
              console.error("Listings dynamic snapshot error:", err);
            });

            // Platform listings query (runs independently of user's own listings)
            if (unsubscribePlatformListingsRef.current) {
              unsubscribePlatformListingsRef.current();
            }

            const platformQuery = query(
              collection(db, 'listingRequests'),
              where('status', '==', 'Agent Bidding'),
              orderBy('submittedAt', 'desc'),
              limit(15)
            );
            unsubscribePlatformListingsRef.current = onSnapshot(platformQuery, (snapshot) => {
              const pListings = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              } as any));
              setLivePlatformListings(pListings);
              if (snapshot.docs.length > 0) {
                setPlatformListingsLastDoc(snapshot.docs[snapshot.docs.length - 1]);
              } else {
                setPlatformListingsLastDoc(null);
              }
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
              phoneVerified: false,
              preferences: DEFAULT_PREFERENCES,
              profileVisible: true,
              profileVersion: 1,
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
        if (unsubscribeDraftsRef.current) unsubscribeDraftsRef.current();
        setUser(null);
        setLiveListingRequests([]);
        setLoadedMoreListingRequests([]);
        setLivePlatformListings([]);
        setLoadedMorePlatformListings([]);
        setPlatformListingsLastDoc(null);
        setListingRequestsLastDoc(null);
        setSavedProperties([]);
        setDrafts([]);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserRef.current) unsubscribeUserRef.current();
      if (unsubscribeListingsRef.current) unsubscribeListingsRef.current();
      if (unsubscribePlatformListingsRef.current) unsubscribePlatformListingsRef.current();
      if (unsubscribeDraftsRef.current) unsubscribeDraftsRef.current();
    };
  }, []);

  const applyPersistence = async (rememberMe?: boolean) => {
    const isRemembered = rememberMe !== undefined ? rememberMe : (localStorage.getItem('realagents_remember_me') !== 'false');
    const persistence = isRemembered ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistence);
    localStorage.setItem('realagents_remember_me', isRemembered ? 'true' : 'false');
  };

  const signInWithGoogle = async () => {
    try {
      await applyPersistence();
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
        profileVersion: 1,
      } as any;
      await setDoc(userDocRef, newUser);
    } catch (err: any) {
      console.error('Google Mock Sign In Error:', err);
      setError(err.message);
    }
  };

  const signInWithFacebook = async () => {
    try {
      await applyPersistence();
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
        profileVersion: 1,
      } as any;
      await setDoc(userDocRef, newUser);
    } catch (err: any) {
      console.error('Facebook Mock Sign In Error:', err);
      setError(err.message);
    }
  };

  const signInWithEmail = async (email: string, pass: string, rememberMe: boolean = true) => {
    try {
      // 1. Check if account exists and which providers are linked
      try {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods.length > 0 && !methods.includes('password')) {
          if (methods.includes('google.com') || methods.includes('facebook.com')) {
            const error = new Error('Use Google/Facebook to sign in');
            (error as any).code = 'auth/use-social-provider';
            throw error;
          }
        }
      } catch (checkErr: any) {
        if (checkErr.code === 'auth/use-social-provider') {
          throw checkErr;
        }
        console.warn('SignIn check failed, proceeding directly to auth:', checkErr);
      }

      // 2. Set Persistence based on Remember Me toggle
      await applyPersistence(rememberMe);

      // 3. Authenticate with Password
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      console.error('Email sign in error:', err);
      throw err;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    try {
      await applyPersistence(true); // default to remember on signup
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
        profileVersion: 1,
      } as any;
      
      await setDoc(doc(db, 'users', fUser.uid), newUser);
    } catch (err) {
      console.error('Email sign up error:', err);
      throw err;
    }
  };

  async function logout() {
    try {
      const currentUid = auth.currentUser?.uid;
      if (currentUid) {
        localStorage.removeItem(`realagents_profile_completed_${currentUid}`);
        localStorage.removeItem(`realagents_user_profile_${currentUid}`);
      }
      localStorage.removeItem('realagents_remember_me');
      localStorage.removeItem('realagents_profile_version');
      localStorage.removeItem('realagents_onboarding_completed');
      localStorage.removeItem('realagents_last_profile_check');
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
      sizeSqm: Number(listingRequest.sizeSqm) || 0,
      bedrooms: Number(listingRequest.bedrooms) || 0,
      bathrooms: Number(listingRequest.bathrooms) || 0,
      estateName: listingRequest.estateName || '',
      location: {
        state: state || 'FCT',
        city: area || 'Abuja',
        area: area || 'Abuja',
        address: listingRequest.googlePinLink || `${area || 'Abuja'}, ${state || 'FCT'}`,
        coordinates: { lat, lng }
      },
      image: listingRequest.listingRequirements?.photos?.[0] || '/placeholder-property.png',
      gallery: listingRequest.listingRequirements?.photos || [],
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
      // TODO: Move to Cloud Function — client-side write to properties will fail in production with locked rules.
      const newDocRef = doc(collection(db, 'properties'));
      await setDoc(newDocRef, newPropertyData);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'properties');
    }
  };

  const saveDraft = async (draftData: Partial<ListingRequest>): Promise<string> => {
    if (!user) throw new Error("User must be logged in to save drafts.");
    const userDocRef = doc(db, 'users', user.id);
    const newDraftDocRef = doc(collection(db, 'drafts'));
    const draftId = newDraftDocRef.id;

    try {
      await runTransaction(db, async (transaction) => {
        // Read the user document inside transaction
        const userSnap = await transaction.get(userDocRef);
        
        const currentCount = userSnap.exists() ? (userSnap.data().draftCount || 0) : 0;
        if (currentCount >= 3) {
          throw new Error("Draft limit reached — you have 3 saved drafts. Submit or delete one before saving a new draft.");
        }

        const now = new Date().toISOString();
        const draftDocData = {
          ...draftData,
          id: draftId,
          ownerId: user.id,
          isDraft: true,
          draftSavedAt: now,
          status: 'Draft' as ListingStatus
        };

        // Write the new draft document in the transaction
        transaction.set(newDraftDocRef, draftDocData);

        // Increment draftCount atomically on the user document
        transaction.update(userDocRef, { draftCount: currentCount + 1 });
      });

      return draftId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'drafts');
      throw error;
    }
  };

  const updateDraft = async (draftId: string, data: Partial<ListingRequest>): Promise<void> => {
    try {
      const now = new Date().toISOString();
      const docRef = doc(db, 'drafts', draftId);
      await updateDoc(docRef, {
        ...data,
        draftSavedAt: now
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `drafts/${draftId}`);
    }
  };

  const deleteDraft = async (draftId: string): Promise<void> => {
    if (!user) return;
    try {
      const docRef = doc(db, 'drafts', draftId);
      await deleteDoc(docRef);
      const newCount = Math.max(0, (user.draftCount || 0) - 1);
      await updateUser({ draftCount: newCount });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `drafts/${draftId}`);
    }
  };

  const promoteDraftToListing = async (draftId: string): Promise<void> => {
    try {
      const docRef = doc(db, 'drafts', draftId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const draftData = snap.data() as ListingRequest;
        const { isDraft, ...listingData } = draftData;
        const promotedListing = {
          ...listingData,
          status: 'Agent Bidding' as ListingStatus,
          submittedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        };
        await addListingRequest(promotedListing);
        await deleteDraft(draftId);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `listingRequests/${draftId}`);
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

      if (updates.agentBids) {
        const hasSelfBid = updates.agentBids.some(bid => bid.agentId === listingOwnerId);
        if (hasSelfBid) {
          throw new Error("Conflict of interest — you cannot place a bid on your own property listing.");
        }
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
      const dbUpdates = { ...updates } as any;
      delete dbUpdates.tokens;
      if (Object.keys(dbUpdates).length === 0) return;
      await updateDoc(doc(db, 'users', user.id), dbUpdates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
    }
  };

  const updateTokens = async (delta: number) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.id), { tokens: increment(delta) });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
    }
  };

  const addTransaction = async (transaction: Transaction) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        tokens: increment(transaction.type === 'Credit' ? transaction.amount : -transaction.amount)
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

  const loadMorePlatformListings = async (): Promise<void> => {
    if (!platformListingsLastDoc) return;
    try {
      const q = query(
        collection(db, 'listingRequests'),
        where('status', '==', 'Agent Bidding'),
        orderBy('submittedAt', 'desc'),
        startAfter(platformListingsLastDoc),
        limit(15)
      );
      const snapshot = await getDocs(q);
      const pListings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as any));
      if (pListings.length > 0) {
        setLoadedMorePlatformListings(prev => [...prev, ...pListings]);
        setPlatformListingsLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
    } catch (err) {
      console.error("Load more platform listings error:", err);
    }
  };

  const loadMoreListingRequests = async (): Promise<void> => {
    if (!user || !listingRequestsLastDoc) return;
    if (user.role !== 'Agent' && user.role !== 'Admin') return;
    try {
      const q = query(
        collection(db, 'listingRequests'),
        orderBy('submittedAt', 'desc'),
        startAfter(listingRequestsLastDoc),
        limit(15)
      );
      const snapshot = await getDocs(q);
      const listings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as any));
      if (listings.length > 0) {
        setLoadedMoreListingRequests(prev => [...prev, ...listings]);
        setListingRequestsLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
    } catch (err) {
      console.error("Load more listing requests error:", err);
    }
  };

  const updateUserEmail = async (newEmail: string) => {
    if (!auth.currentUser || !user) throw new Error("No authenticated user found.");
    try {
      await updateEmail(auth.currentUser, newEmail);
      await sendEmailVerification(auth.currentUser);
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        email: newEmail.trim().toLowerCase(),
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, firebaseUser, loading, error, listingRequests, platformListings, savedProperties,
      signInWithGoogle, signInWithFacebook, signInWithEmail, signUpWithEmail, signInWithGoogleMock, signInWithFacebookMock, logout,
      toggleSavedProperty, addListingRequest, updateListingRequest, updateUser, updateUserEmail, updateTokens, addTransaction, updateAgentTrustScore,
      drafts, saveDraft, updateDraft, deleteDraft, promoteDraftToListing,
      loadMorePlatformListings, loadMoreListingRequests
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
