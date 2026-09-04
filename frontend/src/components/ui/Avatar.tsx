import React from 'react';

type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
  name: string;
  size?: AvatarSize;
  imageUrl?: string;
  className?: string;
}

const sizeStyles: Record<AvatarSize, { container: string; text: string }> = {
  sm: { container: 'w-6 h-6', text: 'text-[10px]' },
  md: { container: 'w-8 h-8', text: 'text-[12px]' },
  lg: { container: 'w-10 h-10', text: 'text-[14px]' },
};

const colorPalette = [
  '#5856D6',
  '#0891B2',
  '#059669',
  '#B86E00',
  '#C93434',
  '#7C3AED',
  '#DB2777',
  '#2563EB',
];

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colorPalette[Math.abs(hash) % colorPalette.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function Avatar({
  name,
  size = 'md',
  imageUrl,
  className = '',
}: AvatarProps) {
  const styles = sizeStyles[size];

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={`${styles.container} rounded-full object-cover ${className}`}
      />
    );
  }

  const bgColor = getColorFromName(name);
  const initials = getInitials(name);

  return (
    <div
      className={`${styles.container} rounded-full flex items-center justify-center text-white font-medium ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      <span className={styles.text}>{initials}</span>
    </div>
  );
}
