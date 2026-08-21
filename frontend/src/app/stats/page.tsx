// Next.js Server Component: data is fetched on the server before rendering.
import React from 'react';
import {
  demonstrateHoisting,
  demonstrateEventLoopAsync,
  compareAsyncPatterns,
  createRequestCounter,
} from '@/lib/javascriptConcepts';

export const dynamic = 'force-dynamic';

interface PublicStats {
  totalUsers: number;
  totalDocuments: number;
  totalAIUsages: number;
  timestamp: string;
}

async function getStats(): Promise<PublicStats> {
  try {
    const rawUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const baseUrl = rawUrl.replace(/\/api$/, '');
    const response = await fetch(`${baseUrl}/api/public/stats`, {
      cache: 'no-store', // Ensures dynamic server-side rendering on every request
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch statistics: ${response.statusText}`);
    }

    const json = await response.json();
    return json?.data || {
      totalUsers: 0,
      totalDocuments: 0,
      totalAIUsages: 0,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[ServerComponent:getStats] Server-side fetch error:', error);
    return {
      totalUsers: 0,
      totalDocuments: 0,
      totalAIUsages: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

export default async function StatsPage() {
  // 1. Server-side data fetching before HTML is generated
  const stats = await getStats();

  // 2. Execute JavaScript fundamentals during Server-Side Rendering
  const hoistingResult = demonstrateHoisting();
  const eventLoopResult = await demonstrateEventLoopAsync();
  const asyncPatternsResult = await compareAsyncPatterns();
  
  // Demonstrating Closures
  const counter = createRequestCounter(stats.totalUsers);
  const nextProjectedUser = counter.increment();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-3xl w-full bg-white dark:bg-gray-800 p-6 md:p-10 rounded-2xl shadow-lg text-center border border-gray-200 dark:border-gray-700">
        <div className="inline-block px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 text-xs font-semibold rounded-full uppercase tracking-wider mb-4 border border-green-300 dark:border-green-700">
          ⚡ Next.js Server Component (SSR)
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mb-3">System Statistics</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8 text-sm md:text-base max-w-xl mx-auto">
          This page is a genuine <strong>Next.js Server Component</strong>. The database statistics below are fetched directly by the server before any HTML is delivered to your browser.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm">
            <h2 className="text-xs md:text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">Registered Users</h2>
            <p className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white">{stats.totalUsers}</p>
          </div>
          
          <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800 shadow-sm">
            <h2 className="text-xs md:text-sm font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider mb-2">Documents Processed</h2>
            <p className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white">{stats.totalDocuments}</p>
          </div>

          <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800 shadow-sm">
            <h2 className="text-xs md:text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2">AI Usage Logged</h2>
            <p className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white">{stats.totalAIUsages}</p>
          </div>
        </div>

        {/* Runtime Diagnostics & Concepts Verification */}
        <div className="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg text-left text-xs space-y-2 text-gray-600 dark:text-gray-300">
          <p><strong>SSR Render Timestamp:</strong> {new Date(stats.timestamp).toLocaleString()}</p>
          <p><strong>Hoisting Verification:</strong> {hoistingResult}</p>
          <p><strong>Event Loop Order:</strong> {eventLoopResult.join(' ➔ ')}</p>
          <p><strong>Async Patterns:</strong> {asyncPatternsResult.callback} | {asyncPatternsResult.promise}</p>
          <p><strong>Closure Stateful Counter:</strong> Base: {stats.totalUsers} ➔ Next Projected: {nextProjectedUser}</p>
        </div>
      </div>
    </main>
  );
}
