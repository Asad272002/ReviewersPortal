export interface User {
  id: string;
  username: string;
  name: string;
  role: 'reviewer' | 'admin';
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}