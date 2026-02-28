"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";

interface SavedKeyword {
  id: number;
  name: string;
  url: string;
}

export default function SearchPage() {
  const [keyword, setKeyword] = useState("");
  const [savedKeywords, setSavedKeywords] = useState<SavedKeyword[]>([]);
  const [loading, setLoading] = useState(false);

  // Homeと同様に環境変数から取得
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api-tracker.go-pro-world.net";

  const fetchSavedKeywords = async () => {
    try {
      const response = await fetch(`${API_BASE}/products`);
      if (!response.ok) return;
      const data = await response.json();
      // urlが "search://" で始まるキーワードのみを表示
      const keywords = data.filter((item: any) => item.url.startsWith("search://"));
      setSavedKeywords(keywords);
    } catch (error) {
      console.error("キーワード取得エラー:", error);
    }
  };

  useEffect(() => {
    fetchSavedKeywords();
  }, []);

  const handleDelete = async (e: React.MouseEvent, kwText: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`「${kwText}」の監視データをすべて削除しますか？`)) return;

    try {
      const response = await fetch(`${API_BASE}/products/search-results?keyword=${encodeURIComponent(kwText)}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await fetchSavedKeywords();
      } else {
        alert("削除に失敗しました。");
      }
    } catch (error) {
      console.error("削除エラー:", error);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/track-keyword?keyword=${encodeURIComponent(keyword)}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error("Search and Save failed");
      const data = await response.json();
      setKeyword("");
      await fetchSavedKeywords();
      alert(`「${data.keyword}」のデータをDBに保存しました！\n取得件数: ${data.items_count}件`);
    } catch (error) {
      console.error("検索・保存エラー:", error);
      alert("エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans">
      <Header />

      <main className="flex-grow max-w-5xl mx-auto w-full px-6 py-12">
        {/* ヒーローセクション */}
        <section className="text-center mb-16">
          <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">市場動向を監視。</h2>
          <p className="text-slate-500 mb-10 max-w-2xl mx-auto font-medium">
            キーワードを登録すると、Playwrightが背後で稼働し、<br className="hidden md:block" />
            商品を自動でデータベースに蓄積します。
          </p>

          <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-2xl blur opacity-25"></div>
            <div className="relative flex flex-col md:flex-row gap-3 p-2 bg-white rounded-2xl shadow-xl border border-slate-200">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="例: アシックス DSライト 27.5"
                className="flex-1 px-6 py-4 outline-none text-slate-950 font-medium placeholder:text-slate-400 text-lg bg-transparent"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-10 py-4 rounded-xl transition-all font-bold shadow-lg shadow-indigo-200"
              >
                {loading ? "解析中..." : "監視を開始"}
              </button>
            </div>
          </form>
        </section>

        {/* 監視リスト */}
        <section className="space-y-6">
          <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            監視中のキーワード
            <span className="bg-slate-200 text-slate-600 text-xs py-1 px-2.5 rounded-full font-bold">
              {savedKeywords.length}
            </span>
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedKeywords.map((kw) => {
              const displayKeyword = kw.url.replace("search://", "");
              return (
                <div key={kw.id} className="relative group">
                  {/* 削除ボタン */}
                  <button
                    onClick={(e) => handleDelete(e, displayKeyword)}
                    className="absolute top-3 left-3 z-20 bg-white/90 backdrop-blur p-2 rounded-full shadow-sm text-slate-400 hover:text-red-500 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 border border-slate-100"
                    title="監視解除"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>

                  <Link 
                    href={`/search/results?keyword=${encodeURIComponent(displayKeyword)}`}
                    className="flex items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-500 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-32 overflow-hidden"
                  >
                    <div className="w-12 h-12 shrink-0 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 mr-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.1em] mb-1 group-hover:text-indigo-300 transition-colors">Monitoring Keyword</p>
                      <p className="font-bold text-slate-800 leading-tight break-words text-lg line-clamp-2">
                        {displayKeyword}
                      </p>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-slate-200 py-12 mt-12">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-slate-400 text-sm font-medium mb-3">Go-into-PG-world since 2025</p>
          <div className="flex justify-center gap-6 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
            <span className="hover:text-indigo-400 transition-colors">Python</span>
            <span className="hover:text-indigo-400 transition-colors">Next.js</span>
            <span className="hover:text-indigo-400 transition-colors">PostgreSQL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
