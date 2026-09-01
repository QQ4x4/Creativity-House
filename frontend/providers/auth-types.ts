/**
 * Auth user shape returned by AuthController::userPayload().
 * Kept separate from AuthProvider.jsx so webpack never resolves a type-only
 * sibling (.d.ts) in place of the runtime module.
 */
export interface AuthUser {
  id: number;
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  phone_number: string | null;
  avatar_url: string | null;
  email_verified_at: string | null;
  is_active: boolean;
  /** Grants access to /[lang]/admin. Enforced server-side by `admin` middleware. */
  is_admin: boolean;
}

export interface AuthContextValue {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<AuthUser | null>;
  logout: () => Promise<void>;
}
