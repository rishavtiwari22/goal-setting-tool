import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  VStack,
  Text,
  Input,
  Button,
  Heading,
  Spinner,
  createToaster,
  HStack,
  Badge,
  SimpleGrid,
  Flex,
} from '@chakra-ui/react';
import { FiArrowRight, FiCheck } from 'react-icons/fi';
import { checkUser, getJobs, getJob } from '../services/api/serverApi';
import { DEFAULT_PIPER_BACKEND, preparePiperVoice } from '../lib/piper';
import { PiperLoader } from '../components/interview/PiperLoader';
import type { Job } from '../models/job';

type Step = 'email' | 'job_selection' | 'job_details' | 'test_config' | 'loading';

const toaster = createToaster({ placement: 'top' });

const technicalSkillsOptions = [
  'Python', 'JavaScript', 'Java', 'C++', 'C#', 'Go', 'Rust', 'TypeScript',
  'React', 'Vue', 'Angular', 'Node.js', 'Express', 'Django', 'Flask', 'FastAPI',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'Docker', 'Kubernetes',
  'AWS', 'Azure', 'GCP', 'Git', 'CI/CD', 'Machine Learning', 'Data Science',
  'AI', 'TensorFlow', 'PyTorch', 'HTML', 'CSS', 'SASS', 'Bootstrap',
  'Tailwind CSS', 'REST API', 'GraphQL', 'Microservices', 'System Design',
];

const softSkillsOptions = [
  'Communication', 'Teamwork', 'Leadership', 'Problem Solving', 'Critical Thinking',
  'Time Management', 'Adaptability', 'Creativity', 'Work Ethic', 'Interpersonal Skills',
  'Conflict Resolution', 'Decision Making', 'Negotiation', 'Presentation Skills',
  'Active Listening', 'Empathy', 'Collaboration', 'Flexibility', 'Stress Management',
];

