'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputRightElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Text,
  Tooltip,
  Link,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { MdAdd, MdFolder, MdOpenInNew } from 'react-icons/md';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/DataTable';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { resourceCategoryService, ResourceCategory } from '@/services/resourceCategoryService';
import { resourceService, Resource, ResourceMediaType } from '@/services/resourceService';
import { fileService } from '@/services/fileService';
import { skillService, Skill } from '@/services/skillService';
import { stageService, Stage } from '@/services/stageService';
import { lessonService, Lesson } from '@/services/lessonService';

const MEDIA_TYPE_LABELS: Record<ResourceMediaType, string> = {
  DOCUMENT: 'Documento',
  VIDEO: 'Vídeo',
  AUDIO: 'Áudio',
};

const INITIAL_RESOURCE_FORM = {
  title: '',
  skillId: '',
  stageId: '',
  lessonId: '',
  mediaType: 'DOCUMENT' as ResourceMediaType,
  resourceCategoryId: '',
  url: '',
};

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [resourceToDelete, setResourceToDelete] = useState<Resource | null>(null);
  const [resourceForm, setResourceForm] = useState(INITIAL_RESOURCE_FORM);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [editingCategory, setEditingCategory] = useState<ResourceCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<ResourceCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');

  const { isOpen: isResourceOpen, onOpen: onResourceOpen, onClose: onResourceClose } = useDisclosure();
  const { isOpen: isCategoryOpen, onOpen: onCategoryOpen, onClose: onCategoryClose } = useDisclosure();
  const { isOpen: isDeleteResourceOpen, onOpen: onDeleteResourceOpen, onClose: onDeleteResourceClose } = useDisclosure();
  const { isOpen: isDeleteCategoryOpen, onOpen: onDeleteCategoryOpen, onClose: onDeleteCategoryClose } = useDisclosure();
  const toast = useToast();

  const loadAll = useCallback(async () => {
    try {
      const [resourcesResult, categoriesResult, skillsResult, stagesResult, lessonsResult] = await Promise.allSettled([
        resourceService.getAll(),
        resourceCategoryService.getAll(),
        skillService.getAll(),
        stageService.getAll(),
        lessonService.getAll(),
      ]);
      setResources(resourcesResult.status     === 'fulfilled' ? resourcesResult.value    : []);
      setCategories(categoriesResult.status   === 'fulfilled' ? categoriesResult.value   : []);
      setSkills(skillsResult.status           === 'fulfilled' ? skillsResult.value       : []);
      setStages(stagesResult.status           === 'fulfilled' ? stagesResult.value       : []);
      setLessons(lessonsResult.status         === 'fulfilled' ? lessonsResult.value      : []);
    } catch {
      toast({ title: 'Erro ao carregar recursos', status: 'error' });
    }
  }, [toast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const filteredStages = useMemo(() => {
    if (!resourceForm.skillId) return stages;
    return stages.filter((stage) => String(stage.skillId) === resourceForm.skillId);
  }, [resourceForm.skillId, stages]);

  const filteredLessons = useMemo(() => {
    return lessons.filter((lesson) => {
      const matchesSkill = !resourceForm.skillId || String(lesson.skillId) === resourceForm.skillId;
      const matchesStage = !resourceForm.stageId || String(lesson.stageId) === resourceForm.stageId;
      return matchesSkill && matchesStage;
    });
  }, [lessons, resourceForm.skillId, resourceForm.stageId]);

  const getSkillLabel = (skillId?: number) =>
    skills.find((item) => Number(item.id) === Number(skillId))?.name || '—';

  const getStageLabel = (stageId?: number) =>
    stages.find((item) => Number(item.id) === Number(stageId))?.name || '—';

  const getLessonLabel = (lessonId?: string) =>
    lessons.find((item) => item.id === lessonId)?.title || '—';

  const getCategoryLabel = (categoryId?: number) =>
    categories.find((item) => Number(item.id) === Number(categoryId))?.name || '—';

  const handleOpenResource = (resource?: Resource) => {
    if (resource) {
      setEditingResource(resource);
      setResourceForm({
        title: resource.title || '',
        skillId: resource.skillId ? String(resource.skillId) : '',
        stageId: resource.stageId ? String(resource.stageId) : '',
        lessonId: resource.lessonId || '',
        mediaType: resource.mediaType || 'DOCUMENT',
        resourceCategoryId: resource.resourceCategoryId ? String(resource.resourceCategoryId) : '',
        url: resource.url || '',
      });
      setSelectedFile(null);
    } else {
      setEditingResource(null);
      setResourceForm(INITIAL_RESOURCE_FORM);
      setSelectedFile(null);
    }
    onResourceOpen();
  };

  const handleSaveResource = async () => {
    if (!resourceForm.title || !resourceForm.skillId || !resourceForm.stageId || !resourceForm.lessonId || !resourceForm.resourceCategoryId) {
      toast({ title: 'Preencha todos os campos obrigatórios', status: 'warning' });
      return;
    }
    if (!selectedFile && !resourceForm.url.trim() && !editingResource?.url) {
      toast({ title: 'Insira uma URL ou selecione um arquivo para upload', status: 'warning' });
      return;
    }

    setIsLoading(true);
    try {
      let resolvedFileId = editingResource?.fileId;
      let resolvedUrl = resourceForm.url.trim() || editingResource?.url || '';

      if (selectedFile) {
        const uploadIntent = await fileService.createUploadIntent({
          fileName: selectedFile.name,
          contentType: selectedFile.type || 'application/octet-stream',
          size: selectedFile.size,
        });
        await fileService.uploadToStorage(uploadIntent.uploadUrl, selectedFile);
        const completeRes = await fileService.completeUpload(uploadIntent.id);
        resolvedFileId = uploadIntent.id;
        resolvedUrl = completeRes.publicUrl;
      }

      if (!resolvedUrl) {
        toast({ title: 'A URL do recurso não pôde ser definida', status: 'warning' });
        setIsLoading(false);
        return;
      }

      const payload = {
        title: resourceForm.title,
        skillId: Number(resourceForm.skillId),
        stageId: Number(resourceForm.stageId),
        lessonId: resourceForm.lessonId,
        fileId: resolvedFileId ? Number(resolvedFileId) : undefined,
        url: resolvedUrl,
        mediaType: resourceForm.mediaType,
        resourceCategoryId: Number(resourceForm.resourceCategoryId),
      };

      if (editingResource) {
        await resourceService.update(String(editingResource.id), payload);
        toast({ title: 'Recurso atualizado com sucesso', status: 'success' });
      } else {
        await resourceService.create(payload);
        toast({ title: 'Recurso criado com sucesso', status: 'success' });
      }

      onResourceClose();
      loadAll();
    } catch {
      toast({ title: 'Erro ao salvar recurso', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteResource = async () => {
    if (!resourceToDelete) return;
    setIsLoading(true);
    try {
      await resourceService.delete(String(resourceToDelete.id));
      toast({ title: 'Recurso excluído com sucesso', status: 'success' });
      onDeleteResourceClose();
      loadAll();
    } catch {
      toast({ title: 'Erro ao excluir recurso', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCategory = (category?: ResourceCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryName(category.name);
    } else {
      setEditingCategory(null);
      setCategoryName('');
    }
    onCategoryOpen();
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      toast({ title: 'Nome da categoria é obrigatório', status: 'warning' });
      return;
    }

    setIsLoading(true);
    try {
      const payload = { name: categoryName.trim() };
      if (editingCategory) {
        await resourceCategoryService.update(String(editingCategory.id), payload);
        toast({ title: 'Categoria atualizada com sucesso', status: 'success' });
      } else {
        await resourceCategoryService.create(payload);
        toast({ title: 'Categoria criada com sucesso', status: 'success' });
      }
      onCategoryClose();
      loadAll();
    } catch {
      toast({ title: 'Erro ao salvar categoria', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setIsLoading(true);
    try {
      await resourceCategoryService.delete(String(categoryToDelete.id));
      toast({ title: 'Categoria excluída com sucesso', status: 'success' });
      onDeleteCategoryClose();
      loadAll();
    } catch {
      toast({ title: 'Erro ao excluir categoria', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const resourceColumns = [
    {
      key: 'title',
      header: 'Título',
      render: (item: Resource) => <Text fontSize="sm">{item.title}</Text>,
    },
    {
      key: 'skillId',
      header: 'Skill',
      render: (item: Resource) => <Text fontSize="sm">{getSkillLabel(item.skillId)}</Text>,
    },
    {
      key: 'stageId',
      header: 'Stage',
      render: (item: Resource) => <Text fontSize="sm">{getStageLabel(item.stageId)}</Text>,
    },
    {
      key: 'lessonId',
      header: 'Lição',
      render: (item: Resource) => <Text fontSize="sm">{getLessonLabel(item.lessonId)}</Text>,
    },
    {
      key: 'mediaType',
      header: 'Tipo',
      render: (item: Resource) => (
        <Badge colorScheme="blue" fontSize="xs">
          {MEDIA_TYPE_LABELS[item.mediaType] || item.mediaType}
        </Badge>
      ),
    },
    {
      key: 'resourceCategoryId',
      header: 'Categoria',
      render: (item: Resource) => <Text fontSize="sm">{getCategoryLabel(item.resourceCategoryId)}</Text>,
    },
    {
      key: 'fileId',
      header: 'Arquivo',
      render: (item: Resource) => (
        <HStack spacing={2} maxW="320px">
          <Text fontSize="sm" noOfLines={1} flex={1}>
            {item.fileId ? `File #${item.fileId}` : '—'}
          </Text>
          {item.url || item.fileUrl || item.downloadUrl ? (
            <Tooltip label="Abrir arquivo">
              <Button
                as={Link}
                href={item.url || item.fileUrl || item.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                size="sm"
                variant="ghost"
                colorScheme="blue"
                minW="auto"
                px={2}
              >
                <Icon as={MdOpenInNew} />
              </Button>
            </Tooltip>
          ) : null}
        </HStack>
      ),
    },
  ];

  const categoryColumns = [
    {
      key: 'name',
      header: 'Nome',
      render: (item: ResourceCategory) => <Text fontSize="sm">{item.name}</Text>,
    },
    {
      key: 'id',
      header: 'ID',
      render: (item: ResourceCategory) => <Text fontSize="sm" color="gray.500">{item.id}</Text>,
    },
  ];

  return (
    <DashboardLayout>
      <VStack align="stretch" spacing={6}>
        <Flex justify="space-between" align="center" gap={4} wrap="wrap">
          <Box>
            <Heading size="lg" color="gray.700">Recursos</Heading>
            <Text mt={1} color="gray.500">
              Gestão de materiais vinculados a skill, stage e lição.
            </Text>
          </Box>
          <HStack spacing={3}>
            <Button variant="outline" leftIcon={<Icon as={MdFolder} />} onClick={() => handleOpenCategory()}>
              Nova Categoria
            </Button>
            <Button colorScheme="primary" leftIcon={<Icon as={MdAdd} />} onClick={() => handleOpenResource()}>
              Novo Recurso
            </Button>
          </HStack>
        </Flex>

        <DataTable
          columns={resourceColumns}
          data={resources}
          onEdit={(item) => handleOpenResource(item)}
          onDelete={(item) => {
            setResourceToDelete(item);
            onDeleteResourceOpen();
          }}
        />

        <Box>
          <Heading size="md" color="gray.700" mb={4}>Categorias de Recurso</Heading>
          <DataTable
            columns={categoryColumns}
            data={categories}
            onEdit={(item) => handleOpenCategory(item)}
            onDelete={(item) => {
              setCategoryToDelete(item);
              onDeleteCategoryOpen();
            }}
          />
        </Box>
      </VStack>

      <Modal isOpen={isResourceOpen} onClose={onResourceClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingResource ? 'Editar Recurso' : 'Novo Recurso'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Título</FormLabel>
                <Input
                  value={resourceForm.title}
                  onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
                />
              </FormControl>
              <HStack spacing={4} w="full" align="flex-start">
                <FormControl isRequired>
                  <FormLabel>Skill</FormLabel>
                  <Select
                    value={resourceForm.skillId}
                    onChange={(e) => setResourceForm({
                      ...resourceForm,
                      skillId: e.target.value,
                      stageId: '',
                      lessonId: '',
                    })}
                    placeholder="Selecione a skill"
                  >
                    {skills.map((skill) => (
                      <option key={skill.id} value={skill.id}>
                        {skill.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Stage</FormLabel>
                  <Select
                    value={resourceForm.stageId}
                    onChange={(e) => setResourceForm({
                      ...resourceForm,
                      stageId: e.target.value,
                      lessonId: '',
                    })}
                    placeholder="Selecione a stage"
                  >
                    {filteredStages.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </HStack>
              <FormControl isRequired>
                <FormLabel>Lição</FormLabel>
                <Select
                  value={resourceForm.lessonId}
                  onChange={(e) => setResourceForm({ ...resourceForm, lessonId: e.target.value })}
                  placeholder="Selecione a lição"
                >
                  {filteredLessons.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.title}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <HStack spacing={4} w="full" align="flex-start">
                <FormControl isRequired>
                  <FormLabel>Tipo de mídia</FormLabel>
                  <Select
                    value={resourceForm.mediaType}
                    onChange={(e) => setResourceForm({ ...resourceForm, mediaType: e.target.value as ResourceMediaType })}
                  >
                    {Object.entries(MEDIA_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Categoria</FormLabel>
                  <Select
                    value={resourceForm.resourceCategoryId}
                    onChange={(e) => setResourceForm({ ...resourceForm, resourceCategoryId: e.target.value })}
                    placeholder="Selecione a categoria"
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </HStack>
              <FormControl>
                <FormLabel>URL do Recurso</FormLabel>
                <Input
                  placeholder="https://exemplo.com/recurso ou será preenchido pelo upload"
                  value={resourceForm.url}
                  onChange={(e) => setResourceForm({ ...resourceForm, url: e.target.value })}
                />
                <Text mt={1} fontSize="xs" color="gray.500">
                  Obrigatório caso não selecione um arquivo para upload.
                </Text>
              </FormControl>
              <FormControl>
                <FormLabel>Upload de Arquivo (opcional)</FormLabel>
                <InputGroup>
                  <Input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    accept={
                      resourceForm.mediaType === 'AUDIO'
                        ? 'audio/*'
                        : resourceForm.mediaType === 'VIDEO'
                          ? 'video/*'
                          : '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt'
                    }
                    p={1}
                  />
                  {selectedFile ? (
                    <InputRightElement width="auto" pr={3}>
                      <Text fontSize="xs" color="gray.500">{selectedFile.name}</Text>
                    </InputRightElement>
                  ) : null}
                </InputGroup>
                <Text mt={2} fontSize="xs" color="gray.500">
                  {editingResource?.fileId
                    ? `Arquivo atual: File #${editingResource.fileId}. Selecione outro arquivo para substituir.`
                    : 'Selecione o arquivo para upload automático no R2.'}
                </Text>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onResourceClose} isDisabled={isLoading}>Cancelar</Button>
            <Button colorScheme="primary" onClick={handleSaveResource} isLoading={isLoading}>Salvar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isCategoryOpen} onClose={onCategoryClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl isRequired>
              <FormLabel>Nome</FormLabel>
              <Input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCategoryClose} isDisabled={isLoading}>Cancelar</Button>
            <Button colorScheme="primary" onClick={handleSaveCategory} isLoading={isLoading}>Salvar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ConfirmDeleteModal
        isOpen={isDeleteResourceOpen}
        onClose={onDeleteResourceClose}
        onConfirm={handleDeleteResource}
        isLoading={isLoading}
        title="Excluir Recurso"
      />

      <ConfirmDeleteModal
        isOpen={isDeleteCategoryOpen}
        onClose={onDeleteCategoryClose}
        onConfirm={handleDeleteCategory}
        isLoading={isLoading}
        title="Excluir Categoria"
      />
    </DashboardLayout>
  );
}
