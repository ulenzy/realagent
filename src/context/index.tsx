import React from 'react';
import { AuthProvider } from './AuthContext';
import { NavigationProvider } from './NavigationContext';
import { UIProvider } from './UIContext';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <NavigationProvider>
        <UIProvider>
          {children}
        </UIProvider>
      </NavigationProvider>
    </AuthProvider>
  );
};
