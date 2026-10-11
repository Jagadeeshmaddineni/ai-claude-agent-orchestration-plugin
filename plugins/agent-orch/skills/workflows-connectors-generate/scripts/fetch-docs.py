#!/usr/bin/env python3
"""
Documentation Fetcher for JavaScript-heavy sites

Uses Playwright to fetch documentation from sites that require
JavaScript execution to render content (React, Angular, Vue, etc.).

Usage: python fetch-docs.py <url> [output-prefix] [output-dir]

Examples:
    python fetch-docs.py https://docs.example.com/api
    python fetch-docs.py https://api-docs.service.com api-docs
    python fetch-docs.py https://api-docs.service.com api-docs specs/docs-raw
"""

import sys
import json
import io
from datetime import datetime
from pathlib import Path

# Fix Windows console encoding for unicode
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("[X] Playwright not installed. Install with:")
    print("    pip install playwright")
    print("    playwright install chromium")
    sys.exit(1)


def fetch_documentation(url: str, output_prefix: str = "docs", output_dir: str = ".") -> dict:
    """Fetch documentation from a JavaScript-heavy site."""

    # Ensure output directory exists
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    print("🌐 JavaScript Documentation Fetcher")
    print("━" * 40 + "\n")
    print(f"📂 Output directory: {output_path.absolute()}\n")

    with sync_playwright() as p:
        print("🚀 Launching browser...")
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print(f"📡 Navigating to: {url}")
            print("   (This may take a moment...)\n")

            # Navigate to the page
            page.goto(url, wait_until="domcontentloaded", timeout=60000)

            # Wait for JavaScript to render
            print("⏳ Waiting for JavaScript to render...")
            page.wait_for_timeout(10000)

            # Get page metadata
            title = page.title()
            current_url = page.url

            print(f"\n✅ Page loaded successfully")
            print(f"   Title: {title}")
            if current_url != url:
                print(f"   Redirected to: {current_url}")

            # Extract text content
            text_content = page.evaluate("() => document.body.innerText")

            # Get full HTML
            html_content = page.content()

            # Find content structure
            content_structure = page.evaluate("""() => {
                const selectors = [
                    'main', '[role="main"]', '.documentation', '.content',
                    '.api-content', '#content', '.docs', 'article'
                ];
                const found = [];
                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => {
                        found.push({
                            selector: selector,
                            tag: el.tagName.toLowerCase(),
                            classes: el.className,
                            id: el.id,
                            textLength: el.innerText?.length || 0
                        });
                    });
                }
                return found;
            }""")

            # Generate filenames
            timestamp = datetime.now().strftime("%Y%m%dT%H%M%S")
            base_filename = f"{output_prefix}-{timestamp}"

            # Save text content
            text_file = output_path / f"{base_filename}.txt"
            text_file.write_text(text_content, encoding="utf-8")
            print(f"\n📄 Text content saved: {text_file}")
            print(f"   Size: {len(text_content) / 1024:.2f} KB")

            # Save HTML content
            html_file = output_path / f"{base_filename}.html"
            html_file.write_text(html_content, encoding="utf-8")
            print(f"📄 HTML content saved: {html_file}")
            print(f"   Size: {len(html_content) / 1024:.2f} KB")

            # Save screenshot
            screenshot_file = output_path / f"{base_filename}.png"
            page.screenshot(path=str(screenshot_file), full_page=True)
            print(f"📸 Screenshot saved: {screenshot_file}")

            # Save metadata
            metadata = {
                "url": url,
                "finalUrl": current_url,
                "title": title,
                "timestamp": datetime.now().isoformat(),
                "textLength": len(text_content),
                "htmlLength": len(html_content),
                "contentStructure": content_structure
            }
            metadata_file = output_path / f"{base_filename}-metadata.json"
            metadata_file.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
            print(f"📋 Metadata saved: {metadata_file}")

            # Display content preview
            print("\n" + "━" * 40)
            print("📖 Content Preview (first 1000 characters):")
            print("━" * 40)
            print(text_content[:1000])
            if len(text_content) > 1000:
                print("\n... (content truncated, see full text in file)")
            print("━" * 40 + "\n")

            # Display structure info
            if content_structure:
                print("🏗️  Content Structure Detected:")
                for item in content_structure[:5]:
                    print(f"   - {item['selector']}: {item['textLength']} chars")
                if len(content_structure) > 5:
                    print(f"   ... and {len(content_structure) - 5} more")
                print()

            print("✅ Documentation fetched successfully!")
            print(f"\n📁 Files saved to: {output_path.absolute()}")
            print(f"   Prefix: {base_filename}")

            return {
                "success": True,
                "files": {
                    "text": str(text_file),
                    "html": str(html_file),
                    "screenshot": str(screenshot_file),
                    "metadata": str(metadata_file)
                },
                "metadata": metadata
            }

        except Exception as e:
            print(f"\n❌ Error fetching documentation:")
            print(f"   {str(e)}")

            if "Timeout" in str(e):
                print("\n💡 Tip: The page may be taking too long to load.")
                print("   This could be due to:")
                print("   - Slow network connection")
                print("   - Page requires authentication")
                print("   - Page has anti-bot protection")

            return {
                "success": False,
                "error": str(e)
            }

        finally:
            browser.close()


def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("--help", "-h"):
        print(__doc__)
        sys.exit(0)

    url = sys.argv[1]
    output_prefix = sys.argv[2] if len(sys.argv) > 2 else "docs"
    output_dir = sys.argv[3] if len(sys.argv) > 3 else "."

    # Validate URL
    if not url.startswith(("http://", "https://")):
        print(f"❌ Error: Invalid URL provided")
        print(f'   "{url}" is not a valid URL')
        print("\nUsage: python fetch-docs.py <url> [output-prefix] [output-dir]")
        sys.exit(1)

    result = fetch_documentation(url, output_prefix, output_dir)
    sys.exit(0 if result["success"] else 1)


if __name__ == "__main__":
    main()
