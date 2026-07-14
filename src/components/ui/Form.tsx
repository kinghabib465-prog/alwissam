import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const NUMERIC_TYPES = new Set([
  "number",
  "date",
  "time",
  "datetime-local",
  "month",
  "week",
  "tel",
]);

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = "text", lang, inputMode, ...props }, ref) => {
  const isNumeric = NUMERIC_TYPES.has(type);
  return (
    <input
      ref={ref}
      type={type}
      lang={lang ?? (isNumeric ? "en" : undefined)}
      inputMode={
        inputMode ??
        (type === "number" || type === "tel" ? "numeric" : undefined)
      }
      className={cn(
        "h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-foreground placeholder:text-muted-foreground focus-ring",
        isNumeric && "font-latin",
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-28 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-ring",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, lang, ...props }, ref) => (
  <select
    ref={ref}
    lang={lang ?? "en"}
    className={cn(
      "font-latin h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-foreground focus-ring",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export function FormField({
  label,
  htmlFor,
  error,
  children,
  hint,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
