import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

function decodeJwtPayload(token: string) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const s = session as any;
  const token = s?.accessToken;
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  // Decodifica o JWT para ver expiração
  const payload = token ? decodeJwtPayload(token) : null;
  const expTimestamp = payload?.exp;
  const nowTimestamp = Math.floor(Date.now() / 1000);
  const isExpired = expTimestamp ? nowTimestamp > expTimestamp : null;
  const expiresInSeconds = expTimestamp ? expTimestamp - nowTimestamp : null;

  const endpoints = ['stages', 'lessons', 'skills', 'exercises', 'enrollments', 'plans', 'users', 'teachers', 'meetings', 'attempts'];
  const results: Record<string, any> = {};

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${apiBase}/${ep}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: AbortSignal.timeout(5000),
      });
      const body = await res.json().catch(() => null);
      results[ep] = {
        status: res.status,
        ok: res.ok,
        count: Array.isArray(body) ? body.length : null,
      };
    } catch (err: any) {
      results[ep] = { error: err?.message ?? 'Falha de rede' };
    }
  }

  return NextResponse.json({
    temSessao: !!session,
    temToken: !!token,
    sessionError: s?.error ?? null,
    token: {
      preview: token ? `${String(token).slice(0, 50)}...` : null,
      exp: expTimestamp ? new Date(expTimestamp * 1000).toISOString() : null,
      now: new Date().toISOString(),
      isExpired,
      expiresInSeconds,
      issuedAt: payload?.iat ? new Date(payload.iat * 1000).toISOString() : null,
      audience: payload?.aud ?? null,
      issuer: payload?.iss ?? null,
    },
    endpoints: results,
  });
}
