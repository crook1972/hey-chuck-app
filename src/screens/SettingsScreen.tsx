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
import { checkConnection, autoDetectGateway, configureGateway } from '../services/api';
import { configureSTTGateway } from '../services/stt';
import { isPrivateBuild, getPrivateConfig, BUILD_VARIANT } from '../config/build';
import { colors, spacing } from '../theme';
import { PrivateSettings, PublicSettings } from '../types';

// ============================================
// Private Build Settings (Jeff's build)
// ============================================

function PrivateSettingsView() {
  const { settings, updateSettings, isConnected, setConnected, networkStatus, setNetworkStatus } = useStore();
  const ps = settings as PrivateSettings;
  const config = getPrivateConfig();

  const [gatewayUrl, setGatewayUrl] = useState(ps.gatewayUrl);
  const [authToken, setAuthToken] = useState(ps.authToken);
  const [testing, setTesting] = useState(false);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    setGatewayUrl(ps.gatewayUrl);
    setAuthToken(ps.authToken);
  }, [ps.gatewayUrl, ps.authToken]);

  const handleSave = () => {
    updateSettings({ gatewayUrl: gatewayUrl.trim(), authToken: authToken.trim() });
    Alert.alert('Saved', 'Gateway settings updated');
  };

  const handleTest = async () => {
    setTesting(true);
    updateSettings({ gatewayUrl: gatewayUrl.trim(), authToken: authToken.trim() });
    configureGateway(gatewayUrl.trim(), authToken.trim());
    configureSTTGateway(gatewayUrl.trim(), authToken.trim());
    const ok = await checkConnection();
    setConnected(ok);
    setTesting(false);
    Alert.alert(ok ? '✅ Connected' : '❌ Failed', ok ? 'Gateway is reachable!' : 'Cannot reach gateway. Check URL and token.');
  };

  const handleAutoDetect = async () => {
    setDetecting(true);
    const result = await autoDetectGateway();
    setDetecting(false);

    if (result) {
      setGatewayUrl(result.url);
      updateSettings({ gatewayUrl: result.url });
      configureGateway(result.url, authToken);
      configureSTTGateway(result.url, authToken);
      setNetworkStatus(result.network === 'local' ? '📶 Local' : '🌐 Tailscale');

      const ok = await checkConnection();
      setConnected(ok);
      Alert.alert('✅ Found Gateway', `Connected via ${result.network === 'local' ? 'local network' : 'Tailscale'}\n${result.url}`);
    } else {
      Alert.alert('❌ Not Found', 'Could not find the gateway on local network or Tailscale. Enter the URL manually.');
    }
  };

  const handleUseLocal = () => {
    setGatewayUrl(config.gatewayLocalUrl);
    updateSettings({ gatewayUrl: config.gatewayLocalUrl, networkMode: 'local' });
  };

  const handleUseTailscale = () => {
    setGatewayUrl(config.gatewayTailscaleUrl);
    updateSettings({ gatewayUrl: config.gatewayTailscaleUrl, networkMode: 'tailscale' });
  };

  const [picoKey, setPicoKey] = useState(ps.picovoiceAccessKey || '');

  return (
    <>
      <Text style={styles.sectionTitle}>Gateway Connection</Text>
      <View style={styles.card}>
        {/* Quick connect buttons */}
        <Text style={styles.label}>Quick Connect</Text>
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={[styles.quickBtn, styles.autoBtn]}
            onPress={handleAutoDetect}
            disabled={detecting}
          >
            <Text style={styles.quickBtnText}>
              {detecting ? '🔍 Detecting...' : '🔍 Auto-Detect'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.quickBtn} onPress={handleUseLocal}>
            <Text style={styles.quickBtnText}>📶 Local Network</Text>
            <Text style={styles.quickBtnSub}>{config.gatewayLocalUrl}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={handleUseTailscale}>
            <Text style={styles.quickBtnText}>🌐 Tailscale</Text>
            <Text style={styles.quickBtnSub}>{config.gatewayTailscaleUrl}</Text>
          </TouchableOpacity>
        </View>

        {/* Manual URL */}
        <Text style={[styles.label, { marginTop: spacing.md }]}>Gateway URL</Text>
        <TextInput
          style={styles.input}
          value={gatewayUrl}
          onChangeText={setGatewayUrl}
          placeholder="http://..."
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
          placeholder="Gateway auth token"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.testBtn} onPress={handleTest} disabled={testing}>
            <Text style={styles.testBtnText}>{testing ? 'Testing...' : 'Test'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: isConnected ? colors.done : colors.danger }]} />
          <Text style={styles.statusText}>
            {isConnected ? `Connected ${networkStatus}` : 'Not connected'}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Wake Word — "Hey Chuck"</Text>
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>Wake Word Detection</Text>
            <Text style={styles.switchDesc}>Say "Hey Chuck" to activate</Text>
          </View>
          <Switch
            value={ps.wakeWordEnabled}
            onValueChange={(v) => updateSettings({ wakeWordEnabled: v })}
            trackColor={{ false: colors.surfaceLight, true: colors.primary + '60' }}
            thumbColor={ps.wakeWordEnabled ? colors.primary : colors.textMuted}
          />
        </View>

        <Text style={[styles.label, { marginTop: spacing.md }]}>Picovoice Access Key</Text>
        <TextInput
          style={styles.input}
          value={picoKey}
          onChangeText={setPicoKey}
          placeholder="Get free key at console.picovoice.ai"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.testBtn} onPress={() => Linking.openURL('https://console.picovoice.ai')}>
            <Text style={styles.testBtnText}>Get Free Key →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={() => {
            updateSettings({ picovoiceAccessKey: picoKey.trim() });
            Alert.alert('Saved', 'Restart the app to activate wake word.');
          }}>
            <Text style={styles.saveBtnText}>Save Key</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.autoNote, { marginTop: spacing.sm }]}>
          Wake word runs entirely on-device. No audio is sent to the cloud for detection.
        </Text>
      </View>
    </>
  );
}

