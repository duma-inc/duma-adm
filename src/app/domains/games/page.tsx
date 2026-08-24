'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Textarea,
  VStack,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { MdAdd, MdSearch, MdUploadFile } from 'react-icons/md';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { DataTable } from '@/components/ui/DataTable';
import { gameService, Game, GameType, NativeGameKind } from '@/services/gameService';
import { uploadFile } from '@/services/fileService';
import { lessonService, Lesson } from '@/services/lessonService';
import { skillService, Skill } from '@/services/skillService';
import { stageService, Stage } from '@/services/stageService';

const INITIAL_GAME_FORM = {
  title: '',
  description: '',
  category: '',
  skillId: '',
  stageId: '',
  lessonId: '',
  type: 'EMBED' as GameType,
  embedUrl: '',
  nativeKind: 'QUIZ' as NativeGameKind,
  payload: '',
  thumbnailUrl: '',
  isActive: true,
};

const NATIVE_KIND_LABELS: Record<NativeGameKind, string> = {
  QUIZ: 'Quiz',
  MEMORY: 'Memória',
  SCRAMBLE: 'Anagrama',
  SENTENCE_BUILDER: 'Montar frase',
  WORD_MATCH: 'Ligar palavras',
};

/** Um exemplo por engine, para o cadastro não depender de adivinhar o formato do pack. */
const PAYLOAD_EXAMPLES: Record<NativeGameKind, string> = {
  QUIZ: JSON.stringify(
    { questions: [{ question: 'How do you greet someone in the morning?', options: ['Good night', 'Good morning'], correctIndex: 1 }] },
    null,
    2
  ),
  MEMORY: JSON.stringify({ pairs: [{ term: 'hello', match: 'olá' }] }, null, 2),
  SCRAMBLE: JSON.stringify({ words: [{ target: 'MORNING', hint: 'Período antes do meio-dia' }] }, null, 2),
  SENTENCE_BUILDER: JSON.stringify(
    { sentences: [{ id: 'sb-1', prompt: 'Monte a frase de apresentação.', sentence: 'My name is Emma' }] },
    null,
    2
  ),
  WORD_MATCH: JSON.stringify({ pairs: [{ term: 'book', match: 'livro' }] }, null, 2),
};

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? fallback;
  }
  return fallback;
}

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);
  const [gameForm, setGameForm] = useState(INITIAL_GAME_FORM);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [searchText, setSearchText] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');

  const { isOpen: isFormOpen, onOpen: onFormOpen, onClose: onFormClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const toast = useToast();
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, [toast]);

  const loadAll = useCallback(async () => {
    const [gamesRes, lessonsRes, skillsRes, stagesRes] = await Promise.allSettled([
      gameService.getAll(),
      lessonService.getAll(),
      skillService.getAll(),
      stageService.getAll(),
    ]);
    setGames(gamesRes.status === 'fulfilled' ? gamesRes.value : []);
    setLessons(lessonsRes.status === 'fulfilled' ? lessonsRes.value : []);
    setSkills(skillsRes.status === 'fulfilled' ? skillsRes.value : []);
    setStages(stagesRes.status === 'fulfilled' ? stagesRes.value : []);

    if (gamesRes.status === 'rejected') {
      toastRef.current({ title: 'Erro ao carregar jogos', status: 'error' });
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Cascata skill -> etapa -> lição, como nas demais telas.
  const filteredStages = useMemo(
    () => stages.filter((stage) => !gameForm.skillId || String(stage.skillId) === gameForm.skillId),
    [stages, gameForm.skillId]
  );

  const filteredLessons = useMemo(
    () =>
      lessons.filter((lesson) => {
        const matchesStage = !gameForm.stageId || String(lesson.stageId) === gameForm.stageId;
        const matchesSkill = !gameForm.skillId || String(lesson.skillId) === gameForm.skillId;
        return matchesStage && matchesSkill;
      }),
    [lessons, gameForm.stageId, gameForm.skillId]
  );

  const filteredGames = useMemo(
    () =>
      games.filter((game) => {
        const matchesText = game.title.toLowerCase().includes(searchText.toLowerCase());
        const matchesType = selectedType === 'ALL' || game.type === selectedType;
        return matchesText && matchesType;
      }),
    [games, searchText, selectedType]
  );

  const handleOpenForm = (game?: Game) => {
    if (game) {
      setEditingGame(game);
      setGameForm({
        title: game.title,
        description: game.description ?? '',
        category: game.category ?? '',
        skillId: game.skillId ? String(game.skillId) : '',
        stageId: game.stageId ? String(game.stageId) : '',
        lessonId: game.lessonId ?? '',
        type: game.type,
        embedUrl: game.embedUrl ?? '',
        nativeKind: game.nativeKind ?? 'QUIZ',
        payload: game.payload ? JSON.stringify(game.payload, null, 2) : '',
        thumbnailUrl: game.thumbnailUrl ?? '',
        isActive: true,
      });
    } else {
      setEditingGame(null);
      setGameForm(INITIAL_GAME_FORM);
    }
    setSelectedFile(null);
    onFormOpen();
  };

  const handleSave = async () => {
    if (!gameForm.title.trim()) {
      toastRef.current({ title: 'Informe o título do jogo', status: 'warning' });
      return;
    }

    // O pack é validado aqui para o professor não descobrir o JSON quebrado em plena aula.
    let parsedPayload: unknown = null;
    if (gameForm.type === 'NATIVE') {
      try {
        parsedPayload = JSON.parse(gameForm.payload);
      } catch {
        toastRef.current({ title: 'O pack de dados não é um JSON válido', status: 'warning' });
        return;
      }
    }

    setIsLoading(true);
    try {
      let fileId: number | null = null;
      if (gameForm.type === 'EMBED' && selectedFile) {
        const uploaded = await uploadFile(selectedFile);
        fileId = uploaded.id;
      }

      const payload = {
        title: gameForm.title.trim(),
        description: gameForm.description || undefined,
        category: gameForm.category || undefined,
        skillId: gameForm.skillId ? Number(gameForm.skillId) : null,
        stageId: gameForm.stageId ? Number(gameForm.stageId) : null,
        lessonId: gameForm.lessonId || null,
        type: gameForm.type,
        embedUrl: gameForm.type === 'EMBED' ? gameForm.embedUrl || null : null,
        fileId,
        nativeKind: gameForm.type === 'NATIVE' ? gameForm.nativeKind : null,
        payload: gameForm.type === 'NATIVE' ? parsedPayload : null,
        thumbnailUrl: gameForm.thumbnailUrl || null,
        isActive: gameForm.isActive,
      };

      if (editingGame) {
        await gameService.update(editingGame.id, payload);
        toastRef.current({ title: 'Jogo atualizado com sucesso', status: 'success' });
      } else {
        await gameService.create(payload);
        toastRef.current({ title: 'Jogo criado com sucesso', status: 'success' });
      }
      onFormClose();
      loadAll();
    } catch (error) {
      toastRef.current({ title: getErrorMessage(error, 'Erro ao salvar o jogo'), status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!gameToDelete) return;
    setIsLoading(true);
    try {
      await gameService.delete(gameToDelete.id);
      toastRef.current({ title: 'Jogo excluído com sucesso', status: 'success' });
      onDeleteClose();
      loadAll();
    } catch (error) {
      toastRef.current({ title: getErrorMessage(error, 'Erro ao excluir o jogo'), status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const getLessonLabel = (lessonId?: string | null) =>
    lessons.find((lesson) => lesson.id === lessonId)?.title ?? '—';

  const columns = [
    { key: 'title', header: 'Título' },
    {
      key: 'type',
      header: 'Tipo',
      render: (game: Game) => (
        <Badge colorScheme={game.type === 'EMBED' ? 'purple' : 'blue'}>
          {game.type === 'EMBED' ? 'HTML' : NATIVE_KIND_LABELS[game.nativeKind ?? 'QUIZ']}
        </Badge>
      ),
    },
    { key: 'category', header: 'Categoria', render: (game: Game) => game.category ?? '—' },
    { key: 'lessonId', header: 'Lição', render: (game: Game) => getLessonLabel(game.lessonId) },
  ];

  return (
    <DashboardLayout>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg" color="gray.700">Jogos</Heading>
        <Button leftIcon={<Icon as={MdAdd} />} colorScheme="primary" onClick={() => handleOpenForm()}>
          Novo Jogo
        </Button>
      </Flex>

      <HStack spacing={4} mb={6} flexWrap="wrap" gap={3}>
        <InputGroup maxW="320px">
          <InputLeftElement pointerEvents="none">
            <Icon as={MdSearch} color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder="Buscar por título..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            bg="white"
          />
        </InputGroup>
        <Select maxW="200px" value={selectedType} onChange={(e) => setSelectedType(e.target.value)} bg="white">
          <option value="ALL">Todos os tipos</option>
          <option value="EMBED">HTML (iframe)</option>
          <option value="NATIVE">Engine nativo</option>
        </Select>
      </HStack>

      <DataTable
        columns={columns}
        data={filteredGames}
        onEdit={(game) => handleOpenForm(game)}
        onDelete={(game) => { setGameToDelete(game); onDeleteOpen(); }}
      />

      <Modal isOpen={isFormOpen} onClose={onFormClose} size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingGame ? 'Editar Jogo' : 'Novo Jogo'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Título</FormLabel>
                <Input
                  value={gameForm.title}
                  onChange={(e) => setGameForm({ ...gameForm, title: e.target.value })}
                  placeholder="Conversation Game"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Descrição</FormLabel>
                <Textarea
                  value={gameForm.description}
                  onChange={(e) => setGameForm({ ...gameForm, description: e.target.value })}
                  rows={2}
                />
              </FormControl>

              <HStack spacing={4} w="full" align="flex-start">
                <FormControl>
                  <FormLabel>Skill</FormLabel>
                  <Select
                    value={gameForm.skillId}
                    onChange={(e) =>
                      setGameForm({ ...gameForm, skillId: e.target.value, stageId: '', lessonId: '' })
                    }
                    placeholder="Todas"
                  >
                    {skills.map((skill) => (
                      <option key={skill.id} value={skill.id}>{skill.name}</option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Trilha</FormLabel>
                  <Select
                    value={gameForm.stageId}
                    onChange={(e) => setGameForm({ ...gameForm, stageId: e.target.value, lessonId: '' })}
                    placeholder="Todas"
                  >
                    {filteredStages.map((stage) => (
                      <option key={stage.id} value={stage.id}>{stage.name}</option>
                    ))}
                  </Select>
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel>Lição</FormLabel>
                <Select
                  value={gameForm.lessonId}
                  onChange={(e) => setGameForm({ ...gameForm, lessonId: e.target.value })}
                  placeholder="Nenhuma (jogo geral)"
                >
                  {filteredLessons.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
                  ))}
                </Select>
                <FormHelperText>
                  O Toolkit carrega os jogos da lição do encontro do dia.
                </FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel>Categoria</FormLabel>
                <Input
                  value={gameForm.category}
                  onChange={(e) => setGameForm({ ...gameForm, category: e.target.value })}
                  placeholder="Vocabulário"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Tipo</FormLabel>
                <Select
                  value={gameForm.type}
                  onChange={(e) => setGameForm({ ...gameForm, type: e.target.value as GameType })}
                >
                  <option value="EMBED">HTML autocontido (iframe)</option>
                  <option value="NATIVE">Engine nativo (pack de dados)</option>
                </Select>
              </FormControl>

              {gameForm.type === 'EMBED' ? (
                <>
                  <FormControl>
                    <FormLabel>Arquivo HTML</FormLabel>
                    <Input
                      type="file"
                      accept=".html,text/html"
                      p={1}
                      onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                    />
                    <FormHelperText>
                      <Icon as={MdUploadFile} mr={1} />
                      HTML único e autocontido. Se enviar um arquivo, ele tem precedência sobre a URL.
                    </FormHelperText>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Ou URL externa</FormLabel>
                    <Input
                      value={gameForm.embedUrl}
                      onChange={(e) => setGameForm({ ...gameForm, embedUrl: e.target.value })}
                      placeholder="https://..."
                    />
                  </FormControl>
                </>
              ) : (
                <>
                  <FormControl isRequired>
                    <FormLabel>Engine</FormLabel>
                    <Select
                      value={gameForm.nativeKind}
                      onChange={(e) =>
                        setGameForm({ ...gameForm, nativeKind: e.target.value as NativeGameKind })
                      }
                    >
                      {Object.entries(NATIVE_KIND_LABELS).map(([kind, label]) => (
                        <option key={kind} value={kind}>{label}</option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>Pack de dados (JSON)</FormLabel>
                    <Textarea
                      value={gameForm.payload}
                      onChange={(e) => setGameForm({ ...gameForm, payload: e.target.value })}
                      rows={10}
                      fontFamily="mono"
                      fontSize="sm"
                      placeholder={PAYLOAD_EXAMPLES[gameForm.nativeKind]}
                    />
                    <FormHelperText>
                      <Button
                        size="xs"
                        variant="link"
                        colorScheme="primary"
                        onClick={() =>
                          setGameForm({ ...gameForm, payload: PAYLOAD_EXAMPLES[gameForm.nativeKind] })
                        }
                      >
                        Preencher com o exemplo deste engine
                      </Button>
                    </FormHelperText>
                  </FormControl>
                </>
              )}

              <FormControl>
                <FormLabel>Thumbnail (URL)</FormLabel>
                <Input
                  value={gameForm.thumbnailUrl}
                  onChange={(e) => setGameForm({ ...gameForm, thumbnailUrl: e.target.value })}
                  placeholder="https://..."
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onFormClose}>Cancelar</Button>
            <Button colorScheme="primary" onClick={handleSave} isLoading={isLoading}>
              Salvar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ConfirmDeleteModal
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        onConfirm={handleDelete}
        isLoading={isLoading}
        description={`Tem certeza que deseja excluir o jogo "${gameToDelete?.title ?? ''}"?`}
      />

      <Box h={8} />
    </DashboardLayout>
  );
}
