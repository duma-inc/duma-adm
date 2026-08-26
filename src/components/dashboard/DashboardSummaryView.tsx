'use client';

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
import type { ReactNode } from 'react';
import type { Meeting } from '@/services/meetingService';
import type { DashboardSummary } from '@/types/dashboard';
import { MeetingsCalendar, type MeetingCalendarLabels } from './MeetingsCalendar';

const CHART_COLORS = ['#FDA91E', '#4CAF50', '#2196F3', '#FF7043', '#AB47BC', '#26A69A'];

const formatDateTime = (dateValue?: string) => {
  if (!dateValue) return '—';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR');
};

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

export function DashboardSummaryView({
  summary,
  meetings,
  meetingLabels,
  meetingsUnavailable,
}: {
  summary: DashboardSummary;
  meetings: Meeting[];
  meetingLabels: MeetingCalendarLabels;
  meetingsUnavailable?: boolean;
}) {
  const hasMonthlyChartData = summary.monthlyEnrollments.some((item) =>
    summary.monthlyPlanSeries.some((planName) => Number(item[planName] || 0) > 0)
  );

  return (
    <VStack align="stretch" spacing={6}>
      <Box>
        <Heading as="h1" size="lg" color="gray.700">Dashboard Administrativa</Heading>
        <Text mt={2} color="gray.500">
          Visão consolidada de matrículas, encontros, attempts e erros reportados.
        </Text>
      </Box>

      {summary.issueFetchStatus === 'partial' ? (
        <Alert status="warning" borderRadius="md">
          <AlertIcon />
          Parte dos relatórios de erro não pôde ser carregada. Os demais indicadores seguem válidos.
        </Alert>
      ) : null}

      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }} gap={4}>
        <GridItem><SummaryCard label="Total de matrículas" value={summary.totalEnrollments} /></GridItem>
        <GridItem><SummaryCard label="Relatórios de erros" value={summary.issueCount} helper={summary.issueFetchStatus === 'partial' ? 'parcial' : undefined} /></GridItem>
        <GridItem><SummaryCard label="Encontros realizados" value={summary.finishedMeetingsCount} /></GridItem>
        <GridItem><SummaryCard label="Encontros cancelados" value={summary.cancelledMeetingsCount} /></GridItem>
      </Grid>

      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', xl: `repeat(${Math.max(2, Math.min(summary.planCounts.length, 4))}, 1fr)` }} gap={4}>
        {summary.planCounts.map((plan) => (
          <GridItem key={plan.id}>
            <SummaryCard label={`Matrículas • ${plan.name}`} value={plan.count} />
          </GridItem>
        ))}
      </Grid>

      <MeetingsCalendar
        meetings={meetings}
        labels={meetingLabels}
        unavailable={meetingsUnavailable}
      />

      <Grid templateColumns={{ base: '1fr', xl: '1.2fr 1fr' }} gap={6}>
        <GridItem>
          <ChartCard title="Students por stage" subtitle="Distribuição de matrículas por trilha">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.studentsPerStage}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {summary.studentsPerStage.map((item, index) => (
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
              <SummaryCard label="Total de attempts" value={summary.totalAttempts} />
              <VStack align="stretch" spacing={3}>
                {summary.attemptsByStage.slice(0, 5).map((item) => (
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
                        w={`${summary.totalAttempts > 0 ? (item.total / summary.totalAttempts) * 100 : 0}%`}
                      />
                    </Box>
                  </Box>
                ))}
                {summary.attemptsByStage.length === 0 ? (
                  <Text fontSize="sm" color="gray.500">Nenhum attempt encontrado.</Text>
                ) : null}
              </VStack>
            </VStack>
          </Box>
        </GridItem>
      </Grid>

      <ChartCard title="Novas matrículas por mês" subtitle="Volume mensal segmentado por plano">
        {summary.enrollmentsWithoutDate > 0 ? (
          <Alert status="info" borderRadius="md" mb={4}>
            <AlertIcon />
            {summary.enrollmentsWithoutDate === summary.totalEnrollments
              ? 'O payload de matrícula não traz data. Os registros foram agrupados em "Sem data".'
              : `${summary.enrollmentsWithoutDate} matrícula(s) vieram sem data e foram agrupadas em "Sem data".`}
          </Alert>
        ) : null}
        {summary.monthlyEnrollments.length > 0 && hasMonthlyChartData ? (
          <Box h="320px">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.monthlyEnrollments}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                {summary.monthlyPlanSeries.map((planName, index) => (
                  <Bar
                    key={planName}
                    dataKey={planName}
                    stackId="plans"
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                    radius={index === summary.monthlyPlanSeries.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
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
                {summary.completedByTeacher.map((item) => (
                  <Tr key={item.teacherId}>
                    <Td>{item.teacherName}</Td>
                    <Td isNumeric>{item.total}</Td>
                    <Td>{formatDateTime(item.lastMeetingAt)}</Td>
                  </Tr>
                ))}
                {summary.completedByTeacher.length === 0 ? (
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
  );
}
