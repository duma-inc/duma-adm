'use client'

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
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
  HStack,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';
import { MdAdd, MdArticle, MdFolder, MdSearch } from 'react-icons/md';
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
  questions: '',
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

  // States for filtering
  const [searchText, setSearchText] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('ALL');

  const [editingCategory, setEditingCategory] = useState<NewsCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<NewsCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categorySortOrder, setCategorySortOrder] = useState('');

  const { isOpen: isArticleOpen, onOpen: onArticleOpen, onClose: onArticleClose } = useDisclosure();
  const { isOpen: isCategoryOpen, onOpen: onCategoryOpen, onClose: onCategoryClose } = useDisclosure();
  const { isOpen: isDeleteArticleOpen, onOpen: onDeleteArticleOpen, onClose: onDeleteArticleClose } = useDisclosure();
  const { isOpen: isDeleteCategoryOpen, onOpen: onDeleteCategoryOpen, onClose: onDeleteCategoryClose } = useDisclosure();
  const toast = useToast();
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, []);  // toastRef evita loop infinito

  const loadAll = useCallback(async () => {
    try {
      const [articlesResult, categoriesResult] = await Promise.allSettled([
        newsService.getAll(),
        newsCategoryService.getAll(),
      ]);

      setArticles(articlesResult.status === 'fulfilled' ? articlesResult.value : []);
      setCategories(categoriesResult.status === 'fulfilled' ? categoriesResult.value : []);
    } catch {
      toastRef.current({ title: 'Erro ao carregar notícias', status: 'error' });
    }
  }, []);

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
        questions: article.questions ? JSON.stringify(article.questions, null, 2) : '',
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
      toastRef.current({ title: 'Preencha categoria, headline, resumo, fonte, data e conteúdo', status: 'warning' });
      return;
    }

    let questions: unknown = null;
    if (articleForm.questions.trim()) {
      try {
        questions = JSON.parse(articleForm.questions);
      } catch {
        toastRef.current({ title: 'Questões: JSON inválido', status: 'error' });
        return;
      }

      const invalida = !Array.isArray(questions) || questions.some((item) => {
        const questao = item as { question?: unknown; options?: unknown; correctIndex?: unknown };
        return typeof questao?.question !== 'string'
          || !questao.question.trim()
          || !Array.isArray(questao.options)
          || questao.options.length !== 4
          || typeof questao.correctIndex !== 'number'
          || questao.correctIndex < 0
          || questao.correctIndex > 3;
      });

      if (invalida) {
        toastRef.current({
          title: 'Questões: cada item precisa de question, 4 options e correctIndex entre 0 e 3',
          status: 'error',
        });
        return;
      }
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
        questions,
      };

      if (editingArticle) {
        await newsService.update(String(editingArticle.id), payload);
        toastRef.current({ title: 'Notícia atualizada com sucesso', status: 'success' });
      } else {
        await newsService.create(payload);
        toastRef.current({ title: 'Notícia criada com sucesso', status: 'success' });
      }

      onArticleClose();
      loadAll();
    } catch (error) {
      toastRef.current({ title: getErrorMessage(error, 'Erro ao salvar notícia'), status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteArticle = async () => {
    if (!articleToDelete) return;

    setIsLoading(true);
    try {
      await newsService.delete(String(articleToDelete.id));
      toastRef.current({ title: 'Notícia excluída com sucesso', status: 'success' });
      onDeleteArticleClose();
      loadAll();
    } catch (error) {
      toastRef.current({ title: getErrorMessage(error, 'Erro ao excluir notícia'), status: 'error' });
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
        await newsCategoryService.update(String(editingCategory.id), payload);
        toastRef.current({ title: 'Categoria atualizada com sucesso', status: 'success' });
      } else {
        await newsCategoryService.create(payload);
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
      await newsCategoryService.delete(String(categoryToDelete.id));
      toastRef.current({ title: 'Categoria excluída com sucesso', status: 'success' });
      onDeleteCategoryClose();
      loadAll();
    } catch (error) {
      toastRef.current({ title: getErrorMessage(error, 'Erro ao excluir categoria'), status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredArticles = articles.filter((art) => {
    const matchesText = !searchText ||
      art.headline.toLowerCase().includes(searchText.toLowerCase()) ||
      (art.summary && art.summary.toLowerCase().includes(searchText.toLowerCase())) ||
      (art.source && art.source.toLowerCase().includes(searchText.toLowerCase()));
    
    const matchesCategory = selectedCategoryId === 'ALL' || String(art.categoryId) === selectedCategoryId;

    return matchesText && matchesCategory;
  });

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

          {/* Filtros */}
          <HStack spacing={4} mb={6} align="center" flexWrap="wrap" gap={3}>
            <InputGroup maxW="320px">
              <InputLeftElement pointerEvents="none">
                <Icon as={MdSearch} color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Buscar por headline, resumo ou fonte..."
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
            data={filteredArticles}
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

              <FormControl>
                <FormLabel>Questões (JSON)</FormLabel>
                <Textarea
                  value={articleForm.questions}
                  onChange={(e) => setArticleForm({ ...articleForm, questions: e.target.value })}
                  rows={12}
                  fontFamily="mono"
                  fontSize="sm"
                  placeholder={'[\n  {\n    "id": "q1",\n    "type": "MULTIPLE_CHOICE",\n    "question": "...",\n    "options": ["A", "B", "C", "D"],\n    "correctIndex": 1,\n    "explanation": "..."\n  }\n]'}
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Opcional. Cada item: 4 opções e correctIndex entre 0 e 3. Deixe vazio para não ter quiz.
                </Text>
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
