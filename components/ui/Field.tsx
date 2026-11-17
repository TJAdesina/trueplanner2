import { InputHTMLAttributes, forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  showPasswordToggle?: boolean;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(
  (
    {
      label,
      id,
      className = "",
      showPasswordToggle = false,
      type,
      ...props
    },
    ref
  ) => {
    const [passwordVisible, setPasswordVisible] = useState(false);
    const canRevealPassword = showPasswordToggle && type === "password";

    return (
      <div>
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-charcoal/80">
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={id}
            type={canRevealPassword && passwordVisible ? "text" : type}
            className={`w-full rounded-lg border border-charcoal/15 bg-surface px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal/35 focus:border-forest/40 focus:outline-none focus:ring-2 focus:ring-forest/15 ${canRevealPassword ? "pr-12" : ""} ${className}`}
            {...props}
          />
          {canRevealPassword && (
            <button
              type="button"
              onClick={() => setPasswordVisible((visible) => !visible)}
              onMouseDown={(event) => event.preventDefault()}
              aria-label={passwordVisible ? "Hide password" : "Show password"}
              aria-pressed={passwordVisible}
              className="absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-charcoal/55 hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40"
            >
              {passwordVisible ? (
                <EyeOff aria-hidden="true" size={18} />
              ) : (
                <Eye aria-hidden="true" size={18} />
              )}
            </button>
          )}
        </div>
      </div>
    );
  }
);
Field.displayName = "Field";
