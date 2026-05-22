'use client'

import React, { useCallback, useEffect, useState } from 'react';
import {
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
  Textarea,
  Tooltip,
  VStack,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { MdAdd, MdFolder, MdOpenInNew } from 'react-icons/md';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/DataTable';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { fileService } from '@/services/fileService';
import { podcastCategoryService, PodcastCategory } from '@/services/podcastCategoryService';
import { podcastService, PodcastEpisode } from '@/services/podcastService';

const INITIAL_EPISODE_FORM = {
  title: '',
  categoryId: '',
  description: '',
  durationLabel: '',
  transcript: '',
  coverImageUrl: '',
  audioUrl: '',
};

export default function PodcastsPage() {
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [categories, setCategories] = useState<PodcastCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [editingEpisode, setEditingEpisode] = useState<PodcastEpisode | null>(null);
  const [episodeToDelete, setEpisodeToDelete] = useState<PodcastEpisode | null>(null);
  const [episodeForm, setEpisodeForm] = useState(INITIAL_EPISODE_FORM);
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);

  const [editingCategory, setEditingCategory] = useState<PodcastCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<PodcastCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');

  const { isOpen: isEpisodeOpen, onOpen: onEpisodeOpen, onClose: onEpisodeClose } = useDisclosure();
  const { isOpen: isCategoryOpen, onOpen: onCategoryOpen, onClose: onCategoryClose } = useDisclosure();
  const { isOpen: isDeleteEpisodeOpen, onOpen: onDeleteEpisodeOpen, onClose: onDeleteEpisodeClose } = useDisclosure();
  const { isOpen: isDeleteCategoryOpen, onOpen: onDeleteCategoryOpen, onClose: onDeleteCategoryClose } = useDisclosure();
  const toast = useToast();

  const loadAll = useCallback(async () => {
    try {
      const [episodesResult, categoriesResult] = await Promise.allSettled([
        podcastService.getAll(),
        podcastCategoryService.getAll(),
      ]);

      const resolvedCategories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
      const resolvedEpisodes = episodesResult.status === 'fulfilled' ? episodesResult.value : [];

      setCategories(resolvedCategories);
      setEpisodes(resolvedEpisodes);
    } catch {
      toast({ title: 'Erro ao carregar podcasts', status: 'error' });
    }
  }, [toast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const getCategoryLabel = (episode: PodcastEpisode) => {
    if (episode.categoryName) return episode.categoryName;

    return (
      categories.find((item) => String(item.id) === String(episode.categoryId))?.name
      || '—'
    );
  };

  const handleOpenEpisode = (episode?: PodcastEpisode) => {
    if (episode) {
      setEditingEpisode(episode);
      setEpisodeForm({
        title: episode.title || '',
        categoryId: episode.categoryId ? String(episode.categoryId) : '',
        description: episode.description || '',
        durationLabel: episode.durationLabel || '',
        transcript: episode.transcript || '',
        coverImageUrl: episode.coverImageUrl || '',
        audioUrl: episode.audioUrl || '',
      });
      setSelectedAudioFile(null);
      setSelectedCoverFile(null);
    } else {
      setEditingEpisode(null);
      setEpisodeForm(INITIAL_EPISODE_FORM);
      setSelectedAudioFile(null);
      setSelectedCoverFile(null);
    }

    onEpisodeOpen();
  };

  const uploadFileAndResolveUrl = async (file: File) => {
    const uploadIntent = await fileService.createUploadIntent({
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      size: file.size,
    });

    await fileService.uploadToStorage(uploadIntent.uploadUrl, file);
    const completeRes = await fileService.completeUpload(uploadIntent.id);

    return {
      fileId: uploadIntent.id,
      publicUrl: completeRes.publicUrl,
    };
  };

  const handleSaveEpisode = async () => {
    if (!episodeForm.title.trim() || !episodeForm.categoryId || !episodeForm.description.trim()) {
      toast({ title: 'Preencha título, categoria e descrição', status: 'warning' });
      return;
    }

    if (!selectedAudioFile && !episodeForm.audioUrl.trim() && !editingEpisode?.audioUrl) {
      toast({ title: 'Informe uma URL de áudio ou selecione um arquivo', status: 'warning' });
      return;
    }

    setIsLoading(true);

    try {
      let resolvedFileId = editingEpisode?.fileId;
      let resolvedCoverImageUrl = episodeForm.coverImageUrl.trim() || editingEpisode?.coverImageUrl || '';
      let resolvedAudioUrl = episodeForm.audioUrl.trim() || editingEpisode?.audioUrl || '';

      if (selectedAudioFile) {
        const uploadedAudio = await uploadFileAndResolveUrl(selectedAudioFile);
        resolvedFileId = uploadedAudio.fileId;
        resolvedAudioUrl = uploadedAudio.publicUrl;
      }

      if (selectedCoverFile) {
        const uploadedCover = await uploadFileAndResolveUrl(selectedCoverFile);
        resolvedCoverImageUrl = uploadedCover.publicUrl;
      }

      if (!resolvedAudioUrl) {
        toast({ title: 'A URL do áudio não pôde ser definida', status: 'warning' });
        setIsLoading(false);
        return;
      }

      const payload = {
        title: episodeForm.title.trim(),
        categoryId: Number(episodeForm.categoryId),
        description: episodeForm.description.trim(),
        durationLabel: episodeForm.durationLabel.trim() || undefined,
        transcript: episodeForm.transcript.trim() || undefined,
        coverImageUrl: resolvedCoverImageUrl || undefined,
        audioUrl: resolvedAudioUrl,
        fileId: resolvedFileId ? Number(resolvedFileId) : undefined,
      };

      if (editingEpisode) {
        await podcastService.update(String(editingEpisode.id), payload);
        toast({ title: 'Episódio atualizado com sucesso', status: 'success' });
      } else {
        await podcastService.create(payload);
        toast({ title: 'Episódio criado com sucesso', status: 'success' });
      }

      onEpisodeClose();
      loadAll();
    } catch {
      toast({ title: 'Erro ao salvar episódio', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEpisode = async () => {
    if (!episodeToDelete) return;

    setIsLoading(true);
    try {
      await podcastService.delete(String(episodeToDelete.id));
      toast({ title: 'Episódio excluído com sucesso', status: 'success' });
      onDeleteEpisodeClose();
      loadAll();
    } catch {
      toast({ title: 'Erro ao excluir episódio', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCategory = (category?: PodcastCategory) => {
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
        await podcastCategoryService.update(String(editingCategory.id), payload);
        toast({ title: 'Categoria atualizada com sucesso', status: 'success' });
      } else {
        await podcastCategoryService.create(payload);
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
      await podcastCategoryService.delete(String(categoryToDelete.id));
      toast({ title: 'Categoria excluída com sucesso', status: 'success' });
      onDeleteCategoryClose();
      loadAll();
    } catch {
      toast({ title: 'Erro ao excluir categoria', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const episodeColumns = [
    {
      key: 'title',
      header: 'Título',
      render: (item: PodcastEpisode) => <Text fontSize="sm">{item.title}</Text>,
    },
    {
      key: 'categoryId',
      header: 'Categoria',
      render: (item: PodcastEpisode) => <Text fontSize="sm">{getCategoryLabel(item)}</Text>,
    },
    {
      key: 'durationLabel',
      header: 'Duração',
      render: (item: PodcastEpisode) => <Text fontSize="sm">{item.durationLabel || '—'}</Text>,
    },
    {
      key: 'description',
      header: 'Descrição',
      render: (item: PodcastEpisode) => (
        <Text fontSize="sm" maxW="360px" noOfLines={2}>
          {item.description}
        </Text>
      ),
    },
    {
      key: 'coverImageUrl',
      header: 'Capa',
      render: (item: PodcastEpisode) => item.coverImageUrl ? (
        <Tooltip label="Abrir capa">
          <Button
            as={Link}
            href={item.coverImageUrl}
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
      ) : (
        <Text fontSize="sm" color="gray.500">—</Text>
      ),
    },
    {
      key: 'audioUrl',
      header: 'Áudio',
      render: (item: PodcastEpisode) => item.audioUrl ? (
        <Tooltip label="Abrir áudio">
          <Button
            as={Link}
            href={item.audioUrl}
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
      ) : (
        <Text fontSize="sm" color="gray.500">—</Text>
      ),
    },
  ];

  const categoryColumns = [
    {
      key: 'name',
      header: 'Nome',
      render: (item: PodcastCategory) => <Text fontSize="sm">{item.name}</Text>,
    },
    {
      key: 'id',
      header: 'ID',
      render: (item: PodcastCategory) => <Text fontSize="sm" color="gray.500">{item.id}</Text>,
    },
  ];

  return (
    <DashboardLayout>
      <VStack align="stretch" spacing={6}>
        <Flex justify="space-between" align="center" gap={4} wrap="wrap">
          <Box>
            <Heading size="lg" color="gray.700">Podcasts</Heading>
            <Text mt={1} color="gray.500">
              Gestão de episódios e categorias de podcast do app.
            </Text>
          </Box>
          <HStack spacing={3}>
            <Button variant="outline" leftIcon={<Icon as={MdFolder} />} onClick={() => handleOpenCategory()}>
              Nova Categoria
            </Button>
            <Button colorScheme="primary" leftIcon={<Icon as={MdAdd} />} onClick={() => handleOpenEpisode()}>
              Novo Episódio
            </Button>
          </HStack>
        </Flex>

        <DataTable
          columns={episodeColumns}
          data={episodes}
          onEdit={(item) => handleOpenEpisode(item)}
          onDelete={(item) => {
            setEpisodeToDelete(item);
            onDeleteEpisodeOpen();
          }}
        />

        <Box>
          <Heading size="md" color="gray.700" mb={4}>Categorias de Podcast</Heading>
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

      <Modal isOpen={isEpisodeOpen} onClose={onEpisodeClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingEpisode ? 'Editar Episódio' : 'Novo Episódio'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Título</FormLabel>
                <Input
                  value={episodeForm.title}
                  onChange={(e) => setEpisodeForm({ ...episodeForm, title: e.target.value })}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Categoria</FormLabel>
                <Select
                  value={episodeForm.categoryId}
                  onChange={(e) => setEpisodeForm({ ...episodeForm, categoryId: e.target.value })}
                  placeholder="Selecione a categoria"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Descrição</FormLabel>
                <Textarea
                  value={episodeForm.description}
                  onChange={(e) => setEpisodeForm({ ...episodeForm, description: e.target.value })}
                  rows={4}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Duração</FormLabel>
                <Input
                  placeholder="Ex: 06:24"
                  value={episodeForm.durationLabel}
                  onChange={(e) => setEpisodeForm({ ...episodeForm, durationLabel: e.target.value })}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Transcrição</FormLabel>
                <Textarea
                  value={episodeForm.transcript}
                  onChange={(e) => setEpisodeForm({ ...episodeForm, transcript: e.target.value })}
                  rows={6}
                />
              </FormControl>

              <FormControl>
                <FormLabel>URL da capa</FormLabel>
                <Input
                  placeholder="https://cdn.seudominio.com/podcasts/capa.jpg"
                  value={episodeForm.coverImageUrl}
                  onChange={(e) => setEpisodeForm({ ...episodeForm, coverImageUrl: e.target.value })}
                />
                <Text mt={1} fontSize="xs" color="gray.500">
                  Opcional caso selecione uma imagem para upload.
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel>Upload de capa</FormLabel>
                <InputGroup>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelectedCoverFile(e.target.files?.[0] || null)}
                    p={1}
                  />
                  {selectedCoverFile ? (
                    <InputRightElement width="auto" pr={3}>
                      <Text fontSize="xs" color="gray.500">{selectedCoverFile.name}</Text>
                    </InputRightElement>
                  ) : null}
                </InputGroup>
                <Text mt={2} fontSize="xs" color="gray.500">
                  Se selecionar uma imagem, ela será enviada ao bucket e usada como capa do episódio.
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel>URL do áudio</FormLabel>
                <Input
                  placeholder="https://cdn.seudominio.com/podcasts/audio.wav"
                  value={episodeForm.audioUrl}
                  onChange={(e) => setEpisodeForm({ ...episodeForm, audioUrl: e.target.value })}
                />
                <Text mt={1} fontSize="xs" color="gray.500">
                  Obrigatório caso não selecione um arquivo para upload.
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel>Upload de áudio</FormLabel>
                <InputGroup>
                  <Input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setSelectedAudioFile(e.target.files?.[0] || null)}
                    p={1}
                  />
                  {selectedAudioFile ? (
                    <InputRightElement width="auto" pr={3}>
                      <Text fontSize="xs" color="gray.500">{selectedAudioFile.name}</Text>
                    </InputRightElement>
                  ) : null}
                </InputGroup>
                <Text mt={2} fontSize="xs" color="gray.500">
                  {editingEpisode?.fileId
                    ? `Áudio atual: File #${editingEpisode.fileId}. Selecione outro arquivo para substituir.`
                    : 'Selecione o arquivo para upload automático no bucket configurado.'}
                </Text>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEpisodeClose} isDisabled={isLoading}>Cancelar</Button>
            <Button colorScheme="primary" onClick={handleSaveEpisode} isLoading={isLoading}>Salvar</Button>
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
        isOpen={isDeleteEpisodeOpen}
        onClose={onDeleteEpisodeClose}
        onConfirm={handleDeleteEpisode}
        isLoading={isLoading}
        title="Excluir Episódio"
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
