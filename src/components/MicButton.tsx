import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Animated,
  StyleSheet,
  View,
  Text,
} from 'react-native';
import { colors, micButtonSize, micButtonSizeActive, spacing } from '../theme';
import { AppStatus } from '../types';

interface MicButtonProps {
  status: AppStatus;
  onPress: () => void;
  disabled?: boolean;
}

const statusLabels: Record<AppStatus, string> = {
  idle: 'Tap to Talk',
  listening: 'Listening...',
  thinking: 'Thinking...',
  working: 'Working...',
  done: 'Done',
  error: 'Error — Tap to Retry',
};

const statusColors: Record<AppStatus, string> = {
  idle: colors.idle,
  listening: colors.listening,
  thinking: colors.thinking,
  working: colors.working,
  done: colors.done,
  error: colors.danger,
};

const statusIcons: Record<AppStatus, string> = {
  idle: '🎙️',
  listening: '🔴',
  thinking: '💭',
  working: '⚡',
  done: '✅',
  error: '❌',
};

export function MicButton({ status, onPress, disabled }: MicButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status === 'listening') {
      // Scale up
      Animated.spring(scaleAnim, {
        toValue: micButtonSizeActive / micButtonSize,
        useNativeDriver: true,
      }).start();

      // Pulse animation
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      // Glow
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();

      return () => pulse.stop();
    } else {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [status]);

  // Thinking/working spinner animation
  const spinAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (status === 'thinking' || status === 'working') {
      const spin = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );
      spin.start();
      return () => spin.stop();
    } else {
      spinAnim.setValue(0);
    }
  }, [status]);

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [statusColors[status] + '40', statusColors[status]],
  });

  const isInteractive = status === 'idle' || status === 'listening' || status === 'error' || status === 'done';

  return (
    <View style={styles.container}>
      <Text style={[styles.statusLabel, { color: statusColors[status] }]}>
        {statusLabels[status]}
      </Text>
      <Animated.View
        style={[
          styles.glowRing,
          {
            borderColor,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: statusColors[status] + '20',
                borderColor: statusColors[status],
              },
            ]}
            onPress={onPress}
            disabled={disabled || !isInteractive}
            activeOpacity={0.7}
          >
            <Text style={styles.icon}>{statusIcons[status]}</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.lg,
    letterSpacing: 0.5,
  },
  glowRing: {
    borderRadius: (micButtonSize + 40) / 2,
    borderWidth: 2,
    padding: 16,
  },
  button: {
    width: micButtonSize,
    height: micButtonSize,
    borderRadius: micButtonSize / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  icon: {
    fontSize: 48,
  },
});
