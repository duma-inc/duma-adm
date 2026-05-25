'use client'

import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  useDisclosure,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  VStack,
  HStack,
  Select,
  Icon,
  IconButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Badge,
  Switch,
  Divider,
  Tooltip,
  Code,
} from '@chakra-ui/react';
import { MdAdd, MdDelete, MdUploadFile } from 'react-icons/md';
import { DataTable } from '@/components/ui/DataTable';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import {
  exerciseService,
  Exercise,
  ExerciseOption,
  ExerciseType,
  ExerciseDifficulty,
  ExerciseOrigin,
  ExerciseStatus,
  ExerciseReusePolicy,
} from '@/services/exerciseService';
import { lessonService, Lesson } from '@/services/lessonService';
import { skillService, Skill } from '@/services/skillService';
import { stageService, Stage } from '@/services/stageService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const DIFFICULTY_COLORS: Record<ExerciseDifficulty, string> = {
  BEGINNER: 'green',
  INTERMEDIATE: 'yellow',
  ADVANCED: 'red',
};

const DIFFICULTY_LABELS: Record<ExerciseDifficulty, string> = {
  BEGINNER: 'Iniciante',
  INTERMEDIATE: 'Intermediário',
  ADVANCED: 'Avançado',
};

const TYPE_LABELS: Record<ExerciseType, string> = {
  MULTIPLE_CHOICE: 'Múltipla Escolha',
  TRUE_FALSE: 'Verdadeiro/Falso',
  FILL_IN_THE_BLANK: 'Completar Lacuna',
  MATCHING: 'Correspondência',
  ORDER_SEQUENCE: 'Ordenar Sequência',
};

const ORIGIN_LABELS: Record<ExerciseOrigin, string> = {
  LEVEL_TEST: 'Teste de Nível',
  LESSON: 'Lição',
  PRACTICE: 'Prática',
  BASE: 'Base',
};

const STATUS_COLORS: Record<ExerciseStatus, string> = {
  ACTIVE: 'green',
  INACTIVE: 'gray',
  DRAFT: 'orange',
};

const EMPTY_OPTION: ExerciseOption = { text: '', matchKey: '', isCorrect: false };

type FormData = {
  lessonId: string;
  skillId: string;
  stageId: string;
  description: string;
  translation: string;
  explanation: string;
  type: ExerciseType;
  difficulty: ExerciseDifficulty;
  language: string;
  origin: ExerciseOrigin;
  status: ExerciseStatus;
  reusePolicy: ExerciseReusePolicy;
  options: ExerciseOption[];
};

