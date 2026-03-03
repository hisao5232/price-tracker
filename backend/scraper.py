import re
import os
import json
import asyncio
import urllib.parse
from playwright.async_api import async_playwright

# 環境変数からベースURLを取得
BASE_SEARCH_URL = os.getenv("SEARCH_URL")

# 個別商品ページ用 (通常出品 & Shops 両対応版)
async def scrape_site(url: str):
    print(f"--- [START SCRAPE] URL: {url} ---")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        try:
            print(f"DEBUG: Opening page...")
            # タイムアウトを1分に設定
            page.set_default_timeout(60000)
            await page.goto(url, wait_until="domcontentloaded")
            # ページ読み込み後、JavaScriptの実行を少し待つ
            await page.wait_for_timeout(2000)
            print(f"DEBUG: Page loaded. Current URL: {page.url}")

            # --- 1. 売り切れ判定 ---
            is_sold_out = False
            sold_out_btn = await page.query_selector('button[disabled] >> text="売り切れました"')
            if sold_out_btn:
                is_sold_out = True
            print(f"DEBUG: is_sold_out = {is_sold_out}")

            # --- 2. データ取得 (JSON-LD 方式) ---
            print(f"DEBUG: Attempting JSON-LD extraction...")
            scripts = await page.locator('script[type="application/ld+json"]').all_inner_texts()
            name, price, image_url = None, None, None
            
            print(f"DEBUG: Found {len(scripts)} LD+JSON scripts.")
            for i, s in enumerate(scripts):
                try:
                    data = json.loads(s)
                    items = data.get("@graph", [data]) if isinstance(data, dict) else []
                    for item in items:
                        if item.get("@type") == "Product":
                            name = item.get("name")
                            image_url = item.get("image")
                            offers = item.get("offers", {})
                            # 価格の抽出 (数値として取得)
                            price_val = offers[0].get("price") if isinstance(offers, list) else offers.get("price")
                            if price_val:
                                price = int(price_val)
                            print(f"DEBUG: Found Product in script {i}: {name}, {price}")
                            break
                except Exception as e:
                    print(f"DEBUG: Error parsing script {i}: {e}")
                    continue

            # --- 3. 補完処理 (JSON-LDで取れなかった場合) ---
            
            # 商品名
            if not name:
                name = await page.get_attribute('meta[property="og:title"]', "content")
                if name: 
                    # 末尾のショップ名を削るなどのクリーンアップ
                    name = name.replace(" - メルカリ", "").replace(" - ピットスポーツ", "").strip()
                    print(f"DEBUG: Name from Meta: {name}")

            # 価格 (ここがShopsで重要)
            if not price:
                # A. メタタグを確認 (query_selectorを使うことで例外を回避)
                price_meta_el = await page.query_selector('meta[property="product:price:amount"]')
                if price_meta_el:
                    price_str = await price_meta_el.get_attribute("content")
                    if price_str:
                        price = int(price_str)
                        print(f"DEBUG: Price from Meta: {price}")
                
                # B. Shops専用セレクタ [data-testid="product-price"] を確認
                if not price:
                    print(f"DEBUG: Searching for [data-testid='product-price']...")
                    price_locator = page.locator('[data-testid="product-price"]')
                    
                    try:
                        # 要素が出現するまで最大5秒待機
                        await price_locator.wait_for(state="visible", timeout=5000)
                        
                        # inner_text を取得
                        price_raw = await price_locator.inner_text()
                        
                        # inner_text が空の場合は textContent (より低レイヤー) を試す
                        if not price_raw or not price_raw.strip():
                            price_raw = await price_locator.evaluate("el => el.textContent")
                        
                        print(f"DEBUG: Raw Price Text: '{price_raw}'")
                        
                        if price_raw:
                            digits = re.sub(r'[^0-9]', '', price_raw)
                            if digits:
                                price = int(digits)
                                print(f"DEBUG: Price from TestID Selector: {price}")
                    except Exception as e:
                        print(f"DEBUG: Price element wait failed or not found: {e}")

            # 画像
            if not image_url:
                img_meta_el = await page.query_selector('meta[property="og:image"]')
                if img_meta_el:
                    image_url = await img_meta_el.get_attribute("content")
                    print(f"DEBUG: Image from Meta: {bool(image_url)}")

            # ここを追加
            if isinstance(image_url, list) and len(image_url) > 0:
                image_url = image_url[0]
            elif isinstance(image_url, list):
                image_url = None

            print(f"--- [END SCRAPE] Final - Name: {name}, Price: {price} ---")

            # --- 4. 返却判定 ---
            if name and price:
                return {
                    "status": "success", 
                    "name": name, 
                    "price": int(price), 
                    "image_url": str(image_url) if image_url else None,
                    "sold_out": is_sold_out
                }
            
            return {"status": "error", "message": f"Required data missing. Name: {name}, Price: {price}"}

        except Exception as e:
            print(f"DEBUG: Exception occurred: {e}")
            return {"status": "error", "message": str(e)}
        finally:
            await browser.close()

