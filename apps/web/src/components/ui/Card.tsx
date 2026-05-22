import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  children?: React.ReactNode;
}

export function Card({ variant = 'default', padding = 'md', className = '', children, ...props }: CardProps) {
  const variants = {
    default: 'bg-white dark:bg-gray-800 shadow-md border border-gray-100 dark:border-gray-700',
    bordered: 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700',
    gradient: 'gradient-bg text-white',
  };
  
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
  };

  return (
    <div className={`rounded-2xl ${variants[variant]} ${paddings[padding]} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children }: { className?: string; children?: React.ReactNode }) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ className = '', children }: { className?: string; children?: React.ReactNode }) {
  return <h3 className={`text-lg font-semibold text-gray-900 dark:text-white ${className}`}>{children}</h3>;
}

export function CardDescription({ className = '', children }: { className?: string; children?: React.ReactNode }) {
  return <p className={`text-sm text-gray-500 dark:text-gray-400 mt-1 ${className}`}>{children}</p>;
}

export function CardContent({ className = '', children }: { className?: string; children?: React.ReactNode }) {
  return <div className={className}>{children}</div>;
}

export function CardFooter({ className = '', children }: { className?: string; children?: React.ReactNode }) {
  return <div className={`mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 ${className}`}>{children}</div>;
}
