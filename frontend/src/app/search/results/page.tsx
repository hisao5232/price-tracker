"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Product {
  id: number;
  name: string;
  url: string;
  image_url: string;
  price: number;
  created_at: string;
}

// クエリパラメータを読み取って表示するメインコンポーネント
function SearchResultsContent() {
  const searchParams = useSearchParams();
  // URLの ?keyword=xxx を取得
  const keyword = searchParams.get("keyword") || "";
  
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const API_BASE = "https://api-tracker.go-pro-world.net";

  useEffect(() => {
    const fetchKeywordItems = async () => {
      if (!keyword) return;
      
      try {
        setLoading(true);
        // バックエンドのDB検索用エンドポイント
        const res = await fetch(`${API_BASE}/products/search-results?keyword=${encodeURIComponent(keyword)}`);
        if (res.ok) {
          const data = await res.json();
          setItems(data);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchKeywordItems();
  }, [keyword]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/search" className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors font-bold text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            検索一覧に戻る
          </Link>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
              Database Mode
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-indigo-600 font-black text-xs uppercase tracking-widest mb-1">Search Results</p>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
              {keyword || "キーワードなし"}
            </h1>
            <p className="text-slate-500 font-medium">
              保存済みの商品から {items.length} 件見つかりました。
            </p>
          </div>
          {items.length > 0 && (
            <div className="text-sm text-slate-400 font-bold bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
              データ取得日: {new Date(items[0].created_at).toLocaleDateString()}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="animate-spin h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full mb-4"></div>
            <p className="text-slate-400 font-bold tracking-tight">DBから高速抽出中...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-slate-500 font-bold text-lg">まだDBに商品がありません</p>
            <p className="text-slate-400 text-sm mt-1">「検索・保存」ボタンを押してPlaywrightを実行してください。</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {items.map((item) => (
              <a 
                key={item.id} 
                href={item.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 shadow-sm"
              >
                <div className="aspect-square relative overflow-hidden bg-slate-100">
                  <img 
                    src={item.image_url} 
                    alt={item.name} 
                    className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500" 
                  />
                  <div className="absolute bottom-2 left-2">
                    <div className="bg-black/70 backdrop-blur px-2 py-1 rounded-lg text-white font-black text-sm">
                      ¥{item.price.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-slate-800 text-xs line-clamp-2 h-8 mb-2 leading-relaxed group-hover:text-indigo-600 transition-colors">
                    {item.name}
                  </h3>
                  <div className="pt-2 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                    <span>Mercari Site</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-10">
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
          Powered by Price Tracker Engine v4
        </div>
      </footer>
    </div>
  );
}

// 静的エクスポート(output: export)で必須のSuspenseラッパー
export default function KeywordDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse font-black text-slate-300 uppercase tracking-widest">Initializing...</div>
      </div>
    }>
      <SearchResultsContent />
    </Suspense>
  );
}
