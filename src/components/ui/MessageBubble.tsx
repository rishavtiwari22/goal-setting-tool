import { Box, Flex, Text } from '@chakra-ui/react';
import { FiUser } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export function MessageBubble({ role, content, timestamp }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <Flex
      alignSelf={isUser ? 'flex-end' : 'flex-start'}
      maxW="80%"
      direction="column"
      mb={4}
    >
      <Flex align="center" mb={1}>
        <Box
          as="span"
          w="24px"
          h="24px"
          borderRadius="full"
          bg={isUser ? 'gray.500' : 'blue.500'}
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          mr={2}
        >
          {isUser && <FiUser size={12} style={{ color: 'white' }} />}
        </Box>
        <Text fontSize="xs" color="gray.500">
          {isUser ? 'You' : 'AI Interviewer'}
          {timestamp && ` · ${new Date(timestamp).toLocaleTimeString()}`}
        </Text>
      </Flex>
      <Box
        bg={isUser ? 'blue.500' : 'gray.100'}
        color={isUser ? 'white' : 'black'}
        p={3}
        borderRadius="lg"
        boxShadow="sm"
      >
        {isUser ? (
          <Text fontSize="sm" whiteSpace="pre-wrap">
            {content}
          </Text>
        ) : (
          <Box fontSize="sm">
            <ReactMarkdown
              rehypePlugins={[rehypeHighlight, rehypeRaw]}
              remarkPlugins={[remarkGfm]}
            >
              {content}
            </ReactMarkdown>
          </Box>
        )}
      </Box>
    </Flex>
  );
}
