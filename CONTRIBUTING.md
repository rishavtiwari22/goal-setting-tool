# Contributing to AI Interview Client

Welcome to the AI Interview Client project! This guide will help you understand the codebase, set up your development environment, and contribute effectively.

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Guidelines](#development-guidelines)
- [API Integration](#api-integration)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

## Project Overview

The AI Interview Client is a React 19 + TypeScript SPA that conducts AI-powered voice interviews entirely on the client side. Key features:

- **Client-only execution**: Interview logic runs in browser without server calls during sessions
- **Speech-to-speech**: Web Speech API (STT) + Piper TTS for natural conversation
- **Local-first storage**: localStorage with Firebase background sync
- **Streaming AI**: Real-time question generation via Lambda/HuggingFace
- **Multi-phase interviews**: Introduction → Project → Technical phases
- **Admin dashboard**: Job and user management

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Pages   │    │   Custom Hooks   │    │   UI Components │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ • Home          │    │ • useInterview   │    │ • MessageBubble │
│ • SelfApply     │    │ • useSpeechRec   │    │ • AudioVisual   │
│ • Interview     │    │ • useStreamTTS   │    │ • DeviceTester  │
│ • Results       │    │ • usePageTrack   │    │ • JobSelection  │
│ • Admin*        │    │ • useWakeLock    │    │ • Radix UI      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
┌─────────────────────────────────┼─────────────────────────────────┐
│                    Services Layer                                  │
├─────────────────────────────────┼─────────────────────────────────┤
│ Interview Engine    │ API Services     │ Storage Services          │
│ • StateManager      │ • DeepSeek API   │ • InterviewStorage        │
│ • PromptBuilder     │ • Server API     │ • Firebase Storage        │
│ • InterviewConfig   │ • Admin API      │ • Sync Manager            │
│                     │ • Invitation API │ • Write Queue             │
├─────────────────────┼──────────────────┼───────────────────────────┤
│ Speech Services     │ Analytics        │ Utils                     │
│ • STT Logic         │ • GA4            │ • Environment             │
│ • VAD Controller    │ • Mixpanel       │ • JWT Utils               │
│ • Piper TTS         │ • Unified Track  │ • ONNX Setup              │
└─────────────────────┴──────────────────┴───────────────────────────┘
```

### Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | React + TypeScript | 19.2.3 + ~5.9.3 | UI framework with type safety |
| **Build** | Vite | 7.2.4 | Fast bundling and dev server |
| **Routing** | React Router DOM | 7.10.1 | Client-side routing |
| **Styling** | Tailwind CSS | 4.1.18 | Utility-first CSS |
| **UI** | Radix UI + Lucide | Latest | Accessible components + icons |
| **Speech** | Web Speech API + Piper TTS | Native + 1.0.4 | STT + local TTS |
| **AI** | DeepSeek API via Lambda | - | Question generation & analysis |
| **Storage** | localStorage + Firebase | 11.1.0 | Local-first with cloud sync |
| **Analytics** | GA4 + Mixpanel | - | Event tracking |

## Development Setup

### Prerequisites

- **Node.js**: 18+ (for global fetch and modern features)
- **npm**: Latest version
- **Modern browser**: Chrome/Edge/Firefox with Web Speech API support

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-interviewer-standalone-client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   ```
   
   **Required environment variables:**
   ```env
   VITE_API_BASE_URL=https://interview.ai.navgurukul.org/api/v1
   VITE_API_TOKEN=your_api_token_here
   VITE_LAMBDA_API_URL=your_lambda_endpoint_here
   ```
   
   **Optional variables:**
   ```env
   # Firebase (for cloud sync and admin features)
   VITE_FIREBASE_API_KEY=your_firebase_key
   VITE_FIREBASE_PROJECT_ID=your_project_id
   # ... other Firebase config
   
   # Analytics
   VITE_GA4_MEASUREMENT_ID=your_ga4_id
   
   # HuggingFace (alternative AI backend)
   VITE_HUGGINGFACE_API_URL=your_hf_endpoint
   VITE_HUGGINGFACE_API_KEY=your_hf_key
   VITE_HUGGINGFACE_MODEL=your_model_name
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```
   
   The app will be available at `http://localhost:5173`

### Build and Deploy

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Test API latency (requires .env setup)
npm run test:latency
npm run test:lambda
```

## Project Structure

```
src/
├── pages/                    # Route-level page components
│   ├── Home.tsx             # Landing page with interview type selection
│   ├── SelfApply.tsx        # Interview configuration interface
│   ├── Interview.tsx        # Main interview execution interface
│   ├── Results.tsx          # Interview results display
│   ├── InvitedInterview.tsx # Invitation-based interview flow
│   └── Admin*.tsx           # Admin dashboard pages
│
├── components/              # Reusable UI components
│   ├── ui/                  # Base UI components (Radix-based)
│   │   ├── button.tsx       # Button component
│   │   ├── card.tsx         # Card container
│   │   ├── dialog.tsx       # Modal dialogs
│   │   ├── input.tsx        # Text inputs
│   │   └── ...              # Other UI primitives
│   ├── feedback/            # Feedback-related components
│   ├── interview/           # Interview-specific components
│   ├── results/             # Results display components
│   ├── AudioVisualizer.tsx  # Real-time audio waveform
│   ├── DeviceTester.tsx     # Mic/speaker testing
│   ├── JobSelection.tsx     # Job selection interface
│   └── ...                  # Other feature components
│
├── services/                # Business logic and API services
│   ├── interview/           # Interview engine
│   │   ├── interviewEngine.ts        # Core interview configuration
│   │   ├── interviewStateManager.ts  # Session orchestration
│   │   └── promptBuilder.ts          # AI prompt construction
│   ├── api/                 # API integration services
│   │   ├── deepseekApi.ts   # DeepSeek/Lambda API integration
│   │   ├── serverApi.ts     # Backend API integration
│   │   ├── adminApi.ts      # Admin API endpoints
│   │   └── invitationApi.ts # Invitation management
│   ├── storage/             # Data persistence services
│   │   ├── interviewStorage.ts       # localStorage management
│   │   ├── firebaseStorage.ts        # Firestore operations
│   │   ├── syncManager.ts            # Background sync orchestration
│   │   ├── syncWorker.ts             # Background sync processing
│   │   ├── writeQueue.ts             # Priority-based write queue
│   │   └── ...                       # Other storage utilities
│   ├── analytics/           # Analytics services
│   │   ├── index.ts         # Unified analytics facade
│   │   ├── ga4.ts          # Google Analytics 4
│   │   └── mixpanel.ts     # Mixpanel integration
│   └── firebase/           # Firebase configuration
│
├── hooks/                   # Custom React hooks
│   ├── useInterview.ts      # Interview state management
│   ├── useSpeechRecognition.ts  # Speech-to-text integration
│   ├── useStreamingTTS.ts   # Text-to-speech streaming
│   ├── usePageTracking.ts   # Analytics page tracking
│   └── useScreenWakeLock.ts # Prevent screen sleep
│
├── models/                  # TypeScript type definitions
│   ├── interview.ts         # Interview-related types
│   ├── job.ts              # Job-related types
│   └── user.ts             # User-related types
│
├── utils/                   # Utility functions
│   ├── env.ts              # Environment variable management
│   ├── jwt.ts              # JWT token utilities
│   └── stt/                # Speech-to-text utilities
│       ├── sttLogic.ts     # Web Speech API wrapper
│       └── vadController.ts # Voice activity detection
│
├── lib/                     # Third-party library configurations
│   ├── piper.ts            # Piper TTS configuration
│   ├── ort-setup.ts        # ONNX Runtime setup
│   └── utils.ts            # General utilities
│
├── styles/                  # Global styles
│   └── codeHighlight.css   # Code syntax highlighting
│
└── workers/                 # Web Workers
    └── feedbackWorker.ts   # Background feedback processing (unused)
```

## Development Guidelines

### Code Organization

1. **Feature-based organization**: Group related components, hooks, and services together
2. **Single responsibility**: Each file should have one clear purpose
3. **Consistent naming**: Use descriptive names that reflect functionality
4. **Export patterns**: Use named exports for utilities, default exports for components

### Component Guidelines

1. **Functional components**: Use function declarations with TypeScript
   ```typescript
   interface ComponentProps {
     title: string;
     onAction: () => void;
   }
   
   export default function Component({ title, onAction }: ComponentProps) {
     // Component logic
   }
   ```

2. **Custom hooks**: Extract complex logic into reusable hooks
   ```typescript
   export function useCustomHook(config: Config) {
     const [state, setState] = useState(initialState);
     
     // Hook logic
     
     return { state, actions };
   }
   ```

3. **Props interface**: Always define TypeScript interfaces for props
4. **Error boundaries**: Wrap components that might fail
5. **Loading states**: Always handle loading and error states

### State Management Patterns

1. **Local state**: Use `useState` for component-local state
2. **Complex state**: Use `useReducer` for complex state logic
3. **Custom hooks**: Extract stateful logic into custom hooks
4. **Global state**: Use services and context for shared state
5. **Persistence**: Use localStorage for client-side persistence

### API Integration Patterns

1. **Service layer**: Keep API calls in service files, not components
2. **Error handling**: Always handle API errors gracefully
3. **Loading states**: Provide loading indicators for async operations
4. **Retry logic**: Implement retry for transient failures
5. **Type safety**: Define TypeScript interfaces for API responses

### Speech Integration Guidelines

1. **STT/TTS coordination**: Never run STT and TTS simultaneously
2. **Permission handling**: Always check microphone permissions
3. **Error recovery**: Handle speech API failures gracefully
4. **User feedback**: Provide visual feedback for speech states
5. **Accessibility**: Provide text alternatives for speech features

## API Integration

### DeepSeek API (via Lambda)

The primary AI API for question generation and analysis:

```typescript
// Streaming question generation
async function* createQuestion(systemMessage: string, humanMessage: string) {
  const response = await fetch(LAMBDA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'tgi',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: humanMessage }
      ],
      stream: true,
      temperature: 0.5
    })
  });
  
  // Handle streaming response
  yield* streamResponse(response);
}
```

### Server API

Backend API for user and job management:

```typescript
// Example API call with authentication
async function getJobs(): Promise<Job[]> {
  const response = await fetch(`${API_BASE_URL}/job`, {
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.data;
}
```

### Firebase Integration

Optional cloud storage for session sync:

```typescript
// Session synchronization
async function syncSession(email: string, session: InterviewSession) {
  try {
    await updateSessionDocument(email, session);
    markFieldSynced(session.sessionId, 'session');
  } catch (error) {
    // Queue for background sync
    writeQueue.enqueue({
      sessionId: session.sessionId,
      operation: 'session',
      data: session,
      priority: 'normal'
    });
  }
}
```

## Testing

### Manual Testing

1. **Speech functionality**: Test with different browsers and microphones
2. **Interview flow**: Complete full interview cycles
3. **Error scenarios**: Test network failures, permission denials
4. **Device compatibility**: Test on different devices and screen sizes
5. **Performance**: Monitor memory usage during long interviews

### API Testing

Use the built-in latency testing tools:

```bash
# Test all API endpoints with latency measurement
npm run test:latency

# Test Lambda endpoint specifically
npm run test:lambda
```

### Browser Testing

Required browser features:
- Web Speech API (STT)
- Web Audio API (TTS)
- SharedArrayBuffer (ONNX Runtime)
- IndexedDB (Piper voice caching)
- localStorage (session persistence)

## Pull Request Process

### Before Submitting

1. **Test thoroughly**: Ensure your changes work across different scenarios
2. **Check console**: No errors or warnings in browser console
3. **Verify types**: TypeScript compilation should be clean
4. **Test speech**: If touching speech code, test STT/TTS functionality
5. **Performance**: Check for memory leaks or performance regressions

### PR Guidelines

1. **Clear title**: Describe what the PR does
2. **Detailed description**: Explain the changes and reasoning
3. **Testing notes**: Describe how you tested the changes
4. **Screenshots**: Include screenshots for UI changes
5. **Breaking changes**: Clearly mark any breaking changes

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Manual testing completed
- [ ] Speech functionality tested
- [ ] Cross-browser testing
- [ ] API integration tested

## Screenshots
(If applicable)

## Notes
Any additional context or considerations
```

## Code Style

### TypeScript

```typescript
// Use interfaces for object types
interface InterviewConfig {
  userId: string;
  jobId: string;
  jobTitle: string;
  // ... other properties
}

// Use type unions for specific values
type InterviewPhase = 'introduction' | 'project' | 'technical';

// Use optional properties appropriately
interface OptionalProps {
  required: string;
  optional?: number;
}
```

### React Components

```typescript
// Component with proper typing
interface ComponentProps {
  title: string;
  onAction: (id: string) => void;
  children?: React.ReactNode;
}

export default function Component({ title, onAction, children }: ComponentProps) {
  const [loading, setLoading] = useState(false);
  
  const handleClick = useCallback(() => {
    setLoading(true);
    onAction('example-id');
  }, [onAction]);
  
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
      <button 
        onClick={handleClick}
        disabled={loading}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Action'}
      </button>
    </div>
  );
}
```

### CSS/Tailwind

```typescript
// Use Tailwind utility classes
<div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
  <span className="text-sm font-medium text-gray-700">Label</span>
  <button className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
    Action
  </button>
</div>

// For complex styles, use CSS modules or styled components
// Avoid inline styles except for dynamic values
```

### Error Handling

```typescript
// Service layer error handling
async function apiCall(): Promise<Data> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw new Error('Failed to fetch data. Please try again.');
  }
}

// Component error handling
function Component() {
  const [error, setError] = useState<string | null>(null);
  
  const handleAction = async () => {
    try {
      setError(null);
      await apiCall();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    }
  };
  
  if (error) {
    return <div className="text-red-600">Error: {error}</div>;
  }
  
  // Normal render
}
```

## Common Patterns

### Interview State Management

```typescript
// Use InterviewStateManager for interview logic
const manager = new InterviewStateManager(config, sessionId);

// Process user answers
const result = await manager.manageInterviewState('processAnswer', {
  answer: userInput,
  question: currentQuestion,
  onChunk: (chunk) => {
    // Handle streaming response
    addTtsChunk(chunk);
  }
});
```

### Speech Coordination

```typescript
// Coordinate STT and TTS to prevent conflicts
function Interview() {
  const { addTtsChunk, isSpeaking } = useStreamingTTS({
    enabled: speechEnabled,
    onStartSpeaking: () => pauseListening(),
    onStopSpeaking: () => resumeListening()
  });
  
  const { submitAnswer } = useSpeechRecognition({
    onSpeechResult: (text) => {
      // Process user speech
      handleUserInput(text);
    },
    enabled: !isSpeaking
  });
}
```

### Storage Patterns

```typescript
// Save with automatic sync
function saveSession(session: InterviewSession) {
  // Immediate localStorage save
  saveInterviewSessionBySessionId(session);
  
  // Background Firebase sync (if available)
  if (session.userId) {
    syncManager.syncSession(session.userId, session).catch(console.error);
  }
}
```

### Analytics Tracking

```typescript
// Track user actions
import { trackEvent, trackInterviewStart } from '@/services/analytics';

function startInterview() {
  trackInterviewStart({
    jobId: config.jobId,
    difficulty: config.difficulty,
    language: config.language
  });
  
  // Start interview logic
}

function handleUserAction(action: string) {
  trackEvent('user_action', {
    action,
    timestamp: Date.now(),
    sessionId: currentSession.sessionId
  });
}
```

## Troubleshooting

### Common Issues

1. **Speech not working**
   - Check microphone permissions
   - Verify HTTPS (required for Web Speech API)
   - Test in Chrome/Edge (best support)
   - Check browser console for errors

2. **Piper TTS not loading**
   - Verify ONNX Runtime files are served correctly
   - Check network tab for failed requests to `/ort/`
   - Ensure SharedArrayBuffer is available (requires COOP/COEP headers)

3. **Firebase sync issues**
   - Verify Firebase configuration in `.env`
   - Check network connectivity
   - Review browser console for Firebase errors
   - Ensure Firestore rules allow read/write

4. **API integration problems**
   - Verify environment variables are set correctly
   - Check API endpoint availability
   - Review network requests in browser dev tools
   - Test with latency measurement tools

5. **Build issues**
   - Clear `node_modules` and reinstall: `rm -rf node_modules package-lock.json && npm install`
   - Check TypeScript errors: `npx tsc --noEmit`
   - Verify environment variables are available at build time

### Debug Tools

1. **Browser DevTools**
   - Console: Check for JavaScript errors
   - Network: Monitor API requests
   - Application: Inspect localStorage and IndexedDB
   - Performance: Profile memory usage

2. **React DevTools**
   - Component tree inspection
   - Props and state debugging
   - Performance profiling

3. **Built-in Latency Testing**
   ```bash
   npm run test:latency  # Test all APIs
   npm run test:lambda   # Test Lambda specifically
   ```

### Performance Monitoring

1. **Memory leaks**: Monitor memory usage during long interviews
2. **API latency**: Use built-in latency testing tools
3. **Speech performance**: Monitor STT/TTS response times
4. **Storage usage**: Check localStorage quota usage

### Getting Help

1. **Check existing issues**: Search for similar problems
2. **Browser console**: Always check for error messages
3. **Network requests**: Verify API calls are working
4. **Environment**: Ensure all required variables are set
5. **Documentation**: Review this guide and system design docs

---

## Contributing Checklist

Before submitting your contribution:

- [ ] Code follows TypeScript and React best practices
- [ ] All TypeScript compilation errors resolved
- [ ] Manual testing completed across different scenarios
- [ ] Speech functionality tested (if applicable)
- [ ] No console errors or warnings
- [ ] Performance impact considered
- [ ] Documentation updated (if needed)
- [ ] PR description is clear and detailed

Thank you for contributing to the AI Interview Client! 🚀