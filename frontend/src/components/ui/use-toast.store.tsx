import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from "react";
import { create } from "zustand";
import { nanoid } from "nanoid";
import { Toast, ToastAction, ToastProvider as Provider } from "@/components/ui/toast";

export type ToastActionElement = ReactElement<typeof ToastAction>;
export type ToastProps = ComponentPropsWithoutRef<typeof Toast>;
export type ToastInput = ToastProps & {
  title?: ReactNode;
  description?: ReactNode;
  action?: ToastActionElement;
};

interface ToastItem extends ToastInput {
  id: string;
}

interface ToastState {
  toasts: ToastItem[];
  toast: (props: ToastInput) => void;
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

  const ToastProvider = ({ children }: { children: ReactNode }) => (
    <Provider swipeDirection="right">{children}</Provider>
  );

  return { useToastStore, ToastProvider };
}
