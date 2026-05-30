'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
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
  Select,
} from '@chakra-ui/react';
import { MdAdd } from 'react-icons/md';
import { DataTable } from '@/components/ui/DataTable';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { teacherService, Teacher } from '@/services/teacherService';
import { userService, User } from '@/services/userService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const INITIAL_FORM = {
  userId: '',
  bio: '',
  profilePictureUrl: '',
  timezone: '',
};

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const { isOpen: isFormOpen, onOpen: onFormOpen, onClose: onFormClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const toast = useToast();
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, []);  // toastRef evita loop infinito

  useEffect(() => {
    const loadData = async () => {
      try {
        const [teachersResult, usersResult] = await Promise.allSettled([
          teacherService.getAll(),
          userService.getAll(),
        ]);
        setTeachers(teachersResult.status === 'fulfilled' ? teachersResult.value : []);
        setUsers(usersResult.status       === 'fulfilled' ? usersResult.value   : []);
      } catch {
        toastRef.current({ title: 'Erro ao carregar colaboradores e usuários', status: 'error' });
      }
    };

    loadData();
  }, []);

  const getUserLabel = (userId: string) => {
    const user = users.find((item) => item.id === userId);
    return user ? `${user.name} (${user.email})` : userId;
  };

  const handleOpenForm = (teacher?: Teacher) => {
    if (teacher) {
      setEditingTeacher(teacher);
      setFormData({
        userId: teacher.userId || '',
        bio: teacher.bio || '',
        profilePictureUrl: teacher.profilePictureUrl || '',
        timezone: teacher.timezone || '',
      });
    } else {
      setEditingTeacher(null);
      setFormData(INITIAL_FORM);
    }

    onFormOpen();
  };

  const loadTeachers = async () => {
    const teachersData = await teacherService.getAll();
    setTeachers(teachersData);
  };

  const handleSave = async () => {
    if (!formData.userId) {
      toastRef.current({ title: 'Usuário é obrigatório', status: 'warning' });
      return;
    }

    setIsLoading(true);
    try {
      if (editingTeacher) {
        await teacherService.update(editingTeacher.id, formData);
        toastRef.current({ title: 'Colaborador atualizado com sucesso', status: 'success' });
      } else {
        await teacherService.create(formData);
        toastRef.current({ title: 'Colaborador adicionado com sucesso', status: 'success' });
      }

      onFormClose();
      await loadTeachers();
    } catch {
      toastRef.current({ title: 'Erro ao salvar colaborador', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!teacherToDelete) return;

    setIsLoading(true);
    try {
      await teacherService.delete(teacherToDelete.id);
      toastRef.current({ title: 'Colaborador removido com sucesso', status: 'success' });
      onDeleteClose();
      await loadTeachers();
    } catch {
      toastRef.current({ title: 'Erro ao remover colaborador', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    {
      key: 'userId',
      header: 'Usuário',
      render: (item: Teacher) => getUserLabel(item.userId),
    },
    {
      key: 'bio',
      header: 'Bio',
      render: (item: Teacher) => item.bio || '—',
    },
    {
      key: 'timezone',
      header: 'Fuso Horário',
      render: (item: Teacher) => item.timezone || '—',
    },
    {
      key: 'profilePictureUrl',
      header: 'Foto',
      render: (item: Teacher) => item.profilePictureUrl || '—',
    },
  ];

  return (
    <DashboardLayout>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg" color="gray.700">Colaboradores</Heading>
        <Button leftIcon={<MdAdd />} colorScheme="primary" onClick={() => handleOpenForm()}>
          Adicionar Colaborador
        </Button>
      </Flex>

      <DataTable
        columns={columns}
        data={teachers}
        onEdit={(teacher) => handleOpenForm(teacher)}
        onDelete={(teacher) => {
          setTeacherToDelete(teacher);
          onDeleteOpen();
        }}
      />

      <Modal isOpen={isFormOpen} onClose={onFormClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingTeacher ? 'Editar Colaborador' : 'Adicionar Colaborador'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Usuário</FormLabel>
                <Select
                  placeholder="Selecione um usuário"
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  isDisabled={!!editingTeacher}
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Bio</FormLabel>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                />
              </FormControl>

              <FormControl>
                <FormLabel>URL da Foto de Perfil</FormLabel>
                <Input
                  value={formData.profilePictureUrl}
                  onChange={(e) => setFormData({ ...formData, profilePictureUrl: e.target.value })}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Fuso Horário</FormLabel>
                <Input
                  value={formData.timezone}
                  placeholder="America/Sao_Paulo"
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onFormClose} isDisabled={isLoading}>Cancelar</Button>
            <Button colorScheme="primary" onClick={handleSave} isLoading={isLoading}>Salvar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ConfirmDeleteModal
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        onConfirm={handleDelete}
        isLoading={isLoading}
        title="Remover Colaborador"
      />
    </DashboardLayout>
  );
}
