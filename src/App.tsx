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
import { Home, Search, FileText, Zap, MessageCircle, Moon, Sun } from 'lucide-react';
import { cn } from './lib/utils';
import { mockProperties } from './data/mockListings';
import { ListingRequest } from './types';
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

  const handleAddListingRequest = (request: Omit<ListingRequest, 'id' | 'status' | 'submittedAt' | 'lastUpdated'>) => {
    if (!user) return;
    
    const LISTING_LIMIT_FREE = 2;
    const LISTING_LIMIT_PRO = 6;
    const ADDITIONAL_LISTING_COST = 10;
    
    const currentLimit = user.isSubscriber ? LISTING_LIMIT_PRO : LISTING_LIMIT_FREE;
    const isAdditional = listingRequests.length >= currentLimit;
    
    if (isAdditional) {
      if (user.tokens < ADDITIONAL_LISTING_COST) {
        alert(`Insufficient tokens! Additional listings cost ${ADDITIONAL_LISTING_COST} tokens.`);
        return;
      }
      
      const newTransaction = {
        id: `tx-${Date.now()}`,
        type: 'Debit' as const,
        amount: ADDITIONAL_LISTING_COST,
        description: `Additional Listing Fee: ${request.title}`,
        timestamp: new Date().toISOString()
      };
      
      addTransaction(newTransaction as any);
    }

    const newRequest: ListingRequest = {
      ...request,
      id: `req-${Date.now()}`,
      status: 'Pending',
      submittedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      metrics: { views: 0, saves: 0, inquiries: 0 }
    };
    addListingRequest(newRequest);
  };

  const selectedProperty = selectedPropertyId ? mockProperties.find(p => p.id === selectedPropertyId) : null;

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
      {/* Header - Global */}
      <header className="aggressive-header">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setActiveTab('home'); handleBackToMarketplace(); }}>
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
          {activeTab !== 'profile' && (
            <button 
              onClick={() => { setActiveTab('profile'); handleBackToMarketplace(); }}
              className="hover:text-brand-teal transition-colors p-1 border-2 border-transparent hover:border-brand-black hover:bg-white dark:hover:bg-zinc-900 dark:hover:border-zinc-700 shadow-none hover:shadow-brutal-sm dark:hover:shadow-[2px_2px_0px_0px_#52525b] rounded-full"
            >
              <div className="w-8 h-8 rounded-full border-2 border-brand-black overflow-hidden bg-brand-teal shadow-brutal-sm">
                <img src={getUserAvatarUrl(user)} alt="User" />
              </div>
            </button>
          )}
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
              {activeTab === 'home' && <Marketplace />}
              {activeTab === 'ai' && <AISearch />}
              {(activeTab === 'profile' || activeTab === 'my_listings') && (
                <Profile initialView={activeTab === 'my_listings' ? 'My Listings' : 'main'} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

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
              active={activeTab === 'home'} 
              onClick={() => { setActiveTab('home'); handleBackToMarketplace(); }}
              icon={<Home />}
              label="Marketplace"
            />
            <TabButton 
              active={activeTab === 'ai'} 
              onClick={() => { setActiveTab('ai'); handleBackToMarketplace(); }}
              icon={<Search />}
              label="AI Intelligence"
              special
            />
            <TabButton 
              active={activeTab === 'my_listings'} 
              onClick={() => { setActiveTab('my_listings'); handleBackToMarketplace(); }}
              icon={<FileText />}
              label="My Listings"
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
  special
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string;
  special?: boolean;
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
        "mb-1 transition-transform group-active:scale-90",
        special && "p-2 bg-brand-black text-brand-teal rounded-full -mt-6 border-2 border-brand-teal shadow-aggressive",
        active && !special && "scale-110"
      )}>
        {React.cloneElement(icon as React.ReactElement, { size: special ? 24 : 22 })}
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

