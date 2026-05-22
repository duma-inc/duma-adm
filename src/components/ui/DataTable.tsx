import { Table, Thead, Tbody, Tr, Th, Td, TableContainer, IconButton, HStack, Box } from '@chakra-ui/react';
import { MdEdit, MdDelete } from 'react-icons/md';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
}

export function DataTable<T extends { id: number | string }>({ columns, data, onEdit, onDelete }: DataTableProps<T>) {
  return (
    <Box bg="white" borderRadius="md" boxShadow="sm" overflow="hidden">
      <TableContainer>
        <Table variant="simple">
          <Thead bg="gray.50">
            <Tr>
              {columns.map((col, index) => (
                <Th key={index}>{col.header}</Th>
              ))}
              {(onEdit || onDelete) && <Th width="100px" textAlign="right">Ações</Th>}
            </Tr>
          </Thead>
          <Tbody>
            {data.map((item) => (
              <Tr key={item.id}>
                {columns.map((col, index) => (
                  <Td key={index}>
                    {col.render ? col.render(item) : (item[col.key as keyof T] as React.ReactNode)}
                  </Td>
                ))}
                {(onEdit || onDelete) && (
                  <Td textAlign="right">
                    <HStack spacing={2} justify="flex-end">
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
            {data.length === 0 && (
              <Tr>
                <Td colSpan={columns.length + 1} textAlign="center" py={8} color="gray.500">
                  Nenhum registro encontrado.
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
}
