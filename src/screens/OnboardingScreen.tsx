import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  ScrollView, Alert,
} from 'react-native';
import { useStore } from '../store/useStore';
import { checkConnection, autoDetectGateway, configureGateway } from '../services/api';
import { configureSTTGateway } from '../services/stt';
import { isPrivateBuild, getPrivateConfig } from '../config/build';
import { colors, spacing } from '../theme';
import { PrivateSettings } from '../types';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { settings, updateSettings, setConnected, setNetworkStatus } = useStore();
  const [step, setStep] = useState(0);
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const totalSteps = isPrivateBuild() ? 3 : 4;

  const animateTransition = (nextStep: number) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setStep(nextStep);
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    });
  };

  const handleAutoConnect = async () => {
    setDetecting(true);
    const result = await autoDetectGateway();
    setDetecting(false);

    if (result) {
      const ps = settings as PrivateSettings;
      configureGateway(result.url, ps.authToken);
      configureSTTGateway(result.url, ps.authToken);
      updateSettings({ gatewayUrl: result.url });
      setNetworkStatus(result.network === 'local' ? '📶 Local' : '🌐 Tailscale');

      const ok = await checkConnection();
      setConnected(ok);
      setDetected(true);

      if (ok) {
        Alert.alert(
          '✅ Connected!',
          `Found Chuck via ${result.network === 'local' ? 'local network' : 'Tailscale'}`,
          [{ text: 'Continue', onPress: () => animateTransition(2) }]
        );
      }
    } else {
      Alert.alert(
        'Not Found',
        'Could not auto-detect the gateway. You can configure it manually in Settings.',
        [{ text: 'Continue Anyway', onPress: () => animateTransition(2) }]
      );
    }
  };

  const renderPrivateStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.emoji}>🎙️</Text>
            <Text style={styles.title}>Hey Chuck</Text>
            <Text style={styles.subtitle}>
              Your personal voice line to Chuck.{'\n'}
              Talk, delegate, check status — hands-free.
            </Text>
            <View style={styles.featureList}>
              <Feature icon="🗣️" text="Push-to-talk voice commands" />
              <Feature icon="⚡" text="Connected to your Chuck instance" />
              <Feature icon="🔊" text="Spoken responses" />
              <Feature icon="🌐" text="Works over Tailscale anywhere" />
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => animateTransition(1)} activeOpacity={0.8}>
              <Text style={styles.primaryBtnText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.emoji}>{detecting ? '🔍' : detected ? '✅' : '🔗'}</Text>
            <Text style={styles.title}>Connect to Chuck</Text>
            <Text style={styles.subtitle}>
              Let's find your Chuck gateway.{'\n'}
              This works on your home network and over Tailscale.
            </Text>

            <TouchableOpacity
              style={[styles.primaryBtn, detecting && styles.primaryBtnDisabled]}
              onPress={handleAutoConnect}
              disabled={detecting}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>
                {detecting ? '🔍 Searching...' : '🔍 Auto-Connect'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.autoNote}>
              Checks local network first, then Tailscale
            </Text>

            <TouchableOpacity style={styles.skipBtn} onPress={() => animateTransition(2)}>
              <Text style={styles.skipText}>Configure manually in Settings</Text>
            </TouchableOpacity>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.emoji}>🚀</Text>
            <Text style={styles.title}>Ready!</Text>
            <Text style={styles.subtitle}>
              {detected
                ? 'Connected to Chuck. You\'re good to go.'
                : 'You can connect to Chuck anytime in Settings.'}
            </Text>
            <View style={styles.tipCard}>
              <Text style={styles.tipTitle}>How to Use</Text>
              <Text style={styles.tipText}>🎙️  <Text style={styles.tipBold}>Tap the mic</Text> to start talking</Text>
              <Text style={styles.tipText}>✋  <Text style={styles.tipBold}>Tap again</Text> to stop and send</Text>
              <Text style={styles.tipText}>⌨️  <Text style={styles.tipBold}>Type below</Text> the mic for text input</Text>
              <Text style={styles.tipText}>⚙️  <Text style={styles.tipBold}>Settings tab</Text> to switch networks</Text>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={onComplete} activeOpacity={0.8}>
              <Text style={styles.primaryBtnText}>Start Talking to Chuck</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  // Public build uses API key onboarding (simplified)
  const renderPublicStep = () => {
    // Reuse existing public onboarding logic
    return renderPrivateStep(); // Fallback — public build should use separate onboarding
  };

  return (
    <View style={styles.container}>
      <View style={styles.dotsContainer}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <View key={i} style={[styles.dot, step >= i && styles.dotActive]} />
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Animated.View style={{ opacity: fadeAnim }}>
          {isPrivateBuild() ? renderPrivateStep() : renderPublicStep()}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function Feature({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingBottom: spacing.xxl },
  dotsContainer: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, paddingTop: spacing.xxl + spacing.lg, paddingBottom: spacing.md },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.surfaceLight },
  dotActive: { backgroundColor: colors.primary, width: 24 },
  stepContainer: { alignItems: 'center', paddingHorizontal: spacing.lg },
  emoji: { fontSize: 72, marginBottom: spacing.lg },
  title: { fontSize: 32, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: spacing.xl },
  featureList: { alignSelf: 'stretch', marginBottom: spacing.xl },
  featureItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  featureIcon: { fontSize: 22, marginRight: spacing.md, width: 32, textAlign: 'center' },
  featureText: { fontSize: 16, color: colors.text },
  primaryBtn: { alignSelf: 'stretch', paddingVertical: spacing.md, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', marginTop: spacing.sm },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: colors.text, fontWeight: '700', fontSize: 18 },
  skipBtn: { marginTop: spacing.md, padding: spacing.sm },
  skipText: { color: colors.textMuted, fontSize: 15 },
  autoNote: { fontSize: 13, color: colors.textMuted, marginTop: spacing.sm },
  tipCard: { alignSelf: 'stretch', backgroundColor: colors.surface, borderRadius: 16, padding: spacing.lg, marginBottom: spacing.lg },
  tipTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  tipText: { fontSize: 15, color: colors.textSecondary, lineHeight: 28 },
  tipBold: { color: colors.text, fontWeight: '600' },
});
