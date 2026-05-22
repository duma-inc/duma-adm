'use client'

import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import NextLink from 'next/link';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Icon,
  Input,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Text,
  VStack,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { MdAdd, MdOpenInNew } from 'react-icons/md';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { DataTable } from '@/components/ui/DataTable';
import { lessonService, Lesson } from '@/services/lessonService';
import { LessonBook, lessonBookService } from '@/services/lessonBookService';

const INITIAL_FORM = {
  lessonId: '',
  title: '',
  subtitle: '',
  pdfUrl: '',
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

export default function LessonBooksPage() {
  const [lessonBooks, setLessonBooks] = useState<LessonBook[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingLessonBook, setEditingLessonBook] = useState<LessonBook | null>(null);
  const [lessonBookToDelete, setLessonBookToDelete] = useState<LessonBook | null>(null);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const toast = useToast();

  const loadData = useCallback(async () => {
    try {
      const [lessonBooksResult, lessonsResult] = await Promise.allSettled([
        lessonBookService.getAll(),
        lessonService.getAll(),
      ]);

      setLessonBooks(lessonBooksResult.status === 'fulfilled' ? lessonBooksResult.value : []);
      setLessons(lessonsResult.status === 'fulfilled' ? lessonsResult.value : []);
    } catch {
      toast({ title: 'Erro ao carregar apostilas', status: 'error' });
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getLessonTitle = (lessonId: string) =>
    lessons.find((lesson) => String(lesson.id) === String(lessonId))?.title || '—';

  const handleOpenForm = (lessonBook?: LessonBook) => {
    if (lessonBook) {
      setEditingLessonBook(lessonBook);
      setFormData({
        lessonId: lessonBook.lessonId || '',
        title: lessonBook.title || '',
        subtitle: lessonBook.subtitle || '',
        pdfUrl: lessonBook.pdfUrl || '',
      });
    } else {
      setEditingLessonBook(null);
      setFormData(INITIAL_FORM);
    }

    onOpen();
  };

  const handleSave = async () => {
    if (!formData.lessonId || !formData.title.trim() || !formData.pdfUrl.trim()) {
      toast({ title: 'Preencha lesson, título e PDF URL', status: 'warning' });
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        lessonId: formData.lessonId,
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim() || undefined,
        pdfUrl: formData.pdfUrl.trim(),
      };

      if (editingLessonBook) {
        await lessonBookService.update(editingLessonBook.id, payload);
        toast({ title: 'Apostila atualizada com sucesso', status: 'success' });
      } else {
        await lessonBookService.create(payload);
        toast({ title: 'Apostila criada com sucesso', status: 'success' });
      }

      onClose();
      loadData();
    } catch (error) {
      toast({ title: getErrorMessage(error, 'Erro ao salvar apostila'), status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!lessonBookToDelete) return;

    setIsLoading(true);
    try {
      await lessonBookService.delete(lessonBookToDelete.id);
      toast({ title: 'Apostila excluída com sucesso', status: 'success' });
      onDeleteClose();
      loadData();
    } catch (error) {
      toast({ title: getErrorMessage(error, 'Erro ao excluir apostila'), status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    {
      key: 'title',
      header: 'Título',
      render: (item: LessonBook) => <Text fontSize="sm">{item.title}</Text>,
    },
    {
      key: 'lessonId',
      header: 'Lesson',
      render: (item: LessonBook) => <Text fontSize="sm">{getLessonTitle(item.lessonId)}</Text>,
    },
    {
      key: 'chapters',
      header: 'Capítulos',
      render: (item: LessonBook) => <Text fontSize="sm">{item.chapters?.length ?? 0}</Text>,
    },
    {
      key: 'pdfUrl',
      header: 'PDF',
      render: (item: LessonBook) => (
        <Link href={item.pdfUrl} isExternal color="blue.500" fontSize="sm">
          <Flex align="center" gap={1}>
            <Icon as={MdOpenInNew} />
            <Text>Abrir</Text>
          </Flex>
        </Link>
      ),
    },
    {
      key: 'manage',
      header: 'Capítulos',
      render: (item: LessonBook) => (
        <Link as={NextLink} href={`/domains/lesson-books/${item.id}/chapters`} color="blue.500" fontSize="sm">
          Gerenciar capítulos
        </Link>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading size="lg" color="gray.700">Apostilas</Heading>
          <Text color="gray.500" mt={1}>Gerencie o catálogo de lesson books e seus vínculos com lessons.</Text>
        </Box>
        <Button leftIcon={<MdAdd />} colorScheme="orange" onClick={() => handleOpenForm()}>
          Nova apostila
        </Button>
      </Flex>

      <DataTable
        data={lessonBooks}
        columns={columns}
        onEdit={handleOpenForm}
        onDelete={(lessonBook) => {
          setLessonBookToDelete(lessonBook);
          onDeleteOpen();
        }}
      />

      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingLessonBook ? 'Editar apostila' : 'Nova apostila'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Lesson</FormLabel>
                <Select value={formData.lessonId} onChange={(e) => setFormData({ ...formData, lessonId: e.target.value })}>
                  <option value="">Selecione</option>
                  {lessons.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.title}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Título</FormLabel>
                <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              </FormControl>

              <FormControl>
                <FormLabel>Subtítulo</FormLabel>
                <Input value={formData.subtitle} onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })} />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>PDF URL</FormLabel>
                <Input
                  value={formData.pdfUrl}
                  onChange={(e) => setFormData({ ...formData, pdfUrl: e.target.value })}
                  placeholder="https://example.com/apostila.pdf"
                />
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
        title="Excluir apostila"
        message={`Deseja excluir a apostila "${lessonBookToDelete?.title || ''}"?`}
        onConfirm={handleDelete}
        isLoading={isLoading}
      />
    </DashboardLayout>
  );
}
