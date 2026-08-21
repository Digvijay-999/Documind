'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { getDocument } from '@/lib/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { documentId: string; chunkIndex: number; score: number }[];
}

interface AgentResponse {
  toolsUsed: string[];
  summary?: { summary: string; keyPoints: string[] };
  quiz?: { questions: { question: string; options: string[]; correctAnswer: string; explanation: string }[] };
  searchResults?: string[];
  answer?: string;
  error?: string;
}

export default function DocumentDetail() {
  const router = useRouter();
  const params = useParams();
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [mode, setMode] = useState<'chat' | 'agent'>('chat');

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Agent state
  const [agentInput, setAgentInput] = useState('');
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [agentResult, setAgentResult] = useState<AgentResponse | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const docId = params.id as string;
    if (!docId) return;

    getDocument(token, docId)
      .then(async (res) => {
        if (res.success) {
          setDocument(res.data);
          
          // Fetch chat history
          try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
            const historyRes = await fetch(`${API_URL}/chat/sessions/${docId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const historyData = await historyRes.json();
            
            if (historyData.success && historyData.data.length > 0) {
              const formattedMessages: ChatMessage[] = historyData.data.map((m: any) => ({
                id: m._id || Date.now().toString() + Math.random(),
                role: m.role,
                content: m.content
              }));
              setMessages(formattedMessages);
            } else {
              setMessages([{
                id: 'welcome',
                role: 'assistant',
                content: `Hello! I'm ready to answer questions about "${res.data.name}". What would you like to know?`
              }]);
            }
          } catch (err) {
            console.error('Failed to load history', err);
            setMessages([{
              id: 'welcome',
              role: 'assistant',
              content: `Hello! I'm ready to answer questions about "${res.data.name}". What would you like to know?`
            }]);
          }

        } else {
          setError(res.message || 'Failed to load document');
        }
      })
      .catch((err) => {
        setError('An error occurred.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router, params]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isStreaming) return;
    
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input };
    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMsg: ChatMessage = { id: assistantMsgId, role: 'assistant', content: '' };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsStreaming(true);

    try {
      const token = localStorage.getItem('token');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL}/ai/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ documentId: document.id, question: userMsg.content })
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.message) errorMessage = errorData.message;
        } catch (e) {
          // Ignore if not JSON
        }
        throw new Error(`Failed to connect to chat stream: ${errorMessage}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      if (!reader) throw new Error('No reader available');

      let done = false;
      let accumulatedText = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;

        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.replace('data: ', '').trim();
              if (!dataStr) continue;

              try {
                const data = JSON.parse(dataStr);
                if (data.error) {
                  accumulatedText += `\n\n**Error:** ${data.error}`;
                  setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: accumulatedText } : m));
                  break;
                }
                if (data.text) {
                  accumulatedText += data.text;
                  setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: accumulatedText } : m));
                }
                if (data.done) {
                  setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, sources: data.sources } : m));
                }
              } catch (e) {
                console.error('Failed to parse SSE JSON:', dataStr);
              }
            }
          }
        }
      }
    } catch (err: any) {
      setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: m.content + `\n\n**System Error:** ${err.message}` } : m));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleAgentRun = async () => {
    if (!agentInput.trim() || isAgentRunning) return;
    setIsAgentRunning(true);
    setAgentResult(null);

    try {
      const token = localStorage.getItem('token');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL}/ai/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ documentId: document.id, message: agentInput })
      });

      const data = await response.json();
      if (data.success) {
        setAgentResult(data);
      } else {
        setAgentResult({ toolsUsed: [], error: data.message });
      }
    } catch (err: any) {
      setAgentResult({ toolsUsed: [], error: err.message });
    } finally {
      setIsAgentRunning(false);
    }
  };

  if (loading) return <div className="p-24">Loading document details...</div>;

  if (error) {
    return (
      <div className="p-24 flex flex-col gap-4">
        <p className="text-red-500">{error}</p>
        <Link href="/dashboard" className="text-blue-500 hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col p-4 sm:p-8 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-4xl w-full mx-auto flex flex-col h-[90vh]">
        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline mb-4 shrink-0">
          &larr; Back to Dashboard
        </Link>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-4 shrink-0 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{document.name}</h1>
            <p className="text-sm text-gray-500 mt-1">Status: <span className={document.status === 'READY' ? 'text-green-500' : 'text-yellow-500'}>{document.status}</span></p>
          </div>
          
          <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button 
              onClick={() => setMode('chat')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'chat' ? 'bg-white dark:bg-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              Chat
            </button>
            <button 
              onClick={() => setMode('agent')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'agent' ? 'bg-white dark:bg-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              Agent
            </button>
          </div>
        </div>

        {mode === 'chat' && (
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-5 py-4 ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none'}`}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Sources:</p>
                        <div className="flex flex-wrap gap-2">
                          {msg.sources.map((s, idx) => (
                            <span key={idx} className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded-md">
                              Chunk #{s.chunkIndex} ({s.score.toFixed(2)})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isStreaming && messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1].content && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl px-5 py-4 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none">
                    <div className="flex gap-1 items-center h-4">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question about this document..."
                  className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={isStreaming || document.status !== 'READY'}
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={isStreaming || !input.trim() || document.status !== 'READY'}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {mode === 'agent' && (
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 shrink-0">
              <h2 className="text-lg font-bold mb-2">Agent Mode</h2>
              <p className="text-sm text-gray-500 mb-4">Give the agent a complex multi-step instruction, like "Summarize this document and create a 5-question quiz".</p>
              
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={agentInput}
                  onChange={(e) => setAgentInput(e.target.value)}
                  placeholder="E.g., Summarize and create a quiz..."
                  className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleAgentRun()}
                  disabled={isAgentRunning || document.status !== 'READY'}
                />
                <button 
                  onClick={handleAgentRun}
                  disabled={isAgentRunning || !agentInput.trim() || document.status !== 'READY'}
                  className="px-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {isAgentRunning ? 'Agent Running...' : 'Run Agent'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pb-12">
              {agentResult && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                  {agentResult.error && (
                    <div className="text-red-500 font-medium p-4 bg-red-50 dark:bg-red-900/20 rounded-lg mb-4">
                      Error: {agentResult.error}
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Tools Used</h3>
                    <div className="flex flex-wrap gap-2">
                      {agentResult.toolsUsed && agentResult.toolsUsed.length > 0 ? (
                        agentResult.toolsUsed.map((t, idx) => (
                          <span key={idx} className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium border border-purple-200 dark:border-purple-800">
                            ✓ {t}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-400">No tools used</span>
                      )}
                    </div>
                  </div>

                  {agentResult.answer && (
                    <div className="mb-6">
                      <h3 className="text-lg font-bold mb-2">Agent Answer</h3>
                      <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                        {agentResult.answer}
                      </p>
                    </div>
                  )}

                  {agentResult.summary && (
                    <div className="mb-6">
                      <h3 className="text-lg font-bold mb-2">Summary generated</h3>
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-5 rounded-lg">
                        <p className="mb-4">{agentResult.summary.summary}</p>
                        <h4 className="font-semibold mb-2">Key Points:</h4>
                        <ul className="list-disc pl-5 space-y-1">
                          {agentResult.summary.keyPoints?.map((kp, i) => (
                            <li key={i}>{kp}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {agentResult.quiz && (
                    <div className="mb-6">
                      <h3 className="text-lg font-bold mb-2">Quiz generated</h3>
                      <div className="space-y-4">
                        {agentResult.quiz.questions?.map((q, i) => (
                          <div key={i} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-5 rounded-lg">
                            <p className="font-medium mb-3">{i + 1}. {q.question}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                              {q.options?.map((opt, oIdx) => (
                                <div key={oIdx} className={`p-2 rounded border text-sm ${opt === q.correctAnswer ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`}>
                                  {opt}
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-gray-500 italic mt-2">Explanation: {q.explanation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
