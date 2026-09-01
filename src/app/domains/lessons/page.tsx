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
  InputGroup,
  InputLeftElement,
  Textarea,
  VStack,
  HStack,
  Select,
  Switch,
  Tag,
  TagLabel,
  TagCloseButton,
  Text,
  Icon,
} from '@chakra-ui/react';
import { MdAdd, MdSearch, MdFilterList, MdClose } from 'react-icons/md';
import { DataTable } from '@/components/ui/DataTable';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { lessonService, Lesson } from '@/services/lessonService';
import { moduleService, Module } from '@/services/moduleService';
import { stageService, Stage } from '@/services/stageService';
import { skillService, Skill } from '@/services/skillService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function LessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);

  const [filterTitle, setFilterTitle] = useState('');
  const [filterStageId, setFilterStageId] = useState('');
  const [filterSkillId, setFilterSkillId] = useState('');

  const filteredLessons = lessons.filter((lesson) => {
    const matchTitle = !filterTitle || lesson.title.toLowerCase().includes(filterTitle.toLowerCase());
    const matchStage = !filterStageId || lesson.stageId === filterStageId;
    const matchSkill = !filterSkillId || lesson.skillId === filterSkillId;
    return matchTitle && matchStage && matchSkill;
  });

  const hasActiveFilters = !!filterTitle || !!filterStageId || !!filterSkillId;

  const clearFilters = () => {
    setFilterTitle('');
    setFilterStageId('');
    setFilterSkillId('');
  };

  const { isOpen: isFormOpen, onOpen: onFormOpen, onClose: onFormClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const toast = useToast();

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    orderIndex: '',
    isActive: true,
    moduleId: '',
    stageId: '',
    skillId: '',
    videoUrl: '',
    durationInMinutes: ''
  });

  const loadData = async () => {
    try {
      const [lessonsResult, modulesResult, stagesResult, skillsResult] = await Promise.allSettled([
        lessonService.getAll(),
        moduleService.getAll(),
        stageService.getAll(),
        skillService.getAll()
      ]);
      const lessonsData = lessonsResult.status === 'fulfilled' ? lessonsResult.value : [];
      const modulesData = modulesResult.status === 'fulfilled' ? modulesResult.value : [];
      const stagesData  = stagesResult.status  === 'fulfilled' ? stagesResult.value  : [];
      const skillsData  = skillsResult.status  === 'fulfilled' ? skillsResult.value  : [];
      const sortedLessons = [...lessonsData].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
      setLessons(sortedLessons);
      setModules(modulesData);
      setStages(stagesData);
      setSkills(skillsData);
    } catch (error) {
      toast({ title: 'Erro ao carregar dados', status: 'error' });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenForm = (lesson?: Lesson) => {
    if (lesson) {
      setEditingLesson(lesson);
      setFormData({
        title: lesson.title || '',
        content: lesson.content || '',
        orderIndex: lesson.orderIndex?.toString() || '',
        isActive: lesson.isActive ?? true,
        moduleId: lesson.moduleId || '',
        stageId: lesson.stageId || '',
        skillId: lesson.skillId || '',
        videoUrl: lesson.videoUrl || '',
        durationInMinutes: lesson.durationInMinutes?.toString() || ''
      });
    } else {
      setEditingLesson(null);
      setFormData({ title: '', content: '', orderIndex: '', isActive: true, moduleId: '', stageId: '', skillId: '', videoUrl: '', durationInMinutes: '' });
    }
    onFormOpen();
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({ title: 'Título é obrigatório', status: 'warning' });
      return;
    }
    if (!editingLesson && !formData.orderIndex) {
      toast({ title: 'Ordem é obrigatória para criar uma lição', status: 'warning' });
      return;
    }
    setIsLoading(true);
    try {
      const payload: Partial<Lesson> = {
        title: formData.title,
        content: formData.content || undefined,
        orderIndex: formData.orderIndex !== '' ? Number(formData.orderIndex) : undefined,
        isActive: formData.isActive,
        moduleId: formData.moduleId || undefined,
        stageId: formData.stageId || undefined,
        skillId: formData.skillId || undefined,
        videoUrl: formData.videoUrl || undefined,
        durationInMinutes: formData.durationInMinutes ? Number(formData.durationInMinutes) : undefined,
      };

      if (editingLesson) {
        await lessonService.update(editingLesson.id, payload);
        toast({ title: 'Lição atualizada com sucesso', status: 'success' });
      } else {
        await lessonService.create(payload as Partial<Lesson>);
        toast({ title: 'Lição criada com sucesso', status: 'success' });
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
    if (!lessonToDelete) return;
    setIsLoading(true);
    try {
      await lessonService.delete(lessonToDelete.id);
      toast({ title: 'Lição excluída com sucesso', status: 'success' });
      onDeleteClose();
      loadData();
    } catch (error) {
      toast({ title: 'Erro ao excluir', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    { key: 'orderIndex', header: 'Ordem' },
    { key: 'title', header: 'Título' },
    { key: 'moduleId', header: 'Módulo', render: (item: Lesson) => modules.find(m => String(m.id) === item.moduleId)?.title || '—' },
    { key: 'isActive', header: 'Ativa', render: (item: Lesson) => (item.isActive ? 'Sim' : 'Não') },
    { key: 'durationInMinutes', header: 'Duração (min)', render: (item: Lesson) => item.durationInMinutes ?? '—' },
  ];

  return (
    <DashboardLayout>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg" color="gray.700">Lições (Lessons)</Heading>
        <Button leftIcon={<MdAdd />} colorScheme="primary" onClick={() => handleOpenForm()}>
          Nova Lição
        </Button>
      </Flex>

      {/* Filtros */}
      <Box bg="white" borderRadius="lg" boxShadow="sm" p={4} mb={4}>
        <Flex align="center" gap={2} mb={3}>
          <Icon as={MdFilterList} color="gray.500" />
          <Text fontWeight="medium" fontSize="sm" color="gray.600">Filtros</Text>
          {hasActiveFilters && (
            <Button size="xs" variant="ghost" colorScheme="red" leftIcon={<Icon as={MdClose} />} onClick={clearFilters}>
              Limpar filtros
            </Button>
          )}
        </Flex>
        <HStack spacing={3} flexWrap="wrap">
          <InputGroup size="sm" maxW="280px">
            <InputLeftElement pointerEvents="none">
              <Icon as={MdSearch} color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Buscar por título..."
              value={filterTitle}
              onChange={(e) => setFilterTitle(e.target.value)}
              borderRadius="md"
            />
          </InputGroup>

          <Select
            size="sm"
            maxW="220px"
            placeholder="Todas as competências"
            value={filterSkillId}
            onChange={(e) => {
              setFilterSkillId(e.target.value);
              setFilterStageId('');
            }}
            borderRadius="md"
          >
            {skills.map((skill) => (
              <option key={skill.id} value={String(skill.id)}>{skill.name}</option>
            ))}
          </Select>

          <Select
            size="sm"
            maxW="220px"
            placeholder={filterSkillId ? 'Todas as trilhas' : 'Selecione uma competência'}
            value={filterStageId}
            onChange={(e) => setFilterStageId(e.target.value)}
            borderRadius="md"
            isDisabled={!filterSkillId}
          >
            {stages
              .filter((stage) => String(stage.skillId) === filterSkillId)
              .map((stage) => (
                <option key={stage.id} value={String(stage.id)}>{stage.name}</option>
              ))}
          </Select>
        </HStack>

        {hasActiveFilters && (
          <HStack mt={3} spacing={2} flexWrap="wrap">
            {filterTitle && (
              <Tag size="sm" colorScheme="blue" borderRadius="full">
                <TagLabel>Título: {filterTitle}</TagLabel>
                <TagCloseButton onClick={() => setFilterTitle('')} />
              </Tag>
            )}
            {filterSkillId && (
              <Tag size="sm" colorScheme="green" borderRadius="full">
                <TagLabel>Skill: {skills.find(s => String(s.id) === filterSkillId)?.name}</TagLabel>
                <TagCloseButton onClick={() => {
                  setFilterSkillId('');
                  setFilterStageId('');
                }} />
              </Tag>
            )}
            {filterStageId && (
              <Tag size="sm" colorScheme="purple" borderRadius="full">
                <TagLabel>Trilha: {stages.find(s => String(s.id) === filterStageId)?.name}</TagLabel>
                <TagCloseButton onClick={() => setFilterStageId('')} />
              </Tag>
            )}
            <Text fontSize="xs" color="gray.400">
              {filteredLessons.length} de {lessons.length} lições
            </Text>
          </HStack>
        )}
      </Box>

      <DataTable
        columns={columns}
        data={filteredLessons}
        onEdit={(lesson) => handleOpenForm(lesson)}
        onDelete={(lesson) => {
          setLessonToDelete(lesson);
          onDeleteOpen();
        }}
      />

      <Modal isOpen={isFormOpen} onClose={onFormClose} size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingLesson ? 'Editar Lição' : 'Nova Lição'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Título</FormLabel>
                <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              </FormControl>

              <FormControl isRequired={!editingLesson}>
                <FormLabel>Ordem (Index)</FormLabel>
                <Input
                  type="number"
                  placeholder="Ex: 1, 2, 3..."
                  value={formData.orderIndex}
                  onChange={(e) => setFormData({ ...formData, orderIndex: e.target.value })}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Módulo</FormLabel>
                <Select
                  placeholder="Selecione o módulo (opcional)"
                  value={formData.moduleId}
                  onChange={(e) => setFormData({ ...formData, moduleId: e.target.value })}
                >
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </Select>
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
                <FormLabel>URL do Vídeo</FormLabel>
                <Input value={formData.videoUrl} onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })} />
              </FormControl>

              <FormControl>
                <FormLabel>Duração (minutos)</FormLabel>
                <Input type="number" value={formData.durationInMinutes} onChange={(e) => setFormData({ ...formData, durationInMinutes: e.target.value })} />
              </FormControl>

              <FormControl>
                <FormLabel>Conteúdo (Markdown/HTML)</FormLabel>
                <Textarea rows={6} value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel htmlFor="is-active" mb="0">Lição Ativa?</FormLabel>
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
        title="Excluir Lição"
      />
    </DashboardLayout>
  );
}
