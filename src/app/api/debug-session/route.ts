import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Sem sessão ativa' }, { status: 401 });
  }

  const s = session as any;

  return NextResponse.json({
    usuario: session.user?.name,
    email: session.user?.email,
    temAccessToken: !!s.accessToken,
    accessTokenPreview: s.accessToken
      ? `${String(s.accessToken).slice(0, 40)}...`
      : null,
  });
}
