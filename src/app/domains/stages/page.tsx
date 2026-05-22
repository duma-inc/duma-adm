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
  Select,
  Textarea,
  VStack,
  Switch,
  HStack,
} from '@chakra-ui/react';
import { MdAdd } from 'react-icons/md';
import { DataTable } from '@/components/ui/DataTable';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { stageService, Stage } from '@/services/stageService';
import { skillService, Skill } from '@/services/skillService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function StagesPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [stageToDelete, setStageToDelete] = useState<Stage | null>(null);

  const { isOpen: isFormOpen, onOpen: onFormOpen, onClose: onFormClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    shortDescription: '',
    fullDescription: '',
    iconUrl: '',
    color: '',
    orderIndex: '',
    isActive: true,
    skillId: '',
  });

  const loadStages = async () => {
    try {
      const [stagesResult, skillsResult] = await Promise.allSettled([
        stageService.getAll(),
        skillService.getAll(),
      ]);
      setStages(stagesResult.status === 'fulfilled' ? stagesResult.value : []);
      setSkills(skillsResult.status === 'fulfilled' ? skillsResult.value : []);
    } catch {
      toast({ title: 'Erro ao carregar trilhas', status: 'error' });
    }
  };

  useEffect(() => {
    loadStages();
  }, []);

  const handleOpenForm = (stage?: Stage) => {
    if (stage) {
      setEditingStage(stage);
      setFormData({
        name: stage.name || '',
        slug: stage.slug || '',
        shortDescription: stage.shortDescription || '',
        fullDescription: stage.fullDescription || '',
        iconUrl: stage.iconUrl || '',
        color: stage.color || '',
        orderIndex: stage.orderIndex?.toString() || '',
        isActive: stage.isActive ?? true,
        skillId: stage.skillId?.toString() || '',
      });
    } else {
      setEditingStage(null);
      setFormData({ name: '', slug: '', shortDescription: '', fullDescription: '', iconUrl: '', color: '', orderIndex: '', isActive: true, skillId: '' });
    }
    onFormOpen();
  };

  const handleSave = async () => {
    if (!formData.skillId) {
      toast({ title: 'Skill é obrigatória', status: 'warning' });
      return;
    }

    setIsLoading(true);
    try {
      const payload: Partial<Stage> = {
        name: formData.name,
        slug: formData.slug,
        shortDescription: formData.shortDescription,
        fullDescription: formData.fullDescription || undefined,
        iconUrl: formData.iconUrl || undefined,
        color: formData.color || undefined,
        orderIndex: formData.orderIndex ? Number(formData.orderIndex) : undefined,
        isActive: formData.isActive,
        skillId: Number(formData.skillId),
      };
      if (editingStage) {
        await stageService.update(editingStage.id, payload);
        toast({ title: 'Trilha atualizada com sucesso', status: 'success' });
      } else {
        await stageService.create(payload);
        toast({ title: 'Trilha criada com sucesso', status: 'success' });
      }
      onFormClose();
      loadStages();
    } catch (error) {
      toast({ title: 'Erro ao salvar', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!stageToDelete) return;
    setIsLoading(true);
    try {
      await stageService.delete(stageToDelete.id);
      toast({ title: 'Trilha excluída com sucesso', status: 'success' });
      onDeleteClose();
      loadStages();
    } catch (error) {
      toast({ title: 'Erro ao excluir', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    { key: 'orderIndex', header: 'Ordem' },
    { key: 'name', header: 'Nome' },
    { key: 'skillName', header: 'Skill', render: (item: Stage) => item.skillName || skills.find((skill) => skill.id === item.skillId)?.name || '—' },
    { key: 'slug', header: 'Slug' },
    { key: 'shortDescription', header: 'Descrição' },
    { key: 'color', header: 'Cor', render: (item: Stage) => item.color
      ? <HStack spacing={2}><Box w={4} h={4} borderRadius="sm" bg={item.color} border="1px solid" borderColor="gray.200" /><span>{item.color}</span></HStack>
      : '—'
    },
    { key: 'isActive', header: 'Ativa', render: (item: Stage) => item.isActive ? 'Sim' : 'Não' },
  ];

  return (
    <DashboardLayout>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg" color="gray.700">Stages</Heading>
        <Button leftIcon={<MdAdd />} colorScheme="primary" onClick={() => handleOpenForm()}>
          Nova Trilha
        </Button>
      </Flex>

      <DataTable
        columns={columns}
        data={stages}
        onEdit={(stage) => handleOpenForm(stage)}
        onDelete={(stage) => {
          setStageToDelete(stage);
          onDeleteOpen();
        }}
      />

      <Modal isOpen={isFormOpen} onClose={onFormClose} size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingStage ? 'Editar Trilha' : 'Nova Trilha'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Nome</FormLabel>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Slug</FormLabel>
                <Input value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Skill</FormLabel>
                <Select
                  placeholder="Selecione a skill"
                  value={formData.skillId}
                  onChange={(e) => setFormData({ ...formData, skillId: e.target.value })}
                >
                  {skills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <HStack w="full" spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Descrição Curta</FormLabel>
                  <Input value={formData.shortDescription} onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })} />
                </FormControl>
                <FormControl>
                  <FormLabel>Ordem (Index)</FormLabel>
                  <Input type="number" value={formData.orderIndex} onChange={(e) => setFormData({ ...formData, orderIndex: e.target.value })} />
                </FormControl>
              </HStack>
              <HStack w="full" spacing={4}>
                <FormControl>
                  <FormLabel>Cor (hex ou nome)</FormLabel>
                  <HStack>
                    <Input
                      type="color"
                      w="48px"
                      p={1}
                      h="40px"
                      value={formData.color || '#FDA91E'}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    />
                    <Input
                      placeholder="#FDA91E"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    />
                  </HStack>
                </FormControl>
                <FormControl>
                  <FormLabel>URL do Ícone</FormLabel>
                  <Input value={formData.iconUrl} onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })} />
                </FormControl>
              </HStack>
              <FormControl>
                <FormLabel>Descrição Completa (Markdown)</FormLabel>
                <Textarea rows={8} value={formData.fullDescription} onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value })} />
              </FormControl>
              <FormControl display="flex" alignItems="center">
                <FormLabel htmlFor="stage-active" mb="0">Trilha Ativa?</FormLabel>
                <Switch id="stage-active" isChecked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} />
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
        title="Excluir Trilha"
      />
    </DashboardLayout>
  );
}
