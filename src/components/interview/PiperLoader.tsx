import { Box, VStack, Text, Spinner } from '@chakra-ui/react';

interface PiperLoaderProps {
  status: string;
  progress?: number;
}

export function PiperLoader({ status, progress }: PiperLoaderProps) {
  return (
    <Box
      position="fixed"
      top="0"
      left="0"
      right="0"
      bottom="0"
      bg="rgba(0, 0, 0, 0.7)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex={9999}
    >
      <VStack
        bg="white"
        p={8}
        borderRadius="lg"
        boxShadow="xl"
        gap={4}
        minW="300px"
      >
        <Spinner size="xl" color="blue.500" />
        <Text fontSize="lg" fontWeight="semibold" textAlign="center">
          {status}
        </Text>
        {progress !== undefined && (
          <Box w="100%">
            <Box
              w="100%"
              h="8px"
              bg="gray.200"
              borderRadius="full"
              overflow="hidden"
            >
              <Box
                h="100%"
                bg="blue.500"
                w={`${progress}%`}
                transition="width 0.3s"
              />
            </Box>
            <Text fontSize="sm" color="gray.600" textAlign="center" mt={2}>
              {progress}%
            </Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
}
