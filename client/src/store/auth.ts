import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Tier = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "PLACEMENT_READY";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  tier: Tier;
  credits: number;
  branch?: string | null;
  gpa?: number | null;
  strongConcepts?: string[];
  targetRoles?: string[];
  languages?: string[];
  college?: string | null;
  course?: string | null;
  year?: number | null;
  phone?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  leetcodeUrl?: string | null;
};

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setAuth: (payload: { accessToken: string; refreshToken: string; user: AuthUser }) => void;
  setUser: (user: AuthUser) => void;
  clearAuth: () => void;
};

const STORAGE_KEY = "placementos-auth";

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      
      setAuth: ({ accessToken, refreshToken, user }) => {
        set({ accessToken, refreshToken, user });
      },
      
      setUser: (user) => {
        set({ user });
      },
      
      clearAuth: () => {
        set({ accessToken: null, refreshToken: null, user: null });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    }
  )
);

