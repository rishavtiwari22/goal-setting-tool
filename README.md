# AI Interview Client

A sophisticated React 19 + TypeScript SPA that conducts AI-powered voice interviews entirely on the client side. Features real-time speech-to-speech interaction, intelligent interview flow management, and comprehensive analytics.

[![React](https://img.shields.io/badge/React-19.2.3-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.2.4-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1.18-38B2AC.svg)](https://tailwindcss.com/)

## 🚀 Features

### Core Functionality
- **Client-only execution**: Complete interview logic runs in browser without server calls during sessions
- **Speech-to-speech interaction**: Natural conversation using Web Speech API (STT) + Piper TTS
- **Multi-phase interviews**: Intelligent progression through Introduction → Project → Technical phases
- **Real-time AI**: Streaming question generation and analysis via Lambda/HuggingFace
- **Local-first storage**: localStorage with Firebase background synchronization
- **Session recovery**: Automatic recovery from interruptions using cloud backup

### Advanced Features
- **Intelligent flow control**: Dynamic phase transitions based on candidate responses
- **Answer quality tracking**: Consecutive irrelevant answer detection with retry logic
- **Project-based questioning**: Context-aware technical questions based on discussed projects
- **Real-time audio visualization**: Visual feedback during speech interaction
- **Device testing**: Built-in microphone and speaker testing
- **Admin dashboard**: Comprehensive job and user management
- **Analytics integration**: GA4 + Mixpanel for detailed usage insights

### Technical Highlights
- **Modern React**: React 19 with concurrent features and TypeScript
- **Advanced speech processing**: Custom STT logic with auto-restart and transcript preservation
- **Local TTS**: Piper TTS with ONNX Runtime for offline text-to-speech
- **Background sync**: Priority-based write queue with automatic retry
- **Performance optimized**: Code splitting, lazy loading, and memory leak prevention
- **Accessibility**: Radix UI components with full keyboard navigation

## 🛠️ Technology Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Frontend** | React + TypeScript | 19.2.3 + ~5.9.3 | UI framework with type safety |
| **Build** | Vite | 7.2.4 | Fast bundling and dev server |
| **Styling** | Tailwind CSS | 4.1.18 | Utility-first CSS framework |
| **UI Components** | Radix UI + Lucide | Latest | Accessible primitives + icons |
| **Speech** | Web Speech API + Piper TTS | Native + 1.0.4 | STT + local TTS synthesis |
| **AI Integration** | DeepSeek API via Lambda | - | Question generation & analysis |
| **Storage** | localStorage + Firebase | 11.1.0 | Local-first with cloud sync |
| **Analytics** | GA4 + Mixpanel | - | Comprehensive event tracking |
| **ML Runtime** | ONNX Runtime Web | 1.18.0 | Local model execution |

## 🚀 Quick Start

### Prerequisites
- **Node.js**: 18+ (for global fetch and modern features)
- **Modern browser**: Chrome/Edge/Firefox with Web Speech API support
- **HTTPS**: Required for speech functionality (dev server provides this)

### Installation

1. **Clone and install**
   ```bash
   git clone <repository-url>
   cd ai-interviewer-standalone-client
   npm install
   ```

2. **Environment setup**
   ```bash
   cp .env.example .env
   ```
   
   **Configure required variables:**
   ```env
   # Required - Backend API
   VITE_API_BASE_URL=https://interview.ai.navgurukul.org/api/v1
   VITE_API_TOKEN=your_api_token_here
   
   # Required - AI API (choose one)
   VITE_LAMBDA_API_URL=your_lambda_endpoint_here
   # OR
   VITE_DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
   
   # Optional - Firebase (for cloud sync and admin features)
   VITE_FIREBASE_API_KEY=your_firebase_key
   VITE_FIREBASE_PROJECT_ID=your_project_id
   # ... other Firebase config
   
   # Optional - Analytics
   VITE_GA4_MEASUREMENT_ID=your_ga4_id
   ```

3. **Start development**
   ```bash
   npm run dev
   ```
   
   Open `http://localhost:5173` in your browser

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
src/
├── pages/                    # Route-level components
│   ├── Home.tsx             # Landing page
│   ├── SelfApply.tsx        # Interview configuration
│   ├── Interview.tsx        # Main interview interface
│   ├── Results.tsx          # Results display
│   └── Admin*.tsx           # Admin dashboard
│
├── components/              # Reusable UI components
│   ├── ui/                  # Base components (Radix-based)
│   ├── feedback/            # Feedback components
│   ├── interview/           # Interview-specific components
│   ├── results/             # Results display components
│   └── ...                  # Feature-specific components
│
├── services/                # Business logic layer
│   ├── interview/           # Interview engine
│   ├── api/                 # API integration
│   ├── storage/             # Data persistence
│   ├── analytics/           # Event tracking
│   └── firebase/            # Firebase configuration
│
├── hooks/                   # Custom React hooks
│   ├── useInterview.ts      # Interview state management
│   ├── useSpeechRecognition.ts  # Speech-to-text
│   ├── useStreamingTTS.ts   # Text-to-speech streaming
│   └── ...                  # Other custom hooks
│
├── models/                  # TypeScript definitions
├── utils/                   # Utility functions
├── lib/                     # Third-party configurations
└── styles/                  # Global styles
```

## 🎯 Usage Flow

### Standard Interview Flow

1. **Landing** (`/`) - Choose interview type and accept terms
2. **Configuration** (`/selfapply`) - Set up interview parameters:
   - Email verification and user lookup
   - Job selection (from API or custom creation)
   - Device testing (microphone and speakers)
   - Interview parameters (time, language, difficulty, focus areas)
3. **Interview** (`/interview`) - Real-time voice interview:
   - Speech-to-speech interaction
   - Multi-phase progression (Introduction → Project → Technical)
   - Real-time audio visualization
   - Automatic session persistence
4. **Results** (`/results`) - Comprehensive results display:
   - Interview summary and scoring
   - Strengths and improvement areas
   - Feedback submission

### Admin Flow

1. **Admin Dashboard** (`/admin`) - Overview and navigation
2. **User Management** (`/admin/users`) - View and manage users
3. **Job Management** (`/admin/jobs`) - Create and manage job profiles
4. **Recruitment** (`/admin/recruitment`) - Manage invitations and campaigns

### Invitation Flow

1. **Invited Interview** (`/interview/invited`) - Token-based interview access
2. Follows standard interview flow with pre-configured parameters

## 🔧 Development

### Key Development Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# API latency testing
npm run test:latency      # Test all APIs
npm run test:lambda       # Test Lambda specifically
```

### Architecture Patterns

**State Management**:
- Custom hooks for component state
- Service classes for business logic
- localStorage for persistence
- Firebase for cloud sync

**API Integration**:
- Service layer abstraction
- Streaming responses for real-time interaction
- Automatic retry with exponential backoff
- Comprehensive error handling

**Speech Processing**:
- STT/TTS coordination to prevent conflicts
- Automatic session management
- Visual feedback for speech states
- Graceful degradation for unsupported browsers

### Performance Considerations

- **Memory management**: Automatic cleanup of speech resources
- **Storage optimization**: Automatic cleanup of old sessions
- **Network efficiency**: Background sync with priority queuing
- **Bundle optimization**: Code splitting and lazy loading

## 🧪 Testing

### Manual Testing Checklist

- [ ] Speech functionality across different browsers
- [ ] Complete interview flow from start to finish
- [ ] Session recovery after interruption
- [ ] Device testing (microphone/speakers)
- [ ] Admin functionality (if applicable)
- [ ] Mobile responsiveness
- [ ] Network failure scenarios

### API Testing

Use built-in latency measurement tools:

```bash
# Comprehensive API testing with latency measurement
npm run test:latency

# Test specific Lambda endpoint
npm run test:lambda
```

### Browser Compatibility

**Required Features**:
- Web Speech API (STT)
- Web Audio API (TTS)
- SharedArrayBuffer (ONNX Runtime)
- IndexedDB (voice caching)
- localStorage (session persistence)

**Recommended Browsers**:
- Chrome 88+ (best support)
- Edge 88+
- Firefox 85+ (limited speech support)
- Safari 14+ (limited speech support)

## 📊 Analytics & Monitoring

### Event Tracking

The application tracks comprehensive analytics:

- **Interview lifecycle**: Start, completion, abandonment
- **User engagement**: Time spent, interactions, errors
- **Performance metrics**: API latency, speech processing time
- **Feature usage**: Device testing, admin actions, job selections

### Performance Monitoring

- **Memory usage**: Automatic monitoring during interviews
- **API latency**: Built-in measurement tools
- **Speech performance**: STT/TTS response time tracking
- **Storage usage**: localStorage quota monitoring

## 🔒 Security & Privacy

### Data Handling

- **Local-first**: Sensitive data stored locally by default
- **Optional cloud sync**: Firebase sync only with user consent
- **No persistent server storage**: Interview data not stored on servers
- **Secure transmission**: All API calls over HTTPS

### Privacy Features

- **Minimal data collection**: Only essential analytics
- **User control**: Clear consent mechanisms
- **Data retention**: Automatic cleanup of old sessions
- **Transparent policies**: Clear data usage policies

## 🚀 Deployment

### Environment Requirements

- **Static hosting**: Can be deployed to any static host (Vercel, Netlify, S3, etc.)
- **HTTPS required**: For speech functionality
- **COOP/COEP headers**: Required for SharedArrayBuffer (ONNX Runtime)

### Build Configuration

The application requires specific headers for full functionality:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

### Environment Variables

All environment variables must be available at build time (prefixed with `VITE_`).

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for detailed information on:

- Development setup
- Code style guidelines
- Testing procedures
- Pull request process
- Architecture patterns

### Quick Contribution Checklist

- [ ] Read the [Contributing Guide](CONTRIBUTING.md)
- [ ] Set up development environment
- [ ] Test your changes thoroughly
- [ ] Follow TypeScript and React best practices
- [ ] Update documentation if needed

## 📚 Documentation

- **[Contributing Guide](CONTRIBUTING.md)** - Comprehensive development guide
- **[System Design](SYSTEM_DESIGN.md)** - Detailed architecture documentation
- **[Architecture Overview](architecture.md)** - High-level system overview

## 🐛 Troubleshooting

### Common Issues

**Speech not working**:
- Ensure HTTPS (required for Web Speech API)
- Check microphone permissions
- Try Chrome/Edge for best compatibility

**Piper TTS not loading**:
- Verify ONNX Runtime files are accessible
- Check for COOP/COEP headers in production
- Monitor network requests for failed `/ort/` calls

**Firebase sync issues**:
- Verify Firebase configuration
- Check network connectivity
- Review browser console for errors

**API integration problems**:
- Verify environment variables
- Test with built-in latency tools
- Check API endpoint availability

### Getting Help

1. Check browser console for error messages
2. Review network requests in DevTools
3. Test with built-in diagnostic tools
4. Consult the troubleshooting section in [CONTRIBUTING.md](CONTRIBUTING.md)

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Piper TTS**: High-quality local text-to-speech synthesis
- **ONNX Runtime**: Efficient ML model execution in browsers
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **React Team**: For the amazing React 19 features

---

**Built with ❤️ for seamless AI-powered interviews**
