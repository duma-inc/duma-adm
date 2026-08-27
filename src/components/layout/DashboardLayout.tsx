'use client'

import { Box, Flex, Button, Menu, MenuButton, MenuList, MenuItem, HStack, Icon, Text, Portal, Avatar, Spinner } from '@chakra-ui/react';
import { MdKeyboardArrowDown, MdDashboard, MdSchool, MdPeople, MdMenuBook, MdLibraryBooks, MdLogout, MdAssignment, MdBugReport, MdAttachMoney, MdGroups, MdFolder, MdRateReview, MdMic, MdSlowMotionVideo, MdBook, MdArticle, MdNotifications, MdSlideshow, MdSportsEsports, MdStyle, MdEmail, MdCampaign } from 'react-icons/md';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import logo from '@/assets/logoDuma.png';
import { userService } from '@/services/userService';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [backendName, setBackendName] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  // O nome do token e montado pelo Keycloak (firstName + lastName) e fica defasado
  // quando o cadastro e editado no adm. O backend e a fonte de verdade.
  useEffect(() => {
    if (status !== 'authenticated') return;
    let active = true;
    userService
      .getMe()
      .then((user) => {
        if (active && user?.name) setBackendName(user.name);
      })
      .catch(() => {
        // Mantem o nome da sessao como fallback.
      });
    return () => {
      active = false;
    };
  }, [status]);

  const displayName = backendName ?? session?.user?.name ?? 'Admin';

  if (status === 'loading') {
    return (
      <Flex h="100vh" align="center" justify="center" bg="#1c1c1c">
        <Spinner size="xl" color="primary.500" thickness="4px" />
      </Flex>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <Flex h="100vh" direction="column" bg="gray.100">
      {/* Header / Top Menu */}
      <Flex
        zIndex={10}
        position="relative"
        h="70px"
        bg="#1c1c1c"
        borderBottom="1px solid"
        borderColor="whiteAlpha.100"
        align="center"
        px={8}
        justify="space-between"
      >
        <HStack spacing={8}>
          <Box cursor="pointer" onClick={() => router.push('/')}>
            <Image src={logo} alt="Duma Logo" height={42} style={{ objectFit: 'contain' }} />
          </Box>

          <HStack spacing={1} display={{ base: 'none', md: 'flex' }}>
            <Button
              variant="ghost"
              color="whiteAlpha.800"
              _hover={{ bg: 'whiteAlpha.100', color: 'white' }}
              leftIcon={<Icon as={MdDashboard} />}
              onClick={() => router.push('/')}
            >
              Dashboard
            </Button>

            <Menu isLazy>
              <MenuButton
                as={Button}
                variant="ghost"
                color="whiteAlpha.800"
                _hover={{ bg: 'whiteAlpha.100', color: 'white' }}
                rightIcon={<Icon as={MdKeyboardArrowDown} />}
              >
                Pedagógico
              </MenuButton>
              <Portal>
                <MenuList zIndex={20} bg="#2a2a2a" borderColor="whiteAlpha.100" color="white">
                  <MenuItem bg="transparent" _hover={{ bg: 'whiteAlpha.100' }} icon={<Icon as={MdSchool} />} onClick={() => router.push('/domains/stages')}>
                    Stages
                  </MenuItem>
                  <MenuItem bg="transparent" _hover={{ bg: 'whiteAlpha.100' }} icon={<Icon as={MdMenuBook} />} onClick={() => router.push('/domains/modules')}>
                    Módulos
                  </MenuItem>
                  <MenuItem bg="transparent" _hover={{ bg: 'whiteAlpha.100' }} icon={<Icon as={MdLibraryBooks} />} onClick={() => router.push('/domains/lessons')}>
                    Lições
                  </MenuItem>
                  <MenuItem bg="transparent" _hover={{ bg: 'whiteAlpha.100' }} icon={<Icon as={MdAssignment} />} onClick={() => router.push('/domains/exercises')}>
                    Exercícios
                  </MenuItem>
                  {/* Material que o professor projeta no duma-toolkit durante a aula. */}
                  <MenuItem bg="transparent" _hover={{ bg: 'whiteAlpha.100' }} icon={<Icon as={MdSlideshow} />} onClick={() => router.push('/domains/slide-decks')}>
                    Slides
                  </MenuItem>
                  <MenuItem bg="transparent" _hover={{ bg: 'whiteAlpha.100' }} icon={<Icon as={MdSportsEsports} />} onClick={() => router.push('/domains/games')}>
                    Jogos
                  </MenuItem>
                  <MenuItem bg="transparent" _hover={{ bg: 'whiteAlpha.100' }} icon={<Icon as={MdStyle} />} onClick={() => router.push('/domains/class-flashcards')}>
                    Flashcards da Aula
                  </MenuItem>
                  <MenuItem bg="transparent" _hover={{ bg: 'whiteAlpha.100' }} icon={<Icon as={MdRateReview} />} onClick={() => router.push('/domains/deliveries')}>
                    Entregas
                  </MenuItem>
                  <MenuItem bg="transparent" _hover={{ bg: 'whiteAlpha.100' }} icon={<Icon as={MdGroups} />} onClick={() => router.push('/domains/meetings')}>
                    Encontros
                  </MenuItem>
                  <MenuItem bg="transparent" _hover={{ bg: 'whiteAlpha.100' }} icon={<Icon as={MdSchool} />} onClick={() => router.push('/domains/skills')}>
                    Skills
                  </MenuItem>
                </MenuList>
              </Portal>
            </Menu>

            <Menu isLazy>
              <MenuButton
                as={Button}
                variant="ghost"
                color="whiteAlpha.800"
                _hover={{ bg: 'whiteAlpha.100', color: 'white' }}
                rightIcon={<Icon as={MdKeyboardArrowDown} />}
              >
                Cadastros
              </MenuButton>
              <Portal>
                <MenuList zIndex={20} bg="#2a2a2a" borderColor="whiteAlpha.100" color="white">
                  <MenuItem bg="transparent" _hover={{ bg: 'whiteAlpha.100' }} icon={<Icon as={MdPeople} />} onClick={() => router.push('/domains/teachers')}>
                    Colaboradores
                  </MenuItem>
                  <MenuItem bg="transparent" _hover={{ bg: 'whiteAlpha.100' }} icon={<Icon as={MdSchool} />} onClick={() => router.push('/domains/students')}>
                    Matriculados
                  </MenuItem>
                  <MenuItem bg="transparent" _hover={{ bg: 'whiteAlpha.100' }} icon={<Icon as={MdPeople} />} onClick={() => router.push('/domains/users')}>
                    Usuários
                  </MenuItem>
                </MenuList>
              </Portal>
            </Menu>

            <Menu isLazy>
              <MenuButton
                as={Button}
                variant="ghost"
                color="whiteAlpha.800"
                _hover={{ bg: 'whiteAlpha.100', color: 'white' }}
                rightIcon={<Icon as={MdKeyboardArrowDown} />}
              >
                Sistema
              </MenuButton>
              <Portal>
                <MenuList zIndex={20} bg="#2a2a2a" borderColor="whiteAlpha.100" color="white">
                  <MenuItem bg="transparent" _hover={{ bg: 'whiteAlpha.100' }} icon={<Icon as={MdFolder} />} onClick={() => router.push('/domains/resources')}>
                    Recursos
                  </MenuItem>
                  <MenuItem bg="transparent" _hover={{ bg: 'whiteAlpha.100' }} icon={<Icon as={MdMic} />} onClick={() => router.push('/domains/podcasts')}>
                    Podcasts
                  </MenuItem>
                  <MenuItem bg="transparent" _hover={{ bg: 'whiteAlpha.100' }} icon={<Icon as={MdSlowMotionVideo} />} onClick={() => router.push('/domains/videos')}>
                    Vídeos
                  </MenuItem>
                  <MenuItem bg="transparent" _hover={{ bg: 'whiteAlpha.100' }} icon={<Icon as={MdBook} />} onClick={() => router.push('/domains/lesson-books')}>
                    Apostilas
                  </MenuItem>
                  <MenuItem bg="transparent" _hover={{ bg: 'whiteAlpha.100' }} icon={<Icon as={MdArticle} />} onClick={() => router.push('/domains/news')}>
                    Notícias
                  </MenuItem>
                  <MenuItem bg="transparent" _hover={{ bg: 'whiteAlpha.100' }} icon={<Icon as={MdBugReport} />} onClick={() => router.push('/domains/error-reports')}>
                    Relatório de Erros
                  </MenuItem>
                  <MenuItem bg="transparent" _hover={{ bg: 'whiteAlpha.100' }} icon={<Icon as={MdNotifications} />} onClick={() => router.push('/domains/notifications')}>
                    Notificações
                  </MenuItem>
                  <MenuItem bg="transparent" _hover={{ bg: 'whiteAlpha.100' }} icon={<Icon as={MdEmail} />} onClick={() => router.push('/domains/email-templates')}>
                    Templates de E-mail
                  </MenuItem>
                  <MenuItem bg="transparent" _hover={{ bg: 'whiteAlpha.100' }} icon={<Icon as={MdCampaign} />} onClick={() => router.push('/domains/communications')}>
                    Comunicações
                  </MenuItem>
                </MenuList>
              </Portal>
            </Menu>

            <Menu isLazy>
              <MenuButton
                as={Button}
                variant="ghost"
                color="whiteAlpha.800"
                _hover={{ bg: 'whiteAlpha.100', color: 'white' }}
                rightIcon={<Icon as={MdKeyboardArrowDown} />}
              >
                Financeiro
              </MenuButton>
              <Portal>
                <MenuList zIndex={20} bg="#2a2a2a" borderColor="whiteAlpha.100" color="white">
                  <MenuItem bg="transparent" _hover={{ bg: 'whiteAlpha.100' }} icon={<Icon as={MdAttachMoney} />} onClick={() => router.push('/domains/plans')}>
                    Planos
                  </MenuItem>
                  <MenuItem bg="transparent" _hover={{ bg: 'whiteAlpha.100' }} icon={<Icon as={MdAttachMoney} />} onClick={() => router.push('/domains/cashflow')}>
                    Caixa
                  </MenuItem>
                </MenuList>
              </Portal>
            </Menu>
          </HStack>
        </HStack>

        <HStack spacing={3}>
          <Avatar
            size="sm"
            name={displayName}
            bg="primary.500"
            color="white"
          />
          <Text fontSize="sm" color="whiteAlpha.700" display={{ base: 'none', md: 'block' }}>
            {displayName}
          </Text>
          <Button
            size="sm"
            variant="ghost"
            color="whiteAlpha.700"
            _hover={{ bg: 'whiteAlpha.100', color: 'white' }}
            leftIcon={<Icon as={MdLogout} />}
            onClick={async () => {
              const issuer = process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER || 'http://localhost:8081/realms/duma-realm';
              const logoutUrl = `${issuer}/protocol/openid-connect/logout`;
              const redirectUri = encodeURIComponent(window.location.origin + '/login');
              // Primeiro encerra a sessão local do NextAuth, depois redireciona para o logout do Keycloak
              await signOut({ redirect: false });
              window.location.href = `${logoutUrl}?post_logout_redirect_uri=${redirectUri}&client_id=${process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'duma-adm'}`;
            }}
          >
            Sair
          </Button>
        </HStack>
      </Flex>

      {/* Main Content */}
      <Box flex={1} overflow="auto" p={8}>
        {children}
      </Box>
    </Flex>
  );
}
