import React, { createContext, useContext, useState, useEffect } from 'react';

type ActiveTab = 'marketplace' | 'ai' | 'myspace' | 'profile' | 'admin';

interface NavigationContextType {
  activeTab: ActiveTab;
  selectedPropertyId: string | null;
  selectedAgentId: string | null;
  isListingFlow: boolean;
  viewedProperties: string[];
  setActiveTab: (tab: ActiveTab) => void;
  setSelectedPropertyId: (id: string | null) => void;
  setSelectedAgentId: (id: string | null) => void;
  setIsListingFlow: (isOpen: boolean) => void;
  handleBackToMarketplace: () => void;
  handleSelectProperty: (id: string) => void;
  mySpaceSubTab: 'Wishlist' | 'My Listings' | 'Bids' | 'Leaderboard' | null;
  setMySpaceSubTab: (tab: 'Wishlist' | 'My Listings' | 'Bids' | 'Leaderboard' | null) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTabState] = useState<ActiveTab>('marketplace');
  const [selectedPropertyId, setSelectedPropertyIdState] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentIdState] = useState<string | null>(null);
  const [isListingFlow, setIsListingFlowState] = useState(false);
  const [viewedProperties, setViewedProperties] = useState<string[]>([]);
  const [mySpaceSubTab, setMySpaceSubTab] = useState<'Wishlist' | 'My Listings' | 'Bids' | 'Leaderboard' | null>(null);

  const setActiveTab = (tab: ActiveTab) => {
    setActiveTabState(tab);
    setSelectedPropertyIdState(null);
    setSelectedAgentIdState(null);
    setIsListingFlowState(false);
    if (tab !== 'myspace') {
      setMySpaceSubTab(null);
    }
  };

  const setSelectedPropertyId = (id: string | null) => {
    setSelectedPropertyIdState(id);
    if (id) {
      setSelectedAgentIdState(null);
      setIsListingFlowState(false);
    }
  };

  const setSelectedAgentId = (id: string | null) => {
    setSelectedAgentIdState(id);
    if (id) {
      setSelectedPropertyIdState(null);
      setIsListingFlowState(false);
    }
  };

  const setIsListingFlow = (isOpen: boolean) => {
    setIsListingFlowState(isOpen);
    if (isOpen) {
      setSelectedPropertyIdState(null);
      setSelectedAgentIdState(null);
    }
  };

  useEffect(() => {
    const handleOpenListing = () => {
      setIsListingFlow(true);
    };
    window.addEventListener('open-listing-flow', handleOpenListing);
    return () => window.removeEventListener('open-listing-flow', handleOpenListing);
  }, []);

  const handleBackToMarketplace = () => {
    setSelectedPropertyIdState(null);
    setSelectedAgentIdState(null);
    setIsListingFlowState(false);
  };

  const handleSelectProperty = (id: string) => {
    setSelectedPropertyId(id);
    setViewedProperties(prev => {
      const filtered = prev.filter(pId => pId !== id);
      return [id, ...filtered];
    });
  };

  return (
    <NavigationContext.Provider value={{
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
      mySpaceSubTab,
      setMySpaceSubTab
    }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
