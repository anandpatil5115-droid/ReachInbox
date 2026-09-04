import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  textarea?: boolean;
  rows?: number;
}

export default function Input({
  label,
  error,
  textarea = false,
  rows = 4,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  const baseStyles = `
    w-full h-9 px-3 rounded-md border text-[13px]
    transition-all duration-150
    placeholder:text-[#86868B]
    focus:outline-none
    ${
      error
        ? 'border-[#C93434] focus:border-[#C93434] focus:ring-2 focus:ring-[#C93434]/10'
        : 'border-[#D2D2D7] focus:border-[#5856D6] focus:ring-2 focus:ring-[#5856D6]/10'
    }
    ${className}
  `;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[12px] font-medium text-[#6E6E73] mb-1.5"
        >
          {label}
        </label>
      )}
      {textarea ? (
        <textarea
          id={inputId}
          rows={rows}
          className={`${baseStyles} h-auto py-2.5 resize-none`}
          {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input id={inputId} className={baseStyles} {...props} />
      )}
      {error && (
        <p className="mt-1.5 text-[12px] text-[#C93434]">{error}</p>
      )}
    </div>
  );
}
