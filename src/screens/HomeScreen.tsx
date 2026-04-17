import React, { useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useStore } from '../store/useStore';
import { MicButton } from '../components/MicButton';
import { StatusIndicator } from '../components/StatusIndicator';
import { ChatBubble } from '../components/ChatBubble';
import { ApprovalCard } from '../components/ApprovalCard';
import { TextInputBar } from '../components/TextInput';
import { startRecording, stopRecording, requestPermissions } from '../services/audio';
import { transcribeAudio, configureSTT } from '../services/stt';
import { speak, stop as stopTTS, setTTSEnabled } from '../services/tts';
import { sendMessage, sendApproval, configureApi, checkConnection } from '../services/api';
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
    configureApi(settings.apiUrl, settings.authToken);
    configureSTT(settings.apiUrl, settings.authToken);
    setTTSEnabled(settings.ttsEnabled);

    // Check connection
    checkConnection().then(setConnected);
    const interval = setInterval(() => {
      checkConnection().then(setConnected);
    }, 30000);
    return () => clearInterval(interval);
  }, [settings]);

  const activeConvo = getActiveConversation();
  const messages = activeConvo?.messages || [];
  const lastMessage = messages[messages.length - 1];
  const showApproval = lastMessage?.status === 'approval_needed' && lastMessage.approvalId;

  const processMessage = useCallback(async (text: string) => {
    // Ensure we have a conversation
    let convoId = activeConversationId;
    if (!convoId) {
      convoId = createConversation();
    }

    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: Date.now(),
    };
    addMessage(convoId, userMsg);

    // Send to Chuck
    setStatus('thinking');
    try {
      const response = await sendMessage(text);

      const chuckMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: response.reply,
        sender: 'chuck',
        timestamp: Date.now(),
        status: response.status === 'approval_needed' ? 'approval_needed' : 
               response.status === 'working' ? 'working' : 'done',
        approvalId: response.approvalId,
      };
      addMessage(convoId, chuckMsg);
      setStatus(chuckMsg.status || 'done');

      // Speak the response
      if (settings.ttsEnabled && response.reply) {
        await speak(response.reply);
      }

      // Auto-reset to idle after done
      if (response.status === 'done') {
        setTimeout(() => setStatus('idle'), 3000);
      }
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
  }, [activeConversationId, settings]);

  const handleMicPress = useCallback(async () => {
    if (settings.hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (status === 'listening') {
      // Stop recording
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
        if (transcript) {
          await processMessage(transcript);
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
        if (settings.hapticEnabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
      } catch {
        setStatus('error');
      }
    }
  }, [status, settings, processMessage]);

  const handleApproval = useCallback(async (approved: boolean) => {
    if (!lastMessage?.approvalId) return;
    setStatus('working');
    try {
      const response = await sendApproval(lastMessage.approvalId, approved);
      const convoId = activeConversationId!;
      const msg: Message = {
        id: Date.now().toString(),
        text: response.reply,
        sender: 'chuck',
        timestamp: Date.now(),
        status: response.status === 'done' ? 'done' : 'working',
      };
      addMessage(convoId, msg);
      setStatus('done');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
    }
  }, [lastMessage, activeConversationId]);

  const handleTextSend = useCallback((text: string) => {
    processMessage(text);
  }, [processMessage]);

  return (
    <View style={styles.container}>
      <StatusIndicator isConnected={isConnected} />

      {/* Messages */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatBubble message={item} />}
        style={styles.messageList}
        contentContainerStyle={styles.messageContent}
        inverted={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎙️</Text>
            <Text style={styles.emptyTitle}>Hey Chuck</Text>
            <Text style={styles.emptySubtitle}>
              Tap the mic to start talking
            </Text>
          </View>
        }
      />

      {/* Live transcript */}
      {liveTranscript ? (
        <View style={styles.transcriptBar}>
          <Text style={styles.transcriptText}>{liveTranscript}</Text>
        </View>
      ) : null}

      {/* Approval card */}
      {showApproval && (
        <ApprovalCard
          message={lastMessage!.text}
          onApprove={() => handleApproval(true)}
          onDeny={() => handleApproval(false)}
        />
      )}

      {/* Mic button */}
      <MicButton status={status} onPress={handleMicPress} />

      {/* Text input fallback */}
      <TextInputBar
        onSend={handleTextSend}
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
    fontStyle: 'italic',
  },
});
