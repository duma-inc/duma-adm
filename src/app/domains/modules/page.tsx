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
  Textarea,
  VStack,
  Select,
  Switch
} from '@chakra-ui/react';
import { MdAdd } from 'react-icons/md';
import { DataTable } from '@/components/ui/DataTable';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { moduleService, Module } from '@/services/moduleService';
import { stageService, Stage } from '@/services/stageService';
import { skillService, Skill } from '@/services/skillService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function ModulesPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [moduleToDelete, setModuleToDelete] = useState<Module | null>(null);

  const { isOpen: isFormOpen, onOpen: onFormOpen, onClose: onFormClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const toast = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    orderIndex: '',
    isActive: true,
    stageId: '',
    skillId: ''
  });

  const loadData = async () => {
    try {
      const [modulesResult, stagesResult, skillsResult] = await Promise.allSettled([
        moduleService.getAll(),
        stageService.getAll(),
        skillService.getAll()
      ]);
      setModules(modulesResult.status === 'fulfilled' ? modulesResult.value : []);
      setStages(stagesResult.status   === 'fulfilled' ? stagesResult.value  : []);
      setSkills(skillsResult.status   === 'fulfilled' ? skillsResult.value  : []);
    } catch (error) {
      toast({ title: 'Erro ao carregar dados', status: 'error' });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenForm = (moduleItem?: Module) => {
    if (moduleItem) {
      setEditingModule(moduleItem);
      setFormData({
        title: moduleItem.title || '',
        description: moduleItem.description || '',
        orderIndex: moduleItem.orderIndex?.toString() || '',
        isActive: moduleItem.isActive !== undefined && moduleItem.isActive !== null ? moduleItem.isActive : true,
        stageId: moduleItem.stageId?.toString() || '',
        skillId: moduleItem.skillId?.toString() || ''
      });
    } else {
      setEditingModule(null);
      setFormData({ title: '', description: '', orderIndex: '', isActive: true, stageId: '', skillId: '' });
    }
    onFormOpen();
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const payload = {
        ...formData,
        orderIndex: formData.orderIndex ? Number(formData.orderIndex) : undefined,
        stageId: formData.stageId ? Number(formData.stageId) : undefined,
        skillId: formData.skillId ? Number(formData.skillId) : undefined,
      };

      if (editingModule) {
        await moduleService.update(editingModule.id, payload as Partial<Module>);
        toast({ title: 'Módulo atualizado com sucesso', status: 'success' });
      } else {
        await moduleService.create(payload as Partial<Module>);
        toast({ title: 'Módulo criado com sucesso', status: 'success' });
      }
      onFormClose();
      loadData();
    } catch (error) {
      toast({ title: 'Erro ao salvar', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!moduleToDelete) return;
    setIsLoading(true);
    try {
      await moduleService.delete(moduleToDelete.id);
      toast({ title: 'Módulo excluído com sucesso', status: 'success' });
      onDeleteClose();
      loadData();
    } catch (error) {
      toast({ title: 'Erro ao excluir', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    { key: 'title', header: 'Título' },
    { key: 'orderIndex', header: 'Ordem' },
    { key: 'isActive', header: 'Ativo', render: (item: Module) => (item.isActive ? 'Sim' : 'Não') },
    { key: 'stageId', header: 'Trilha', render: (item: Module) => stages.find(s => s.id === item.stageId)?.name || item.stageId },
  ];

  return (
    <DashboardLayout>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg" color="gray.700">Módulos</Heading>
        <Button leftIcon={<MdAdd />} colorScheme="primary" onClick={() => handleOpenForm()}>
          Novo Módulo
        </Button>
      </Flex>

      <DataTable
        columns={columns}
        data={modules}
        onEdit={(moduleItem) => handleOpenForm(moduleItem)}
        onDelete={(moduleItem) => {
          setModuleToDelete(moduleItem);
          onDeleteOpen();
        }}
      />

      <Modal isOpen={isFormOpen} onClose={onFormClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingModule ? 'Editar Módulo' : 'Novo Módulo'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Título</FormLabel>
                <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              </FormControl>
              
              <FormControl>
                <FormLabel>Trilha (Stage)</FormLabel>
                <Select
                  placeholder="Selecione a trilha (opcional)"
                  value={formData.stageId}
                  onChange={(e) => setFormData({ ...formData, stageId: e.target.value })}
                >
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>{stage.name}</option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Skill</FormLabel>
                <Select
                  placeholder="Selecione a skill (opcional)"
                  value={formData.skillId}
                  onChange={(e) => setFormData({ ...formData, skillId: e.target.value })}
                >
                  {skills.map((skill) => (
                    <option key={skill.id} value={skill.id}>{skill.name}</option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Descrição</FormLabel>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </FormControl>

              <FormControl>
                <FormLabel>Ordem (Index)</FormLabel>
                <Input type="number" value={formData.orderIndex} onChange={(e) => setFormData({ ...formData, orderIndex: e.target.value })} />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel htmlFor="is-active" mb="0">
                  Módulo Ativo?
                </FormLabel>
                <Switch id="is-active" isChecked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} />
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
        title="Excluir Módulo"
      />
    </DashboardLayout>
  );
}
