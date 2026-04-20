import React, { useEffect, useCallback, useRef, useState } from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useStore } from '../store/useStore';
import { MicButton } from '../components/MicButton';
import { StatusIndicator } from '../components/StatusIndicator';
import { ChatBubble } from '../components/ChatBubble';
import { TextInputBar } from '../components/TextInput';
import { startRecording, stopRecording, requestPermissions } from '../services/audio';
import { transcribeAudio, configureSTTGateway, configureSTTOpenAI } from '../services/stt';
import { speak, stop as stopTTS, setTTSEnabled } from '../services/tts';
import {
  sendMessage, checkConnection, configureGateway, configureOpenAI,
  autoDetectGateway,
} from '../services/api';
import {
  initWakeWord, startWakeWordDetection, pauseWakeWordDetection,
  resumeWakeWordDetection, destroyWakeWord, isWakeWordAvailable,
} from '../services/wakeword';
import { isPrivateBuild } from '../config/build';
import { colors, spacing } from '../theme';
import { Message, PrivateSettings, PublicSettings } from '../types';

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const {
    status, setStatus,
    liveTranscript, setLiveTranscript,
    activeConversationId,
    createConversation, addMessage, getActiveConversation,
    settings, isConnected, setConnected,
    loadConversations, loadSettings,
    networkStatus, setNetworkStatus,
  } = useStore();

  const flatListRef = useRef<FlatList>(null);
  const [wakeWordActive, setWakeWordActive] = useState(false);

  useEffect(() => {
    (async () => {
      await loadSettings();
      await loadConversations();
      await requestPermissions();
    })();
  }, []);

  // Configure services when settings change
  useEffect(() => {
    setTTSEnabled(settings.ttsEnabled);

    if (isPrivateBuild() && settings.mode === 'private') {
      const ps = settings as PrivateSettings;
      configureGateway(ps.gatewayUrl, ps.authToken);
      configureSTTGateway(ps.gatewayUrl, ps.authToken);

      if (ps.networkMode === 'auto') {
        autoDetectGateway().then((result) => {
          if (result) {
            configureGateway(result.url, ps.authToken);
            configureSTTGateway(result.url, ps.authToken);
            setNetworkStatus(result.network === 'local' ? '📶 Local' : '🌐 Tailscale');
          }
        });
      }
    } else if (settings.mode === 'public') {
      const ps = settings as PublicSettings;
      configureOpenAI(ps.apiKey, ps.model);
      configureSTTOpenAI(ps.apiKey);
    }

    checkConnection().then(setConnected);
  }, [settings]);

  // Wake word detection
  useEffect(() => {
    if (!isPrivateBuild() || settings.mode !== 'private') return;
    const ps = settings as PrivateSettings;
    if (!ps.wakeWordEnabled || !ps.picovoiceAccessKey) return;

    let mounted = true;

    (async () => {
      const ok = await initWakeWord(() => {
        // Wake word detected — start recording
        if (mounted) handleWakeWordTriggered();
      }, ps.picovoiceAccessKey);

      if (ok && mounted) {
        await startWakeWordDetection();
        setWakeWordActive(true);
      }
    })();

    return () => {
      mounted = false;
      destroyWakeWord();
      setWakeWordActive(false);
    };
  }, [settings]);

  const handleWakeWordTriggered = useCallback(async () => {
    // Pause wake word while we record
    await pauseWakeWordDetection();

    if (settings.hapticEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    try {
      await startRecording();
      setStatus('listening');
      setLiveTranscript('Listening...');
    } catch {
      setStatus('error');
      await resumeWakeWordDetection();
    }
  }, [settings]);

  const activeConvo = getActiveConversation();
  const messages = activeConvo?.messages || [];

  const getConversationHistory = useCallback(() => {
    return messages.map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));
  }, [messages]);

  const processMessage = useCallback(async (text: string) => {
    let convoId = activeConversationId;
    if (!convoId) convoId = createConversation();

    addMessage(convoId, {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: Date.now(),
    });

    setStatus('thinking');
    try {
      const history = getConversationHistory();
      const response = await sendMessage(text, history);

      addMessage(convoId, {
        id: (Date.now() + 1).toString(),
        text: response.reply,
        sender: 'chuck',
        timestamp: Date.now(),
        status: 'done',
      });
      setStatus('done');

      if (settings.ttsEnabled && response.reply) {
        await speak(response.reply);
      }

      setTimeout(async () => {
        setStatus('idle');
        // Resume wake word after response is done
        await resumeWakeWordDetection();
      }, 2000);
    } catch (error: any) {
      addMessage(convoId, {
        id: (Date.now() + 1).toString(),
        text: error.message || 'Something went wrong',
        sender: 'chuck',
        timestamp: Date.now(),
        status: 'error',
      });
      setStatus('error');
      setTimeout(async () => {
        setStatus('idle');
        await resumeWakeWordDetection();
      }, 5000);
    }
  }, [activeConversationId, settings, getConversationHistory]);

  const handleMicPress = useCallback(async () => {
    if (settings.hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (status === 'listening') {
      setStatus('thinking');
      setLiveTranscript('');
      await pauseWakeWordDetection();

      const audioUri = await stopRecording();
      if (!audioUri) {
        setStatus('error');
        setTimeout(async () => { setStatus('idle'); await resumeWakeWordDetection(); }, 3000);
        return;
      }
      try {
        const transcript = await transcribeAudio(audioUri);
        if (transcript?.trim()) {
          await processMessage(transcript.trim());
        } else {
          setStatus('idle');
          await resumeWakeWordDetection();
        }
      } catch {
        setStatus('error');
        setTimeout(async () => { setStatus('idle'); await resumeWakeWordDetection(); }, 3000);
      }
    } else if (status === 'idle' || status === 'error' || status === 'done') {
      stopTTS();
      await pauseWakeWordDetection();
      try {
        await startRecording();
        setStatus('listening');
        setLiveTranscript('Recording...');
        if (settings.hapticEnabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
      } catch {
        setStatus('error');
        await resumeWakeWordDetection();
      }
    }
  }, [status, settings, processMessage]);

  const connectionLabel = isPrivateBuild()
    ? (isConnected ? `Connected ${networkStatus}` : 'Not connected')
    : (isConnected ? 'Connected to OpenAI' : 'Not connected');

  return (
    <View style={styles.container}>
      {/* Connection status bar */}
      <View style={styles.topBar}>
        <StatusIndicator isConnected={isConnected} label={connectionLabel} />
        {wakeWordActive && (
          <View style={styles.wakeWordBadge}>
            <Text style={styles.wakeWordText}>🎧 "Hey Chuck" active</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.7}
        >
          <Text style={styles.settingsBtnText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Setup banner when not connected */}
      {!isConnected && (
        <TouchableOpacity
          style={styles.setupBanner}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.8}
        >
          <Text style={styles.setupBannerIcon}>⚠️</Text>
          <View style={styles.setupBannerContent}>
            <Text style={styles.setupBannerTitle}>Setup Required</Text>
            <Text style={styles.setupBannerDesc}>
              {isPrivateBuild()
                ? 'Tap here to connect to your Chuck gateway'
                : 'Tap here to add your OpenAI API key'}
            </Text>
          </View>
          <Text style={styles.setupBannerArrow}>→</Text>
        </TouchableOpacity>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatBubble message={item} />}
        style={styles.messageList}
        contentContainerStyle={styles.messageContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎙️</Text>
            <Text style={styles.emptyTitle}>Hey Chuck</Text>
            <Text style={styles.emptySubtitle}>
              {wakeWordActive
                ? 'Say "Hey Chuck" to start\nor tap the mic below'
                : 'Tap the mic to start talking\nor type a message below'}
            </Text>
          </View>
        }
      />

      {/* Live transcript */}
      {liveTranscript ? (
        <View style={styles.transcriptBar}>
          <Text style={styles.transcriptText}>🔴 {liveTranscript}</Text>
        </View>
      ) : null}

      {/* Mic button */}
      <MicButton status={status} onPress={handleMicPress} />

      {/* Text input */}
      <TextInputBar
        onSend={(text) => processMessage(text)}
        disabled={status === 'listening' || status === 'thinking' || status === 'working'}
        placeholder="Or type a message..."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: spacing.sm,
  },
  wakeWordBadge: {
    backgroundColor: colors.done + '20',
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  wakeWordText: {
    fontSize: 11,
    color: colors.done,
    fontWeight: '600',
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsBtnText: { fontSize: 20 },
  setupBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '15',
    borderWidth: 1,
    borderColor: colors.warning + '40',
    borderRadius: 14,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    padding: spacing.md,
  },
  setupBannerIcon: { fontSize: 24, marginRight: spacing.md },
  setupBannerContent: { flex: 1 },
  setupBannerTitle: { fontSize: 16, fontWeight: '700', color: colors.warning },
  setupBannerDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  setupBannerArrow: { fontSize: 20, color: colors.warning, fontWeight: '700' },
  messageList: { flex: 1 },
  messageContent: { paddingVertical: spacing.sm, flexGrow: 1, justifyContent: 'flex-end' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: spacing.xxl },
  emptyIcon: { fontSize: 64, marginBottom: spacing.md },
  emptyTitle: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  emptySubtitle: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  transcriptBar: { backgroundColor: colors.surfaceLight, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginHorizontal: spacing.md, borderRadius: 12 },
  transcriptText: { color: colors.textSecondary, fontSize: 14 },
});
