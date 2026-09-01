'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Avatar,
  Badge,
  Box,
  Button,
  Center,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Select,
  SimpleGrid,
  Spinner,
  Stat,
  StatLabel,
  StatNumber,
  Text,
  useBreakpointValue,
  VStack,
} from '@chakra-ui/react';
import {
  MdEmojiEvents,
  MdFlag,
  MdGroups,
  MdMenuBook,
  MdRefresh,
  MdSearch,
  MdTimeline,
} from 'react-icons/md';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  enrollmentService,
  Enrollment,
  EnrollmentStatus,
} from '@/services/enrollmentService';
import { lessonService, Lesson } from '@/services/lessonService';
import { skillService, Skill } from '@/services/skillService';
import { stageService, Stage } from '@/services/stageService';
import { studentService, Student } from '@/services/studentService';

const STATUS_LABELS: Record<EnrollmentStatus, string> = {
  ACTIVE: 'Ativa',
  PAUSED: 'Pausada',
  INACTIVE: 'Inativa',
  COMPLETED: 'Concluída',
};

const STATUS_COLORS: Record<EnrollmentStatus, string> = {
  ACTIVE: 'green',
  PAUSED: 'yellow',
  INACTIVE: 'gray',
  COMPLETED: 'blue',
};

const AVATAR_COLORS = [
  'blue.500',
  'purple.500',
  'teal.500',
  'pink.500',
  'cyan.600',
  'orange.500',
];

type StatusFilter = EnrollmentStatus | 'ALL';
type TrackPosition = 'WAITING' | 'FINISH' | `LESSON:${string}`;

interface Runner {
  enrollment: Enrollment;
  student?: Student;
  lesson?: Lesson;
  stage?: Stage;
  position: TrackPosition;
}

interface TrackCheckpointProps {
  kind: 'start' | 'lesson' | 'finish';
  title: string;
  subtitle?: string;
  runners: Runner[];
  participantAreaHeight: number;
  flowDirection: 'ltr' | 'rtl';
  isRowStart: boolean;
  isRowEnd: boolean;
}

interface TrackNode {
  key: string;
  kind: TrackCheckpointProps['kind'];
  title: string;
  subtitle?: string;
  runners: Runner[];
}

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const clampProgress = (value?: number) =>
  Math.min(100, Math.max(0, value ?? 0));

const getRunnerName = (runner: Runner) =>
  runner.student?.user.name ||
  runner.enrollment.userName ||
  runner.student?.user.email ||
  'Estudante não encontrado';

