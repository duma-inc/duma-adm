import { withAuth } from 'next-auth/middleware';

/**
 * Segunda camada do gate de colaborador.
 *
 * O `signIn` já barra quem não é colaborador na hora do login, mas isso protege só a porta da
 * frente: sem middleware, cada página precisaria lembrar de checar a sessão por conta própria,
 * e hoje só a raiz faz isso. Aqui a marca gravada no JWT vale para toda rota de uma vez.
 */
export default withAuth({
  pages: { signIn: '/login' },
  callbacks: {
    // Sessão sem a marca de colaborador é tratada como não autenticada: volta para o login.
    authorized: ({ token }) => token?.isCollaborator === true,
  },
});

export const config = {
  matcher: [
    /*
     * Tudo, menos:
     *  - /api/auth  (o próprio fluxo de login precisa rodar deslogado)
     *  - /login     (senão o redirect vira laço)
     *  - assets do Next e favicon
     */
    '/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)',
  ],
};
