import {
  Box,
  HStack,
  IconButton,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { MdEdit, MdDelete } from 'react-icons/md';
import {
  DEFAULT_INITIAL_PAGE_SIZE,
  DEFAULT_PAGE_SIZE_OPTIONS,
  TablePagination,
} from '@/components/ui/TablePagination';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  /** Acoes extras renderizadas antes de editar/excluir na coluna de Acoes. */
  actions?: (item: T) => ReactNode;
  enablePagination?: boolean;
  initialPageSize?: number;
  pageSizeOptions?: number[];
}

export function DataTable<T extends { id: number | string }>({
  columns,
  data,
  onEdit,
  onDelete,
  actions,
  enablePagination = true,
  initialPageSize = DEFAULT_INITIAL_PAGE_SIZE,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  useEffect(() => {
    setPageSize(initialPageSize);
  }, [initialPageSize]);

  const totalPages = useMemo(() => {
    if (!enablePagination) return 1;
    return Math.max(1, Math.ceil(data.length / pageSize));
  }, [data.length, enablePagination, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const visibleData = useMemo(() => {
    if (!enablePagination) return data;

    const startIndex = (currentPage - 1) * pageSize;
    return data.slice(startIndex, startIndex + pageSize);
  }, [currentPage, data, enablePagination, pageSize]);

  const hasActionsColumn = Boolean(onEdit || onDelete || actions);
  const actionsColumnCount = hasActionsColumn ? 1 : 0;

  return (
    <Box bg="white" borderRadius="md" boxShadow="sm" overflow="hidden">
      <TableContainer>
        <Table variant="simple">
          <Thead bg="gray.50">
            <Tr>
              {columns.map((col, index) => (
                <Th key={index}>{col.header}</Th>
              ))}
              {hasActionsColumn && <Th width="140px" textAlign="right">Ações</Th>}
            </Tr>
          </Thead>
          <Tbody>
            {visibleData.map((item) => (
              <Tr key={item.id}>
                {columns.map((col, index) => (
                  <Td key={index}>
                    {col.render ? col.render(item) : (item[col.key as keyof T] as ReactNode)}
                  </Td>
                ))}
                {hasActionsColumn && (
                  <Td textAlign="right">
                    <HStack spacing={2} justify="flex-end">
                      {actions?.(item)}
                      {onEdit && (
                        <IconButton
                          aria-label="Edit"
                          icon={<MdEdit />}
                          size="sm"
                          colorScheme="blue"
                          variant="ghost"
                          onClick={() => onEdit(item)}
                        />
                      )}
                      {onDelete && (
                        <IconButton
                          aria-label="Delete"
                          icon={<MdDelete />}
                          size="sm"
                          colorScheme="red"
                          variant="ghost"
                          onClick={() => onDelete(item)}
                        />
                      )}
                    </HStack>
                  </Td>
                )}
              </Tr>
            ))}
            {visibleData.length === 0 && (
              <Tr>
                <Td colSpan={columns.length + actionsColumnCount} textAlign="center" py={8} color="gray.500">
                  Nenhum registro encontrado.
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </TableContainer>
      {enablePagination ? (
        <Box borderTop="1px solid" borderColor="gray.100" px={4} py={3}>
          <TablePagination
            currentPage={currentPage}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            totalItems={data.length}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setCurrentPage(1);
            }}
          />
        </Box>
      ) : null}
    </Box>
  );
}