const getAvatarColor = (name: string) => {
  const hash = Array.from(name).reduce((total, char) => total + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

function StudentPoint({ runner }: { runner: Runner }) {
  const name = getRunnerName(runner);
  const status = runner.enrollment.status;
  const progress = status === 'COMPLETED'
    ? 100
    : clampProgress(runner.enrollment.progressPercentage);
  const positionLabel = runner.position === 'FINISH'
    ? 'Linha de chegada'
    : runner.position === 'WAITING'
      ? 'Aguardando início'
      : runner.lesson?.title || 'Lição não encontrada';

  return (
    <Popover placement="top" isLazy>
      <PopoverTrigger>
        <Button
          variant="unstyled"
          h="28px"
          minW="28px"
          borderRadius="full"
          aria-label={`Ver acompanhamento de ${name}`}
          title={name}
          transition="transform 0.15s ease"
          _hover={{ transform: 'translateY(-3px)' }}
          _focusVisible={{ boxShadow: 'outline' }}
        >
          <Avatar
            boxSize="24px"
            fontSize="9px"
            name={name}
            src={runner.student?.profilePictureUrl}
            bg={getAvatarColor(name)}
            color="white"
            border="2px solid"
            borderColor={status === 'COMPLETED' ? 'blue.200' : 'white'}
            boxShadow="md"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent w="290px" borderColor="gray.200" boxShadow="xl">
        <PopoverArrow />
        <PopoverCloseButton />
        <PopoverHeader pr={8} py={3} fontWeight="semibold">
          <HStack spacing={3}>
            <Avatar
              size="sm"
              name={name}
              src={runner.student?.profilePictureUrl}
              bg={getAvatarColor(name)}
              color="white"
            />
            <Box minW={0}>
              <Text noOfLines={1}>{name}</Text>
              <Text color="gray.500" fontSize="xs" fontWeight="normal" noOfLines={1}>
                {runner.student?.user.email || 'E-mail não disponível'}
              </Text>
            </Box>
          </HStack>
        </PopoverHeader>
        <PopoverBody py={4}>
          <VStack spacing={3} align="stretch">
            <Flex justify="space-between" gap={4}>
              <Text fontSize="sm" color="gray.500">Status</Text>
              {status ? (
                <Badge colorScheme={STATUS_COLORS[status]}>{STATUS_LABELS[status]}</Badge>
              ) : (
                <Text fontSize="sm">Não informado</Text>
              )}
            </Flex>
            <Flex justify="space-between" gap={4}>
              <Text fontSize="sm" color="gray.500">Stage</Text>
              <Text fontSize="sm" fontWeight="medium" textAlign="right">
                {runner.stage?.name || 'Não identificado'}
              </Text>
            </Flex>
            <Flex justify="space-between" gap={4}>
              <Text fontSize="sm" color="gray.500">Posição</Text>
              <Text fontSize="sm" fontWeight="medium" textAlign="right" noOfLines={2}>
                {positionLabel}
              </Text>
            </Flex>
            <Flex justify="space-between" gap={4}>
              <Text fontSize="sm" color="gray.500">Progresso</Text>
              <Text fontSize="sm" fontWeight="bold" color="primary.600">
                {progress}%
              </Text>
            </Flex>
          </VStack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}

function TrackCheckpoint({
  kind,
  title,
  subtitle,
  runners,
  participantAreaHeight,
  flowDirection,
  isRowStart,
  isRowEnd,
}: TrackCheckpointProps) {
  const markerColor = kind === 'finish' ? 'blue.500' : kind === 'start' ? 'gray.600' : 'primary.500';
  const lineLeft = (isRowStart && flowDirection === 'ltr') ||
    (isRowEnd && flowDirection === 'rtl')
    ? '50%'
    : 0;
  const lineRight = (isRowEnd && flowDirection === 'ltr') ||
    (isRowStart && flowDirection === 'rtl')
    ? '50%'
    : 0;

  return (
    <Box
      position="relative"
      w="full"
      minW={0}
      px={1}
      pt={1}
      pb="50px"
    >
      <Center minH="20px">
        {subtitle ? (
          <Badge
            colorScheme="orange"
            variant="subtle"
            borderRadius="full"
            px={1.5}
            maxW="full"
            fontSize="9px"
          >
            <Text as="span" noOfLines={1}>{subtitle}</Text>
          </Badge>
        ) : null}
      </Center>

      <Flex
        minH={`${participantAreaHeight}px`}
        align="flex-end"
        alignContent="flex-end"
        justify="center"
        flexWrap="wrap"
        gap={1}
        py={1.5}
      >
        {runners.map((runner) => (
          <StudentPoint key={String(runner.enrollment.id)} runner={runner} />
        ))}
      </Flex>

      <Box
        position="absolute"
        left={lineLeft}
        right={lineRight}
        bottom="37px"
        h="3px"
        bg="gray.300"
      />
      <Center
        position="absolute"
        left="50%"
        bottom="28px"
        transform="translateX(-50%)"
        w="21px"
        h="21px"
        borderRadius="full"
        bg={markerColor}
        color="white"
        border="3px solid"
        borderColor="white"
        boxShadow="0 0 0 2px var(--chakra-colors-gray-300)"
        zIndex={1}
      >
        {kind === 'start' ? (
          <Icon as={MdFlag} boxSize={2.5} />
        ) : kind === 'finish' ? (
          <Icon as={MdEmojiEvents} boxSize={3} />
        ) : (
          <Text fontSize="8px" fontWeight="bold">{runners.length}</Text>
        )}
      </Center>

      <Box position="absolute" left={1} right={1} bottom={0} h="24px" textAlign="center">
        <Text fontSize="xs" lineHeight="short" fontWeight="semibold" color="gray.700" noOfLines={2}>
          {title}
        </Text>
      </Box>
    </Box>
  );
}

export default function AcompanhamentoPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE');
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [enrollmentData, studentData, skillData, stageData, lessonData] = await Promise.all([
        enrollmentService.getAll(),
        studentService.getAll(),
        skillService.getAll(),
        stageService.getAll(),
        lessonService.getAll(),
      ]);

      const sortedSkills = [...skillData].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      setEnrollments(enrollmentData);
      setStudents(studentData);
      setSkills(sortedSkills);
      setStages(stageData);
      setLessons(lessonData);
      setSelectedSkillId((currentSkillId) => {
        if (sortedSkills.some((skill) => String(skill.id) === currentSkillId)) {
          return currentSkillId;
        }

        const skillWithActiveStudents = sortedSkills.find((skill) =>
          enrollmentData.some(
            (enrollment) => enrollment.skillId === skill.id && enrollment.status === 'ACTIVE'
          )
        );
        return String(skillWithActiveStudents?.id ?? sortedSkills[0]?.id ?? '');
      });
    } catch {
      setError('Não foi possível carregar os dados de acompanhamento. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedSkill = useMemo(
    () => skills.find((skill) => String(skill.id) === selectedSkillId),
    [selectedSkillId, skills]
  );

  const studentById = useMemo(
    () => new Map(students.map((student) => [student.user.id, student])),
    [students]
  );

  const stageById = useMemo(
    () => new Map(stages.map((stage) => [String(stage.id), stage])),
    [stages]
  );

  const skillLessons = useMemo(() => {
    if (!selectedSkillId) return [];

    return lessons
      .filter(
        (lesson) =>
          lesson.isActive !== false && String(lesson.skillId) === selectedSkillId
      )
      .sort((a, b) => {
        const stageA = stageById.get(String(a.stageId));
        const stageB = stageById.get(String(b.stageId));
        const stageOrderDifference = (stageA?.orderIndex ?? Number.MAX_SAFE_INTEGER) -
          (stageB?.orderIndex ?? Number.MAX_SAFE_INTEGER);

        if (stageOrderDifference !== 0) return stageOrderDifference;
        if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
        return a.title.localeCompare(b.title, 'pt-BR');
      });
  }, [lessons, selectedSkillId, stageById]);

  const lessonById = useMemo(
    () => new Map(skillLessons.map((lesson) => [lesson.id, lesson])),
    [skillLessons]
  );

  const filteredEnrollments = useMemo(() => {
    const normalizedSearch = normalizeText(searchText.trim());

    return enrollments.filter((enrollment) => {
      if (String(enrollment.skillId) !== selectedSkillId) return false;
      if (statusFilter !== 'ALL' && enrollment.status !== statusFilter) return false;

      if (!normalizedSearch) return true;
      const student = enrollment.userId ? studentById.get(enrollment.userId) : undefined;
      const searchableText = normalizeText([
        student?.user.name,
        student?.user.email,
        enrollment.userName,
        enrollment.userId,
      ].filter(Boolean).join(' '));

      return searchableText.includes(normalizedSearch);
    });
  }, [enrollments, searchText, selectedSkillId, statusFilter, studentById]);

  const runners = useMemo(() => {
    return filteredEnrollments.map<Runner>((enrollment) => {
      const student = enrollment.userId ? studentById.get(enrollment.userId) : undefined;

      if (enrollment.status === 'COMPLETED') {
        return {
          enrollment,
          student,
          stage: enrollment.currentStageId
            ? stageById.get(String(enrollment.currentStageId))
            : undefined,
          position: 'FINISH',
        };
      }

      const currentLesson = enrollment.currentLessonId
        ? lessonById.get(enrollment.currentLessonId)
        : undefined;
      const stageId = enrollment.currentStageId ?? enrollment.stageId;
      const fallbackLesson = currentLesson || (
        stageId
          ? skillLessons.find((lesson) => String(lesson.stageId) === String(stageId))
          : undefined
      );

      if (!fallbackLesson) {
        return {
          enrollment,
          student,
          stage: stageId ? stageById.get(String(stageId)) : undefined,
          position: 'WAITING',
        };
      }

      return {
        enrollment,
        student,
        lesson: fallbackLesson,
        stage: fallbackLesson.stageId
          ? stageById.get(String(fallbackLesson.stageId))
          : undefined,
        position: `LESSON:${fallbackLesson.id}`,
      };
    });
  }, [filteredEnrollments, lessonById, skillLessons, stageById, studentById]);

  const groupedRunners = useMemo(() => {
    const byLesson = new Map<string, Runner[]>();
    const waiting: Runner[] = [];
    const finish: Runner[] = [];

    runners.forEach((runner) => {
      if (runner.position === 'WAITING') {
        waiting.push(runner);
        return;
      }
      if (runner.position === 'FINISH') {
        finish.push(runner);
        return;
      }

      const lessonId = runner.position.replace('LESSON:', '');
      const lessonRunners = byLesson.get(lessonId) ?? [];
      lessonRunners.push(runner);
      byLesson.set(lessonId, lessonRunners);
    });

    const sortByName = (a: Runner, b: Runner) =>
      getRunnerName(a).localeCompare(getRunnerName(b), 'pt-BR');
    waiting.sort(sortByName);
    finish.sort(sortByName);
    byLesson.forEach((lessonRunners) => lessonRunners.sort(sortByName));

    return { byLesson, waiting, finish };
  }, [runners]);

  const averageProgress = useMemo(() => {
    if (filteredEnrollments.length === 0) return 0;
    const progressSum = filteredEnrollments.reduce(
      (total, enrollment) =>
        total + (enrollment.status === 'COMPLETED' ? 100 : clampProgress(enrollment.progressPercentage)),
      0
    );
    return Math.round(progressSum / filteredEnrollments.length);
  }, [filteredEnrollments]);

  const participantAreaHeight = useMemo(() => {
    const groupSizes = [
      groupedRunners.waiting.length,
      groupedRunners.finish.length,
      ...skillLessons.map((lesson) => groupedRunners.byLesson.get(lesson.id)?.length ?? 0),
    ];
    const largestGroup = Math.max(0, ...groupSizes);
    const rows = Math.ceil(largestGroup / 4);
    return Math.max(48, rows * 28 + 8);
  }, [groupedRunners, skillLessons]);

  const checkpointsPerRow = useBreakpointValue({
    base: 2,
    sm: 3,
    md: 4,
    lg: 6,
    xl: 8,
    '2xl': 10,
  }) ?? 6;

  const trackRows = useMemo(() => {
    const trackNodes: TrackNode[] = [
      {
        key: 'start',
        kind: 'start',
        title: 'Aguardando início',
        runners: groupedRunners.waiting,
      },
      ...skillLessons.map((lesson): TrackNode => {
        const stage = lesson.stageId ? stageById.get(String(lesson.stageId)) : undefined;
        return {
          key: lesson.id,
          kind: 'lesson',
          title: lesson.title,
          subtitle: stage?.name || 'Stage não identificado',
          runners: groupedRunners.byLesson.get(lesson.id) ?? [],
        };
      }),
      {
        key: 'finish',
        kind: 'finish',
        title: 'Skill concluída',
        runners: groupedRunners.finish,
      },
    ];

    const rows: TrackNode[][] = [];
    for (let index = 0; index < trackNodes.length; index += checkpointsPerRow) {
      rows.push(trackNodes.slice(index, index + checkpointsPerRow));
    }
    return rows;
  }, [checkpointsPerRow, groupedRunners, skillLessons, stageById]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <Center minH="60vh">
          <VStack spacing={4}>
            <Spinner size="xl" thickness="4px" color="primary.500" />
            <Text color="gray.500">Preparando a pista de acompanhamento...</Text>
          </VStack>
        </Center>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <Alert status="error" borderRadius="lg" alignItems="center">
          <AlertIcon />
          <Box flex="1">
            <AlertTitle>Erro ao carregar acompanhamento</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Box>
          <Button leftIcon={<MdRefresh />} onClick={loadData} colorScheme="red" variant="outline">
            Tentar novamente
          </Button>
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Flex justify="space-between" align={{ base: 'flex-start', lg: 'center' }} gap={3} mb={3} wrap="wrap">
        <Box>
          <Heading size="md" color="gray.700">Acompanhamento</Heading>
          <Text color="gray.500" mt={0.5} fontSize="sm">
            Visualize a posição dos estudantes nas lições de cada skill.
          </Text>
        </Box>
        <Button size="sm" leftIcon={<MdRefresh />} variant="outline" colorScheme="primary" onClick={loadData}>
          Atualizar dados
        </Button>
      </Flex>

      {skills.length === 0 ? (
        <Alert status="info" borderRadius="lg">
          <AlertIcon />
          <Box>
            <AlertTitle>Nenhuma skill cadastrada</AlertTitle>
            <AlertDescription>Cadastre uma skill para começar o acompanhamento.</AlertDescription>
          </Box>
        </Alert>
      ) : (
        <>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3} mb={3}>
            <Stat bg="white" px={3} py={2} borderRadius="lg" boxShadow="sm" border="1px solid" borderColor="gray.100">
              <HStack justify="space-between" align="center">
                <Box>
                  <StatLabel color="gray.500" fontSize="xs">Estudantes exibidos</StatLabel>
                  <StatNumber color="gray.700" fontSize="xl">{filteredEnrollments.length}</StatNumber>
                </Box>
                <Center bg="primary.50" color="primary.600" borderRadius="md" w="32px" h="32px">
                  <Icon as={MdGroups} boxSize={4} />
                </Center>
              </HStack>
            </Stat>
            <Stat bg="white" px={3} py={2} borderRadius="lg" boxShadow="sm" border="1px solid" borderColor="gray.100">
              <HStack justify="space-between" align="center">
                <Box>
                  <StatLabel color="gray.500" fontSize="xs">Lições da pista</StatLabel>
                  <StatNumber color="gray.700" fontSize="xl">{skillLessons.length}</StatNumber>
                </Box>
                <Center bg="blue.50" color="blue.600" borderRadius="md" w="32px" h="32px">
                  <Icon as={MdMenuBook} boxSize={4} />
                </Center>
              </HStack>
            </Stat>
            <Stat bg="white" px={3} py={2} borderRadius="lg" boxShadow="sm" border="1px solid" borderColor="gray.100">
              <HStack justify="space-between" align="center">
                <Box>
                  <StatLabel color="gray.500" fontSize="xs">Progresso médio</StatLabel>
                  <StatNumber color="gray.700" fontSize="xl">{averageProgress}%</StatNumber>
                </Box>
                <Center bg="green.50" color="green.600" borderRadius="md" w="32px" h="32px">
                  <Icon as={MdTimeline} boxSize={4} />
                </Center>
              </HStack>
            </Stat>
          </SimpleGrid>

          <Box bg="white" borderRadius="lg" boxShadow="sm" border="1px solid" borderColor="gray.100" p={3} mb={3}>
            <Flex gap={3} align="flex-end" wrap="wrap">
              <FormControl maxW={{ base: 'full', md: '280px' }}>
                <FormLabel fontSize="xs" color="gray.600" mb={1}>Skill</FormLabel>
                <Select
                  size="sm"
                  value={selectedSkillId}
                  onChange={(event) => setSelectedSkillId(event.target.value)}
                  bg="white"
                >
                  {skills.map((skill) => (
                    <option key={skill.id} value={String(skill.id)}>{skill.name}</option>
                  ))}
                </Select>
              </FormControl>

              <FormControl maxW={{ base: 'full', md: '220px' }}>
                <FormLabel fontSize="xs" color="gray.600" mb={1}>Status da matrícula</FormLabel>
                <Select
                  size="sm"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                  bg="white"
                >
                  <option value="ACTIVE">Ativas</option>
                  <option value="PAUSED">Pausadas</option>
                  <option value="INACTIVE">Inativas</option>
                  <option value="COMPLETED">Concluídas</option>
                  <option value="ALL">Todos os status</option>
                </Select>
              </FormControl>

              <FormControl flex="1" minW={{ base: 'full', md: '260px' }}>
                <FormLabel fontSize="xs" color="gray.600" mb={1}>Buscar estudante</FormLabel>
                <InputGroup size="sm">
                  <InputLeftElement pointerEvents="none">
                    <Icon as={MdSearch} color="gray.400" />
                  </InputLeftElement>
                  <Input
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Nome ou e-mail..."
                  />
                </InputGroup>
              </FormControl>
            </Flex>
          </Box>

          {skillLessons.length === 0 ? (
            <Alert status="warning" borderRadius="lg">
              <AlertIcon />
              <Box>
                <AlertTitle>Skill sem lições ativas</AlertTitle>
                <AlertDescription>
                  {selectedSkill?.name || 'A skill selecionada'} ainda não possui checkpoints para a pista.
                </AlertDescription>
              </Box>
            </Alert>
          ) : (
            <Box bg="white" borderRadius="lg" boxShadow="sm" border="1px solid" borderColor="gray.100" overflow="hidden">
              <Flex px={3} py={2.5} borderBottom="1px solid" borderColor="gray.100" justify="space-between" align="center" gap={3} wrap="wrap">
                <Box>
                  <Heading size="sm" color="gray.700">Pista: {selectedSkill?.name}</Heading>
                  <Text fontSize="xs" color="gray.500" mt={0.5}>
                    O percurso continua na linha abaixo ao chegar em cada curva.
                  </Text>
                </Box>
                <HStack spacing={2} color="gray.500">
                  <Box w="10px" h="10px" borderRadius="full" bg="primary.500" />
                  <Text fontSize="xs">Clique em um estudante para ver detalhes</Text>
                </HStack>
              </Flex>

              {filteredEnrollments.length === 0 && (
                <Alert status="info" variant="left-accent" borderRadius={0}>
                  <AlertIcon />
                  <AlertDescription>
                    Nenhum estudante corresponde aos filtros atuais. A pista continua visível para consulta.
                  </AlertDescription>
                </Alert>
              )}

              <Box w="full" overflow="hidden" px={2} py={2}>
                {trackRows.map((row, rowIndex) => {
                  const isRightToLeft = rowIndex % 2 === 1;
                  const displayedNodes = isRightToLeft ? [...row].reverse() : row;
                  const itemWidth = `${100 / checkpointsPerRow}%`;

                  return (
                    <React.Fragment key={`track-row-${rowIndex}`}>
                      <Flex
                        w="full"
                        align="stretch"
                        justify={isRightToLeft ? 'flex-end' : 'flex-start'}
                      >
                        {displayedNodes.map((node, nodeIndex) => {
                          const isRowStart = isRightToLeft
                            ? nodeIndex === displayedNodes.length - 1
                            : nodeIndex === 0;
                          const isRowEnd = isRightToLeft
                            ? nodeIndex === 0
                            : nodeIndex === displayedNodes.length - 1;

                          return (
                            <Box key={node.key} flex={`0 0 ${itemWidth}`} maxW={itemWidth} minW={0}>
                              <TrackCheckpoint
                                kind={node.kind}
                                title={node.title}
                                subtitle={node.subtitle}
                                runners={node.runners}
                                participantAreaHeight={participantAreaHeight}
                                flowDirection={isRightToLeft ? 'rtl' : 'ltr'}
                                isRowStart={isRowStart}
                                isRowEnd={isRowEnd}
                              />
                            </Box>
                          );
                        })}
                      </Flex>

                      {rowIndex < trackRows.length - 1 && (
                        <Box position="relative" h="22px">
                          <Box
                            position="absolute"
                            top="-37px"
                            h={`${participantAreaHeight + 96}px`}
                            {...(isRightToLeft
                              ? { left: `calc(${100 / (checkpointsPerRow * 2)}% - 2px)` }
                              : { right: `calc(${100 / (checkpointsPerRow * 2)}% - 2px)` })}
                            w="4px"
                            bg="gray.300"
                            borderRadius="full"
                            zIndex={0}
                          />
                        </Box>
                      )}
                    </React.Fragment>
                  );
                })}
              </Box>
            </Box>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
