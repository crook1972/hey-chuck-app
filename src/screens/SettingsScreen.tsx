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
} from 'react-native';
import { useStore } from '../store/useStore';
import { checkConnection } from '../services/api';
import { colors, spacing } from '../theme';

export function SettingsScreen() {
  const { settings, updateSettings, isConnected, setConnected } = useStore();
  const [apiUrl, setApiUrl] = useState(settings.apiUrl);
  const [authToken, setAuthToken] = useState(settings.authToken);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setApiUrl(settings.apiUrl);
    setAuthToken(settings.authToken);
  }, [settings]);

  const handleSave = () => {
    updateSettings({ apiUrl: apiUrl.trim(), authToken: authToken.trim() });
    Alert.alert('Saved', 'Settings updated successfully');
  };

  const handleTestConnection = async () => {
    setTesting(true);
    // Temporarily configure with new values
    updateSettings({ apiUrl: apiUrl.trim(), authToken: authToken.trim() });
    const ok = await checkConnection();
    setConnected(ok);
    setTesting(false);
    Alert.alert(
      ok ? '✅ Connected' : '❌ Connection Failed',
      ok ? 'Successfully connected to Chuck' : 'Could not reach the server. Check the URL and try again.'
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Connection */}
      <Text style={styles.sectionTitle}>Connection</Text>
      <View style={styles.card}>
        <Text style={styles.label}>OpenClaw API URL</Text>
        <TextInput
          style={styles.input}
          value={apiUrl}
          onChangeText={setApiUrl}
          placeholder="http://localhost:3000"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        <Text style={styles.label}>Auth Token</Text>
        <TextInput
          style={styles.input}
          value={authToken}
          onChangeText={setAuthToken}
          placeholder="Paste your API token"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.testButton} onPress={handleTestConnection} disabled={testing}>
            <Text style={styles.testButtonText}>
              {testing ? 'Testing...' : 'Test Connection'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: isConnected ? colors.done : colors.danger }]} />
          <Text style={styles.statusText}>
            {isConnected ? 'Connected' : 'Not connected'}
          </Text>
        </View>
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
        <Text style={styles.aboutSubtext}>Voice-first interface for Chuck-HQ</Text>
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
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
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
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  testButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: 10,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  testButtonText: {
    color: colors.textSecondary,
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
    marginTop: 4,
  },
});
