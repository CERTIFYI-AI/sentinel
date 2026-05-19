
export interface User {
  id: string;
  email: string;
  tenantId?: string;
  role?: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}
