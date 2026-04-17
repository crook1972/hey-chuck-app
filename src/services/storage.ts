import AsyncStorage from '@react-native-async-storage/async-storage';
import { Conversation, AppSettings } from '../types';

const CONVERSATIONS_KEY = '@heychuck:conversations';
const SETTINGS_KEY = '@heychuck:settings';

export async function loadConversations(): Promise<Conversation[]> {
  try {
    const raw = await AsyncStorage.getItem(CONVERSATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveConversations(conversations: Conversation[]): Promise<void> {
  try {
    // Keep only last 100 conversations
    const trimmed = conversations.slice(0, 100);
    await AsyncStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('Failed to save conversations:', e);
  }
}

export async function loadSettings(): Promise<AppSettings | null> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save settings:', e);
  }
}
