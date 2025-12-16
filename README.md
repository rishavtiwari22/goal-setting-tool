# AI Interview Client

Client-side React TypeScript interview application that runs interviews entirely on the client using DeepSeek API.

## Features

- Client-side interview execution (no server calls during interview)
- STS (Speech-to-Speech) logic with 2.5s silence detection
- Piper TTS with loading states
- DeepSeek API integration for question generation and answer analysis
- Local storage for interview sessions and results
- React Router for navigation
- Chakra UI for components

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` file:

```
VITE_API_BASE_URL=https://interview.ai.navgurukul.org/api/v1
VITE_API_TOKEN=your_token_here
VITE_DEEPSEEK_API_KEY=your_deepseek_key_here
VITE_DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
```

3. Run development server:

```bash
npm run dev
```

## Project Structure

- `src/pages/` - Page components (SelfApply, Interview, Results)
- `src/components/` - Reusable UI components
- `src/services/` - Business logic (API, interview engine, storage)
- `src/hooks/` - Custom React hooks
- `src/models/` - TypeScript type definitions
- `src/utils/stt/` - STS logic (copied from original project)
- `src/lib/` - Third-party configurations (Piper TTS)

## Flow

1. User visits `/selfapply`
2. Enters email and checks user via GET API
3. Selects job or enters custom job details
4. Configures test (language, difficulty, time, examination points)
5. Piper TTS loads (if not already ready)
6. Navigates to `/interview` - interview runs entirely on client
7. After completion, shows results on `/results`
8. All data stored in local storage

## Notes

- Interview runs completely on client - no POST calls to server during interview
- Uses DeepSeek API directly (no LangChain)
- Same prompts and restrictions as server implementation
- STS logic copied from original project
- Piper TTS with progress indicators
