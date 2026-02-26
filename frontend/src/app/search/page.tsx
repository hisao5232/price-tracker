"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface SearchResult {
  id: string;
  name: string;
  price: number;
  url: string;
  image_url: string;
}

// 保存済みキーワード用の型
interface SavedKeyword {
  id: number;
  name: string;
  url: string;
}

export default function SearchPage() {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [savedKeywords, setSavedKeywords] = useState<SavedKeyword[]>([]); // 追加
  const [loading, setLoading] = useState(false);

  const API_BASE = "https://api-tracker.go-pro-world.net";

  // 保存済みキーワードを取得する
  const fetchSavedKeywords = async () => {
    try {
      const response = await fetch(`${API_BASE}/products`); // 既存の全取得APIを利用
      if (!response.ok) return;
      const data = await response.json();
      // search:// で始まるものだけを抽出
      const keywords = data.filter((item: any) => item.url.startsWith("search://"));
      setSavedKeywords(keywords);
    } catch (error) {
      console.error("キーワード取得エラー:", error);
    }
  };

  useEffect(() => {
    fetchSavedKeywords();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/search?keyword=${encodeURIComponent(keyword)}`);
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error("検索エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  // 条件を保存する関数
  const handleSaveKeyword = async () => {
    if (!keyword.trim()) return;
    try {
      const response = await fetch(`${API_BASE}/track-keyword?keyword=${encodeURIComponent(keyword)}`, {
        method: 'POST',
      });
      if (response.ok) {
        alert(`「${keyword}」を保存しました`);
        fetchSavedKeywords(); // リストを更新
      }
    } catch (error) {
      console.error("保存エラー:", error);
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
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">商品を検索</h1>
            <p className="text-slate-500 text-sm">メルカリから新しいアイテムを探す、または保存した条件からチェックします。</p>
          </div>
        </div>

        {/* 検索フォーム */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-10">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="例: DS LIGHT X-FLY PRO 2"
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 transition-all"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-indigo-700 disabled:bg-slate-300 transition-all"
          >
            {loading ? "検索中..." : "検索"}
          </button>
          
          {/* 保存ボタン */}
          {keyword && !loading && (
            <button
              type="button"
              onClick={handleSaveKeyword}
              className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-emerald-600 transition-all flex items-center gap-2"
            >
              条件を保存
            </button>
          )}
        </form>

        {/* 検索実行中の表示 */}
        {loading && (
          <div className="text-center py-20">
            <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-500 font-medium">最新の情報をメルカリから取得中...</p>
          </div>
        )}

        {/* 検索結果がある場合 */}
        {!loading && results.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((item) => (
              <Link 
                key={item.id} 
                href={`/search/${item.id}?url=${encodeURIComponent(item.url)}`}
                className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden"
              >
                <div className="aspect-square relative overflow-hidden bg-slate-100">
                  <img src={item.image_url} alt={item.name} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute bottom-2 left-2">
                    <span className="bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-sm font-bold">
                      ¥{item.price.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-slate-800 text-sm line-clamp-2 min-h-[40px]">{item.name}</h3>
                  <div className="mt-4 flex items-center justify-between text-xs text-indigo-600 font-bold uppercase tracking-wider">
                    <span>詳細を見る</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* 検索結果がなく、保存済みキーワードがある場合 */}
        {!loading && results.length === 0 && savedKeywords.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
              保存済みの検索条件
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedKeywords.map((kw) => (
                <button
                  key={kw.id}
                  onClick={() => {
                    const searchWord = kw.url.replace("search://", "");
                    setKeyword(searchWord);
                    // ここで自動検索を発火させるロジックも追加可能
                  }}
                  className="flex items-center p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group"
                >
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mr-4 group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Keyword</p>
                    <p className="font-bold text-slate-700">{kw.url.replace("search://", "")}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-10">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-slate-400 text-sm font-medium">
            © 2026 Price Tracker - Soccer Boots Repair Engineer Side Project
          </p>
        </div>
      </footer>
    </div>
  );
}
