# Perlego Download Tool (Automated Edition)

A Chrome extension to automate content downloads from the Perlego e-reader. An active account is required.

## 🚀 Installation
1. Download the repository files.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** (top right toggle).
4. Click **Load unpacked** and select the folder containing these files.

## 📖 How to Use
1. Access your book at `https://ereader.perlego.com/1/book/(ID)`.
2. Open the extension popup.
3. **For ePUBs:** Click **ePUB (auto)**.
4. **For PDFs:** Click **PDF (auto)**. 
5. A status box will appear at the top of the webpage, and a green progress bar will appear in the extension menu. The script will automatically scroll, wait for images to load, and save pages to its internal database.
6. When it reaches the final page, it will automatically compile and download your file. 

*(Note: If you click away from the extension menu, it will close and the progress bar will hide. Don't worry! The script is still running perfectly in the background. If you reopen the menu, just wait a few seconds and the progress bar will reappear when it captures the next page.)*

## ✨ Key Automated Features
- **Auto-Scrolling:** No more manual scrolling or "Page Down" needed. The script moves through the PDF automatically and aggressively nudges the page if Perlego's Virtual DOM gets stuck.
- **Lazy-Load Detection:** The script detects Perlego's "loading" placeholders and high-res image status. It will wait until a page is perfectly rendered before capturing it.
- **Anti-Bot Jitter:** Uses randomized delays to mimic human reading patterns, reducing the risk of being flagged as a bot.
- **Auto-Save Failsafe:** If Perlego completely fails to load a page after 30 attempts (~90 seconds), the script will automatically compile and download everything you have captured up to that point so you never lose your progress.

## 🧠 Continuity Mode & Managing Books
This extension uses a local database to remember what pages you have already captured. This is great for recovering from crashes, but **the script is "book-blind"**. It only remembers page numbers, not book titles.

* **If your browser crashes or you trigger the Auto-Save Failsafe:** Do **NOT** clear anything. Just refresh the Perlego webpage (F5) and click **PDF (auto)** again. The script will silently skip all the pages you already downloaded and resume exactly where it left off!
* **If you are starting a brand NEW book:** You **MUST** open the extension and click **Clear continuity** before starting. This wipes the memory of the old book so your new book starts cleanly at Page 1.

## 📄 Saving as PDF (Offline Use)
The extension generates an `.html` file. To ensure images don't expire and to read offline:
1. Open the generated `.html` file in a browser.
2. **Important:** Scroll to the very bottom of the page once to ensure all images are rendered in the browser cache.
3. Press **Ctrl + P**.
4. Select **Save as PDF**.
5. *Pro Tip:* If the file is extremely large, use **Firefox** to open the HTML and print, as it handles memory better than Chrome.

## ☕ Support this Project
If this tool helped you, consider supporting the development:
[**Donate via PayPal**](https://www.paypal.com/donate/?hosted_button_id=USR242HKMCFG2)
