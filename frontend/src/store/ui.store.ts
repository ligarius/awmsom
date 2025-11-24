import { create } from "zustand";

interface UiState {
  sidebarOpen: boolean;
  theme: "light" | "dark" | "system";
  toggleSidebar: () => void;
  setTheme: (theme: UiState["theme"]) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  theme: "system",
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => set({ theme })
}));
