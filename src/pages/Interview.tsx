import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Flex,
  VStack,
  Input,
  Button,
  IconButton,
  Heading,
  createToaster,
} from '@chakra-ui/react';
import { FiSend, FiMic, FiMicOff, FiVolume2, FiVolumeX } from 'react-icons/fi';
import { useInterview, type Message } from '../hooks/useInterview';
import type { InterviewConfig } from '../services/interview/interviewEngine';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useStreamingTTS } from '../hooks/useStreamingTTS';
import { MessageBubble } from '../components/ui/MessageBubble';
import { Timer } from '../components/ui/Timer';
import type { InterviewSession } from '../models/interview';
import { loadInterviewSessionBySessionId } from '../services/storage/interviewStorage';

const toaster = createToaster({ placement: 'top' });

export default function Interview() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId?: string }>();
  const [config, setConfig] = useState<InterviewConfig | null>(null);
  const [input, setInput] = useState('');
  const [isSpeechOutputEnabled, setIsSpeechOutputEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const bgColor = 'gray.50';
  const cardBgColor = 'white';
  // Rozzen Bhai
  useEffect(() => {
    const configStr = sessionStorage.getItem('interviewConfig');
    if (!configStr && !sessionId) {
      toaster.create({
        title: 'Error',
        description: 'No interview configuration found',
        type: 'error',
        duration: 3000,
      });
      navigate('/selfapply');
      return;
    }

    try {
      if (configStr) {
        const interviewConfig = JSON.parse(configStr) as InterviewConfig;
        setConfig(interviewConfig);
      } else if (sessionId) {
        const session = loadInterviewSessionBySessionId(sessionId);
        if (session) {
          const interviewConfig: InterviewConfig = {
            userId: session.userId,
            jobId: session.jobId,
            jobTitle: session.jobTitle,
            jobDescription: session.jobDescription,
            interviewTime: session.interviewTime,
            language: session.language,
            difficulty: session.difficulty,
            examinationPoints: session.examinationPoints,
          };
          setConfig(interviewConfig);
        } else {
          toaster.create({
            title: 'Error',
            description: 'Session not found',
            type: 'error',
            duration: 3000,
          });
          navigate('/selfapply');
        }
      }
    } catch (error) {
      console.error('Error parsing interview config:', error);
      toaster.create({
        title: 'Error',
        description: 'Invalid interview configuration',
        type: 'error',
        duration: 3000,
      });
      navigate('/selfapply');
    }
  }, [navigate, sessionId]);

  const handleComplete = (session: InterviewSession) => {
    try {
      sessionStorage.setItem('interviewSession', JSON.stringify(session));
      navigate('/results');
    } catch (error) {
      console.error('Failed to save session:', error);
      toaster.create({
        title: 'Error',
        description: 'Failed to save interview results',
        type: 'error',
        duration: 5000,
      });
    }
  };

  const {
    messages,
    isLoading,
    isCompleted,
    remainingTime,
    submitAnswer,
  } = useInterview({
    config,
    sessionId,
    onComplete: handleComplete,
    onStreamChunk: (chunk) => {
      if (isSpeechOutputEnabled) {
        addTtsChunk(chunk);
      }
    },
    onStreamComplete: () => {
      if (isSpeechOutputEnabled) {
        finishTtsStreaming();
      }
    },
    onFeedback: (feedback) => {
      // ✅ Speak feedback messages (non-streaming)
      if (isSpeechOutputEnabled) {
        addTtsChunk(feedback);
        finishTtsStreaming();
      }
    },
  });

  const {
    isListening,
    isSpeechMode,
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
  } = useSpeechRecognition({
    onSpeechResult: (text) => {
      submitAnswer(text);
    },
    enabled: true,
  });

  const {
    addChunk: addTtsChunk,
    finishStreaming: finishTtsStreaming,
    stop: stopTts,
  } = useStreamingTTS({
    enabled: isSpeechOutputEnabled,
    onStatusChange: (status) => console.log(`[TTS Status] ${status}`),
    onStartSpeaking: () => {
      pauseListening();
    },
    onStopSpeaking: () => {
      if (!isCompleted) {
        resumeListening();
      }
    },
  });

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    return () => {
      stopTts();
      stopListening();
    };
  }, [stopTts, stopListening]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (!input.trim() || isLoading || isCompleted) return;
    submitAnswer(input);
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // If there's text, send it; otherwise start listening if TTS is enabled
      if (input.trim()) {
        handleSendMessage();
      } else if (isSpeechOutputEnabled) {
        startListening();
      }
    }
  };

  if (!config) {
    return (
      <Container maxW="container.md" py={8}>
        <Box>Loading...</Box>
      </Container>
    );
  }

  return (
    <Container maxW="container.md" py={8} height="100vh">
      <Flex direction="column" h="full" bg={cardBgColor} borderRadius="lg" boxShadow="md" overflow="hidden">
        <Flex
          p={4}
          borderBottom="1px"
          borderColor="gray.200"
          bg="blue.500"
          color="white"
          align="center"
          justify="space-between"
        >
          <Heading size="md">{isCompleted ? 'Interview Completed' : 'AI Interview'}</Heading>
          <Flex align="center" gap={4}>
            {remainingTime !== null && !isCompleted && (
              <Timer remainingMinutes={remainingTime} isWarning={remainingTime <= 5} />
            )}
          </Flex>
        </Flex>

        <VStack
          flex="1"
          p={4}
          gap={4}
          align="stretch"
          overflowY="auto"
          bg={bgColor}
        >
          {messages.map((msg: Message) => (
            <MessageBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              timestamp={msg.timestamp}
            />
          ))}
          {isLoading && !isCompleted && (
            <Box p={3} bg="gray.100" borderRadius="lg">
              <Box fontSize="sm" color="gray.600">Thinking...</Box>
            </Box>
          )}
          <div ref={messagesEndRef} />
        </VStack>

        <Flex
          p={4}
          borderTop="1px"
          borderColor="gray.200"
          bg="white"
          direction="column"
        >
          <Flex mb={2} justify="space-between" align="center">
            {!isCompleted && (
              <>
                <IconButton
                  aria-label="Toggle Speech Output"
                  onClick={() => {
                    setIsSpeechOutputEnabled((v) => {
                      if (v) stopTts(); // Stop TTS if turning off
                      return !v;
                    });
                  }}
                  bg={isSpeechOutputEnabled ? 'green.400' : 'red.400'}
                  color="white"
                  size="lg"
                  rounded="full"
                  mr={2}
                >
                  {isSpeechOutputEnabled ? <FiVolume2 /> : <FiVolumeX />}
                </IconButton>
                <IconButton
                  aria-label={isSpeechMode ? 'Stop Listening' : 'Start Listening'}
                  onClick={() => {
                    if (isSpeechMode) {
                      stopListening();
                    } else {
                      startListening();
                    }
                  }}
                  bg={isListening ? 'green.400' : 'red.400'}
                  color="white"
                  size="lg"
                  rounded="full"
                  disabled={isLoading}
                >
                  {isSpeechMode && isListening ? <FiMic /> : <FiMicOff />}
                </IconButton>
              </>
            )}
          </Flex>
          <Flex>
            <Input
              flex="1"
              mr={2}
              placeholder={
                isCompleted
                  ? 'Interview completed'
                  : 'Enter your answer or press Enter to use voice...'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading || isCompleted}
            />
            <Button
              colorPalette="blue"
              onClick={handleSendMessage}
              loading={isLoading}
              disabled={!input.trim() || isLoading || isCompleted}
            >
              <FiSend style={{ marginRight: '8px', display: 'inline' }} />
              Send
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </Container>
  );
}
