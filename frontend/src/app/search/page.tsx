"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface SavedKeyword {
  id: number;
  name: string;
  url: string;
}

export default function SearchPage() {
  const [keyword, setKeyword] = useState("");
  const [savedKeywords, setSavedKeywords] = useState<SavedKeyword[]>([]);
  const [loading, setLoading] = useState(false);

  const API_BASE = "https://api-tracker.go-pro-world.net";

  // 保存済みキーワード（search:// 形式）のみを取得
  const fetchSavedKeywords = async () => {
    try {
      const response = await fetch(`${API_BASE}/products`);
      if (!response.ok) return;
      const data = await response.json();
      // urlが search:// で始まるものを抽出
      const keywords = data.filter((item: any) => item.url.startsWith("search://"));
      setSavedKeywords(keywords);
    } catch (error) {
      console.error("キーワード取得エラー:", error);
    }
  };

  useEffect(() => {
    fetchSavedKeywords();
  }, []);

  // 検索ボタンクリック ＝ スクレイピング ＆ DB保存 実行
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
      alert("エラーが発生しました。バックエンドの稼働状況を確認してください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black group-hover:rotate-12 transition-transform">P</div>
            <span className="text-xl font-black tracking-tighter text-slate-800">PRICE TRACKER</span>
          </Link>
          <nav className="flex gap-6 text-xs font-black uppercase tracking-widest">
            <Link href="/" className="text-slate-400 hover:text-indigo-600 transition-colors">Individual</Link>
            <Link href="/search" className="text-indigo-600 border-b-2 border-indigo-600 pb-1">Keyword</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12">
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-3">市場動向を監視</h1>
          <p className="text-slate-500 font-medium">キーワードを登録すると、Playwrightが背後で稼働し、商品を自動でデータベースに蓄積します。</p>
        </div>

        {/* 検索フォーム */}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-16 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="例: アシックス DSライト 27.5"
            className="flex-1 px-5 py-4 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-bold transition-all outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white px-10 py-4 rounded-xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:bg-slate-300 transition-all flex items-center justify-center gap-3 active:scale-95"
          >
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                SCRAPING...
              </>
            ) : (
              "検索・DB保存"
            )}
          </button>
        </form>

        {/* 監視リスト */}
        <div>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
              <span className="w-8 h-[2px] bg-indigo-600"></span>
              Monitoring List
            </h2>
            <span className="text-[10px] font-black bg-slate-200 text-slate-600 px-2 py-1 rounded">
              {savedKeywords.length} CONDITIONS
            </span>
          </div>
          
          {savedKeywords.length === 0 && !loading && (
            <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-bold">監視中のキーワードはありません。</p>
              <p className="text-slate-300 text-sm mt-1">上のフォームから最初の条件を登録しましょう。</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedKeywords.map((kw) => {
              const displayKeyword = kw.url.replace("search://", "");
              return (
                <Link 
                  key={kw.id} 
                  // 【重要修正】ダイナミックルートではなくクエリパラメータ形式に変更
                  href={`/search/results?keyword=${encodeURIComponent(displayKeyword)}`}
                  className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-500 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center"
                >
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 mr-5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1 group-hover:text-indigo-300">Keyword</p>
                    <p className="font-black text-slate-800 text-lg leading-tight truncate">
                      {displayKeyword}
                    </p>
                  </div>
                  <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-10 mt-auto">
        <div className="max-w-5xl mx-auto px-6 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
          Price Tracker System — Specialized Engine
        </div>
      </footer>
    </div>
  );
}
