import React from 'react';
import { useProjectStore } from './stores/projectStore';
import { WelcomeScreen } from './components/layout/WelcomeScreen';
import { AppShell } from './components/layout/AppShell';

export function App() {
  const { projectPath } = useProjectStore();

  if (!projectPath) {
    return <WelcomeScreen />;
  }

  return <AppShell />;
}
