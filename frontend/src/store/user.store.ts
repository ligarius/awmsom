import { create } from "zustand";
import type { AuthUser } from "@/types/auth";

interface UserState {
  user?: AuthUser;
  setUser: (user?: AuthUser) => void;
  clear: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: undefined,
  setUser: (user) => set({ user }),
  clear: () => set({ user: undefined }),
  hasPermission: (permission) => Boolean(permission && get().user?.permissions?.includes(permission)),
  hasRole: (role) => Boolean(role && get().user?.role === role)
}));
