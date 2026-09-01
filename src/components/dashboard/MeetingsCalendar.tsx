'use client';

import dayGridPlugin from '@fullcalendar/daygrid';
import type { EventContentArg, EventInput } from '@fullcalendar/core';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Heading,
  HStack,
  Icon,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Spinner,
  Text,
  useDisclosure,
  VStack,
} from '@chakra-ui/react';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { MdLaunch, MdSchedule } from 'react-icons/md';
import { attendanceService, type Attendance } from '@/services/attendanceService';
import type {
  Meeting,
  MeetingDuration,
  MeetingStatus,
  MeetingType,
} from '@/services/meetingService';

export interface MeetingCalendarLabels {
  users: Record<string, string>;
  skills: Record<string, string>;
  stages: Record<string, string>;
  lessons: Record<string, string>;
}

const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  CONTENT: 'Conteúdo',
  PRACTICAL: 'Prática',
  ASSESSMENT: 'Avaliação',
};

const MEETING_TYPE_COLORS: Record<MeetingType, { background: string; border: string }> = {
  CONTENT: { background: '#B45309', border: '#92400E' },
  PRACTICAL: { background: '#2F855A', border: '#276749' },
  ASSESSMENT: { background: '#805AD5', border: '#6B46C1' },
};

const MEETING_TYPE_SCHEMES: Record<MeetingType, string> = {
  CONTENT: 'orange',
  PRACTICAL: 'green',
  ASSESSMENT: 'purple',
};

const STATUS_LABELS: Record<MeetingStatus, string> = {
  SCHEDULED: 'Agendado',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluído',
  CANCELED: 'Cancelado',
};

const STATUS_SCHEMES: Record<MeetingStatus, string> = {
  SCHEDULED: 'blue',
  IN_PROGRESS: 'green',
  COMPLETED: 'gray',
  CANCELED: 'red',
};

const DURATION_LABELS: Record<MeetingDuration, string> = {
  MINUTES_15: '15 minutos',
  MINUTES_30: '30 minutos',
  MINUTES_45: '45 minutos',
  MINUTES_60: '60 minutos',
};

const DURATION_IN_MINUTES: Record<MeetingDuration, number> = {
  MINUTES_15: 15,
  MINUTES_30: 30,
  MINUTES_45: 45,
  MINUTES_60: 60,
};

const resolveMeetingId = (meeting: Meeting, index: number) =>
  meeting.id ?? meeting.meetingId ?? meeting.uuid ?? `meeting-${index}`;

const getMeetingTypeLabel = (type: MeetingType) => MEETING_TYPE_LABELS[type] ?? type;

const getMeetingColors = (type: MeetingType) =>
  MEETING_TYPE_COLORS[type] ?? { background: '#4A5568', border: '#2D3748' };

const getMeetingEnd = (meeting: Meeting) => {
  if (!meeting.duration) return undefined;

  const start = new Date(meeting.scheduledStart);
  if (Number.isNaN(start.getTime())) return undefined;

  return new Date(
    start.getTime() + DURATION_IN_MINUTES[meeting.duration] * 60_000
  ).toISOString();
};

const getLocalTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatLocalDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

const resolveLabel = (
  catalog: Record<string, string>,
  id: string | number | null | undefined,
  emptyLabel: string,
  missingLabel: string
) => {
  if (id === null || id === undefined || id === '') return emptyLabel;
  return catalog[String(id)] || missingLabel;
};

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box>
      <Text color="gray.500" fontSize="xs" fontWeight="semibold" textTransform="uppercase">
        {label}
      </Text>
      <Box color="gray.700" fontSize="sm" mt={1}>{value}</Box>
    </Box>
  );
}

function CalendarEvent({
  event,
  labels,
}: Pick<EventContentArg, 'event'> & { labels: MeetingCalendarLabels }) {
  const meeting = event.extendedProps.meeting as Meeting;
  const stageName = resolveLabel(labels.stages, meeting.stageId, 'Todos', 'Stage não identificado');
  const lessonTitle = resolveLabel(labels.lessons, meeting.lessonId, 'Sem lesson', 'Lesson não identificada');

  return (
    <Box className="duma-calendar-event-content">
      <Icon as={MdSchedule} aria-hidden boxSize="12px" flexShrink={0} />
      <Text as="span" className="duma-calendar-event-time">
        {getLocalTime(meeting.scheduledStart)}
      </Text>
      <Box className="duma-calendar-event-reference">
        <Text as="span" className="duma-calendar-event-stage">{stageName}</Text>
        <Text as="span" className="duma-calendar-event-separator" aria-hidden>-</Text>
        <Text as="span" className="duma-calendar-event-lesson">{lessonTitle}</Text>
      </Box>
    </Box>
  );
}

