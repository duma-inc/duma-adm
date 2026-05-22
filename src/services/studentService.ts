import { api } from '@/lib/api';
import { User } from './userService';

export interface Student {
  user: User;
  bio?: string;
  profilePictureUrl?: string;
}

export const studentService = {
  getAll: async (): Promise<Student[]> => {
    const response = await api.get('/students');
    return response.data;
  },
};
