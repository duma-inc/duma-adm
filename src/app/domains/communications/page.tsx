'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  Code,
  Divider,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Spinner,
  Switch,
  Text,
  Textarea,
  VStack,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { MdPreview, MdSearch, MdSend } from 'react-icons/md';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { studentService, Student } from '@/services/studentService';
import {
  emailTemplateService,
  EmailTemplate,
  EmailTemplatePreview,
} from '@/services/emailTemplateService';
import {
  communicationService,
  CommunicationBatchResult,
  CommunicationChannel,
  MAX_RECIPIENTS_PER_BATCH,
} from '@/services/communicationService';

/**
 * Variaveis preenchidas pelo proprio backend (CommunicationEmailTemplateService.variables).
 * Nao viram campo dinamico: subject, message e actionUrl ja tem campo proprio no formulario e
 * as demais dependem do destinatario.
 */
const SYSTEM_VARIABLES = new Set([
  'recipientName',
  'recipientFirstName',
  'subject',
  'message',
  'actionUrl',
  'currentDate',
]);

const INITIAL_FORM = {
  template: '',
  category: '',
  subject: '',
  message: '',
  actionUrl: '',
  referenceId: '',
  notificationTitle: '',
  notificationMessage: '',
  force: false,
};

function errorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    return typeof message === 'string' && message.trim() ? message : fallback;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

function studentLabel(student: Student) {
  return `${student.user.name} (${student.user.email})`;
}

