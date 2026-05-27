import React from 'react';
import { Flex, Spinner, Text, Modal, ModalOverlay, ModalContent } from '@chakra-ui/react';

interface LoadingOverlayProps {
  isOpen: boolean;
  message?: string;
}

export function LoadingOverlay({ isOpen, message = 'Carregando...' }: LoadingOverlayProps) {
  return (
    <Modal isOpen={isOpen} onClose={() => {}} isCentered closeOnOverlayClick={false} closeOnEsc={false}>
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
      <ModalContent bg="transparent" shadow="none" border="none">
        <Flex direction="column" align="center" justify="center" gap={4}>
          <Spinner
            thickness="4px"
            speed="0.65s"
            emptyColor="gray.200"
            color="orange.500"
            size="xl"
          />
          {message && (
            <Text color="white" fontWeight="semibold" fontSize="lg" textShadow="0 2px 4px rgba(0,0,0,0.5)">
              {message}
            </Text>
          )}
        </Flex>
      </ModalContent>
    </Modal>
  );
}
