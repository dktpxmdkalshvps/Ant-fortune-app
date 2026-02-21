from playwright.sync_api import sync_playwright

def run(playwright):
    print("Starting verification...")
    browser = playwright.chromium.launch(headless=True)
    # Mobile Viewport
    context = browser.new_context(viewport={"width": 375, "height": 812})
    page = context.new_page()

    try:
        page.goto("http://localhost:3000")
        page.wait_for_load_state("networkidle")

        # Verify Disclaimer is GONE
        disclaimer = page.locator("text=This is NOT financial advice")
        if disclaimer.count() > 0 and disclaimer.is_visible():
            print("Disclaimer found! FAIL")
        else:
            print("Disclaimer not found. PASS")

        # Switch to Zodiac Mode
        print("Switching to Zodiac Mode...")
        page.get_by_text("퀵 모드 · 별자리").click()
        page.wait_for_timeout(1000)

        # Check Zodiac Grid Layout
        if page.locator(".grid-zodiac").count() > 0:
            print("Class .grid-zodiac found. PASS")
        else:
            print("Class .grid-zodiac NOT found. FAIL")

        # Screenshot Zodiac Grid
        page.screenshot(path="verification/mobile_zodiac.png", full_page=True)
        print("Screenshot mobile_zodiac.png saved.")

        # Switch to Saju Mode
        print("Switching to Saju Mode...")
        page.get_by_text("딥 모드 · 사주").click()
        page.wait_for_timeout(1000)

        # Fill Form
        print("Filling form...")
        page.locator('input[placeholder="예: 1990"]').fill("2000")
        # Assuming selects are in order: Month, Day, Hour, Gender
        # But Month/Day selects are shared components?
        # In Saju mode:
        # Inp Year
        # Sel Month
        # Sel Day
        # Sel Hour
        # Sel Gender

        # Selects logic: nth(0) might be Month if Year is Input.
        # Let's check structure.
        # <div ...> <Inp Year/> <Sel Month/> <Sel Day/> </div>
        # <div ...> <Sel Hour/> <Sel Gender/> </div>

        page.locator('select').nth(0).select_option("1") # Month
        page.locator('select').nth(1).select_option("1") # Day
        page.locator('select').nth(2).select_option("0") # Hour

        # Submit
        print("Submitting...")
        page.get_by_text("사주 오행 분석하기").click()

        # Wait for result
        page.wait_for_timeout(2000)

        # Check Pillar Grid Class
        if page.locator(".grid-pillars").count() > 0:
            print("Class .grid-pillars found. PASS")
        else:
            print("Class .grid-pillars NOT found. FAIL")

        # Check Lucky Grid Class
        if page.locator(".grid-lucky").count() > 0:
            print("Class .grid-lucky found. PASS")
        else:
            print("Class .grid-lucky NOT found. FAIL")

        # Screenshot Saju Result
        page.screenshot(path="verification/mobile_saju.png", full_page=True)
        print("Screenshot mobile_saju.png saved.")

    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="verification/error.png")
    finally:
        browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
