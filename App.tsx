import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigation } from './src/navigation';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { useStore } from './src/store/useStore';

const ONBOARDING_KEY = '@heychuck:onboarded';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const loadSettings = useStore((s) => s.loadSettings);
  const loadConversations = useStore((s) => s.loadConversations);

  useEffect(() => {
    (async () => {
      await loadSettings();
      await loadConversations();
      const onboarded = await AsyncStorage.getItem(ONBOARDING_KEY);
      setShowOnboarding(!onboarded);
      setLoading(false);
    })();
  }, []);

  const handleOnboardingComplete = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };

  if (loading) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {showOnboarding ? (
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      ) : (
        <AppNavigation />
      )}
    </SafeAreaProvider>
  );
}
