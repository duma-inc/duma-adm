'use client'

import React, { useCallback, useEffect, useState, useRef } from 'react';
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
import { fileService } from '@/services/fileService';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingMessage, setUploadingMessage] = useState('');

  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const toast = useToast();
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, []);  // toastRef evita loop infinito

  const loadData = useCallback(async () => {
    try {
      const [lessonBooksResult, lessonsResult] = await Promise.allSettled([
        lessonBookService.getAll(),
        lessonService.getAll(),
      ]);

      setLessonBooks(lessonBooksResult.status === 'fulfilled' ? lessonBooksResult.value : []);
      setLessons(lessonsResult.status === 'fulfilled' ? lessonsResult.value : []);
    } catch {
      toastRef.current({ title: 'Erro ao carregar apostilas', status: 'error' });
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getLessonTitle = (lessonId: string) =>
    lessons.find((lesson) => String(lesson.id) === String(lessonId))?.title || '—';

  const handleOpenForm = (lessonBook?: LessonBook) => {
    setSelectedFile(null);
    setUploadingMessage('');
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
    if (!formData.lessonId || !formData.title.trim()) {
      toastRef.current({ title: 'Preencha lesson e título', status: 'warning' });
      return;
    }

    setIsLoading(true);
    try {
      let resolvedPdfUrl = formData.pdfUrl;

      if (selectedFile) {
        setUploadingMessage('Fazendo upload do arquivo PDF...');
        const uploadIntent = await fileService.createUploadIntent({
          fileName: selectedFile.name,
          contentType: selectedFile.type || 'application/pdf',
          size: selectedFile.size,
        });
        await fileService.uploadToStorage(uploadIntent.uploadUrl, selectedFile);
        const completeRes = await fileService.completeUpload(uploadIntent.id);
        resolvedPdfUrl = completeRes.publicUrl;
      }

      setUploadingMessage('Salvando dados da apostila...');
      const payload = {
        lessonId: formData.lessonId,
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim() || undefined,
        pdfUrl: resolvedPdfUrl || undefined,
      };

      if (editingLessonBook) {
        await lessonBookService.update(editingLessonBook.id, payload);
        toastRef.current({ title: 'Apostila atualizada com sucesso', status: 'success' });
      } else {
        await lessonBookService.create(payload);
        toastRef.current({ title: 'Apostila criada com sucesso', status: 'success' });
      }

      onClose();
      loadData();
    } catch (error) {
      toastRef.current({ title: getErrorMessage(error, 'Erro ao salvar apostila'), status: 'error' });
    } finally {
      setIsLoading(false);
      setUploadingMessage('');
    }
  };

  const handleDelete = async () => {
    if (!lessonBookToDelete) return;

    setIsLoading(true);
    try {
      await lessonBookService.delete(lessonBookToDelete.id);
      toastRef.current({ title: 'Apostila excluída com sucesso', status: 'success' });
      onDeleteClose();
      loadData();
    } catch (error) {
      toastRef.current({ title: getErrorMessage(error, 'Erro ao excluir apostila'), status: 'error' });
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
        item.pdfUrl ? (
          <Link href={item.pdfUrl} isExternal color="blue.500" fontSize="sm">
            <Flex align="center" gap={1}>
              <Icon as={MdOpenInNew} />
              <Text>Abrir</Text>
            </Flex>
          </Link>
        ) : (
          <Text fontSize="sm" color="gray.400">—</Text>
        )
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

              <FormControl>
                <FormLabel>Upload da Apostila (PDF)</FormLabel>
                <Input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  accept=".pdf"
                  p={1}
                />
                <Text mt={2} fontSize="xs" color="gray.500">
                  {editingLessonBook?.pdfUrl
                    ? `Arquivo atual: ${editingLessonBook.pdfUrl}. Selecione outro arquivo para substituir.`
                    : 'Selecione o arquivo PDF para upload automático no storage Cloudflare.'}
                </Text>
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
        description={`Deseja excluir a apostila "${lessonBookToDelete?.title || ''}"?`}
        onConfirm={handleDelete}
        isLoading={isLoading}
      />
      <LoadingOverlay isOpen={!!uploadingMessage} message={uploadingMessage} />
    </DashboardLayout>
  );
}
