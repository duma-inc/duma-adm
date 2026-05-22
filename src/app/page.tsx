'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  Spinner,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from '@chakra-ui/react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { enrollmentService, Enrollment } from '@/services/enrollmentService';
import { planService, Plan } from '@/services/planService';
import { stageService, Stage } from '@/services/stageService';
import { lessonService, Lesson } from '@/services/lessonService';
import { meetingService, Meeting } from '@/services/meetingService';
import { teacherService, Teacher } from '@/services/teacherService';
import { userService, User } from '@/services/userService';
import { exerciseService, Exercise } from '@/services/exerciseService';
import { reportedIssueService } from '@/services/reportedIssueService';
import { attemptService, Attempt } from '@/services/attemptService';

type DashboardData = {
  enrollments: Enrollment[];
  plans: Plan[];
  stages: Stage[];
  lessons: Lesson[];
  meetings: Meeting[];
  teachers: Teacher[];
  users: User[];
  exercises: Exercise[];
  attempts: Attempt[];
  errorCount: number;
  issueFetchFailed: boolean;
};

const CHART_COLORS = ['#FDA91E', '#4CAF50', '#2196F3', '#FF7043', '#AB47BC', '#26A69A'];

const formatMonthLabel = (dateValue?: string) => {
  if (!dateValue) return 'Sem data';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(date);
};

const formatDateTime = (dateValue?: string) => {
  if (!dateValue) return '—';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR');
};

const getEnrollmentTimelineDate = (enrollment: Enrollment) =>
  enrollment.enrolledAt || enrollment.createdAt || enrollment.startDate || enrollment.endDate;

const getResolvedEnrollmentStageId = (enrollment: Enrollment, lessonsById: Map<string, Lesson>) =>
  enrollment.currentStageId || enrollment.stageId || lessonsById.get(enrollment.currentLessonId || '')?.stageId;

function SummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: number | string;
  helper?: string;
}) {
  return (
    <Box bg="white" borderRadius="md" boxShadow="sm" p={5}>
      <Stat>
        <StatLabel color="gray.500" fontSize="sm">{label}</StatLabel>
        <StatNumber color="gray.800">{value}</StatNumber>
        {helper ? <StatHelpText mb={0}>{helper}</StatHelpText> : null}
      </Stat>
    </Box>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Box bg="white" borderRadius="md" boxShadow="sm" p={5} h="100%">
      <VStack align="stretch" spacing={4} h="100%">
        <Box>
          <Heading size="sm" color="gray.700">{title}</Heading>
          {subtitle ? <Text mt={1} fontSize="sm" color="gray.500">{subtitle}</Text> : null}
        </Box>
        <Box flex={1} minH="320px">
          {children}
        </Box>
      </VStack>
    </Box>
  );
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [
          enrollmentsResult,
          plansResult,
          stagesResult,
          lessonsResult,
          meetingsResult,
          teachersResult,
          usersResult,
          exercisesResult,
          attemptsResult,
        ] = await Promise.allSettled([
          enrollmentService.getAll(),
          planService.getAll(),
          stageService.getAll(),
          lessonService.getAll(),
          meetingService.getAll(),
          teacherService.getAll(),
          userService.getAll(),
          exerciseService.getAll(),
          attemptService.getAll(),
        ]);

        const enrollments = enrollmentsResult.status === 'fulfilled' ? enrollmentsResult.value : [];
        const plans = plansResult.status === 'fulfilled' ? plansResult.value : [];
        const stages = stagesResult.status === 'fulfilled' ? stagesResult.value : [];
        const lessons = lessonsResult.status === 'fulfilled' ? lessonsResult.value : [];
        const meetings = meetingsResult.status === 'fulfilled' ? meetingsResult.value : [];
        const teachers = teachersResult.status === 'fulfilled' ? teachersResult.value : [];
        const users = usersResult.status === 'fulfilled' ? usersResult.value : [];
        const exercises = exercisesResult.status === 'fulfilled' ? exercisesResult.value : [];
        const attempts = attemptsResult.status === 'fulfilled' ? attemptsResult.value : [];

        const allResults = [
          enrollmentsResult, plansResult, stagesResult, lessonsResult,
          meetingsResult, teachersResult, usersResult, exercisesResult, attemptsResult,
        ];
        const endpointNames = ['matrículas', 'planos', 'stages', 'lições', 'encontros', 'colaboradores', 'usuários', 'exercícios', 'attempts'];
        const failedEndpoints = allResults
          .map((r, i) => (r.status === 'rejected' ? endpointNames[i] : null))
          .filter(Boolean);

        if (failedEndpoints.length > 0) {
          console.warn('[Dashboard] Endpoints com falha:', failedEndpoints);
        }

        const issueResults = await Promise.allSettled(
          exercises.map((exercise) => reportedIssueService.getByExercise(exercise.id))
        );

        const errorCount = issueResults.reduce((total, result) => {
          if (result.status !== 'fulfilled') return total;
          return total + result.value.length;
        }, 0);

        const issueFetchFailed = issueResults.some((result) => result.status === 'rejected');

        setData({
          enrollments,
          plans,
          stages,
          lessons,
          meetings,
          teachers,
          users,
          exercises,
          attempts,
          errorCount,
          issueFetchFailed,
        });
      } catch {
        setErrorMessage('Não foi possível carregar a dashboard.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const metrics = useMemo(() => {
    if (!data) return null;

    const planNameById = new Map(data.plans.map((plan) => [String(plan.id), plan.nome]));
    const stageNameById = new Map(data.stages.map((stage) => [String(stage.id), stage.name]));
    const lessonById = new Map(data.lessons.map((lesson) => [lesson.id, lesson]));
    const exerciseById = new Map(data.exercises.map((exercise) => [exercise.id, exercise]));
    const userNameById = new Map(data.users.map((user) => [user.id, user.name || user.email]));
    const teacherUserIds = new Set(data.teachers.map((teacher) => teacher.userId));

    const totalEnrollments = data.enrollments.length;
    const planCounts = data.plans.map((plan) => ({
      id: String(plan.id),
      name: plan.nome,
      count: data.enrollments.filter((enrollment) => String(enrollment.planId) === String(plan.id)).length,
    }));

    const studentsPerStageMap = new Map<string, { name: string; total: number }>();
    data.enrollments.forEach((enrollment) => {
      const resolvedStageId = getResolvedEnrollmentStageId(enrollment, lessonById);
      if (!resolvedStageId) return;
      const stageName =
        stageNameById.get(String(resolvedStageId)) ||
        enrollment.currentStageName ||
        enrollment.stageName ||
        'Sem stage';
      const entry = studentsPerStageMap.get(String(resolvedStageId)) || { name: stageName, total: 0 };
      entry.total += 1;
      studentsPerStageMap.set(String(resolvedStageId), entry);
    });
    const studentsPerStage = Array.from(studentsPerStageMap.values()).sort((a, b) => b.total - a.total);

    const monthlyEnrollmentMap = new Map<string, Record<string, string | number>>();
    let enrollmentsWithoutDate = 0;
    data.enrollments.forEach((enrollment) => {
      const timelineDate = getEnrollmentTimelineDate(enrollment);
      if (!timelineDate) {
        enrollmentsWithoutDate += 1;
      }
      const monthDate = timelineDate ? new Date(timelineDate) : null;
      const monthKey = monthDate && !Number.isNaN(monthDate.getTime())
        ? `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`
        : 'sem-data';
      const monthLabel = formatMonthLabel(timelineDate);
      const planName = enrollment.planName || planNameById.get(String(enrollment.planId)) || 'Sem plano';
      const current = monthlyEnrollmentMap.get(monthKey) || { month: monthLabel, sortKey: monthKey };
      current[planName] = Number(current[planName] || 0) + 1;
      monthlyEnrollmentMap.set(monthKey, current);
    });
    const monthlyEnrollments = Array.from(monthlyEnrollmentMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, value]) => value);
    const monthlyPlanSeries = Array.from(
      new Set(
        monthlyEnrollments.flatMap((item) =>
          Object.keys(item).filter((key) => key !== 'month' && key !== 'sortKey')
        )
      )
    );
    const hasMonthlyChartData = monthlyEnrollments.some((item) =>
      monthlyPlanSeries.some((planName) => Number(item[planName] || 0) > 0)
    );

    const attemptsByStageMap = new Map<string, { name: string; total: number }>();
    data.attempts.forEach((attempt) => {
      let lesson = attempt.lessonId ? lessonById.get(attempt.lessonId) : undefined;
      if (!lesson && attempt.exerciseId) {
        const exercise = exerciseById.get(attempt.exerciseId);
        lesson = exercise?.lessonId ? lessonById.get(exercise.lessonId) : undefined;
      }
      const resolvedStageId = lesson?.stageId;
      if (!resolvedStageId) return;
      const stageName = stageNameById.get(String(resolvedStageId)) || 'Sem stage';
      const entry = attemptsByStageMap.get(String(resolvedStageId)) || { name: stageName, total: 0 };
      entry.total += 1;
      attemptsByStageMap.set(String(resolvedStageId), entry);
    });
    const attemptsByStage = Array.from(attemptsByStageMap.values()).sort((a, b) => b.total - a.total);
    const totalAttempts = attemptsByStage.reduce((sum, item) => sum + item.total, 0);

    const finishedMeetings = data.meetings.filter((meeting) => meeting.status === 'COMPLETED');
    const cancelledMeetings = data.meetings.filter((meeting) => meeting.status === 'CANCELED');

    const completedByTeacherMap = new Map<string, { teacherId: string; teacherName: string; total: number; lastMeetingAt?: string }>();
    finishedMeetings.forEach((meeting) => {
      const teacherName = teacherUserIds.has(meeting.teacherId)
        ? userNameById.get(meeting.teacherId) || meeting.teacherId
        : userNameById.get(meeting.teacherId) || meeting.teacherId;
      const entry = completedByTeacherMap.get(meeting.teacherId) || {
        teacherId: meeting.teacherId,
        teacherName,
        total: 0,
        lastMeetingAt: undefined,
      };
      entry.total += 1;
      if (!entry.lastMeetingAt || new Date(meeting.scheduledStart) > new Date(entry.lastMeetingAt)) {
        entry.lastMeetingAt = meeting.scheduledStart;
      }
      completedByTeacherMap.set(meeting.teacherId, entry);
    });
    const completedByTeacher = Array.from(completedByTeacherMap.values()).sort((a, b) => b.total - a.total);

    return {
      totalEnrollments,
      planCounts,
      studentsPerStage,
      monthlyEnrollments,
      monthlyPlanSeries,
      hasMonthlyChartData,
      enrollmentsWithoutDate,
      attemptsByStage,
      totalAttempts,
      finishedMeetingsCount: finishedMeetings.length,
      cancelledMeetingsCount: cancelledMeetings.length,
      completedByTeacher,
      issueCount: data.errorCount,
      issueFetchFailed: data.issueFetchFailed,
    };
  }, [data]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <Flex minH="60vh" align="center" justify="center">
          <Spinner size="xl" color="primary.500" />
        </Flex>
      </DashboardLayout>
    );
  }

  if (errorMessage || !data || !metrics) {
    return (
      <DashboardLayout>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          {errorMessage || 'Não foi possível montar a dashboard.'}
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <VStack align="stretch" spacing={6}>
        <Box>
          <Heading as="h1" size="lg" color="gray.700">Dashboard Administrativa</Heading>
          <Text mt={2} color="gray.500">
            Visão consolidada de matrículas, encontros, attempts e erros reportados.
          </Text>
        </Box>

        {metrics.issueFetchFailed ? (
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            Parte dos relatórios de erro não pôde ser carregada. Os demais indicadores seguem válidos.
          </Alert>
        ) : null}

        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }} gap={4}>
          <GridItem><SummaryCard label="Total de matrículas" value={metrics.totalEnrollments} /></GridItem>
          <GridItem><SummaryCard label="Relatórios de erros" value={metrics.issueCount} helper={metrics.issueFetchFailed ? 'parcial' : undefined} /></GridItem>
          <GridItem><SummaryCard label="Encontros realizados" value={metrics.finishedMeetingsCount} /></GridItem>
          <GridItem><SummaryCard label="Encontros cancelados" value={metrics.cancelledMeetingsCount} /></GridItem>
        </Grid>

        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', xl: `repeat(${Math.max(2, Math.min(metrics.planCounts.length, 4))}, 1fr)` }} gap={4}>
          {metrics.planCounts.map((plan) => (
            <GridItem key={plan.id}>
              <SummaryCard label={`Matrículas • ${plan.name}`} value={plan.count} />
            </GridItem>
          ))}
        </Grid>

        <Grid templateColumns={{ base: '1fr', xl: '1.2fr 1fr' }} gap={6}>
          <GridItem>
            <ChartCard title="Students por stage" subtitle="Distribuição de matrículas por trilha">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.studentsPerStage}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                    {metrics.studentsPerStage.map((item, index) => (
                      <Cell key={`${item.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </GridItem>

          <GridItem>
            <Box bg="white" borderRadius="md" boxShadow="sm" p={5} h="100%">
              <VStack align="stretch" spacing={4}>
                <Box>
                  <Heading size="sm" color="gray.700">Attempts por stage</Heading>
                  <Text mt={1} fontSize="sm" color="gray.500">Total geral de attempts entregues por trilha</Text>
                </Box>
                <SummaryCard label="Total de attempts" value={metrics.totalAttempts} />
                <VStack align="stretch" spacing={3}>
                  {metrics.attemptsByStage.slice(0, 5).map((item) => (
                    <Box key={item.name}>
                      <HStack justify="space-between" mb={1}>
                        <Text fontSize="sm" color="gray.600">{item.name}</Text>
                        <Badge colorScheme="orange">{item.total}</Badge>
                      </HStack>
                      <Box h="8px" bg="gray.100" borderRadius="full" overflow="hidden">
                        <Box
                          h="100%"
                          bg="primary.500"
                          borderRadius="full"
                          w={`${metrics.totalAttempts > 0 ? (item.total / metrics.totalAttempts) * 100 : 0}%`}
                        />
                      </Box>
                    </Box>
                  ))}
                  {metrics.attemptsByStage.length === 0 ? (
                    <Text fontSize="sm" color="gray.500">Nenhum attempt encontrado.</Text>
                  ) : null}
                </VStack>
              </VStack>
            </Box>
          </GridItem>
        </Grid>

        <ChartCard title="Novas matrículas por mês" subtitle="Volume mensal segmentado por plano">
          {metrics.enrollmentsWithoutDate > 0 ? (
            <Alert status="info" borderRadius="md" mb={4}>
              <AlertIcon />
              {metrics.enrollmentsWithoutDate === metrics.totalEnrollments
                ? 'O payload de matrícula não traz data. Os registros foram agrupados em "Sem data".'
                : `${metrics.enrollmentsWithoutDate} matrícula(s) vieram sem data e foram agrupadas em "Sem data".`}
            </Alert>
          ) : null}
          {metrics.monthlyEnrollments.length > 0 && metrics.hasMonthlyChartData ? (
            <Box h="320px">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.monthlyEnrollments}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  {metrics.monthlyPlanSeries.map((planName, index) => (
                    <Bar
                      key={planName}
                      dataKey={planName}
                      stackId="plans"
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                      radius={index === metrics.monthlyPlanSeries.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Box>
          ) : (
            <Flex h="320px" align="center" justify="center">
              <Text fontSize="sm" color="gray.500">
                Nenhuma matrícula com data disponível para compor a série mensal.
              </Text>
            </Flex>
          )}
        </ChartCard>

        <Box bg="white" borderRadius="md" boxShadow="sm" p={5}>
          <VStack align="stretch" spacing={4}>
            <Box>
              <Heading size="sm" color="gray.700">Encontros concluídos por tutor</Heading>
              <Text mt={1} fontSize="sm" color="gray.500">Somente encontros com status COMPLETED</Text>
            </Box>
            <TableContainer>
              <Table variant="simple">
                <Thead bg="gray.50">
                  <Tr>
                    <Th>Tutor</Th>
                    <Th isNumeric>Total concluídos</Th>
                    <Th>Último encontro concluído</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {metrics.completedByTeacher.map((item) => (
                    <Tr key={item.teacherId}>
                      <Td>{item.teacherName}</Td>
                      <Td isNumeric>{item.total}</Td>
                      <Td>{formatDateTime(item.lastMeetingAt)}</Td>
                    </Tr>
                  ))}
                  {metrics.completedByTeacher.length === 0 ? (
                    <Tr>
                      <Td colSpan={3} textAlign="center" py={8} color="gray.500">
                        Nenhum encontro concluído encontrado.
                      </Td>
                    </Tr>
                  ) : null}
                </Tbody>
              </Table>
            </TableContainer>
          </VStack>
        </Box>
      </VStack>
    </DashboardLayout>
  );
}
