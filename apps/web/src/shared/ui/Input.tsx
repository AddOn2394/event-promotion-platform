import { forwardRef, type InputHTMLAttributes } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        {...props}
        className={`w-full rounded-md border border-borde bg-superficie px-3 py-2 text-tinta placeholder:text-apagado focus:border-jade ${className ?? ""}`}
      />
    );
  },
);
