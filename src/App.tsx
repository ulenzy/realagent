/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Search, FileText, Zap, MessageCircle, Moon, Sun, Gavel, Heart, Store, Sparkles, LayoutDashboard, Plus, ShieldAlert, Info, Settings, Bell, ArrowLeft, Share2 } from 'lucide-react';
import { cn } from './lib/utils';
import { mockProperties } from './data/mockListings';
import { ListingRequest, Property } from './types';
import { doc, onSnapshot, collection, query, updateDoc, orderBy, limit, startAfter, getDocs, writeBatch } from 'firebase/firestore';
import { NotificationDrawer } from './components/NotificationDrawer';
import { db } from './lib/firebase';
import Marketplace from './components/Marketplace';
import AISearch from './components/AISearch';
import Profile from './components/Profile';
import PropertyDetail from './components/PropertyDetail';
import AgentProfile from './components/AgentProfile';
import ListPropertyFlow from './components/ListPropertyFlow';
import Messaging from './components/Messaging';
import Login from './components/Login';
import Onboarding from './components/Onboarding';
import PhoneVerification from './components/PhoneVerification';
import CompleteProfile from './components/CompleteProfile';
import logoImage from './assets/images/logo.png';
import { useAuth } from './context/AuthContext';
import { useNavigation } from './context/NavigationContext';
import { useUI } from './context/UIContext';
import { getUserAvatarUrl } from './lib/avatar';
import AgentBidding from './components/AgentBidding';
import MySpace from './components/MySpace';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const { user, firebaseUser, loading, error, listingRequests, savedProperties, toggleSavedProperty, addListingRequest, updateListingRequest, updateUser, addTransaction, logout } = useAuth();
  const { 
    activeTab, 
    selectedPropertyId, 
    selectedAgentId, 
    isListingFlow, 
    viewedProperties,
    setActiveTab, 
    setSelectedPropertyId, 
    setSelectedAgentId, 
    setIsListingFlow, 
    handleBackToMarketplace, 
    handleSelectProperty,
    mySpaceSubTab
  } = useNavigation();
  const { 
    isDarkMode, 
    isMessagingOpen, 
    activeChatId, 
    toggleDarkMode, 
    openChat,
    setIsMessagingOpen 
  } = useUI();

  const [showWelcomeToast, setShowWelcomeToast] = React.useState(false);
  const toastActionDone = React.useRef(false);

  // Unified global and subpage back-button header states
  const [profileView, setProfileView] = React.useState('main');

  React.useEffect(() => {
    const handleViewChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      setProfileView(customEvent.detail?.view || 'main');
    };
    window.addEventListener('profile-view-changed', handleViewChange);
    return () => window.removeEventListener('profile-view-changed', handleViewChange);
  }, []);

  const isProfileActive = activeTab === 'profile';
  const isSubPageActive = !!isListingFlow || !!selectedAgentId || !!selectedPropertyId;
  const showHomeBar = !isProfileActive && !isSubPageActive;

  // Let's scroll to top when navigation states change, and close any overlay containers (as requested)
  React.useEffect(() => {
    setIsNotificationOpen(false);
    setIsMessagingOpen(false);
  }, [activeTab, selectedPropertyId, selectedAgentId, isListingFlow]);

  let headerTitle = "DETAILS";
  if (isListingFlow) {
    headerTitle = "NEW PROPERTY LISTING";
  } else if (selectedAgentId) {
    headerTitle = "VERIFIED AGENT PROFILE";
  } else if (selectedPropertyId) {
    headerTitle = "PROPERTY DETAIL VIEW";
  } else if (isProfileActive) {
    if (profileView === 'main') {
      headerTitle = "MY PROFILE & WORKSPACE";
    } else {
      headerTitle = profileView.toUpperCase();
    }
  }

  const handleBackClick = () => {
    if (isProfileActive) {
      const event = new CustomEvent('profile-back-click', { cancelable: true });
      const defaultPrevented = !window.dispatchEvent(event);
      if (!defaultPrevented) {
        setActiveTab('marketplace');
        handleBackToMarketplace();
      }
    } else if (isListingFlow) {
      setIsListingFlow(false);
    } else if (selectedAgentId) {
      setSelectedAgentId(null);
    } else if (selectedPropertyId) {
      setSelectedPropertyId(null);
    }
  };

  // Notifications
  const [liveNotifications, setLiveNotifications] = React.useState<any[]>([]);
  const [loadedMoreNotifications, setLoadedMoreNotifications] = React.useState<any[]>([]);
  const [notificationsLastDoc, setNotificationsLastDoc] = React.useState<any>(null);
  const [isNotificationOpen, setIsNotificationOpen] = React.useState(false);

  const notifications = React.useMemo(() => {
    const seenIds = new Set(liveNotifications.map(n => n.id));
    const filteredLoaded = loadedMoreNotifications.filter(n => !seenIds.has(n.id));
    return [...liveNotifications, ...filteredLoaded];
  }, [liveNotifications, loadedMoreNotifications]);

  React.useEffect(() => {
    if (!user) {
      setLiveNotifications([]);
      setLoadedMoreNotifications([]);
      setNotificationsLastDoc(null);
      return;
    }

    // Live Snapshot from Firestore
    const q = query(
      collection(db, 'users', user.id, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          title: data.title || '',
          body: data.body || '',
          type: data.type || '',
          data: data.data || {},
          read: !!data.read,
          createdAt: data.createdAt || ''
        });
      });
      setLiveNotifications(list);
      if (snapshot.docs.length > 0) {
        setNotificationsLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      } else {
        setNotificationsLastDoc(null);
      }
    }, (error) => {
      console.error("Notifications listener error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const loadMoreNotifications = async () => {
    if (!user || !notificationsLastDoc) return;
    try {
      const q = query(
        collection(db, 'users', user.id, 'notifications'),
        orderBy('createdAt', 'desc'),
        startAfter(notificationsLastDoc),
        limit(50)
      );
      const snapshot = await getDocs(q);
      const list: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          title: data.title || '',
          body: data.body || '',
          type: data.type || '',
          data: data.data || {},
          read: !!data.read,
          createdAt: data.createdAt || ''
        });
      });
      if (list.length > 0) {
        setLoadedMoreNotifications(prev => [...prev, ...list]);
        setNotificationsLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
    } catch (err) {
      console.error("Load more notifications error:", err);
    }
  };

  const handleMarkAsRead = async (notifId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.id, 'notifications', notifId), { read: true });
    } catch (err) {
      console.error("Mark read error:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    const unreads = notifications.filter(n => !n.read);
    if (unreads.length === 0) return;
    try {
      const batch = writeBatch(db);
      unreads.forEach(n => {
        batch.update(doc(db, 'users', user.id, 'notifications', n.id), { read: true });
      });
      await batch.commit();
    } catch (err) {
      console.error("Mark all read error:", err);
    }
  };

  const handleNavigateToProperty = (listingId: string) => {
    setSelectedPropertyId(listingId);
    setActiveTab('marketplace');
  };

  React.useEffect(() => {
    if (user && user.onboardingCompleted && user.kycStatus === 'None' && !user.welcomeToastShown && !toastActionDone.current) {
      setShowWelcomeToast(true);
      const timer = setTimeout(() => {
        handleDismissWelcomeToast();
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [user?.onboardingCompleted, user?.kycStatus, user?.welcomeToastShown]);

  const handleDismissWelcomeToast = React.useCallback(() => {
    if (toastActionDone.current) return;
    toastActionDone.current = true;
    setShowWelcomeToast(false);
    updateUser({ welcomeToastShown: true });
  }, [updateUser]);

  const handleActionClick = () => {
    if (user?.role === 'Agent' || user?.role === 'Seller') {
      setActiveTab('profile');
    }
    handleDismissWelcomeToast();
  };

  const handleAddListingRequest = (request: Omit<ListingRequest, 'id' | 'status' | 'submittedAt' | 'lastUpdated'>) => {
    if (!user) return;
    
    const PLATFORM_COMMISSION_RATE = 5;
    const LISTING_FEE = 20000;
    const resolvedCommission = user.commissionRate !== undefined ? user.commissionRate : PLATFORM_COMMISSION_RATE;
    const newRequest: ListingRequest = {
      ...request,
      commission: resolvedCommission,
      id: (request as any).id || `req-${Date.now()}`,
      status: 'Agent Bidding',
      submittedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      metrics: { views: 0, saves: 0, inquiries: 0 },
      listingType: request.listingType,
      propertySubType: request.propertySubType,
      sizeSqm: request.sizeSqm,
      bedrooms: request.bedrooms,
      bathrooms: request.bathrooms,
      estateName: request.estateName,
      amenities: request.amenities,
      listingFeeStatus: 'Monthly Unpaid',
      listingFeePaidAt: request.listingFeePaidAt || '',
      dealStatus: 'Open',
      bidWindowOpensAt: new Date().toISOString(),
      bidWindowExpiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
      listingFeeStub: {
        amount: LISTING_FEE,
        currency: 'NGN',
        provider: 'paystack',
        status: 'pending',
        reference: `lf-${Date.now()}`
      }
    };
    addListingRequest(newRequest);
  };

  const [selectedLiveProperty, setSelectedLiveProperty] = React.useState<Property | null>(null);

  React.useEffect(() => {
    if (!selectedPropertyId) {
      setSelectedLiveProperty(null);
      return;
    }
    const isMock = mockProperties.some(p => p.id === selectedPropertyId);
    if (isMock) {
      setSelectedLiveProperty(null);
      return;
    }
    
    // Fetch from Firestore
    const docRef = doc(db, 'properties', selectedPropertyId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setSelectedLiveProperty({ id: docSnap.id, ...docSnap.data() } as any);
      } else {
        setSelectedLiveProperty(null);
      }
    }, (err) => {
      console.error("Error fetching selected live property: ", err);
    });

    return () => unsubscribe();
  }, [selectedPropertyId]);

  const selectedProperty = selectedPropertyId 
    ? (mockProperties.find(p => p.id === selectedPropertyId) || selectedLiveProperty) 
    : null;

  const [propertyNotFound, setPropertyNotFound] = React.useState(false);

  React.useEffect(() => {
    if (selectedPropertyId && !selectedProperty) {
      setPropertyNotFound(false);
      const timer = setTimeout(() => {
        setPropertyNotFound(true);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setPropertyNotFound(false);
    }
  }, [selectedPropertyId, selectedProperty]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-gray dark:bg-[#0a0a0b]">
        <div className="flex flex-col items-center gap-4 max-w-md text-center p-6">
          <div className="w-12 h-12 border-4 border-brand-teal border-t-transparent animate-spin rounded-full"></div>
          <p className="text-brand-black dark:text-white font-black italic tracking-widest animate-pulse uppercase">Syncing Assets...</p>
          {error && (
            <div className="mt-4 p-4 bg-red-100 border-4 border-brand-red text-brand-red font-bold text-xs uppercase shadow-aggressive">
              <p className="mb-2">Connection Error</p>
              <p className="text-[10px] break-all">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 bg-brand-red text-white px-4 py-2 text-[10px] font-black hover:bg-black transition-colors"
              >
                Retry Connection
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return <Login />;
  }

  if (firebaseUser && user && !(user as any).phoneVerified) {
    return <PhoneVerification />;
  }

  // Check if any required field is missing from Firestore user profile for post-login profile validation
  const isProfileIncomplete = !user || !user.username?.trim() || !user.phoneNumber?.trim() || !user.name?.trim() || !user.onboardingCompleted || !(user as any).phoneVerified;

  if (isProfileIncomplete) {
    return <CompleteProfile />;
  }

  if (user.accountStatus === 'Suspended' || user.accountStatus === 'Banned') {
    const isBanned = user.accountStatus === 'Banned';
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-gray dark:bg-[#0a0a0b] p-6 text-center">
        <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-300 p-8 shadow-aggressive relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-4 bg-brand-red animate-pulse" />
          
          <div className="flex flex-col items-center mt-4">
            <div className="p-4 bg-red-100 dark:bg-red-950/40 text-brand-red border-4 border-brand-black dark:border-zinc-300 mb-6 relative rotate-3 shadow-brutal-xs">
              <ShieldAlert size={36} className="animate-bounce" />
            </div>
            
            <h1 className="text-2xl font-display font-black italic uppercase tracking-tight text-brand-black dark:text-red-500 mb-4">
              {isBanned ? "ACCESS PERMANENTLY DENIED" : "ACCOUNT UNDER RESTRICTION"}
            </h1>
            
            <div className="bg-zinc-50 dark:bg-zinc-850 p-5 border-2 border-dashed border-zinc-300 dark:border-zinc-700 font-mono text-xs uppercase text-zinc-650 dark:text-zinc-300 mb-6 leading-relaxed">
              {isBanned 
                ? "Your account has been permanently banned for violating RealAgents platform terms."
                : "Your account has been suspended pending investigation. Check your registered email for details. Contact support@realagents.ng."
              }
            </div>

            <p className="text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-2">
              System Action Log
            </p>
            <div className="flex gap-2 items-center justify-center">
              <span className="text-[9px] font-black uppercase tracking-widest bg-brand-black text-white dark:bg-zinc-800 dark:text-red-400 px-2 py-1 border border-brand-black dark:border-zinc-700 italic">
                {user.accountStatus}
              </span>
              <span className="text-zinc-400">•</span>
              <span className="text-[9px] font-black font-mono text-zinc-500 uppercase">
                Graceful exit in progress
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-brand-gray dark:bg-[#1c1c21] selection:bg-brand-teal selection:text-brand-black font-sans transition-colors duration-300">
      {/* Welcome & KYC Guidance Toast */}
      <AnimatePresence>
        {showWelcomeToast && (
          <motion.div
            initial={{ y: -120, x: "-50%", opacity: 0 }}
            animate={{ y: 0, x: "-50%", opacity: 1 }}
            exit={{ y: -120, x: "-50%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed top-6 left-1/2 z-[1100] w-full max-w-lg px-4"
          >
            <div className="bg-brand-black text-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-300 p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-brand-teal dark:bg-teal-900/30 text-brand-black dark:text-brand-teal border-2 border-brand-black shrink-0 relative rotate-2 max-sm:hidden">
                  {user.role === 'Buyer' ? <Sparkles size={18} /> : <ShieldAlert size={18} />}
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-teal leading-none mb-1">
                    System Intelligence Notice
                  </h4>
                  <p className="text-xs font-bold leading-normal text-zinc-200 uppercase">
                    {user.role === 'Buyer' && "Welcome — browse listings and save your favourites."}
                    {user.role === 'Seller' && "Welcome — tap + to list your first property. KYC required before submission."}
                    {user.role === 'Agent' && "Welcome — complete KYC in your Profile to start bidding on listings."}
                  </p>
                </div>
              </div>
              <button
                onClick={handleActionClick}
                className="bg-brand-teal text-brand-black font-display font-black uppercase text-[10px] tracking-widest px-4 py-2 border-2 border-brand-black shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer self-stretch sm:self-center text-center"
              >
                {user.role === 'Buyer' ? "Acknowledge" : "Go to Profile"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header - Global */}
      {!isProfileActive && (
        showHomeBar ? (
          <header className="aggressive-header">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setActiveTab('marketplace'); handleBackToMarketplace(); }}>
              <img src={logoImage} alt="RealAgents Logo" className="w-[115px] h-[26px] drop-shadow-[2px_2px_0_rgba(0,24,41,1)] object-contain rounded-md" />
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => openChat()}
                className="p-2 border-2 border-brand-black bg-white dark:bg-zinc-900 shadow-brutal-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all flex items-center justify-center rounded-full dark:border-zinc-700 dark:shadow-[2px_2px_0px_0px_#52525b] relative"
                aria-label="Messages"
              >
                <MessageCircle className="w-5 h-5 text-brand-black dark:text-white" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-red text-white text-[8px] font-black flex items-center justify-center rounded-full border border-brand-black">2</span>
              </button>
              
              {user && (
                <button
                  onClick={() => setIsNotificationOpen(true)}
                  className="p-2 border-2 border-brand-black bg-white dark:bg-zinc-900 shadow-brutal-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all flex items-center justify-center rounded-full dark:border-zinc-700 dark:shadow-[2px_2px_0px_0px_#52525b] relative"
                  aria-label="Notifications"
                  id="notification-bell-btn"
                >
                  <Bell className="w-5 h-5 text-brand-black dark:text-white" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-brand-teal text-brand-black text-[8px] font-black flex items-center justify-center rounded-full border border-brand-black animate-pulse">
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>
              )}
              <button 
                onClick={() => { setActiveTab('profile'); handleBackToMarketplace(); }}
                className={cn(
                  "hover:text-brand-teal transition-colors p-1 border-2 border-transparent hover:border-brand-black hover:bg-white dark:hover:bg-zinc-900 dark:hover:border-zinc-700 shadow-none hover:shadow-brutal-sm dark:hover:shadow-[2px_2px_0px_0px_#52525b] rounded-full",
                  activeTab === 'profile' && "border-brand-black bg-white dark:bg-zinc-900 shadow-brutal-sm dark:border-zinc-700 dark:shadow-[2px_2px_0px_0px_#52525b]"
                )}
                aria-label="My Profile"
              >
                <div className="w-8 h-8 rounded-full border-2 border-brand-black overflow-hidden bg-brand-teal shadow-brutal-sm">
                  <img src={getUserAvatarUrl(user)} alt="User" />
                </div>
              </button>
            </div>
          </header>
        ) : (
          <header className="aggressive-header">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBackClick}
                className="flex items-center gap-1.5 p-2 bg-brand-teal text-brand-black border-2 border-brand-black dark:border-zinc-700 shadow-brutal-xs font-display font-black text-[10px] uppercase tracking-wider hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer rounded-none"
                id="unified-back-button"
              >
                <ArrowLeft size={16} />
                <span>BACK</span>
              </button>
              <h1 className="text-sm sm:text-lg font-display font-black uppercase tracking-tight italic text-brand-black dark:text-white ml-3">
                {headerTitle}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {selectedPropertyId && selectedProperty && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => toggleSavedProperty?.(selectedProperty.id)}
                    className="p-2 border-2 border-brand-black dark:border-zinc-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_#52525b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-colors bg-white dark:bg-zinc-900 hover:bg-brand-gray dark:hover:bg-zinc-800 rounded-none cursor-pointer"
                    title={savedProperties.includes(selectedProperty.id) ? "Remove from saved" : "Save property"}
                  >
                    <Heart size={18} className={savedProperties.includes(selectedProperty.id) ? "fill-brand-red text-brand-red" : "text-brand-black dark:text-white"} />
                  </button>
                  <button className="p-2 border-2 border-brand-black dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_#52525b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:bg-brand-gray dark:hover:bg-zinc-800 rounded-none cursor-pointer">
                    <Share2 size={18} className="text-brand-black dark:text-white" />
                  </button>
                </div>
              )}
            </div>
          </header>
        )
      )}

      {/* Main Content Area */}
      <main className={cn("flex-1 overflow-x-hidden", !selectedPropertyId && !isListingFlow && "pb-32")}>
        <AnimatePresence 
          mode="wait"
          onExitComplete={() => {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            document.documentElement.scrollTop = 0;
            if (document.body) document.body.scrollTop = 0;
          }}
        >
          {isListingFlow ? (
            <motion.div
              key="listing-flow"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ type: "spring", stiffness: 450, damping: 35 }}
              className="w-full"
            >
              <ListPropertyFlow />
            </motion.div>
          ) : selectedAgentId ? (
            <motion.div
              key="agent-profile"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ type: "spring", stiffness: 450, damping: 35 }}
            >
              <AgentProfile />
            </motion.div>
          ) : selectedPropertyId && !selectedProperty ? (
            propertyNotFound ? (
              <motion.div
                key="property-not-found"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              >
                <div className="min-h-screen flex items-center justify-center p-6 bg-brand-gray dark:bg-[#0a0a0b]">
                  <div className="text-center max-w-sm">
                    <div className="p-4 bg-zinc-100 dark:bg-zinc-800 border-4 border-brand-black mb-6 inline-block">
                      <Home size={32} className="text-zinc-400" />
                    </div>
                    <h2 className="text-xl font-display font-black uppercase italic mb-3">Listing Unavailable</h2>
                    <p className="text-sm text-zinc-500 mb-6">This listing may still be under review, has been removed, or is temporarily unavailable.</p>
                    <button onClick={handleBackClick} className="brutalist-button-teal w-full">Back to Marketplace</button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="property-loading-latency"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-h-screen flex items-center justify-center p-6 bg-brand-gray dark:bg-[#0a0a0b]"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-brand-teal border-t-transparent animate-spin rounded-full"></div>
                  <p className="text-brand-black dark:text-white font-black italic tracking-widest animate-pulse uppercase">Fetching Details...</p>
                </div>
              </motion.div>
            )
          ) : selectedPropertyId && selectedProperty ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ type: "spring", stiffness: 450, damping: 35 }}
            >
              <PropertyDetail 
                property={selectedProperty} 
              />
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ type: "spring", stiffness: 450, damping: 35 }}
              className="w-full max-w-5xl mx-auto"
            >
              {activeTab === 'marketplace' && <Marketplace />}
              {activeTab === 'ai' && <AISearch />}
              {activeTab === 'myspace' && (
                <MySpace 
                  defaultActiveSubTab={
                    mySpaceSubTab || (
                      user?.role === 'Seller' 
                        ? 'My Listings' 
                        : user?.role === 'Agent' 
                          ? 'Bids' 
                          : 'Wishlist'
                    )
                  } 
                />
              )}
              {activeTab === 'profile' && <Profile initialView="main" />}
              {activeTab === 'admin' && <AdminPanel />}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Action Button (FAB) on the Marketplace Screen */}
      {activeTab === 'marketplace' && !selectedPropertyId && !isListingFlow && !selectedAgentId && (
        <button
          id="marketplace-fab-list-property"
          onClick={() => {
            setIsListingFlow(true);
          }}
          className="fixed bottom-24 right-6 sm:bottom-28 sm:right-10 z-[100] bg-brand-teal text-brand-black p-4 border-4 border-brand-black hover:bg-teal-400 active:translate-y-0.5 shadow-brutal-xs hover:shadow-none transition-all flex flex-col items-center justify-center rounded-none select-none max-w-[125px] hover:translate-x-0.5"
        >
          <Plus className="w-8 h-8 font-black mb-1" />
          <span className="text-[9px] font-display font-black tracking-wider uppercase text-center leading-none">LIST PROPERTY</span>
        </button>
      )}

      <Messaging 
        isOpen={isMessagingOpen} 
        onClose={() => setIsMessagingOpen(false)} 
        initialChatId={activeChatId}
      />

      {/* Bottom Navigation - Aggressive & High Contrast */}
      {!selectedPropertyId && !isListingFlow && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1c1c21] border-t-4 border-black dark:border-zinc-700 p-2 z-50 transition-colors duration-300">
          <div className={cn("max-w-md mx-auto flex justify-between items-center px-4", user?.role === 'Admin' && "max-w-lg")}>
             <TabButton 
              active={activeTab === 'marketplace'} 
              onClick={() => { setActiveTab('marketplace'); handleBackToMarketplace(); }}
              icon={<Store />}
              label="Marketplace"
            />
            <TabButton 
              active={activeTab === 'ai'} 
              onClick={() => { setActiveTab('ai'); handleBackToMarketplace(); }}
              icon={<Sparkles />}
              label="AI Intelligence"
              special
            />
            <TabButton 
              active={activeTab === 'myspace'} 
              onClick={() => { setActiveTab('myspace'); handleBackToMarketplace(); }}
              icon={<LayoutDashboard />}
              label="My Space"
            />
            {user?.role === 'Admin' && (
              <TabButton 
                active={activeTab === 'admin'} 
                onClick={() => { setActiveTab('admin'); handleBackToMarketplace(); }}
                icon={<Settings />}
                label="Admin"
              />
            )}
          </div>
        </nav>
      )}

      <AnimatePresence>
        {isNotificationOpen && (
          <NotificationDrawer
            isOpen={isNotificationOpen}
            onClose={() => setIsNotificationOpen(false)}
            notifications={notifications}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllAsRead={handleMarkAllAsRead}
            onNavigateToProperty={handleNavigateToProperty}
            onLoadMore={loadMoreNotifications}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({ 
  active, 
  onClick, 
  icon, 
  label,
  special,
  badge
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string;
  special?: boolean;
  badge?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center py-1 px-1 sm:px-3 lg:px-4 transition-all relative group",
        active ? "text-brand-teal" : "text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white"
      )}
    >
      <div className={cn(
        "mb-1 transition-transform group-active:scale-90 relative",
        special && "p-2 bg-brand-black text-brand-teal rounded-full -mt-6 border-2 border-brand-teal shadow-aggressive",
        active && !special && "scale-110"
      )}>
        {React.cloneElement(icon as React.ReactElement, { size: special ? 24 : 22 })}
        {badge && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 border border-black rounded-full animate-pulse" />
        )}
      </div>
      <span className={cn(
        "text-[8px] sm:text-[10px] font-display font-black uppercase tracking-wider md:tracking-widest",
        active ? "opacity-100" : "opacity-60"
      )}>
        {label}
      </span>
      {active && !special && (
        <motion.div 
          layoutId="tab-indicator"
          className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-brand-red shadow-brutal-sm" 
        />
      )}
    </button>
  );
}

