import { ReactNode } from "react";
import clsx from "clsx";

export function GlassPanel({
  children,
  className,
  dark,
}: {
  children: ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <div className={clsx(dark ? "glass-panel-dark" : "glass-panel", className)}>
      {children}
    </div>
  );
}

export function GlassButton({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button className={clsx("glass-button", className)} onClick={onClick}>
      {children}
    </button>
  );
}

export function GlassInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      placeholder={placeholder}
      className={clsx("glass-input", className)}
    />
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={clsx("badge", className)}>{children}</span>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("skeleton", className)} />;
}
