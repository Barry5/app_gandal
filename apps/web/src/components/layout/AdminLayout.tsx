'use client';
import Link from 'next/link';
import { Shield, Users, BarChart, CreditCard } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex">
      <aside className="w-64 bg-white dark:bg-gray-800 p-4 flex-shrink-0 border-r dark:border-gray-700">
        <h1 className="text-2xl font-bold gradient-text mb-8 px-4">Admin</h1>
        <nav className="space-y-2">
          <Link href="/admin/dashboard" className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            <BarChart className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>
          <Link href="/admin/users" className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            <Users className="w-5 h-5" />
            <span>Utilisateurs</span>
          </Link>
          <Link href="/admin/monetization" className="flex items-center gap-3 px-4 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold">
            <CreditCard className="w-5 h-5" />
            <span>Monétisation</span>
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-6 sm:p-8 overflow-y-auto">{children}</main>
    </div>
  );
}