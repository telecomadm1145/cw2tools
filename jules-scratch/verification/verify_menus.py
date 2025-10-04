import os
from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        file_path = os.path.abspath('index.html')
        page.goto(f'file://{file_path}')
        page.wait_for_load_state('networkidle')

        # Since we can't load a real ROM, we'll create a dummy one
        # to allow the UI to be tested without throwing "ROM not loaded" errors.
        page.evaluate("""
            window.rom = new Uint8Array(524288).fill(0); // Create a 512KB dummy ROM
            window.is_cwii = true;
            console.log('Dummy ROM created for testing.');
        """)

        # Test 1: General Menu Editor UI
        print("Verifying General Menu Editor...")
        load_menus_button = page.locator("#loadMenusButton")
        expect(load_menus_button).to_be_visible()
        # We can't actually test the loading without a real ROM, but we can check the button exists.

        # Test 2: Main Menu Editor UI and Auto-Detect
        print("Verifying Main Menu Editor...")
        auto_detect_button = page.locator("#autoDetectMainMenuButton")
        expect(auto_detect_button).to_be_visible()

        # We can't test auto-detect without a real ROM with real signatures,
        # but we can verify the button is there and the fields are initially empty.
        menu_base1_input = page.locator("#menuBase1Input")
        expect(menu_base1_input).to_have_value("")

        # Take a final screenshot
        print("Taking final screenshot...")
        page.screenshot(path='jules-scratch/verification/menus_verification.png', full_page=True)

        browser.close()
        print("Verification script finished.")

if __name__ == "__main__":
    run()