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
} from '@chakra-ui/react';
import { MdAdd, MdCategory, MdEdit, MdDelete, MdSchool } from 'react-icons/md';
import { Image, FormHelperText } from '@chakra-ui/react';
import { DataTable } from '@/components/ui/DataTable';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { skillService, Skill, SkillCategory } from '@/services/skillService';
import { uploadFile } from '@/services/fileService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCatLoading, setIsCatLoading] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [skillToDelete, setSkillToDelete] = useState<Skill | null>(null);
  const [selectedIconFile, setSelectedIconFile] = useState<File | null>(null);

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
    contentLocale: 'en-US',
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
    } catch {
      toast({ title: 'Erro ao carregar competências', status: 'error' });
    }
  };

  useEffect(() => {
    loadSkills();
  }, []);

  // --- Skills ---
  const handleOpenForm = (skill?: Skill) => {
    setSelectedIconFile(null);
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
        contentLocale: skill.contentLocale || 'en-US',
        categoryId: catId,
        iconUrl: skill.iconUrl || ''
      });
    } else {
      setEditingSkill(null);
      setFormData({ name: '', slug: '', shortDescription: '', fullDescription: '', contentLocale: 'en-US', categoryId: '', iconUrl: '' });
    }
    onFormOpen();
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      let resolvedIconUrl = formData.iconUrl;

      if (selectedIconFile) {
        const uploaded = await uploadFile(selectedIconFile);
        resolvedIconUrl = uploaded.publicUrl;
      }

      const payload = {
        ...formData,
        iconUrl: resolvedIconUrl,
        categoryId: Number(formData.categoryId)
      };

      if (editingSkill) {
        await skillService.update(editingSkill.id, payload);
        toast({ title: 'Skill atualizada com sucesso', status: 'success' });
      } else {
        await skillService.create(payload);
        toast({ title: 'Skill criada com sucesso', status: 'success' });
      }
      onFormClose();
      loadSkills();
    } catch {
      toast({ title: 'Erro ao salvar skill', status: 'error' });
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
    } catch {
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
    } catch {
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
    } catch {
      toast({ title: 'Erro ao excluir categoria', status: 'error' });
    } finally {
      setIsCatLoading(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Nome',
      render: (item: Skill) => (
        <HStack spacing={3} align="center">
          {item.iconUrl ? (
            <Image
              src={item.iconUrl}
              alt={item.name}
              boxSize="28px"
              objectFit="cover"
              borderRadius="md"
              fallback={<Icon as={MdSchool} boxSize="28px" color="gray.400" />}
            />
          ) : (
            <Flex
              boxSize="28px"
              borderRadius="md"
              bg="gray.100"
              align="center"
              justify="center"
            >
              <Icon as={MdSchool} color="gray.500" boxSize="18px" />
            </Flex>
          )}
          <Text fontWeight="medium">{item.name}</Text>
        </HStack>
      )
    },
    { key: 'slug', header: 'Slug' },
    { key: 'contentLocale', header: 'Idioma do conteúdo' },
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
                <FormLabel>Idioma do conteúdo</FormLabel>
                <Select
                  value={formData.contentLocale}
                  onChange={(e) => setFormData({ ...formData, contentLocale: e.target.value })}
                >
                  <option value="en-US">Inglês (en-US)</option>
                  <option value="es-ES">Espanhol (es-ES)</option>
                  <option value="it-IT">Italiano (it-IT)</option>
                  <option value="de-DE">Alemão (de-DE)</option>
                  <option value="fr-FR">Francês (fr-FR)</option>
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
                <FormLabel>Ícone da Skill</FormLabel>
                <HStack spacing={4} mb={3} align="center">
                  {selectedIconFile ? (
                    <Image
                      src={URL.createObjectURL(selectedIconFile)}
                      alt="Preview do Ícone"
                      boxSize="48px"
                      objectFit="cover"
                      borderRadius="md"
                      border="1px solid"
                      borderColor="gray.200"
                    />
                  ) : formData.iconUrl ? (
                    <Image
                      src={formData.iconUrl}
                      alt="Ícone cadastrado"
                      boxSize="48px"
                      objectFit="cover"
                      borderRadius="md"
                      border="1px solid"
                      borderColor="gray.200"
                      fallback={<Icon as={MdSchool} boxSize="48px" color="gray.400" />}
                    />
                  ) : (
                    <Flex
                      boxSize="48px"
                      borderRadius="md"
                      bg="gray.100"
                      align="center"
                      justify="center"
                      border="1px dashed"
                      borderColor="gray.300"
                    >
                      <Icon as={MdSchool} boxSize="24px" color="gray.400" />
                    </Flex>
                  )}
                  <VStack align="flex-start" spacing={1}>
                    <Text fontSize="xs" fontWeight="medium" color="gray.600">
                      {selectedIconFile
                        ? `Arquivo: ${selectedIconFile.name}`
                        : formData.iconUrl
                        ? 'Ícone cadastrado'
                        : 'Nenhum ícone selecionado'}
                    </Text>
                    {(selectedIconFile || formData.iconUrl) && (
                      <Button
                        size="xs"
                        colorScheme="red"
                        variant="ghost"
                        onClick={() => {
                          setSelectedIconFile(null);
                          setFormData({ ...formData, iconUrl: '' });
                        }}
                      >
                        Remover ícone
                      </Button>
                    )}
                  </VStack>
                </HStack>

                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedIconFile(e.target.files[0]);
                    }
                  }}
                  p={1}
                  mb={2}
                />
                <FormHelperText fontSize="xs">
                  Ou insira a URL da imagem manualmente:
                </FormHelperText>
                <Input
                  size="sm"
                  placeholder="https://..."
                  value={formData.iconUrl}
                  onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
                  mt={1}
                />
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
