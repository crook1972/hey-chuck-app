# Hey Chuck Voice App — Build Spec

## What We're Building
A React Native voice-first mobile app (Android first, Google Play target) that lets Jeff talk to Chuck-HQ via OpenClaw. Push-to-talk, speech-to-text, route to OpenClaw, get text + spoken response back.

## Platform
- **Android first** (Google Play)
- React Native (Expo if it speeds things up)
- TypeScript

## MVP Features (Phase 1+2 combined — ship fast)
1. **Push-to-talk button** — big, obvious, center of screen. Tap to start, tap to stop.
2. **Visual states** — Idle, Listening (recording), Thinking (processing), Working (agent busy), Done, Needs Approval
3. **Speech-to-text** — Use @react-native-voice/voice or expo-speech for real-time transcription. Show live transcript while recording.
4. **Send to OpenClaw** — POST transcript to OpenClaw API endpoint. Configure base URL in settings.
5. **Text response display** — Chat bubble style, with timestamps.
6. **Text-to-speech response** — Use expo-speech or react-native-tts to speak Chuck's reply. Tap to interrupt.
7. **Conversation history** — Scrollable list of past interactions, persisted locally (AsyncStorage or MMKV).
8. **Confirmation flow** — When response includes approval request, show approve/deny buttons prominently.
9. **Fallback text input** — Text field at bottom for typing when voice isn't practical.
10. **Settings screen** — OpenClaw API URL, auth token, TTS on/off, voice selection.
11. **Auth** — Simple token-based auth (paste API key in settings for MVP).

## UI Design
- Dark theme, clean, minimal
- Home screen: giant mic button center, status text above it, recent conversation below
- Conversation screen: chat bubbles (user = right/blue, chuck = left/green), timestamps
- Status bar at top showing connection state
- Bottom nav: Talk (home), History, Settings

## Technical Details
- Use React Navigation for routing
- Use zustand or context for state management
- Audio recording: react-native-audio-recorder-player or expo-av
- STT: @react-native-voice/voice (Google Speech on Android)
- TTS: expo-speech or @react-native-community/voice
- HTTP: axios or fetch to OpenClaw API
- Storage: @react-native-async-storage/async-storage
- Haptic feedback on record start/stop

## OpenClaw API Integration
For MVP, the app sends POST requests to the OpenClaw gateway:
- Endpoint: `{baseUrl}/api/v1/chat` (configurable)
- Headers: `Authorization: Bearer {token}`
- Body: `{ "message": "transcribed text", "session": "hey-chuck" }`
- Response: `{ "reply": "text", "status": "done|working|approval_needed", "approvalId": "..." }`

## File Structure
```
hey-chuck-app/
├── src/
│   ├── screens/
│   │   ├── HomeScreen.tsx        # Main talk screen
│   │   ├── HistoryScreen.tsx     # Conversation history
│   │   └── SettingsScreen.tsx    # Config
│   ├── components/
│   │   ├── MicButton.tsx         # The big talk button
│   │   ├── StatusIndicator.tsx   # Visual state display
│   │   ├── ChatBubble.tsx        # Message bubble
│   │   ├── ApprovalCard.tsx      # Approve/deny UI
│   │   └── TextInput.tsx         # Fallback text input
│   ├── services/
│   │   ├── audio.ts              # Recording management
│   │   ├── stt.ts                # Speech-to-text
│   │   ├── tts.ts                # Text-to-speech
│   │   ├── api.ts                # OpenClaw API client
│   │   └── storage.ts            # Local persistence
│   ├── store/
│   │   └── useStore.ts           # Zustand store
│   ├── types/
│   │   └── index.ts              # TypeScript types
│   ├── theme/
│   │   └── index.ts              # Colors, fonts, spacing
│   └── navigation/
│       └── index.tsx              # React Navigation setup
├── App.tsx
├── app.json
└── package.json
```

## Build & Ship
- Target: Google Play Store
- Use EAS Build if using Expo, or standard React Native CLI
- APK/AAB generation for testing
- Minimum Android API 26 (Android 8.0)
