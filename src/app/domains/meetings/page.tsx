'use client'

import React, { useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Icon,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Tag,
  TagCloseButton,
  TagLabel,
  Text,
  Textarea,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { MdAdd, MdClose, MdFilterList, MdGroups } from 'react-icons/md';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/DataTable';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { meetingService, Meeting, MeetingPayload, MeetingStatus, MeetingType } from '@/services/meetingService';
import { userService, User } from '@/services/userService';
import { skillService, Skill } from '@/services/skillService';
import { stageService, Stage } from '@/services/stageService';
import { lessonService, Lesson } from '@/services/lessonService';
import { planService, Plan } from '@/services/planService';

const STATUS_COLORS: Record<MeetingStatus, string> = {
  SCHEDULED: 'blue',
  IN_PROGRESS: 'green',
  COMPLETED: 'gray',
  CANCELED: 'red',
};

const STATUS_LABELS: Record<MeetingStatus, string> = {
  SCHEDULED: 'Agendado',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluído',
  CANCELED: 'Cancelado',
};

const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  PRACTICAL: 'Prática',
  CONTENT: 'Conteúdo',
  ASSESSMENT: 'Avaliação',
};

type MeetingFormState = {
  title: string;
  description: string;
  teacherId: string;
  meetingType: MeetingType;
  skillId: string;
  stageId: string;
  lessonId: string;
  planId: string;
  scheduledStart: string;
  meetingUrl: string;
  recordingUrl: string;
  status: MeetingStatus;
};

const INITIAL_FORM: MeetingFormState = {
  title: '',
  description: '',
  teacherId: '',
  meetingType: 'CONTENT',
  skillId: '',
  stageId: '',
  lessonId: '',
  planId: '',
  scheduledStart: '',
  meetingUrl: '',
  recordingUrl: '',
  status: 'SCHEDULED',
};

type FilterState = {
  skillId: string;
  stageId: string;
  lessonId: string;
  planId: string;
};

type BatchFrequency = 'DAILY' | 'WEEKLY';

type BatchFormState = {
  baseMeeting: MeetingFormState;
  frequency: BatchFrequency;
  occurrences: string;
};

const INITIAL_FILTERS: FilterState = {
  skillId: '',
  stageId: '',
  lessonId: '',
  planId: '',
};

const INITIAL_BATCH_FORM: BatchFormState = {
  baseMeeting: { ...INITIAL_FORM },
  frequency: 'DAILY',
  occurrences: '2',
};

type MeetingRow = Meeting & { id: string | number };

