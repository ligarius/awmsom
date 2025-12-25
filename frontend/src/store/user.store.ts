import { create } from "zustand";
import type { AuthUser } from "@/types/auth";

interface UserState {
  user?: AuthUser;
  accessToken?: string;
  setUser: (user?: AuthUser) => void;
  setAccessToken: (token?: string) => void;
  clear: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: undefined,
  accessToken: undefined,
  setUser: (user) => set({ user }),
  setAccessToken: (token) => set({ accessToken: token }),
  clear: () => set({ user: undefined, accessToken: undefined }),
  hasPermission: (permission) => Boolean(permission && get().user?.permissions?.includes(permission)),
  hasRole: (role) => {
    if (!role) return false;
    const user = get().user;
    const roles = user?.roles ?? (user?.role ? [user.role] : []);
    return roles.includes(role);
  }
}));
