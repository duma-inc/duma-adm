'use client'

import React, { useEffect, useMemo, useState } from 'react';
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
  FormHelperText,
  Input,
  Select,
  Textarea,
  VStack,
  Switch,
  HStack,
} from '@chakra-ui/react';
import axios from 'axios';
import { MdAdd } from 'react-icons/md';
import { DataTable } from '@/components/ui/DataTable';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { stageService, Stage } from '@/services/stageService';
import { skillService, Skill } from '@/services/skillService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

/*
 * A tabela stages tem unicidade por skill em (name), (slug) e (order_index). O backend deixa a
 * violacao subir crua do Postgres, entao o admin recebia so o 409 com o texto do Hibernate.
 * Traduz pelo nome da constraint para a mensagem ficar acionavel.
 */
const UNIQUE_CONSTRAINT_MESSAGES: Record<string, string> = {
  stages_name_skill_unique: 'Já existe uma trilha com esse nome nesta skill.',
  stages_slug_skill_unique: 'Já existe uma trilha com esse slug nesta skill.',
  stages_order_index_skill_unique: 'Já existe uma trilha com essa ordem nesta skill.',
};

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const responseMessage = error.response?.data?.message;
    if (typeof responseMessage === 'string' && responseMessage.trim()) {
      const violated = Object.keys(UNIQUE_CONSTRAINT_MESSAGES).find((constraint) =>
        responseMessage.includes(constraint),
      );
      if (violated) {
        return UNIQUE_CONSTRAINT_MESSAGES[violated];
      }
      return responseMessage;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

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

  /* Trilhas da skill selecionada, sem a que esta sendo editada: base das checagens de unicidade. */
  const siblingStages = useMemo(() => {
    const skillId = Number(formData.skillId);
    if (!skillId) return [];
    return stages.filter((stage) => stage.skillId === skillId && stage.id !== editingStage?.id);
  }, [stages, formData.skillId, editingStage]);

  /* Proxima ordem livre na skill, usada como sugestao ao criar. */
  const nextOrderIndex = useMemo(() => {
    const usedOrders = siblingStages
      .map((stage) => stage.orderIndex)
      .filter((order): order is number => typeof order === 'number');
    return usedOrders.length ? Math.max(...usedOrders) + 1 : 1;
  }, [siblingStages]);

  const handleSelectSkill = (skillId: string) => {
    setFormData((previous) => {
      const next = { ...previous, skillId };
      // So preenche a ordem quando o campo esta vazio, para nao sobrescrever o que o admin digitou.
      if (!editingStage && skillId && !previous.orderIndex) {
        const usedOrders = stages
          .filter((stage) => stage.skillId === Number(skillId))
          .map((stage) => stage.orderIndex)
          .filter((order): order is number => typeof order === 'number');
        next.orderIndex = String(usedOrders.length ? Math.max(...usedOrders) + 1 : 1);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!formData.skillId) {
      toast({ title: 'Skill é obrigatória', status: 'warning' });
      return;
    }

    const name = formData.name.trim();
    const slug = formData.slug.trim();
    const shortDescription = formData.shortDescription.trim();
    const orderIndex = Number(formData.orderIndex);

    if (!name || !slug || !shortDescription) {
      toast({ title: 'Nome, slug e descrição curta são obrigatórios', status: 'warning' });
      return;
    }
    // order_index e NOT NULL no banco; sem isso o backend estouraria com erro de servidor.
    if (!formData.orderIndex.trim() || !Number.isInteger(orderIndex) || orderIndex < 0) {
      toast({ title: 'Informe uma ordem válida (número inteiro)', status: 'warning' });
      return;
    }

    // Espelha as constraints unicas de stages para explicar o conflito antes do 409 do backend.
    if (siblingStages.some((stage) => stage.name?.trim().toLowerCase() === name.toLowerCase())) {
      toast({ title: UNIQUE_CONSTRAINT_MESSAGES.stages_name_skill_unique, status: 'warning' });
      return;
    }
    if (siblingStages.some((stage) => stage.slug?.trim().toLowerCase() === slug.toLowerCase())) {
      toast({ title: UNIQUE_CONSTRAINT_MESSAGES.stages_slug_skill_unique, status: 'warning' });
      return;
    }
    const orderConflict = siblingStages.find((stage) => stage.orderIndex === orderIndex);
    if (orderConflict) {
      toast({
        title: UNIQUE_CONSTRAINT_MESSAGES.stages_order_index_skill_unique,
        description: `A ordem ${orderIndex} já é usada por "${orderConflict.name}". A próxima livre é ${nextOrderIndex}.`,
        status: 'warning',
        duration: 6000,
      });
      return;
    }

    setIsLoading(true);
    try {
      const payload: Partial<Stage> = {
        name,
        slug,
        shortDescription,
        fullDescription: formData.fullDescription || undefined,
        iconUrl: formData.iconUrl || undefined,
        color: formData.color || undefined,
        orderIndex,
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
      toast({
        title: 'Erro ao salvar',
        description: getErrorMessage(error, 'Não foi possível salvar a trilha.'),
        status: 'error',
        duration: 6000,
      });
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
      toast({
        title: 'Erro ao excluir',
        description: getErrorMessage(error, 'A trilha pode estar vinculada a lições, módulos ou turmas.'),
        status: 'error',
        duration: 6000,
      });
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
                  onChange={(e) => handleSelectSkill(e.target.value)}
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
                <FormControl isRequired>
                  <FormLabel>Ordem (Index)</FormLabel>
                  <Input type="number" min={0} value={formData.orderIndex} onChange={(e) => setFormData({ ...formData, orderIndex: e.target.value })} />
                  {formData.skillId && (
                    <FormHelperText fontSize="xs">
                      Deve ser única dentro da skill. Próxima livre: {nextOrderIndex}.
                    </FormHelperText>
                  )}
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