const resolveMeetingId = (meeting?: Partial<Meeting> | null) => {
  if (!meeting) return undefined;
  return meeting.id ?? meeting.meetingId ?? meeting.uuid;
};

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<MeetingRow | null>(null);
  const [meetingToDelete, setMeetingToDelete] = useState<MeetingRow | null>(null);
  const [formData, setFormData] = useState<MeetingFormState>(INITIAL_FORM);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [batchFormData, setBatchFormData] = useState<BatchFormState>(INITIAL_BATCH_FORM);

  const { isOpen: isFormOpen, onOpen: onFormOpen, onClose: onFormClose } = useDisclosure();
  const { isOpen: isBatchOpen, onOpen: onBatchOpen, onClose: onBatchClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const toast = useToast();

  const loadData = async () => {
    try {
      const [meetingsResult, usersResult, skillsResult, stagesResult, lessonsResult, plansResult] = await Promise.allSettled([
        meetingService.getAll(),
        userService.getAll(),
        skillService.getAll(),
        stageService.getAll(),
        lessonService.getAll(),
        planService.getAll(),
      ]);
      const meetingsData = meetingsResult.status === 'fulfilled' ? meetingsResult.value : [];
      setMeetings(
        meetingsData.map((meeting, index) => ({
          ...meeting,
          id: resolveMeetingId(meeting) ?? `meeting-row-${index}`,
        }))
      );
      setUsers(usersResult.status     === 'fulfilled' ? usersResult.value   : []);
      setSkills(skillsResult.status   === 'fulfilled' ? skillsResult.value  : []);
      setStages(stagesResult.status   === 'fulfilled' ? stagesResult.value  : []);
      setLessons(lessonsResult.status === 'fulfilled' ? lessonsResult.value : []);
      setPlans(plansResult.status     === 'fulfilled' ? plansResult.value   : []);
    } catch {
      toast({ title: 'Erro ao carregar encontros', status: 'error' });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const hasActiveFilters = !!filters.skillId || !!filters.stageId || !!filters.lessonId || !!filters.planId;

  const filteredMeetings = meetings.filter((meeting) => {
    const matchSkill = !filters.skillId || String(meeting.skillId) === filters.skillId;
    const matchStage = !filters.stageId || String(meeting.stageId) === filters.stageId;
    const matchLesson = !filters.lessonId || String(meeting.lessonId) === filters.lessonId;
    const matchPlan = !filters.planId || String(meeting.planId) === filters.planId;
    return matchSkill && matchStage && matchLesson && matchPlan;
  });

  const getUserLabel = (userId: string) => {
    const user = users.find((item) => item.id === userId);
    if (!user) return userId;
    return user.name || user.email;
  };

  const getTeacherLabel = (teacherId: string) => {
    return getUserLabel(teacherId);
  };

  const getSkillLabel = (skillId: number) =>
    skills.find((item) => item.id === skillId)?.name || skillId;

  const getStageLabel = (stageId: number) =>
    stages.find((item) => item.id === stageId)?.name || stageId;

  const getLessonLabel = (lessonId: number | string) =>
    lessons.find((item) => String(item.id) === String(lessonId))?.title || lessonId;

  const getPlanLabel = (planId: number) =>
    plans.find((item) => Number(item.id) === planId)?.nome || planId;

  const formatDateTimeForInput = (value?: string) => {
    if (!value) return '';
    return value.slice(0, 16);
  };

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString('pt-BR');

  const normalizeLessonId = (value: string) => {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  };

  const buildPayload = (data: MeetingFormState): MeetingPayload => ({
    title: data.title.trim(),
    description: data.description.trim() || undefined,
    teacherId: data.teacherId,
    meetingType: data.meetingType,
    skillId: Number(data.skillId),
    stageId: Number(data.stageId),
    lessonId: normalizeLessonId(data.lessonId),
    planId: Number(data.planId),
    scheduledStart: data.scheduledStart,
    meetingUrl: data.meetingUrl.trim() || undefined,
    recordingUrl: data.recordingUrl.trim() || undefined,
    status: data.status,
  });

  const addDaysToLocalDateTime = (value: string, daysToAdd: number) => {
    const baseDate = new Date(value);
    baseDate.setDate(baseDate.getDate() + daysToAdd);
    const timezoneOffset = baseDate.getTimezoneOffset();
    const localDate = new Date(baseDate.getTime() - timezoneOffset * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
  };

  const validateForm = (data: MeetingFormState) => {
    if (!data.title.trim()) return 'Título é obrigatório';
    if (!data.teacherId) return 'Tutor é obrigatório';
    if (!data.skillId) return 'Skill é obrigatória';
    if (!data.stageId) return 'Stage é obrigatória';
    if (!data.lessonId) return 'Lesson é obrigatória';
    if (!data.planId) return 'Plan é obrigatório';
    if (!data.scheduledStart) return 'Data e hora são obrigatórias';
    if (!data.meetingUrl.trim()) return 'URL da reunião é obrigatória';
    return null;
  };

  const handleOpenForm = (meeting?: MeetingRow) => {
    if (meeting) {
      const resolvedId = resolveMeetingId(meeting);
      if (!resolvedId) {
        toast({ title: 'Meeting sem identificador para edição', status: 'error' });
        return;
      }
      setEditingMeeting(meeting);
      setFormData({
        title: meeting.title || '',
        description: meeting.description || '',
        teacherId: meeting.teacherId || '',
        meetingType: meeting.meetingType || 'CONTENT',
        skillId: String(meeting.skillId || ''),
        stageId: String(meeting.stageId || ''),
        lessonId: String(meeting.lessonId || ''),
        planId: String(meeting.planId || ''),
        scheduledStart: formatDateTimeForInput(meeting.scheduledStart),
        meetingUrl: meeting.meetingUrl || '',
        recordingUrl: meeting.recordingUrl || '',
        status: meeting.status || 'SCHEDULED',
      });
    } else {
      setEditingMeeting(null);
      setFormData(INITIAL_FORM);
    }
    onFormOpen();
  };

  const handleSave = async () => {
    const validationError = validateForm(formData);
    if (validationError) {
      toast({ title: validationError, status: 'warning' });
      return;
    }

    setIsLoading(true);
    try {
      const payload = buildPayload(formData);

      if (editingMeeting) {
        const meetingId = resolveMeetingId(editingMeeting);
        if (!meetingId) {
          toast({ title: 'Meeting sem identificador para atualização', status: 'error' });
          return;
        }
        await meetingService.update(meetingId, payload);
        toast({ title: 'Encontro atualizado com sucesso', status: 'success' });
      } else {
        await meetingService.create(payload);
        toast({ title: 'Encontro criado com sucesso', status: 'success' });
      }

      onFormClose();
      loadData();
    } catch {
      toast({ title: 'Erro ao salvar encontro', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!meetingToDelete) return;

    setIsLoading(true);
    try {
      const meetingId = resolveMeetingId(meetingToDelete);
      if (!meetingId) {
        toast({ title: 'Meeting sem identificador para exclusão', status: 'error' });
        return;
      }
      await meetingService.delete(meetingId);
      toast({ title: 'Encontro excluído com sucesso', status: 'success' });
      onDeleteClose();
      loadData();
    } catch {
      toast({ title: 'Erro ao excluir encontro', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenBatch = () => {
    setBatchFormData({
      ...INITIAL_BATCH_FORM,
      baseMeeting: { ...INITIAL_FORM },
    });
    onBatchOpen();
  };

  const handleBatchMeetingChange = (field: keyof MeetingFormState, value: string) => {
    setBatchFormData((current) => ({
      ...current,
      baseMeeting: {
        ...current.baseMeeting,
        [field]: value,
      },
    }));
  };

  const handleSaveBatch = async () => {
    const validationError = validateForm(batchFormData.baseMeeting);
    if (validationError) {
      toast({ title: validationError, status: 'warning' });
      return;
    }

    const occurrences = Number(batchFormData.occurrences);
    if (!Number.isInteger(occurrences) || occurrences < 2) {
      toast({ title: 'Informe ao menos 2 ocorrências', status: 'warning' });
      return;
    }

    setIsLoading(true);
    try {
      const intervalDays = batchFormData.frequency === 'DAILY' ? 1 : 7;
      const meetingsToCreate = Array.from({ length: occurrences }, (_, index) => {
        const scheduledStart = addDaysToLocalDateTime(
          batchFormData.baseMeeting.scheduledStart,
          intervalDays * index
        );

        return buildPayload({
          ...batchFormData.baseMeeting,
          scheduledStart,
        });
      });

      await meetingService.createBatch(meetingsToCreate);
      toast({ title: 'Encontros criados em lote com sucesso', status: 'success' });
      onBatchClose();
      loadData();
    } catch {
      toast({ title: 'Erro ao criar encontros em lote', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    { key: 'title', header: 'Título' },
    { key: 'description', header: 'Descrição', render: (item: Meeting) => item.description || '—' },
    { key: 'teacherId', header: 'Tutor', render: (item: Meeting) => getTeacherLabel(item.teacherId) },
    { key: 'meetingType', header: 'Tipo', render: (item: Meeting) => MEETING_TYPE_LABELS[item.meetingType] || item.meetingType },
    { key: 'skillId', header: 'Skill', render: (item: Meeting) => getSkillLabel(item.skillId) },
    { key: 'stageId', header: 'Stage', render: (item: Meeting) => getStageLabel(item.stageId) },
    { key: 'lessonId', header: 'Lesson', render: (item: Meeting) => getLessonLabel(item.lessonId) },
    { key: 'planId', header: 'Plan', render: (item: Meeting) => getPlanLabel(item.planId) },
    { key: 'meetingUrl', header: 'Meeting URL', render: (item: Meeting) => item.meetingUrl || '—' },
    { key: 'recordingUrl', header: 'Recording URL', render: (item: Meeting) => item.recordingUrl || '—' },
    { key: 'scheduledStart', header: 'Início', render: (item: Meeting) => formatDateTime(item.scheduledStart) },
    {
      key: 'status',
      header: 'Status',
      render: (item: Meeting) => (
        <Badge colorScheme={STATUS_COLORS[item.status]} fontSize="xs">
          {STATUS_LABELS[item.status]}
        </Badge>
      ),
    },
  ];

  const renderMeetingFields = (
    data: MeetingFormState,
    onChange: (field: keyof MeetingFormState, value: string) => void
  ) => (
    <VStack spacing={4} align="stretch">
      <HStack spacing={4} align="flex-start">
        <FormControl isRequired>
          <FormLabel>Título</FormLabel>
          <Input
            value={data.title}
            onChange={(e) => onChange('title', e.target.value)}
            placeholder="Ex: Java Basics"
          />
        </FormControl>
        <FormControl isRequired>
          <FormLabel>Tutor</FormLabel>
          <Select
            placeholder="Selecione o tutor"
            value={data.teacherId}
            onChange={(e) => onChange('teacherId', e.target.value)}
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {getUserLabel(user.id)}
              </option>
            ))}
          </Select>
        </FormControl>
      </HStack>

      <HStack spacing={4} align="flex-start">
        <FormControl>
          <FormLabel>Descrição</FormLabel>
          <Textarea
            value={data.description}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder="Ex: Turma A"
          />
        </FormControl>
        <FormControl isRequired>
          <FormLabel>Tipo</FormLabel>
          <Select
            value={data.meetingType}
            onChange={(e) => onChange('meetingType', e.target.value)}
          >
            {Object.entries(MEETING_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FormControl>
      </HStack>

      <HStack spacing={4} align="flex-start">
        <FormControl isRequired>
          <FormLabel>Skill</FormLabel>
          <Select
            placeholder="Selecione a skill"
            value={data.skillId}
            onChange={(e) => onChange('skillId', e.target.value)}
          >
            {skills.map((skill) => (
              <option key={skill.id} value={String(skill.id)}>
                {skill.name}
              </option>
            ))}
          </Select>
        </FormControl>
        <FormControl isRequired>
          <FormLabel>Stage</FormLabel>
          <Select
            placeholder="Selecione a stage"
            value={data.stageId}
            onChange={(e) => onChange('stageId', e.target.value)}
          >
            {stages.map((stage) => (
              <option key={stage.id} value={String(stage.id)}>
                {stage.name}
              </option>
            ))}
          </Select>
        </FormControl>
      </HStack>

      <HStack spacing={4} align="flex-start">
        <FormControl isRequired>
          <FormLabel>Lesson</FormLabel>
          <Select
            placeholder="Selecione a lesson"
            value={data.lessonId}
            onChange={(e) => onChange('lessonId', e.target.value)}
          >
            {lessons.map((lesson) => (
              <option key={lesson.id} value={String(lesson.id)}>
                {lesson.title}
              </option>
            ))}
          </Select>
        </FormControl>
        <FormControl isRequired>
          <FormLabel>Plan</FormLabel>
          <Select
            placeholder="Selecione o plan"
            value={data.planId}
            onChange={(e) => onChange('planId', e.target.value)}
          >
            {plans.map((plan) => (
              <option key={plan.id} value={String(plan.id)}>
                {plan.nome}
              </option>
            ))}
          </Select>
        </FormControl>
      </HStack>

      <HStack spacing={4} align="flex-start">
        <FormControl isRequired>
          <FormLabel>Data e hora</FormLabel>
          <Input
            type="datetime-local"
            value={data.scheduledStart}
            onChange={(e) => onChange('scheduledStart', e.target.value)}
          />
        </FormControl>
        <FormControl isRequired>
          <FormLabel>Status</FormLabel>
          <Select
            value={data.status}
            onChange={(e) => onChange('status', e.target.value)}
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FormControl>
      </HStack>

      <FormControl isRequired>
        <FormLabel>URL da reunião</FormLabel>
        <Input
          value={data.meetingUrl}
          onChange={(e) => onChange('meetingUrl', e.target.value)}
          placeholder="https://example.com/meeting/1"
        />
      </FormControl>

      <FormControl>
        <FormLabel>URL da gravação</FormLabel>
        <Input
          value={data.recordingUrl}
          onChange={(e) => onChange('recordingUrl', e.target.value)}
          placeholder="https://example.com/recording/1"
        />
      </FormControl>
    </VStack>
  );

  return (
    <DashboardLayout>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg" color="gray.700">Encontros</Heading>
        <HStack spacing={3}>
          <Button leftIcon={<Icon as={MdGroups} />} variant="outline" onClick={handleOpenBatch}>
            Criar em lote
          </Button>
          <Button leftIcon={<Icon as={MdAdd} />} colorScheme="primary" onClick={() => handleOpenForm()}>
            Novo Encontro
          </Button>
        </HStack>
      </Flex>

      <Box bg="white" borderRadius="lg" boxShadow="sm" p={4} mb={4}>
        <Flex align="center" gap={2} mb={3}>
          <Icon as={MdFilterList} color="gray.500" />
          <Text fontWeight="medium" fontSize="sm" color="gray.600">Filtros</Text>
          {hasActiveFilters && (
            <Button size="xs" variant="ghost" colorScheme="red" leftIcon={<Icon as={MdClose} />} onClick={() => setFilters(INITIAL_FILTERS)}>
              Limpar filtros
            </Button>
          )}
        </Flex>

        <HStack spacing={3} flexWrap="wrap">
          <Select
            size="sm"
            maxW="220px"
            placeholder="Todas as skills"
            value={filters.skillId}
            onChange={(e) => setFilters({ ...filters, skillId: e.target.value })}
          >
            {skills.map((skill) => (
              <option key={skill.id} value={String(skill.id)}>
                {skill.name}
              </option>
            ))}
          </Select>

          <Select
            size="sm"
            maxW="220px"
            placeholder="Todas as stages"
            value={filters.stageId}
            onChange={(e) => setFilters({ ...filters, stageId: e.target.value })}
          >
            {stages.map((stage) => (
              <option key={stage.id} value={String(stage.id)}>
                {stage.name}
              </option>
            ))}
          </Select>

          <Select
            size="sm"
            maxW="220px"
            placeholder="Todas as lessons"
            value={filters.lessonId}
            onChange={(e) => setFilters({ ...filters, lessonId: e.target.value })}
          >
            {lessons.map((lesson) => (
              <option key={lesson.id} value={String(lesson.id)}>
                {lesson.title}
              </option>
            ))}
          </Select>

          <Select
            size="sm"
            maxW="220px"
            placeholder="Todos os plans"
            value={filters.planId}
            onChange={(e) => setFilters({ ...filters, planId: e.target.value })}
          >
            {plans.map((plan) => (
              <option key={plan.id} value={String(plan.id)}>
                {plan.nome}
              </option>
            ))}
          </Select>
        </HStack>

        {hasActiveFilters && (
          <HStack mt={3} spacing={2} flexWrap="wrap">
            {filters.skillId && (
              <Tag size="sm" colorScheme="blue" borderRadius="full">
                <TagLabel>Skill: {getSkillLabel(Number(filters.skillId))}</TagLabel>
                <TagCloseButton onClick={() => setFilters({ ...filters, skillId: '' })} />
              </Tag>
            )}
            {filters.stageId && (
              <Tag size="sm" colorScheme="blue" borderRadius="full">
                <TagLabel>Stage: {getStageLabel(Number(filters.stageId))}</TagLabel>
                <TagCloseButton onClick={() => setFilters({ ...filters, stageId: '' })} />
              </Tag>
            )}
            {filters.lessonId && (
              <Tag size="sm" colorScheme="blue" borderRadius="full">
                <TagLabel>Lesson: {getLessonLabel(filters.lessonId)}</TagLabel>
                <TagCloseButton onClick={() => setFilters({ ...filters, lessonId: '' })} />
              </Tag>
            )}
            {filters.planId && (
              <Tag size="sm" colorScheme="blue" borderRadius="full">
                <TagLabel>Plan: {getPlanLabel(Number(filters.planId))}</TagLabel>
                <TagCloseButton onClick={() => setFilters({ ...filters, planId: '' })} />
              </Tag>
            )}
          </HStack>
        )}
      </Box>

      <DataTable
        columns={columns}
        data={filteredMeetings}
        onEdit={(meeting) => handleOpenForm(meeting)}
        onDelete={(meeting) => {
          setMeetingToDelete(meeting);
          onDeleteOpen();
        }}
      />

      <Modal isOpen={isFormOpen} onClose={onFormClose} size="2xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingMeeting ? 'Editar Encontro' : 'Novo Encontro'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {renderMeetingFields(formData, (field, value) => setFormData({ ...formData, [field]: value }))}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onFormClose} isDisabled={isLoading}>Cancelar</Button>
            <Button colorScheme="primary" onClick={handleSave} isLoading={isLoading}>Salvar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isBatchOpen} onClose={onBatchClose} size="3xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Criar Encontros em Lote</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={5} align="stretch">
              <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p={4}>
                <Text fontWeight="semibold" mb={4}>Encontro base</Text>
                {renderMeetingFields(batchFormData.baseMeeting, handleBatchMeetingChange)}
              </Box>

              <Divider />

              <HStack spacing={4} align="flex-start">
                <FormControl isRequired>
                  <FormLabel>Periodicidade</FormLabel>
                  <Select
                    value={batchFormData.frequency}
                    onChange={(e) => setBatchFormData({ ...batchFormData, frequency: e.target.value as BatchFrequency })}
                  >
                    <option value="DAILY">Diário</option>
                    <option value="WEEKLY">Semanal</option>
                  </Select>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Quantidade de ocorrências</FormLabel>
                  <Input
                    type="number"
                    min={2}
                    value={batchFormData.occurrences}
                    onChange={(e) => setBatchFormData({ ...batchFormData, occurrences: e.target.value })}
                  />
                </FormControl>
              </HStack>

              <Text fontSize="sm" color="gray.500">
                O sistema replica o encontro base mantendo os mesmos dados e ajustando apenas a data conforme a periodicidade escolhida.
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onBatchClose} isDisabled={isLoading}>Cancelar</Button>
            <Button colorScheme="primary" onClick={handleSaveBatch} isLoading={isLoading}>Criar lote</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ConfirmDeleteModal
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        onConfirm={handleDelete}
        isLoading={isLoading}
        title="Excluir Encontro"
      />
    </DashboardLayout>
  );
}
