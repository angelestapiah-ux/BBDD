import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

const storedToken = localStorage.getItem('renova_token');
const storedUser = localStorage.getItem('renova_user');

export const useAuthStore = create<AuthState>((set) => ({
  user: storedUser ? JSON.parse(storedUser) : null,
  token: storedToken,
  isAuthenticated: !!storedToken,
  setAuth: (user, token) => {
    localStorage.setItem('renova_token', token);
    localStorage.setItem('renova_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('renova_token');
    localStorage.removeItem('renova_user');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
