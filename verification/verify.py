from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    page.goto("http://localhost:3000")

    # 1. Check Disclaimer
    print("Checking Disclaimer...")
    disclaimer = page.locator("div", has_text="본 사주 계산은 오락용 근사치 알고리즘을 사용하므로 실제와 다를 수 있습니다")
    if disclaimer.count() > 0:
        print("Disclaimer found.")
    else:
        print("Disclaimer NOT found.")

    # 2. Check Saju Date Validation
    print("Checking Saju Date Validation...")
    # Enter invalid date: 2023 Feb 30
    page.get_by_placeholder("예: 1990").fill("2023")
    # In Saju mode, there are 3 selects: Month, Day, Hour, Gender (4 selects total?)
    # Let's be specific.
    # Month select
    page.locator("select").nth(0).select_option("2")
    # Day select
    page.locator("select").nth(1).select_option("30")
    page.get_by_role("button", name="사주 오행 분석하기").click()

    # Check for error message
    error_msg = page.locator("text=유효하지 않은 날짜입니다")
    if error_msg.is_visible():
        print("Saju Validation Error Message Visible.")
    else:
        print("Saju Validation Error Message NOT Visible.")

    page.screenshot(path="verification/saju_validation.png")

    # 3. Check Zodiac Date Validation
    print("Checking Zodiac Date Validation...")
    page.get_by_role("button", name="퀵 모드 · 별자리").click()
    # Enter invalid date: Feb 30
    # Zodiac mode has 2 selects for date: Month, Day.
    page.locator("select").nth(0).select_option("2") # Month
    page.locator("select").nth(1).select_option("30") # Day
    page.get_by_role("button", name="오늘의 기운 분석하기").click()

    error_msg_zodiac = page.locator("text=유효하지 않은 날짜입니다")
    if error_msg_zodiac.is_visible():
        print("Zodiac Validation Error Message Visible.")
    else:
        print("Zodiac Validation Error Message NOT Visible.")

    page.screenshot(path="verification/zodiac_validation.png")

    # 4. Check Accessibility Attributes
    print("Checking Accessibility Attributes...")
    # Zodiac items (visible in Zodiac mode)
    # Locate by text "양자리" and check its parent container which has the onClick
    # The structure: <div onClick...> ... <div>양자리</div> ... </div>
    # The onClick is on the container which has the text "양자리".
    zodiac_item = page.locator("div", has_text="양자리").first
    # Actually, the div with onClick contains the text "양자리".
    # Wait, ZODIACS_LIST.map creates a div with onClick. Inside it has div with symbol, div with sign name ("양자리"), etc.
    # So "div", has_text="양자리" might match the inner div or the outer div.
    # The outer div has onClick.
    # If I verify role on the element that has onClick.

    # Let's find by role button.
    zodiac_btn = page.locator("div[role='button']", has_text="양자리")
    if zodiac_btn.count() > 0:
        role = zodiac_btn.get_attribute("role")
        tabindex = zodiac_btn.get_attribute("tabIndex")
        print(f"Zodiac Item - role: {role}, tabIndex: {tabindex}")

        # Test KeyDown
        print("Testing KeyDown on Zodiac Item...")
        zodiac_btn.focus()
        page.keyboard.press("Enter")
        # How to verify? The selected item changes style.
        # "background:sel?..."
        # Or we can check if it becomes selected.
        # "자동 판별 결과" box appears if auto-detected, but manual selection just highlights it?
        # No, setSelZodiac updates state.
        # If manual selection, the box "자동 판별 결과" doesn't appear?
        # Ah, "자동 판별 결과" only appears if selZodiac is set AND bMo/bDy matches?
        # No: {selZodiac && (<div ...> ... </div>)}
        # So if selZodiac is set (manually), the box appears?
        # Wait: <div style={{flex:"1 1 140px"...}}> is conditionally rendered if selZodiac is truthy.
        # Yes.

        page.wait_for_timeout(500)
        auto_result = page.locator("text=자동 판별 결과") # The label inside the box?
        # "자동 판별 결과" text is inside the box.
        # Check if "양자리" is visible in that box?
        # Actually the box title is "자동 판별 결과" but it shows the symbol and name.
        # But wait, the label says "자동 판별 결과". Does it make sense for manual selection?
        # The code:
        # {selZodiac && ( ... <div ...>자동 판별 결과</div> ... {selZodiac} ... )}
        # Yes, it shows up regardless of how it was selected.
        if auto_result.is_visible():
             print("Zodiac Selection worked via Keyboard.")
        else:
             print("Zodiac Selection FAILED via Keyboard.")

    # Lucky Charm verification
    # Need to run a valid calculation first.
    # Select valid date.
    page.locator("select").nth(1).select_option("28") # Feb 28
    page.get_by_role("button", name="오늘의 기운 분석하기").click()
    page.wait_for_timeout(2000) # Wait for result animation

    # Lucky Charm
    charm_btn = page.locator("div[role='button']", has_text="상승장 기원 부적")
    if charm_btn.count() > 0:
        print(f"Lucky Charm found with role=button.")
        tabindex_charm = charm_btn.get_attribute("tabIndex")
        print(f"Lucky Charm tabIndex: {tabindex_charm}")

        # Test KeyDown
        print("Testing KeyDown on Lucky Charm...")
        charm_btn.focus()
        page.keyboard.press("Enter")
        page.wait_for_timeout(500)
        if page.locator("text=부적 활성화").is_visible():
             print("Lucky Charm activated via Keyboard.")
        else:
             print("Lucky Charm NOT activated via Keyboard.")

        page.screenshot(path="verification/lucky_charm.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
