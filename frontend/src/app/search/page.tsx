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

interface SavedKeyword {
  id: number;
  name: string;
  url: string;
}

export default function SearchPage() {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [savedKeywords, setSavedKeywords] = useState<SavedKeyword[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFullList, setShowFullList] = useState(false); // 一覧表示の切り替え用

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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    setShowFullList(false);
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

  const handleSaveKeyword = async () => {
    if (!keyword.trim()) return;
    try {
      const response = await fetch(`${API_BASE}/track-keyword?keyword=${encodeURIComponent(keyword)}`, {
        method: 'POST',
      });
      if (response.ok) {
        alert(`検索条件「${keyword}」をマイリストに保存しました。`);
        fetchSavedKeywords();
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">商品を検索</h1>
          <p className="text-slate-500 text-sm">メルカリの検索条件そのものを追跡対象として保存できます。</p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 mb-10">
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
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-indigo-700 disabled:bg-slate-300 transition-all"
          >
            {loading ? "検索中..." : "検索"}
          </button>
        </form>

        {loading && (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-inner">
            <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-500 font-medium">メルカリから最新の {keyword} を収集しています...</p>
          </div>
        )}

        {/* 検索結果カード（1枚のみ） */}
        {!loading && results.length > 0 && !showFullList && (
          <div className="flex justify-center py-4">
            <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-10 flex flex-col items-center text-white">
                <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-black mb-1">{keyword}</h2>
                <p className="opacity-80 font-medium">メルカリ検索条件カード</p>
              </div>
              <div className="p-8">
                <div className="flex justify-around mb-8 text-center">
                  <div>
                    <p className="text-2xl font-black text-slate-800">{results.length}</p>
                    <p className="text-xs text-slate-400 font-bold uppercase">出品数</p>
                  </div>
                  <div className="border-x border-slate-100 px-8">
                    <p className="text-2xl font-black text-emerald-500">¥{results[0].price.toLocaleString()}</p>
                    <p className="text-xs text-slate-400 font-bold uppercase">最新価格</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <button onClick={handleSaveKeyword} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2">
                    この条件を保存して監視する
                  </button>
                  <button onClick={() => setShowFullList(true)} className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all">
                    見つかった商品一覧を表示
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 商品一覧表示モード */}
        {!loading && showFullList && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">「{keyword}」の検索結果</h2>
              <button onClick={() => setShowFullList(false)} className="text-indigo-600 text-sm font-bold">カードに戻る</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((item) => (
                <Link key={item.id} href={`/search/${item.id}?url=${encodeURIComponent(item.url)}`} className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl transition-all overflow-hidden">
                  <div className="aspect-square relative overflow-hidden bg-slate-100">
                    <img src={item.image_url} alt={item.name} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute bottom-2 left-2">
                      <span className="bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-sm font-bold">¥{item.price.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-slate-800 text-sm line-clamp-2 min-h-[40px]">{item.name}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 保存済みセクション */}
        {!loading && results.length === 0 && savedKeywords.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
              保存済みの検索条件
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedKeywords.map((kw) => (
                <button key={kw.id} onClick={() => { setKeyword(kw.url.replace("search://", "")); }} className="flex items-center p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mr-4 group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Saved Search</p>
                    <p className="font-bold text-slate-700">{kw.url.replace("search://", "")}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
