import React, { createContext, useContext, useState, useEffect } from 'react';

interface UIContextType {
  isDarkMode: boolean;
  isMessagingOpen: boolean;
  activeChatId: string | null;
  setIsDarkMode: (isDark: boolean) => void;
  setIsMessagingOpen: (isOpen: boolean) => void;
  setActiveChatId: (id: string | null) => void;
  toggleDarkMode: () => void;
  openChat: (chatId?: string | null) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  useEffect(() => {
    const handleOpenChat = (e: any) => {
      setIsMessagingOpen(true);
      if (e.detail?.sessionId) {
        setActiveChatId(e.detail.sessionId);
      }
    };
    window.addEventListener('open-chat', handleOpenChat);
    return () => window.removeEventListener('open-chat', handleOpenChat);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const openChat = (chatId: string | null = null) => {
    setActiveChatId(chatId);
    setIsMessagingOpen(true);
  };

  return (
    <UIContext.Provider value={{
      isDarkMode,
      isMessagingOpen,
      activeChatId,
      setIsDarkMode,
      setIsMessagingOpen,
      setActiveChatId,
      toggleDarkMode,
      openChat
    }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
