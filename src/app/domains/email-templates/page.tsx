'use client'


import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Code,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Icon,
  IconButton,
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
  SimpleGrid,
  Spinner,
  Switch,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Textarea,
  VStack,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { MdAdd, MdHistory, MdImage, MdPreview, MdSearch } from 'react-icons/md';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/DataTable';
import { uploadFile } from '@/services/fileService';
import {
  emailTemplateService,
  EmailTemplate,
  EmailTemplatePreview,
  EmailTemplateVersion,
} from '@/services/emailTemplateService';

const DEFAULT_HTML = `<!doctype html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f5f6f8;font-family:Arial,sans-serif;color:#29323d">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden">
        <tr><td style="background:#f58220;color:#fff;padding:22px 28px;font-size:24px;font-weight:700">Dumaway</td></tr>
        {{#bannerImageUrl}}<tr><td><img src="{{bannerImageUrl}}" alt="" width="600" style="display:block;width:100%;height:auto;border:0"></td></tr>{{/bannerImageUrl}}
        <tr><td style="padding:30px 28px;font-size:16px;line-height:1.6">
          <p style="font-size:18px;font-weight:600">Olá, {{recipientFirstName}}!</p>
          <div style="white-space:pre-line">{{message}}</div>
          {{#actionUrl}}<p><a href="{{actionUrl}}" style="display:inline-block;background:#f58220;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px">Acessar</a></p>{{/actionUrl}}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const INITIAL_FORM = {
  code: '',
  name: '',
  description: '',
  subjectTemplate: '{{subject}}',
  htmlTemplate: DEFAULT_HTML,
  textTemplate: 'Olá, {{recipientFirstName}}!\n\n{{message}}\n{{#actionUrl}}\nAcesse: {{actionUrl}}{{/actionUrl}}',
  variableDefinitions: JSON.stringify(
    {
      subject: 'Assunto do e-mail',
      message: 'Mensagem principal',
      actionUrl: 'URL opcional do botão',
      bannerImageUrl: 'URL HTTPS opcional da imagem',
    },
    null,
    2
  ),
  active: true,
};

const INITIAL_PREVIEW_DATA = JSON.stringify(
  {
    recipientName: 'Maria Dumaway',
    subject: 'Assunto de exemplo',
    message: 'Este é um conteúdo de exemplo para conferir o resultado do template.',
    actionUrl: 'https://ava.dumaway.com',
  },
  null,
  2
);

function errorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    return typeof message === 'string' && message.trim() ? message : fallback;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

function parseStringMap(value: string, label: string): Record<string, string> {
  const parsed: unknown = JSON.parse(value || '{}');
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error(`${label} deve ser um objeto JSON.`);
  }
  const entries = Object.entries(parsed as Record<string, unknown>);
  if (entries.some(([, item]) => typeof item !== 'string')) {
    throw new Error(`Todos os valores de ${label} devem ser textos.`);
  }
  return Object.fromEntries(entries) as Record<string, string>;
}

function formatDate(value?: string | null) {
  return value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—';
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [historyTemplate, setHistoryTemplate] = useState<EmailTemplate | null>(null);
  const [versions, setVersions] = useState<EmailTemplateVersion[]>([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [previewData, setPreviewData] = useState(INITIAL_PREVIEW_DATA);
  const [preview, setPreview] = useState<EmailTemplatePreview | null>(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, [toast]);

  const editor = useDisclosure();
  const history = useDisclosure();

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      setTemplates(await emailTemplateService.getAll());
    } catch (error) {
      toastRef.current({ title: errorMessage(error, 'Erro ao carregar templates'), status: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return templates;
    return templates.filter((template) =>
      template.code.toLowerCase().includes(term)
      || template.name.toLowerCase().includes(term)
      || template.description?.toLowerCase().includes(term)
    );
  }, [search, templates]);

  const openEditor = (template?: EmailTemplate) => {
    if (template) {
      setEditing(template);
      setForm({
        code: template.code,
        name: template.name,
        description: template.description ?? '',
        subjectTemplate: template.subjectTemplate,
        htmlTemplate: template.htmlTemplate,
        textTemplate: template.textTemplate,
        variableDefinitions: JSON.stringify(template.variableDefinitions ?? {}, null, 2),
        active: template.active,
      });
      const samples: Record<string, string> = {
        recipientName: 'Maria Dumaway',
        subject: 'Assunto de exemplo',
        message: 'Este é um conteúdo de exemplo para conferir o resultado do template.',
        actionUrl: 'https://ava.dumaway.com',
      };
      Object.keys(template.variableDefinitions ?? {}).forEach((key) => {
        if (!(key in samples)) samples[key] = key.toLowerCase().includes('url') ? '' : `Exemplo de ${key}`;
      });
      setPreviewData(JSON.stringify(samples, null, 2));
    } else {
      setEditing(null);
      setForm(INITIAL_FORM);
      setPreviewData(INITIAL_PREVIEW_DATA);
    }
    setPreview(null);
    editor.onOpen();
  };

  const save = async () => {
    if (!form.code.trim() || !form.name.trim() || !form.subjectTemplate.trim()
      || !form.htmlTemplate.trim() || !form.textTemplate.trim()) {
      toastRef.current({ title: 'Preencha código, nome, assunto, HTML e versão texto', status: 'warning' });
      return;
    }

    setIsLoading(true);
    try {
      const variableDefinitions = parseStringMap(form.variableDefinitions, 'Variáveis');
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        subjectTemplate: form.subjectTemplate,
        htmlTemplate: form.htmlTemplate,
        textTemplate: form.textTemplate,
        variableDefinitions,
        active: form.active,
        lockVersion: editing?.lockVersion,
      };
      if (editing) {
        await emailTemplateService.update(editing.id, payload);
      } else {
        await emailTemplateService.create(payload);
      }
      toastRef.current({ title: `Template ${editing ? 'atualizado' : 'criado'} com sucesso`, status: 'success' });
      editor.onClose();
      await loadTemplates();
    } catch (error) {
      toastRef.current({ title: errorMessage(error, 'Erro ao salvar template'), status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const renderPreview = async () => {
    setIsPreviewing(true);
    try {
      const data = parseStringMap(previewData, 'Dados do preview');
      setPreview(await emailTemplateService.preview({
        subjectTemplate: form.subjectTemplate,
        htmlTemplate: form.htmlTemplate,
        textTemplate: form.textTemplate,
        data,
      }));
    } catch (error) {
      setPreview(null);
      toastRef.current({ title: errorMessage(error, 'Erro ao gerar preview'), status: 'error' });
    } finally {
      setIsPreviewing(false);
    }
  };

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toastRef.current({ title: 'Selecione um arquivo de imagem', status: 'warning' });
      return;
    }
    setIsLoading(true);
    try {
      const uploaded = await uploadFile(file);
      const snippet = `\n<img src="${uploaded.publicUrl}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0">`;
      setForm((current) => {
        const closingBody = current.htmlTemplate.toLowerCase().lastIndexOf('</body>');
        const htmlTemplate = closingBody >= 0
          ? current.htmlTemplate.slice(0, closingBody) + snippet + '\n' + current.htmlTemplate.slice(closingBody)
          : current.htmlTemplate + snippet;
        return { ...current, htmlTemplate };
      });
      toastRef.current({ title: 'Imagem enviada e inserida no HTML', status: 'success' });
    } catch (error) {
      toastRef.current({ title: errorMessage(error, 'Erro ao enviar imagem'), status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const openHistory = async (template: EmailTemplate) => {
    setHistoryTemplate(template);
    setVersions([]);
    history.onOpen();
    try {
      setVersions(await emailTemplateService.getVersions(template.id));
    } catch (error) {
      toastRef.current({ title: errorMessage(error, 'Erro ao carregar histórico'), status: 'error' });
    }
  };

  const restore = async (version: EmailTemplateVersion) => {
    if (!historyTemplate || version.revision === historyTemplate.revision) return;
    setIsLoading(true);
    try {
      await emailTemplateService.restore(
        historyTemplate.id,
        version.revision,
        historyTemplate.lockVersion
      );
      toastRef.current({ title: `Revisão ${version.revision} restaurada`, status: 'success' });
      history.onClose();
      await loadTemplates();
    } catch (error) {
      toastRef.current({ title: errorMessage(error, 'Erro ao restaurar revisão'), status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStatus = async (template: EmailTemplate) => {
    setIsLoading(true);
    try {
      await emailTemplateService.updateStatus(template.id, !template.active, template.lockVersion);
      await loadTemplates();
    } catch (error) {
      toastRef.current({ title: errorMessage(error, 'Erro ao alterar status'), status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    { key: 'code', header: 'Código', render: (item: EmailTemplate) => <Code>{item.code}</Code> },
    { key: 'name', header: 'Nome' },
    { key: 'revision', header: 'Revisão', render: (item: EmailTemplate) => `v${item.revision}` },
    { key: 'updatedAt', header: 'Atualizado em', render: (item: EmailTemplate) => formatDate(item.updatedAt) },
    {
      key: 'active',
      header: 'Status',
      render: (item: EmailTemplate) => (
        <Badge colorScheme={item.active ? 'green' : 'gray'}>{item.active ? 'Ativo' : 'Inativo'}</Badge>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading size="lg" color="gray.700">Templates de e-mail</Heading>
          <Text color="gray.500" mt={1}>Edite o HTML, visualize e gerencie as revisões dos e-mails.</Text>
        </Box>
        <Button leftIcon={<Icon as={MdAdd} />} colorScheme="primary" onClick={() => openEditor()}>
          Novo template
        </Button>
      </Flex>

      <InputGroup maxW="360px" mb={6}>
        <InputLeftElement pointerEvents="none"><Icon as={MdSearch} color="gray.400" /></InputLeftElement>
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por código ou nome" bg="white" />
      </InputGroup>

      {isLoading && templates.length === 0 ? (
        <Flex justify="center" py={12}><Spinner size="xl" color="primary.500" /></Flex>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          onEdit={openEditor}
          actions={(template) => (
            <>
              <IconButton aria-label="Histórico" title="Histórico" icon={<MdHistory />} size="sm" variant="ghost" onClick={() => openHistory(template)} />
              <Switch
                aria-label={template.active ? 'Desativar template' : 'Ativar template'}
                isChecked={template.active}
                isDisabled={template.code === 'CUSTOM'}
                onChange={() => toggleStatus(template)}
                colorScheme="green"
              />
            </>
          )}
        />
      )}

      <Modal isOpen={editor.isOpen} onClose={editor.onClose} size="6xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent minH="86vh">
          <ModalHeader>{editing ? `Editar ${editing.code}` : 'Novo template de e-mail'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Tabs colorScheme="orange" isLazy>
              <TabList>
                <Tab>Cadastro</Tab>
                <Tab>HTML e texto</Tab>
                <Tab>Preview</Tab>
              </TabList>
              <TabPanels>
                <TabPanel px={0}>
                  <VStack spacing={4} align="stretch">
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <FormControl isRequired>
                        <FormLabel>Código</FormLabel>
                        <Input value={form.code} isDisabled={Boolean(editing)} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="WELCOME_STUDENT" />
                        <FormHelperText>Identificador usado no endpoint de envio; não muda após o cadastro.</FormHelperText>
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel>Nome</FormLabel>
                        <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                      </FormControl>
                    </SimpleGrid>
                    <FormControl>
                      <FormLabel>Descrição</FormLabel>
                      <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={2} />
                    </FormControl>
                    <FormControl display="flex" alignItems="center" gap={3}>
                      <Switch isChecked={form.active} isDisabled={form.code === 'CUSTOM'} onChange={(event) => setForm({ ...form, active: event.target.checked })} colorScheme="green" />
                      <FormLabel mb={0}>Template ativo</FormLabel>
                    </FormControl>
                    <FormControl>
                      <FormLabel>Variáveis disponíveis (JSON)</FormLabel>
                      <Textarea value={form.variableDefinitions} onChange={(event) => setForm({ ...form, variableDefinitions: event.target.value })} rows={12} fontFamily="mono" fontSize="sm" />
                      <FormHelperText>Mapeie o nome da variável para uma descrição. Exemplo: <Code>{'"amount": "Valor da cobrança"'}</Code>.</FormHelperText>
                    </FormControl>
                    <Alert status="info"><AlertIcon />Use <Code mx={1}>{'{{variavel}}'}</Code> para valores obrigatórios e <Code mx={1}>{'{{#variavel}}...{{/variavel}}'}</Code> para blocos opcionais.</Alert>
                  </VStack>
                </TabPanel>
                <TabPanel px={0}>
                  <VStack spacing={4} align="stretch">
                    <FormControl isRequired>
                      <FormLabel>Assunto</FormLabel>
                      <Input value={form.subjectTemplate} onChange={(event) => setForm({ ...form, subjectTemplate: event.target.value })} fontFamily="mono" />
                    </FormControl>
                    <Flex justify="space-between" align="center">
                      <Box>
                        <Text fontWeight="semibold">Template HTML</Text>
                        <Text fontSize="sm" color="gray.500">CSS inline possui melhor compatibilidade entre clientes de e-mail.</Text>
                      </Box>
                      <Button size="sm" leftIcon={<MdImage />} onClick={() => fileInputRef.current?.click()} isLoading={isLoading}>Enviar imagem</Button>
                      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={uploadImage} />
                    </Flex>
                    <Textarea value={form.htmlTemplate} onChange={(event) => setForm({ ...form, htmlTemplate: event.target.value })} minH="410px" fontFamily="mono" fontSize="sm" whiteSpace="pre" />
                    <FormControl isRequired>
                      <FormLabel>Versão texto</FormLabel>
                      <Textarea value={form.textTemplate} onChange={(event) => setForm({ ...form, textTemplate: event.target.value })} rows={9} fontFamily="mono" fontSize="sm" />
                      <FormHelperText>Obrigatória para acessibilidade e clientes que bloqueiam HTML.</FormHelperText>
                    </FormControl>
                  </VStack>
                </TabPanel>
                <TabPanel px={0}>
                  <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={5} alignItems="start">
                    <Box>
                      <FormControl>
                        <FormLabel>Dados de exemplo (JSON)</FormLabel>
                        <Textarea value={previewData} onChange={(event) => setPreviewData(event.target.value)} minH="320px" fontFamily="mono" fontSize="sm" />
                      </FormControl>
                      <Button mt={4} leftIcon={<MdPreview />} colorScheme="orange" onClick={renderPreview} isLoading={isPreviewing}>Gerar preview</Button>
                      {preview && (
                        <Box mt={5}>
                          <Text fontSize="sm" fontWeight="semibold">Assunto renderizado</Text>
                          <Text>{preview.subject}</Text>
                          <Text fontSize="sm" fontWeight="semibold" mt={4}>Versão texto</Text>
                          <Box as="pre" mt={1} p={3} bg="gray.50" borderRadius="md" whiteSpace="pre-wrap" fontSize="sm">{preview.text}</Box>
                        </Box>
                      )}
                    </Box>
                    <Box border="1px solid" borderColor="gray.200" borderRadius="md" overflow="hidden" bg="gray.100">
                      <Text px={3} py={2} bg="gray.50" borderBottom="1px solid" borderColor="gray.200" fontSize="sm" fontWeight="semibold">E-mail renderizado</Text>
                      {preview ? (
                        <Box as="iframe" title="Preview do template" sandbox="" srcDoc={preview.html} width="100%" minH="620px" bg="white" />
                      ) : (
                        <Flex minH="360px" align="center" justify="center"><Text color="gray.500">Gere o preview para visualizar o HTML.</Text></Flex>
                      )}
                    </Box>
                  </SimpleGrid>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={editor.onClose}>Cancelar</Button>
            <Button colorScheme="primary" onClick={save} isLoading={isLoading}>Salvar template</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={history.isOpen} onClose={history.onClose} size="3xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Histórico de {historyTemplate?.code}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={3}>
              {versions.map((version) => (
                <Flex key={version.id} border="1px solid" borderColor="gray.200" borderRadius="md" p={4} justify="space-between" align="center">
                  <Box>
                    <HStack><Badge colorScheme={version.revision === historyTemplate?.revision ? 'green' : 'gray'}>v{version.revision}</Badge><Text fontWeight="semibold">{version.name}</Text></HStack>
                    <Text fontSize="sm" color="gray.500" mt={1}>{formatDate(version.createdAt)} · {version.createdByName ?? 'Sistema'}</Text>
                  </Box>
                  <Button size="sm" variant="outline" isDisabled={version.revision === historyTemplate?.revision} onClick={() => restore(version)}>Restaurar</Button>
                </Flex>
              ))}
              {versions.length === 0 && <Text color="gray.500" textAlign="center" py={8}>Nenhuma revisão encontrada.</Text>}
            </VStack>
          </ModalBody>
          <ModalFooter><Button onClick={history.onClose}>Fechar</Button></ModalFooter>
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
}