// ============================================
// Public Build Settings (OpenAI)
// ============================================

function PublicSettingsView() {
  const { settings, updateSettings, isConnected, setConnected } = useStore();
  const ps = settings as PublicSettings;
  const [apiKey, setApiKey] = useState(ps.apiKey);
  const [testing, setTesting] = useState(false);

  useEffect(() => { setApiKey(ps.apiKey); }, [ps.apiKey]);

  const handleSave = async () => {
    const trimmed = apiKey.trim();
    updateSettings({ apiKey: trimmed });
    if (trimmed) {
      setTesting(true);
      const ok = await checkConnection();
      setConnected(ok);
      setTesting(false);
      Alert.alert(ok ? '✅ Valid' : '❌ Invalid', ok ? 'API key verified!' : 'Could not verify key.');
    }
  };

  const MODELS = [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
    { value: 'gpt-4.1', label: 'GPT-4.1' },
  ];

  return (
    <>
      <Text style={styles.sectionTitle}>OpenAI API Key</Text>
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          value={apiKey}
          onChangeText={setApiKey}
          placeholder="sk-..."
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          secureTextEntry
        />
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.testBtn} onPress={() => Linking.openURL('https://platform.openai.com/api-keys')}>
            <Text style={styles.testBtnText}>Get Key →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={testing}>
            <Text style={styles.saveBtnText}>{testing ? 'Verifying...' : 'Save & Verify'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: isConnected ? colors.done : colors.danger }]} />
          <Text style={styles.statusText}>{isConnected ? 'Key verified' : ps.apiKey ? 'Not verified' : 'No key set'}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>AI Model</Text>
      <View style={styles.card}>
        {MODELS.map((m) => (
          <TouchableOpacity
            key={m.value}
            style={styles.radioRow}
            onPress={() => updateSettings({ model: m.value })}
          >
            <View style={[styles.radio, ps.model === m.value && styles.radioActive]}>
              {ps.model === m.value && <View style={styles.radioInner} />}
            </View>
            <Text style={styles.radioText}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
}

// ============================================
// Main Settings Screen
// ============================================

export function SettingsScreen() {
  const { settings, updateSettings } = useStore();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {isPrivateBuild() ? <PrivateSettingsView /> : <PublicSettingsView />}

      <Text style={styles.sectionTitle}>Preferences</Text>
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>Text-to-Speech</Text>
            <Text style={styles.switchDesc}>Speak responses aloud</Text>
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
            <Text style={styles.switchDesc}>Vibrate on mic tap</Text>
          </View>
          <Switch
            value={settings.hapticEnabled}
            onValueChange={(v) => updateSettings({ hapticEnabled: v })}
            trackColor={{ false: colors.surfaceLight, true: colors.primary + '60' }}
            thumbColor={settings.hapticEnabled ? colors.primary : colors.textMuted}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>About</Text>
      <View style={styles.card}>
        <Text style={styles.aboutText}>Hey Chuck v1.0.0</Text>
        <Text style={styles.aboutSub}>
          {isPrivateBuild() ? 'Private Build — OpenClaw Gateway' : 'Public Build — OpenAI API'}
        </Text>
        <Text style={styles.aboutSub}>Build: {BUILD_VARIANT}</Text>
        <Text style={[styles.aboutSub, { marginTop: spacing.sm }]}>© 2026 Chuck Intelligence</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.lg, marginBottom: spacing.sm, marginLeft: spacing.xs },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.md },
  label: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.sm },
  input: { backgroundColor: colors.surfaceLight, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, color: colors.text, fontSize: 15, borderWidth: 1, borderColor: colors.border },
  quickRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  quickBtn: { flex: 1, backgroundColor: colors.surfaceLight, borderRadius: 12, padding: spacing.sm + 2, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  autoBtn: { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' },
  quickBtnText: { fontSize: 14, fontWeight: '600', color: colors.text },
  quickBtnSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  buttonRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  testBtn: { flex: 1, paddingVertical: spacing.sm + 2, borderRadius: 10, backgroundColor: colors.surfaceLight, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  testBtnText: { color: colors.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: spacing.sm + 2, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' },
  saveBtnText: { color: colors.text, fontWeight: '600' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.sm },
  statusText: { fontSize: 13, color: colors.textMuted },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border + '30' },
  switchLabel: { fontSize: 16, color: colors.text },
  switchDesc: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  radioRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: colors.border + '20' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.textMuted, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  radioActive: { borderColor: colors.primary },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
  radioText: { fontSize: 16, color: colors.text },
  aboutText: { fontSize: 16, color: colors.text, fontWeight: '600' },
  aboutSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  autoNote: { fontSize: 12, color: colors.textMuted, lineHeight: 16 },
});
