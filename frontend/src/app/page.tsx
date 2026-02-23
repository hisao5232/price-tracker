"use client";
import { useState, useEffect } from "react";

interface Product {
  id: number;
  item_id: string;
  name: string;
  url: string;
  image_url: string;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // 初回読み込み時に追跡リストを取得
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
      console.error("リストの取得に失敗しました", err);
    }
  };

  const handleTrack = async () => {
    if (!url) return;
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/track?url=${encodeURIComponent(url)}`, {
        method: 'POST',
      });
      if (res.ok) {
        setUrl(""); // 入力欄をクリア
        await fetchProducts(); // リストを更新
      } else {
        alert("追跡に失敗しました。URLを確認してください。");
      }
    } catch (err) {
      console.error("エラーが発生しました", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="text-center">
          <h1 className="text-4xl font-bold text-blue-600 tracking-tight">Price Tracker</h1>
          <p className="text-gray-500 mt-2">商品のURLを入力して価格追跡を開始します</p>
        </header>

        {/* 追跡URL入力セクション */}
        <div className="flex flex-col sm:flex-row gap-3 p-3 bg-white rounded-2xl shadow-sm border border-gray-200">
          <input
            type="text"
            className="flex-1 px-4 py-3 outline-none bg-transparent"
            placeholder="商品のURLを貼り付け (https://jp.mercari.com/item/...)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button 
            onClick={handleTrack}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-8 py-3 rounded-xl transition-all font-semibold whitespace-nowrap"
          >
            {loading ? "スクレイピング中..." : "追跡を開始"}
          </button>
        </div>

        {/* 追跡リスト表示セクション */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
            追跡中のリスト
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.length === 0 ? (
              <p className="text-gray-400 py-10 text-center col-span-full">追跡中の商品はまだありません。</p>
            ) : (
              products.map((product) => (
                <div key={product.id} className="flex gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-blue-200 transition-colors">
                  <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Image</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                    <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">ID: {product.item_id}</p>
                    <a 
                      href={product.url} 
                      target="_blank" 
                      className="inline-block mt-2 text-sm text-blue-500 hover:underline"
                    >
                      商品ページを見る ↗
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
