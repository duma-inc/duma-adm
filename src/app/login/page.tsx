'use client'

import {
  Box,
  Button,
  Flex,
  Heading,
  Icon,
  Text,
  VStack,
  Divider,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { MdLock } from 'react-icons/md';
import Image from 'next/image';
import logo from '@/assets/logoDuma.png';

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  OAuthSignin: 'Falha ao iniciar o login no provedor.',
  OAuthCallback: 'Falha no retorno do login. Verifique a configuracao do callback.',
  OAuthCreateAccount: 'Nao foi possivel criar a sessao com o provedor.',
  Callback: 'Falha ao concluir a autenticacao.',
  OAuthAccountNotLinked: 'Esta conta nao esta vinculada corretamente.',
  SessionRequired: 'Sua sessao expirou. Tente entrar novamente.',
  AccessDenied: 'Este painel e restrito a colaboradores.',
  Default: 'Nao foi possivel concluir o login.',
};

const FORBIDDEN_MESSAGE =
  'Este painel e restrito a colaboradores. Sua conta nao tem esse acesso — procure um administrador.';

function LoginForm() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const error = searchParams.get('error');
  // `forbidden=1` vem do gate de colaborador; merece um texto proprio, nao o erro generico.
  const isForbidden = searchParams.get('forbidden') === '1';
  const errorMessage = isForbidden
    ? FORBIDDEN_MESSAGE
    : error
      ? LOGIN_ERROR_MESSAGES[error] || LOGIN_ERROR_MESSAGES.Default
      : null;

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/');
    }
  }, [status, router]);

  const handleLogin = async () => {
    setIsLoading(true);
    await signIn('keycloak', { callbackUrl: '/' });
  };

  if (status === 'loading' || status === 'authenticated') {
    return (
      <Flex h="100vh" align="center" justify="center" bg="#1c1c1c">
        <Text color="gray.400">Carregando...</Text>
      </Flex>
    );
  }

  return (
    <Flex h="100vh" direction={{ base: 'column', md: 'row' }} bg="#1c1c1c">
      {/* Painel lateral esquerdo */}
      <Flex
        display={{ base: 'none', md: 'flex' }}
        flex={1}
        direction="column"
        align="center"
        justify="center"
        bg="#141414"
        p={12}
        gap={8}
        borderRight="1px solid"
        borderColor="whiteAlpha.100"
      >
        <Image src={logo} alt="Duma Logo" width={180} style={{ objectFit: 'contain' }} />
        <Text color="whiteAlpha.600" fontSize="md" textAlign="center" maxW="sm">
          Plataforma de gestão pedagógica para tutores e colaboradores.
        </Text>
      </Flex>

      {/* Painel direito - formulário de login */}
      <Flex
        flex={1}
        align="center"
        justify="center"
        bg="#1c1c1c"
        p={{ base: 8, md: 16 }}
      >
        <VStack spacing={8} w="full" maxW="sm">
          {/* Logo mobile */}
          <Box display={{ base: 'block', md: 'none' }}>
            <Image src={logo} alt="Duma Logo" width={140} style={{ objectFit: 'contain' }} />
          </Box>

          <VStack spacing={2} align="flex-start" w="full">
            <Heading size="lg" color="white">
              Bem-vindo de volta
            </Heading>
            <Text color="whiteAlpha.600" fontSize="sm">
              Acesse o painel administrativo com sua conta institucional.
            </Text>
          </VStack>

          <Divider borderColor="whiteAlpha.200" />

          {errorMessage && (
            <Alert status="error" borderRadius="lg" bg="red.500" color="white">
              <AlertIcon color="white" />
              {errorMessage}
            </Alert>
          )}

          <VStack spacing={4} w="full">
            <Button
              w="full"
              size="lg"
              bg="primary.500"
              color="white"
              _hover={{ bg: 'primary.400' }}
              leftIcon={<Icon as={MdLock} />}
              isLoading={isLoading}
              loadingText="Redirecionando..."
              onClick={handleLogin}
              borderRadius="lg"
              boxShadow="0 0 20px rgba(253, 169, 30, 0.25)"
            >
              Entrar com Keycloak
            </Button>
          </VStack>

          <Text fontSize="xs" color="whiteAlpha.400" textAlign="center">
            Ao acessar, você concorda com os termos de uso da plataforma Duma.
          </Text>
        </VStack>
      </Flex>
    </Flex>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <Flex h="100vh" align="center" justify="center" bg="#1c1c1c">
        <Text color="gray.400">Carregando...</Text>
      </Flex>
    }>
      <LoginForm />
    </Suspense>
  );
}

