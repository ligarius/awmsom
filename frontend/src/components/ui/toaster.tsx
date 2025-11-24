"use client";

import { useEffect } from "react";
import { Toast, ToastAction, ToastClose, ToastDescription, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { ToastProvider, useToast } from "@/components/ui/use-toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  useEffect(() => {
    const timeoutIds = toasts.map((toast) => setTimeout(() => dismiss(toast.id), 5000));
    return () => timeoutIds.forEach((id) => clearTimeout(id));
  }, [dismiss, toasts]);

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, ...props }) => (
        <Toast key={id} {...props}>
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          {action}
          <ToastClose onClick={() => dismiss(id)} />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
