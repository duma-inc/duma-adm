import type { Session } from 'next-auth';

export type SessionWithAccessToken = Session & {
  accessToken?: string;
  error?: string;
  /** O painel é restrito a colaboradores; marcado no login e propagado pela sessão. */
  isCollaborator?: boolean;
};
