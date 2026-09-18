import { forwardRef, type SelectHTMLAttributes } from "react";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return (
      <select
        ref={ref}
        {...props}
        className={`w-full rounded-md border border-borde-fuerte bg-superficie px-3 py-2 text-tinta focus:border-jade ${className ?? ""}`}
      />
    );
  },
);
