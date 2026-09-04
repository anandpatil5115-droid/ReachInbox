import React from 'react';

type BadgeVariant = 'scheduled' | 'pending' | 'sent' | 'failed' | 'processing';

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  scheduled: {
    bg: 'bg-[#FFF3E0]',
    text: 'text-[#B86E00]',
    dot: 'bg-[#B86E00]',
  },
  pending: {
    bg: 'bg-[#FFF3E0]',
    text: 'text-[#B86E00]',
    dot: 'bg-[#B86E00]',
  },
  sent: {
    bg: 'bg-[#E8F5E9]',
    text: 'text-[#248A3D]',
    dot: 'bg-[#248A3D]',
  },
  failed: {
    bg: 'bg-[#FFEBEA]',
    text: 'text-[#C93434]',
    dot: 'bg-[#C93434]',
  },
  processing: {
    bg: 'bg-[#F0EFFE]',
    text: 'text-[#5856D6]',
    dot: 'bg-[#5856D6]',
  },
};

export default function Badge({ variant, children, className = '' }: BadgeProps) {
  const styles = variantStyles[variant];

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        px-2 py-0.5 rounded
        text-[11px] font-medium
        ${styles.bg} ${styles.text}
        ${className}
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
      {children}
    </span>
  );
}
