import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Box, Button, Heading, VStack, createToaster } from '@chakra-ui/react';
import { InterviewResults } from '../components/results/InterviewResults';
import type { InterviewSession } from '../models/interview';

const toaster = createToaster({ placement: 'top' });

export default function Results() {
  const navigate = useNavigate();
  const [session, setSession] = useState<InterviewSession | null>(null);

  useEffect(() => {
    const sessionStr = sessionStorage.getItem('interviewSession');
    if (!sessionStr) {
      toaster.create({
        title: 'Error',
        description: 'No interview session found',
        type: 'error',
        duration: 3000,
      });
      navigate('/selfapply');
      return;
    }

    try {
      const interviewSession = JSON.parse(sessionStr) as InterviewSession;
      setSession(interviewSession);
    } catch (error) {
      console.error('Error parsing interview session:', error);
      toaster.create({
        title: 'Error',
        description: 'Invalid interview session data',
        type: 'error',
        duration: 3000,
      });
      navigate('/selfapply');
    }
  }, [navigate]);

  const handleStartNew = () => {
    sessionStorage.removeItem('interviewSession');
    sessionStorage.removeItem('interviewConfig');
    navigate('/selfapply');
  };

  if (!session) {
    return (
      <Container maxW="container.md" py={8}>
        <Box>Loading...</Box>
      </Container>
    );
  }

  return (
    <Container maxW="container.lg" py={8}>
      <VStack gap={6} align="stretch">
        <Box>
          <Heading size="xl" mb={2}>
            Interview Results
          </Heading>
        </Box>
        <InterviewResults session={session} />
        <Box>
          <Button colorScheme="blue" onClick={handleStartNew} size="lg">
            Start New Interview
          </Button>
        </Box>
      </VStack>
    </Container>
  );
}
