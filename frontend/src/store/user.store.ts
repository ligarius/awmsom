import { create } from "zustand";
import type { AuthUser } from "@/types/auth";

interface UserState {
  user?: AuthUser;
  setUser: (user?: AuthUser) => void;
  clear: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: undefined,
  setUser: (user) => set({ user }),
  clear: () => set({ user: undefined })
}));
