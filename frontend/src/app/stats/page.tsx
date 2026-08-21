// Server Component:
// Stats are fetched on the server before the page is rendered.
import React from 'react';
import { demonstrateHoisting, getSystemArchitectureSummary } from '@/lib/javascriptConcepts';

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
    // Normalize base URL to ensure clean /api/public/stats endpoint path
    const baseUrl = rawUrl.replace(/\/api$/, '');
    const response = await fetch(`${baseUrl}/api/public/stats`, {
      cache: 'no-store', // Guarantees fresh server-side rendering on every request
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.statusText}`);
    }

    const json = await response.json();
    return json?.data || {
      totalUsers: 0,
      totalDocuments: 0,
      totalAIUsages: 0,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[SSR:getStats] Server fetch error:', error);
    return {
      totalUsers: 0,
      totalDocuments: 0,
      totalAIUsages: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

export default async function StatsPage() {
  // Server-side data retrieval during page rendering
  const stats = await getStats();

  // Executing hoisted functions during server-side render
  const hoistingResult = demonstrateHoisting();
  const archSummary = getSystemArchitectureSummary();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-3xl w-full bg-white dark:bg-gray-800 p-6 md:p-10 rounded-2xl shadow-lg text-center border border-gray-200 dark:border-gray-700">
        <div className="inline-block px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 text-xs font-semibold rounded-full uppercase tracking-wider mb-4 border border-green-300 dark:border-green-700">
          ⚡ Server-Side Rendered (Next.js Server Component)
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mb-3">DocuMind AI Platform Stats</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8 text-sm md:text-base max-w-xl mx-auto">
          This page is a genuine <strong>Next.js Server Component</strong>. The database statistics below are fetched directly by the server before any HTML is sent to your browser.
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
            <h2 className="text-xs md:text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2">AI Usages Logged</h2>
            <p className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white">{stats.totalAIUsages}</p>
          </div>
        </div>

        {/* Runtime Diagnostics & Concepts Verification */}
        <div className="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg text-left text-xs space-y-1 text-gray-600 dark:text-gray-300">
          <p><strong>SSR Fetch Timestamp:</strong> {new Date(stats.timestamp).toLocaleString()}</p>
          <p><strong>System Engine:</strong> {archSummary}</p>
          <p><strong>Language Concept:</strong> {hoistingResult} (Verified)</p>
        </div>
      </div>
    </main>
  );
}
