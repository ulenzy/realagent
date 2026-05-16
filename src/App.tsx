/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Search, User, Zap, Filter, Map, ChevronRight, Star, TrendingUp, ShieldCheck, Moon, Sun } from 'lucide-react';
import { cn } from './lib/utils';
import { mockProperties } from './data/mockListings';
import { ListingRequest, User as UserType } from './types';
import Marketplace from './components/Marketplace';
import AISearch from './components/AISearch';
import Profile from './components/Profile';
import PropertyDetail from './components/PropertyDetail';
import AgentProfile from './components/AgentProfile';
import ListPropertyFlow from './components/ListPropertyFlow';
import Messaging from './components/Messaging';
import { MessageCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'ai' | 'profile'>('home');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isListingFlow, setIsListingFlow] = useState(false);
  const [savedProperties, setSavedProperties] = useState<string[]>([]);
  const [viewedProperties, setViewedProperties] = useState<string[]>([]);
  const [user, setUser] = useState<UserType>({
    id: 'u-1',
    name: 'John Doe',
    email: 'john@realagents.com',
    phoneNumber: '+234 812 345 6789',
    bio: 'Property investor and land strategist.',
    avatarSeed: 'John',
    savedProperties: [],
    isAgent: true,
    isSubscriber: true,
    kycStatus: 'None',
    kycDocuments: [],
    profileScore: 45,
    rating: 4.8,
    totalReviews: 12,
    tokens: 150,
    transactions: [],
    preferredLocations: ['Lekki Phase 1, Lagos'],
    onlineHours: 'Mon,Tue,Wed,Thu,Fri|09:00-17:00',
    avatarRolls: { regular: 10, epic: 3, legendary: 1 }
  });
  const [listingRequests, setListingRequests] = useState<ListingRequest[]>([
    {
      id: 'req-1',
      title: 'Modern 4 Bedroom Duplex',
      type: 'House',
      price: 85000000,
      location: 'Lekki Phase 1, Lagos',
      status: 'Under Review',
      submittedAt: new Date(Date.now() - 86440000 * 2).toISOString(),
      lastUpdated: new Date(Date.now() - 86420000).toISOString(),
      expiresAt: new Date(Date.now() + 864100000 * 20).toISOString(),
      metrics: { views: 452, saves: 28, inquiries: 12 },
      isSubscriber: true,
      isBoosted: true
    },
    {
      id: 'req-2',
      title: 'Prime 600sqm Land',
      type: 'Land',
      price: 45000000,
      location: 'Sangotedo, Lagos',
      status: 'Inspection Scheduled',
      submittedAt: new Date(Date.now() - 86480000 * 5).toISOString(),
      lastUpdated: new Date(Date.now() - 86400000 * 1).toISOString(),
      expiresAt: new Date(Date.now() + 864200000 * 10).toISOString(),
      metrics: { views: 128, saves: 15, inquiries: 4 },
      isSubscriber: false,
      isBoosted: false
    }
  ]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  useEffect(() => {
    const handleOpenListing = () => {
      setIsListingFlow(true);
      setSelectedPropertyId(null);
    };
    const handleOpenChat = (e: any) => {
      setIsMessagingOpen(true);
      if (e.detail?.sessionId) {
        setActiveChatId(e.detail.sessionId);
      }
    };
    window.addEventListener('open-listing-flow', handleOpenListing);
    window.addEventListener('open-chat', handleOpenChat);
    return () => {
      window.removeEventListener('open-listing-flow', handleOpenListing);
      window.removeEventListener('open-chat', handleOpenChat);
    };
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    // Sync listing requests with user's subscription status for preview consistency
    setListingRequests(prev => prev.map(req => ({
      ...req,
      isSubscriber: user.isSubscriber
    })));
  }, [user.isSubscriber]);

  const handleSelectProperty = (id: string) => {
    setSelectedPropertyId(id);
    setViewedProperties(prev => {
      const filtered = prev.filter(pId => pId !== id);
      return [id, ...filtered];
    });
    window.scrollTo(0, 0);
  };

  const toggleSavedProperty = (id: string) => {
    setSavedProperties(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleBackToMarketplace = () => {
    setSelectedPropertyId(null);
    setSelectedAgentId(null);
  };

  const handleAddListingRequest = (request: Omit<ListingRequest, 'id' | 'status' | 'submittedAt' | 'lastUpdated'>) => {
    const LISTING_LIMIT_FREE = 2;
    const LISTING_LIMIT_PRO = 6;
    const ADDITIONAL_LISTING_COST = 10;
    
    const currentLimit = user.isSubscriber ? LISTING_LIMIT_PRO : LISTING_LIMIT_FREE;
    const isAdditional = listingRequests.length >= currentLimit;
    
    if (isAdditional) {
      if (user.tokens < ADDITIONAL_LISTING_COST) {
        // Find a way to notify user. For now, we can just return or throw.
        // In a real app we'd trigger a modal.
        alert(`Insufficient tokens! Additional listings cost ${ADDITIONAL_LISTING_COST} tokens.`);
        return;
      }
      
      // Deduct tokens
      const newTransaction = {
        id: `tx-${Date.now()}`,
        type: 'Debit' as const,
        amount: ADDITIONAL_LISTING_COST,
        description: `Additional Listing Fee: ${request.title}`,
        timestamp: new Date().toISOString()
      };
      
      setUser(prev => ({
        ...prev,
        tokens: prev.tokens - ADDITIONAL_LISTING_COST,
        transactions: [newTransaction, ...(prev.transactions || [])]
      }));
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
    setListingRequests(prev => [newRequest, ...prev]);
  };

  const handleUpdateListingRequest = (id: string, updates: Partial<ListingRequest>) => {
    setListingRequests(prev => prev.map(req => 
      req.id === id ? { ...req, ...updates, lastUpdated: new Date().toISOString() } : req
    ));
  };

  const selectedProperty = selectedPropertyId ? mockProperties.find(p => p.id === selectedPropertyId) : null;

  const openChat = (chatId: string | null = null) => {
    setActiveChatId(chatId);
    setIsMessagingOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-brand-gray dark:bg-[#1c1c21] selection:bg-brand-teal selection:text-brand-black font-sans transition-colors duration-300">
      {/* Header - Global */}
      <header className="aggressive-header">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setActiveTab('home'); handleBackToMarketplace(); }}>
          <img src="/logo.png" alt="RealAgents Logo" className="w-10 h-10 hidden sm:block drop-shadow-[2px_2px_0_rgba(0,24,41,1)] object-contain" />
          <h1 className="text-xl md:text-2xl font-display font-black tracking-tighter italic">
            REAL<span className="text-brand-teal">AGENTS</span>
          </h1>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
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
            className="hover:text-brand-teal transition-colors p-2 border-2 border-transparent hover:border-brand-black hover:bg-white dark:hover:bg-zinc-900 dark:hover:border-zinc-700 shadow-none hover:shadow-brutal-sm dark:hover:shadow-[2px_2px_0px_0px_#52525b]"
          >
            {selectedPropertyId || activeTab === 'profile' ? (
              <div className="w-8 h-8 rounded-full border-2 border-brand-black overflow-hidden bg-brand-teal shadow-brutal-sm">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatarSeed || 'User'}`} alt="User" />
              </div>
            ) : (
              <Zap className="w-6 h-6 fill-brand-teal text-brand-black" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={cn("flex-1 overflow-x-hidden", !selectedPropertyId && !isListingFlow && "pb-32")}>
        <AnimatePresence mode="wait">
          {isListingFlow ? (
            <motion.div
              key="listing-flow"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full"
            >
              <ListPropertyFlow 
                onBack={() => setIsListingFlow(false)} 
                onSubmit={handleAddListingRequest}
              />
            </motion.div>
          ) : selectedAgentId ? (
            <motion.div
              key="agent-profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <AgentProfile 
                agentId={selectedAgentId} 
                onBack={() => setSelectedAgentId(null)}
                onSelectProperty={handleSelectProperty}
              />
            </motion.div>
          ) : selectedPropertyId && selectedProperty ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <PropertyDetail 
                property={selectedProperty} 
                onBack={handleBackToMarketplace} 
                onNavigateToProperty={handleSelectProperty}
                onViewAgentProfile={(id) => setSelectedAgentId(id)}
                savedProperties={savedProperties}
                onToggleSave={toggleSavedProperty}
                user={user}
              />
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-5xl mx-auto"
            >
              {activeTab === 'home' && (
                <Marketplace 
                  onSelectProperty={handleSelectProperty} 
                  onViewAgentProfile={(id) => setSelectedAgentId(id)}
                  savedProperties={savedProperties} 
                  onToggleSave={toggleSavedProperty} 
                />
              )}
              {activeTab === 'ai' && <AISearch onSelectProperty={handleSelectProperty} />}
              {activeTab === 'profile' && (
                <Profile 
                  user={user}
                  onUpdateUser={(updates) => setUser(prev => ({ ...prev, ...updates }))}
                  onSelectProperty={handleSelectProperty} 
                  onViewAgentProfile={(id) => setSelectedAgentId(id)}
                  savedProperties={savedProperties} 
                  onToggleSave={toggleSavedProperty} 
                  viewedProperties={viewedProperties} 
                  listingRequests={listingRequests}
                  onUpdateListingRequest={handleUpdateListingRequest}
                />
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
              active={activeTab === 'profile'} 
              onClick={() => { setActiveTab('profile'); handleBackToMarketplace(); }}
              icon={<User />}
              label="Dashboard"
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

