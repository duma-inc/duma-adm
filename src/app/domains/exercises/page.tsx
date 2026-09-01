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
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';
import { MdAdd, MdDelete, MdUploadFile, MdSearch, MdArrowUpward, MdArrowDownward, MdAutoFixHigh } from 'react-icons/md';
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
  requiresOptions,
  parseOrderOptions,
  ORDER_ALT_MATCH_KEY,
} from '@/services/exerciseService';
import { lessonService, Lesson } from '@/services/lessonService';
import { skillService, Skill } from '@/services/skillService';
import { stageService, Stage } from '@/services/stageService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const DIFFICULTY_COLORS: Record<ExerciseDifficulty, string> = {
  EASY: 'green',
  MODERATE: 'yellow',
  HARD: 'red',
};

const DIFFICULTY_LABELS: Record<ExerciseDifficulty, string> = {
  EASY: 'Fácil',
  MODERATE: 'Moderado',
  HARD: 'Difícil',
};

const TYPE_LABELS: Record<ExerciseType, string> = {
  MULTIPLE_CHOICE: 'Múltipla Escolha',
  TRUE_FALSE: 'Verdadeiro/Falso',
  TRANSLATION: 'Tradução',
  FILL_IN_THE_BLANK: 'Completar Lacuna',
  MATCHING: 'Correspondência',
  SHORT_ANSWER: 'Resposta Curta',
  ESSAY: 'Redação',
  SPEAKING: 'Fala',
  LISTENING: 'Escuta',
  ORDER: 'Ordenar Palavras',
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
  difficulty: 'MODERATE',
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

  // States for filtering
  const [searchText, setSearchText] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState('ALL');
  const [selectedStageId, setSelectedStageId] = useState('ALL');
  const [selectedLessonId, setSelectedLessonId] = useState('ALL');
  const [selectedSkillId, setSelectedSkillId] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  // Rascunho da frase do ORDER. Fica fora do formData porque e so um atalho de
  // digitacao: a fonte da verdade continua sendo a lista de palavras.
  const [orderSentenceDraft, setOrderSentenceDraft] = useState('');
  /**
   * ORDER: ordens alternativas aceitas. Ficam separadas das palavras enquanto o
   * form esta aberto — no payload as duas listas viram um `options` so, as palavras
   * com matchKey "1".."N" e as alternativas com "ALT". Separar evita que uma frase
   * inteira acabe no banco de palavras do aluno.
   */
  const [orderAlternatives, setOrderAlternatives] = useState<string[]>([]);
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

  // A lista de palavras e a fonte da verdade: se ela muda por outro caminho
  // (reordenar, editar, remover), o rascunho da frase acompanha. Digitar no
  // textarea nao mexe em `options`, entao isto nao atrapalha a digitacao.
  const orderWords = formData.type === 'ORDER'
    ? formData.options.map(opt => opt.text).join(' ')
    : '';
  useEffect(() => {
    if (formData.type === 'ORDER') setOrderSentenceDraft(orderWords);
  }, [orderWords, formData.type]);

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

  // --- ORDER (ordenar palavras) ---
  // No form as palavras ficam em `formData.options` ja na ordem correta: a posicao
  // e o indice da linha, e o matchKey ("1".."N") so e escrito no handleSave. Assim
  // nao da para o operador criar posicao repetida ou buraco na sequencia.
  const handleOrderMoveWord = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= formData.options.length) return;
    const updated = [...formData.options];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    setFormData({ ...formData, options: updated });
  };

  /** Quebra a frase correta em palavras, uma opcao por palavra. */
  const handleOrderSplitSentence = (sentence: string) => {
    const words = sentence.trim().split(/\s+/).filter(Boolean);
    if (words.length < 2) {
      toast({ title: 'Escreva a frase completa (pelo menos 2 palavras)', status: 'warning' });
      return;
    }
    setFormData({
      ...formData,
      options: words.map((word) => ({ text: word, matchKey: '', isCorrect: true })),
    });
  };

  const handleAddAlternative = () => setOrderAlternatives([...orderAlternatives, '']);

  const handleAlternativeChange = (index: number, value: string) =>
    setOrderAlternatives(orderAlternatives.map((alt, i) => (i === index ? value : alt)));

  const handleRemoveAlternative = (index: number) =>
    setOrderAlternatives(orderAlternatives.filter((_, i) => i !== index));

  // --- CRUD ---
  const handleOpenForm = (exercise?: Exercise) => {
    if (exercise) {
      setEditingExercise(exercise);
      // ORDER guarda palavras e alternativas no mesmo `options`; o form as separa.
      const parsedOrder = exercise.type === 'ORDER' ? parseOrderOptions(exercise.options) : null;
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
        options: parsedOrder
          ? parsedOrder.tokens
          : (exercise.options?.length ? exercise.options : INITIAL_FORM.options),
      });
      setOrderAlternatives(parsedOrder ? parsedOrder.alternatives.map((alt) => alt.text) : []);
    } else {
      setEditingExercise(null);
      setFormData(INITIAL_FORM);
      setOrderSentenceDraft('');
      setOrderAlternatives([]);
    }
    onFormOpen();
  };

  const handleSave = async () => {
    if (!formData.description.trim()) {
      toast({ title: 'Descrição é obrigatória', status: 'warning' });
      return;
    }
    if (showOrder) {
      if (formData.options.length < 2) {
        toast({ title: 'A frase precisa de pelo menos 2 palavras', status: 'warning' });
        return;
      }
      if (formData.options.some(o => !o.text.trim())) {
        toast({ title: 'Preencha todas as palavras', status: 'warning' });
        return;
      }
      if (formData.options.some(o => /\s/.test(o.text.trim()))) {
        toast({ title: 'Cada linha deve ter uma única palavra', status: 'warning' });
        return;
      }
      if (orderAlternatives.some(alt => !alt.trim())) {
        toast({ title: 'Remova as ordens alternativas em branco', status: 'warning' });
        return;
      }
    } else if (showOptions) {
      if (!formData.options.some(o => o.isCorrect)) {
        toast({ title: 'Marque pelo menos uma opção como correta', status: 'warning' });
        return;
      }
      if (formData.options.some(o => !o.text.trim())) {
        toast({ title: 'Preencha o texto de todas as opções', status: 'warning' });
        return;
      }
    }

    setIsLoading(true);
    try {
      // ORDER: a posicao vira matchKey aqui, derivada do indice da linha; as
      // alternativas entram no mesmo array com matchKey "ALT".
      const orderOptions: ExerciseOption[] = showOrder
        ? [
            ...formData.options.map((o, index) => ({
              ...(o.optionId ? { optionId: o.optionId } : {}),
              text: o.text.trim(),
              matchKey: String(index + 1),
              isCorrect: true,
            })),
            ...orderAlternatives
              .map(alt => alt.trim())
              .filter(Boolean)
              .map(alt => ({ text: alt, matchKey: ORDER_ALT_MATCH_KEY, isCorrect: true })),
          ]
        : [];

      const payload = {
        ...formData,
        stageId: formData.stageId ? Number(formData.stageId) : undefined,
        lessonId: formData.lessonId || undefined,
        skillId: formData.skillId || undefined,
        translation: formData.translation || undefined,
        explanation: formData.explanation || undefined,
        options: showOrder
          ? orderOptions
          : showOptions
          ? formData.options.map(o => ({
              ...(o.optionId ? { optionId: o.optionId } : {}),
              text: o.text,
              matchKey: o.matchKey || null,
              isCorrect: o.isCorrect,
            }))
          : [],
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

    for (let index = 0; index < items.length; index += 1) {
      const exercise = items[index];
      // 1-based para bater com o que a pessoa ve no arquivo.
      const onde = `Exercício ${index + 1}`;

      if (!exercise.description?.trim()) return `${onde}: informe a descrição.`;
      if (!exercise.difficulty) return `${onde}: informe a dificuldade.`;
      if (!exercise.origin) return `${onde}: informe a origem.`;
      if (!exercise.language) return `${onde}: informe o idioma.`;

      const type = exercise.type;
      if (!type) return `${onde}: informe o tipo.`;

      // ESSAY e SHORT_ANSWER sao dissertativos e corrigidos pela IA: nao ha gabarito.
      if (!requiresOptions(type)) continue;

      const options = exercise.options;
      if (!options?.length) {
        return `${onde} (${TYPE_LABELS[type] ?? type}): informe as opções.`;
      }

      // ORDER: matchKey carrega a posicao ("1".."N") ou "ALT". A checagem generica
      // abaixo passaria de graca (todas as opcoes sao corretas), entao valida aqui.
      if (type === 'ORDER') {
        const { tokens, alternatives } = parseOrderOptions(options);
        if (tokens.length < 2) {
          return `${onde} (Ordenar Palavras): precisa de ao menos 2 palavras com matchKey numérico.`;
        }
        if (tokens.length + alternatives.length !== options.length) {
          return `${onde} (Ordenar Palavras): todo matchKey deve ser um número de posição ou "${ORDER_ALT_MATCH_KEY}".`;
        }
        const positions = tokens.map((option) => Number(option.matchKey));
        if (new Set(positions).size !== positions.length) {
          return `${onde} (Ordenar Palavras): há posições repetidas em matchKey.`;
        }
        const esperado = positions.map((_, i) => i + 1).join(',');
        if ([...positions].sort((a, b) => a - b).join(',') !== esperado) {
          return `${onde} (Ordenar Palavras): as posições devem ir de 1 a ${positions.length}, sem buracos.`;
        }
        if (alternatives.some((option) => !option.text?.trim())) {
          return `${onde} (Ordenar Palavras): ordem alternativa sem texto.`;
        }
        continue;
      }
      if (options.some((option) => !option.text?.trim())) {
        return `${onde}: todas as opções precisam ter texto.`;
      }
      if (!options.some((option) => option.isCorrect)) {
        return `${onde}: marque ao menos uma opção como correta.`;
      }
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

  const filteredExercises = exercises.filter((ex) => {
    const matchesText = !searchText ||
      ex.description.toLowerCase().includes(searchText.toLowerCase()) ||
      (ex.translation && ex.translation.toLowerCase().includes(searchText.toLowerCase()));
    
    const matchesType = selectedType === 'ALL' || ex.type === selectedType;
    
    const matchesDifficulty = selectedDifficulty === 'ALL' || ex.difficulty === selectedDifficulty;
    
    const matchesStage = selectedStageId === 'ALL' || String(ex.stageId) === selectedStageId;

    const matchesLesson = selectedLessonId === 'ALL' || String(ex.lessonId) === selectedLessonId;

    const matchesSkill = selectedSkillId === 'ALL' || String(ex.skillId) === selectedSkillId;

    const matchesStatus = filterStatus === 'ALL' || ex.status === filterStatus;

    return matchesText && matchesType && matchesDifficulty && matchesStage && matchesLesson && matchesSkill && matchesStatus;
  });

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
  // ORDER tem editor proprio: as palavras sao sempre corretas e a posicao vem da
  // ordem das linhas, entao a tabela generica de opcoes nao serve.
  const showOrder = formData.type === 'ORDER';
  // Dissertativos nao tem gabarito: a IA corrige a resposta livre do aluno.
  const showOptions = requiresOptions(formData.type) && !showOrder;

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

      {/* Filtros */}
      <VStack align="stretch" spacing={3} mb={6}>
        <HStack spacing={4} align="center" flexWrap="wrap" gap={3}>
          <InputGroup maxW="320px">
            <InputLeftElement pointerEvents="none">
              <Icon as={MdSearch} color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Buscar por enunciado ou tradução..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              bg="white"
            />
          </InputGroup>
          <Select
            maxW="180px"
            value={selectedSkillId}
            onChange={(e) => {
              setSelectedSkillId(e.target.value);
              setSelectedStageId('ALL');
              setSelectedLessonId('ALL');
            }}
            bg="white"
          >
            <option value="ALL">Todas as Skills</option>
            {skills.map((skill) => (
              <option key={skill.id} value={String(skill.id)}>
                {skill.name}
              </option>
            ))}
          </Select>
          <Select
            maxW="180px"
            value={selectedStageId}
            onChange={(e) => {
              setSelectedStageId(e.target.value);
              setSelectedLessonId('ALL');
            }}
            bg="white"
          >
            <option value="ALL">Todos os Stages</option>
            {stages
              .filter((stage) => selectedSkillId === 'ALL' || String(stage.skillId) === selectedSkillId)
              .map((stage) => (
                <option key={stage.id} value={String(stage.id)}>
                  {stage.name}
                </option>
              ))}
          </Select>
          <Select
            maxW="180px"
            value={selectedLessonId}
            isDisabled={selectedStageId === 'ALL'}
            onChange={(e) => setSelectedLessonId(e.target.value)}
            bg="white"
          >
            <option value="ALL">Todas as Lições</option>
            {lessons
              .filter((lesson) => String(lesson.stageId) === selectedStageId)
              .map((lesson) => (
                <option key={lesson.id} value={String(lesson.id)}>
                  {lesson.title}
                </option>
              ))}
          </Select>
          <Select
            maxW="180px"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            bg="white"
          >
            <option value="ALL">Todos os Tipos</option>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
          <Select
            maxW="180px"
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            bg="white"
          >
            <option value="ALL">Todas as Dificuldades</option>
            {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
          <Select
            maxW="160px"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            bg="white"
          >
            <option value="ALL">Todos os Status</option>
            <option value="ACTIVE">Ativos</option>
            <option value="INACTIVE">Inativos</option>
            <option value="DRAFT">Rascunhos</option>
          </Select>
        </HStack>
      </VStack>

      <DataTable
        columns={columns}
        data={filteredExercises}
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
                    {stages
                      .filter((stage) => !formData.skillId || String(stage.skillId) === formData.skillId)
                      .map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Lição</FormLabel>
                  <Select
                    placeholder="Nenhuma"
                    value={formData.lessonId}
                    onChange={(e) => setFormData({ ...formData, lessonId: e.target.value })}
                  >
                    {lessons
                      .filter((lesson) => {
                        if (formData.lessonId && String(lesson.id) === formData.lessonId) return true;
                        const okSkill = !formData.skillId || String(lesson.skillId) === formData.skillId;
                        const okStage = !formData.stageId || String(lesson.stageId) === formData.stageId;
                        return okSkill && okStage;
                      })
                      .map(l => (
                        <option key={l.id} value={l.id}>{l.title}</option>
                      ))}
                  </Select>
                </FormControl>
              </HStack>

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
                    {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
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

              <Divider />

              {/* ORDER — o aluno monta a frase arrastando as palavras embaralhadas.
                  A posição de cada palavra é a ordem das linhas aqui; o matchKey
                  ("1".."N") é escrito no salvar. */}
              {showOrder && (
              <Box>
                <FormControl mb={4}>
                  <FormLabel fontSize="sm" color="gray.600">Frase correta</FormLabel>
                  <HStack align="flex-start">
                    <Textarea
                      size="sm"
                      rows={2}
                      value={orderSentenceDraft}
                      onChange={(e) => setOrderSentenceDraft(e.target.value)}
                      placeholder="He is in Paris with his wife"
                      onBlur={() => {
                        const typed = orderSentenceDraft.trim();
                        const current = formData.options.map(opt => opt.text).join(' ');
                        if (typed && typed !== current) handleOrderSplitSentence(typed);
                      }}
                    />
                    <Tooltip label="Quebrar a frase em palavras">
                      <IconButton
                        aria-label="Gerar palavras"
                        icon={<MdAutoFixHigh />}
                        onClick={() => handleOrderSplitSentence(orderSentenceDraft)}
                      />
                    </Tooltip>
                  </HStack>
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Escreva a frase e saia do campo: cada palavra vira uma linha abaixo.
                    O aluno recebe essas palavras embaralhadas.
                  </Text>
                </FormControl>

                <Flex justify="space-between" align="center" mb={3}>
                  <Text fontWeight="semibold" fontSize="sm" color="gray.600">
                    Palavras na ordem correta
                  </Text>
                  <Button size="xs" leftIcon={<Icon as={MdAdd} />} variant="outline" onClick={handleAddOption}>
                    Adicionar palavra
                  </Button>
                </Flex>

                <Table size="sm" variant="simple">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th w="50px" textAlign="center">Posição</Th>
                      <Th>Palavra</Th>
                      <Th w="90px" textAlign="center">Mover</Th>
                      <Th w="40px" />
                    </Tr>
                  </Thead>
                  <Tbody>
                    {formData.options.map((opt, index) => (
                      <Tr key={index}>
                        <Td textAlign="center">
                          <Text fontSize="sm" fontWeight="semibold" color="gray.600">{index + 1}</Text>
                        </Td>
                        <Td>
                          <Input
                            size="sm"
                            value={opt.text}
                            onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                            placeholder={`Palavra ${index + 1}`}
                          />
                        </Td>
                        <Td textAlign="center">
                          <HStack spacing={0} justify="center">
                            <IconButton
                              aria-label="Mover para cima"
                              icon={<MdArrowUpward />}
                              size="xs"
                              variant="ghost"
                              isDisabled={index === 0}
                              onClick={() => handleOrderMoveWord(index, -1)}
                            />
                            <IconButton
                              aria-label="Mover para baixo"
                              icon={<MdArrowDownward />}
                              size="xs"
                              variant="ghost"
                              isDisabled={index === formData.options.length - 1}
                              onClick={() => handleOrderMoveWord(index, 1)}
                            />
                          </HStack>
                        </Td>
                        <Td>
                          <IconButton
                            aria-label="Remover palavra"
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

                <Flex justify="space-between" align="center" mt={6} mb={3}>
                  <Box>
                    <Text fontWeight="semibold" fontSize="sm" color="gray.600">
                      Ordens alternativas aceitas
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      Opcional. Outras frases igualmente corretas — ex.: &quot;He is with his wife in Paris&quot;.
                    </Text>
                  </Box>
                  <Button size="xs" leftIcon={<Icon as={MdAdd} />} variant="outline" onClick={handleAddAlternative}>
                    Adicionar alternativa
                  </Button>
                </Flex>

                <VStack align="stretch" spacing={2}>
                  {orderAlternatives.length === 0 && (
                    <Text fontSize="xs" color="gray.400">Nenhuma — só a ordem acima será aceita.</Text>
                  )}
                  {orderAlternatives.map((alt, index) => (
                    <HStack key={index}>
                      <Input
                        size="sm"
                        value={alt}
                        onChange={(e) => handleAlternativeChange(index, e.target.value)}
                        placeholder="Frase completa aceita como correta"
                      />
                      <IconButton
                        aria-label="Remover alternativa"
                        icon={<MdDelete />}
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                        onClick={() => handleRemoveAlternative(index)}
                      />
                    </HStack>
                  ))}
                </VStack>
              </Box>
              )}

              {/* Opções — ocultas nos tipos dissertativos, que não têm gabarito */}
              {showOptions && (
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
              )}
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
                  placeholder='[{"description":"...", "type":"MULTIPLE_CHOICE", "difficulty":"MODERATE", "language":"pt", "origin":"BASE", "options":[{"text":"A","isCorrect":true},{"text":"B","isCorrect":false}]}]'
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
    "difficulty": "MODERATE",
    "language": "pt",
    "origin": "BASE",
    "status": "ACTIVE",
    "reusePolicy": "GLOBAL_REUSABLE",
    "options": [
      { "text": "Opção 1", "isCorrect": true },
      { "text": "Opção 2", "isCorrect": false }
    ]
  },
  {
    "description": "Where is your friend?",
    "translation": "Onde está seu amigo?",
    "type": "ORDER",
    "difficulty": "MODERATE",
    "language": "pt",
    "origin": "BASE",
    "options": [
      { "text": "He",    "matchKey": "1", "isCorrect": true },
      { "text": "is",    "matchKey": "2", "isCorrect": true },
      { "text": "in",    "matchKey": "3", "isCorrect": true },
      { "text": "Paris", "matchKey": "4", "isCorrect": true },
      { "text": "with",  "matchKey": "5", "isCorrect": true },
      { "text": "his",   "matchKey": "6", "isCorrect": true },
      { "text": "wife",  "matchKey": "7", "isCorrect": true },
      { "text": "He is with his wife in Paris", "matchKey": "ALT", "isCorrect": true }
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