export function MeetingsCalendar({
  meetings,
  labels,
  unavailable = false,
}: {
  meetings: Meeting[];
  labels: MeetingCalendarLabels;
  unavailable?: boolean;
}) {
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [isLoadingAttendances, setIsLoadingAttendances] = useState(false);
  const [attendanceLoadFailed, setAttendanceLoadFailed] = useState(false);
  const attendanceRequestRef = useRef(0);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const events = useMemo<EventInput[]>(() => meetings.map((meeting, index) => {
    const colors = getMeetingColors(meeting.meetingType);

    return {
      id: String(resolveMeetingId(meeting, index)),
      title: meeting.title,
      start: meeting.scheduledStart,
      end: getMeetingEnd(meeting),
      backgroundColor: colors.background,
      borderColor: colors.border,
      textColor: '#FFFFFF',
      display: 'block',
      extendedProps: { meeting },
    };
  }), [meetings]);

  const loadAttendances = async (meeting: Meeting) => {
    const meetingId = meeting.id ?? meeting.meetingId ?? meeting.uuid;
    const requestId = ++attendanceRequestRef.current;

    setAttendances([]);
    setIsLoadingAttendances(false);
    setAttendanceLoadFailed(false);

    if (!meetingId) {
      setAttendanceLoadFailed(true);
      return;
    }

    setIsLoadingAttendances(true);
    try {
      const meetingAttendances = await attendanceService.getByMeetingId(String(meetingId));
      if (attendanceRequestRef.current === requestId) {
        setAttendances(meetingAttendances.filter((attendance) => attendance.status));
      }
    } catch {
      if (attendanceRequestRef.current === requestId) {
        setAttendanceLoadFailed(true);
      }
    } finally {
      if (attendanceRequestRef.current === requestId) {
        setIsLoadingAttendances(false);
      }
    }
  };

  const handleClose = () => {
    attendanceRequestRef.current += 1;
    onClose();
    setSelectedMeeting(null);
    setAttendances([]);
    setIsLoadingAttendances(false);
    setAttendanceLoadFailed(false);
  };

  return (
    <Box bg="white" borderRadius="md" boxShadow="sm" p={{ base: 3, md: 5 }}>
      <VStack align="stretch" spacing={4}>
        <Flex gap={4} justify="space-between" align={{ base: 'flex-start', md: 'center' }} direction={{ base: 'column', md: 'row' }}>
          <Box>
            <Heading size="sm" color="gray.700">Agenda de encontros</Heading>
            <Text mt={1} fontSize="sm" color="gray.500">
              Encontros agendados, em andamento, concluídos e cancelados.
            </Text>
          </Box>
          <HStack spacing={3} flexWrap="wrap">
            {(Object.keys(MEETING_TYPE_LABELS) as MeetingType[]).map((type) => (
              <HStack key={type} spacing={1.5}>
                <Box boxSize="10px" borderRadius="full" bg={getMeetingColors(type).background} />
                <Text fontSize="xs" color="gray.600">{MEETING_TYPE_LABELS[type]}</Text>
              </HStack>
            ))}
          </HStack>
        </Flex>

        {unavailable ? (
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            Não foi possível carregar os encontros. Os demais dados da dashboard continuam disponíveis.
          </Alert>
        ) : (
          <Box className="dashboard-meeting-calendar" overflowX="auto">
            <Box minW={{ base: '700px', lg: 'auto' }}>
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin]}
                initialView="dayGridMonth"
                locale={ptBrLocale}
                firstDay={0}
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek',
                }}
                buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana' }}
                events={events}
                eventContent={(eventInfo) => (
                  <CalendarEvent event={eventInfo.event} labels={labels} />
                )}
                eventClassNames={(eventInfo) => {
                  const meeting = eventInfo.event.extendedProps.meeting as Meeting;
                  return [
                    meeting.status === 'IN_PROGRESS' ? 'duma-calendar-event-in-progress' : '',
                    meeting.status === 'CANCELED' ? 'duma-calendar-event-canceled' : '',
                  ].filter(Boolean);
                }}
                eventClick={(eventInfo) => {
                  const meeting = eventInfo.event.extendedProps.meeting as Meeting;
                  setSelectedMeeting(meeting);
                  onOpen();
                  void loadAttendances(meeting);
                }}
                dayMaxEvents
                displayEventTime={false}
                fixedWeekCount={false}
                height="auto"
                allDaySlot={false}
                nowIndicator
                scrollTime="08:00:00"
                slotMinTime="06:00:00"
                slotMaxTime="23:00:00"
              />
            </Box>
          </Box>
        )}
      </VStack>

      <Modal isOpen={isOpen} onClose={handleClose} size="lg" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader pr={12}>{selectedMeeting?.title || 'Detalhes do encontro'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedMeeting ? (
              <VStack align="stretch" spacing={5}>
                <HStack spacing={2} flexWrap="wrap">
                  <Badge colorScheme={MEETING_TYPE_SCHEMES[selectedMeeting.meetingType] ?? 'gray'}>
                    {getMeetingTypeLabel(selectedMeeting.meetingType)}
                  </Badge>
                  <Badge colorScheme={STATUS_SCHEMES[selectedMeeting.status] ?? 'gray'}>
                    {STATUS_LABELS[selectedMeeting.status] ?? selectedMeeting.status}
                  </Badge>
                </HStack>

                {selectedMeeting.description ? (
                  <Text color="gray.600">{selectedMeeting.description}</Text>
                ) : null}

                <Divider />

                <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={5}>
                  <DetailItem label="Início" value={formatLocalDateTime(selectedMeeting.scheduledStart)} />
                  <DetailItem
                    label="Duração"
                    value={selectedMeeting.duration ? DURATION_LABELS[selectedMeeting.duration] : 'Não definida'}
                  />
                  <DetailItem label="Tutor" value={resolveLabel(labels.users, selectedMeeting.teacherId, '—', 'Não identificado')} />
                  <DetailItem
                    label="Skill"
                    value={resolveLabel(labels.skills, selectedMeeting.skillId, '—', 'Não identificada')}
                  />
                  <DetailItem
                    label="Stage"
                    value={resolveLabel(labels.stages, selectedMeeting.stageId, 'Todos', 'Não identificado')}
                  />
                  <DetailItem
                    label="Lesson"
                    value={resolveLabel(labels.lessons, selectedMeeting.lessonId, '—', 'Não identificada')}
                  />
                </SimpleGrid>

                <DetailItem
                  label="Alunos presentes"
                  value={isLoadingAttendances ? (
                    <HStack spacing={2} color="gray.500">
                      <Spinner size="sm" />
                      <Text>Carregando presenças...</Text>
                    </HStack>
                  ) : attendanceLoadFailed ? (
                    <Text color="red.500">Não foi possível carregar as presenças.</Text>
                  ) : attendances.length === 0 ? (
                    <Text color="gray.500">Nenhuma presença registrada</Text>
                  ) : (
                    <VStack align="stretch" spacing={1}>
                      {attendances.map((attendance) => (
                        <Text key={attendance.id}>
                          {resolveLabel(
                            labels.users,
                            attendance.studentId,
                            '—',
                            attendance.studentId
                          )}
                        </Text>
                      ))}
                    </VStack>
                  )}
                />

                {selectedMeeting.recordingUrl ? (
                  <Link href={selectedMeeting.recordingUrl} isExternal color="primary.600" fontWeight="semibold">
                    Abrir gravação
                  </Link>
                ) : null}
              </VStack>
            ) : null}
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={handleClose}>Fechar</Button>
            {selectedMeeting?.meetingUrl && selectedMeeting.status !== 'COMPLETED' ? (
              <Button
                as="a"
                href={selectedMeeting.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                colorScheme="primary"
                rightIcon={<MdLaunch />}
              >
                Abrir encontro
              </Button>
            ) : null}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