export default function SelfApply() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [checkingUser, setCheckingUser] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null | undefined>(undefined);
  const [customJob, setCustomJob] = useState({
    title: '',
    description: '',
    technicalSkills: [] as string[],
    softSkills: [] as string[],
  });

  const [testConfig, setTestConfig] = useState({
    language: 'English',
    difficulty: 'medium',
    examinationPoints: [] as string[],
    testTime: 10,
  });

  const [voiceReady, setVoiceReady] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [status, setStatus] = useState<string>('');
  const preparePromiseRef = useRef<Promise<void> | null>(null);
  const voiceReadyRef = useRef(false);

  const bgColor = 'gray.50';
  const cardBgColor = 'white';
  const borderColor = 'gray.200';

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoadingJobs(true);
    try {
      const jobsList = await getJobs();
      setJobs(jobsList);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toaster.create({
        title: 'Error',
        description: 'Failed to fetch jobs',
        type: 'error',
        duration: 3000,
      });
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleEmailSubmit = async () => {
    if (!email || !email.includes('@')) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setCheckingUser(true);
    setEmailError(null);

    try {
      const response = await checkUser(email);
      if (response.exists) {
        if (response.user?.user_id) {
          setUserId(response.user.user_id);
        } else {
          setUserId(email);
        }
        setStep('job_selection');
      } else {
        setEmailError('User not found. Please contact an admin to add your data.');
      }
    } catch (error) {
      console.error('Error checking user:', error);
      setEmailError('Failed to check user. Please try again.');
    } finally {
      setCheckingUser(false);
    }
  };

  const handleJobSelect = (jobId: string | null) => {
    if (jobId) {
      const selectedJob = jobs.find((j) => j.job_id === jobId);
      if (selectedJob) {
        setCustomJob({
          title: selectedJob.job_title,
          description: selectedJob.job_description,
          technicalSkills: selectedJob.technical_skills,
          softSkills: selectedJob.soft_skills,
        });
      }
    } else {
      setCustomJob({
        title: '',
        description: '',
        technicalSkills: [],
        softSkills: [],
      });
    }
    setSelectedJobId(jobId);
  };

  const addSkill = (type: 'technical' | 'soft', value: string) => {
    if (!value.trim()) return;
    const currentSkills = type === 'technical' ? customJob.technicalSkills : customJob.softSkills;
    if (currentSkills.includes(value.trim())) return;

    if (type === 'technical') {
      setCustomJob({
        ...customJob,
        technicalSkills: [...customJob.technicalSkills, value.trim()],
      });
    } else {
      setCustomJob({
        ...customJob,
        softSkills: [...customJob.softSkills, value.trim()],
      });
    }
  };

  const removeSkill = (type: 'technical' | 'soft', index: number) => {
    if (type === 'technical') {
      setCustomJob({
        ...customJob,
        technicalSkills: customJob.technicalSkills.filter((_, i) => i !== index),
      });
    } else {
      setCustomJob({
        ...customJob,
        softSkills: customJob.softSkills.filter((_, i) => i !== index),
      });
    }
  };

  const addExaminationPoint = (value: string) => {
    if (!value.trim()) return;
    if (testConfig.examinationPoints.includes(value.trim())) return;
    setTestConfig({
      ...testConfig,
      examinationPoints: [...testConfig.examinationPoints, value.trim()],
    });
  };

  const removeExaminationPoint = (index: number) => {
    setTestConfig({
      ...testConfig,
      examinationPoints: testConfig.examinationPoints.filter((_, i) => i !== index),
    });
  };

  const handleJobDetailsSubmit = () => {
    if (!customJob.title || !customJob.description) {
      toaster.create({
        title: 'Missing information',
        description: 'Please fill in job title and description',
        type: 'error',
        duration: 3000,
      });
      return;
    }
    setStep('test_config');
  };

  const handleTestDetailsSubmit = async () => {
    if (!testConfig.testTime || testConfig.testTime <= 0) {
      toaster.create({
        title: 'Invalid Input',
        description: 'Please enter a valid test duration.',
        type: 'error',
        duration: 3000,
      });
      return;
    }
    if (testConfig.testTime > 120) {
      toaster.create({
        title: 'Invalid Input',
        description: 'Test duration cannot exceed 120 minutes.',
        type: 'error',
        duration: 3000,
      });
      return;
    }
    
    setStep('loading');
    
    if (!voiceReadyRef.current) {
      setPreparing(true);
      setStatus('Preparing voice system...');
      try {
        await preparePiperVoice((s) => setStatus(s), DEFAULT_PIPER_BACKEND);
        setVoiceReady(true);
        voiceReadyRef.current = true;
      } catch (error) {
        console.error('Piper preparation failed:', error);
        toaster.create({
          title: 'Warning',
          description: 'Voice system preparation failed, continuing without voice',
          type: 'warning',
          duration: 3000,
        });
      } finally {
        setPreparing(false);
      }
    }
    
    handleStartInterview();
  };

  const handleStartInterview = async () => {
    if (!userId) {
      toaster.create({
        title: 'Error',
        description: 'User ID not found',
        type: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      let job: Job;
      if (selectedJobId) {
        job = await getJob(selectedJobId);
      } else {
        job = {
          job_id: `custom_${Date.now()}`,
          job_title: customJob.title,
          job_description: customJob.description,
          technical_skills: customJob.technicalSkills,
          soft_skills: customJob.softSkills,
        };
      }


      const interviewConfig = {
        userId,
        jobId: job.job_id,
        jobTitle: job.job_title,
        jobDescription: job.job_description,
        interviewTime: testConfig.testTime,
        language: testConfig.language,
        difficulty: testConfig.difficulty,
        examinationPoints: testConfig.examinationPoints,
      };

      sessionStorage.setItem('interviewConfig', JSON.stringify(interviewConfig));
      navigate('/interview');
    } catch (error) {
      console.error('Error starting interview:', error);
      toaster.create({
        title: 'Error',
        description: (error as Error).message || 'Failed to start interview',
        type: 'error',
        duration: 5000,
      });
      setStep('test_config');
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'email':
        return (
          <VStack gap={4} align="stretch" w="100%">
            <Text fontSize="lg" color="gray.600">
              Let's get started! Please enter your email address.
            </Text>
            <Input
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(null);
              }}
              size="lg"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !checkingUser) handleEmailSubmit();
              }}
            />
            {emailError && (
              <Text color="red.500" fontSize="sm">
                {emailError}
              </Text>
            )}
            <Button
              colorScheme="blue"
              onClick={handleEmailSubmit}
              size="lg"
              loading={checkingUser}
            >
              Continue
            </Button>
          </VStack>
        );

      case 'job_selection':
        return (
          <VStack gap={4} align="stretch" w="100%">
            <Text fontSize="lg" color="gray.600">
              Select a job role or create a new one.
            </Text>
            {loadingJobs ? (
              <Flex justify="center" py={8}>
                <Spinner size="lg" />
              </Flex>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <Box
                  p={4}
                  borderWidth="2px"
                  borderColor={selectedJobId === null ? 'blue.500' : borderColor}
                  borderRadius="md"
                  cursor="pointer"
                  _hover={{ borderColor: 'blue.300' }}
                  onClick={() => handleJobSelect(null)}
                  bg={cardBgColor}
                >
                  <HStack justify="space-between">
                    <Text fontWeight="bold" fontSize="md">
                      Create New Job
                    </Text>
                    {selectedJobId === null && (
                      <Badge colorScheme="blue">Selected</Badge>
                    )}
                  </HStack>
                  <Text fontSize="sm" color="gray.600" mt={2}>
                    Define a custom job role
                  </Text>
                </Box>
                {jobs.map((job) => (
                  <Box
                    key={job.job_id}
                    p={4}
                    borderWidth="2px"
                    borderColor={selectedJobId === job.job_id ? 'blue.500' : borderColor}
                    borderRadius="md"
                    cursor="pointer"
                    _hover={{ borderColor: 'blue.300' }}
                    onClick={() => handleJobSelect(job.job_id)}
                    bg={cardBgColor}
                  >
                    <HStack justify="space-between" mb={2}>
                      <Text fontWeight="bold" fontSize="md">
                        {job.job_title}
                      </Text>
                      {selectedJobId === job.job_id && (
                        <Badge colorScheme="blue">Selected</Badge>
                      )}
                    </HStack>
                    <Text fontSize="sm" color="gray.600" lineClamp={2}>
                      {job.job_description}
                    </Text>
                  </Box>
                ))}
              </SimpleGrid>
            )}
            <Button
              colorScheme="blue"
              onClick={() => {
                if (selectedJobId) {
                  setStep('test_config');
                } else if (selectedJobId === null) {
                  setStep('job_details');
                }
              }}
              size="lg"
              disabled={selectedJobId === undefined}
            >
              Continue
            </Button>
          </VStack>
        );

      case 'job_details':
        return (
          <VStack gap={4} align="stretch" w="100%">
            <Text fontSize="lg" color="gray.600">
              Please provide details for the new job role.
            </Text>
            <Box>
              <Text mb={2} fontWeight="semibold">Job Title</Text>
              <Input
                value={customJob.title}
                onChange={(e) =>
                  setCustomJob({ ...customJob, title: e.target.value })
                }
                placeholder="e.g., Software Engineer"
              />
            </Box>
            <Box>
              <Text mb={2} fontWeight="semibold">Job Description</Text>
              <Input
                as="textarea"
                value={customJob.description}
                onChange={(e) =>
                  setCustomJob({ ...customJob, description: e.target.value })
                }
                placeholder="Describe the role and responsibilities..."
                minH="100px"
              />
            </Box>
            <Box>
              <Text mb={2} fontWeight="semibold">Technical Skills</Text>
              <Box
                as="select"
                w="100%"
                p={2}
                borderRadius="md"
                border="1px solid"
                borderColor="gray.300"
                onChange={(e) => {
                  const target = e.target as HTMLSelectElement;
                  if (target.value) {
                    addSkill('technical', target.value);
                    target.value = '';
                  }
                }}
              >
                <option value="">Select a technical skill</option>
                {technicalSkillsOptions
                  .filter((skill) => !customJob.technicalSkills.includes(skill))
                  .map((skill) => (
                    <option key={skill} value={skill}>
                      {skill}
                    </option>
                  ))}
              </Box>
              <HStack flexWrap="wrap" gap={2}>
                {customJob.technicalSkills.map((skill, idx) => (
                  <Badge
                    key={idx}
                    colorScheme="blue"
                    cursor="pointer"
                    onClick={() => removeSkill('technical', idx)}
                  >
                    {skill} ×
                  </Badge>
                ))}
              </HStack>
            </Box>
            <Box>
              <Text mb={2} fontWeight="semibold">Soft Skills</Text>
              <Box
                as="select"
                w="100%"
                p={2}
                borderRadius="md"
                border="1px solid"
                borderColor="gray.300"
                onChange={(e) => {
                  const target = e.target as HTMLSelectElement;
                  if (target.value) {
                    addSkill('soft', target.value);
                    target.value = '';
                  }
                }}
              >
                <option value="">Select a soft skill</option>
                {softSkillsOptions
                  .filter((skill) => !customJob.softSkills.includes(skill))
                  .map((skill) => (
                    <option key={skill} value={skill}>
                      {skill}
                    </option>
                  ))}
              </Box>
              <HStack flexWrap="wrap" gap={2}>
                {customJob.softSkills.map((skill, idx) => (
                  <Badge
                    key={idx}
                    colorScheme="blue"
                    cursor="pointer"
                    onClick={() => removeSkill('soft', idx)}
                  >
                    {skill} ×
                  </Badge>
                ))}
              </HStack>
            </Box>
            <Button
              colorScheme="blue"
              onClick={handleJobDetailsSubmit}
              size="lg"
            >
              Continue
            </Button>
          </VStack>
        );

      case 'test_config':
        return (
          <VStack gap={4} align="stretch" w="100%">
            <Text fontSize="lg" color="gray.600">
              Configure your interview test settings.
            </Text>
            <Box>
              <Text mb={2} fontWeight="semibold">Language</Text>
              <select
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                }}
                value={testConfig.language}
                onChange={(e) => {
                  setTestConfig({ ...testConfig, language: e.target.value });
                }}
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
              </select>
            </Box>
            <Box>
              <Text mb={2} fontWeight="semibold">Difficulty</Text>
              <select
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                }}
                value={testConfig.difficulty}
                onChange={(e) => {
                  setTestConfig({ ...testConfig, difficulty: e.target.value });
                }}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </Box>
            <Box>
              <Text mb={2} fontWeight="semibold">Test Duration (minutes)</Text>
              <Input
                type="number"
                value={testConfig.testTime}
                onChange={(e) =>
                  setTestConfig({
                    ...testConfig,
                    testTime: e.target.value === '' ? 10 : parseInt(e.target.value, 10),
                  })
                }
                min={1}
                max={120}
              />
            </Box>
            <Box>
              <Text mb={2} fontWeight="semibold">Examination Points (optional)</Text>
              <HStack mb={2}>
                <Input
                  placeholder="Add examination point"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addExaminationPoint(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </HStack>
              <HStack flexWrap="wrap" gap={2}>
                {testConfig.examinationPoints.map((point, idx) => (
                  <Badge
                    key={idx}
                    colorScheme="blue"
                    cursor="pointer"
                    onClick={() => removeExaminationPoint(idx)}
                  >
                    {point} ×
                  </Badge>
                ))}
              </HStack>
            </Box>
            <Button
              colorScheme="blue"
              onClick={handleTestDetailsSubmit}
              size="lg"
            >
              Start Interview
            </Button>
          </VStack>
        );

      case 'loading':
        return (
          <VStack gap={4}>
            <Spinner size="xl" color="blue.500" />
            <Text>Starting your interview...</Text>
          </VStack>
        );

      default:
        return null;
    }
  };

  return (
    <Box bg={bgColor} minH="100vh" py={8}>
      <Container maxW="container.md">
        <VStack gap={8} align="stretch">
          <Heading size="lg" textAlign="center">
            Self Apply Interview
          </Heading>
          <Box
            p={8}
            bg={cardBgColor}
            borderRadius="lg"
            boxShadow="md"
            borderWidth="1px"
            borderColor={borderColor}
            position="relative"
            minH="400px"
          >
            {renderStep()}
          </Box>
        </VStack>
      </Container>
      {preparing && <PiperLoader status={status} />}
    </Box>
  );
}
