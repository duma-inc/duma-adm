'use client'

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  Badge,
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
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
  Stack,
  Text,
  Textarea,
  VStack,
  Wrap,
  WrapItem,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { MdRateReview } from 'react-icons/md';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/DataTable';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { attemptService, Attempt, AttemptPayload } from '@/services/attemptService';
import { exerciseService, Exercise, ExerciseType } from '@/services/exerciseService';
import { lessonService, Lesson } from '@/services/lessonService';
import { userService, User } from '@/services/userService';

const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  MULTIPLE_CHOICE: 'Múltipla escolha',
  TRUE_FALSE: 'Verdadeiro/Falso',
  TRANSLATION: 'Tradução',
  FILL_IN_THE_BLANK: 'Preencher lacuna',
  MATCHING: 'Associação',
  SHORT_ANSWER: 'Resposta curta',
  ESSAY: 'Dissertativa',
};

const DEFAULT_FILTER_TYPES: ExerciseType[] = ['SHORT_ANSWER', 'ESSAY'];

const INITIAL_FORM = {
  studentId: '',
  lessonId: '',
  exerciseId: '',
  answerGiven: '',
  isCorrect: '',
  score: '',
  timeSpentSeconds: '',
  feedback: '',
  correctionStatus: 'NOT_APPLICABLE',
};

type AttemptRow = Attempt & {
  id: string;
  attemptId?: number | string;
  studentLabel: string;
  lessonLabel: string;
  exerciseLabel: string;
  exerciseType: string;
  answerPreview: string;
  correctnessLabel: string;
  createdAtLabel: string;
};

const formatDate = (dateValue?: string) => {
  if (!dateValue) return '—';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleString('pt-BR');
};

const toBooleanValue = (value: string) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};

