import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useStore } from '../store/useStore';
import { colors, spacing } from '../theme';
import { Conversation } from '../types';

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  
  if (isToday) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function ConversationItem({ conversation, onPress }: { conversation: Conversation; onPress: () => void }) {
  const messageCount = conversation.messages.length;
  
  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.itemIcon}>
        <Text style={styles.itemIconText}>💬</Text>
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemPreview} numberOfLines={2}>
          {conversation.preview}
        </Text>
        <View style={styles.itemMeta}>
          <Text style={styles.itemTime}>{formatDate(conversation.updatedAt)}</Text>
          <Text style={styles.itemCount}>{messageCount} message{messageCount !== 1 ? 's' : ''}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function HistoryScreen() {
  const { conversations, loadConversations } = useStore();

  useEffect(() => {
    loadConversations();
  }, []);

  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <View style={styles.container}>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationItem
            conversation={item}
            onPress={() => {
              useStore.setState({ activeConversationId: item.id });
            }}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySubtitle}>
              Start talking to Chuck on the Talk tab
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    flexGrow: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '30',
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  itemIconText: {
    fontSize: 20,
  },
  itemContent: {
    flex: 1,
  },
  itemPreview: {
    fontSize: 15,
    color: colors.text,
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  itemTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  itemCount: {
    fontSize: 12,
    color: colors.textMuted,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
