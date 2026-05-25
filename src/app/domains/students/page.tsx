'use client'

import React, { useCallback, useEffect, useState } from 'react';
import {
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
  VStack,
  HStack,
  Select,
  Text,
  Badge,
  Icon,
} from '@chakra-ui/react';
import { MdAdd } from 'react-icons/md';
import { DataTable } from '@/components/ui/DataTable';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import {
  enrollmentService,
  Enrollment,
  EnrollmentStatus,
} from '@/services/enrollmentService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { userService, User } from '@/services/userService';
import { planService, Plan } from '@/services/planService';
import { skillService, Skill } from '@/services/skillService';
import { stageService, Stage } from '@/services/stageService';
import { lessonService, Lesson } from '@/services/lessonService';

const STATUS_COLORS: Record<EnrollmentStatus, string> = {
  ACTIVE: 'green',
  PENDING: 'yellow',
  INACTIVE: 'gray',
  CANCELLED: 'red',
};

const STATUS_LABELS: Record<EnrollmentStatus, string> = {
  ACTIVE: 'Ativa',
  PENDING: 'Pendente',
  INACTIVE: 'Inativa',
  CANCELLED: 'Cancelada',
};

const INITIAL_FORM = {
  userId: '',
  skillId: '',
  stageId: '',
  currentLessonId: '',
  planId: '',
  status: 'ACTIVE' as EnrollmentStatus,
};

