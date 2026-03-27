import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

const variants = {
  primary:
    "bg-sage-500 text-white hover:bg-sage-600 shadow-sm shadow-sage-500/20",
  secondary:
    "bg-charcoal-800/5 text-charcoal-800 hover:bg-charcoal-800/10",
  ghost:
    "text-charcoal-700 hover:text-charcoal-900 hover:bg-charcoal-800/5",
};

const sizes = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-2.5 text-sm",
  lg: "px-8 py-3.5 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        font-medium rounded-2xl
        transition-all duration-200 ease-out
        disabled:opacity-40 disabled:cursor-not-allowed
        cursor-pointer
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    />
  );
}
