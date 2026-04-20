import React, { useEffect, useCallback, useRef } from 'react';
import { View, FlatList, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useStore } from '../store/useStore';
import { MicButton } from '../components/MicButton';
import { StatusIndicator } from '../components/StatusIndicator';
import { ChatBubble } from '../components/ChatBubble';
import { TextInputBar } from '../components/TextInput';
import { startRecording, stopRecording, requestPermissions } from '../services/audio';
import { transcribeAudio, configureSTT } from '../services/stt';
import { speak, stop as stopTTS, setTTSEnabled } from '../services/tts';
import { sendMessage, configureApi, checkConnection } from '../services/api';
import { colors, spacing } from '../theme';
import { Message } from '../types';

export function HomeScreen() {
  const {
    status, setStatus,
    liveTranscript, setLiveTranscript,
    conversations, activeConversationId,
    createConversation, addMessage, getActiveConversation,
    settings, isConnected, setConnected,
    loadConversations, loadSettings,
  } = useStore();

  const flatListRef = useRef<FlatList>(null);

  // Init
  useEffect(() => {
    (async () => {
      await loadSettings();
      await loadConversations();
      await requestPermissions();
    })();
  }, []);

  // Configure services when settings change
  useEffect(() => {
    configureApi(settings.apiKey, settings.model);
    configureSTT(settings.apiKey);
    setTTSEnabled(settings.ttsEnabled);

    // Check connection (validates API key)
    checkConnection().then(setConnected);
  }, [settings]);

  const activeConvo = getActiveConversation();
  const messages = activeConvo?.messages || [];

  // Build conversation history for GPT context
  const getConversationHistory = useCallback(() => {
    return messages.map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));
  }, [messages]);

  const processMessage = useCallback(async (text: string) => {
    let convoId = activeConversationId;
    if (!convoId) {
      convoId = createConversation();
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: Date.now(),
    };
    addMessage(convoId, userMsg);

    setStatus('thinking');
    try {
      const history = getConversationHistory();
      const response = await sendMessage(text, history);

      const chuckMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: response.reply,
        sender: 'chuck',
        timestamp: Date.now(),
        status: 'done',
      };
      addMessage(convoId, chuckMsg);
      setStatus('done');

      if (settings.ttsEnabled && response.reply) {
        await speak(response.reply);
      }

      setTimeout(() => setStatus('idle'), 2000);
    } catch (error: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: error.message || 'Something went wrong',
        sender: 'chuck',
        timestamp: Date.now(),
        status: 'error',
      };
      addMessage(convoId, errorMsg);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  }, [activeConversationId, settings, getConversationHistory]);

  const handleMicPress = useCallback(async () => {
    if (settings.hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (status === 'listening') {
      // Stop recording and transcribe via Whisper
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
        if (transcript && transcript.trim()) {
          await processMessage(transcript.trim());
        } else {
          setStatus('idle');
        }
      } catch {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    } else if (status === 'idle' || status === 'error' || status === 'done') {
      // Start recording
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

  return (
    <View style={styles.container}>
      <StatusIndicator isConnected={isConnected} />

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
              Your voice-first AI assistant{'\n'}
              Tap the mic or type below
            </Text>
            {!isConnected && (
              <Text style={styles.connectHint}>
                ⚠️ Add your OpenAI API key in Settings to get started
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  messageList: {
    flex: 1,
  },
  messageContent: {
    paddingVertical: spacing.sm,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  connectHint: {
    fontSize: 14,
    color: colors.warning,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  transcriptBar: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    borderRadius: 12,
  },
  transcriptText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
