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
  Text,
  Textarea,
  VStack,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { MdAdd, MdSearch, MdWarning } from 'react-icons/md';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { DataTable } from '@/components/ui/DataTable';
import {
  slideDeckService,
  SlideDeck,
  SlideDeckFormat,
  SlideDeckPagePayload,
} from '@/services/slideDeckService';
import { uploadFile } from '@/services/fileService';
import { lessonService, Lesson } from '@/services/lessonService';
import { meetingService, Meeting } from '@/services/meetingService';

const INITIAL_DECK_FORM = {
  title: '',
  description: '',
  target: 'LESSON' as 'LESSON' | 'MEETING',
  lessonId: '',
  meetingId: '',
  format: 'IMAGES' as SlideDeckFormat,
  notes: '',
};

const FORMAT_LABELS: Record<SlideDeckFormat, string> = {
  IMAGES: 'Imagens (PNG/JPG)',
  PDF: 'PDF',
  PPTX: 'PowerPoint (PPTX)',
};

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? fallback;
  }
  return fallback;
}

export default function SlideDecksPage() {
  const [decks, setDecks] = useState<SlideDeck[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [editingDeck, setEditingDeck] = useState<SlideDeck | null>(null);
  const [deckToDelete, setDeckToDelete] = useState<SlideDeck | null>(null);
  const [deckForm, setDeckForm] = useState(INITIAL_DECK_FORM);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [searchText, setSearchText] = useState('');

  const { isOpen: isFormOpen, onOpen: onFormOpen, onClose: onFormClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const toast = useToast();
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, [toast]);

  const loadAll = useCallback(async () => {
    const [decksRes, lessonsRes, meetingsRes] = await Promise.allSettled([
      slideDeckService.getAll(),
      lessonService.getAll(),
      meetingService.getAll(),
    ]);
    setDecks(decksRes.status === 'fulfilled' ? decksRes.value : []);
    setLessons(lessonsRes.status === 'fulfilled' ? lessonsRes.value : []);
    setMeetings(meetingsRes.status === 'fulfilled' ? meetingsRes.value : []);

    if (decksRes.status === 'rejected') {
      toastRef.current({ title: 'Erro ao carregar os decks', status: 'error' });
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filteredDecks = useMemo(
    () => decks.filter((deck) => deck.title.toLowerCase().includes(searchText.toLowerCase())),
    [decks, searchText]
  );

  const handleOpenForm = (deck?: SlideDeck) => {
    if (deck) {
      setEditingDeck(deck);
      setDeckForm({
        title: deck.title,
        description: deck.description ?? '',
        target: deck.meetingId ? 'MEETING' : 'LESSON',
        lessonId: deck.lessonId ?? '',
        meetingId: deck.meetingId ?? '',
        format: deck.format,
        notes: '',
      });
    } else {
      setEditingDeck(null);
      setDeckForm(INITIAL_DECK_FORM);
    }
    setSelectedFiles([]);
    onFormOpen();
  };

  const handleSave = async () => {
    if (!deckForm.title.trim()) {
      toastRef.current({ title: 'Informe o título do deck', status: 'warning' });
      return;
    }

    const lessonId = deckForm.target === 'LESSON' ? deckForm.lessonId : '';
    const meetingId = deckForm.target === 'MEETING' ? deckForm.meetingId : '';
    if (!lessonId && !meetingId) {
      toastRef.current({ title: 'Escolha a lição ou o encontro do deck', status: 'warning' });
      return;
    }

    // Editar sem reenviar arquivo apagaria as páginas: o PUT substitui o deck inteiro.
    if (selectedFiles.length === 0) {
      toastRef.current({
        title: editingDeck
          ? 'Reenvie os arquivos: salvar substitui o deck inteiro'
          : 'Envie os arquivos do deck',
        status: 'warning',
      });
      return;
    }

    setIsLoading(true);
    try {
      let fileId: number | null = null;
      let pages: SlideDeckPagePayload[] | undefined;

      if (deckForm.format === 'IMAGES') {
        // Sequencial de propósito: a ordem de upload é a ordem de apresentação.
        pages = [];
        for (const file of selectedFiles) {
          const uploaded = await uploadFile(file);
          pages.push({ fileId: uploaded.id, title: file.name.replace(/\.[^.]+$/, '') });
        }
      } else {
        const uploaded = await uploadFile(selectedFiles[0]);
        fileId = uploaded.id;
      }

      const payload = {
        title: deckForm.title.trim(),
        description: deckForm.description || undefined,
        lessonId: lessonId || null,
        meetingId: meetingId || null,
        format: deckForm.format,
        fileId,
        pages,
      };

      if (editingDeck) {
        await slideDeckService.update(editingDeck.id, payload);
        toastRef.current({ title: 'Deck atualizado com sucesso', status: 'success' });
      } else {
        await slideDeckService.create(payload);
        toastRef.current({ title: 'Deck criado com sucesso', status: 'success' });
      }
      onFormClose();
      loadAll();
    } catch (error) {
      toastRef.current({ title: getErrorMessage(error, 'Erro ao salvar o deck'), status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deckToDelete) return;
    setIsLoading(true);
    try {
      await slideDeckService.delete(deckToDelete.id);
      toastRef.current({ title: 'Deck excluído com sucesso', status: 'success' });
      onDeleteClose();
      loadAll();
    } catch (error) {
      toastRef.current({ title: getErrorMessage(error, 'Erro ao excluir o deck'), status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const getLessonLabel = (lessonId?: string | null) =>
    lessons.find((lesson) => lesson.id === lessonId)?.title ?? '—';

  const columns = [
    { key: 'title', header: 'Título' },
    {
      key: 'format',
      header: 'Formato',
      render: (deck: SlideDeck) => (
        <HStack spacing={2}>
          <Badge colorScheme={deck.projectable ? 'green' : 'orange'}>
            {FORMAT_LABELS[deck.format]}
          </Badge>
          {!deck.projectable && (
            <Text fontSize="xs" color="orange.600" title="O navegador não renderiza PPTX">
              <Icon as={MdWarning} mr={1} />
              não projetável
            </Text>
          )}
        </HStack>
      ),
    },
    {
      key: 'pages',
      header: 'Páginas',
      render: (deck: SlideDeck) => (deck.format === 'IMAGES' ? String(deck.pages.length) : '—'),
    },
    {
      key: 'lessonId',
      header: 'Vinculado a',
      render: (deck: SlideDeck) =>
        deck.meetingId ? 'Encontro específico' : getLessonLabel(deck.lessonId),
    },
  ];

  return (
    <DashboardLayout>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg" color="gray.700">Slides</Heading>
        <Button leftIcon={<Icon as={MdAdd} />} colorScheme="primary" onClick={() => handleOpenForm()}>
          Novo Deck
        </Button>
      </Flex>

      <HStack spacing={4} mb={6}>
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
      </HStack>

      <DataTable
        columns={columns}
        data={filteredDecks}
        onEdit={(deck) => handleOpenForm(deck)}
        onDelete={(deck) => { setDeckToDelete(deck); onDeleteOpen(); }}
      />

      <Modal isOpen={isFormOpen} onClose={onFormClose} size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingDeck ? 'Editar Deck' : 'Novo Deck de Slides'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Título</FormLabel>
                <Input
                  value={deckForm.title}
                  onChange={(e) => setDeckForm({ ...deckForm, title: e.target.value })}
                  placeholder="Lesson 01 — Greetings"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Descrição</FormLabel>
                <Textarea
                  value={deckForm.description}
                  onChange={(e) => setDeckForm({ ...deckForm, description: e.target.value })}
                  rows={2}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Vincular a</FormLabel>
                <Select
                  value={deckForm.target}
                  onChange={(e) =>
                    setDeckForm({ ...deckForm, target: e.target.value as 'LESSON' | 'MEETING' })
                  }
                >
                  <option value="LESSON">Uma lição (vale para toda turma que passar por ela)</option>
                  <option value="MEETING">Um encontro específico</option>
                </Select>
              </FormControl>

              {deckForm.target === 'LESSON' ? (
                <FormControl isRequired>
                  <FormLabel>Lição</FormLabel>
                  <Select
                    value={deckForm.lessonId}
                    onChange={(e) => setDeckForm({ ...deckForm, lessonId: e.target.value })}
                    placeholder="Selecione a lição"
                  >
                    {lessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <FormControl isRequired>
                  <FormLabel>Encontro</FormLabel>
                  <Select
                    value={deckForm.meetingId}
                    onChange={(e) => setDeckForm({ ...deckForm, meetingId: e.target.value })}
                    placeholder="Selecione o encontro"
                  >
                    {meetings.map((meeting) => (
                      <option key={meeting.id} value={meeting.id}>{meeting.title}</option>
                    ))}
                  </Select>
                </FormControl>
              )}

              <FormControl isRequired>
                <FormLabel>Formato</FormLabel>
                <Select
                  value={deckForm.format}
                  onChange={(e) => {
                    setDeckForm({ ...deckForm, format: e.target.value as SlideDeckFormat });
                    setSelectedFiles([]);
                  }}
                >
                  {Object.entries(FORMAT_LABELS).map(([format, label]) => (
                    <option key={format} value={format}>{label}</option>
                  ))}
                </Select>
                {deckForm.format === 'PPTX' && (
                  <FormHelperText color="orange.600">
                    <Icon as={MdWarning} mr={1} />
                    O navegador não renderiza PPTX: o arquivo fica disponível para download, mas
                    não é projetado no Toolkit. Para projetar na aula, exporte em PDF ou PNG.
                  </FormHelperText>
                )}
              </FormControl>

              <FormControl isRequired>
                <FormLabel>
                  {deckForm.format === 'IMAGES' ? 'Imagens dos slides' : 'Arquivo'}
                </FormLabel>
                <Input
                  type="file"
                  p={1}
                  multiple={deckForm.format === 'IMAGES'}
                  accept={
                    deckForm.format === 'IMAGES'
                      ? 'image/png,image/jpeg'
                      : deckForm.format === 'PDF'
                        ? 'application/pdf'
                        : '.pptx'
                  }
                  onChange={(e) => setSelectedFiles(Array.from(e.target.files ?? []))}
                />
                <FormHelperText>
                  {deckForm.format === 'IMAGES'
                    ? 'Selecione todas as imagens de uma vez — a ordem dos arquivos é a ordem dos slides.'
                    : 'Um arquivo único.'}
                  {editingDeck && ' Salvar substitui o deck inteiro, então reenvie os arquivos.'}
                </FormHelperText>
                {selectedFiles.length > 0 && (
                  <Text fontSize="xs" color="gray.600" mt={2}>
                    {selectedFiles.length} arquivo(s): {selectedFiles.map((f) => f.name).join(', ')}
                  </Text>
                )}
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
        description={`Tem certeza que deseja excluir o deck "${deckToDelete?.title ?? ''}"?`}
      />

      <Box h={8} />
    </DashboardLayout>
  );
}
