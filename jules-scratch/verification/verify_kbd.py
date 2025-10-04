import os
from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        file_path = os.path.abspath('index.html')
        page.goto(f'file://{file_path}')
        page.wait_for_load_state('networkidle')

        # Scroll to the KBD Patcher section
        kbd_patcher_section = page.locator("#kbdPatcherLog")
        kbd_patcher_section.scroll_into_view_if_needed()

        # Verify that the key elements are visible
        expect(page.locator("#patchKbdButton")).to_be_visible()
        expect(page.locator("#shutdownPngFile")).to_be_visible()

        # Take a screenshot of the entire page to show all features
        page.screenshot(path='jules-scratch/verification/kbd_verification.png', full_page=True)

        browser.close()
        print("KBD Patcher verification script finished.")

if __name__ == "__main__":
    run()