import { User } from '../types/auth';

// Mock database of users
export const users: User[] = [
  {
    id: '1',
    username: 'reviewer1',
    name: 'John Reviewer',
    role: 'reviewer',
  },
  {
    id: '2',
    username: 'reviewer2',
    name: 'Sarah Reviewer',
    role: 'reviewer',
  },
  {
    id: '3',
    username: 'admin1',
    name: 'Admin User',
    role: 'admin',
  },
  {
    id: '4',
    username: 'coordinator1',
    name: 'Project Coordinator',
    role: 'coordinator',
  },
];

// Mock credentials database (in a real app, passwords would be hashed)
export const credentials: Record<string, string> = {
  'reviewer1': 'password123',
  'reviewer2': 'password123',
  'admin1': 'admin123',
  'coordinator1': 'coord123',
};

export const authenticateUser = (username: string, password: string): User | null => {
  // Check if credentials match
  if (credentials[username] === password) {
    // Find and return the user
    return users.find(user => user.username === username) || null;
  }
  return null;
};