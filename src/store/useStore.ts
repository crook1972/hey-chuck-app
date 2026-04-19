import { create } from 'zustand';
import { AppStatus, Message, Conversation, AppSettings } from '../types';
import { loadConversations, saveConversations, loadSettings, saveSettings } from '../services/storage';

interface AppState {
  // Status
  status: AppStatus;
  setStatus: (status: AppStatus) => void;

  // Current transcript (live while recording)
  liveTranscript: string;
  setLiveTranscript: (text: string) => void;

  // Conversations
  conversations: Conversation[];
  activeConversationId: string | null;
  loadConversations: () => Promise<void>;
  createConversation: () => string;
  addMessage: (conversationId: string, message: Message) => void;
  getActiveConversation: () => Conversation | undefined;

  // Settings
  settings: AppSettings;
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => void;

  // Connection
  isConnected: boolean;
  setConnected: (connected: boolean) => void;
}

const defaultSettings: AppSettings = {
  apiUrl: 'http://localhost:18789',
  authToken: '',
  ttsEnabled: true,
  hapticEnabled: true,
};

export const useStore = create<AppState>((set, get) => ({
  status: 'idle',
  setStatus: (status) => set({ status }),

  liveTranscript: '',
  setLiveTranscript: (text) => set({ liveTranscript: text }),

  conversations: [],
  activeConversationId: null,

  loadConversations: async () => {
    const convos = await loadConversations();
    set({ conversations: convos });
  },

  createConversation: () => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const convo: Conversation = {
      id,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      preview: 'New conversation',
    };
    const conversations = [convo, ...get().conversations];
    set({ conversations, activeConversationId: id });
    saveConversations(conversations);
    return id;
  },

  addMessage: (conversationId, message) => {
    const conversations = get().conversations.map((c) => {
      if (c.id === conversationId) {
        const messages = [...c.messages, message];
        return {
          ...c,
          messages,
          updatedAt: Date.now(),
          preview: message.text.slice(0, 80),
        };
      }
      return c;
    });
    set({ conversations });
    saveConversations(conversations);
  },

  getActiveConversation: () => {
    const { conversations, activeConversationId } = get();
    return conversations.find((c) => c.id === activeConversationId);
  },

  settings: defaultSettings,

  loadSettings: async () => {
    const settings = await loadSettings();
    if (settings) set({ settings });
  },

  updateSettings: (partial) => {
    const settings = { ...get().settings, ...partial };
    set({ settings });
    saveSettings(settings);
  },

  isConnected: false,
  setConnected: (connected) => set({ isConnected: connected }),
}));
