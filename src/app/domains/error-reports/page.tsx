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
import { MdSearch, MdBugReport, MdRefresh, MdAdd, MdOpenInNew } from 'react-icons/md';
import { reportedIssueService, ReportedIssue, ReportedIssueStatus } from '@/services/reportedIssueService';
import { exerciseService, Exercise } from '@/services/exerciseService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/DataTable';

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

  // filtros
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const toast = useToast();
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, [toast]);

  const loadExercises = useCallback(async () => {
    setIsLoading(true);
    try {
      const [exs, allIssues] = await Promise.all([
        exerciseService.getAll(),
        reportedIssueService.getAll(),
      ]);
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

  // Filtros na lista principal
  const filteredExercises = useMemo(() => (
    exercisesWithIssues.filter(ex => {
      const matchText = !searchText || (ex.description ?? '').toLowerCase().includes(searchText.toLowerCase());
      const matchStatus = filterStatus === 'ALL' || ex.issues.some(i => i.status === filterStatus);
      return matchText && matchStatus;
    })
  ), [exercisesWithIssues, filterStatus, searchText]);

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
                  <Tooltip label="Reportar problema">
                    <IconButton
                      aria-label="Reportar problema"
                      icon={<MdBugReport />}
                      size="sm"
                      variant="ghost"
                      colorScheme="red"
                      onClick={() => handleOpenReport(ex.id)}
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
                selectedExercise?.issues.map((issue) => (
                  <Box
                    key={issue.id}
                    p={4}
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="md"
                    borderLeft="4px solid"
                    borderLeftColor={`${STATUS_COLORS[issue.status]}.400`}
                  >
                    <Flex justify="space-between" align="flex-start" mb={2}>
                      <Badge
                        colorScheme={STATUS_COLORS[issue.status]}
                        fontSize="xs"
                      >
                        {STATUS_LABELS[issue.status]}
                      </Badge>
                      <Text fontSize="xs" color="gray.400">
                        {new Date(issue.createdAt).toLocaleString('pt-BR')}
                      </Text>
                    </Flex>
                    <Text fontSize="sm" mb={2}>{issue.comment}</Text>
                    <Text fontSize="xs" color="gray.400">
                      Reportado por: <strong>{issue.reportedBy}</strong>
                    </Text>
                  </Box>
                ))
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              leftIcon={<Icon as={MdBugReport} />}
              colorScheme="red"
              variant="outline"
              mr={3}
              onClick={() => {
                onIssuesClose();
                handleOpenReport(selectedExercise?.id);
              }}
            >
              Reportar problema
            </Button>
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
    </DashboardLayout>
  );
}
