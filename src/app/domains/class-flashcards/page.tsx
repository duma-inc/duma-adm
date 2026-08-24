'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
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
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Text,
  Image,
  InputGroup,
  InputLeftElement,
  Textarea,
  VStack,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { MdAdd, MdPlaylistAdd, MdSearch } from 'react-icons/md';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { DataTable } from '@/components/ui/DataTable';
import {
  classFlashcardService,
  ClassFlashcard,
} from '@/services/classFlashcardService';
import { lessonService, Lesson } from '@/services/lessonService';
import { skillService, Skill } from '@/services/skillService';
import { stageService, Stage } from '@/services/stageService';
import { uploadFile } from '@/services/fileService';

const INITIAL_FILTERS = {
  search: '',
  skillId: '',
  stageId: '',
  lessonId: '',
};

const INITIAL_CARD_FORM = {
  skillId: '',
  stageId: '',
  lessonId: '',
  frontText: '',
  backText: '',
  example: '',
  phonetic: '',
  category: '',
  /** URL da imagem já salva no card, para o preview ao editar. */
  frontImageUrl: '' as string | null | '',
  frontImageFileId: null as number | null,
};

/** A frente é projetada em aula: só formato que o navegador desenha direto. */
const FRONT_IMAGE_ACCEPT = 'image/png,image/jpeg';

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? fallback;
  }
  return fallback;
}

