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
4. **For PDFs:** Click **PDF (manual)**. 
   * *Note: While the button is labeled manual, it now triggers a fully automated scrolling script.*
5. A status bar will appear at the top of the page. The script will automatically scroll, wait for images to load, and save pages to the database.
6. When finished (or to stop early), click **Stop & Save HTML**.

## ✨ Key Automated Features
- **Auto-Scrolling:** No more manual scrolling or "Page Down" needed. The script moves through the PDF automatically.
- **Lazy-Load Detection:** The script detects Perlego's "loading" placeholders and high-res image status. It will wait until a page is perfect before capturing it.
- **Anti-Bot Jitter:** Uses randomized delays (2.5s – 4.5s) to mimic human reading patterns, reducing the risk of being flagged as a bot.
- **Continuity Mode:** If the browser tab crashes or freezes on a large book, simply refresh the page (F5) and click the button again. It will skip already-captured pages and resume where it left off.

## 📄 Saving as PDF (Offline Use)
The extension generates an `.html` file. To ensure images don't expire and to read offline:
1. Open the generated `.html` file in a browser.
2. **Important:** Scroll to the very bottom of the page once to ensure all images are rendered in the browser cache.
3. Press **Ctrl + P**.
4. Select **Save as PDF**.
5. *Pro Tip:* If the file is extremely large, use **Firefox** to open the HTML and print, as it handles memory better than Chrome.

## 🛠️ Maintenance & Reset
If you want to start a book from the beginning or clear the saved progress, use the **Clear Continuity** button in the popup before starting a new capture.

---
*Read the description of each format in the extension UI to avoid browser crashes.*

<p align="start">
<img src="https://github.com/GladistonXD/perlego-download/assets/50533550/bfed5fbc-2122-4ab8-b948-e64619ad9b7d" alt="Description" width="50%" height="50%"/>
</p>

*After accessing the book normally via: `https://ereader.perlego.com/1/book/(ID*)` you can start the automation.*

>*There are no guarantees of functionality, feel free to take this code and use it as you see fit, there will probably be no updates as I am in the 7 day free period, some books may have specific bugs because I didn't have time to test all the possibilities.*

[<img src="https://github.com/user-attachments/assets/d8c9ad65-1188-4f4a-9cd5-433f5e8de31f" width="250" alt="Donate with PayPal">](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=8BGXZC3GHQBL2)
