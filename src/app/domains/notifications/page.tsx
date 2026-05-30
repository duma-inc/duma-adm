'use client'

import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
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
  Textarea,
  VStack,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { MdAdd, MdNotifications } from 'react-icons/md';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/DataTable';
import { notificationService, NotificationResponse } from '@/services/notificationService';
import { studentService, Student } from '@/services/studentService';

const INITIAL_FORM = {
  studentId: '',
  title: '',
  message: '',
  type: 'GENERAL' as 'GENERAL' | 'TUTOR_FEEDBACK',
  referenceId: '',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, []);  // toastRef evita loop infinito

  const loadAll = useCallback(async () => {
    try {
      const [notificationsRes, studentsRes] = await Promise.allSettled([
        notificationService.getAll(),
        studentService.getAll(),
      ]);

      setNotifications(notificationsRes.status === 'fulfilled' ? notificationsRes.value : []);
      setStudents(studentsRes.status === 'fulfilled' ? studentsRes.value : []);
    } catch {
      toastRef.current({ title: 'Erro ao carregar dados', status: 'error' });
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleOpenModal = () => {
    setFormData(INITIAL_FORM);
    onOpen();
  };

  const handleSendNotification = async () => {
    if (!formData.studentId || !formData.title.trim() || !formData.message.trim() || !formData.type) {
      toastRef.current({ title: 'Por favor, preencha todos os campos obrigatórios.', status: 'warning' });
      return;
    }

    setIsLoading(true);
    try {
      await notificationService.create({
        studentId: formData.studentId,
        title: formData.title.trim(),
        message: formData.message.trim(),
        type: formData.type,
        referenceId: formData.referenceId.trim() || undefined,
      });

      toastRef.current({ title: 'Notificação enviada com sucesso!', status: 'success' });
      onClose();
      loadAll();
    } catch {
      toastRef.current({ title: 'Erro ao enviar notificação.', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const getStudentLabel = (studentId: string) => {
    const student = students.find((s) => s.user.id === studentId);
    if (!student) return 'Desconhecido';
    return `${student.user.name} (${student.user.email})`;
  };

  const formatTypeLabel = (type: string) => {
    switch (type) {
      case 'TUTOR_FEEDBACK':
        return 'Tutor';
      case 'GENERAL':
        return 'Geral';
      case 'EXERCISE_SUBMITTED':
        return 'Exercício Enviado';
      case 'TEST_COMPLETED':
        return 'Teste Concluído';
      default:
        return type;
    }
  };

  const columns = [
    {
      key: 'studentId',
      header: 'Destinatário',
      render: (item: NotificationResponse) => (
        <Text fontSize="sm">{getStudentLabel(item.studentId)}</Text>
      ),
    },
    {
      key: 'title',
      header: 'Título',
      render: (item: NotificationResponse) => (
        <Text fontSize="sm" fontWeight="medium">{item.title}</Text>
      ),
    },
    {
      key: 'message',
      header: 'Mensagem',
      render: (item: NotificationResponse) => (
        <Text fontSize="sm" color="gray.600" maxW="300px" isTruncated>{item.message}</Text>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      render: (item: NotificationResponse) => (
        <Text fontSize="sm">{formatTypeLabel(item.type)}</Text>
      ),
    },
    {
      key: 'createdAt',
      header: 'Enviada em',
      render: (item: NotificationResponse) => {
        const date = new Date(item.createdAt);
        return (
          <Text fontSize="sm">
            {Number.isNaN(date.getTime()) ? item.createdAt : date.toLocaleString('pt-BR')}
          </Text>
        );
      },
    },
  ];

  return (
    <DashboardLayout>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading size="lg" color="gray.700">Notificações</Heading>
          <Text color="gray.500" mt={1}>
            Envie notificações diretas para os alunos e acompanhe o histórico de envios.
          </Text>
        </Box>
        <Button leftIcon={<Icon as={MdAdd} />} colorScheme="orange" onClick={handleOpenModal}>
          Nova Notificação
        </Button>
      </Flex>

      <DataTable columns={columns} data={notifications} />

      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Nova Notificação</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Aluno Destinatário</FormLabel>
                <Select
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  placeholder="Selecione o aluno"
                >
                  {students.map((student) => (
                    <option key={student.user.id} value={student.user.id}>
                      {student.user.name} - {student.user.email}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Tipo de Notificação</FormLabel>
                <Select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as 'GENERAL' | 'TUTOR_FEEDBACK' })
                  }
                >
                  <option value="GENERAL">Geral</option>
                  <option value="TUTOR_FEEDBACK">Tutor</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Título</FormLabel>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="ex: Feedback de redação"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Mensagem</FormLabel>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Escreva a mensagem da notificação..."
                  rows={4}
                />
              </FormControl>

              <FormControl>
                <FormLabel>ID de Referência (Opcional)</FormLabel>
                <Input
                  value={formData.referenceId}
                  onChange={(e) => setFormData({ ...formData, referenceId: e.target.value })}
                  placeholder="ex: ID de uma entrega ou tarefa"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose} isDisabled={isLoading}>
              Cancelar
            </Button>
            <Button
              colorScheme="orange"
              leftIcon={<Icon as={MdNotifications} />}
              onClick={handleSendNotification}
              isLoading={isLoading}
            >
              Enviar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
}
