# Duma Admin

Este é o painel de controle administrativo do ecossistema Duma, construído com [Next.js](https://nextjs.org), [Chakra UI](https://chakra-ui.com/) e [Tailwind CSS](https://tailwindcss.com/).

## Iniciando

Instale as dependências:

```bash
npm install
```

Configure as variáveis de ambiente necessárias (copie de `.env.example` para `.env.local` e preencha):
- `KEYCLOAK_CLIENT_ID`
- `KEYCLOAK_CLIENT_SECRET`
- `KEYCLOAK_ISSUER`
- `NEXT_PUBLIC_API_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

Execute o servidor de desenvolvimento:

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) (ou a porta correspondente) em seu navegador.

## Estrutura e Documentação

O código segue a abordagem de App Router. 
Para mais informações sobre a arquitetura e visão geral deste módulo, consulte [duma-docs/duma-adm.md](../../duma-docs/duma-adm.md).