const formatEnrollmentDate = (dateValue?: string) => {
  if (!dateValue) return 'Será definida automaticamente ao salvar';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleString('pt-BR');
};

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState<Enrollment | null>(null);
  const [enrollmentToDelete, setEnrollmentToDelete] = useState<Enrollment | null>(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const { isOpen: isFormOpen, onOpen: onFormOpen, onClose: onFormClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const toast = useToast();

  const loadAll = useCallback(async () => {
    try {
      const [enrollRes, usersRes, plansRes, skillsRes, stagesRes, lessonsRes] = await Promise.allSettled([
        enrollmentService.getAll(),
        userService.getAll(),
        planService.getAll(),
        skillService.getAll(),
        stageService.getAll(),
        lessonService.getAll(),
      ]);
      setEnrollments(enrollRes.status  === 'fulfilled' ? enrollRes.value  : []);
      setUsers(usersRes.status         === 'fulfilled' ? usersRes.value   : []);
      setPlans(plansRes.status         === 'fulfilled' ? plansRes.value   : []);
      setSkills(skillsRes.status       === 'fulfilled' ? skillsRes.value  : []);
      setStages(stagesRes.status       === 'fulfilled' ? stagesRes.value  : []);
      setLessons(lessonsRes.status     === 'fulfilled' ? lessonsRes.value : []);
    } catch {
      toast({ title: 'Erro ao carregar matrículas', status: 'error' });
    }
  }, [toast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const selectedStage = stages.find((stage) => String(stage.id) === formData.stageId);

  const stagesMatchingSkill = stages.filter((stage) => {
    if (!formData.skillId) return true;
    return String(stage.skillId) === formData.skillId;
  });

  const filteredStages = formData.skillId && stagesMatchingSkill.length > 0
    ? stagesMatchingSkill
    : stages;

  const filteredLessons = lessons.filter((lesson) => {
    const matchesStage = !formData.stageId || lesson.stageId === formData.stageId;
    const matchesSkill = !formData.skillId || lesson.skillId === formData.skillId;
    return matchesStage && matchesSkill;
  });

  const handleOpenForm = (enrollment?: Enrollment) => {
    if (enrollment) {
      setEditingEnrollment(enrollment);
      setFormData({
        userId: enrollment.userId || '',
        skillId: enrollment.skillId?.toString() || '',
        stageId: enrollment.currentStageId?.toString() || enrollment.stageId?.toString() || '',
        currentLessonId: enrollment.currentLessonId || '',
        planId: enrollment.planId?.toString() || '',
        status: enrollment.status || 'ACTIVE',
      });
    } else {
      setEditingEnrollment(null);
      setFormData(INITIAL_FORM);
    }
    onFormOpen();
  };

  const handleSave = async () => {
    if (!formData.userId || !formData.skillId || !formData.stageId || !formData.currentLessonId || !formData.planId) {
      toast({ title: 'Preencha todos os campos obrigatórios', status: 'warning' });
      return;
    }

    setIsLoading(true);
    try {
      const resolvedSkillId = selectedStage?.skillId ?? Number(formData.skillId);
      const payload = {
        userId: formData.userId,
        skillId: resolvedSkillId,
        currentStageId: Number(formData.stageId),
        status: formData.status,
        source: 'WEB' as const,
        pace: 'REGULAR' as const,
        currentLessonId: formData.currentLessonId,
        planId: Number(formData.planId),
      };

      if (editingEnrollment) {
        await enrollmentService.update(String(editingEnrollment.id), payload);
        toast({ title: 'Matrícula atualizada com sucesso', status: 'success' });
      } else {
        await enrollmentService.create({
          ...payload,
          enrolledAt: new Date().toISOString(),
        });
        toast({ title: 'Matrícula criada com sucesso', status: 'success' });
      }
      onFormClose();
      loadAll();
    } catch {
      toast({ title: 'Erro ao salvar matrícula', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!enrollmentToDelete?.id) return;
    setIsLoading(true);
    try {
      await enrollmentService.delete(String(enrollmentToDelete.id));
      toast({ title: 'Matrícula excluída com sucesso', status: 'success' });
      onDeleteClose();
      loadAll();
    } catch {
      toast({ title: 'Erro ao excluir matrícula', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const getUserLabel = (userId?: string) => {
    if (!userId) return '—';
    const user = users.find((item) => item.id === userId);
    if (!user) return 'Usuário não encontrado';
    return user.name || user.email;
  };

  const getPlanLabel = (planId?: number) => {
    if (!planId) return '—';
    const plan = plans.find((item) => Number(item.id) === planId);
    return plan?.nome || 'Plano não encontrado';
  };

  const getSkillLabel = (skillId?: number) => {
    if (!skillId) return '—';
    const skill = skills.find((item) => item.id === skillId);
    return skill?.name || 'Skill não encontrada';
  };

  const getStageLabel = (stageId?: number | string) => {
    if (!stageId) return '—';
    const stage = stages.find((item) => String(item.id) === String(stageId));
    return stage?.name || 'Stage não encontrada';
  };

  const getEnrollmentStageLabel = (enrollment: Enrollment) => {
    if (enrollment.currentStageName) return enrollment.currentStageName;
    if (enrollment.stageName) return enrollment.stageName;
    if (enrollment.currentStageId) return getStageLabel(enrollment.currentStageId);
    if (enrollment.stageId) return getStageLabel(enrollment.stageId);

    const lesson = lessons.find((item) => item.id === enrollment.currentLessonId);
    if (lesson?.stageId) return getStageLabel(lesson.stageId);

    return '—';
  };

  const columns = [
    {
      key: 'userName',
      header: 'Usuário',
      render: (item: Enrollment) => (
        <Text fontSize="sm">{item.userName || getUserLabel(item.userId)}</Text>
      ),
    },
    {
      key: 'planName',
      header: 'Plano',
      render: (item: Enrollment) => (
        <Text fontSize="sm">{item.planName || getPlanLabel(item.planId)}</Text>
      ),
    },
    {
      key: 'skillName',
      header: 'Skill',
      render: (item: Enrollment) => (
        <Text fontSize="sm">{item.skillName || getSkillLabel(item.skillId)}</Text>
      ),
    },
    {
      key: 'stageName',
      header: 'Stage',
      render: (item: Enrollment) => (
        <Text fontSize="sm">{getEnrollmentStageLabel(item)}</Text>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Enrollment) => item.status ? (
        <Badge colorScheme={STATUS_COLORS[item.status]} fontSize="xs">
          {STATUS_LABELS[item.status]}
        </Badge>
      ) : null,
    },
  ];

  return (
    <DashboardLayout>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg" color="gray.700">Matrículas</Heading>
        <Button leftIcon={<Icon as={MdAdd} />} colorScheme="primary" onClick={() => handleOpenForm()}>
          Nova Matrícula
        </Button>
      </Flex>

      <DataTable
        columns={columns}
        data={enrollments}
        onEdit={(e) => handleOpenForm(e)}
        onDelete={(e) => { setEnrollmentToDelete(e); onDeleteOpen(); }}
      />

      {/* Modal formulário */}
      <Modal isOpen={isFormOpen} onClose={onFormClose} size="lg" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingEnrollment ? 'Editar Matrícula' : 'Nova Matrícula'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Usuário</FormLabel>
                <Select
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  placeholder="Selecione o usuário"
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} - {user.email}
                    </option>
                  ))}
                </Select>
                {formData.userId && (
                  <Text mt={2} fontSize="xs" color="gray.500">
                    ID do usuário: {formData.userId}
                  </Text>
                )}
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Plano</FormLabel>
                <Select
                  value={formData.planId}
                  onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                  placeholder="Selecione o plano"
                >
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.nome}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <HStack spacing={4} w="full" align="flex-start">
                <FormControl isRequired>
                  <FormLabel>Skill</FormLabel>
                  <Select
                    value={formData.skillId}
                    onChange={(e) => {
                      const nextSkillId = e.target.value;
                      setFormData({
                        ...formData,
                        skillId: nextSkillId,
                        stageId: '',
                        currentLessonId: '',
                      });
                    }}
                    placeholder="Selecione a skill"
                  >
                    {skills.map((skill) => (
                      <option key={skill.id} value={skill.id}>
                        {skill.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Trilha</FormLabel>
                  <Select
                    value={formData.stageId}
                    onChange={(e) => {
                      const nextStageId = e.target.value;
                      const nextStage = stages.find((stage) => String(stage.id) === nextStageId);
                      setFormData({
                        ...formData,
                        stageId: nextStageId,
                        skillId: nextStage?.skillId ? String(nextStage.skillId) : formData.skillId,
                        currentLessonId: '',
                      });
                    }}
                    placeholder="Selecione a trilha"
                  >
                    {filteredStages.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </HStack>
              <FormControl isRequired>
                <FormLabel>Lição atual</FormLabel>
                <Select
                  value={formData.currentLessonId}
                  onChange={(e) => setFormData({ ...formData, currentLessonId: e.target.value })}
                  placeholder="Selecione a lição atual"
                >
                  {filteredLessons.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.title}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Status</FormLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as EnrollmentStatus })}
                >
                  <option value="ACTIVE">Ativa</option>
                  <option value="PENDING">Pendente</option>
                  <option value="INACTIVE">Inativa</option>
                  <option value="CANCELLED">Cancelada</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Data da matrícula</FormLabel>
                <Text fontSize="sm" color="gray.600">
                  {formatEnrollmentDate(editingEnrollment?.enrolledAt)}
                </Text>
              </FormControl>
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
        title="Excluir Matrícula"
      />
    </DashboardLayout>
  );
}
