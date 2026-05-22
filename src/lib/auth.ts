import { NextAuthOptions } from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";

async function refreshAccessToken(token: any) {
  const issuer = process.env.KEYCLOAK_ISSUER_INTERNAL || process.env.KEYCLOAK_ISSUER || "http://localhost:8081/realms/duma-realm";
  const tokenUrl = `${issuer}/protocol/openid-connect/token`;

  console.log("[auth] Renovando access token via refresh_token...");

  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: process.env.KEYCLOAK_CLIENT_ID || "duma-adm",
        client_secret: process.env.KEYCLOAK_CLIENT_SECRET || "",
        refresh_token: token.refreshToken,
      }),
    });

    const refreshed = await response.json();

    if (!response.ok) {
      console.error("[auth] Falha no refresh:", response.status, JSON.stringify(refreshed));
      return { ...token, error: "RefreshAccessTokenError" };
    }

    console.log("[auth] Token renovado com sucesso. Expira em:", refreshed.expires_in, "s");

    return {
      ...token,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      idToken: refreshed.id_token ?? token.idToken,
      expiresAt: Math.floor(Date.now() / 1000) + refreshed.expires_in,
      error: undefined,
    };
  } catch (error) {
    console.error("[auth] Erro de rede no refresh:", error);
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: "keycloak",
      name: "Keycloak",
      type: "oauth",
      wellKnown: undefined,
      checks: ["pkce", "state"],
      idToken: true,
      authorization: {
        url: `${process.env.KEYCLOAK_ISSUER || "http://localhost:8081/realms/duma-realm"}/protocol/openid-connect/auth`,
        params: { scope: "openid email profile offline_access" },
      },
      token: `${process.env.KEYCLOAK_ISSUER_INTERNAL || "http://keycloak:8080/realms/duma-realm"}/protocol/openid-connect/token`,
      userinfo: `${process.env.KEYCLOAK_ISSUER_INTERNAL || "http://keycloak:8080/realms/duma-realm"}/protocol/openid-connect/userinfo`,
      jwks_endpoint: `${process.env.KEYCLOAK_ISSUER_INTERNAL || "http://keycloak:8080/realms/duma-realm"}/protocol/openid-connect/certs`,
      issuer: process.env.KEYCLOAK_ISSUER || "http://localhost:8081/realms/duma-realm",
      profile(profile: any) {
        return {
          id: profile.sub,
          name: profile.name ?? profile.preferred_username,
          email: profile.email,
          image: profile.picture,
        };
      },
      clientId: process.env.KEYCLOAK_CLIENT_ID || "duma-adm",
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || "",
    },
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, account }) {
      // Primeiro login: salva tudo que vem do Keycloak
      if (account) {
        console.log("[auth] Primeiro login. Token expira em:", account.expires_at, "(unix)");
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          idToken: account.id_token,
          expiresAt: account.expires_at,
        };
      }

      const expiresAt = token.expiresAt as number | undefined;
      const nowSeconds = Math.floor(Date.now() / 1000);

      if (!expiresAt) {
        console.warn("[auth] expiresAt não definido — forçando refresh.");
        return refreshAccessToken(token);
      }

      const remainingSeconds = expiresAt - nowSeconds;
      console.log(`[auth] Token expira em ${remainingSeconds}s`);

      // Token ainda válido (com 60s de margem)
      if (remainingSeconds > 60) {
        return token;
      }

      console.log("[auth] Token expirado ou expirando — iniciando refresh.");
      return refreshAccessToken(token);
    },
    async session({ session, token }: any) {
      session.accessToken = token.accessToken;
      session.idToken = token.idToken;
      session.error = token.error;
      return session;
    },
  },
  events: {
    async signOut({ token }: any) {
      const issuer = process.env.KEYCLOAK_ISSUER_INTERNAL || process.env.KEYCLOAK_ISSUER || "http://localhost:8081/realms/duma-realm";
      const logoutUrl = `${issuer}/protocol/openid-connect/logout`;
      if (token?.idToken) {
        await fetch(
          `${logoutUrl}?id_token_hint=${token.idToken}&post_logout_redirect_uri=${encodeURIComponent(
            process.env.NEXTAUTH_URL || "http://localhost:3000"
          )}`,
          { method: "GET" }
        ).catch(() => {});
      }
    },
  },
};
