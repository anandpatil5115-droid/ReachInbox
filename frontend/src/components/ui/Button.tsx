import React from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[#5856D6] text-white hover:bg-[#4644B8] focus:ring-[#5856D6]/10',
  secondary:
    'bg-white text-[#1D1D1F] border border-[#D2D2D7] hover:bg-gray-50 focus:ring-gray-200/50',
  ghost:
    'bg-transparent text-[#6E6E73] hover:bg-gray-100 hover:text-[#1D1D1F] focus:ring-gray-200/50',
  danger:
    'bg-[#C93434] text-white hover:bg-[#B22E2E] focus:ring-[#C93434]/10',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-[12px]',
  md: 'px-3.5 py-2 text-[13px]',
  lg: 'px-4 py-2.5 text-[14px]',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2
        rounded-md font-medium
        transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-offset-1
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      {loading && <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" />}
      {children}
    </button>
  );
}
