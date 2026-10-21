import { InputHTMLAttributes, forwardRef } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, id, className = "", ...props }, ref) => {
    return (
      <div>
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-charcoal/80">
          {label}
        </label>
        <input
          ref={ref}
          id={id}
          className={`w-full rounded-lg border border-charcoal/15 bg-surface px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal/35 focus:border-forest/40 focus:outline-none focus:ring-2 focus:ring-forest/15 ${className}`}
          {...props}
        />
      </div>
    );
  }
);
Field.displayName = "Field";