async def search_items(keyword: str):
    encoded_keyword = urllib.parse.quote(keyword)
    search_url = f"{BASE_SEARCH_URL}/search/?keyword={encoded_keyword}&status=on_sale&sort=created_time&order=desc"
    
    async with async_playwright() as p:
        print(f"--- Starting Scraping for: {keyword} ---")
        # エックスサーバー等の環境に合わせ、余計なリソースを読み込まない設定
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        found_items = {}
        last_count = 0
        same_count_limit = 0

        try:
            print(f"[DEBUG] Navigating to: {search_url}")

            await page.goto(search_url, wait_until="domcontentloaded", timeout=60000)
            
            # アイテムが表示されるまで待機
            try:
                await page.wait_for_selector('li[data-testid="item-cell"]', timeout=20000)
            except Exception as te:
                print(f"[ERROR] Timeout waiting for selector: {te}")
                # タイムアウトしてもデータがJSONにある可能性があるので続行
            
            # デバッグ用：現在のHTMLをダンプ
            html_content = await page.content()
            with open("debug_page_source.html", "w", encoding="utf-8") as f:
                f.write(html_content)
            print(f"[DEBUG] HTML dumped to debug_page_source.html (Length: {len(html_content)})")

            # --- 全件回収ループ ---
            for step in range(5):  # JSON取得ならステップ数は少なめでもOK
                print(f"[DEBUG] Step {step + 1}: Extracting data via Next.js JSON...")

                # DOMを這い回るのではなく、内部JSONデータを直接パース
                new_data = await page.evaluate('''async (searchKeyword) => {
                    try {
                        const nextDataEl = document.getElementById('__NEXT_DATA__');
                        if (!nextDataEl) return [];

                        const jsonData = JSON.parse(nextDataEl.innerHTML);
        
        // メルカリの最新構造: props.pageProps.apolloState にデータが分散している場合があるため、
        // initialState と apolloState 両方をチェックする
                        const state = jsonData.props?.pageProps?.initialState || jsonData.props?.pageProps?.apolloState || {};
        
        // アイテム配列を保持している可能性が高いキーを網羅的に探す
                        const items = 
                            state.search?.searchItems?.items || 
                            state.searchV2?.searchItems?.items ||
                            (state.searchItems && state.searchItems.items) ||
                            [];
            
        // もし上記で見つからない場合の再帰探索 (エンジニアの予備策)
                        const findItemsRecursive = (obj) => {
                            if (!obj || typeof obj !== 'object') return null;
                            if (Array.isArray(obj) && obj.length > 0 && obj[0].id && obj[0].name) return obj;
                            for (const key in obj) {
                                if (key === 'items' && Array.isArray(obj[key])) return obj[key];
                                const found = findItemsRecursive(obj[key]);
                                if (found) return found;
                            }
                            return null;
                        };

                        const finalItems = items.length > 0 ? items : (findItemsRecursive(state) || []);

                        return finalItems.map(item => ({
                            id: item.id || item.itemId,
                            name: item.name || "",
                            price: parseInt(item.price) || 0,
                            url: "https://jp.mercari.com/item/" + (item.id || item.itemId),
                            image_url: (item.thumbnails && item.thumbnails.length > 0) ? item.thumbnails[0] : null,
                            searched_keyword: searchKeyword 
                        })).filter(item => item.id && item.price > 0); // 最低限のバリデーション
                    } catch (err) {
                        return [];
                    }
                }''', keyword)

                for item in new_data:
                    found_items[item['id']] = item
                
                current_count = len(found_items)
                print(f"[INFO] Step {step + 1}: Extracted {len(new_data)} items (Total Unique: {current_count})")

                # 終了判定
                if current_count == last_count:
                    same_count_limit += 1
                else:
                    same_count_limit = 0

                if same_count_limit >= 2:
                    break
                
                last_count = current_count

                # さらに読み込ませるためにスクロール
                await page.mouse.wheel(0, 2000)
                await page.wait_for_timeout(2000)

            print(f"--- Scraping Finished. Total Unique: {len(found_items)} ---")
            
            # 最終的な画面を保存
            await page.screenshot(path="search_result_debug.png")
            return list(found_items.values())

        except Exception as e:
            print(f"[CRITICAL ERROR] Scraping failed: {str(e)}")
            return []
        finally:
            await browser.close()

# テスト実行用のブロック（main.pyからは呼ばれない）
if __name__ == "__main__":
    import asyncio
    test_keyword = "アシックス DSライト 27.5"
    results = asyncio.run(search_items(test_keyword))
    print(f"Final Found: {len(results)} items")
