"use client";

import { useState } from "react";
import Link from "next/link";

interface SearchResult {
  id: string; // メルカリの商品ID
  name: string;
  price: number;
  url: string;
  image_url: string;
}

export default function SearchPage() {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    try {
      // バックエンドのAPIを叩く（URLは環境に合わせて調整してください）
      const response = await fetch(`https://api-tracker.go-pro-world.net/search?keyword=${encodeURIComponent(keyword)}`);
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error("検索エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ヘッダー (トップページと共通のデザイン) */}
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

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">商品を検索</h1>
          <p className="text-slate-500 text-sm">メルカリから新しいアイテムを探して追跡を開始します。</p>
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
        </form>

        {/* 検索結果リスト */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((item) => (
            <Link 
              key={item.id} 
              href={`/search/${item.id}?url=${encodeURIComponent(item.url)}`}
              className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden"
            >
              <div className="aspect-square relative overflow-hidden bg-slate-100">
                <img 
                  src={item.image_url} 
                  alt={item.name} 
                  className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute bottom-2 left-2">
                  <span className="bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-sm font-bold">
                    ¥{item.price.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-slate-800 text-sm line-clamp-2 min-h-[40px]">
                  {item.name}
                </h3>
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

        {/* 結果が空の時 */}
        {!loading && results.length === 0 && keyword && (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
            <p className="text-slate-400 font-medium">該当する商品が見つかりませんでした。</p>
          </div>
        )}
      </main>

      {/* フッター (トップページと共通) */}
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
