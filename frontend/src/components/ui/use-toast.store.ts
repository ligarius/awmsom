import { create } from "zustand";
import { nanoid } from "nanoid";
import type { ToastProps } from "@radix-ui/react-toast";
import { ToastProvider as Provider } from "@/components/ui/toast";

interface ToastItem extends ToastProps {
  id: string;
}

interface ToastState {
  toasts: ToastItem[];
  toast: (props: ToastProps) => void;
  dismiss: (id: string) => void;
}

export function createToastStore() {
  const useToastStore = create<ToastState>((set) => ({
    toasts: [],
    toast: (props) =>
      set((state) => ({
        toasts: [
          ...state.toasts,
          {
            ...props,
            id: nanoid()
          }
        ]
      })),
    dismiss: (id) =>
      set((state) => ({
        toasts: state.toasts.filter((toast) => toast.id !== id)
      }))
  }));

  const ToastProvider = ({ children }: { children: React.ReactNode }) => (
    <Provider swipeDirection="right">{children}</Provider>
  );

  return { useToastStore, ToastProvider };
}
