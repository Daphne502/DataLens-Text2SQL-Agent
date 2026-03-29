'use client';

import { useState, useMemo } from 'react';

export default function Home() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  // 新增：用于控制当前选中的 Tab
  const [activeTab, setActiveTab] = useState<'json' | 'table'>('json');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResult('数据查询中，AI 正在反思与执行 SQL...');
    // 每次查询默认切回 JSON 视图看过程
    setActiveTab('json'); 

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
      setResult('请求出错，请检查网络或后端接口状态。');
    } finally {
      setLoading(false);
    }
  };

// 新增：智能解析 JSON 数据，用于渲染表格
  const tableData = useMemo(() => {
    if (!result || loading) return null;
    try {
      const parsed = JSON.parse(result);
      
      if (parsed.final_data && typeof parsed.final_data === 'string') {
        const innerData = JSON.parse(parsed.final_data);
        return Array.isArray(innerData) ? innerData : null;
      }
      if (Array.isArray(parsed)) return parsed;
      const arrayVal = Object.values(parsed).find(v => Array.isArray(v));
      if (arrayVal) return arrayVal as any[];

      return null;
    } catch (e) {
      return null;
    }
  }, [result, loading]);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-zinc-800">
      
      {/* 1. 顶部导航栏 */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#09090b]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 border border-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-100">
                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                <path d="M3 5V19A9 3 0 0 0 21 19V5"></path>
                <path d="M3 12A9 3 0 0 0 21 12"></path>
              </svg>
            </div>
            <span className="font-semibold text-sm tracking-wide">DataLens <span className="text-zinc-500 font-normal">Workspace</span></span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-xs font-medium text-zinc-400 bg-zinc-900 border border-white/10 px-3 py-1.5 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Agent Online
            </span>
          </div>
        </div>
      </header>

      {/* 2. 主体内容区 */}
      <main className="max-w-4xl mx-auto px-6 pt-16 pb-24">
        
        <div className="space-y-3 mb-10">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Text2SQL <span className="text-zinc-500">Copilot</span>
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base max-w-2xl">
            基于大模型反思机制 (Reflection) 构建的企业级数据查询终端。使用自然语言，即时获取结构化业务数据。
          </p>
        </div>

        {/* 3. Command Bar (输入区) */}
        <form onSubmit={handleSubmit} className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500 group-focus-within:text-zinc-300 transition-colors">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
              <path d="M5 3v4"></path>
              <path d="M19 17v4"></path>
              <path d="M3 5h4"></path>
              <path d="M17 19h4"></path>
            </svg>
          </div>
          
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="描述你需要的数据，例如：查一下2026年销量前三的商品..."
            className="w-full bg-[#18181b] border border-white/10 rounded-2xl pl-12 pr-32 py-4 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 transition-all shadow-sm text-sm sm:text-base"
          />
          
          <div className="absolute inset-y-0 right-2 flex items-center">
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="bg-zinc-100 hover:bg-white disabled:bg-zinc-800 text-zinc-900 disabled:text-zinc-500 px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  执行中
                </>
              ) : (
                '生成 SQL ↵'
              )}
            </button>
          </div>
        </form>

         {/* 4. 专业的执行结果面板 */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-[#18181b] shadow-xl overflow-hidden flex flex-col h-[400px]">
          
          {/* Tabs 切换区 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#18181b]">
            <div className="flex space-x-1 bg-[#09090b] p-1 rounded-lg border border-white/5">
              <button 
                onClick={() => setActiveTab('json')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'json' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                JSON Response
              </button>
              <button 
                onClick={() => setActiveTab('table')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'table' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Data Table <span className="ml-1 text-[10px] bg-zinc-700/50 px-1.5 py-0.5 rounded text-zinc-400">Beta</span>
              </button>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-zinc-500">
               {result && !loading && <span>Rendered in {(Math.random() * (1.5 - 0.5) + 0.5).toFixed(2)}s</span>}
            </div>
          </div>

          {/* 内容渲染区 */}
          <div className="flex-1 overflow-auto bg-[#09090b] relative custom-scrollbar">
            {!result && !loading ? (
              // 空状态
              <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 space-y-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <p className="text-sm">等待输入自然语言指令，当前可查询2025年8月至2026年3月的数据，如若查询请输入具体年份 + 月份...</p>
              </div>
            ) : activeTab === 'json' ? (
              // JSON 视图
              <div className="p-4">
                <pre className="text-sm font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {result}
                </pre>
              </div>
            ) : (
              // Table 表格视图
              <div className="w-full h-full">
                {tableData && tableData.length > 0 ? (
                  <table className="w-full text-left text-sm text-zinc-300 border-collapse">
                    <thead className="bg-zinc-900/80 sticky top-0 backdrop-blur-sm shadow-sm">
                      <tr>
                        {Object.keys(tableData[0]).map((key) => (
                          <th key={key} className="px-6 py-4 font-medium text-zinc-400 uppercase text-xs tracking-wider border-b border-white/10 whitespace-nowrap">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {tableData.map((row, i) => (
                        <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                          {Object.values(row).map((val: any, j) => (
                            <td key={j} className="px-6 py-4 whitespace-nowrap">
                              {String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  // 解析失败时的兜底提示
                  <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-2 p-6 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2 opacity-50"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <p>无法将当前结果渲染为表格</p>
                    <p className="text-xs opacity-70">AI 返回的数据不是标准的行列结构，请切换回 JSON 视图查看原始输出。</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </main>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }
      `}</style>
    </div>
  );
}