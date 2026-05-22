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
  HStack,
  Select,
  Icon,
  IconButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Divider,
} from '@chakra-ui/react';
import { MdAdd, MdCategory, MdEdit, MdDelete } from 'react-icons/md';
import { DataTable } from '@/components/ui/DataTable';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { skillService, Skill, SkillCategory } from '@/services/skillService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCatLoading, setIsCatLoading] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [skillToDelete, setSkillToDelete] = useState<Skill | null>(null);

  // modal skill
  const { isOpen: isFormOpen, onOpen: onFormOpen, onClose: onFormClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  // modal categorias
  const { isOpen: isCatOpen, onOpen: onCatOpen, onClose: onCatClose } = useDisclosure();
  const { isOpen: isCatDeleteOpen, onOpen: onCatDeleteOpen, onClose: onCatDeleteClose } = useDisclosure();

  const [editingCategory, setEditingCategory] = useState<SkillCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<SkillCategory | null>(null);
  const [catFormData, setCatFormData] = useState({ name: '', description: '' });
  const [showCatForm, setShowCatForm] = useState(false);

  const toast = useToast();

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    shortDescription: '',
    fullDescription: '',
    categoryId: '',
    iconUrl: ''
  });

  const loadSkills = async () => {
    try {
      const [skillsResult, catsResult] = await Promise.allSettled([
        skillService.getAll(),
        skillService.getCategories()
      ]);
      setSkills(skillsResult.status      === 'fulfilled' ? skillsResult.value : []);
      setCategories(catsResult.status    === 'fulfilled' ? catsResult.value   : []);
    } catch (error) {
      toast({ title: 'Erro ao carregar competências', status: 'error' });
    }
  };

  useEffect(() => {
    loadSkills();
  }, []);

  // --- Skills ---
  const handleOpenForm = (skill?: Skill) => {
    if (skill) {
      setEditingSkill(skill);
      let catId = skill.categoryId?.toString() || '';
      if (!catId && skill.category) {
        const cat = categories.find(c => c.name === skill.category);
        if (cat) catId = cat.id.toString();
      }
      setFormData({
        name: skill.name || '',
        slug: skill.slug || '',
        shortDescription: skill.shortDescription || '',
        fullDescription: skill.fullDescription || '',
        categoryId: catId,
        iconUrl: skill.iconUrl || ''
      });
    } else {
      setEditingSkill(null);
      setFormData({ name: '', slug: '', shortDescription: '', fullDescription: '', categoryId: '', iconUrl: '' });
    }
    onFormOpen();
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const payload = { ...formData, categoryId: Number(formData.categoryId) };
      if (editingSkill) {
        await skillService.update(editingSkill.id, payload);
        toast({ title: 'Skill atualizada com sucesso', status: 'success' });
      } else {
        await skillService.create(payload);
        toast({ title: 'Skill criada com sucesso', status: 'success' });
      }
      onFormClose();
      loadSkills();
    } catch (error) {
      toast({ title: 'Erro ao salvar', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!skillToDelete) return;
    setIsLoading(true);
    try {
      await skillService.delete(skillToDelete.id);
      toast({ title: 'Competência excluída com sucesso', status: 'success' });
      onDeleteClose();
      loadSkills();
    } catch (error) {
      toast({ title: 'Erro ao excluir', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Categorias ---
  const handleOpenCatModal = () => {
    setShowCatForm(false);
    setEditingCategory(null);
    setCatFormData({ name: '', description: '' });
    onCatOpen();
  };

  const handleEditCategory = (cat: SkillCategory) => {
    setEditingCategory(cat);
    setCatFormData({ name: cat.name, description: cat.description || '' });
    setShowCatForm(true);
  };

  const handleNewCategory = () => {
    setEditingCategory(null);
    setCatFormData({ name: '', description: '' });
    setShowCatForm(true);
  };

  const handleSaveCategory = async () => {
    if (!catFormData.name.trim()) {
      toast({ title: 'Nome é obrigatório', status: 'warning' });
      return;
    }
    setIsCatLoading(true);
    try {
      if (editingCategory) {
        await skillService.updateCategory(editingCategory.id, catFormData);
        toast({ title: 'Categoria atualizada', status: 'success' });
      } else {
        await skillService.createCategory(catFormData);
        toast({ title: 'Categoria criada', status: 'success' });
      }
      const updated = await skillService.getCategories();
      setCategories(updated);
      setShowCatForm(false);
      setEditingCategory(null);
      setCatFormData({ name: '', description: '' });
    } catch (error) {
      toast({ title: 'Erro ao salvar categoria', status: 'error' });
    } finally {
      setIsCatLoading(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setIsCatLoading(true);
    try {
      await skillService.deleteCategory(categoryToDelete.id);
      toast({ title: 'Categoria excluída', status: 'success' });
      const updated = await skillService.getCategories();
      setCategories(updated);
      onCatDeleteClose();
    } catch (error) {
      toast({ title: 'Erro ao excluir categoria', status: 'error' });
    } finally {
      setIsCatLoading(false);
    }
  };

  const columns = [
    { key: 'name', header: 'Nome' },
    { key: 'slug', header: 'Slug' },
    { key: 'category', header: 'Categoria', render: (item: Skill) => item.category || item.categoryId }
  ];

  return (
    <DashboardLayout>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg" color="gray.700">Skills</Heading>
        <HStack spacing={3}>
          <Button leftIcon={<Icon as={MdCategory} />} variant="outline" colorScheme="gray" onClick={handleOpenCatModal}>
            Categorias
          </Button>
          <Button leftIcon={<Icon as={MdAdd} />} colorScheme="primary" onClick={() => handleOpenForm()}>
            Nova Skill
          </Button>
        </HStack>
      </Flex>

      <DataTable
        columns={columns}
        data={skills}
        onEdit={(skill) => handleOpenForm(skill)}
        onDelete={(skill) => {
          setSkillToDelete(skill);
          onDeleteOpen();
        }}
      />

      {/* Modal skill */}
      <Modal isOpen={isFormOpen} onClose={onFormClose} size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingSkill ? 'Editar Skill' : 'Nova Skill'}</ModalHeader>
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
                <FormLabel>Categoria</FormLabel>
                <Select
                  placeholder="Selecione uma categoria"
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Descrição Curta</FormLabel>
                <Input value={formData.shortDescription} onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })} />
              </FormControl>
              <FormControl>
                <FormLabel>Descrição Completa</FormLabel>
                <Textarea rows={4} value={formData.fullDescription} onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value })} />
              </FormControl>
              <FormControl>
                <FormLabel>URL do Ícone</FormLabel>
                <Input value={formData.iconUrl} onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onFormClose} isDisabled={isLoading}>Cancelar</Button>
            <Button colorScheme="primary" onClick={handleSave} isLoading={isLoading}>Salvar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal categorias */}
      <Modal isOpen={isCatOpen} onClose={onCatClose} size="lg" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <Flex justify="space-between" align="center" pr={8}>
              <Text>Categorias de Skills</Text>
              {!showCatForm && (
                <Button size="sm" leftIcon={<Icon as={MdAdd} />} colorScheme="primary" onClick={handleNewCategory}>
                  Nova Categoria
                </Button>
              )}
            </Flex>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {/* Formulário inline */}
              {showCatForm && (
                <Box bg="gray.50" borderRadius="md" p={4} border="1px solid" borderColor="gray.200">
                  <Text fontWeight="medium" mb={3} fontSize="sm" color="gray.600">
                    {editingCategory ? 'Editar categoria' : 'Nova categoria'}
                  </Text>
                  <VStack spacing={3}>
                    <FormControl isRequired>
                      <FormLabel fontSize="sm">Nome</FormLabel>
                      <Input
                        size="sm"
                        value={catFormData.name}
                        onChange={(e) => setCatFormData({ ...catFormData, name: e.target.value })}
                        placeholder="Ex: Linguagem, Comunicação..."
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm">Descrição</FormLabel>
                      <Input
                        size="sm"
                        value={catFormData.description}
                        onChange={(e) => setCatFormData({ ...catFormData, description: e.target.value })}
                        placeholder="Descrição opcional"
                      />
                    </FormControl>
                    <HStack justify="flex-end" w="full" pt={1}>
                      <Button size="sm" variant="ghost" onClick={() => { setShowCatForm(false); setEditingCategory(null); }}>
                        Cancelar
                      </Button>
                      <Button size="sm" colorScheme="primary" onClick={handleSaveCategory} isLoading={isCatLoading}>
                        {editingCategory ? 'Atualizar' : 'Criar'}
                      </Button>
                    </HStack>
                  </VStack>
                </Box>
              )}

              {/* Lista de categorias */}
              {categories.length === 0 ? (
                <Text color="gray.400" textAlign="center" py={6} fontSize="sm">
                  Nenhuma categoria cadastrada.
                </Text>
              ) : (
                <Table size="sm" variant="simple">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th>Nome</Th>
                      <Th>Descrição</Th>
                      <Th width="80px" textAlign="right">Ações</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {categories.map((cat) => (
                      <Tr key={cat.id}>
                        <Td fontWeight="medium">{cat.name}</Td>
                        <Td color="gray.500" fontSize="sm">{cat.description || '—'}</Td>
                        <Td textAlign="right">
                          <HStack spacing={1} justify="flex-end">
                            <IconButton
                              aria-label="Editar"
                              icon={<MdEdit />}
                              size="xs"
                              variant="ghost"
                              colorScheme="blue"
                              onClick={() => handleEditCategory(cat)}
                            />
                            <IconButton
                              aria-label="Excluir"
                              icon={<MdDelete />}
                              size="xs"
                              variant="ghost"
                              colorScheme="red"
                              onClick={() => { setCategoryToDelete(cat); onCatDeleteOpen(); }}
                            />
                          </HStack>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onCatClose}>Fechar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Confirm delete skill */}
      <ConfirmDeleteModal
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        onConfirm={handleDelete}
        isLoading={isLoading}
        title="Excluir Skill"
      />

      {/* Confirm delete categoria */}
      <ConfirmDeleteModal
        isOpen={isCatDeleteOpen}
        onClose={onCatDeleteClose}
        onConfirm={handleDeleteCategory}
        isLoading={isCatLoading}
        title="Excluir Categoria"
      />
    </DashboardLayout>
  );
}
