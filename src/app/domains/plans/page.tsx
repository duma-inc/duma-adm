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
  VStack,
  HStack,
  Select,
  Text,
  Badge,
  Icon,
  IconButton,
  Switch,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Divider,
  Tag,
} from '@chakra-ui/react';
import { MdAdd, MdDelete, MdStar } from 'react-icons/md';
import { DataTable } from '@/components/ui/DataTable';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { planService, Plan, PlanPeriod, PlanResource } from '@/services/planService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const PERIOD_LABELS: Record<PlanPeriod, string> = {
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  SEMIANNUAL: 'Semestral',
  ANNUAL: 'Anual',
  FOREVER: 'Pra Sempre',
};

const INITIAL_FORM = {
  nome: '',
  preco: '',
  periodo: 'MONTHLY' as PlanPeriod,
  destaque: false,
  recursos: [
    { texto: '', ativo: true },
  ] as PlanResource[],
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const { isOpen: isFormOpen, onOpen: onFormOpen, onClose: onFormClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const toast = useToast();

  const loadAll = async () => {
    try {
      const data = await planService.getAll();
      setPlans(data);
    } catch {
      toast({ title: 'Erro ao carregar planos', status: 'error' });
    }
  };

  useEffect(() => { loadAll(); }, []);

  // --- recursos ---
  const handleResourceChange = (index: number, field: keyof PlanResource, value: string | boolean) => {
    const updated = formData.recursos.map((r, i) =>
      i !== index ? r : { ...r, [field]: value }
    );
    setFormData({ ...formData, recursos: updated });
  };

  const handleAddResource = () => {
    setFormData({ ...formData, recursos: [...formData.recursos, { texto: '', ativo: true }] });
  };

  const handleRemoveResource = (index: number) => {
    if (formData.recursos.length <= 1) {
      toast({ title: 'Mínimo de 1 recurso', status: 'warning' });
      return;
    }
    setFormData({ ...formData, recursos: formData.recursos.filter((_, i) => i !== index) });
  };

  // --- CRUD ---
  const handleOpenForm = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        nome: plan.nome,
        preco: plan.preco,
        periodo: plan.periodo,
        destaque: plan.destaque,
        recursos: plan.recursos?.length ? plan.recursos : INITIAL_FORM.recursos,
      });
    } else {
      setEditingPlan(null);
      setFormData(INITIAL_FORM);
    }
    onFormOpen();
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast({ title: 'Nome é obrigatório', status: 'warning' });
      return;
    }
    if (!formData.preco.trim()) {
      toast({ title: 'Preço é obrigatório', status: 'warning' });
      return;
    }
    if (formData.recursos.some(r => !r.texto.trim())) {
      toast({ title: 'Preencha o texto de todos os recursos', status: 'warning' });
      return;
    }

    setIsLoading(true);
    try {
      if (editingPlan) {
        await planService.update(editingPlan.id, formData);
        toast({ title: 'Plano atualizado com sucesso', status: 'success' });
      } else {
        await planService.create(formData);
        toast({ title: 'Plano criado com sucesso', status: 'success' });
      }
      onFormClose();
      loadAll();
    } catch {
      toast({ title: 'Erro ao salvar plano', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!planToDelete) return;
    setIsLoading(true);
    try {
      await planService.delete(planToDelete.id);
      toast({ title: 'Plano excluído com sucesso', status: 'success' });
      onDeleteClose();
      loadAll();
    } catch {
      toast({ title: 'Erro ao excluir plano', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    {
      key: 'nome',
      header: 'Nome',
      render: (item: Plan) => (
        <HStack spacing={2}>
          <Text fontWeight="medium">{item.nome}</Text>
          {item.destaque && (
            <Tag size="sm" colorScheme="yellow" variant="subtle">
              <Icon as={MdStar} mr={1} /> Destaque
            </Tag>
          )}
        </HStack>
      ),
    },
    {
      key: 'preco',
      header: 'Preço',
      render: (item: Plan) => (
        <Text fontWeight="semibold" color="green.600">{item.preco}</Text>
      ),
    },
    {
      key: 'periodo',
      header: 'Período',
      render: (item: Plan) => (
        <Badge colorScheme="blue" fontSize="xs">{PERIOD_LABELS[item.periodo] ?? item.periodo}</Badge>
      ),
    },
    {
      key: 'recursos',
      header: 'Recursos',
      render: (item: Plan) => (
        <Text fontSize="sm" color="gray.500">
          {item.recursos?.filter(r => r.ativo).length ?? 0} ativos / {item.recursos?.length ?? 0} total
        </Text>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg" color="gray.700">Planos</Heading>
        <Button leftIcon={<Icon as={MdAdd} />} colorScheme="primary" onClick={() => handleOpenForm()}>
          Novo Plano
        </Button>
      </Flex>

      <DataTable
        columns={columns}
        data={plans}
        onEdit={(p) => handleOpenForm(p)}
        onDelete={(p) => { setPlanToDelete(p); onDeleteOpen(); }}
      />

      {/* Modal formulário */}
      <Modal isOpen={isFormOpen} onClose={onFormClose} size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingPlan ? 'Editar Plano' : 'Novo Plano'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={5} align="stretch">
              <HStack spacing={4} align="flex-start">
                <FormControl isRequired>
                  <FormLabel>Nome</FormLabel>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Fast Trimestral"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Preço</FormLabel>
                  <Input
                    value={formData.preco}
                    onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                    placeholder="Ex: R$ 229,90"
                  />
                </FormControl>
              </HStack>

              <HStack spacing={4} align="flex-end">
                <FormControl isRequired>
                  <FormLabel>Período</FormLabel>
                  <Select
                    value={formData.periodo}
                    onChange={(e) => setFormData({ ...formData, periodo: e.target.value as PlanPeriod })}
                  >
                    <option value="MONTHLY">Mensal</option>
                    <option value="QUARTERLY">Trimestral</option>
                    <option value="SEMIANNUAL">Semestral</option>
                    <option value="ANNUAL">Anual</option>
                    <option value="FOREVER">Pra Sempre</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Destaque</FormLabel>
                  <HStack h="40px">
                    <Switch
                      colorScheme="yellow"
                      isChecked={formData.destaque}
                      onChange={(e) => setFormData({ ...formData, destaque: e.target.checked })}
                    />
                    <Text fontSize="sm" color={formData.destaque ? 'yellow.600' : 'gray.400'}>
                      {formData.destaque ? 'Sim' : 'Não'}
                    </Text>
                  </HStack>
                </FormControl>
              </HStack>

              <Divider />

              {/* Recursos */}
              <Box>
                <Flex justify="space-between" align="center" mb={3}>
                  <Text fontWeight="semibold" fontSize="sm" color="gray.600">Recursos do plano</Text>
                  <Button size="xs" leftIcon={<Icon as={MdAdd} />} variant="outline" onClick={handleAddResource}>
                    Adicionar recurso
                  </Button>
                </Flex>

                <Table size="sm" variant="simple">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th>Descrição do recurso</Th>
                      <Th w="80px" textAlign="center">Ativo</Th>
                      <Th w="40px" />
                    </Tr>
                  </Thead>
                  <Tbody>
                    {formData.recursos.map((recurso, index) => (
                      <Tr key={index} bg={recurso.ativo ? undefined : 'gray.50'}>
                        <Td>
                          <Input
                            size="sm"
                            value={recurso.texto}
                            onChange={(e) => handleResourceChange(index, 'texto', e.target.value)}
                            placeholder={`Recurso ${index + 1}`}
                            color={recurso.ativo ? undefined : 'gray.400'}
                          />
                        </Td>
                        <Td textAlign="center">
                          <Switch
                            size="sm"
                            colorScheme="green"
                            isChecked={recurso.ativo}
                            onChange={(e) => handleResourceChange(index, 'ativo', e.target.checked)}
                          />
                        </Td>
                        <Td>
                          <IconButton
                            aria-label="Remover recurso"
                            icon={<MdDelete />}
                            size="xs"
                            variant="ghost"
                            colorScheme="red"
                            onClick={() => handleRemoveResource(index)}
                          />
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
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
        title="Excluir Plano"
      />
    </DashboardLayout>
  );
}
