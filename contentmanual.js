(function() {
    let stopSearch = false;

    // Helper: Generates a random delay to mimic human behavior (Anti-Bot)
    function getJitterDelay(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    function enviarProgresso(progress) {
        chrome.runtime.sendMessage({ type: 'progressUpdate', progress: progress });
    }

    // Core Logic: Finds the element, scrolls to it, and verifies it is fully loaded
    async function procurarElementoEAutoRolar(pagina) {
        // Try the selector from your successful console test
        let content = document.querySelector(`div[data-chapterid='${pagina}']`);
        
        // Fallback to original ID format if needed
        if (!content) {
            content = document.getElementById(`p${pagina}--0`);
        }

        if (!content) {
            console.warn(`Page ${pagina} not in DOM. Scrolling to bottom to trigger load...`);
            window.scrollTo(0, document.body.scrollHeight); 
            return null;
        }

        // Automated scrolling
        content.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        // Verify the page is actually rendered (not a grey box/placeholder)
        let images = content.querySelectorAll("img");
        let imagesLoaded = Array.from(images).every(img => img.complete);
        let hasPlaceholder = content.querySelector(".pdfplaceholder");

        if (hasPlaceholder || !imagesLoaded) {
            console.log(`Page ${pagina} is still loading pixels... waiting.`);
            return null; 
        }

        // Return the clean HTML content
        return content.innerHTML + '<br>' + '\n';
    }

    async function downloadResultados(resultados, nomeArquivo) {
        const blob = new Blob(resultados, { type: 'text/html' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = nomeArquivo;
        link.click();
        // We do NOT clear DB here automatically so you can keep the data if download fails
    }

    function exibirStatusUI() {
        const msg = document.createElement('div');
        msg.id = 'automation-status';
        msg.style = "position:fixed; top:20px; left:50%; transform:translateX(-50%); padding:15px; background:white; border:2px solid #4caf50; z-index:999999; font-family:sans-serif; box-shadow:0 4px 15px rgba(0,0,0,0.2); border-radius:8px;";
        msg.innerHTML = `<div id="status-text">Starting Automation...</div>
                         <button id="stop-btn" style="margin-top:10px; cursor:pointer; background:#f44336; color:white; border:none; padding:5px 10px; border-radius:4px;">Stop & Save HTML</button>`;
        document.body.appendChild(msg);

        document.getElementById('stop-btn').onclick = async () => {
            stopSearch = true;
            msg.textContent = "Compiling file... please wait.";
            
            const db = await openIndexedDB();
            const allKeys = await getAllKeys(db);
            let finalHTML = ["<!DOCTYPE html><html><head><style>img{max-width:100%; display:block; margin:20px auto;} body{font-family:sans-serif; background:#f0f0f0;}</style></head><body>"];

            for (const key of allKeys) {
                if (key === 'lastProcessedIndex') continue;
                const data = await getTodoConteudoByKey(db, key);
                if (data) finalHTML.push(data);
            }
            
            finalHTML.push("</body></html>");
            downloadResultados(finalHTML, `perlego_export_${Date.now()}.html`);
            msg.remove();
        };
    }

    async function startAutomation() {
        exibirStatusUI();

        // Detect total pages
        let totalPages = 0;
        const paginationEl = document.querySelector('div[data-test-locator="pagination-total-chapter-numbers"]');
        if (paginationEl) {
            const matches = paginationEl.textContent.match(/\d+/g);
            if (matches) totalPages = parseInt(matches[0]);
        }

        let retryCount = 0; // Track how many times we've waited for a single page

        async function processLoop(currentPage) {
            if (stopSearch || (totalPages > 0 && currentPage > totalPages)) {
                if (currentPage > totalPages) document.getElementById('stop-btn').click();
                return;
            }

            const db = await openIndexedDB();
            const lastSaved = await getLastProcessedIndex(db);

            // Skip pages already in IndexedDB (Continuity)
            if (currentPage <= lastSaved) {
                return processLoop(currentPage + 1);
            }

            const html = await procurarElementoEAutoRolar(currentPage);
            const statusLabel = document.getElementById('status-text');

            if (!html) {
                retryCount++; // Increment our fail counter
                
                // If it fails 15 times (~45 seconds of waiting), force stop to save data
                if (retryCount > 15) {
                    console.error(`Page ${currentPage} failed to load after 15 attempts. Auto-saving...`);
                    document.getElementById('stop-btn').click();
                    return;
                }

                if (statusLabel) statusLabel.textContent = `Waiting for Page ${currentPage}... (Attempt ${retryCount}/15)`;
                // Retry with Jitter (Anti-Bot)
                setTimeout(() => processLoop(currentPage), getJitterDelay(2500, 4000));
            } else {
                retryCount = 0; // Reset counter on success
                
                if (statusLabel) statusLabel.textContent = `Captured Page ${currentPage} of ${totalPages || '?'}`;
                
                // Save to DB directly as a string (Removed the [] brackets)
                const key = `page_${currentPage.toString().padStart(5, '0')}`;
                await putTodoConteudo(db, key, html); 
                await putLastProcessedIndex(db, currentPage);
                
                if (totalPages > 0) enviarProgresso(Math.floor((currentPage / totalPages) * 100));

                // Move to next page with Jitter
                setTimeout(() => processLoop(currentPage + 1), getJitterDelay(1000, 2500));
            }
        }

        processLoop(1);
    }

    // --- Database Boilerplate (Same as your original system) ---
    async function openIndexedDB() {
        return new Promise((res, rej) => {
            const req = indexedDB.open('MeuBancoDeDados', 1);
            req.onupgradeneeded = (e) => e.target.result.createObjectStore('conteudo');
            req.onsuccess = (e) => res(e.target.result);
            req.onerror = (e) => rej(e.error);
        });
    }

    async function putTodoConteudo(db, key, content) {
        return new Promise((res) => {
            const tx = db.transaction(['conteudo'], 'readwrite');
            tx.objectStore('conteudo').put(content, key);
            tx.oncomplete = () => res();
        });
    }

    async function getTodoConteudoByKey(db, key) {
        return new Promise((res) => {
            const req = db.transaction(['conteudo'], 'readonly').objectStore('conteudo').get(key);
            req.onsuccess = (e) => res(e.target.result);
        });
    }

    async function getAllKeys(db) {
        return new Promise((res) => {
            const req = db.transaction(['conteudo'], 'readonly').objectStore('conteudo').getAllKeys();
            req.onsuccess = (e) => res(e.target.result.sort());
        });
    }

    async function getLastProcessedIndex(db) {
        return new Promise((res) => {
            const req = db.transaction(['conteudo'], 'readonly').objectStore('conteudo').get('lastProcessedIndex');
            req.onsuccess = (e) => res(e.target.result || 0);
        });
    }

    async function putLastProcessedIndex(db, index) {
        return new Promise((res) => {
            const tx = db.transaction(['conteudo'], 'readwrite');
            tx.objectStore('conteudo').put(index, 'lastProcessedIndex');
            tx.oncomplete = () => res();
        });
    }

    startAutomation();
})();