export default function DeliveriesPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<ExerciseType[]>(DEFAULT_FILTER_TYPES);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [editingAttempt, setEditingAttempt] = useState<AttemptRow | null>(null);
  const [attemptToDelete, setAttemptToDelete] = useState<AttemptRow | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { isOpen: isFormOpen, onOpen: onFormOpen, onClose: onFormClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const toast = useToast();
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, []);  // toastRef evita loop infinito

  const loadAll = useCallback(async () => {
    try {
      const [attemptsRes, exercisesRes, lessonsRes, usersRes] = await Promise.allSettled([
        attemptService.getAll(),
        exerciseService.getAll(),
        lessonService.getAll(),
        userService.getAll(),
      ]);

      setAttempts(attemptsRes.status === 'fulfilled' ? attemptsRes.value : []);
      setExercises(exercisesRes.status === 'fulfilled' ? exercisesRes.value : []);
      setLessons(lessonsRes.status === 'fulfilled' ? lessonsRes.value : []);
      setUsers(usersRes.status === 'fulfilled' ? usersRes.value : []);
    } catch {
      toastRef.current({ title: 'Erro ao carregar entregas', status: 'error' });
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const exerciseById = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises],
  );

  const lessonById = useMemo(
    () => new Map(lessons.map((lesson) => [lesson.id, lesson])),
    [lessons],
  );

  const userById = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  );

  const rows = useMemo<AttemptRow[]>(() => {
    return attempts.map((attempt, index) => {
      const exercise = attempt.exerciseId ? exerciseById.get(attempt.exerciseId) : undefined;
      const lesson = attempt.lessonId ? lessonById.get(attempt.lessonId) : undefined;
      const user = attempt.studentId ? userById.get(attempt.studentId) : undefined;
      const answerPreview = attempt.answerGiven?.trim()
        ? attempt.answerGiven.trim()
        : 'Sem resposta';

      return {
        ...attempt,
        id: String(attempt.id ?? `${attempt.studentId || 'student'}-${attempt.exerciseId || 'exercise'}-${attempt.createdAt || index}`),
        attemptId: attempt.id,
        studentLabel: user ? `${user.name || user.email}` : attempt.studentId || 'Aluno não encontrado',
        lessonLabel: lesson?.title || attempt.lessonId || 'Lição não encontrada',
        exerciseLabel: exercise?.description || attempt.exerciseId || 'Exercício não encontrado',
        exerciseType: exercise?.type || '—',
        answerPreview,
        correctnessLabel:
          attempt.isCorrect === true ? 'Correta' : attempt.isCorrect === false ? 'Incorreta' : 'Não avaliada',
        createdAtLabel: formatDate(attempt.createdAt),
      };
    });
  }, [attempts, exerciseById, lessonById, userById]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return rows.filter((row) => {
      const exercise = row.exerciseId ? exerciseById.get(row.exerciseId) : undefined;
      const matchesType = selectedTypes.length === 0 || (exercise?.type ? selectedTypes.includes(exercise.type) : false);

      if (!matchesType) return false;
      if (!normalizedSearch) return true;

      const haystack = [
        row.studentLabel,
        row.lessonLabel,
        row.exerciseLabel,
        row.answerPreview,
        row.exerciseType,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [exerciseById, rows, search, selectedTypes]);

  const exerciseOptions = useMemo(() => {
    return [...exercises].sort((a, b) => a.description.localeCompare(b.description));
  }, [exercises]);

  const lessonOptions = useMemo(() => {
    return [...lessons].sort((a, b) => a.title.localeCompare(b.title));
  }, [lessons]);

  const userOptions = useMemo(() => {
    return [...users].sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
  }, [users]);

  const selectedExercise = formData.exerciseId ? exerciseById.get(formData.exerciseId) : undefined;

  const exercisesForForm = useMemo(() => {
    return exerciseOptions.filter((exercise) => {
      if (formData.lessonId && exercise.lessonId !== formData.lessonId) return false;
      return true;
    });
  }, [exerciseOptions, formData.lessonId]);

  const handleOpenForm = (attempt?: AttemptRow) => {
    if (attempt) {
      setEditingAttempt(attempt);
      setFormData({
        studentId: attempt.studentId || '',
        lessonId: attempt.lessonId || '',
        exerciseId: attempt.exerciseId || '',
        answerGiven: attempt.answerGiven || '',
        isCorrect:
          attempt.isCorrect === true ? 'true' : attempt.isCorrect === false ? 'false' : '',
        score: attempt.score?.toString() || '',
        timeSpentSeconds: attempt.timeSpentSeconds?.toString() || '',
        feedback: attempt.feedback || '',
        correctionStatus: attempt.correctionStatus || 'NOT_APPLICABLE',
      });
    } else {
      setEditingAttempt(null);
      setFormData(INITIAL_FORM);
    }

    onFormOpen();
  };

  const handleCloseForm = () => {
    setEditingAttempt(null);
    setFormData(INITIAL_FORM);
    onFormClose();
  };

  const ensureAttemptHasId = (attempt?: AttemptRow | null) => {
    if (attempt?.attemptId !== undefined && attempt?.attemptId !== null) return true;

    toastRef.current({
      title: 'O backend de attempts não retornou o id da entrega',
      description: 'Sem esse identificador não é possível editar ou excluir o registro.',
      status: 'warning',
    });
    return false;
  };

  const handleSave = async () => {
    if (!formData.studentId || !formData.lessonId || !formData.exerciseId || !formData.answerGiven.trim()) {
      toastRef.current({ title: 'Preencha aluno, lição, exercício e resposta', status: 'warning' });
      return;
    }

    if (formData.correctionStatus !== 'PENDING' && (formData.isCorrect === '' || formData.score === '')) {
      toastRef.current({ title: 'Preencha correção e nota', status: 'warning' });
      return;
    }

    if (formData.timeSpentSeconds === '') {
      toastRef.current({ title: 'Preencha o tempo gasto', status: 'warning' });
      return;
    }

    const payload: AttemptPayload = {
      studentId: formData.studentId,
      lessonId: formData.lessonId,
      exerciseId: formData.exerciseId,
      answerGiven: formData.answerGiven.trim(),
      isCorrect: formData.correctionStatus === 'PENDING' ? undefined : toBooleanValue(formData.isCorrect),
      score: formData.correctionStatus === 'PENDING' ? undefined : Number(formData.score),
      timeSpentSeconds: Number(formData.timeSpentSeconds),
      feedback: formData.feedback.trim() || undefined,
      correctionStatus: (formData.correctionStatus as any) || undefined,
    };

    setIsLoading(true);
    try {
      if (editingAttempt) {
        if (!ensureAttemptHasId(editingAttempt)) return;
        await attemptService.update(String(editingAttempt.attemptId), payload);
        toastRef.current({ title: 'Entrega atualizada com sucesso', status: 'success' });
      } else {
        await attemptService.create(payload);
        toastRef.current({ title: 'Entrega criada com sucesso', status: 'success' });
      }

      handleCloseForm();
      loadAll();
    } catch {
      toastRef.current({ title: 'Erro ao salvar entrega', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!attemptToDelete) return;
    if (!ensureAttemptHasId(attemptToDelete)) {
      onDeleteClose();
      return;
    }

    setIsLoading(true);
    try {
      await attemptService.delete(String(attemptToDelete.attemptId));
      toastRef.current({ title: 'Entrega excluída com sucesso', status: 'success' });
      onDeleteClose();
      setAttemptToDelete(null);
      loadAll();
    } catch {
      toastRef.current({ title: 'Erro ao excluir entrega', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    {
      key: 'studentLabel',
      header: 'Aluno',
      render: (item: AttemptRow) => <Text fontSize="sm">{item.studentLabel}</Text>,
    },
    {
      key: 'lessonLabel',
      header: 'Lição',
      render: (item: AttemptRow) => <Text fontSize="sm">{item.lessonLabel}</Text>,
    },
    {
      key: 'exerciseType',
      header: 'Tipo',
      render: (item: AttemptRow) => (
        <Badge colorScheme="purple" fontSize="xs">
          {item.exerciseType in EXERCISE_TYPE_LABELS
            ? EXERCISE_TYPE_LABELS[item.exerciseType as ExerciseType]
            : item.exerciseType}
        </Badge>
      ),
    },
    {
      key: 'exerciseLabel',
      header: 'Exercício',
      render: (item: AttemptRow) => (
        <Text fontSize="sm" noOfLines={2} maxW="360px">
          {item.exerciseLabel}
        </Text>
      ),
    },
    {
      key: 'answerPreview',
      header: 'Resposta',
      render: (item: AttemptRow) => (
        <Text fontSize="sm" noOfLines={3} maxW="360px">
          {item.answerPreview}
        </Text>
      ),
    },
    {
      key: 'correctionStatus',
      header: 'Status',
      render: (item: AttemptRow) => (
        <Badge
          colorScheme={
            item.correctionStatus === 'CORRECTED'
              ? 'green'
              : item.correctionStatus === 'PENDING'
              ? 'orange'
              : 'gray'
          }
          fontSize="xs"
        >
          {item.correctionStatus === 'CORRECTED'
            ? 'Corrigido'
            : item.correctionStatus === 'PENDING'
            ? 'Pendente'
            : 'N/A'}
        </Badge>
      ),
    },
    {
      key: 'correctnessLabel',
      header: 'Correção',
      render: (item: AttemptRow) => (
        <Badge colorScheme={item.isCorrect === true ? 'green' : item.isCorrect === false ? 'red' : 'gray'} fontSize="xs">
          {item.correctnessLabel}
        </Badge>
      ),
    },
    {
      key: 'score',
      header: 'Nota',
      render: (item: AttemptRow) => <Text fontSize="sm">{item.score ?? '—'}</Text>,
    },
    {
      key: 'timeSpentSeconds',
      header: 'Tempo (s)',
      render: (item: AttemptRow) => <Text fontSize="sm">{item.timeSpentSeconds ?? '—'}</Text>,
    },
    {
      key: 'createdAtLabel',
      header: 'Criado em',
      render: (item: AttemptRow) => <Text fontSize="sm">{item.createdAtLabel}</Text>,
    },
  ];

  return (
    <DashboardLayout>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading size="lg" color="gray.700">Entregas</Heading>
          <Text mt={1} color="gray.500">
            Gestão dos attempts. O filtro inicial exibe apenas respostas curtas e dissertativas.
          </Text>
        </Box>
      </Flex>

      <Box bg="white" borderRadius="md" boxShadow="sm" p={5} mb={6}>
        <Stack spacing={4}>
          <FormControl>
            <FormLabel>Buscar</FormLabel>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar por aluno, lição, exercício ou resposta"
            />
          </FormControl>
          <FormControl>
            <FormLabel>Tipos de exercício exibidos</FormLabel>
            <CheckboxGroup
              value={selectedTypes}
              onChange={(values) => setSelectedTypes(values as ExerciseType[])}
            >
              <Wrap spacing={4}>
                {Object.entries(EXERCISE_TYPE_LABELS).map(([value, label]) => (
                  <WrapItem key={value}>
                    <Checkbox value={value}>{label}</Checkbox>
                  </WrapItem>
                ))}
              </Wrap>
            </CheckboxGroup>
          </FormControl>
        </Stack>
      </Box>

      <DataTable
        columns={columns}
        data={filteredRows}
        onEdit={(item) => handleOpenForm(item)}
        onDelete={(item) => {
          setAttemptToDelete(item);
          onDeleteOpen();
        }}
      />

      <Modal isOpen={isFormOpen} onClose={handleCloseForm} size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingAttempt ? 'Editar Entrega' : 'Nova Entrega'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Aluno</FormLabel>
                <Select
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  placeholder="Selecione o aluno"
                >
                  {userOptions.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} - {user.email}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Lição</FormLabel>
                <Select
                  value={formData.lessonId}
                  onChange={(e) => {
                    const nextLessonId = e.target.value;
                    const selectedExerciseForCurrentForm = formData.exerciseId
                      ? exerciseById.get(formData.exerciseId)
                      : undefined;

                    setFormData({
                      ...formData,
                      lessonId: nextLessonId,
                      exerciseId:
                        selectedExerciseForCurrentForm?.lessonId === nextLessonId
                          ? formData.exerciseId
                          : '',
                    });
                  }}
                  placeholder="Selecione a lição"
                >
                  {lessonOptions.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.title}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Exercício</FormLabel>
                <Select
                  value={formData.exerciseId}
                  onChange={(e) => {
                    const nextExerciseId = e.target.value;
                    const exercise = exerciseById.get(nextExerciseId);
                    setFormData({
                      ...formData,
                      exerciseId: nextExerciseId,
                      lessonId: exercise?.lessonId || formData.lessonId,
                    });
                  }}
                  placeholder="Selecione o exercício"
                >
                  {exercisesForForm.map((exercise) => (
                    <option key={exercise.id} value={exercise.id}>
                      [{EXERCISE_TYPE_LABELS[exercise.type] ?? exercise.type}] {exercise.description}
                    </option>
                  ))}
                </Select>
                {selectedExercise && (
                  <Text mt={2} fontSize="xs" color="gray.500">
                    Tipo: {EXERCISE_TYPE_LABELS[selectedExercise.type] ?? selectedExercise.type}
                  </Text>
                )}
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Resposta enviada</FormLabel>
                <Textarea
                  rows={6}
                  value={formData.answerGiven}
                  onChange={(e) => setFormData({ ...formData, answerGiven: e.target.value })}
                  placeholder="Conteúdo da resposta do aluno"
                />
              </FormControl>

              <HStack spacing={4} w="full" align="flex-start">
                <FormControl isRequired>
                  <FormLabel>Status da Correção</FormLabel>
                  <Select
                    value={formData.correctionStatus}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      setFormData({
                        ...formData,
                        correctionStatus: newStatus,
                        ...(newStatus === 'PENDING' ? { isCorrect: '', score: '' } : {})
                      });
                    }}
                  >
                    <option value="PENDING">Pendente</option>
                    <option value="CORRECTED">Corrigido</option>
                    <option value="NOT_APPLICABLE">Não aplicável</option>
                  </Select>
                </FormControl>

                <FormControl isRequired={formData.correctionStatus !== 'PENDING'}>
                  <FormLabel>Correção</FormLabel>
                  <Select
                    value={formData.isCorrect}
                    onChange={(e) => setFormData({ ...formData, isCorrect: e.target.value })}
                    placeholder="Selecione"
                    isDisabled={formData.correctionStatus === 'PENDING'}
                  >
                    <option value="true">Correta</option>
                    <option value="false">Incorreta</option>
                  </Select>
                </FormControl>

                <FormControl isRequired={formData.correctionStatus !== 'PENDING'}>
                  <FormLabel>Nota</FormLabel>
                  <Input
                    type="number"
                    value={formData.score}
                    onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                    placeholder="0"
                    isDisabled={formData.correctionStatus === 'PENDING'}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Tempo gasto (s)</FormLabel>
                  <Input
                    type="number"
                    value={formData.timeSpentSeconds}
                    onChange={(e) => setFormData({ ...formData, timeSpentSeconds: e.target.value })}
                    placeholder="0"
                  />
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel>Feedback do Tutor</FormLabel>
                <Textarea
                  rows={3}
                  value={formData.feedback}
                  onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                  placeholder="Observações do tutor para o aluno..."
                />
              </FormControl>

              {editingAttempt && editingAttempt.attemptId === undefined && (
                <Text w="full" fontSize="sm" color="orange.500">
                  Esta entrega pode ser visualizada, mas o backend atual não retornou o `id` necessário para salvar alterações.
                </Text>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleCloseForm} isDisabled={isLoading}>
              Cancelar
            </Button>
            <Button
              colorScheme="primary"
              onClick={handleSave}
              isLoading={isLoading}
              leftIcon={<Icon as={MdRateReview} />}
            >
              Salvar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ConfirmDeleteModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setAttemptToDelete(null);
          onDeleteClose();
        }}
        onConfirm={handleDelete}
        isLoading={isLoading}
        title="Excluir Entrega"
      />
    </DashboardLayout>
  );
}
