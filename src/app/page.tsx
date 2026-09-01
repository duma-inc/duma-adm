import { Alert, AlertIcon } from '@chakra-ui/react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { DashboardSummaryView } from '@/components/dashboard/DashboardSummaryView';
import type { MeetingCalendarLabels } from '@/components/dashboard/MeetingsCalendar';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { authOptions } from '@/lib/auth';
import { fetchBackendJson } from '@/lib/server-api';
import type { Meeting } from '@/services/meetingService';
import type { Lesson } from '@/services/lessonService';
import type { Skill } from '@/services/skillService';
import type { Stage } from '@/services/stageService';
import type { User } from '@/services/userService';
import type { SessionWithAccessToken } from '@/types/auth';
import type { DashboardSummary } from '@/types/dashboard';

export default async function Home() {
  const session = await getServerSession(authOptions);
  const accessToken = (session as SessionWithAccessToken | null)?.accessToken;

  if (!session || !accessToken) {
    redirect('/login');
  }

  try {
    const [
      summaryResult,
      meetingsResult,
      usersResult,
      skillsResult,
      stagesResult,
      lessonsResult,
    ] = await Promise.allSettled([
      fetchBackendJson<DashboardSummary>('/admin/dashboard/summary', {
        accessToken,
        revalidateSeconds: 300,
      }),
      fetchBackendJson<Meeting[]>('/meetings', {
        accessToken,
        revalidateSeconds: 60,
      }),
      fetchBackendJson<User[]>('/users', {
        accessToken,
        revalidateSeconds: 300,
      }),
      fetchBackendJson<Skill[]>('/skills', {
        accessToken,
        revalidateSeconds: 300,
      }),
      fetchBackendJson<Stage[]>('/stages', {
        accessToken,
        revalidateSeconds: 300,
      }),
      fetchBackendJson<Lesson[]>('/lessons', {
        accessToken,
        revalidateSeconds: 300,
      }),
    ]);

    if (summaryResult.status === 'rejected') {
      throw summaryResult.reason;
    }

    const meetingLabels: MeetingCalendarLabels = {
      users: Object.fromEntries(
        (usersResult.status === 'fulfilled' ? usersResult.value : [])
          .map((user) => [String(user.id), user.name || user.email])
      ),
      skills: Object.fromEntries(
        (skillsResult.status === 'fulfilled' ? skillsResult.value : [])
          .map((skill) => [String(skill.id), skill.name])
      ),
      stages: Object.fromEntries(
        (stagesResult.status === 'fulfilled' ? stagesResult.value : [])
          .map((stage) => [String(stage.id), stage.name])
      ),
      lessons: Object.fromEntries(
        (lessonsResult.status === 'fulfilled' ? lessonsResult.value : [])
          .map((lesson) => [String(lesson.id), lesson.title])
      ),
    };

    return (
      <DashboardLayout>
        <DashboardSummaryView
          summary={summaryResult.value}
          meetings={meetingsResult.status === 'fulfilled' ? meetingsResult.value : []}
          meetingLabels={meetingLabels}
          meetingsUnavailable={meetingsResult.status === 'rejected'}
        />
      </DashboardLayout>
    );
  } catch {
    return (
      <DashboardLayout>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          Não foi possível carregar a dashboard.
        </Alert>
      </DashboardLayout>
    );
  }
}
