from playwright.sync_api import sync_playwright
import os

def verify_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load the index.html directly from file
        cwd = os.getcwd()
        file_path = f"file://{cwd}/index.html"
        print(f"Loading {file_path}")
        page.goto(file_path)

        # Take a screenshot of the Dashboard (default view)
        page.screenshot(path="verification/dashboard.png")
        print("Captured dashboard.png")

        # Navigate to Menu Editor
        page.click("text=Menu Editor")
        page.wait_for_timeout(500) # Wait for animation/transition
        page.screenshot(path="verification/menu_editor.png")
        print("Captured menu_editor.png")

        # Navigate to Font Editor
        page.click("text=Font Editor")
        page.wait_for_timeout(500)
        page.screenshot(path="verification/font_editor.png")
        print("Captured font_editor.png")

        browser.close()

if __name__ == "__main__":
    verify_ui()
