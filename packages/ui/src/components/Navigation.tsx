import React, { useState } from 'react';
import { cn } from '../lib/utils';

interface AccordionProps {
  items: {
    title: string;
    content: React.ReactNode;
    icon?: React.ReactNode;
  }[];
  allowMultiple?: boolean;
  defaultOpen?: number[];
}

export const Accordion: React.FC<AccordionProps> = ({
  items,
  allowMultiple = false,
  defaultOpen = [],
}) => {
  const [openItems, setOpenItems] = useState<number[]>(defaultOpen);

  const toggleItem = (index: number) => {
    if (allowMultiple) {
      setOpenItems((prev) =>
        prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
      );
    } else {
      setOpenItems((prev) => (prev.includes(index) ? [] : [index]));
    }
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={index}
          className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
        >
          <button
            onClick={() => toggleItem(index)}
            className={cn(
              'w-full flex items-center justify-between p-4',
              'bg-white dark:bg-gray-800',
              'hover:bg-gray-50 dark:hover:bg-gray-700/50',
              'transition-colors duration-200'
            )}
          >
            <div className="flex items-center gap-3">
              {item.icon && <span className="text-indigo-500">{item.icon}</span>}
              <span className="font-medium text-gray-900 dark:text-gray-100">{item.title}</span>
            </div>
            <span className="w-5 h-5 text-gray-400">
              {openItems.includes(index) ? 'v' : '>'}
            </span>
          </button>
          {openItems.includes(index) && (
            <div className="px-4 pb-4 pt-0 bg-gray-50 dark:bg-gray-800/50">
              {item.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

interface TabsProps {
  tabs: { id: string; label: string; icon?: React.ReactNode; badge?: string | number }[];
  activeTab: string;
  onChange: (id: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200',
            activeTab === tab.id
              ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.badge && (
            <span className="px-2 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

interface StepperProps {
  steps: { id: number; label: string; description?: string }[];
  currentStep: number;
}

export const Stepper: React.FC<StepperProps> = ({ steps, currentStep }) => {
  return (
    <div className="flex items-center">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex items-center">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300',
                currentStep >= step.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              )}
            >
              {currentStep > step.id ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.id
              )}
            </div>
            <div className="ml-3 hidden sm:block">
              <p className={cn('font-medium', currentStep >= step.id ? 'text-gray-900 dark:text-white' : 'text-gray-500')}>
                {step.label}
              </p>
              {step.description && (
                <p className="text-sm text-gray-500">{step.description}</p>
              )}
            </div>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                'flex-1 h-0.5 mx-4',
                currentStep > step.id ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
