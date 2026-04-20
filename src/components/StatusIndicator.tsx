import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';

interface StatusIndicatorProps {
  isConnected: boolean;
  label?: string;
}

export function StatusIndicator({ isConnected, label }: StatusIndicatorProps) {
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.dot,
          { backgroundColor: isConnected ? colors.done : colors.danger },
        ]}
      />
      <Text style={styles.text}>
        {label || (isConnected ? 'Connected' : 'Disconnected')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  text: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
