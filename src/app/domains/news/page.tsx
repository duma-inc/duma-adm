'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  Checkbox,
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
import { MdAdd, MdArticle, MdFolder } from 'react-icons/md';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { DataTable } from '@/components/ui/DataTable';
import { newsCategoryService, NewsCategory } from '@/services/newsCategoryService';
import { newsService, NewsArticle } from '@/services/newsService';

const INITIAL_ARTICLE_FORM = {
  headline: '',
  categoryId: '',
  summary: '',
  highlightedArticle: false,
  source: '',
  publishedAt: '',
  content: '',
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

export default function NewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);
  const [articleToDelete, setArticleToDelete] = useState<NewsArticle | null>(null);
  const [articleForm, setArticleForm] = useState(INITIAL_ARTICLE_FORM);

  const [editingCategory, setEditingCategory] = useState<NewsCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<NewsCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categorySortOrder, setCategorySortOrder] = useState('');

  const { isOpen: isArticleOpen, onOpen: onArticleOpen, onClose: onArticleClose } = useDisclosure();
  const { isOpen: isCategoryOpen, onOpen: onCategoryOpen, onClose: onCategoryClose } = useDisclosure();
  const { isOpen: isDeleteArticleOpen, onOpen: onDeleteArticleOpen, onClose: onDeleteArticleClose } = useDisclosure();
  const { isOpen: isDeleteCategoryOpen, onOpen: onDeleteCategoryOpen, onClose: onDeleteCategoryClose } = useDisclosure();
  const toast = useToast();

  const loadAll = useCallback(async () => {
    try {
      const [articlesResult, categoriesResult] = await Promise.allSettled([
        newsService.getAll(),
        newsCategoryService.getAll(),
      ]);

      setArticles(articlesResult.status === 'fulfilled' ? articlesResult.value : []);
      setCategories(categoriesResult.status === 'fulfilled' ? categoriesResult.value : []);
    } catch {
      toast({ title: 'Erro ao carregar notícias', status: 'error' });
    }
  }, [toast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)),
    [categories]
  );

  const getCategoryLabel = (article: NewsArticle) => {
    if (article.category) return article.category;

    return categories.find((item) => String(item.id) === String(article.categoryId))?.name || '—';
  };

  const handleOpenArticle = (article?: NewsArticle) => {
    if (article) {
      setEditingArticle(article);
      setArticleForm({
        headline: article.headline || '',
        categoryId: article.categoryId ? String(article.categoryId) : '',
        summary: article.summary || '',
        highlightedArticle: article.highlightedArticle,
        source: article.source || '',
        publishedAt: article.publishedAt || '',
        content: article.content || '',
      });
    } else {
      setEditingArticle(null);
      setArticleForm(INITIAL_ARTICLE_FORM);
    }

    onArticleOpen();
  };

  const handleSaveArticle = async () => {
    if (
      !articleForm.headline.trim()
      || !articleForm.categoryId
      || !articleForm.summary.trim()
      || !articleForm.source.trim()
      || !articleForm.publishedAt.trim()
      || !articleForm.content.trim()
    ) {
      toast({ title: 'Preencha categoria, headline, resumo, fonte, data e conteúdo', status: 'warning' });
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        categoryId: Number(articleForm.categoryId),
        headline: articleForm.headline.trim(),
        summary: articleForm.summary.trim(),
        highlightedArticle: articleForm.highlightedArticle,
        source: articleForm.source.trim(),
        publishedAt: articleForm.publishedAt.trim(),
        content: articleForm.content.trim(),
      };

      if (editingArticle) {
        await newsService.update(String(editingArticle.id), payload);
        toast({ title: 'Notícia atualizada com sucesso', status: 'success' });
      } else {
        await newsService.create(payload);
        toast({ title: 'Notícia criada com sucesso', status: 'success' });
      }

      onArticleClose();
      loadAll();
    } catch (error) {
      toast({ title: getErrorMessage(error, 'Erro ao salvar notícia'), status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteArticle = async () => {
    if (!articleToDelete) return;

    setIsLoading(true);
    try {
      await newsService.delete(String(articleToDelete.id));
      toast({ title: 'Notícia excluída com sucesso', status: 'success' });
      onDeleteArticleClose();
      loadAll();
    } catch (error) {
      toast({ title: getErrorMessage(error, 'Erro ao excluir notícia'), status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCategory = (category?: NewsCategory) => {
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
      toast({ title: 'Nome e ordem da categoria são obrigatórios', status: 'warning' });
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        name: categoryName.trim(),
        sortOrder: Number(categorySortOrder),
      };

      if (editingCategory) {
        await newsCategoryService.update(String(editingCategory.id), payload);
        toast({ title: 'Categoria atualizada com sucesso', status: 'success' });
      } else {
        await newsCategoryService.create(payload);
        toast({ title: 'Categoria criada com sucesso', status: 'success' });
      }

      onCategoryClose();
      loadAll();
    } catch (error) {
      toast({ title: getErrorMessage(error, 'Erro ao salvar categoria'), status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    setIsLoading(true);
    try {
      await newsCategoryService.delete(String(categoryToDelete.id));
      toast({ title: 'Categoria excluída com sucesso', status: 'success' });
      onDeleteCategoryClose();
      loadAll();
    } catch (error) {
      toast({ title: getErrorMessage(error, 'Erro ao excluir categoria'), status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const articleColumns = [
    {
      key: 'headline',
      header: 'Headline',
      render: (item: NewsArticle) => <Text fontSize="sm">{item.headline}</Text>,
    },
    {
      key: 'category',
      header: 'Categoria',
      render: (item: NewsArticle) => <Text fontSize="sm">{getCategoryLabel(item)}</Text>,
    },
    {
      key: 'source',
      header: 'Fonte',
      render: (item: NewsArticle) => <Text fontSize="sm">{item.source}</Text>,
    },
    {
      key: 'publishedAt',
      header: 'Publicado em',
      render: (item: NewsArticle) => <Text fontSize="sm">{item.publishedAt}</Text>,
    },
    {
      key: 'highlightedArticle',
      header: 'Destaque',
      render: (item: NewsArticle) => <Text fontSize="sm">{item.highlightedArticle ? 'Sim' : 'Não'}</Text>,
    },
  ];

  const categoryColumns = [
    {
      key: 'name',
      header: 'Categoria',
      render: (item: NewsCategory) => <Text fontSize="sm">{item.name}</Text>,
    },
    {
      key: 'sortOrder',
      header: 'Ordem',
      render: (item: NewsCategory) => <Text fontSize="sm">{item.sortOrder ?? '—'}</Text>,
    },
  ];

  return (
    <DashboardLayout>
      <VStack align="stretch" spacing={8}>
        <Flex justify="space-between" align="center">
          <Box>
            <Heading size="lg">Notícias</Heading>
            <Text color="gray.500" mt={1}>
              Gerencie o catálogo do DumaNews e suas categorias.
            </Text>
          </Box>
          <Flex gap={3}>
            <Button leftIcon={<Icon as={MdFolder} />} onClick={() => handleOpenCategory()}>
              Nova categoria
            </Button>
            <Button colorScheme="orange" leftIcon={<Icon as={MdAdd} />} onClick={() => handleOpenArticle()}>
              Nova notícia
            </Button>
          </Flex>
        </Flex>

        <Box>
          <Heading size="md" mb={4}>Notícias cadastradas</Heading>
          <DataTable
            data={articles}
            columns={articleColumns}
            onEdit={handleOpenArticle}
            onDelete={(article) => {
              setArticleToDelete(article);
              onDeleteArticleOpen();
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

      <Modal isOpen={isArticleOpen} onClose={onArticleClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingArticle ? 'Editar notícia' : 'Nova notícia'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Headline</FormLabel>
                <Input value={articleForm.headline} onChange={(e) => setArticleForm({ ...articleForm, headline: e.target.value })} />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Categoria</FormLabel>
                <Select value={articleForm.categoryId} onChange={(e) => setArticleForm({ ...articleForm, categoryId: e.target.value })}>
                  <option value="">Selecione</option>
                  {sortedCategories.map((category) => (
                    <option key={category.id} value={String(category.id)}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Resumo</FormLabel>
                <Textarea value={articleForm.summary} onChange={(e) => setArticleForm({ ...articleForm, summary: e.target.value })} rows={3} />
              </FormControl>

              <FormControl>
                <Checkbox
                  isChecked={articleForm.highlightedArticle}
                  onChange={(e) => setArticleForm({ ...articleForm, highlightedArticle: e.target.checked })}
                >
                  Marcar como notícia destacada
                </Checkbox>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Fonte</FormLabel>
                <Input value={articleForm.source} onChange={(e) => setArticleForm({ ...articleForm, source: e.target.value })} />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Publicado em</FormLabel>
                <Input value={articleForm.publishedAt} onChange={(e) => setArticleForm({ ...articleForm, publishedAt: e.target.value })} placeholder="21 May 2026" />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Conteúdo</FormLabel>
                <Textarea value={articleForm.content} onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })} rows={10} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onArticleClose}>Cancelar</Button>
            <Button colorScheme="orange" leftIcon={<Icon as={MdArticle} />} onClick={handleSaveArticle} isLoading={isLoading}>
              Salvar
            </Button>
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
            <Button onClick={handleSaveCategory} isLoading={isLoading}>Salvar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ConfirmDeleteModal
        isOpen={isDeleteArticleOpen}
        onClose={onDeleteArticleClose}
        title="Excluir notícia"
        description={`Tem certeza que deseja excluir a notícia "${articleToDelete?.headline || ''}"?`}
        onConfirm={handleDeleteArticle}
        isLoading={isLoading}
      />

      <ConfirmDeleteModal
        isOpen={isDeleteCategoryOpen}
        onClose={onDeleteCategoryClose}
        title="Excluir categoria"
        description={`Tem certeza que deseja excluir a categoria "${categoryToDelete?.name || ''}"?`}
        onConfirm={handleDeleteCategory}
        isLoading={isLoading}
      />
    </DashboardLayout>
  );
}
