'use client';

import { useState } from 'react';

export default function Home() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResult('数据查询中，AI 正在分析与执行 SQL...');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();
      
      if (data.data && data.data.outputs) {
        setResult(JSON.stringify(data.data.outputs, null, 2));
      } else {
        setResult('返回格式解析失败，原始数据：\n' + JSON.stringify(data, null, 2));
      }
    } catch (err) {
      setResult('请求出错，请检查网络或控制台。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8 flex flex-col items-center justify-center font-sans">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-4xl font-bold text-blue-400 border-b border-blue-500/30 pb-4">
            DataLens Agent
          </h1>
          <p className="text-gray-400">大模型反思机制加持的 Text2SQL 终端</p>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入自然语言，例如：查一下注册时间..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors shadow-inner text-white placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white px-8 py-3 rounded-lg font-medium transition-colors shadow-lg"
          >
            {loading ? '执行中...' : '发送查询'}
          </button>
        </form>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 min-h-[300px] overflow-auto shadow-xl">
          <h3 className="text-gray-400 text-sm font-semibold mb-3 tracking-wider uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            执行结果 (JSON)
          </h3>
          <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
            {result || '// 等待指令输入...'}
          </pre>
        </div>
      </div>
    </div>
  );
}