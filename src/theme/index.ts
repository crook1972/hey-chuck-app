export const colors = {
  background: '#0D0D0F',
  surface: '#1A1A1F',
  surfaceLight: '#252530',
  primary: '#4A9EFF',
  primaryDark: '#2D7AD4',
  accent: '#34D399',
  danger: '#EF4444',
  warning: '#F59E0B',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  userBubble: '#1D4ED8',
  chuckBubble: '#1F2937',
  border: '#374151',
  listening: '#EF4444',
  thinking: '#F59E0B',
  working: '#4A9EFF',
  done: '#34D399',
  idle: '#6B7280',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const fonts = {
  regular: { fontSize: 16, color: colors.text },
  small: { fontSize: 14, color: colors.textSecondary },
  tiny: { fontSize: 12, color: colors.textMuted },
  large: { fontSize: 20, fontWeight: '600' as const, color: colors.text },
  title: { fontSize: 28, fontWeight: '700' as const, color: colors.text },
};

export const micButtonSize = 120;
export const micButtonSizeActive = 140;
