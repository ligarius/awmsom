import { ToastActionElement, type ToastProps } from "@radix-ui/react-toast";
import { createToastStore } from "@/components/ui/use-toast.store";

const { ToastProvider, useToastStore } = createToastStore();

const toast = (props: ToastProps) => useToastStore.getState().toast(props);

const useToast = () => {
  const state = useToastStore();
  return {
    ...state,
    toast
  };
};

export { ToastProvider, toast, useToast, ToastActionElement };
