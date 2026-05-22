'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
  Divider,
  SimpleGrid,
  Textarea,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Tooltip as ChakraTooltip,
  Stat,
  StatLabel,
  StatNumber,
  Grid,
  GridItem,
} from '@chakra-ui/react';
import {
  MdAdd,
  MdDelete,
  MdAttachMoney,
  MdTrendingUp,
  MdTrendingDown,
  MdSettings,
  MdSearch,
} from 'react-icons/md';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';

import { DataTable } from '@/components/ui/DataTable';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { cashCategoryService, CashCategory } from '@/services/cashCategoryService';
import { cashTransactionService, CashTransaction, CashSummary, TransactionType } from '@/services/cashTransactionService';
import { studentService, Student } from '@/services/studentService';
import { userService, User } from '@/services/userService';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export default function CashFlowPage() {
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [categories, setCategories] = useState<CashCategory[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [summary, setSummary] = useState<CashSummary>({ totalEntry: 0, totalExit: 0, balance: 0 });
  const [isLoading, setIsLoading] = useState(false);

  // Modals disclosure
  const { isOpen: isEntryOpen, onOpen: onEntryOpen, onClose: onEntryClose } = useDisclosure();
  const { isOpen: isExitOpen, onOpen: onExitOpen, onClose: onExitClose } = useDisclosure();
  const { isOpen: isCategoryOpen, onOpen: onCategoryOpen, onClose: onCategoryClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  // Selected for delete
  const [transactionToDelete, setTransactionToDelete] = useState<CashTransaction | null>(null);

  // Form states
  const [entryForm, setEntryForm] = useState({
    amount: '',
    discount: '',
    categoryId: '',
    studentId: '',
    responsibleUserId: '',
    observations: '',
    transactionDate: new Date().toISOString().split('T')[0],
  });

  const [exitForm, setExitForm] = useState({
    amount: '',
    categoryId: '',
    responsibleUserId: '',
    observations: '',
    transactionDate: new Date().toISOString().split('T')[0],
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
  });

  // Filter terms
  const [studentSearch, setStudentSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [exitUserSearch, setExitUserSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'ENTRY' | 'EXIT'>('ALL');
  const [tableSearch, setTableSearch] = useState('');

  const toast = useToast();

  // Load everything
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [transResult, catResult, studResult, usersResult, sumResult] = await Promise.allSettled([
        cashTransactionService.getAll(),
        cashCategoryService.getAll(),
        studentService.getAll(),
        userService.getAll(),
        cashTransactionService.getSummary(),
      ]);
      setTransactions(transResult.status === 'fulfilled' ? transResult.value : []);
      setCategories(catResult.status     === 'fulfilled' ? catResult.value   : []);
      setStudents(studResult.status      === 'fulfilled' ? studResult.value  : []);
      setUsers(usersResult.status        === 'fulfilled' ? usersResult.value : []);
      setSummary(sumResult.status        === 'fulfilled' ? sumResult.value   : { totalEntry: 0, totalExit: 0, balance: 0 });
    } catch (err) {
      toast({ title: 'Erro ao carregar dados do fluxo de caixa', status: 'error', duration: 4000 });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reactive filters
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const term = studentSearch.toLowerCase();
      return (
        s.user.name?.toLowerCase().includes(term) ||
        s.user.email?.toLowerCase().includes(term)
      );
    });
  }, [students, studentSearch]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const term = userSearch.toLowerCase();
      return (
        u.name?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term)
      );
    });
  }, [users, userSearch]);

  const filteredExitUsers = useMemo(() => {
    return users.filter(u => {
      const term = exitUserSearch.toLowerCase();
      return (
        u.name?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term)
      );
    });
  }, [users, exitUserSearch]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (filterType !== 'ALL' && t.type !== filterType) {
        return false;
      }
      if (tableSearch.trim()) {
        const term = tableSearch.toLowerCase();
        return (
          t.categoryName?.toLowerCase().includes(term) ||
          t.studentName?.toLowerCase().includes(term) ||
          t.responsibleUserName?.toLowerCase().includes(term) ||
          t.observations?.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [transactions, filterType, tableSearch]);

  // Recharts aggregator: groups entries and exits daily
  const chartData = useMemo(() => {
    const groups: Record<string, { date: string; rawDate: string; Entradas: number; Saídas: number }> = {};
    
    // Process chronologically (reverse to make oldest date first)
    const reversedTrans = [...transactions].reverse();
    
    reversedTrans.forEach(t => {
      const dateKey = t.transactionDate;
      const formattedDate = new Date(t.transactionDate + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      });

      if (!groups[dateKey]) {
        groups[dateKey] = { date: formattedDate, rawDate: dateKey, Entradas: 0, Saídas: 0 };
      }
      
      if (t.type === 'ENTRY') {
        groups[dateKey].Entradas += t.amount;
      } else {
        groups[dateKey].Saídas += t.amount;
      }
    });

    return Object.values(groups).sort((a, b) => a.rawDate.localeCompare(b.rawDate));
  }, [transactions]);

  // Launch submissions
  const handleSaveEntry = async () => {
    if (!entryForm.amount || Number(entryForm.amount) <= 0) {
      toast({ title: 'Valor deve ser maior que zero', status: 'warning' });
      return;
    }
    if (!entryForm.categoryId) {
      toast({ title: 'Selecione uma categoria', status: 'warning' });
      return;
    }
    if (!entryForm.studentId) {
      toast({ title: 'Selecione um estudante', status: 'warning' });
      return;
    }

    setIsLoading(true);
    try {
      await cashTransactionService.create({
        type: 'ENTRY',
        amount: Number(entryForm.amount),
        discount: entryForm.discount ? Number(entryForm.discount) : undefined,
        categoryId: Number(entryForm.categoryId),
        studentId: entryForm.studentId,
        responsibleUserId: entryForm.responsibleUserId || undefined,
        observations: entryForm.observations,
        transactionDate: entryForm.transactionDate,
      });

      toast({ title: 'Entrada registrada com sucesso', status: 'success' });
      onEntryClose();
      // reset form
      setEntryForm({
        amount: '',
        discount: '',
        categoryId: '',
        studentId: '',
        responsibleUserId: '',
        observations: '',
        transactionDate: new Date().toISOString().split('T')[0],
      });
      setStudentSearch('');
      setUserSearch('');
      loadData();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar entrada', description: err?.response?.data?.message || '', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveExit = async () => {
    if (!exitForm.amount || Number(exitForm.amount) <= 0) {
      toast({ title: 'Valor deve ser maior que zero', status: 'warning' });
      return;
    }
    if (!exitForm.categoryId) {
      toast({ title: 'Selecione uma categoria', status: 'warning' });
      return;
    }

    setIsLoading(true);
    try {
      await cashTransactionService.create({
        type: 'EXIT',
        amount: Number(exitForm.amount),
        categoryId: Number(exitForm.categoryId),
        responsibleUserId: exitForm.responsibleUserId || undefined,
        observations: exitForm.observations,
        transactionDate: exitForm.transactionDate,
      });

      toast({ title: 'Saída registrada com sucesso', status: 'success' });
      onExitClose();
      // reset form
      setExitForm({
        amount: '',
        categoryId: '',
        responsibleUserId: '',
        observations: '',
        transactionDate: new Date().toISOString().split('T')[0],
      });
      setExitUserSearch('');
      loadData();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar saída', description: err?.response?.data?.message || '', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast({ title: 'Nome da categoria é obrigatório', status: 'warning' });
      return;
    }

    setIsLoading(true);
    try {
      await cashCategoryService.create({
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim() || undefined,
      });
      toast({ title: 'Categoria cadastrada', status: 'success' });
      setCategoryForm({ name: '', description: '' });
      loadData();
    } catch (err: any) {
      toast({ title: 'Erro ao criar categoria', description: err?.response?.data?.message || '', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await cashCategoryService.delete(id);
      toast({ title: 'Categoria removida com sucesso', status: 'success' });
      loadData();
    } catch (err: any) {
      toast({
        title: 'Erro ao remover categoria',
        description: err?.response?.data?.message || 'A categoria pode estar associada a lançamentos existentes.',
        status: 'error',
      });
    }
  };

  const handleDeleteTransaction = async () => {
    if (!transactionToDelete) return;
    setIsLoading(true);
    try {
      await cashTransactionService.delete(transactionToDelete.id);
      toast({ title: 'Lançamento excluído com sucesso', status: 'success' });
      onDeleteClose();
      loadData();
    } catch (err: any) {
      toast({ title: 'Erro ao excluir lançamento', description: err?.response?.data?.message || '', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Columns for the log Table
  const columns = [
    {
      key: 'type',
      header: 'Tipo',
      render: (item: CashTransaction) => (
        <Badge
          colorScheme={item.type === 'ENTRY' ? 'green' : 'red'}
          px={3}
          py={1}
          borderRadius="full"
          fontSize="xs"
          fontWeight="bold"
        >
          {item.type === 'ENTRY' ? 'Entrada' : 'Saída'}
        </Badge>
      ),
    },
    {
      key: 'transactionDate',
      header: 'Data',
      render: (item: CashTransaction) => {
        const parts = item.transactionDate.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      },
    },
    {
      key: 'categoryName',
      header: 'Categoria',
      render: (item: CashTransaction) => (
        <Text fontWeight="semibold" color="gray.700">
          {item.categoryName}
        </Text>
      ),
    },
    {
      key: 'studentName',
      header: 'Estudante',
      render: (item: CashTransaction) => (
        <Text fontSize="sm" color="gray.600">
          {item.studentName || '—'}
        </Text>
      ),
    },
    {
      key: 'amount',
      header: 'Valor',
      render: (item: CashTransaction) => (
        <Text
          fontWeight="bold"
          color={item.type === 'ENTRY' ? 'green.600' : 'red.600'}
        >
          {item.type === 'ENTRY' ? '+' : '-'} {formatCurrency(item.amount)}
        </Text>
      ),
    },
    {
      key: 'discount',
      header: 'Desconto',
      render: (item: CashTransaction) => (
        <Text fontSize="sm" color="gray.500">
          {item.discount ? formatCurrency(item.discount) : '—'}
        </Text>
      ),
    },
    {
      key: 'responsibleUserName',
      header: 'Responsável',
      render: (item: CashTransaction) => (
        <Text fontSize="sm" color="gray.600">
          {item.responsibleUserName || '—'}
        </Text>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <Flex direction="column" gap={6}>
        {/* Header */}
        <Flex justify="space-between" align="center">
          <Box>
            <Heading as="h1" size="lg" color="gray.700">
              Fluxo de Caixa
            </Heading>
            <Text color="gray.500" mt={2}>
              Acompanhamento financeiro, receitas, despesas e saldo geral (BRL)
            </Text>
          </Box>
          <HStack spacing={3}>
            <Button
              leftIcon={<Icon as={MdSettings} />}
              variant="outline"
              colorScheme="gray"
              onClick={onCategoryOpen}
            >
              Categorias
            </Button>
            <Button
              leftIcon={<Icon as={MdTrendingDown} />}
              colorScheme="red"
              onClick={onExitOpen}
            >
              Nova Saída
            </Button>
            <Button
              leftIcon={<Icon as={MdTrendingUp} />}
              colorScheme="green"
              onClick={onEntryOpen}
            >
              Nova Entrada
            </Button>
          </HStack>
        </Flex>

        {/* Dashboard Metric Cards */}
        <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4}>
          <GridItem>
            <Box bg="white" borderRadius="md" boxShadow="sm" p={5}>
              <Stat>
                <StatLabel color="gray.500" fontSize="sm">Total de Entradas</StatLabel>
                <StatNumber color="green.600" mt={1} fontSize="2xl" fontWeight="bold">
                  {formatCurrency(summary.totalEntry)}
                </StatNumber>
              </Stat>
            </Box>
          </GridItem>
          
          <GridItem>
            <Box bg="white" borderRadius="md" boxShadow="sm" p={5}>
              <Stat>
                <StatLabel color="gray.500" fontSize="sm">Total de Saídas</StatLabel>
                <StatNumber color="red.600" mt={1} fontSize="2xl" fontWeight="bold">
                  {formatCurrency(summary.totalExit)}
                </StatNumber>
              </Stat>
            </Box>
          </GridItem>

          <GridItem>
            <Box bg="white" borderRadius="md" boxShadow="sm" p={5}>
              <Stat>
                <StatLabel color="gray.500" fontSize="sm">Saldo Geral do Caixa</StatLabel>
                <StatNumber
                  color={summary.balance >= 0 ? 'blue.600' : 'orange.600'}
                  mt={1}
                  fontSize="2xl"
                  fontWeight="bold"
                >
                  {formatCurrency(summary.balance)}
                </StatNumber>
              </Stat>
            </Box>
          </GridItem>
        </Grid>

        {/* Chart Visualization */}
        <Box bg="white" borderRadius="md" boxShadow="sm" p={5}>
          <Heading size="md" mb={4} color="gray.700">
            Gráfico de Fluxo de Caixa
          </Heading>
          <Box h="300px" w="full">
            {chartData.length === 0 ? (
              <Flex h="full" align="center" justify="center" direction="column">
                <Text color="gray.400">Sem lançamentos para exibir o gráfico.</Text>
              </Flex>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#48BB78" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#48BB78" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F56565" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#F56565" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" stroke="#718096" fontSize={12} tickLine={false} />
                  <YAxis
                    stroke="#718096"
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(val) => `R$ ${val}`}
                  />
                  <RechartsTooltip
                    formatter={(value: any) => [formatCurrency(Number(value)), '']}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                    }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Area
                    type="monotone"
                    dataKey="Entradas"
                    stroke="#48BB78"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorEntradas)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Saídas"
                    stroke="#F56565"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSaidas)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Box>
        </Box>

        {/* Transactions Table Log */}
        <Box bg="white" borderRadius="md" boxShadow="sm" p={5}>
          <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" align={{ base: 'stretch', md: 'center' }} gap={4} mb={6}>
            <Heading size="md" color="gray.700">
              Histórico de Lançamentos
            </Heading>
            
            <HStack spacing={3} align="center">
              <FormControl w={{ base: 'full', md: '200px' }}>
                <Select
                  size="sm"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                >
                  <option value="ALL">Todos os Tipos</option>
                  <option value="ENTRY">Apenas Entradas</option>
                  <option value="EXIT">Apenas Saídas</option>
                </Select>
              </FormControl>
              
              <HStack spacing={2} border="1px solid" borderColor="gray.200" borderRadius="md" px={3} py={1} w={{ base: 'full', md: '260px' }}>
                <Icon as={MdSearch} color="gray.400" />
                <Input
                  variant="unstyled"
                  size="sm"
                  placeholder="Buscar no histórico..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                />
              </HStack>
            </HStack>
          </Flex>
          <DataTable
            columns={columns}
            data={filteredTransactions}
            onEdit={undefined} // Disable direct edits to preserve history integrity
            onDelete={(t) => {
              setTransactionToDelete(t);
              onDeleteOpen();
            }}
          />
        </Box>
      </Flex>

      {/* Modal: Nova Entrada */}
      <Modal isOpen={isEntryOpen} onClose={onEntryClose} size="lg" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent borderRadius="xl">
          <ModalHeader color="green.700" fontWeight="bold">
            Registrar Nova Entrada (Receita)
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Valor (R$)</FormLabel>
                <Input
                  type="number"
                  placeholder="0,00"
                  step="0.01"
                  value={entryForm.amount}
                  onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Desconto (R$ - opcional)</FormLabel>
                <Input
                  type="number"
                  placeholder="0,00"
                  step="0.01"
                  value={entryForm.discount}
                  onChange={(e) => setEntryForm({ ...entryForm, discount: e.target.value })}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Categoria</FormLabel>
                <Select
                  placeholder="Selecione a categoria"
                  value={entryForm.categoryId}
                  onChange={(e) => setEntryForm({ ...entryForm, categoryId: e.target.value })}
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <Divider py={1} />

              <FormControl isRequired>
                <FormLabel>Estudante Associado</FormLabel>
                <HStack mb={2}>
                  <Icon as={MdSearch} color="gray.400" />
                  <Input
                    size="sm"
                    placeholder="Filtrar estudante por nome/email..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                </HStack>
                <Select
                  placeholder="Selecione o estudante"
                  value={entryForm.studentId}
                  onChange={(e) => setEntryForm({ ...entryForm, studentId: e.target.value })}
                >
                  {filteredStudents.map((s) => (
                    <option key={s.user.id} value={s.user.id}>
                      {s.user.name} ({s.user.email})
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Usuário Responsável pelo Pagamento (com busca)</FormLabel>
                <HStack mb={2}>
                  <Icon as={MdSearch} color="gray.400" />
                  <Input
                    size="sm"
                    placeholder="Filtrar responsável por nome/email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </HStack>
                <Select
                  placeholder="Selecione o usuário responsável"
                  value={entryForm.responsibleUserId}
                  onChange={(e) => setEntryForm({ ...entryForm, responsibleUserId: e.target.value })}
                >
                  {filteredUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Data do Lançamento</FormLabel>
                <Input
                  type="date"
                  value={entryForm.transactionDate}
                  onChange={(e) => setEntryForm({ ...entryForm, transactionDate: e.target.value })}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Observações</FormLabel>
                <Textarea
                  placeholder="Adicione notas adicionais sobre a transação..."
                  value={entryForm.observations}
                  onChange={(e) => setEntryForm({ ...entryForm, observations: e.target.value })}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEntryClose} isDisabled={isLoading}>
              Cancelar
            </Button>
            <Button colorScheme="green" onClick={handleSaveEntry} isLoading={isLoading}>
              Registrar Entrada
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal: Nova Saída */}
      <Modal isOpen={isExitOpen} onClose={onExitClose} size="lg" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent borderRadius="xl">
          <ModalHeader color="red.700" fontWeight="bold">
            Registrar Nova Saída (Despesa)
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Valor (R$)</FormLabel>
                <Input
                  type="number"
                  placeholder="0,00"
                  step="0.01"
                  value={exitForm.amount}
                  onChange={(e) => setExitForm({ ...exitForm, amount: e.target.value })}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Categoria</FormLabel>
                <Select
                  placeholder="Selecione a categoria"
                  value={exitForm.categoryId}
                  onChange={(e) => setExitForm({ ...exitForm, categoryId: e.target.value })}
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Usuário Responsável (opcional)</FormLabel>
                <HStack mb={2}>
                  <Icon as={MdSearch} color="gray.400" />
                  <Input
                    size="sm"
                    placeholder="Filtrar usuário por nome/email..."
                    value={exitUserSearch}
                    onChange={(e) => setExitUserSearch(e.target.value)}
                  />
                </HStack>
                <Select
                  placeholder="Selecione o usuário autorizado"
                  value={exitForm.responsibleUserId}
                  onChange={(e) => setExitForm({ ...exitForm, responsibleUserId: e.target.value })}
                >
                  {filteredExitUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Data da Saída</FormLabel>
                <Input
                  type="date"
                  value={exitForm.transactionDate}
                  onChange={(e) => setExitForm({ ...exitForm, transactionDate: e.target.value })}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Observações</FormLabel>
                <Textarea
                  placeholder="Adicione notas adicionais sobre o pagamento..."
                  value={exitForm.observations}
                  onChange={(e) => setExitForm({ ...exitForm, observations: e.target.value })}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onExitClose} isDisabled={isLoading}>
              Cancelar
            </Button>
            <Button colorScheme="red" onClick={handleSaveExit} isLoading={isLoading}>
              Registrar Saída
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal: Gerenciar Categorias */}
      <Modal isOpen={isCategoryOpen} onClose={onCategoryClose} size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent borderRadius="xl">
          <ModalHeader fontWeight="bold">Gerenciar Categorias de Lançamento</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Tabs variant="enclosed" colorScheme="primary">
              <TabList>
                <Tab>Listagem</Tab>
                <Tab>Cadastrar Nova</Tab>
              </TabList>
              <TabPanels mt={4}>
                <TabPanel p={0}>
                  <Box maxHeight="300px" overflowY="auto" border="1px solid" borderColor="gray.100" borderRadius="lg">
                    {categories.length === 0 ? (
                      <Flex p={6} align="center" justify="center">
                        <Text color="gray.400">Nenhuma categoria cadastrada.</Text>
                      </Flex>
                    ) : (
                      categories.map((cat) => (
                        <Flex
                          key={cat.id}
                          justify="space-between"
                          align="center"
                          p={4}
                          borderBottom="1px solid"
                          borderColor="gray.100"
                          _hover={{ bg: 'gray.50' }}
                        >
                          <Box>
                            <Text fontWeight="semibold" color="gray.800">
                              {cat.name}
                            </Text>
                            {cat.description && (
                              <Text fontSize="xs" color="gray.500" mt={1}>
                                {cat.description}
                              </Text>
                            )}
                          </Box>
                          <IconButton
                            aria-label="Excluir categoria"
                            icon={<MdDelete />}
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            onClick={() => handleDeleteCategory(cat.id)}
                          />
                        </Flex>
                      ))
                    )}
                  </Box>
                </TabPanel>
                <TabPanel p={0}>
                  <VStack spacing={4} align="stretch">
                    <FormControl isRequired>
                      <FormLabel>Nome da Categoria</FormLabel>
                      <Input
                        placeholder="Ex: Impostos, Retirada de Lucro, Colaboradores..."
                        value={categoryForm.name}
                        onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Descrição</FormLabel>
                      <Textarea
                        placeholder="Adicione uma breve descrição para controle..."
                        value={categoryForm.description}
                        onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                      />
                    </FormControl>
                    <Button
                      colorScheme="primary"
                      onClick={handleSaveCategory}
                      isLoading={isLoading}
                      mt={2}
                    >
                      Cadastrar Categoria
                    </Button>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onCategoryClose}>
              Fechar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal: Confirmar exclusão de lançamento */}
      <ConfirmDeleteModal
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        onConfirm={handleDeleteTransaction}
        isLoading={isLoading}
        title="Excluir Lançamento Financeiro"
      />
    </DashboardLayout>
  );
}
