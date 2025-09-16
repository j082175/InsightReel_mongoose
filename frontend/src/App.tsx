import React from 'react';
import { AppProvider, SettingsProvider } from './app/providers';
import { PageRouter } from './app/routing';
import { Header } from './shared/components/layout';

function App() {
  return (
    <SettingsProvider>
      <AppProvider>
        <div className="min-h-screen bg-gray-100">
          <Header />
          <PageRouter />
        </div>
      </AppProvider>
    </SettingsProvider>
  );
}

export default App;