export default function ClassFlashcardsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [cards, setCards] = useState<ClassFlashcard[]>([]);
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const [isLoading, setIsLoading] = useState(false);
  const [editingCard, setEditingCard] = useState<ClassFlashcard | null>(null);
  const [cardToDelete, setCardToDelete] = useState<ClassFlashcard | null>(null);
  const [cardForm, setCardForm] = useState(INITIAL_CARD_FORM);
  /** Imagem escolhida mas ainda não enviada — o upload acontece só ao salvar. */
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [batchText, setBatchText] = useState('');

  const { isOpen: isFormOpen, onOpen: onFormOpen, onClose: onFormClose } = useDisclosure();
  const { isOpen: isBatchOpen, onOpen: onBatchOpen, onClose: onBatchClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const toast = useToast();
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, [toast]);

  const loadAll = useCallback(async () => {
    const [cardsRes, lessonsRes, skillsRes, stagesRes] = await Promise.allSettled([
      classFlashcardService.getAll(),
      lessonService.getAll(),
      skillService.getAll(),
      stageService.getAll(),
    ]);
    setCards(cardsRes.status === 'fulfilled' ? cardsRes.value : []);
    setLessons(lessonsRes.status === 'fulfilled' ? lessonsRes.value : []);
    setSkills(skillsRes.status === 'fulfilled' ? skillsRes.value : []);
    setStages(stagesRes.status === 'fulfilled' ? stagesRes.value : []);

    if (cardsRes.status === 'rejected') {
      toastRef.current({ title: 'Erro ao carregar os cards', status: 'error' });
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const getLessonLabel = useCallback(
    (lessonId?: string | null) =>
      lessons.find((lesson) => String(lesson.id) === String(lessonId))?.title ?? '—',
    [lessons]
  );

  // Cascata skill -> etapa -> lição, como nas demais telas. Vale para o filtro e para o form.
  const stagesFor = useCallback(
    (skillId: string) => stages.filter((stage) => !skillId || String(stage.skillId) === skillId),
    [stages]
  );

  const lessonsFor = useCallback(
    (skillId: string, stageId: string) =>
      lessons.filter((lesson) => {
        const matchesSkill = !skillId || String(lesson.skillId) === skillId;
        const matchesStage = !stageId || String(lesson.stageId) === stageId;
        return matchesSkill && matchesStage;
      }),
    [lessons]
  );

  const filteredCards = useMemo(() => {
    const term = filters.search.trim().toLowerCase();

    return cards.filter((card) => {
      // A busca cobre frente e verso: é por uma das duas que se lembra de um card.
      const matchesText =
        !term ||
        (card.frontText ?? '').toLowerCase().includes(term) ||
        (card.backText ?? '').toLowerCase().includes(term);

      const matchesSkill = !filters.skillId || String(card.skillId) === filters.skillId;
      const matchesStage = !filters.stageId || String(card.stageId) === filters.stageId;
      const matchesLesson = !filters.lessonId || String(card.lessonId) === filters.lessonId;

      return matchesText && matchesSkill && matchesStage && matchesLesson;
    });
  }, [cards, filters]);

  const handleOpenForm = (card?: ClassFlashcard) => {
    if (card) {
      setEditingCard(card);
      setCardForm({
        skillId: String(card.skillId ?? ''),
        stageId: String(card.stageId ?? ''),
        lessonId: String(card.lessonId ?? ''),
        frontText: card.frontText ?? '',
        backText: card.backText ?? '',
        example: card.example ?? '',
        phonetic: card.phonetic ?? '',
        category: card.category ?? '',
        frontImageUrl: card.frontImageUrl ?? '',
        frontImageFileId: card.frontImageFileId ?? null,
      });
    } else {
      setEditingCard(null);
      // Herda o que já estiver filtrado: cadastrar um deck é filtrar a lição e ir somando.
      setCardForm({
        ...INITIAL_CARD_FORM,
        skillId: filters.skillId,
        stageId: filters.stageId,
        lessonId: filters.lessonId,
      });
    }
    setSelectedImage(null);
    onFormOpen();
  };

  const handleSave = async () => {
    if (!cardForm.lessonId) {
      toastRef.current({ title: 'Escolha a lição do card', status: 'warning' });
      return;
    }
    // O verso é opcional; a frente precisa de texto ou imagem.
    const hasImage = !!selectedImage || cardForm.frontImageFileId !== null;
    if (!cardForm.frontText.trim() && !hasImage) {
      toastRef.current({ title: 'A frente precisa de texto ou imagem', status: 'warning' });
      return;
    }

    setIsLoading(true);
    try {
      let frontImageFileId = cardForm.frontImageFileId;
      if (selectedImage) {
        frontImageFileId = Number((await uploadFile(selectedImage)).id);
      }

      const payload = {
        lessonId: cardForm.lessonId,
        frontText: cardForm.frontText.trim() || null,
        frontImageFileId,
        backText: cardForm.backText.trim() || null,
        example: cardForm.example || undefined,
        phonetic: cardForm.phonetic || undefined,
        category: cardForm.category || undefined,
      };

      if (editingCard) {
        await classFlashcardService.update(editingCard.id, { ...payload, orderIndex: editingCard.orderIndex });
        toastRef.current({ title: 'Card atualizado com sucesso', status: 'success' });
      } else {
        await classFlashcardService.create(payload);
        toastRef.current({ title: 'Card criado com sucesso', status: 'success' });
      }
      onFormClose();
      loadAll();
    } catch (error) {
      toastRef.current({ title: getErrorMessage(error, 'Erro ao salvar o card'), status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Cadastro em lote: um card por linha, campos separados por `|`.
   * Um deck tem dezenas de termos — cadastrar um a um é inviável na prática.
   */
  const handleBatchSave = async () => {
    // O lote sempre cai numa lição só; sem o filtro de lição não há para onde mandar.
    if (!filters.lessonId) {
      toastRef.current({ title: 'Filtre por uma lição antes de importar', status: 'warning' });
      return;
    }

    const parsed = batchText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [frontText, backText, example] = line.split('|').map((part) => part?.trim());
        return {
          lessonId: filters.lessonId,
          frontText,
          backText: backText || null,
          example: example || undefined,
        };
      });

    // Só a frente é obrigatória. Cards com imagem entram um a um — não dá para importar
    // arquivo por texto colado.
    const invalid = parsed.findIndex((card) => !card.frontText);
    if (parsed.length === 0 || invalid >= 0) {
      toastRef.current({
        title: invalid >= 0 ? `Linha ${invalid + 1} sem a frente do card` : 'Nada para importar',
        status: 'warning',
      });
      return;
    }

    setIsLoading(true);
    try {
      await classFlashcardService.createBatch(parsed);
      toastRef.current({ title: `${parsed.length} card(s) importado(s)`, status: 'success' });
      setBatchText('');
      onBatchClose();
      loadAll();
    } catch (error) {
      toastRef.current({ title: getErrorMessage(error, 'Erro ao importar o deck'), status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!cardToDelete) return;
    setIsLoading(true);
    try {
      await classFlashcardService.delete(cardToDelete.id);
      toastRef.current({ title: 'Card excluído com sucesso', status: 'success' });
      onDeleteClose();
      loadAll();
    } catch (error) {
      toastRef.current({ title: getErrorMessage(error, 'Erro ao excluir o card'), status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    { key: 'orderIndex', header: '#', render: (card: ClassFlashcard) => String(card.orderIndex + 1) },
    {
      key: 'frontText',
      header: 'Frente',
      render: (card: ClassFlashcard) =>
        card.frontImageUrl ? (
          <HStack spacing={2}>
            <Image
              src={card.frontImageUrl}
              alt=""
              boxSize="32px"
              objectFit="cover"
              borderRadius="md"
            />
            <Text fontSize="sm">{card.frontText || 'Imagem'}</Text>
          </HStack>
        ) : (
          card.frontText || '—'
        ),
    },
    { key: 'backText', header: 'Verso', render: (card: ClassFlashcard) => card.backText || '—' },
    { key: 'example', header: 'Exemplo', render: (card: ClassFlashcard) => card.example ?? '—' },
    { key: 'lessonId', header: 'Lição', render: (card: ClassFlashcard) => getLessonLabel(card.lessonId) },
  ];

  return (
    <DashboardLayout>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg" color="gray.700">Flashcards da Aula</Heading>
        <HStack>
          <Button
            leftIcon={<Icon as={MdPlaylistAdd} />}
            variant="outline"
            colorScheme="primary"
            onClick={onBatchOpen}
            isDisabled={!filters.lessonId}
            title={filters.lessonId ? undefined : 'Filtre por uma lição para importar em lote'}
          >
            Importar em Lote
          </Button>
          <Button
            leftIcon={<Icon as={MdAdd} />}
            colorScheme="primary"
            onClick={() => handleOpenForm()}
          >
            Novo Card
          </Button>
        </HStack>
      </Flex>

      <HStack spacing={4} mb={6} flexWrap="wrap" gap={3}>
        <InputGroup maxW="320px">
          <InputLeftElement pointerEvents="none">
            <Icon as={MdSearch} color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder="Buscar na frente ou no verso..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            bg="white"
          />
        </InputGroup>

        <Select
          maxW="200px"
          bg="white"
          value={filters.skillId}
          // Trocar a skill invalida etapa e lição já escolhidas.
          onChange={(e) => setFilters({ ...filters, skillId: e.target.value, stageId: '', lessonId: '' })}
        >
          <option value="">Todas as skills</option>
          {skills.map((skill) => (
            <option key={skill.id} value={skill.id}>{skill.name}</option>
          ))}
        </Select>

        <Select
          maxW="200px"
          bg="white"
          value={filters.stageId}
          onChange={(e) => setFilters({ ...filters, stageId: e.target.value, lessonId: '' })}
        >
          <option value="">Todos os stages</option>
          {stagesFor(filters.skillId).map((stage) => (
            <option key={stage.id} value={stage.id}>{stage.name}</option>
          ))}
        </Select>

        <Select
          maxW="240px"
          bg="white"
          value={filters.lessonId}
          onChange={(e) => setFilters({ ...filters, lessonId: e.target.value })}
        >
          <option value="">Todas as lições</option>
          {lessonsFor(filters.skillId, filters.stageId).map((lesson) => (
            <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
          ))}
        </Select>

        <Button variant="ghost" size="sm" onClick={() => setFilters(INITIAL_FILTERS)}>
          Limpar filtros
        </Button>
      </HStack>

      <DataTable
        columns={columns}
        data={filteredCards}
        onEdit={(card) => handleOpenForm(card)}
        onDelete={(card) => { setCardToDelete(card); onDeleteOpen(); }}
      />

      <Modal isOpen={isFormOpen} onClose={onFormClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingCard ? 'Editar Card' : 'Novo Card'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <HStack spacing={4} w="full" align="flex-start">
                <FormControl>
                  <FormLabel>Skill</FormLabel>
                  <Select
                    value={cardForm.skillId}
                    onChange={(e) =>
                      setCardForm({ ...cardForm, skillId: e.target.value, stageId: '', lessonId: '' })
                    }
                  >
                    <option value="">Todas</option>
                    {skills.map((skill) => (
                      <option key={skill.id} value={skill.id}>{skill.name}</option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Stage</FormLabel>
                  <Select
                    value={cardForm.stageId}
                    onChange={(e) => setCardForm({ ...cardForm, stageId: e.target.value, lessonId: '' })}
                  >
                    <option value="">Todos</option>
                    {stagesFor(cardForm.skillId).map((stage) => (
                      <option key={stage.id} value={stage.id}>{stage.name}</option>
                    ))}
                  </Select>
                </FormControl>
              </HStack>

              <FormControl isRequired>
                <FormLabel>Lição</FormLabel>
                <Select
                  value={cardForm.lessonId}
                  onChange={(e) => setCardForm({ ...cardForm, lessonId: e.target.value })}
                  placeholder="Selecione a lição"
                >
                  {lessonsFor(cardForm.skillId, cardForm.stageId).map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
                  ))}
                </Select>
                <FormHelperText>
                  O deck é por lição — o Toolkit carrega o da lição do encontro do dia.
                </FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel>Frente (texto)</FormLabel>
                <Input
                  value={cardForm.frontText}
                  onChange={(e) => setCardForm({ ...cardForm, frontText: e.target.value })}
                  placeholder="good morning"
                />
                <FormHelperText>
                  A frente aceita texto ou imagem — ao menos um dos dois.
                </FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel>Frente (imagem)</FormLabel>
                <Input
                  type="file"
                  accept={FRONT_IMAGE_ACCEPT}
                  p={1}
                  onChange={(e) => setSelectedImage(e.target.files?.[0] ?? null)}
                />
                <FormHelperText>
                  PNG ou JPG. Com imagem, o card exibe só ela — o texto da frente vira legenda
                  interna e a pronúncia não é oferecida.
                </FormHelperText>

                {(selectedImage || cardForm.frontImageUrl) && (
                  <HStack spacing={3} mt={3} align="center">
                    <Image
                      src={
                        selectedImage
                          ? URL.createObjectURL(selectedImage)
                          : (cardForm.frontImageUrl as string)
                      }
                      alt="Prévia da frente"
                      maxH="96px"
                      objectFit="contain"
                      borderRadius="md"
                      borderWidth="1px"
                    />
                    <Button
                      size="xs"
                      variant="outline"
                      colorScheme="red"
                      onClick={() => {
                        setSelectedImage(null);
                        setCardForm({ ...cardForm, frontImageUrl: '', frontImageFileId: null });
                      }}
                    >
                      Remover imagem
                    </Button>
                  </HStack>
                )}
              </FormControl>

              <FormControl>
                <FormLabel>Verso</FormLabel>
                <Textarea
                  value={cardForm.backText}
                  onChange={(e) => setCardForm({ ...cardForm, backText: e.target.value })}
                  rows={2}
                  placeholder="greeting used before noon"
                />
                <FormHelperText>
                  Opcional. Sem verso, o card não vira em aula.
                </FormHelperText>
              </FormControl>
              <FormControl>
                <FormLabel>Exemplo</FormLabel>
                <Textarea
                  value={cardForm.example}
                  onChange={(e) => setCardForm({ ...cardForm, example: e.target.value })}
                  rows={2}
                  placeholder="Good morning, everyone!"
                />
              </FormControl>
              <HStack spacing={4} w="full">
                <FormControl>
                  <FormLabel>Fonética</FormLabel>
                  <Input
                    value={cardForm.phonetic}
                    onChange={(e) => setCardForm({ ...cardForm, phonetic: e.target.value })}
                    placeholder="/ɡʊd ˈmɔːnɪŋ/"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Categoria</FormLabel>
                  <Input
                    value={cardForm.category}
                    onChange={(e) => setCardForm({ ...cardForm, category: e.target.value })}
                    placeholder="Greetings"
                  />
                </FormControl>
              </HStack>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onFormClose}>Cancelar</Button>
            <Button colorScheme="primary" onClick={handleSave} isLoading={isLoading}>Salvar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isBatchOpen} onClose={onBatchClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Importar Deck em Lote — {getLessonLabel(filters.lessonId)}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>Um card por linha</FormLabel>
              <Textarea
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                rows={14}
                fontFamily="mono"
                fontSize="sm"
                placeholder={'frente | verso | exemplo\nhello | a greeting | Hello! How are you?\ngood morning | greeting used before noon | Good morning, everyone!'}
              />
              <FormHelperText>
                Campos separados por <strong>|</strong>. Só a frente é obrigatória; verso e
                exemplo podem ficar vazios. A ordem das linhas vira a ordem de apresentação.
                Cards com imagem precisam ser criados um a um.
              </FormHelperText>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onBatchClose}>Cancelar</Button>
            <Button colorScheme="primary" onClick={handleBatchSave} isLoading={isLoading}>
              Importar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ConfirmDeleteModal
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        onConfirm={handleDelete}
        isLoading={isLoading}
        description={`Tem certeza que deseja excluir o card "${cardToDelete?.frontText || 'com imagem'}"?`}
      />

      <Box h={8} />
    </DashboardLayout>
  );
}
