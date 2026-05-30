'use client'

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import axios from 'axios';
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
  Textarea,
  VStack,
  useDisclosure,
  useToast,
  HStack,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';
import { MdAdd, MdFolder, MdOpenInNew, MdSearch } from 'react-icons/md';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { DataTable } from '@/components/ui/DataTable';
import { videoCategoryService, VideoCategory } from '@/services/videoCategoryService';
import { videoService, VideoItem } from '@/services/videoService';
import { lessonService, Lesson } from '@/services/lessonService';

const INITIAL_VIDEO_FORM = {
  title: '',
  categoryId: '',
  embedUrl: '',
  thumbnailUrl: '',
  durationLabel: '',
  description: '',
  lessonId: '',
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

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<VideoItem | null>(null);
  const [videoForm, setVideoForm] = useState(INITIAL_VIDEO_FORM);

  // States for filtering
  const [searchText, setSearchText] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('ALL');

  const [editingCategory, setEditingCategory] = useState<VideoCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<VideoCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categorySortOrder, setCategorySortOrder] = useState('');

  const { isOpen: isVideoOpen, onOpen: onVideoOpen, onClose: onVideoClose } = useDisclosure();
  const { isOpen: isCategoryOpen, onOpen: onCategoryOpen, onClose: onCategoryClose } = useDisclosure();
  const { isOpen: isDeleteVideoOpen, onOpen: onDeleteVideoOpen, onClose: onDeleteVideoClose } = useDisclosure();
  const { isOpen: isDeleteCategoryOpen, onOpen: onDeleteCategoryOpen, onClose: onDeleteCategoryClose } = useDisclosure();
  const toast = useToast();
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, []);  // toastRef evita loop infinito

  const loadAll = useCallback(async () => {
    try {
      const [videosResult, categoriesResult, lessonsResult] = await Promise.allSettled([
        videoService.getAll(),
        videoCategoryService.getAll(),
        lessonService.getAll(),
      ]);

      setVideos(videosResult.status === 'fulfilled' ? videosResult.value : []);
      setCategories(categoriesResult.status === 'fulfilled' ? categoriesResult.value : []);
      setLessons(lessonsResult.status === 'fulfilled' ? lessonsResult.value : []);
    } catch {
      toastRef.current({ title: 'Erro ao carregar vídeos', status: 'error' });
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)),
    [categories]
  );

  const getCategoryLabel = (video: VideoItem) => {
    if (video.category) return video.category;

    return categories.find((item) => String(item.id) === String(video.categoryId))?.name || '—';
  };

  const handleOpenVideo = (video?: VideoItem) => {
    if (video) {
      setEditingVideo(video);
      setVideoForm({
        title: video.title || '',
        categoryId: video.categoryId ? String(video.categoryId) : '',
        embedUrl: video.embedUrl || '',
        thumbnailUrl: video.thumbnailUrl || '',
        durationLabel: video.durationLabel || '',
        description: video.description || '',
        lessonId: video.lessonId || '',
      });
    } else {
      setEditingVideo(null);
      setVideoForm(INITIAL_VIDEO_FORM);
    }

    onVideoOpen();
  };

  const handleSaveVideo = async () => {
    if (!videoForm.title.trim() || !videoForm.categoryId || !videoForm.embedUrl.trim() || !videoForm.durationLabel.trim()) {
      toastRef.current({ title: 'Preencha título, categoria, embed URL e duração', status: 'warning' });
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        title: videoForm.title.trim(),
        categoryId: Number(videoForm.categoryId),
        embedUrl: videoForm.embedUrl.trim(),
        thumbnailUrl: videoForm.thumbnailUrl.trim() || undefined,
        durationLabel: videoForm.durationLabel.trim(),
        description: videoForm.description.trim() || undefined,
        lessonId: videoForm.lessonId || null,
      };

      if (editingVideo) {
        await videoService.update(String(editingVideo.id), payload);
        toastRef.current({ title: 'Vídeo atualizado com sucesso', status: 'success' });
      } else {
        await videoService.create(payload);
        toastRef.current({ title: 'Vídeo criado com sucesso', status: 'success' });
      }

      onVideoClose();
      loadAll();
    } catch (error) {
      toastRef.current({ title: getErrorMessage(error, 'Erro ao salvar vídeo'), status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteVideo = async () => {
    if (!videoToDelete) return;

    setIsLoading(true);
    try {
      await videoService.delete(String(videoToDelete.id));
      toastRef.current({ title: 'Vídeo excluído com sucesso', status: 'success' });
      onDeleteVideoClose();
      loadAll();
    } catch (error) {
      toastRef.current({ title: getErrorMessage(error, 'Erro ao excluir vídeo'), status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCategory = (category?: VideoCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryName(category.name);
      setCategorySortOrder(String(category.sortOrder ?? ''));
    } else {
      setEditingCategory(null);
      setCategoryName('');
      setCategorySortOrder(String(categories.length + 1));
    }

    onCategoryOpen();
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim() || !categorySortOrder.trim()) {
      toastRef.current({ title: 'Nome e ordem da categoria são obrigatórios', status: 'warning' });
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        name: categoryName.trim(),
        sortOrder: Number(categorySortOrder),
      };

      if (editingCategory) {
        await videoCategoryService.update(String(editingCategory.id), payload);
        toastRef.current({ title: 'Categoria atualizada com sucesso', status: 'success' });
      } else {
        await videoCategoryService.create(payload);
        toastRef.current({ title: 'Categoria criada com sucesso', status: 'success' });
      }

      onCategoryClose();
      loadAll();
    } catch (error) {
      toastRef.current({ title: getErrorMessage(error, 'Erro ao salvar categoria'), status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    setIsLoading(true);
    try {
      await videoCategoryService.delete(String(categoryToDelete.id));
      toastRef.current({ title: 'Categoria excluída com sucesso', status: 'success' });
      onDeleteCategoryClose();
      loadAll();
    } catch (error) {
      toastRef.current({ title: getErrorMessage(error, 'Erro ao excluir categoria'), status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredVideos = videos.filter((vid) => {
    const matchesText = !searchText ||
      vid.title.toLowerCase().includes(searchText.toLowerCase()) ||
      (vid.description && vid.description.toLowerCase().includes(searchText.toLowerCase()));
    
    const matchesCategory = selectedCategoryId === 'ALL' || String(vid.categoryId) === selectedCategoryId;

    return matchesText && matchesCategory;
  });

  const videoColumns = [
    {
      key: 'title',
      header: 'Título',
      render: (item: VideoItem) => <Text fontSize="sm">{item.title}</Text>,
    },
    {
      key: 'category',
      header: 'Categoria',
      render: (item: VideoItem) => <Text fontSize="sm">{getCategoryLabel(item)}</Text>,
    },
    {
      key: 'durationLabel',
      header: 'Duração',
      render: (item: VideoItem) => <Text fontSize="sm">{item.durationLabel || '—'}</Text>,
    },
    {
      key: 'lessonId',
      header: 'Lição',
      render: (item: VideoItem) => {
        const lesson = lessons.find((l) => l.id === item.lessonId);
        return <Text fontSize="sm">{lesson?.title || '—'}</Text>;
      },
    },
    {
      key: 'thumbnailUrl',
      header: 'Thumbnail',
      render: (item: VideoItem) => item.thumbnailUrl ? (
        <Link href={item.thumbnailUrl} isExternal color="blue.500" fontSize="sm">
          Abrir
        </Link>
      ) : (
        <Text fontSize="sm">—</Text>
      ),
    },
    {
      key: 'embedUrl',
      header: 'Player',
      render: (item: VideoItem) => item.embedUrl ? (
        <Link href={item.embedUrl} isExternal color="blue.500" fontSize="sm">
          <Flex align="center" gap={1}>
            <Icon as={MdOpenInNew} />
            <Text>Abrir</Text>
          </Flex>
        </Link>
      ) : (
        <Text fontSize="sm">—</Text>
      ),
    },
  ];

  const categoryColumns = [
    {
      key: 'name',
      header: 'Categoria',
      render: (item: VideoCategory) => <Text fontSize="sm">{item.name}</Text>,
    },
    {
      key: 'sortOrder',
      header: 'Ordem',
      render: (item: VideoCategory) => <Text fontSize="sm">{item.sortOrder ?? '—'}</Text>,
    },
  ];

  return (
    <DashboardLayout>
      <VStack align="stretch" spacing={8}>
        <Flex justify="space-between" align="center">
          <Box>
            <Heading size="lg">Vídeos</Heading>
            <Text color="gray.500" mt={1}>
              Gerencie a biblioteca de vídeos e suas categorias.
            </Text>
          </Box>
          <Flex gap={3}>
            <Button leftIcon={<Icon as={MdFolder} />} onClick={() => handleOpenCategory()}>
              Nova categoria
            </Button>
            <Button colorScheme="orange" leftIcon={<Icon as={MdAdd} />} onClick={() => handleOpenVideo()}>
              Novo vídeo
            </Button>
          </Flex>
        </Flex>

        <Box>
          <Heading size="md" mb={4}>Vídeos cadastrados</Heading>

          {/* Filtros */}
          <HStack spacing={4} mb={6} align="center" flexWrap="wrap" gap={3}>
            <InputGroup maxW="320px">
              <InputLeftElement pointerEvents="none">
                <Icon as={MdSearch} color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Buscar por título ou descrição..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                bg="white"
              />
            </InputGroup>
            <Select
              maxW="200px"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              bg="white"
            >
              <option value="ALL">Todas as Categorias</option>
              {categories.map((cat) => (
                <option key={cat.id} value={String(cat.id)}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </HStack>

          <DataTable
            data={filteredVideos}
            columns={videoColumns}
            onEdit={handleOpenVideo}
            onDelete={(video) => {
              setVideoToDelete(video);
              onDeleteVideoOpen();
            }}
          />
        </Box>

        <Box>
          <Heading size="md" mb={4}>Categorias</Heading>
          <DataTable
            data={sortedCategories}
            columns={categoryColumns}
            onEdit={handleOpenCategory}
            onDelete={(category) => {
              setCategoryToDelete(category);
              onDeleteCategoryOpen();
            }}
          />
        </Box>
      </VStack>

      <Modal isOpen={isVideoOpen} onClose={onVideoClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingVideo ? 'Editar vídeo' : 'Novo vídeo'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Título</FormLabel>
                <Input value={videoForm.title} onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })} />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Categoria</FormLabel>
                <Select value={videoForm.categoryId} onChange={(e) => setVideoForm({ ...videoForm, categoryId: e.target.value })}>
                  <option value="">Selecione</option>
                  {sortedCategories.map((category) => (
                    <option key={category.id} value={String(category.id)}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Embed URL</FormLabel>
                <Input
                  value={videoForm.embedUrl}
                  onChange={(e) => setVideoForm({ ...videoForm, embedUrl: e.target.value })}
                  placeholder="https://player.cloudinary.com/embed/?cloud_name=..."
                />
              </FormControl>

              <FormControl>
                <FormLabel>Thumbnail URL</FormLabel>
                <Input
                  value={videoForm.thumbnailUrl}
                  onChange={(e) => setVideoForm({ ...videoForm, thumbnailUrl: e.target.value })}
                  placeholder="Opcional. O backend tenta derivar via Cloudinary."
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Duração</FormLabel>
                <Input
                  value={videoForm.durationLabel}
                  onChange={(e) => setVideoForm({ ...videoForm, durationLabel: e.target.value })}
                  placeholder="08:14"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Descrição</FormLabel>
                <Textarea
                  value={videoForm.description}
                  onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })}
                  rows={4}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Lição associada</FormLabel>
                <Select
                  value={videoForm.lessonId}
                  onChange={(e) => setVideoForm({ ...videoForm, lessonId: e.target.value })}
                >
                  <option value="">Nenhuma</option>
                  {lessons.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
                  ))}
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onVideoClose}>Cancelar</Button>
            <Button colorScheme="orange" onClick={handleSaveVideo} isLoading={isLoading}>Salvar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isCategoryOpen} onClose={onCategoryClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingCategory ? 'Editar categoria' : 'Nova categoria'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Nome</FormLabel>
                <Input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Ordem</FormLabel>
                <Input type="number" value={categorySortOrder} onChange={(e) => setCategorySortOrder(e.target.value)} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCategoryClose}>Cancelar</Button>
            <Button colorScheme="orange" onClick={handleSaveCategory} isLoading={isLoading}>Salvar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ConfirmDeleteModal
        isOpen={isDeleteVideoOpen}
        onClose={onDeleteVideoClose}
        title="Excluir vídeo"
        description={`Deseja excluir o vídeo "${videoToDelete?.title || ''}"?`}
        onConfirm={handleDeleteVideo}
        isLoading={isLoading}
      />

      <ConfirmDeleteModal
        isOpen={isDeleteCategoryOpen}
        onClose={onDeleteCategoryClose}
        title="Excluir categoria"
        description={`Deseja excluir a categoria "${categoryToDelete?.name || ''}"?`}
        onConfirm={handleDeleteCategory}
        isLoading={isLoading}
      />
    </DashboardLayout>
  );
}
