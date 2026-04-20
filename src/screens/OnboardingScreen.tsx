import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useStore } from '../store/useStore';
import { checkConnection, configureApi } from '../services/api';
import { configureSTT } from '../services/stt';
import { colors, spacing } from '../theme';

const { width } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { updateSettings, setConnected } = useStore();
  const [step, setStep] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [verifying, setVerifying] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateTransition = (nextStep: number) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setStep(nextStep);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleVerifyAndContinue = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      Alert.alert('API Key Required', 'Enter your OpenAI API key to continue.');
      return;
    }
    if (!trimmed.startsWith('sk-')) {
      Alert.alert('Invalid Key', 'OpenAI API keys start with "sk-". Check your key and try again.');
      return;
    }

    setVerifying(true);
    configureApi(trimmed);
    configureSTT(trimmed);
    const ok = await checkConnection();
    setVerifying(false);

    if (ok) {
      updateSettings({ apiKey: trimmed });
      setConnected(true);
      animateTransition(3);
    } else {
      Alert.alert(
        'Connection Failed',
        'Could not verify this API key. Make sure it\'s correct and has credits available.',
        [
          { text: 'Try Again', style: 'cancel' },
          { text: 'Skip for Now', onPress: () => {
            updateSettings({ apiKey: trimmed });
            animateTransition(3);
          }},
        ]
      );
    }
  };

  const handleSkip = () => {
    animateTransition(3);
  };

  const handleFinish = () => {
    onComplete();
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.emoji}>🎙️</Text>
            <Text style={styles.title}>Welcome to{'\n'}Hey Chuck</Text>
            <Text style={styles.subtitle}>
              Your voice-first AI assistant.{'\n'}
              Ask questions, capture ideas, get things done —{'\n'}
              all by talking.
            </Text>
            <View style={styles.featureList}>
              <FeatureItem icon="🗣️" text="Push-to-talk voice input" />
              <FeatureItem icon="⚡" text="Powered by GPT & Whisper" />
              <FeatureItem icon="🔊" text="Spoken responses" />
              <FeatureItem icon="💬" text="Full conversation history" />
            </View>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => animateTransition(1)}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.emoji}>🔑</Text>
            <Text style={styles.title}>Connect to OpenAI</Text>
            <Text style={styles.subtitle}>
              Hey Chuck uses OpenAI for chat and voice transcription.{'\n'}
              You'll need an API key to get started.
            </Text>

            <View style={styles.stepCard}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>
                Go to platform.openai.com and sign in (or create an account)
              </Text>
            </View>
            <View style={styles.stepCard}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>
                Navigate to API Keys and create a new secret key
              </Text>
            </View>
            <View style={styles.stepCard}>
              <Text style={styles.stepNumber}>3</Text>
              <Text style={styles.stepText}>
                Copy the key and paste it on the next screen
              </Text>
            </View>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => Linking.openURL('https://platform.openai.com/api-keys')}
              activeOpacity={0.7}
            >
              <Text style={styles.linkButtonText}>Open OpenAI Platform →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => animateTransition(2)}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>I Have My Key</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        );

      case 2:
        return (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.stepContainer}
          >
            <Text style={styles.emoji}>🔐</Text>
            <Text style={styles.title}>Enter Your API Key</Text>
            <Text style={styles.subtitle}>
              Paste your OpenAI API key below.{'\n'}
              It stays on your device — never shared.
            </Text>

            <TextInput
              style={styles.apiInput}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="sk-..."
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              multiline={false}
            />

            <Text style={styles.privacyNote}>
              🔒 Your key is stored locally on this device only.
              We never see or transmit it to our servers.
            </Text>

            <TouchableOpacity
              style={[styles.primaryButton, verifying && styles.primaryButtonDisabled]}
              onPress={handleVerifyAndContinue}
              disabled={verifying}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>
                {verifying ? 'Verifying...' : 'Verify & Continue'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.emoji}>🚀</Text>
            <Text style={styles.title}>You're Ready!</Text>
            <Text style={styles.subtitle}>
              {apiKey
                ? 'Your API key is set. You\'re good to go!'
                : 'You can add your API key anytime in Settings.'}
            </Text>

            <View style={styles.tipCard}>
              <Text style={styles.tipTitle}>Quick Tips</Text>
              <Text style={styles.tipText}>
                🎙️  <Text style={styles.tipBold}>Tap the mic</Text> to start talking
              </Text>
              <Text style={styles.tipText}>
                ✋  <Text style={styles.tipBold}>Tap again</Text> to stop and send
              </Text>
              <Text style={styles.tipText}>
                ⌨️  <Text style={styles.tipBold}>Type below</Text> if you prefer text
              </Text>
              <Text style={styles.tipText}>
                ⚙️  <Text style={styles.tipBold}>Settings tab</Text> to change model or key
              </Text>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleFinish}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Start Talking to Chuck</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Progress dots */}
      <View style={styles.dotsContainer}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[styles.dot, step >= i && styles.dotActive]}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {renderStep()}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: spacing.xxl,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xxl + spacing.lg,
    paddingBottom: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceLight,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
  stepContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  emoji: {
    fontSize: 72,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  featureList: {
    alignSelf: 'stretch',
    marginBottom: spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  featureIcon: {
    fontSize: 22,
    marginRight: spacing.md,
    width: 32,
    textAlign: 'center',
  },
  featureText: {
    fontSize: 16,
    color: colors.text,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  stepNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    width: 32,
    textAlign: 'center',
    marginRight: spacing.sm,
  },
  stepText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  apiInput: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 17,
    borderWidth: 2,
    borderColor: colors.primary + '40',
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  privacyNote: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  linkButton: {
    alignSelf: 'stretch',
    paddingVertical: spacing.sm + 4,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '40',
    marginBottom: spacing.md,
  },
  linkButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  primaryButton: {
    alignSelf: 'stretch',
    paddingVertical: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 18,
  },
  skipButton: {
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  skipText: {
    color: colors.textMuted,
    fontSize: 15,
  },
  tipCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  tipText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 28,
  },
  tipBold: {
    color: colors.text,
    fontWeight: '600',
  },
});
