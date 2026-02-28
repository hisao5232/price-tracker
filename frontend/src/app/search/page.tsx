"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from 'next/navigation';

interface SavedKeyword {
  id: number;
  name: string;
  url: string;
}

export default function SearchPage() {
  const [keyword, setKeyword] = useState("");
  const [savedKeywords, setSavedKeywords] = useState<SavedKeyword[]>([]);
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();

  const API_BASE = "https://api-tracker.go-pro-world.net";

  const fetchSavedKeywords = async () => {
    try {
      const response = await fetch(`${API_BASE}/products`);
      if (!response.ok) return;
      const data = await response.json();
      const keywords = data.filter((item: any) => item.url.startsWith("search://"));
      setSavedKeywords(keywords);
    } catch (error) {
      console.error("キーワード取得エラー:", error);
    }
  };

  useEffect(() => {
    fetchSavedKeywords();
  }, []);

  // --- 追加: キーワード削除処理 ---
  const handleDelete = async (e: React.MouseEvent, kwText: string) => {
    e.preventDefault(); // 親要素のLinkへの遷移を防止
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold group-hover:bg-indigo-700 transition-colors">P</div>
              <span className="text-xl font-extrabold tracking-tight text-slate-800">Price Tracker</span>
            </Link>
            {/* --- ver 1.0.0 追加 --- */}
            <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded font-bold border border-slate-200">v1.0.0</span>
          </div>
          <nav className="flex gap-6 text-sm font-bold">
            <Link
              href="/"
              className={`${pathname === '/' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-600'} pb-1 transition-colors`}
            >
              tracker
            </Link>
            <Link
              href="/search"
              className={`${pathname === '/search' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-600'} pb-1 transition-colors`}
            >
              search
            </Link>
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
            {loading ? "SCRAPING..." : "検索・DB保存"}
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedKeywords.map((kw) => {
              const displayKeyword = kw.url.replace("search://", "");
              return (
                <div key={kw.id} className="relative group">
                  {/* 削除ボタン - 右上に配置 */}
                  <button
                    onClick={(e) => handleDelete(e, displayKeyword)}
                    className="absolute -top-2 -right-2 z-20 bg-white text-slate-400 hover:text-red-500 w-8 h-8 rounded-full border border-slate-200 shadow-sm flex items-center justify-center transition-all hover:shadow-md hover:scale-110 opacity-0 group-hover:opacity-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>

                  <Link 
                    href={`/search/results?keyword=${encodeURIComponent(displayKeyword)}`}
                    className="flex items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-500 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-28 overflow-hidden"
                  >
                    <div className="w-10 h-10 shrink-0 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 mr-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5 group-hover:text-indigo-300 transition-colors">Keyword</p>
                      {/* 文字サイズ自動調整: text-[clamp(...)] を適用 */}
                      <p className="font-black text-slate-800 leading-tight break-words text-[clamp(0.85rem,1.1rem+0.2vw,1.25rem)] line-clamp-2">
                        {displayKeyword}
                      </p>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </main>
      {/* フッター部分は変更なし */}
    </div>
  );
}
