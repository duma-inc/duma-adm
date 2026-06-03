'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Textarea,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Spinner,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Tooltip,
  Tag,
} from '@chakra-ui/react';
import { MdSearch, MdBugReport, MdRefresh, MdAdd, MdOpenInNew, MdDelete } from 'react-icons/md';
import { reportedIssueService, ReportedIssue, ReportedIssueStatus } from '@/services/reportedIssueService';
import { exerciseService, Exercise } from '@/services/exerciseService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/DataTable';
import { userService } from '@/services/userService';
import { adminUserService } from '@/services/adminUserService';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';

const STATUS_COLORS: Record<ReportedIssueStatus, string> = {
  OPEN: 'red',
  IN_REVIEW: 'yellow',
  RESOLVED: 'green',
  DISMISSED: 'gray',
};

const STATUS_LABELS: Record<ReportedIssueStatus, string> = {
  OPEN: 'Aberto',
  IN_REVIEW: 'Em Análise',
  RESOLVED: 'Resolvido',
  DISMISSED: 'Descartado',
};

type ExerciseWithIssues = Exercise & {
  issues: ReportedIssue[];
  openCount: number;
};

export default function ErrorReportsPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exercisesWithIssues, setExercisesWithIssues] = useState<ExerciseWithIssues[]>([]);
  const [userNamesById, setUserNamesById] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);

  // modal: ver reports de um exercício
  const [selectedExercise, setSelectedExercise] = useState<ExerciseWithIssues | null>(null);
  const { isOpen: isIssuesOpen, onOpen: onIssuesOpen, onClose: onIssuesClose } = useDisclosure();

  // modal: reportar novo problema
  const { isOpen: isReportOpen, onOpen: onReportOpen, onClose: onReportClose } = useDisclosure();
  const [reportComment, setReportComment] = useState('');
  const [reportExerciseId, setReportExerciseId] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingIssueId, setIsUpdatingIssueId] = useState<string | null>(null);
  const [issueToDelete, setIssueToDelete] = useState<ReportedIssue | null>(null);
  const [exerciseToDelete, setExerciseToDelete] = useState<ExerciseWithIssues | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // filtros
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [dateSortOrder, setDateSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  const {
    isOpen: isDeleteIssueOpen,
    onOpen: onDeleteIssueOpen,
    onClose: onDeleteIssueClose,
  } = useDisclosure();
  const {
    isOpen: isDeleteExerciseOpen,
    onOpen: onDeleteExerciseOpen,
    onClose: onDeleteExerciseClose,
  } = useDisclosure();

  const toast = useToast();
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, [toast]);

  const getSortedIssues = useCallback((issues: ReportedIssue[]) => {
    return [...issues].sort((a, b) => {
      const firstTime = new Date(a.createdAt).getTime();
      const secondTime = new Date(b.createdAt).getTime();
      return dateSortOrder === 'ASC' ? firstTime - secondTime : secondTime - firstTime;
    });
  }, [dateSortOrder]);

  const getExerciseSortDate = useCallback((exercise: ExerciseWithIssues) => {
    const sortedIssues = getSortedIssues(exercise.issues);
    return sortedIssues[0]?.createdAt ?? '';
  }, [getSortedIssues]);

  const loadExercises = useCallback(async () => {
    setIsLoading(true);
    try {
      const [exs, allIssues, usersResult, adminUsersResult] = await Promise.all([
        exerciseService.getAll(),
        reportedIssueService.getAll(),
        userService.getAll().catch(() => []),
        adminUserService.getAll().catch(() => []),
      ]);

      const userMap = [...usersResult, ...adminUsersResult].reduce<Record<string, string>>((acc, user) => {
        acc[user.id] = user.name;
        return acc;
      }, {});

      setUserNamesById(userMap);
      setExercises(exs);

      // agrupa os issues por exerciseId localmente — zero requisições extras
      const issuesByExercise = new Map<string, ReportedIssue[]>();
      for (const issue of allIssues) {
        const list = issuesByExercise.get(issue.exerciseId) ?? [];
        list.push(issue);
        issuesByExercise.set(issue.exerciseId, list);
      }

      const withIssues: ExerciseWithIssues[] = exs
        .map((ex) => {
          const issues = issuesByExercise.get(ex.id) ?? [];
          return { ...ex, issues, openCount: issues.filter(i => i.status === 'OPEN').length };
        })
        .filter(ex => ex.issues.length > 0);

      setExercisesWithIssues(withIssues);
    } catch {
      toastRef.current({ title: 'Erro ao carregar exercícios', status: 'error' });
    } finally {
      setIsLoading(false);
      setIsLoadingIssues(false);
    }
  }, []); // sem dependências — evita loop infinito

  useEffect(() => { loadExercises(); }, [loadExercises]);

  const handleOpenIssues = (ex: ExerciseWithIssues) => {
    setSelectedExercise(ex);
    onIssuesOpen();
  };

  const handleOpenReport = (exerciseId?: string) => {
    setReportComment('');
    setReportExerciseId(exerciseId || '');
    onReportOpen();
  };

  const handleSendReport = async () => {
    if (!reportExerciseId) {
      toast({ title: 'Selecione um exercício', status: 'warning' });
      return;
    }
    if (!reportComment.trim()) {
      toast({ title: 'Descreva o problema', status: 'warning' });
      return;
    }
    setIsSending(true);
    try {
      await reportedIssueService.create(reportExerciseId, { comment: reportComment });
      toast({ title: 'Reporte enviado com sucesso', status: 'success' });
      onReportClose();
      loadExercises();
    } catch {
      toast({ title: 'Erro ao enviar reporte', status: 'error' });
    } finally {
      setIsSending(false);
    }
  };

  const updateExerciseIssues = useCallback((exerciseId: string, updater: (issues: ReportedIssue[]) => ReportedIssue[]) => {
    setExercisesWithIssues((current) => current
      .map((exercise) => {
        if (exercise.id !== exerciseId) return exercise;
        const updatedIssues = updater(exercise.issues);
        if (!updatedIssues.length) return null;
        return {
          ...exercise,
          issues: updatedIssues,
          openCount: updatedIssues.filter((issue) => issue.status === 'OPEN').length,
        };
      })
      .filter((exercise): exercise is ExerciseWithIssues => exercise !== null));

    setSelectedExercise((current) => {
      if (!current || current.id !== exerciseId) return current;
      const updatedIssues = updater(current.issues);
      if (!updatedIssues.length) return null;
      return {
        ...current,
        issues: updatedIssues,
        openCount: updatedIssues.filter((issue) => issue.status === 'OPEN').length,
      };
    });
  }, []);

  const handleStatusChange = async (issue: ReportedIssue, status: ReportedIssueStatus) => {
    if (!selectedExercise || issue.status === status) return;
    setIsUpdatingIssueId(issue.id);
    try {
      const updatedIssue = await reportedIssueService.update(selectedExercise.id, issue.id, { status });
      updateExerciseIssues(selectedExercise.id, (issues) =>
        issues.map((currentIssue) => currentIssue.id === issue.id ? updatedIssue : currentIssue)
      );
      toast({ title: 'Status atualizado com sucesso', status: 'success' });
    } catch {
      toast({ title: 'Erro ao atualizar status do reporte', status: 'error' });
    } finally {
      setIsUpdatingIssueId(null);
    }
  };

  const handleOpenDeleteIssue = (issue: ReportedIssue) => {
    setIssueToDelete(issue);
    onDeleteIssueOpen();
  };

  const handleDeleteIssue = async () => {
    if (!selectedExercise || !issueToDelete) return;
    setIsDeleting(true);
    try {
      await reportedIssueService.delete(selectedExercise.id, issueToDelete.id);
      updateExerciseIssues(selectedExercise.id, (issues) =>
        issues.filter((issue) => issue.id !== issueToDelete.id)
      );
      toast({ title: 'Reporte excluído com sucesso', status: 'success' });
      onDeleteIssueClose();
      setIssueToDelete(null);
      if (selectedExercise.issues.length === 1) {
        onIssuesClose();
      }
    } catch {
      toast({ title: 'Erro ao excluir reporte', status: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenDeleteExerciseReports = (exercise: ExerciseWithIssues) => {
    setExerciseToDelete(exercise);
    onDeleteExerciseOpen();
  };

  const handleDeleteExerciseReports = async () => {
    if (!exerciseToDelete) return;
    setIsDeleting(true);
    try {
      await Promise.all(
        exerciseToDelete.issues.map((issue) => reportedIssueService.delete(exerciseToDelete.id, issue.id))
      );
      setExercisesWithIssues((current) => current.filter((exercise) => exercise.id !== exerciseToDelete.id));
      setSelectedExercise((current) => current?.id === exerciseToDelete.id ? null : current);
      toast({ title: 'Reports excluídos com sucesso', status: 'success' });
      onDeleteExerciseClose();
      setExerciseToDelete(null);
      if (selectedExercise?.id === exerciseToDelete.id) {
        onIssuesClose();
      }
    } catch {
      toast({ title: 'Erro ao excluir reports', status: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtros na lista principal
  const filteredExercises = useMemo(() => (
    exercisesWithIssues
      .filter(ex => {
        const matchText = !searchText || (ex.description ?? '').toLowerCase().includes(searchText.toLowerCase());
        const matchStatus = filterStatus === 'ALL' || ex.issues.some(i => i.status === filterStatus);
        return matchText && matchStatus;
      })
      .sort((first, second) => {
        const firstTime = new Date(getExerciseSortDate(first)).getTime();
        const secondTime = new Date(getExerciseSortDate(second)).getTime();
        return dateSortOrder === 'ASC' ? firstTime - secondTime : secondTime - firstTime;
      })
  ), [dateSortOrder, exercisesWithIssues, filterStatus, getExerciseSortDate, searchText]);

  const sortedSelectedIssues = useMemo(() => (
    selectedExercise ? getSortedIssues(selectedExercise.issues) : []
  ), [getSortedIssues, selectedExercise]);

  const totalOpen = exercisesWithIssues.reduce((acc, ex) => acc + ex.openCount, 0);

  return (
    <DashboardLayout>
      {/* Cabeçalho */}
      <Flex justify="space-between" align="flex-start" mb={6} flexWrap="wrap" gap={4}>
        <Box>
          <Heading size="lg" color="gray.700">Relatório de Erros</Heading>
          <HStack mt={1} spacing={3}>
            <Text fontSize="sm" color="gray.500">
              Exercícios com reports: <strong>{exercisesWithIssues.length}</strong>
            </Text>
            {totalOpen > 0 && (
              <Badge colorScheme="red" fontSize="xs" px={2} py={1} borderRadius="md">
                {totalOpen} aberto{totalOpen > 1 ? 's' : ''}
              </Badge>
            )}
          </HStack>
        </Box>
        <HStack spacing={3}>
          <Tooltip label="Recarregar">
            <IconButton
              aria-label="Recarregar"
              icon={<MdRefresh />}
              variant="outline"
              onClick={loadExercises}
              isLoading={isLoading}
            />
          </Tooltip>
          <Button leftIcon={<Icon as={MdAdd} />} colorScheme="primary" onClick={() => handleOpenReport()}>
            Novo Reporte
          </Button>
        </HStack>
      </Flex>

      {/* Filtros */}
      <HStack spacing={4} mb={6} align="center" flexWrap="wrap" gap={3}>
        <InputGroup maxW="360px">
          <InputLeftElement pointerEvents="none">
            <Icon as={MdSearch} color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder="Buscar por enunciado..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            bg="white"
          />
        </InputGroup>
        <Select
          maxW="220px"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          bg="white"
        >
          <option value="ALL">Todos os status</option>
          <option value="OPEN">Abertos</option>
          <option value="IN_REVIEW">Em Análise</option>
          <option value="RESOLVED">Resolvidos</option>
          <option value="DISMISSED">Descartados</option>
        </Select>
        <Select
          maxW="260px"
          value={dateSortOrder}
          onChange={(e) => setDateSortOrder(e.target.value as 'ASC' | 'DESC')}
          bg="white"
        >
          <option value="ASC">Data: mais antigas primeiro</option>
          <option value="DESC">Data: mais recentes primeiro</option>
        </Select>
      </HStack>

      {/* Conteúdo */}
      {isLoading ? (
        <Flex justify="center" py={16}>
          <VStack spacing={3}>
            <Spinner size="xl" color="primary.500" thickness="4px" />
            <Text color="gray.400" fontSize="sm">
              {isLoadingIssues ? 'Carregando reports...' : 'Carregando exercícios...'}
            </Text>
          </VStack>
        </Flex>
      ) : filteredExercises.length === 0 ? (
        <Flex
          direction="column"
          align="center"
          justify="center"
          py={16}
          bg="white"
          borderRadius="lg"
          border="1px solid"
          borderColor="gray.200"
        >
          <Icon as={MdBugReport} w={12} h={12} color="gray.300" mb={3} />
          <Text color="gray.400" fontWeight="medium">
            {exercisesWithIssues.length === 0
              ? 'Nenhum exercício com reports encontrado'
              : 'Nenhum resultado para os filtros aplicados'}
          </Text>
        </Flex>
      ) : (
        <DataTable
          data={filteredExercises}
          columns={[
            {
              key: 'description',
              header: 'Exercício',
              render: (ex) => (
                <Box>
                  <Text fontWeight="medium" noOfLines={2} maxW="400px" title={ex.description}>
                    {ex.description}
                  </Text>
                  <Text fontSize="xs" color="gray.400" mt={0.5}>
                    {ex.type} · {ex.difficulty} · {ex.language}
                  </Text>
                </Box>
              ),
            },
            {
              key: 'issues',
              header: 'Reports',
              render: (ex) => (
                <Badge colorScheme="blue" variant="subtle">{ex.issues.length}</Badge>
              ),
            },
            {
              key: 'openCount',
              header: 'Abertos',
              render: (ex) => ex.openCount > 0
                ? <Badge colorScheme="red">{ex.openCount}</Badge>
                : <Text fontSize="sm" color="gray.400">—</Text>,
            },
            {
              key: 'status',
              header: 'Status resumido',
              render: (ex) => (
                <HStack spacing={1} flexWrap="wrap">
                  {(['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'] as ReportedIssueStatus[]).map(s => {
                    const count = ex.issues.filter(i => i.status === s).length;
                    if (!count) return null;
                    return (
                      <Tag key={s} size="sm" colorScheme={STATUS_COLORS[s]} variant="subtle">
                        {STATUS_LABELS[s]}: {count}
                      </Tag>
                    );
                  })}
                </HStack>
              ),
            },
            {
              key: 'actions',
              header: 'Ações',
              render: (ex) => (
                <HStack spacing={1} justify="flex-end">
                  <Tooltip label="Ver reports">
                    <IconButton
                      aria-label="Ver reports"
                      icon={<MdOpenInNew />}
                      size="sm"
                      variant="ghost"
                      colorScheme="blue"
                      onClick={() => handleOpenIssues(ex)}
                    />
                  </Tooltip>
                  <Tooltip label="Excluir reports">
                    <IconButton
                      aria-label="Excluir reports"
                      icon={<MdDelete />}
                      size="sm"
                      variant="ghost"
                      colorScheme="red"
                      onClick={() => handleOpenDeleteExerciseReports(ex)}
                    />
                  </Tooltip>
                </HStack>
              ),
            },
          ]}
        />
      )}

      {/* Modal: ver reports do exercício */}
      <Modal isOpen={isIssuesOpen} onClose={onIssuesClose} size="2xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <Text>Reports do exercício</Text>
            {selectedExercise && (
              <Text fontSize="sm" fontWeight="normal" color="gray.500" mt={1} noOfLines={2}>
                {selectedExercise.description}
              </Text>
            )}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3} align="stretch">
              {selectedExercise?.issues.length === 0 ? (
                <Text color="gray.400" textAlign="center" py={6}>Nenhum report encontrado.</Text>
              ) : (
                sortedSelectedIssues.map((issue) => (
                  <Box
                    key={issue.id}
                    p={4}
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="md"
                    borderLeft="4px solid"
                    borderLeftColor={`${STATUS_COLORS[issue.status]}.400`}
                  >
                    <Flex justify="space-between" align="flex-start" mb={3} gap={3}>
                      <VStack align="stretch" spacing={2} flex="1">
                        <HStack justify="space-between" align="flex-start">
                          <Badge
                            colorScheme={STATUS_COLORS[issue.status]}
                            fontSize="xs"
                          >
                            {STATUS_LABELS[issue.status]}
                          </Badge>
                          <Text fontSize="xs" color="gray.400">
                            {new Date(issue.createdAt).toLocaleString('pt-BR')}
                          </Text>
                        </HStack>
                        <FormControl maxW="220px">
                          <FormLabel fontSize="xs" color="gray.500" mb={1}>Status</FormLabel>
                          <Select
                            size="sm"
                            value={issue.status}
                            onChange={(e) => handleStatusChange(issue, e.target.value as ReportedIssueStatus)}
                            isDisabled={isUpdatingIssueId === issue.id || isDeleting}
                            bg="white"
                          >
                            {(['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'] as ReportedIssueStatus[]).map((status) => (
                              <option key={status} value={status}>
                                {STATUS_LABELS[status]}
                              </option>
                            ))}
                          </Select>
                        </FormControl>
                      </VStack>
                      <Tooltip label="Excluir reporte">
                        <IconButton
                          aria-label="Excluir reporte"
                          icon={<MdDelete />}
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => handleOpenDeleteIssue(issue)}
                          isDisabled={isUpdatingIssueId === issue.id || isDeleting}
                        />
                      </Tooltip>
                    </Flex>
                    <Text fontSize="sm" mb={2}>{issue.comment}</Text>
                    <Text fontSize="xs" color="gray.400">
                      Reportado por: <strong>{userNamesById[issue.reportedBy] || issue.reportedBy}</strong>
                    </Text>
                  </Box>
                ))
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onIssuesClose}>Fechar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal: novo reporte */}
      <Modal isOpen={isReportOpen} onClose={onReportClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Reportar Problema</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Exercício</FormLabel>
                <Select
                  placeholder="Selecione o exercício com problema"
                  value={reportExerciseId}
                  onChange={(e) => setReportExerciseId(e.target.value)}
                >
                  {exercises.map(ex => (
                    <option key={ex.id} value={ex.id}>
                      {(ex.description ?? '').length > 80
                        ? (ex.description ?? '').slice(0, 80) + '...'
                        : (ex.description ?? ex.id)}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Descrição do problema</FormLabel>
                <Textarea
                  rows={4}
                  value={reportComment}
                  onChange={(e) => setReportComment(e.target.value)}
                  placeholder="Descreva o problema encontrado no exercício..."
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onReportClose} isDisabled={isSending}>
              Cancelar
            </Button>
            <Button colorScheme="red" onClick={handleSendReport} isLoading={isSending}>
              Enviar Reporte
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ConfirmDeleteModal
        isOpen={isDeleteIssueOpen}
        onClose={() => {
          if (isDeleting) return;
          setIssueToDelete(null);
          onDeleteIssueClose();
        }}
        onConfirm={handleDeleteIssue}
        isLoading={isDeleting}
        title="Excluir reporte"
        description="Tem certeza que deseja excluir este reporte? Esta ação não pode ser desfeita."
      />

      <ConfirmDeleteModal
        isOpen={isDeleteExerciseOpen}
        onClose={() => {
          if (isDeleting) return;
          setExerciseToDelete(null);
          onDeleteExerciseClose();
        }}
        onConfirm={handleDeleteExerciseReports}
        isLoading={isDeleting}
        title="Excluir reports do exercício"
        description="Tem certeza que deseja excluir todos os reports deste exercício? Esta ação não pode ser desfeita."
      />
    </DashboardLayout>
  );
}
