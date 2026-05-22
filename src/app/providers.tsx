'use client'

import { ChakraProvider, extendTheme } from '@chakra-ui/react'
import { SessionProvider } from 'next-auth/react'

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

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ChakraProvider theme={theme}>{children}</ChakraProvider>
    </SessionProvider>
  )
}
