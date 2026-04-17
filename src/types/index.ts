export type AppStatus = 'idle' | 'listening' | 'thinking' | 'working' | 'done' | 'approval_needed' | 'error';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'chuck';
  timestamp: number;
  status?: AppStatus;
  approvalId?: string;
}

export interface Conversation {
  id: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  preview: string;
}

export interface AppSettings {
  apiUrl: string;
  authToken: string;
  ttsEnabled: boolean;
  hapticEnabled: boolean;
}

export interface ApiResponse {
  reply: string;
  status: 'done' | 'working' | 'approval_needed';
  approvalId?: string;
}
