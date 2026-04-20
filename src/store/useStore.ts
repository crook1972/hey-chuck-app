import { create } from 'zustand';
import { AppStatus, Message, Conversation, AppSettings, PrivateSettings, PublicSettings } from '../types';
import { loadConversations, saveConversations, loadSettings, saveSettings } from '../services/storage';
import { isPrivateBuild, getPrivateConfig } from '../config/build';

interface AppState {
  status: AppStatus;
  setStatus: (status: AppStatus) => void;

  liveTranscript: string;
  setLiveTranscript: (text: string) => void;

  conversations: Conversation[];
  activeConversationId: string | null;
  loadConversations: () => Promise<void>;
  createConversation: () => string;
  addMessage: (conversationId: string, message: Message) => void;
  getActiveConversation: () => Conversation | undefined;

  settings: AppSettings;
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<PrivateSettings> | Partial<PublicSettings>) => void;

  isConnected: boolean;
  setConnected: (connected: boolean) => void;

  networkStatus: string;
  setNetworkStatus: (status: string) => void;
}

function getDefaultSettings(): AppSettings {
  if (isPrivateBuild()) {
    const config = getPrivateConfig();
    return {
      mode: 'private',
      gatewayUrl: config.defaultGatewayUrl,
      authToken: config.gatewayToken,
      networkMode: 'auto',
      ttsEnabled: true,
      hapticEnabled: true,
    };
  }
  return {
    mode: 'public',
    apiKey: '',
    model: 'gpt-4o-mini',
    ttsEnabled: true,
    hapticEnabled: true,
  };
}

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
        return { ...c, messages, updatedAt: Date.now(), preview: message.text.slice(0, 80) };
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

  settings: getDefaultSettings(),

  loadSettings: async () => {
    const saved = await loadSettings();
    if (saved) {
      set({ settings: { ...getDefaultSettings(), ...saved } });
    }
  },

  updateSettings: (partial) => {
    const settings = { ...get().settings, ...partial } as AppSettings;
    set({ settings });
    saveSettings(settings);
  },

  isConnected: false,
  setConnected: (connected) => set({ isConnected: connected }),

  networkStatus: '',
  setNetworkStatus: (status) => set({ networkStatus: status }),
}));
