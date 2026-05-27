'use client'

import { ChakraProvider, extendTheme } from '@chakra-ui/react'
import { useEffect } from 'react'
import { SessionProvider, useSession } from 'next-auth/react'
import { clearApiAccessToken, setApiAccessToken } from '@/lib/api'
import type { SessionWithAccessToken } from '@/types/auth'

const theme = extendTheme({
  colors: {
    primary: {
      50: '#fff5e5',
      100: '#ffebcc',
      200: '#ffd199',
      300: '#ffb866',
      400: '#ffa333',
      500: '#FDA91E',
      600: '#D88A00',
      700: '#a66a00',
      800: '#7A4A12',
      900: '#402600',
    },
  },
  styles: {
    global: {
      body: {
        bg: 'var(--background)',
        color: 'var(--text-primary)',
      },
    },
  },
})

function ApiAuthBridge() {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'authenticated') {
      setApiAccessToken((session as SessionWithAccessToken | null)?.accessToken || null)
      return
    }

    if (status === 'unauthenticated') {
      clearApiAccessToken()
    }
  }, [session, status])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ApiAuthBridge />
      <ChakraProvider theme={theme}>{children}</ChakraProvider>
    </SessionProvider>
  )
}
