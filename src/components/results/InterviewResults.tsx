import { Box, VStack, Text, Heading, Badge, HStack, Accordion } from '@chakra-ui/react';
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
  const feedbackHistory = session.feedbackHistory || [];

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

      {/* Overall Score and Stats */}
      <Box>
        <HStack gap={4} mb={4} flexWrap="wrap">
          <Badge colorPalette="blue" fontSize="md" p={2}>
            Score: {result.score}/5
          </Badge>
          <Badge colorPalette="green" fontSize="md" p={2}>
            Questions: {result.totalQuestions}
          </Badge>
          <Badge colorPalette="purple" fontSize="md" p={2}>
            Duration: {result.elapsedTime} min
          </Badge>
        </HStack>
      </Box>

      {/* Summary Section */}
      <Box bg="blue.50" p={4} borderRadius="md">
        <Heading size="md" mb={3} color="blue.700">
          Summary
        </Heading>
        <Text fontSize="md" lineHeight="tall" whiteSpace="pre-wrap">
          {result.summary}
        </Text>
      </Box>

      {/* Conclusion Section */}
      <Box bg="green.50" p={4} borderRadius="md">
        <Heading size="md" mb={3} color="green.700">
          Conclusion
        </Heading>
        <Text fontSize="md" lineHeight="tall" whiteSpace="pre-wrap">
          {result.conclusion}
        </Text>
      </Box>

      <Box borderTop="1px" borderColor="gray.200" pt={4} />

      {/* Q&A History with Feedback */}
      <Box>
        <Heading size="md" mb={4}>
          Q&A History ({session.qaHistory.length} questions)
        </Heading>
        <Accordion.Root collapsible defaultValue={["0"]}>
          {session.qaHistory.map((qa, index) => (
            <Accordion.Item key={index} value={String(index)}>
              <Accordion.ItemTrigger>
                <Box flex="1" textAlign="left">
                  <HStack>
                    <Text fontWeight="semibold" color="blue.600">
                      Question {index + 1}
                    </Text>
                    <Badge colorPalette="gray" fontSize="xs">
                      {new Date(qa.timestamp).toLocaleTimeString()}
                    </Badge>
                  </HStack>
                  <Text fontSize="sm" color="gray.600" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                    {qa.question}
                  </Text>
                </Box>
                <Accordion.ItemIndicator />
              </Accordion.ItemTrigger>
              <Accordion.ItemContent>
                <Box p={4} bg="gray.50" borderRadius="md">
                  {/* Question */}
                  <Box mb={4}>
                    <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>
                      INTERVIEWER
                    </Text>
                    <MessageBubble role="assistant" content={qa.question} timestamp={qa.timestamp} />
                  </Box>

                  {/* Answer */}
                  <Box mb={4}>
                    <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>
                      YOUR ANSWER
                    </Text>
                    <MessageBubble role="user" content={qa.answer} timestamp={qa.timestamp} />
                  </Box>

                  {/* Feedback for this question (if available) */}
                  {feedbackHistory[index] && (
                    <Box bg="yellow.50" p={3} borderRadius="md" borderLeft="4px solid" borderColor="yellow.400">
                      <Text fontSize="xs" fontWeight="bold" color="yellow.700" mb={1}>
                        FEEDBACK
                      </Text>
                      <Text fontSize="sm" color="gray.700" whiteSpace="pre-wrap">
                        {feedbackHistory[index]}
                      </Text>
                    </Box>
                  )}
                </Box>
              </Accordion.ItemContent>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </Box>

      {/* Phase Statistics */}
      <Box borderTop="1px" borderColor="gray.200" pt={4}>
        <Heading size="md" mb={3}>
          Interview Statistics
        </Heading>
        <HStack gap={4} flexWrap="wrap">
          <Badge colorPalette="teal" p={2}>
            Introduction: {session.introductionQuestionCount || 0} questions
          </Badge>
          <Badge colorPalette="orange" p={2}>
            Project: {session.projectQuestionCount || 0} questions
          </Badge>
          <Badge colorPalette="purple" p={2}>
            Technical: {session.technicalQuestionCount || 0} questions
          </Badge>
        </HStack>
        {session.discussedProjects && session.discussedProjects.length > 0 && (
          <Box mt={3}>
            <Text fontSize="sm" fontWeight="bold" color="gray.600" mb={1}>
              Projects Discussed:
            </Text>
            <HStack gap={2} flexWrap="wrap">
              {session.discussedProjects.map((project, idx) => (
                <Badge key={idx} colorPalette="cyan" variant="subtle">
                  {project.name}
                </Badge>
              ))}
            </HStack>
          </Box>
        )}
      </Box>
    </VStack>
  );
}
