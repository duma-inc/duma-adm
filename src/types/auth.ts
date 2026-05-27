import type { Session } from 'next-auth';

export type SessionWithAccessToken = Session & {
  accessToken?: string;
  error?: string;
};
