import React, { useEffect, useCallback, useRef } from 'react';
import { View, FlatList, StyleSheet, Text } from 'react-native';
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
import { isPrivateBuild } from '../config/build';
import { colors, spacing } from '../theme';
import { Message, PrivateSettings, PublicSettings } from '../types';

export function HomeScreen() {
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

      // Auto-detect best network on startup
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
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error: any) {
      addMessage(convoId, {
        id: (Date.now() + 1).toString(),
        text: error.message || 'Something went wrong',
        sender: 'chuck',
        timestamp: Date.now(),
        status: 'error',
      });
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  }, [activeConversationId, settings, getConversationHistory]);

  const handleMicPress = useCallback(async () => {
    if (settings.hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (status === 'listening') {
      setStatus('thinking');
      setLiveTranscript('');
      const audioUri = await stopRecording();
      if (!audioUri) {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
        return;
      }
      try {
        const transcript = await transcribeAudio(audioUri);
        if (transcript?.trim()) {
          await processMessage(transcript.trim());
        } else {
          setStatus('idle');
        }
      } catch {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    } else if (status === 'idle' || status === 'error' || status === 'done') {
      stopTTS();
      try {
        await startRecording();
        setStatus('listening');
        setLiveTranscript('Recording...');
        if (settings.hapticEnabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
      } catch {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    }
  }, [status, settings, processMessage]);

  const connectionLabel = isPrivateBuild()
    ? (isConnected ? `Connected ${networkStatus}` : 'Disconnected')
    : (isConnected ? 'Connected to OpenAI' : 'Not connected');

  return (
    <View style={styles.container}>
      <StatusIndicator isConnected={isConnected} label={connectionLabel} />

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
              {isPrivateBuild()
                ? 'Tap the mic to talk to Chuck'
                : 'Your voice-first AI assistant\nTap the mic or type below'}
            </Text>
            {!isConnected && (
              <Text style={styles.connectHint}>
                {isPrivateBuild()
                  ? '⚠️ Cannot reach gateway — check Settings'
                  : '⚠️ Add your OpenAI API key in Settings'}
              </Text>
            )}
          </View>
        }
      />

      {liveTranscript ? (
        <View style={styles.transcriptBar}>
          <Text style={styles.transcriptText}>🔴 {liveTranscript}</Text>
        </View>
      ) : null}

      <MicButton status={status} onPress={handleMicPress} />

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
  messageList: { flex: 1 },
  messageContent: { paddingVertical: spacing.sm, flexGrow: 1, justifyContent: 'flex-end' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: spacing.xxl },
  emptyIcon: { fontSize: 64, marginBottom: spacing.md },
  emptyTitle: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  emptySubtitle: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  connectHint: { fontSize: 14, color: colors.warning, marginTop: spacing.md, textAlign: 'center' },
  transcriptBar: { backgroundColor: colors.surfaceLight, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginHorizontal: spacing.md, borderRadius: 12 },
  transcriptText: { color: colors.textSecondary, fontSize: 14 },
});
