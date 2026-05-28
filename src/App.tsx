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
import { Home, Search, FileText, Zap, MessageCircle, Moon, Sun, Gavel, Heart, Store, Sparkles, LayoutDashboard, Plus, ShieldAlert, Info } from 'lucide-react';
import { cn } from './lib/utils';
import { mockProperties } from './data/mockListings';
import { ListingRequest, Property } from './types';
import { doc, onSnapshot } from 'firebase/firestore';
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
import logoImage from './assets/images/logo.png';
import { useAuth } from './context/AuthContext';
import { useNavigation } from './context/NavigationContext';
import { useUI } from './context/UIContext';
import { getUserAvatarUrl } from './lib/avatar';
import AgentBidding from './components/AgentBidding';
import MySpace from './components/MySpace';

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
    handleSelectProperty 
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
    const newRequest: ListingRequest = {
      ...request,
      commission: PLATFORM_COMMISSION_RATE,
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
      listingFeeStatus: request.listingFeeStatus || 'Unpaid',
      listingFeePaidAt: request.listingFeePaidAt || '',
      dealStatus: request.dealStatus || 'Open',
      bidWindowOpensAt: request.bidWindowOpensAt || '',
      bidWindowExpiresAt: request.bidWindowExpiresAt || ''
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
    
    // Check local guest properties
    const savedBytes = localStorage.getItem('localGuestProperties');
    if (savedBytes) {
      const parsed = JSON.parse(savedBytes);
      const found = parsed.find((p: any) => p.id === selectedPropertyId);
      if (found) {
        setSelectedLiveProperty(found);
        return;
      }
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

  if (!user) {
    return <Login />;
  }

  if (!user.onboardingCompleted) {
    return <Onboarding />;
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
      <header className="aggressive-header">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setActiveTab('marketplace'); handleBackToMarketplace(); }}>
          <img src={logoImage} alt="RealAgents Logo" className="w-[115px] h-[26px] drop-shadow-[2px_2px_0_rgba(0,24,41,1)] object-contain rounded-md" />
        </div>
        <div className="flex gap-4">
          <button
            onClick={toggleDarkMode}
            className="p-2 border-2 border-brand-black bg-white dark:bg-zinc-900 shadow-brutal-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all flex items-center justify-center rounded-full dark:border-zinc-700 dark:shadow-[2px_2px_0px_0px_#52525b]"
            aria-label="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-brand-gray" /> : <Moon className="w-5 h-5 text-brand-black fill-brand-black" />}
          </button>
          <button
            onClick={() => openChat()}
            className="p-2 border-2 border-brand-black bg-white dark:bg-zinc-900 shadow-brutal-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all flex items-center justify-center rounded-full dark:border-zinc-700 dark:shadow-[2px_2px_0px_0px_#52525b] relative"
            aria-label="Messages"
          >
            <MessageCircle className="w-5 h-5 text-brand-black dark:text-white" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-red text-white text-[8px] font-black flex items-center justify-center rounded-full border border-brand-black">2</span>
          </button>
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

      {/* Main Content Area */}
      <main className={cn("flex-1 overflow-x-hidden", !selectedPropertyId && !isListingFlow && "pb-32")}>
        <AnimatePresence mode="wait">
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
                    user?.role === 'Seller' 
                      ? 'My Listings' 
                      : user?.role === 'Agent' 
                        ? 'Bids' 
                        : 'Wishlist'
                  } 
                />
              )}
              {activeTab === 'profile' && <Profile initialView="main" />}
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
          <div className="max-w-md mx-auto flex justify-between items-center px-4">
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
          </div>
        </nav>
      )}
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
        "flex flex-col items-center py-1 px-4 transition-all relative group",
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
        "text-[10px] font-display font-black uppercase tracking-widest",
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

