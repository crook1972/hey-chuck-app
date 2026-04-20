export type AppStatus = 'idle' | 'listening' | 'thinking' | 'working' | 'done' | 'error';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'chuck';
  timestamp: number;
  status?: AppStatus;
}

export interface Conversation {
  id: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  preview: string;
}

export interface AppSettings {
  apiKey: string;
  model: string;
  ttsEnabled: boolean;
  hapticEnabled: boolean;
}

export interface ApiResponse {
  reply: string;
  status: 'done' | 'working';
}
