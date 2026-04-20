import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { useStore } from '../store/useStore';
import { checkConnection } from '../services/api';
import { colors, spacing } from '../theme';

const MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', desc: 'Fast & affordable' },
  { value: 'gpt-4o', label: 'GPT-4o', desc: 'Most capable' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', desc: 'Latest mini' },
  { value: 'gpt-4.1', label: 'GPT-4.1', desc: 'Latest flagship' },
];

export function SettingsScreen() {
  const { settings, updateSettings, isConnected, setConnected } = useStore();
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setApiKey(settings.apiKey);
  }, [settings.apiKey]);

  const handleSaveKey = async () => {
    const trimmed = apiKey.trim();
    updateSettings({ apiKey: trimmed });

    if (trimmed) {
      setTesting(true);
      const ok = await checkConnection();
      setConnected(ok);
      setTesting(false);
      Alert.alert(
        ok ? '✅ Connected' : '❌ Invalid Key',
        ok ? 'API key is valid. You\'re ready to go!' : 'Could not verify the key. Check it and try again.'
      );
    }
  };

  const handleGetKey = () => {
    Linking.openURL('https://platform.openai.com/api-keys');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* API Key */}
      <Text style={styles.sectionTitle}>OpenAI API Key</Text>
      <View style={styles.card}>
        <Text style={styles.desc}>
          Hey Chuck uses OpenAI for chat (GPT) and voice transcription (Whisper).
          Enter your own API key to get started.
        </Text>

        <TextInput
          style={styles.input}
          value={apiKey}
          onChangeText={setApiKey}
          placeholder="sk-..."
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.linkButton} onPress={handleGetKey}>
            <Text style={styles.linkButtonText}>Get API Key →</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveKey}
            disabled={testing}
          >
            <Text style={styles.saveButtonText}>
              {testing ? 'Verifying...' : 'Save & Verify'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: isConnected ? colors.done : colors.danger }]} />
          <Text style={styles.statusText}>
            {isConnected ? 'API key verified' : settings.apiKey ? 'Key not verified' : 'No key set'}
          </Text>
        </View>
      </View>

      {/* Model */}
      <Text style={styles.sectionTitle}>AI Model</Text>
      <View style={styles.card}>
        {MODELS.map((m) => (
          <TouchableOpacity
            key={m.value}
            style={[
              styles.modelRow,
              settings.model === m.value && styles.modelRowActive,
            ]}
            onPress={() => updateSettings({ model: m.value })}
          >
            <View style={[
              styles.radio,
              settings.model === m.value && styles.radioActive,
            ]}>
              {settings.model === m.value && <View style={styles.radioInner} />}
            </View>
            <View style={styles.modelInfo}>
              <Text style={styles.modelName}>{m.label}</Text>
              <Text style={styles.modelDesc}>{m.desc}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Preferences */}
      <Text style={styles.sectionTitle}>Preferences</Text>
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>Text-to-Speech</Text>
            <Text style={styles.switchDescription}>Speak Chuck's responses aloud</Text>
          </View>
          <Switch
            value={settings.ttsEnabled}
            onValueChange={(v) => updateSettings({ ttsEnabled: v })}
            trackColor={{ false: colors.surfaceLight, true: colors.primary + '60' }}
            thumbColor={settings.ttsEnabled ? colors.primary : colors.textMuted}
          />
        </View>

        <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
          <View>
            <Text style={styles.switchLabel}>Haptic Feedback</Text>
            <Text style={styles.switchDescription}>Vibrate on mic tap</Text>
          </View>
          <Switch
            value={settings.hapticEnabled}
            onValueChange={(v) => updateSettings({ hapticEnabled: v })}
            trackColor={{ false: colors.surfaceLight, true: colors.primary + '60' }}
            thumbColor={settings.hapticEnabled ? colors.primary : colors.textMuted}
          />
        </View>
      </View>

      {/* About */}
      <Text style={styles.sectionTitle}>About</Text>
      <View style={styles.card}>
        <Text style={styles.aboutText}>Hey Chuck v1.0.0</Text>
        <Text style={styles.aboutSubtext}>Voice-first AI assistant</Text>
        <Text style={styles.aboutSubtext}>Powered by OpenAI GPT & Whisper</Text>
        <Text style={[styles.aboutSubtext, { marginTop: spacing.sm }]}>© 2026 Chuck Intelligence</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
  },
  desc: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
    fontFamily: 'monospace',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  linkButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: 10,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkButtonText: {
    color: colors.primary,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  statusText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '20',
  },
  modelRowActive: {},
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  radioActive: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  modelDesc: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '30',
  },
  switchLabel: {
    fontSize: 16,
    color: colors.text,
  },
  switchDescription: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  aboutText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  aboutSubtext: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
});
