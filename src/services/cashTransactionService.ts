import { api } from '@/lib/api';

export type TransactionType = 'ENTRY' | 'EXIT';

export interface CashTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: number;
  categoryName: string;
  studentId?: string;
  studentName?: string;
  discount?: number;
  responsibleUserId?: string;
  responsibleUserName?: string;
  observations?: string;
  transactionDate: string;
  createdAt: string;
}

export interface CashSummary {
  totalEntry: number;
  totalExit: number;
  balance: number;
}

export interface CreateCashTransactionPayload {
  type: TransactionType;
  amount: number;
  categoryId: number;
  studentId?: string;
  discount?: number;
  responsibleUserId?: string;
  observations?: string;
  transactionDate?: string;
}

export const cashTransactionService = {
  getAll: async (): Promise<CashTransaction[]> => {
    const response = await api.get('/cash-transactions');
    return response.data;
  },
  getSummary: async (): Promise<CashSummary> => {
    const response = await api.get('/cash-transactions/summary');
    return response.data;
  },
  create: async (data: CreateCashTransactionPayload): Promise<CashTransaction> => {
    const response = await api.post('/cash-transactions', data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/cash-transactions/${id}`);
  },
};
