import os
import json
import asyncio
import urllib.parse
from playwright.async_api import async_playwright

# 環境変数からベースURLを取得（設定されていなければデフォルトを使用）
BASE_SEARCH_URL = os.getenv("SEARCH_URL")

# 個別商品ページ用
async def scrape_site(url: str):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        try:
            page.set_default_timeout(60000)
            await page.goto(url, wait_until="domcontentloaded")
            await page.wait_for_timeout(2000)
            
            scripts = await page.locator('script[type="application/ld+json"]').all_inner_texts()
            name, price, image_url = None, None, None
            for s in scripts:
                try:
                    data = json.loads(s)
                    items = data.get("@graph", [data]) if isinstance(data, dict) else []
                    for item in items:
                        if item.get("@type") == "Product":
                            name = item.get("name")
                            image_url = item.get("image")
                            if isinstance(image_url, list) and len(image_url) > 0:
                                image_url = image_url[0]
                            offers = item.get("offers", {})
                            price = offers[0].get("price") if isinstance(offers, list) else offers.get("price")
                            break
                except: continue
            
            if not name: name = await page.get_attribute('meta[property="og:title"]', "content")
            if not price:
                price_str = await page.get_attribute('meta[property="product:price:amount"]', "content")
                if price_str: price = int(price_str)
            if not image_url: image_url = await page.get_attribute('meta[property="og:image"]', "content")

            if name and price:
                return {"status": "success", "name": name, "price": int(price), "image_url": image_url}
            return {"status": "error", "message": "Could not find name or price"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
        finally:
            await browser.close()

async def search_items(keyword: str):
    # キーワードをURLエンコードして結合
    encoded_keyword = urllib.parse.quote(keyword)
    # 検索条件をパラメータとして構築
    search_url = f"{BASE_SEARCH_URL}?keyword={encoded_keyword}&status=on_sale&sort=created_time&order=desc"
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        found_items = {}
        last_count = 0
        same_count_limit = 0 

        try:
            print(f"Accessing: {search_url}")
            await page.goto(search_url, wait_until="domcontentloaded")
            await page.wait_for_selector('li[data-testid="item-cell"]', timeout=15000)
            
            # --- 全件回収ループ ---
            for step in range(30):
                # JavaScript側で「要素が安定するまで少し待つ」処理を内蔵
                new_data = await page.evaluate('''async () => {
                    const results = [];
                    // 読み込み待ち（少し待機）
                    await new Promise(r => setTimeout(r, 500));
                    
                    const cells = document.querySelectorAll('li[data-testid="item-cell"]');
                    cells.forEach(cell => {
                        const link = cell.querySelector('a');
                        const nameEl = cell.querySelector('span[data-testid="thumbnail-item-name"]');
                        const priceEl = cell.querySelector('span[class*="number"]');
                        const imgEl = cell.querySelector('picture img');
                        
                        // 名前と価格がちゃんとテキストとして入っている場合のみ取得
                        if (link && nameEl && nameEl.innerText.trim() !== "" && priceEl) {
                            results.push({
                                id: link.getAttribute('href').split('/').pop(),
                                name: nameEl.innerText,
                                price: parseInt(priceEl.innerText.replace(/[,¥]/g, '')),
                                url: "https://jp.mercari.com" + link.getAttribute('href'),
                                image_url: imgEl ? imgEl.getAttribute('src') : null
                            });
                        }
                    });
                    return results;
                }''')

                for item in new_data:
                    found_items[item['id']] = item

                current_count = len(found_items)
                print(f"Step {step + 1}: {current_count} items collected...")

                if current_count == last_count:
                    same_count_limit += 1
                else:
                    same_count_limit = 0 
                
                if same_count_limit >= 3:
                    print("Reached the bottom. Finalizing...")
                    break
                
                last_count = current_count

                # 小刻みスクロールで読み込みを促す
                for _ in range(3):
                    await page.mouse.wheel(0, 800)
                    await page.wait_for_timeout(800)

            print(f"Total unique items collected: {len(found_items)}")
            
            # --- スクリーンショット対策：超丁寧な全戻り ---
            print("Capturing full-page screenshot... Ensuring all images are loaded.")
            # 一気に戻らず、各セクションで画像が読み込まれるのを待つ
            current_y = await page.evaluate("window.scrollY")
            while current_y > 0:
                current_y = max(0, current_y - 1200)
                await page.evaluate(f"window.scrollTo(0, {current_y})")
                # そのエリアの画像がロードされるのを待機
                await page.wait_for_timeout(600)

            # 最上部でダメ押しの待機
            await page.evaluate("window.scrollTo(0, 0)")
            await page.wait_for_timeout(2000)
            
            screenshot_path = "search_result_debug.png"
            await page.screenshot(path=screenshot_path, full_page=True)
            print(f"Final full-page screenshot saved.")

            return list(found_items.values())

        except Exception as e:
            await page.screenshot(path="error_debug.png")
            print(f"Search error: {e}")
            return []
        finally:
            await browser.close()

# テスト実行用のブロック（main.pyからは呼ばれない）
if __name__ == "__main__":
    import asyncio
    test_keyword = "アシックス DSライト 27.5"
    results = asyncio.run(search_items(test_keyword))
    print(f"Final Found: {len(results)} items")
