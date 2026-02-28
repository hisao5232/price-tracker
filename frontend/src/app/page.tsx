"use client";
import { useState, useEffect } from "react";
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Header from "@/components/Header";

interface Product {
  id: number;
  item_id: string;
  name: string;
  url: string;
  image_url: string;
  current_price?: number;
}

interface PricePoint {
  date: string;
  price: number;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // グラフモーダル用の状態
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [history, setHistory] = useState<PricePoint[]>([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`);
      if (res.ok) {
        const data = await res.json();
        // バックエンドが is_tracking == True のものを返してくるので、そのままセット
        setProducts(data);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  const handleTrack = async () => {
    if (!url) return;
    setLoading(true);
    const cleanUrl = url.split('?')[0]; 
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/track?url=${encodeURIComponent(cleanUrl)}`, {
        method: 'POST',
      });
      if (res.ok) {
        setUrl("");
        await fetchProducts();
      } else {
        alert("追跡に失敗しました。URLを確認してください。");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId: number, isKeyword: boolean, name: string) => {
    const message = isKeyword 
      ? `キーワード「${name}」と取得済みデータをすべて削除しますか？` 
      : `商品「${name}」の追跡を解除しますか？`;
      
    if (!confirm(message)) return;

    try {
      const endpoint = isKeyword 
        ? `${process.env.NEXT_PUBLIC_API_URL}/products/search-results?keyword=${encodeURIComponent(name)}`
        : `${process.env.NEXT_PUBLIC_API_URL}/products/${productId}`;

      const res = await fetch(endpoint, { method: 'DELETE' });
      if (res.ok) {
        await fetchProducts();
      } else {
        alert("削除に失敗しました。");
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const openHistory = async (product: Product) => {
    setSelectedProduct(product);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${product.id}/history`);
      if (res.ok) {
        const data = await res.json();
        const formattedData = data.map((d: any) => ({
          price: d.price,
          date: new Date(d.scraped_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit' })
        }));
        setHistory(formattedData);
      }
    } catch (err) {
      console.error("History fetch error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans">
      <Header />

      <main className="flex-grow max-w-5xl mx-auto w-full px-6 py-12">
        {/* ヒーローセクション */}
        <section className="text-center mb-16">
          <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">スマートに価格を追跡。</h2>
          <p className="text-slate-500 mb-10 max-w-lg mx-auto font-medium">商品のURLを貼り付けるだけで、価格の変動を自動で記録します。</p>
          
          <div className="relative max-w-2xl mx-auto group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-2xl blur opacity-25"></div>
            <div className="relative flex flex-col md:flex-row gap-3 p-2 bg-white rounded-2xl shadow-xl border border-slate-200">
              <input
                type="text"
                className="flex-1 px-6 py-4 outline-none text-slate-950 font-medium placeholder:text-slate-400 text-lg bg-transparent"
                placeholder="https://jp.mercari.com/item/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <button
                onClick={handleTrack}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-10 py-4 rounded-xl transition-all font-bold shadow-lg shadow-indigo-200"
              >
                {loading ? "解析中..." : "追跡を開始"}
              </button>
            </div>
          </div>
        </section>

        {/* 追跡リスト */}
        <section className="space-y-6">
          <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            追跡中のアイテム
            <span className="bg-slate-200 text-slate-600 text-xs py-1 px-2.5 rounded-full font-bold">{products.length}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              const isKeyword = product.url.startsWith("search://");
              
              return (
                <div key={product.id} className={`group relative rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col bg-white ${isKeyword ? 'border-indigo-100' : ''}`}>
                  
                  {/* 削除ボタン */}
                  <button 
                    onClick={() => handleDelete(product.id, isKeyword, product.name)}
                    className="absolute top-3 left-3 z-20 bg-white/90 backdrop-blur p-2 rounded-full shadow-sm text-slate-400 hover:text-red-500 hover:scale-110 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>

                  {isKeyword ? (
                    /* キーワードカードのデザイン */
                    <Link href={`/search/results?keyword=${encodeURIComponent(product.name)}`} className="flex-grow flex flex-col">
                      <div className="aspect-square bg-indigo-50 flex items-center justify-center relative">
                        <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center text-indigo-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <div className="absolute bottom-4 bg-indigo-600 text-white text-[10px] px-3 py-1 rounded-full font-black tracking-widest uppercase">Keyword Monitoring</div>
                      </div>
                      <div className="p-5 flex-grow bg-white border-t border-indigo-50">
                        <h4 className="font-bold text-slate-900 leading-tight mb-4 line-clamp-2 h-12">🔍 {product.name}</h4>
                        <div className="py-2.5 text-center bg-indigo-50 text-indigo-600 rounded-xl text-sm font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors">結果一覧を見る</div>
                      </div>
                    </Link>
                  ) : (
                    /* 通常の商品カードのデザイン */
                    <>
                      <div className="aspect-square bg-slate-100 relative overflow-hidden">
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur px-3 py-1.5 rounded-full shadow-sm border border-slate-100">
                          <p className="text-sm font-black text-indigo-600">¥ {product.current_price?.toLocaleString() || "---"}</p>
                        </div>
                      </div>
                      <div className="p-5 flex flex-col flex-grow">
                        <h4 className="font-bold text-slate-900 leading-tight mb-4 line-clamp-2 h-12">{product.name}</h4>
                        <div className="mt-auto space-y-3">
                          <button
                            onClick={() => openHistory(product)}
                            className="w-full py-2.5 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl text-sm font-bold transition-all border border-slate-100 hover:border-indigo-100"
                          >
                            価格推移を見る
                          </button>
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                            <span>ID: {product.item_id}</span>
                            <a href={product.url} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition-colors">OPEN LINK ↗</a>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* グラフモーダル */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="font-bold text-lg text-slate-800 truncate pr-8">{selectedProduct.name}</h3>
              <button onClick={() => setSelectedProduct(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors text-2xl">×</button>
            </div>
            <div className="p-8 h-80 w-full bg-white">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `¥${v.toLocaleString()}`} />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}
                    formatter={(val: any) => [`¥${Number(val).toLocaleString()}`, "価格"]}
                  />
                  <Line type="monotone" dataKey="price" stroke="#4f46e5" strokeWidth={4} dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="p-6 bg-slate-50 text-center border-t border-slate-100">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">データ取得数 : {history.length} 件</p>
            </div>
          </div>
        </div>
      )}

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
