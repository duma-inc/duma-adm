'use client';

import {
  Button,
  HStack,
  IconButton,
  Select,
  Text,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';

export const DEFAULT_INITIAL_PAGE_SIZE = 10;
export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25];

interface TablePaginationProps {
  currentPage: number;
  pageSize: number;
  pageSizeOptions?: number[];
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function TablePagination({
  currentPage,
  pageSize,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = totalItems === 0 ? 0 : Math.min(currentPage * pageSize, totalItems);

  return (
    <Wrap align="center" justify="space-between" spacing={3} w="100%">
      <WrapItem>
        <HStack spacing={3} flexWrap="wrap">
          <Text fontSize="sm" color="gray.500">
            Itens por página
          </Text>
          <Select
            size="sm"
            w="88px"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            bg="white"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
          <Text fontSize="sm" color="gray.500">
            Mostrando {startItem}-{endItem} de {totalItems}
          </Text>
        </HStack>
      </WrapItem>

      <WrapItem>
        <HStack spacing={2}>
          {totalPages > 1 ? (
            <>
              <IconButton
                aria-label="Página anterior"
                icon={<MdChevronLeft />}
                size="sm"
                variant="outline"
                onClick={() => onPageChange(currentPage - 1)}
                isDisabled={currentPage === 1}
              />
              <Button size="sm" variant="ghost" isDisabled>
                Página {currentPage} de {totalPages}
              </Button>
              <IconButton
                aria-label="Próxima página"
                icon={<MdChevronRight />}
                size="sm"
                variant="outline"
                onClick={() => onPageChange(currentPage + 1)}
                isDisabled={currentPage === totalPages}
              />
            </>
          ) : (
            <Button size="sm" variant="ghost" isDisabled>
              Página 1 de 1
            </Button>
          )}
        </HStack>
      </WrapItem>
    </Wrap>
  );
}
