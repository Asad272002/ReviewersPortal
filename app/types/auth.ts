export interface User {
  id: string;
  username: string;
  name: string;
  role: 'reviewer' | 'admin' | 'team';
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}