import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-foreground hover:bg-accent-hover shadow-sm border border-transparent",
  secondary:
    "bg-surface-sunken text-foreground hover:bg-border/60 border border-border",
  ghost: "bg-transparent text-foreground hover:bg-surface-sunken border border-transparent",
  outline:
    "bg-transparent text-foreground hover:bg-surface-sunken border border-border",
  danger:
    "bg-danger text-white hover:opacity-90 border border-transparent shadow-sm",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5 rounded-[var(--radius-md)]",
  md: "h-10 px-4 text-sm gap-2 rounded-[var(--radius-lg)]",
  lg: "h-11 px-5 text-base gap-2 rounded-[var(--radius-lg)]",
  icon: "h-10 w-10 rounded-[var(--radius-lg)]",
};

const base =
  "inline-flex items-center justify-center font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type ButtonAsLink = CommonProps & {
  href: string;
  target?: string;
  rel?: string;
  "aria-label"?: string;
};

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    className,
    children,
    ...rest
  } = props;

  const classes = cn(base, variantClasses[variant], sizeClasses[size], className);

  if ("href" in props && props.href) {
    const { href, target, rel, "aria-label": ariaLabel } = props;
    return (
      <Link
        href={href}
        className={classes}
        target={target}
        rel={rel}
        aria-label={ariaLabel}
      >
        {children}
      </Link>
    );
  }

  const buttonProps = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  const { type: buttonType = "button", ...buttonRest } = buttonProps;
  return (
    <button type={buttonType} className={classes} {...buttonRest}>
      {children}
    </button>
  );
}
