(function() {
    let stopSearch = false;

    function getJitterDelay(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    function enviarProgresso(progress) {
        chrome.runtime.sendMessage({ type: 'progressUpdate', progress: progress });
    }

    // --- NEW: Bulletproof Save Function ---
    async function compileAndSave(pageNumber = 'unknown') {
        stopSearch = true;
        
        // Try to update UI if it still exists
        const msg = document.getElementById('automation-status');
        if (msg) msg.innerHTML = `<div style="color:black; font-weight:bold;">Compiling HTML... Please wait, DO NOT close tab.</div>`;

        try {
            console.log("Starting database compilation...");
            const db = await openIndexedDB();
            const allKeys = await getAllKeys(db);
            let finalHTML = ["<!DOCTYPE html><html><head><style>img{max-width:100%; display:block; margin:20px auto;} body{font-family:sans-serif; background:#f0f0f0;}</style></head><body>"];

            for (const key of allKeys) {
                if (key === 'lastProcessedIndex') continue;
                const data = await getTodoConteudoByKey(db, key);
                if (data) finalHTML.push(data);
            }
            
            finalHTML.push("</body></html>");
            
            // Force Download
            const blob = new Blob([finalHTML.join('\n')], { type: 'text/html' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `perlego_export_upto_${pageNumber}_${Date.now()}.html`;
            
            // Append to body temporarily (required by some browser security rules)
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            if (msg) msg.innerHTML = `<div style="color:green; font-weight:bold;">Download Triggered! Check your downloads folder.</div>`;
            console.log("Download triggered successfully.");
        } catch (error) {
            console.error("Critical error during save:", error);
            if (msg) msg.innerHTML = `<div style="color:red; font-weight:bold;">Save Failed. Check console (F12).</div>`;
        }
    }

    async function procurarElementoEAutoRolar(pagina) {
        let content = document.querySelector(`div[data-chapterid='${pagina}']`);
        
        if (!content) {
            content = document.getElementById(`p${pagina}--0`);
        }

        if (!content) {
            console.warn(`Page ${pagina} not in DOM yet. Nudging scroll down...`);
            
            // Nudge window
            window.scrollBy({ top: 800, behavior: "smooth" });
            
            // Nudge last rendered element
            let renderedPages = Array.from(document.querySelectorAll("div[id^='p']"));
            if (renderedPages.length > 0) {
                let lastRenderedPage = renderedPages[renderedPages.length - 1];
                lastRenderedPage.scrollIntoView({ behavior: "smooth", block: "end" });
            }
            return null; 
        }

        content.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        let images = content.querySelectorAll("img");
        let imagesLoaded = Array.from(images).every(img => img.complete);
        let hasPlaceholder = content.querySelector(".pdfplaceholder");

        if (hasPlaceholder || !imagesLoaded) {
            console.log(`Page ${pagina} is still loading pixels...`);
            return null; 
        }

        return content.innerHTML + '<br>' + '\n';
    }

    function exibirStatusUI() {
        // If it already exists, don't create it again
        if (document.getElementById('automation-status')) return;

        const msg = document.createElement('div');
        msg.id = 'automation-status';
        msg.style = "position:fixed; top:20px; left:50%; transform:translateX(-50%); padding:15px; background:white; border:2px solid #4caf50; z-index:999999; font-family:sans-serif; box-shadow:0 4px 15px rgba(0,0,0,0.2); border-radius:8px;";
        msg.innerHTML = `<div id="status-text">Starting Automation...</div>
                         <button id="stop-btn" style="margin-top:10px; cursor:pointer; background:#f44336; color:white; border:none; padding:5px 10px; border-radius:4px;">Stop & Save HTML</button>`;
        
        // Attach to Document Element to prevent React from deleting it easily
        document.documentElement.appendChild(msg);

        // Bind button to the new decoupled function
        document.getElementById('stop-btn').onclick = () => compileAndSave('manual_stop');
    }

    async function startAutomation() {
        exibirStatusUI();

        let totalPages = 0;
        const paginationEl = document.querySelector('div[data-test-locator="pagination-total-chapter-numbers"]');
        if (paginationEl) {
            const matches = paginationEl.textContent.match(/\d+/g);
            if (matches) totalPages = parseInt(matches[0]);
        }

        let retryCount = 0; 

        async function processLoop(currentPage) {
            if (stopSearch || (totalPages > 0 && currentPage > totalPages)) {
                if (currentPage > totalPages && !stopSearch) await compileAndSave('Complete');
                return;
            }

            const db = await openIndexedDB();
            const lastSaved = await getLastProcessedIndex(db);

            // Continuity: Skip to the next uncaptured page
            if (currentPage <= lastSaved) {
                return processLoop(currentPage + 1);
            }

            const html = await procurarElementoEAutoRolar(currentPage);
            const statusLabel = document.getElementById('status-text');

            if (!html) {
                retryCount++; 
                
                if (retryCount > 30) {
                    console.error(`Page ${currentPage} completely stuck. Initiating auto-save...`);
                    await compileAndSave(currentPage - 1); // Save up to the last successful page
                    return;
                }

                if (statusLabel) statusLabel.textContent = `Waiting for Page ${currentPage}... (Attempt ${retryCount}/30)`;
                setTimeout(() => processLoop(currentPage), getJitterDelay(2500, 4000));
            } else {
                retryCount = 0; 
                
                if (statusLabel) statusLabel.textContent = `Captured Page ${currentPage} of ${totalPages || '?'}`;
                
                const key = `page_${currentPage.toString().padStart(5, '0')}`;
                await putTodoConteudo(db, key, html); 
                await putLastProcessedIndex(db, currentPage);
                
                if (totalPages > 0) enviarProgresso(Math.floor((currentPage / totalPages) * 100));

                setTimeout(() => processLoop(currentPage + 1), getJitterDelay(1000, 2500));
            }
        }

        processLoop(1);
    }

    // --- Database Boilerplate ---
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
