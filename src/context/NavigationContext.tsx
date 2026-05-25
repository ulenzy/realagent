import React, { createContext, useContext, useState, useEffect } from 'react';

type ActiveTab = 'marketplace' | 'ai' | 'myspace' | 'profile';

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
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTabState] = useState<ActiveTab>('marketplace');
  const [selectedPropertyId, setSelectedPropertyIdState] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentIdState] = useState<string | null>(null);
  const [isListingFlow, setIsListingFlowState] = useState(false);
  const [viewedProperties, setViewedProperties] = useState<string[]>([]);

  // Instantly scroll to top when navigation states change
  const scrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const setActiveTab = (tab: ActiveTab) => {
    setActiveTabState(tab);
    setSelectedPropertyIdState(null);
    setSelectedAgentIdState(null);
    setIsListingFlowState(false);
    scrollToTop();
  };

  const setSelectedPropertyId = (id: string | null) => {
    setSelectedPropertyIdState(id);
    if (id) {
      setSelectedAgentIdState(null);
      setIsListingFlowState(false);
      scrollToTop();
    }
  };

  const setSelectedAgentId = (id: string | null) => {
    setSelectedAgentIdState(id);
    if (id) {
      setSelectedPropertyIdState(null);
      setIsListingFlowState(false);
      scrollToTop();
    }
  };

  const setIsListingFlow = (isOpen: boolean) => {
    setIsListingFlowState(isOpen);
    if (isOpen) {
      setSelectedPropertyIdState(null);
      setSelectedAgentIdState(null);
      scrollToTop();
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
    scrollToTop();
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
      handleSelectProperty
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