const INITIAL_FORM: FormData = {
  lessonId: '',
  skillId: '',
  stageId: '',
  description: '',
  translation: '',
  explanation: '',
  type: 'MULTIPLE_CHOICE',
  difficulty: 'BEGINNER',
  language: 'pt',
  origin: 'BASE',
  status: 'ACTIVE',
  reusePolicy: 'GLOBAL_REUSABLE',
  options: [
    { text: '', matchKey: '', isCorrect: true },
    { text: '', matchKey: '', isCorrect: false },
    { text: '', matchKey: '', isCorrect: false },
    { text: '', matchKey: '', isCorrect: false },
  ],
};

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(null);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [batchJsonText, setBatchJsonText] = useState('');
  const [batchFileName, setBatchFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { isOpen: isFormOpen, onOpen: onFormOpen, onClose: onFormClose } = useDisclosure();
  const { isOpen: isBatchOpen, onOpen: onBatchOpen, onClose: onBatchClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  const toast = useToast();

  const loadAll = async () => {
    try {
      const [exsResult, lsnsResult, sklsResult, stgsResult] = await Promise.allSettled([
        exerciseService.getAll(),
        lessonService.getAll(),
        skillService.getAll(),
        stageService.getAll(),
      ]);
      setExercises(exsResult.status   === 'fulfilled' ? exsResult.value   : []);
      setLessons(lsnsResult.status    === 'fulfilled' ? lsnsResult.value  : []);
      setSkills(sklsResult.status     === 'fulfilled' ? sklsResult.value  : []);
      setStages(stgsResult.status     === 'fulfilled' ? stgsResult.value  : []);
    } catch {
      toast({ title: 'Erro ao carregar dados', status: 'error' });
    }
  };

  useEffect(() => { loadAll(); }, []);

  // --- Opções ---
  const handleOptionChange = (index: number, field: keyof ExerciseOption, value: string | boolean) => {
    const updated = formData.options.map((opt, i) =>
      i !== index ? opt : { ...opt, [field]: value }
    );
    setFormData({ ...formData, options: updated });
  };

  const handleCorrectToggle = (index: number) => {
    const isSingle = formData.type === 'MULTIPLE_CHOICE' || formData.type === 'TRUE_FALSE';
    const updated = formData.options.map((opt, i) => ({
      ...opt,
      isCorrect: isSingle ? i === index : (i === index ? !opt.isCorrect : opt.isCorrect),
    }));
    setFormData({ ...formData, options: updated });
  };

  const handleAddOption = () => {
    setFormData({ ...formData, options: [...formData.options, { ...EMPTY_OPTION }] });
  };

  const handleRemoveOption = (index: number) => {
    if (formData.options.length <= 2) {
      toast({ title: 'Mínimo de 2 opções', status: 'warning' });
      return;
    }
    setFormData({ ...formData, options: formData.options.filter((_, i) => i !== index) });
  };

  // --- CRUD ---
  const handleOpenForm = (exercise?: Exercise) => {
    if (exercise) {
      setEditingExercise(exercise);
      setFormData({
        lessonId: exercise.lessonId || '',
        skillId: exercise.skillId || '',
        stageId: exercise.stageId?.toString() || '',
        description: exercise.description || '',
        translation: exercise.translation || '',
        explanation: exercise.explanation || '',
        type: exercise.type,
        difficulty: exercise.difficulty,
        language: exercise.language || 'pt',
        origin: exercise.origin,
        status: exercise.status || 'ACTIVE',
        reusePolicy: exercise.reusePolicy || 'GLOBAL_REUSABLE',
        options: exercise.options?.length ? exercise.options : INITIAL_FORM.options,
      });
    } else {
      setEditingExercise(null);
      setFormData(INITIAL_FORM);
    }
    onFormOpen();
  };

  const handleSave = async () => {
    if (!formData.description.trim()) {
      toast({ title: 'Descrição é obrigatória', status: 'warning' });
      return;
    }
    if (!formData.options.some(o => o.isCorrect)) {
      toast({ title: 'Marque pelo menos uma opção como correta', status: 'warning' });
      return;
    }
    if (formData.options.some(o => !o.text.trim())) {
      toast({ title: 'Preencha o texto de todas as opções', status: 'warning' });
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        ...formData,
        stageId: formData.stageId ? Number(formData.stageId) : undefined,
        lessonId: formData.lessonId || undefined,
        skillId: formData.skillId || undefined,
        translation: formData.translation || undefined,
        explanation: formData.explanation || undefined,
        options: formData.options.map(o => ({
          ...(o.optionId ? { optionId: o.optionId } : {}),
          text: o.text,
          matchKey: o.matchKey || null,
          isCorrect: o.isCorrect,
        })),
      };

      if (editingExercise) {
        await exerciseService.update(editingExercise.id, payload);
        toast({ title: 'Exercício atualizado com sucesso', status: 'success' });
      } else {
        await exerciseService.create(payload as Omit<Exercise, 'id'>);
        toast({ title: 'Exercício criado com sucesso', status: 'success' });
      }

      onFormClose();
      loadAll();
    } catch {
      toast({ title: 'Erro ao salvar exercício', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!exerciseToDelete) return;
    setIsLoading(true);
    try {
      await exerciseService.delete(exerciseToDelete.id);
      toast({ title: 'Exercício excluído com sucesso', status: 'success' });
      onDeleteClose();
      loadAll();
    } catch {
      toast({ title: 'Erro ao excluir exercício', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const normalizeBatchExercise = (exercise: Partial<Exercise>) => ({
    ...exercise,
    lessonId: exercise.lessonId || undefined,
    skillId: exercise.skillId || undefined,
    stageId: exercise.stageId !== undefined && exercise.stageId !== null ? Number(exercise.stageId) : undefined,
    translation: exercise.translation || undefined,
    explanation: exercise.explanation || undefined,
    options: (exercise.options || []).map((option) => ({
      ...(option.optionId ? { optionId: option.optionId } : {}),
      text: option.text,
      matchKey: option.matchKey || null,
      isCorrect: option.isCorrect,
    })),
  });

  const validateBatchExercises = (items: Partial<Exercise>[]) => {
    if (!Array.isArray(items) || items.length === 0) {
      return 'O JSON deve conter um array de exercícios.';
    }

    for (const exercise of items) {
      if (!exercise.description?.trim()) return 'Todos os exercícios precisam ter descrição.';
      if (!exercise.type) return 'Todos os exercícios precisam ter tipo.';
      if (!exercise.difficulty) return 'Todos os exercícios precisam ter dificuldade.';
      if (!exercise.origin) return 'Todos os exercícios precisam ter origem.';
      if (!exercise.language) return 'Todos os exercícios precisam ter idioma.';
      if (!exercise.options?.length) return 'Todos os exercícios precisam ter opções.';
      if (exercise.options.some((option) => !option.text?.trim())) return 'Todas as opções precisam ter texto.';
      if (!exercise.options.some((option) => option.isCorrect)) return 'Cada exercício precisa de ao menos uma opção correta.';
    }

    return null;
  };

  const handleBatchFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBatchFileName(file.name);

    try {
      const text = await file.text();
      JSON.parse(text);
      setBatchJsonText(text);
    } catch {
      toast({ title: 'Arquivo JSON inválido', status: 'error' });
      setBatchJsonText('');
      setBatchFileName('');
    } finally {
      event.target.value = '';
    }
  };

  const handleOpenBatchModal = () => {
    setBatchJsonText('');
    setBatchFileName('');
    onBatchOpen();
  };

  const handleSaveBatch = async () => {
    if (!batchJsonText.trim()) {
      toast({ title: 'Selecione ou cole um JSON', status: 'warning' });
      return;
    }

    setIsLoading(true);
    try {
      const parsed = JSON.parse(batchJsonText) as Partial<Exercise>[];
      const validationError = validateBatchExercises(parsed);
      if (validationError) {
        toast({ title: validationError, status: 'warning' });
        return;
      }

      const payload = parsed.map((exercise) => normalizeBatchExercise(exercise)) as Omit<Exercise, 'id'>[];
      await exerciseService.createBatch(payload);
      toast({ title: 'Exercícios importados com sucesso', status: 'success' });
      onBatchClose();
      loadAll();
    } catch {
      toast({ title: 'Erro ao importar exercícios em lote', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    {
      key: 'description',
      header: 'Descrição',
      render: (item: Exercise) => (
        <Text noOfLines={2} maxW="280px" title={item.description}>{item.description}</Text>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      render: (item: Exercise) => (
        <Text fontSize="sm">{TYPE_LABELS[item.type] ?? item.type}</Text>
      ),
    },
    {
      key: 'difficulty',
      header: 'Dificuldade',
      render: (item: Exercise) => (
        <Badge colorScheme={DIFFICULTY_COLORS[item.difficulty] ?? 'gray'} fontSize="xs">
          {DIFFICULTY_LABELS[item.difficulty] ?? item.difficulty}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Exercise) => item.status ? (
        <Badge colorScheme={STATUS_COLORS[item.status] ?? 'gray'} fontSize="xs">
          {item.status}
        </Badge>
      ) : null,
    },
    {
      key: 'origin',
      header: 'Origem',
      render: (item: Exercise) => (
        <Text fontSize="sm">{ORIGIN_LABELS[item.origin as ExerciseOrigin] ?? item.origin}</Text>
      ),
    },
    {
      key: 'options',
      header: 'Opções',
      render: (item: Exercise) => (
        <Text fontSize="sm" color="gray.500">{item.options?.length ?? 0}</Text>
      ),
    },
  ];

  const showMatchKey = formData.type === 'MATCHING';

  return (
    <DashboardLayout>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg" color="gray.700">Exercícios</Heading>
        <HStack spacing={3}>
          <Button leftIcon={<Icon as={MdUploadFile} />} variant="outline" onClick={handleOpenBatchModal}>
            Carga em lote
          </Button>
          <Button leftIcon={<Icon as={MdAdd} />} colorScheme="primary" onClick={() => handleOpenForm()}>
            Novo Exercício
          </Button>
        </HStack>
      </Flex>

      <DataTable
        columns={columns}
        data={exercises}
        onEdit={(ex) => handleOpenForm(ex)}
        onDelete={(ex) => { setExerciseToDelete(ex); onDeleteOpen(); }}
      />

      {/* Modal formulário */}
      <Modal isOpen={isFormOpen} onClose={onFormClose} size="2xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingExercise ? 'Editar Exercício' : 'Novo Exercício'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={5} align="stretch">

              <FormControl isRequired>
                <FormLabel>Descrição / Enunciado</FormLabel>
                <Textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Digite o enunciado do exercício..."
                />
              </FormControl>

              <HStack spacing={4} align="flex-start">
                <FormControl>
                  <FormLabel>Tradução</FormLabel>
                  <Input
                    value={formData.translation}
                    onChange={(e) => setFormData({ ...formData, translation: e.target.value })}
                    placeholder="Tradução do enunciado (opcional)"
                  />
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel>Explicação</FormLabel>
                <Textarea
                  rows={2}
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  placeholder="Explicação da resposta correta (opcional)"
                />
              </FormControl>

              <HStack spacing={4} align="flex-start">
                <FormControl isRequired>
                  <FormLabel>Tipo</FormLabel>
                  <Select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as ExerciseType })}
                  >
                    {Object.entries(TYPE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Dificuldade</FormLabel>
                  <Select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as ExerciseDifficulty })}
                  >
                    <option value="BEGINNER">Iniciante</option>
                    <option value="INTERMEDIATE">Intermediário</option>
                    <option value="ADVANCED">Avançado</option>
                  </Select>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Idioma</FormLabel>
                  <Select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  >
                    <option value="pt">Português</option>
                    <option value="en">Inglês</option>
                    <option value="es">Espanhol</option>
                    <option value="pt-BR">Português (BR)</option>
                    <option value="en-US">Inglês (EUA)</option>
                  </Select>
                </FormControl>
              </HStack>

              <HStack spacing={4} align="flex-start">
                <FormControl isRequired>
                  <FormLabel>Origem</FormLabel>
                  <Select
                    value={formData.origin}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value as ExerciseOrigin })}
                  >
                    <option value="BASE">Base</option>
                    <option value="LESSON">Lição</option>
                    <option value="LEVEL_TEST">Teste de Nível</option>
                    <option value="PRACTICE">Prática</option>
                  </Select>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Status</FormLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ExerciseStatus })}
                  >
                    <option value="ACTIVE">Ativo</option>
                    <option value="DRAFT">Rascunho</option>
                    <option value="INACTIVE">Inativo</option>
                  </Select>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Reuso</FormLabel>
                  <Select
                    value={formData.reusePolicy}
                    onChange={(e) => setFormData({ ...formData, reusePolicy: e.target.value as ExerciseReusePolicy })}
                  >
                    <option value="GLOBAL_REUSABLE">Global</option>
                    <option value="LESSON_ONLY">Somente Lição</option>
                    <option value="SINGLE_USE">Uso Único</option>
                  </Select>
                </FormControl>
              </HStack>

              <HStack spacing={4} align="flex-start">
                <FormControl>
                  <FormLabel>Lição</FormLabel>
                  <Select
                    placeholder="Nenhuma"
                    value={formData.lessonId}
                    onChange={(e) => setFormData({ ...formData, lessonId: e.target.value })}
                  >
                    {lessons.map(l => (
                      <option key={l.id} value={l.id}>{l.title}</option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Skill</FormLabel>
                  <Select
                    placeholder="Nenhuma"
                    value={formData.skillId}
                    onChange={(e) => setFormData({ ...formData, skillId: e.target.value })}
                  >
                    {skills.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Stage</FormLabel>
                  <Select
                    placeholder="Nenhuma"
                    value={formData.stageId}
                    onChange={(e) => setFormData({ ...formData, stageId: e.target.value })}
                  >
                    {stages.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Select>
                </FormControl>
              </HStack>

              <Divider />

              {/* Opções */}
              <Box>
                <Flex justify="space-between" align="center" mb={3}>
                  <Text fontWeight="semibold" fontSize="sm" color="gray.600">
                    Opções de resposta
                  </Text>
                  <Button size="xs" leftIcon={<Icon as={MdAdd} />} variant="outline" onClick={handleAddOption}>
                    Adicionar opção
                  </Button>
                </Flex>

                <Table size="sm" variant="simple">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th w="50px" textAlign="center">Correta</Th>
                      <Th>Texto da opção</Th>
                      {showMatchKey && <Th w="150px">matchKey</Th>}
                      <Th w="40px" />
                    </Tr>
                  </Thead>
                  <Tbody>
                    {formData.options.map((opt, index) => (
                      <Tr key={index} bg={opt.isCorrect ? 'green.50' : undefined}>
                        <Td textAlign="center">
                          <Tooltip label={opt.isCorrect ? 'Correta' : 'Marcar como correta'}>
                            <Switch
                              colorScheme="green"
                              isChecked={opt.isCorrect}
                              onChange={() => handleCorrectToggle(index)}
                            />
                          </Tooltip>
                        </Td>
                        <Td>
                          <Input
                            size="sm"
                            value={opt.text}
                            onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                            placeholder={`Opção ${index + 1}`}
                            borderColor={opt.isCorrect ? 'green.300' : undefined}
                          />
                        </Td>
                        {showMatchKey && (
                          <Td>
                            <Input
                              size="sm"
                              value={opt.matchKey || ''}
                              onChange={(e) => handleOptionChange(index, 'matchKey', e.target.value)}
                              placeholder="Chave"
                            />
                          </Td>
                        )}
                        <Td>
                          <IconButton
                            aria-label="Remover opção"
                            icon={<MdDelete />}
                            size="xs"
                            variant="ghost"
                            colorScheme="red"
                            onClick={() => handleRemoveOption(index)}
                          />
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onFormClose} isDisabled={isLoading}>Cancelar</Button>
            <Button colorScheme="primary" onClick={handleSave} isLoading={isLoading}>Salvar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isBatchOpen} onClose={onBatchClose} size="2xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Importar Exercícios em Lote</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={5} align="stretch">
              <FormControl>
                <FormLabel>Arquivo JSON</FormLabel>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleBatchFileChange}
                  style={{ display: 'none' }}
                />
                <HStack>
                  <Button variant="outline" leftIcon={<Icon as={MdUploadFile} />} onClick={() => fileInputRef.current?.click()}>
                    Selecionar arquivo
                  </Button>
                  <Text fontSize="sm" color="gray.500">
                    {batchFileName || 'Nenhum arquivo selecionado'}
                  </Text>
                </HStack>
              </FormControl>

              <FormControl>
                <FormLabel>Conteúdo JSON</FormLabel>
                <Textarea
                  rows={14}
                  value={batchJsonText}
                  onChange={(e) => setBatchJsonText(e.target.value)}
                  placeholder='[{"description":"...", "type":"MULTIPLE_CHOICE", "difficulty":"BEGINNER", "language":"pt", "origin":"BASE", "options":[{"text":"A","isCorrect":true},{"text":"B","isCorrect":false}]}]'
                  fontFamily="mono"
                />
              </FormControl>

              <Box bg="gray.50" borderRadius="md" p={3}>
                <Text fontSize="sm" color="gray.600" mb={2}>
                  Esperado:
                </Text>
                <Code whiteSpace="pre-wrap" display="block" p={3}>
                  {`[
  {
    "lessonId": "uuid-opcional",
    "skillId": "id-opcional",
    "stageId": 1,
    "description": "Texto do exercício",
    "translation": "Opcional",
    "explanation": "Opcional",
    "type": "MULTIPLE_CHOICE",
    "difficulty": "BEGINNER",
    "language": "pt",
    "origin": "BASE",
    "status": "ACTIVE",
    "reusePolicy": "GLOBAL_REUSABLE",
    "options": [
      { "text": "Opção 1", "isCorrect": true },
      { "text": "Opção 2", "isCorrect": false }
    ]
  }
]`}
                </Code>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onBatchClose} isDisabled={isLoading}>Cancelar</Button>
            <Button colorScheme="primary" onClick={handleSaveBatch} isLoading={isLoading}>Importar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ConfirmDeleteModal
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        onConfirm={handleDelete}
        isLoading={isLoading}
        title="Excluir Exercício"
      />
    </DashboardLayout>
  );
}
