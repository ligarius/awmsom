import type { ToastActionElement, ToastInput } from "@/components/ui/use-toast.store";
import { createToastStore } from "@/components/ui/use-toast.store";

const { ToastProvider, useToastStore } = createToastStore();

const toast = (props: ToastInput) => useToastStore.getState().toast(props);

const useToast = () => {
  const state = useToastStore();
  return {
    ...state,
    toast
  };
};

export { ToastProvider, toast, useToast };
export type { ToastActionElement, ToastInput };
