import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <h1 className="text-5xl font-bold mb-6">DocuMind AI</h1>
      <p className="text-xl mb-8 max-w-2xl text-center">
        Your intelligent document assistant. Upload PDFs, ask questions, and get instant answers powered by RAG and LLMs.
      </p>
      
      <div className="flex gap-4">
        <Link 
          href="/login" 
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Login
        </Link>
        <Link 
          href="/register" 
          className="px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition"
        >
          Register
        </Link>
      </div>

      <div className="mt-16 text-sm text-gray-500">
        Phase 1: Foundation. Full features coming soon.
      </div>
    </main>
  );
}
