import { Box, Text } from '@chakra-ui/react';

interface TimerProps {
  remainingMinutes: number;
  isWarning?: boolean;
}

export function Timer({ remainingMinutes, isWarning }: TimerProps) {
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;
  const displayMinutes = Math.floor(minutes);
  const displaySeconds = Math.floor((minutes - displayMinutes) * 60);

  const formatTime = () => {
    if (hours > 0) {
      return `${hours}:${displayMinutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')}`;
    }
    return `${displayMinutes}:${displaySeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Box textAlign="center">
      <Text fontSize="sm" fontWeight="bold" color="gray.600">
        Time Remaining
      </Text>
      <Text
        fontSize="lg"
        fontWeight="bold"
        color={isWarning ? 'red.500' : 'gray.800'}
      >
        {formatTime()}
      </Text>
    </Box>
  );
}
