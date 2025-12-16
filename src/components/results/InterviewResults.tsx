import { Box, VStack, Text, Heading, Badge, HStack } from '@chakra-ui/react';
import type { InterviewSession } from '../../models/interview';
import { MessageBubble } from '../ui/MessageBubble';

interface InterviewResultsProps {
  session: InterviewSession;
}

export function InterviewResults({ session }: InterviewResultsProps) {
  if (!session.result) {
    return (
      <Box p={4}>
        <Text>No results available</Text>
      </Box>
    );
  }

  const { result } = session;

  return (
    <VStack gap={6} align="stretch" p={6}>
      <Box>
        <Heading size="lg" mb={2}>
          Interview Results
        </Heading>
        <Text fontSize="sm" color="gray.600">
          {session.jobTitle}
        </Text>
      </Box>

      <Box borderTop="1px" borderColor="gray.200" pt={4} />

      <Box>
        <HStack gap={4} mb={4}>
          <Badge colorPalette="blue" fontSize="md" p={2}>
            Score: {result.score}/10
          </Badge>
          <Badge colorPalette="green" fontSize="md" p={2}>
            Correct: {result.correctAnswers}/{result.totalQuestions}
          </Badge>
          <Badge colorPalette="purple" fontSize="md" p={2}>
            Duration: {result.elapsedTime} min
          </Badge>
        </HStack>
      </Box>

      <Box>
        <Heading size="md" mb={3}>
          Summary
        </Heading>
        <Text fontSize="md" lineHeight="tall" whiteSpace="pre-wrap">
          {result.summary}
        </Text>
      </Box>

      <Box>
        <Heading size="md" mb={3}>
          Conclusion
        </Heading>
        <Text fontSize="md" lineHeight="tall" whiteSpace="pre-wrap">
          {result.conclusion}
        </Text>
      </Box>

      <Box borderTop="1px" borderColor="gray.200" pt={4} />

      <Box>
        <Heading size="md" mb={4}>
          Q&A History
        </Heading>
        <VStack gap={4} align="stretch">
          {session.qaHistory.map((qa, index) => (
            <Box key={index} p={4} bg="gray.50" borderRadius="md">
              <Text fontWeight="semibold" mb={2} color="blue.600">
                Question {index + 1}
              </Text>
              <MessageBubble role="assistant" content={qa.question} timestamp={qa.timestamp} />
              <MessageBubble role="user" content={qa.answer} timestamp={qa.timestamp} />
              <HStack mt={2} gap={2}>
                <Badge colorPalette={qa.isCorrect ? 'green' : 'red'}>
                  {qa.isCorrect ? 'Correct' : 'Incorrect'}
                </Badge>
                <Badge colorPalette="blue">Score: {qa.score}/5</Badge>
              </HStack>
            </Box>
          ))}
        </VStack>
      </Box>
    </VStack>
  );
}