export default function CommunicationsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [templateData, setTemplateData] = useState<Record<string, string>>({});
  const [channels, setChannels] = useState<CommunicationChannel[]>(['EMAIL', 'IN_APP']);
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<EmailTemplatePreview | null>(null);
  const [batch, setBatch] = useState<CommunicationBatchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const toast = useToast();
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, [toast]);

  const previewModal = useDisclosure();
  const resultModal = useDisclosure();

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    const [studentsRes, templatesRes] = await Promise.allSettled([
      studentService.getAll(),
      emailTemplateService.getAll(),
    ]);
    if (studentsRes.status === 'fulfilled') {
      setStudents(studentsRes.value);
    } else {
      toastRef.current({ title: errorMessage(studentsRes.reason, 'Erro ao carregar alunos'), status: 'error' });
    }
    if (templatesRes.status === 'fulfilled') {
      setTemplates(templatesRes.value.filter((template) => template.active));
    } else {
      toastRef.current({ title: errorMessage(templatesRes.reason, 'Erro ao carregar templates'), status: 'error' });
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.code === form.template) ?? null,
    [templates, form.template]
  );

  // Variaveis do template que nao sao preenchidas pelo sistema viram campo no formulario.
  const customVariables = useMemo(() => {
    if (!selectedTemplate) return [];
    return Object.entries(selectedTemplate.variableDefinitions ?? {})
      .filter(([key]) => !SYSTEM_VARIABLES.has(key))
      .sort(([a], [b]) => a.localeCompare(b));
  }, [selectedTemplate]);

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return students;
    return students.filter((student) =>
      student.user.name.toLowerCase().includes(term)
      || student.user.email.toLowerCase().includes(term)
    );
  }, [search, students]);

  const overLimit = selectedIds.length > MAX_RECIPIENTS_PER_BATCH;

  const toggleStudent = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const toggleAllFiltered = () => {
    const filteredIds = filteredStudents.map((student) => student.user.id);
    const allSelected = filteredIds.every((id) => selectedIds.includes(id));
    setSelectedIds((current) =>
      allSelected
        ? current.filter((id) => !filteredIds.includes(id))
        : Array.from(new Set([...current, ...filteredIds]))
    );
  };

  const toggleChannel = (channel: CommunicationChannel) => {
    setChannels((current) =>
      current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel]
    );
  };

  const buildTemplateData = () => {
    const data: Record<string, string> = {};
    customVariables.forEach(([key]) => {
      const value = templateData[key];
      if (value && value.trim()) data[key] = value.trim();
    });
    return data;
  };

  const renderPreview = async () => {
    if (!selectedTemplate) {
      toastRef.current({ title: 'Escolha um template para visualizar', status: 'warning' });
      return;
    }
    setIsPreviewing(true);
    try {
      const sample = students.find((student) => student.user.id === selectedIds[0]);
      const data: Record<string, string> = {
        ...buildTemplateData(),
        recipientName: sample?.user.name ?? 'Maria Dumaway',
      };
      if (form.subject.trim()) data.subject = form.subject.trim();
      if (form.message.trim()) data.message = form.message.trim();
      if (form.actionUrl.trim()) data.actionUrl = form.actionUrl.trim();

      setPreview(await emailTemplateService.preview({
        subjectTemplate: selectedTemplate.subjectTemplate,
        htmlTemplate: selectedTemplate.htmlTemplate,
        textTemplate: selectedTemplate.textTemplate,
        data,
      }));
      previewModal.onOpen();
    } catch (error) {
      setPreview(null);
      toastRef.current({ title: errorMessage(error, 'Erro ao gerar preview'), status: 'error' });
    } finally {
      setIsPreviewing(false);
    }
  };

  const send = async () => {
    if (selectedIds.length === 0) {
      toastRef.current({ title: 'Selecione pelo menos um aluno', status: 'warning' });
      return;
    }
    if (overLimit) {
      toastRef.current({
        title: `Selecione no maximo ${MAX_RECIPIENTS_PER_BATCH} alunos por envio`,
        status: 'warning',
      });
      return;
    }
    if (channels.length === 0) {
      toastRef.current({ title: 'Escolha ao menos um canal', status: 'warning' });
      return;
    }

    setIsSending(true);
    try {
      const result = await communicationService.send({
        studentIds: selectedIds,
        template: form.template || undefined,
        category: form.category.trim() || undefined,
        subject: form.subject.trim() || undefined,
        message: form.message.trim() || undefined,
        actionUrl: form.actionUrl.trim() || undefined,
        referenceId: form.referenceId.trim() || undefined,
        notificationTitle: form.notificationTitle.trim() || undefined,
        notificationMessage: form.notificationMessage.trim() || undefined,
        templateData: buildTemplateData(),
        channels,
        force: form.force || undefined,
      });
      setBatch(result);
      resultModal.onOpen();
      if (result.emailsFailed === 0) {
        setSelectedIds([]);
      }
    } catch (error) {
      toastRef.current({ title: errorMessage(error, 'Erro ao enviar comunicacao'), status: 'error' });
    } finally {
      setIsSending(false);
    }
  };

  const studentName = (studentId: string) => {
    const student = students.find((item) => item.user.id === studentId);
    return student ? student.user.name : studentId;
  };

  return (
    <DashboardLayout>
      <Box mb={6}>
        <Heading size="lg" color="gray.700">Comunicações</Heading>
        <Text color="gray.500" mt={1}>
          Envie um e-mail com template e, opcionalmente, a notificação dentro da plataforma.
        </Text>
      </Box>

      {isLoading && students.length === 0 ? (
        <Flex justify="center" py={12}><Spinner size="xl" color="primary.500" /></Flex>
      ) : (
        <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={6} alignItems="start">
          <Box bg="white" borderRadius="md" borderWidth="1px" borderColor="gray.200" p={5}>
            <Flex justify="space-between" align="center" mb={3}>
              <Text fontWeight="semibold">Destinatários</Text>
              <Badge colorScheme={overLimit ? 'red' : 'blue'}>
                {selectedIds.length} de {MAX_RECIPIENTS_PER_BATCH}
              </Badge>
            </Flex>

            <InputGroup mb={3}>
              <InputLeftElement pointerEvents="none"><Icon as={MdSearch} color="gray.400" /></InputLeftElement>
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome ou e-mail" />
            </InputGroup>

            <Flex justify="space-between" align="center" mb={2}>
              <Button size="xs" variant="outline" onClick={toggleAllFiltered} isDisabled={filteredStudents.length === 0}>
                Selecionar/limpar os {filteredStudents.length} listados
              </Button>
              {selectedIds.length > 0 && (
                <Button size="xs" variant="ghost" onClick={() => setSelectedIds([])}>Limpar seleção</Button>
              )}
            </Flex>

            {overLimit && (
              <Alert status="warning" mb={3} fontSize="sm">
                <AlertIcon />
                O envio é síncrono; o backend aceita no máximo {MAX_RECIPIENTS_PER_BATCH} alunos por vez.
              </Alert>
            )}

            <Box maxH="440px" overflowY="auto" borderWidth="1px" borderColor="gray.100" borderRadius="md" p={2}>
              <VStack align="stretch" spacing={1}>
                {filteredStudents.map((student) => (
                  <Checkbox
                    key={student.user.id}
                    isChecked={selectedIds.includes(student.user.id)}
                    onChange={() => toggleStudent(student.user.id)}
                  >
                    <Text fontSize="sm">{studentLabel(student)}</Text>
                  </Checkbox>
                ))}
                {filteredStudents.length === 0 && (
                  <Text color="gray.500" textAlign="center" py={6} fontSize="sm">Nenhum aluno encontrado.</Text>
                )}
              </VStack>
            </Box>
          </Box>

          <Box bg="white" borderRadius="md" borderWidth="1px" borderColor="gray.200" p={5}>
            <VStack align="stretch" spacing={4}>
              <FormControl>
                <FormLabel>Template</FormLabel>
                <Select
                  value={form.template}
                  onChange={(event) => { setForm({ ...form, template: event.target.value }); setTemplateData({}); }}
                  placeholder="CUSTOM (padrão)"
                >
                  {templates.map((template) => (
                    <option key={template.id} value={template.code}>{template.code} — {template.name}</option>
                  ))}
                </Select>
                {selectedTemplate?.description && (
                  <FormHelperText>{selectedTemplate.description}</FormHelperText>
                )}
              </FormControl>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel>Assunto</FormLabel>
                  <Input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} />
                  <FormHelperText>Sobrepõe o assunto do template.</FormHelperText>
                </FormControl>
                <FormControl>
                  <FormLabel>Categoria</FormLabel>
                  <Input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="GENERAL" />
                  <FormHelperText>Usada na auditoria e na deduplicação.</FormHelperText>
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>Mensagem</FormLabel>
                <Textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} rows={5} />
              </FormControl>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel>Link do botão</FormLabel>
                  <Input value={form.actionUrl} onChange={(event) => setForm({ ...form, actionUrl: event.target.value })} placeholder="https://ava.dumaway.com" />
                </FormControl>
                <FormControl>
                  <FormLabel>Referência</FormLabel>
                  <Input value={form.referenceId} onChange={(event) => setForm({ ...form, referenceId: event.target.value })} placeholder="invoice:123" />
                  <FormHelperText>
                    Evita reenvio ao mesmo aluno e permite retomar um lote interrompido com segurança.
                  </FormHelperText>
                </FormControl>
              </SimpleGrid>

              {customVariables.length > 0 && (
                <>
                  <Divider />
                  <Box>
                    <Text fontWeight="semibold" mb={1}>Variáveis do template</Text>
                    <Text fontSize="sm" color="gray.500" mb={3}>
                      O mesmo valor vale para todos os destinatários deste envio.
                    </Text>
                    <VStack align="stretch" spacing={3}>
                      {customVariables.map(([key, description]) => (
                        <FormControl key={key}>
                          <FormLabel fontSize="sm" mb={1}><Code>{key}</Code></FormLabel>
                          <Input
                            size="sm"
                            value={templateData[key] ?? ''}
                            onChange={(event) => setTemplateData({ ...templateData, [key]: event.target.value })}
                          />
                          <FormHelperText fontSize="xs">{description}</FormHelperText>
                        </FormControl>
                      ))}
                    </VStack>
                  </Box>
                </>
              )}

              <Divider />

              <FormControl>
                <FormLabel>Canais</FormLabel>
                <HStack spacing={5}>
                  <Checkbox isChecked={channels.includes('EMAIL')} onChange={() => toggleChannel('EMAIL')}>E-mail</Checkbox>
                  <Checkbox isChecked={channels.includes('IN_APP')} onChange={() => toggleChannel('IN_APP')}>Notificação no app</Checkbox>
                </HStack>
              </FormControl>

              {channels.includes('IN_APP') && (
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <FormControl>
                    <FormLabel fontSize="sm">Título da notificação</FormLabel>
                    <Input size="sm" value={form.notificationTitle} onChange={(event) => setForm({ ...form, notificationTitle: event.target.value })} placeholder="Usa o assunto do e-mail" />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm">Texto da notificação</FormLabel>
                    <Input size="sm" value={form.notificationMessage} onChange={(event) => setForm({ ...form, notificationMessage: event.target.value })} placeholder="Usa a mensagem do e-mail" />
                  </FormControl>
                </SimpleGrid>
              )}

              <FormControl display="flex" alignItems="center" gap={3}>
                <Switch isChecked={form.force} onChange={(event) => setForm({ ...form, force: event.target.checked })} colorScheme="orange" />
                <FormLabel mb={0} fontSize="sm">Reenviar mesmo se já enviado (ignora a referência)</FormLabel>
              </FormControl>

              <HStack justify="flex-end" pt={2}>
                <Button leftIcon={<MdPreview />} variant="outline" onClick={renderPreview} isLoading={isPreviewing}>
                  Preview
                </Button>
                <Button leftIcon={<MdSend />} colorScheme="primary" onClick={send} isLoading={isSending} loadingText="Enviando">
                  Enviar para {selectedIds.length}
                </Button>
              </HStack>
            </VStack>
          </Box>
        </SimpleGrid>
      )}

      <Modal isOpen={previewModal.isOpen} onClose={previewModal.onClose} size="4xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Preview — {preview?.subject}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {preview && (
              <Box as="iframe" title="Preview da comunicação" sandbox="" srcDoc={preview.html} width="100%" minH="560px" bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal isOpen={resultModal.isOpen} onClose={resultModal.onClose} size="3xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Resultado do envio</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {batch && (
              <>
                <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3} mb={5}>
                  <Box><Text fontSize="sm" color="gray.500">Destinatários</Text><Text fontSize="xl" fontWeight="bold">{batch.recipients}</Text></Box>
                  <Box><Text fontSize="sm" color="gray.500">E-mails enviados</Text><Text fontSize="xl" fontWeight="bold" color="green.600">{batch.emailsSent}</Text></Box>
                  <Box><Text fontSize="sm" color="gray.500">Falhas</Text><Text fontSize="xl" fontWeight="bold" color={batch.emailsFailed ? 'red.600' : 'gray.700'}>{batch.emailsFailed}</Text></Box>
                  <Box><Text fontSize="sm" color="gray.500">Pulados</Text><Text fontSize="xl" fontWeight="bold">{batch.skipped}</Text></Box>
                </SimpleGrid>

                <VStack align="stretch" spacing={2}>
                  {batch.results.map((result) => (
                    <Flex key={result.studentId} borderWidth="1px" borderColor="gray.200" borderRadius="md" p={3} justify="space-between" align="center" gap={3}>
                      <Box minW={0}>
                        <Text fontSize="sm" fontWeight="semibold">{studentName(result.studentId)}</Text>
                        <Text fontSize="xs" color="gray.500">{result.email}</Text>
                        {result.error && <Text fontSize="xs" color="red.600" mt={1}>{result.error}</Text>}
                      </Box>
                      <Badge
                        flexShrink={0}
                        colorScheme={
                          result.skipped ? 'gray'
                            : result.emailStatus === 'SENT' ? 'green'
                            : result.emailStatus === 'FAILED' ? 'red'
                            : 'yellow'
                        }
                      >
                        {result.skipped ? 'Pulado' : result.emailStatus ?? 'Só notificação'}
                      </Badge>
                    </Flex>
                  ))}
                </VStack>
              </>
            )}
          </ModalBody>
          <ModalFooter><Button onClick={resultModal.onClose}>Fechar</Button></ModalFooter>
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
}
