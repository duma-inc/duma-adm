'use client'

import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  Textarea,
  VStack,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { MdAdd } from 'react-icons/md';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { DataTable } from '@/components/ui/DataTable';
import { lessonBookChapterService, LessonBookChapterPayload } from '@/services/lessonBookChapterService';
import { LessonBook, LessonBookChapter, lessonBookService } from '@/services/lessonBookService';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';

const INITIAL_FORM = {
  order: '',
  title: '',
  summary: '',
  markdown: '',
};

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const responseMessage = error.response?.data?.message;
    if (typeof responseMessage === 'string' && responseMessage.trim()) {
      return responseMessage;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export default function LessonBookChaptersPage() {
  const params = useParams<{ id: string }>();
  const lessonBookId = String(params.id);

  const [lessonBook, setLessonBook] = useState<LessonBook | null>(null);
  const [chapters, setChapters] = useState<LessonBookChapter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingChapter, setEditingChapter] = useState<LessonBookChapter | null>(null);
  const [chapterToDelete, setChapterToDelete] = useState<LessonBookChapter | null>(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [uploadingMessage, setUploadingMessage] = useState('');

  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const toast = useToast();

  const handleMarkdownFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMessage('Lendo arquivo Markdown...');
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setFormData((prev) => ({ ...prev, markdown: content }));
        toast({ title: 'Markdown carregado com sucesso!', status: 'success', duration: 3000 });
      }
      setUploadingMessage('');
    };
    reader.onerror = () => {
      toast({ title: 'Erro ao ler o arquivo markdown', status: 'error', duration: 3000 });
      setUploadingMessage('');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const loadData = useCallback(async () => {
    try {
      const [bookResult, chaptersResult] = await Promise.allSettled([
        lessonBookService.getById(lessonBookId),
        lessonBookChapterService.getAll(lessonBookId),
      ]);

      setLessonBook(bookResult.status === 'fulfilled' ? bookResult.value : null);
      setChapters(chaptersResult.status === 'fulfilled'
        ? [...chaptersResult.value].sort((a, b) => a.order - b.order)
        : []);
    } catch {
      toast({ title: 'Erro ao carregar capítulos', status: 'error' });
    }
  }, [lessonBookId, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenForm = (chapter?: LessonBookChapter) => {
    if (chapter) {
      setEditingChapter(chapter);
      setFormData({
        order: String(chapter.order ?? ''),
        title: chapter.title || '',
        summary: chapter.summary || '',
        markdown: chapter.markdown || '',
      });
    } else {
      setEditingChapter(null);
      setFormData({
        ...INITIAL_FORM,
        order: String((chapters[chapters.length - 1]?.order ?? 0) + 1),
      });
    }
    onOpen();
  };

  const handleSave = async () => {
    if (!formData.order || !formData.title.trim() || !formData.summary.trim() || !formData.markdown.trim()) {
      toast({ title: 'Preencha ordem, título, resumo e markdown', status: 'warning' });
      return;
    }

    setIsLoading(true);
    try {
      const payload: LessonBookChapterPayload = {
        order: Number(formData.order),
        title: formData.title.trim(),
        summary: formData.summary.trim(),
        markdown: formData.markdown,
      };

      if (editingChapter) {
        await lessonBookChapterService.update(lessonBookId, editingChapter.id, payload);
        toast({ title: 'Capítulo atualizado com sucesso', status: 'success' });
      } else {
        await lessonBookChapterService.create(lessonBookId, payload);
        toast({ title: 'Capítulo criado com sucesso', status: 'success' });
      }

      onClose();
      loadData();
    } catch (error) {
      toast({ title: getErrorMessage(error, 'Erro ao salvar capítulo'), status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!chapterToDelete) return;

    setIsLoading(true);
    try {
      await lessonBookChapterService.delete(lessonBookId, chapterToDelete.id);
      toast({ title: 'Capítulo excluído com sucesso', status: 'success' });
      onDeleteClose();
      loadData();
    } catch (error) {
      toast({ title: getErrorMessage(error, 'Erro ao excluir capítulo'), status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    { key: 'order', header: 'Ordem' },
    { key: 'title', header: 'Título' },
    { key: 'summary', header: 'Resumo', render: (item: LessonBookChapter) => <Text fontSize="sm" noOfLines={2}>{item.summary}</Text> },
  ];

  return (
    <DashboardLayout>
      <VStack align="stretch" spacing={6}>
        <Flex justify="space-between" align="center">
          <Box>
            <Link href="/domains/lesson-books" style={{ color: '#3182ce', fontSize: '14px' }}>
              Voltar para apostilas
            </Link>
            <Heading size="lg" color="gray.700" mt={2}>{lessonBook?.title || 'Capítulos'}</Heading>
            <Text color="gray.500" mt={1}>Gerencie os capítulos desta apostila.</Text>
          </Box>
          <Button leftIcon={<MdAdd />} colorScheme="orange" onClick={() => handleOpenForm()}>
            Novo capítulo
          </Button>
        </Flex>

        <DataTable
          data={chapters}
          columns={columns}
          onEdit={handleOpenForm}
          onDelete={(chapter) => {
            setChapterToDelete(chapter);
            onDeleteOpen();
          }}
        />
      </VStack>

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingChapter ? 'Editar capítulo' : 'Novo capítulo'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Ordem</FormLabel>
                <Input type="number" value={formData.order} onChange={(e) => setFormData({ ...formData, order: e.target.value })} />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Título</FormLabel>
                <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Resumo</FormLabel>
                <Textarea value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} rows={3} />
              </FormControl>

              <FormControl>
                <FormLabel>Importar arquivo Markdown (.md)</FormLabel>
                <Input
                  type="file"
                  accept=".md"
                  onChange={handleMarkdownFileChange}
                  p={1}
                />
                <Text mt={1} fontSize="xs" color="gray.500">
                  Selecione um arquivo .md local para preencher automaticamente o campo Markdown abaixo.
                </Text>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Markdown</FormLabel>
                <Textarea value={formData.markdown} onChange={(e) => setFormData({ ...formData, markdown: e.target.value })} rows={12} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>Cancelar</Button>
            <Button colorScheme="orange" onClick={handleSave} isLoading={isLoading}>Salvar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ConfirmDeleteModal
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        title="Excluir capítulo"
        description={`Deseja excluir o capítulo "${chapterToDelete?.title || ''}"?`}
        onConfirm={handleDelete}
        isLoading={isLoading}
      />
      <LoadingOverlay isOpen={!!uploadingMessage} message={uploadingMessage} />
    </DashboardLayout>
  );
}
