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

// Private build settings (OpenClaw gateway)
export interface PrivateSettings {
  mode: 'private';
  gatewayUrl: string;
  authToken: string;
  networkMode: 'auto' | 'local' | 'tailscale';
  ttsEnabled: boolean;
  hapticEnabled: boolean;
  wakeWordEnabled: boolean;
  picovoiceAccessKey: string;
}

// Public build settings (OpenAI direct)
export interface PublicSettings {
  mode: 'public';
  apiKey: string;
  model: string;
  ttsEnabled: boolean;
  hapticEnabled: boolean;
}

export type AppSettings = PrivateSettings | PublicSettings;

export interface ApiResponse {
  reply: string;
  status: 'done' | 'working';
}
