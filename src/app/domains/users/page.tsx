'use client'

import React, { useEffect, useState } from 'react';
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
  VStack,
  Select,
  Text
} from '@chakra-ui/react';
import { MdAdd, MdContentCopy } from 'react-icons/md';
import { DataTable } from '@/components/ui/DataTable';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { adminUserService, AdminUser } from '@/services/adminUserService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  const { isOpen: isFormOpen, onOpen: onFormOpen, onClose: onFormClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isPasswordOpen, onOpen: onPasswordOpen, onClose: onPasswordClose } = useDisclosure();
  
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    role: 'STUDENT'
  });

  const loadData = async () => {
    try {
      const usersData = await adminUserService.getAll();
      setUsers(usersData);
    } catch (error) {
      toast({ title: 'Erro ao carregar usuários', status: 'error' });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenForm = (user?: AdminUser) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        birthDate: user.birthDate || '',
        role: user.role
      });
    } else {
      setEditingUser(null);
      setFormData({ name: '', email: '', phone: '', birthDate: '', role: 'STUDENT' });
    }
    onFormOpen();
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const payload: any = { ...formData };
      if (!payload.phone) delete payload.phone;
      if (!payload.birthDate) delete payload.birthDate;

      if (editingUser) {
        await adminUserService.update(editingUser.id, payload);
        toast({ title: 'Usuário atualizado com sucesso', status: 'success' });
        onFormClose();
      } else {
        const response = await adminUserService.create(payload);
        toast({ title: 'Usuário criado com sucesso', status: 'success' });
        if (response.temporaryPassword) {
            setCreatedPassword(response.temporaryPassword);
            onPasswordOpen();
        }
        onFormClose();
      }
      loadData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Erro ao salvar o usuário';
      toast({ title: errorMessage, status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    setIsLoading(true);
    try {
      await adminUserService.delete(userToDelete.id);
      toast({ title: 'Usuário removido com sucesso', status: 'success' });
      onDeleteClose();
      loadData();
    } catch (error) {
      toast({ title: 'Erro ao remover', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPassword = () => {
    if (createdPassword) {
      navigator.clipboard.writeText(createdPassword);
      toast({ title: 'Senha copiada!', status: 'info' });
    }
  };

  const columns = [
    { key: 'name', header: 'Nome' },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Papel', render: (u: AdminUser) => u.role === 'STUDENT' ? 'Estudante' : 'Colaborador' }
  ];

  return (
    <DashboardLayout>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg" color="gray.700">Usuários</Heading>
        <Button leftIcon={<MdAdd />} colorScheme="primary" onClick={() => handleOpenForm()}>
          Adicionar Usuário
        </Button>
      </Flex>

      <DataTable
        columns={columns}
        data={users}
        onEdit={(user) => handleOpenForm(user)}
        onDelete={(user) => {
          setUserToDelete(user);
          onDeleteOpen();
        }}
      />

      <Modal isOpen={isFormOpen} onClose={onFormClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingUser ? 'Editar Usuário' : 'Adicionar Usuário'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Nome</FormLabel>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </FormControl>
              <FormControl>
                <FormLabel>Telefone</FormLabel>
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </FormControl>
              <FormControl>
                <FormLabel>Data de Nascimento</FormLabel>
                <Input type="date" value={formData.birthDate} onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Papel</FormLabel>
                <Select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                    <option value="STUDENT">Estudante</option>
                    <option value="COLLABORATOR">Colaborador (Teacher)</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onFormClose} isDisabled={isLoading}>Cancelar</Button>
            <Button colorScheme="primary" onClick={handleSave} isLoading={isLoading}>Salvar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isPasswordOpen} onClose={onPasswordClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Usuário Criado</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={4}>O usuário foi criado no sistema e no Keycloak. Guarde a senha gerada para enviá-la ao usuário, pois ela não será exibida novamente.</Text>
            <Flex align="center" bg="gray.100" p={3} borderRadius="md" justify="space-between">
                <Text fontWeight="bold" fontFamily="monospace" fontSize="lg">{createdPassword}</Text>
                <Button size="sm" onClick={handleCopyPassword} leftIcon={<MdContentCopy />}>Copiar</Button>
            </Flex>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="primary" onClick={onPasswordClose}>Entendi</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ConfirmDeleteModal
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        onConfirm={handleDelete}
        isLoading={isLoading}
        title="Remover Usuário"
      />
    </DashboardLayout>
  );
}
