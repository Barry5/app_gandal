import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

interface ProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'indigo' | 'purple' | 'green' | 'orange' | 'red';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  size = 'md',
  color = 'indigo',
  showLabel = false,
  label,
  animated = true,
}) => {
  const [width, setWidth] = useState(animated ? 0 : (value / max) * 100);

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => setWidth((value / max) * 100), 100);
      return () => clearTimeout(timer);
    }
  }, [value, max, animated]);

  const sizes = { sm: 'h-1', md: 'h-2', lg: 'h-3' };
  const colors = {
    indigo: 'bg-indigo-500',
    purple: 'bg-purple-500',
    green: 'bg-emerald-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
  };

  return (
    <div className="space-y-1.5">
      {(showLabel || label) && (
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
          <span className="text-gray-500">{Math.round((value / max) * 100)}%</span>
        </div>
      )}
      <div className={cn('w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden', sizes[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-out', colors[color])}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
};

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  showValue?: boolean;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  color = '#6366f1',
  bgColor = '#e5e7eb',
  showValue = true,
}) => {
  const [progress, setProgress] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = (value / max) * 100;

  useEffect(() => {
    const timer = setTimeout(() => setProgress(percent), 100);
    return () => clearTimeout(timer);
  }, [percent]);

  useEffect(() => {
    const offset = circumference - (progress / 100) * circumference;
    const el = document.getElementById('circle-progress');
    if (el) el.style.strokeDashoffset = String(offset);
  }, [progress, circumference]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        <circle
          id="circle-progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {showValue && (
        <span className="absolute text-lg font-bold text-gray-900 dark:text-gray-100">
          {Math.round(percent)}%
        </span>
      )}
    </div>
  );
};
