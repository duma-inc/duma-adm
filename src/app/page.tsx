import { Alert, AlertIcon } from '@chakra-ui/react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { DashboardSummaryView } from '@/components/dashboard/DashboardSummaryView';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { authOptions } from '@/lib/auth';
import { fetchBackendJson } from '@/lib/server-api';
import type { SessionWithAccessToken } from '@/types/auth';
import type { DashboardSummary } from '@/types/dashboard';

export default async function Home() {
  const session = await getServerSession(authOptions);
  const accessToken = (session as SessionWithAccessToken | null)?.accessToken;

  if (!session || !accessToken) {
    redirect('/login');
  }

  try {
    const summary = await fetchBackendJson<DashboardSummary>('/admin/dashboard/summary', {
      accessToken,
      revalidateSeconds: 300,
    });

    return (
      <DashboardLayout>
        <DashboardSummaryView summary={summary} />
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
