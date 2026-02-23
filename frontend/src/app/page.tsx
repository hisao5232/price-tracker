"use client";
import { useState, useEffect } from "react";

interface Product {
  id: number;
  item_id: string;
  name: string;
  url: string;
  image_url: string;
  current_price?: number; // 最新価格を表示するためのフィールド
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  const handleTrack = async () => {
    if (!url) return;
    setLoading(true);
    
    // URLクレンジング（ゴミを除去）
    const urlMatch = url.match(/https:\/\/jp\.mercari\.com\/item\/m\d+/);
    const cleanUrl = urlMatch ? urlMatch[0] : url;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/track?url=${encodeURIComponent(cleanUrl)}`, {
        method: 'POST',
      });
      if (res.ok) {
        setUrl("");
        await fetchProducts();
      } else {
        alert("追跡に失敗しました。正しいURLを入力してください。");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans">
      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">P</div>
            <span className="text-xl font-extrabold tracking-tight text-slate-800">
              tracker <span className="text-indigo-600">search</span>
            </span>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-500">
            <a href="#" className="hover:text-indigo-600 transition-colors">Dashboard</a>
            <a href="https://github.com/hisao5232" target="_blank" className="hover:text-indigo-600 transition-colors">GitHub</a>
          </nav>
        </div>
      </header>

      <main className="flex-grow max-w-5xl mx-auto w-full px-6 py-12">
        {/* メイン入力セクション */}
        <section className="text-center mb-16">
          <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">
            スマートに価格を追跡。
          </h2>
          <p className="text-slate-500 mb-10 max-w-lg mx-auto">
            メルカリのURLを貼り付けるだけで、価格の変動を自動で記録します。
          </p>

          <div className="relative max-w-2xl mx-auto group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative flex flex-col md:flex-row gap-3 p-2 bg-white rounded-2xl shadow-xl border border-slate-200">
              <input
                type="text"
                className="flex-1 px-6 py-4 outline-none text-slate-950 font-medium placeholder:text-slate-400 text-lg bg-transparent"
                placeholder="https://jp.mercari.com/item/m..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <button 
                onClick={handleTrack}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-10 py-4 rounded-xl transition-all font-bold shadow-lg shadow-indigo-200 active:scale-95 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                ) : null}
                {loading ? "解析中..." : "追跡を開始"}
              </button>
            </div>
          </div>
        </section>

        {/* リストセクション */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              追跡中のアイテム
              <span className="bg-slate-200 text-slate-600 text-xs py-1 px-2.5 rounded-full font-bold">
                {products.length}
              </span>
            </h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.length === 0 ? (
              <div className="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                <p className="text-lg">まだ追跡している商品がありません</p>
              </div>
            ) : (
              products.map((product) => (
                <div key={product.id} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                  <div className="aspect-square bg-slate-100 relative overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 italic">No Image</div>
                    )}
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full shadow-sm">
                      <p className="text-sm font-black text-indigo-600">
                        {/* 仮に値段が未取得の場合は"---"を表示 */}
                        ¥ {product.current_price?.toLocaleString() || "価格取得中"}
                      </p>
                    </div>
                  </div>
                  <div className="p-5">
                    <h4 className="font-bold text-slate-900 leading-tight mb-2 line-clamp-2 min-h-[3rem]">
                      {product.name}
                    </h4>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {product.item_id}</span>
                      <a 
                        href={product.url} 
                        target="_blank" 
                        className="text-xs font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1"
                      >
                        VIEW ITEM
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* フッター */}
      <footer className="bg-white border-t border-slate-200 py-10">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 text-sm font-medium">
            Go-into-PG-world since 2025
          </p>
          <div className="flex gap-8 text-slate-400 text-sm">
            <span className="hover:text-indigo-600 cursor-default">Python / FastAPI</span>
            <span className="hover:text-indigo-600 cursor-default">Next.js / Tailwind v4</span>
            <span className="hover:text-indigo-600 cursor-default">PostgreSQL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
