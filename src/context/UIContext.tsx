import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

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
  const { user } = useAuth();
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
    const activeTheme = user?.preferences?.theme || 'system';
    
    const applyTheme = (theme: 'light' | 'dark' | 'system') => {
      let resolvedDark = false;
      if (theme === 'system') {
        resolvedDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
        resolvedDark = theme === 'dark';
      }
      
      if (resolvedDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      document.documentElement.setAttribute('data-theme', theme);
      setIsDarkMode(resolvedDark);
    };

    applyTheme(activeTheme);
    
    if (activeTheme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme('system');
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [user?.preferences?.theme]);

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
