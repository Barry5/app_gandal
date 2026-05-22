import React from 'react';

interface BadgeProps {
  variant?: 'default' | 'gradient' | 'outline' | 'subtle' | 'info' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

export function Badge({ variant = 'default', size = 'md', className = '', children }: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200',
    gradient: 'gradient-bg text-white',
    outline: 'border-2 border-current',
    subtle: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    error: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  };
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
}

interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  const initials = name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  if (src) {
    return (
      <img 
        src={src} 
        alt={name || 'Avatar'} 
        className={`rounded-full object-cover ${sizes[size]} ${className}`} 
      />
    );
  }

  return (
    <div className={`rounded-full gradient-bg flex items-center justify-center text-white font-semibold ${sizes[size]} ${className}`}>
      {initials}
    </div>
  );
}

interface StatsCardProps {
  title?: string;
  label?: string;
  value: string | number;
  change?: number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function StatsCard({ title, label, value, change, trend, color = 'indigo', icon, className = '' }: StatsCardProps) {
  const displayLabel = label || title;
  const displayChange = trend?.value ?? change;
  const isPositive = trend?.isPositive ?? ((displayChange ?? 0) >= 0);
  const colorClasses: Record<string, string> = {
    indigo: 'bg-indigo-500',
    purple: 'bg-purple-500',
    green: 'bg-emerald-500',
    orange: 'bg-orange-500',
    blue: 'bg-blue-500',
    red: 'bg-red-500',
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-100 dark:border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        {icon && (
          <div className={`w-12 h-12 rounded-xl ${colorClasses[color] || colorClasses.indigo} flex items-center justify-center text-white`}>
            {icon}
          </div>
        )}
        {displayChange !== undefined && (
          <span className={`text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}{displayChange}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{displayLabel}</p>
    </div>
  );
}
