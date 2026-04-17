import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';
import { Message } from '../types';

interface ChatBubbleProps {
  message: Message;
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.sender === 'user';

  return (
    <View style={[styles.row, isUser ? styles.rowRight : styles.rowLeft]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.chuckBubble,
        ]}
      >
        {!isUser && <Text style={styles.senderName}>Chuck</Text>}
        <Text style={styles.text}>{message.text}</Text>
        <Text style={styles.time}>{formatTime(message.timestamp)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  rowLeft: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  userBubble: {
    backgroundColor: colors.userBubble,
    borderBottomRightRadius: 4,
  },
  chuckBubble: {
    backgroundColor: colors.chuckBubble,
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '600',
    marginBottom: 2,
  },
  text: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
  },
  time: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
});
