"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SavedKeyword {
  id: number;
  name: string;
  url: string;
}

export default function SearchPage() {
  const [keyword, setKeyword] = useState("");
  const [savedKeywords, setSavedKeywords] = useState<SavedKeyword[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const API_BASE = "https://api-tracker.go-pro-world.net";

  // 保存済みキーワード（search:// 形式）のみを取得
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

  // 検索ボタンクリック ＝ スクレイピング ＆ DB保存 実行
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    try {
      // バックエンドの track-keyword エンドポイントを叩く
      // これにより Playwright が走り、商品が DB に一気に保存される
      const response = await fetch(`${API_BASE}/track-keyword?keyword=${encodeURIComponent(keyword)}`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error("Search and Save failed");
      
      const data = await response.json();
      console.log("Scrape success:", data);

      // 入力欄をクリアしてリストを更新
      setKeyword("");
      await fetchSavedKeywords();
      
      alert(`「${data.keyword}」の検索・保存が完了しました！(${data.items_count}件の商品)`);
    } catch (error) {
      console.error("検索・保存エラー:", error);
      alert("エラーが発生しました。バックエンドのログを確認してください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">P</div>
            <span className="text-xl font-extrabold tracking-tight text-slate-800">Price Tracker</span>
          </Link>
          <nav className="flex gap-6 text-sm font-bold">
            <Link href="/" className="text-slate-500 hover:text-indigo-600 pb-1 transition-colors">tracker</Link>
            <Link href="/search" className="text-indigo-600 border-b-2 border-indigo-600 pb-1">search</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">新規条件を登録</h1>
          <p className="text-slate-500 text-sm">キーワードを入力して検索すると、Playwrightが自動で100件以上の商品をDBに保存します。</p>
        </div>

        {/* 検索フォーム */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-12">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="例: アシックス DSライト 27.5"
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 transition-all"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-indigo-700 disabled:bg-slate-300 transition-all flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                収集中...
              </>
            ) : "検索・保存"}
          </button>
        </form>

        {/* 保存済みセクション (ここから商品一覧へ飛ぶ) */}
        <div>
          <h2 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
            <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
            監視中の検索条件
          </h2>
          
          {savedKeywords.length === 0 && !loading && (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
              <p className="text-slate-400 font-medium">保存された条件はまだありません。</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedKeywords.map((kw) => {
              const displayKeyword = kw.url.replace("search://", "");
              return (
                <Link 
                  key={kw.id} 
                  href={`/search/${encodeURIComponent(displayKeyword)}`}
                  className="group relative flex items-center p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-500 hover:shadow-lg transition-all text-left"
                >
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mr-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Search Keyword</p>
                    <p className="font-bold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors leading-tight">
                      {displayKeyword}
                    </p>
                  </div>
                  <div className="text-slate-300 group-hover:text-indigo-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-10 mt-auto">
        <div className="max-w-5xl mx-auto px-6 text-center text-slate-400 text-sm font-medium">
          © 2026 Price Tracker - Specialized in Soccer Boots Repair
        </div>
      </footer>
    </div>
  );
}
