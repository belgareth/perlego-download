(function() {
    let stopSearch = false;

    function enviarProgresso(progress) {
        chrome.runtime.sendMessage({ type: 'progressUpdate', progress: progress });
    }

    // This function implements your scrolling logic and checks if the page is fully loaded
    async function procurarElementoEAutoRolar(pagina) {
        // First try the selector you provided for your specific book
        let content = document.querySelector(`div[data-chapterid='${pagina}']`);
        
        // Fallback to the original extension's ID format if the chapterid isn't found
        if (!content) {
            content = document.getElementById(`p${pagina}--0`);
        }

        if (!content) {
            console.warn(`Page ${pagina} not in DOM yet... Scrolling to trigger lazy load.`);
            window.scrollTo(0, document.body.scrollHeight); 
            return null;
        }

        // Auto-scroll logic from your snippet
        content.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        // Check for "Lazy Loading" states (the .pdfplaceholder and image status)
        let images = content.querySelectorAll("img");
        let imagesLoaded = Array.from(images).every(img => img.complete);
        let hasPlaceholder = content.querySelector(".pdfplaceholder");

        if (hasPlaceholder || !imagesLoaded) {
            console.log(`Waiting for page ${pagina} to fully load...`);
            return null; 
        }

        return content.innerHTML + '<br>' + '\n';
    }

    async function downloadResultados(resultados, nomeArquivo) {
        const blob = new Blob(resultados, { type: 'text/html' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = nomeArquivo;
        link.click();
        clearIndexedDB();
    }

    async function exibirMensagemInicial(pagefinal) {
        const mensagemElement = document.createElement('div');
        mensagemElement.style.position = 'fixed';
        mensagemElement.style.top = '10%'; 
        mensagemElement.style.left = '50%';
        mensagemElement.style.transform = 'translate(-50%, -50%)';
        mensagemElement.style.padding = '15px';
        mensagemElement.style.background = '#ffffff';
        mensagemElement.style.border = '2px solid #4caf50';
        mensagemElement.style.zIndex = '10000';
        mensagemElement.style.fontWeight = 'bold';
        mensagemElement.id = 'mensagem';
        document.body.appendChild(mensagemElement);
        return mensagemElement;
    }

    async function startSearchingAndSaving() {
        try {
            // Identify total pages from the UI
            var elementoPaginacao = document.querySelector('div[data-test-locator="pagination-total-chapter-numbers"]');
            var pagefinal = 0;
            if (elementoPaginacao) {
                var numeros = elementoPaginacao.textContent.match(/\d+/g);
                if (numeros) pagefinal = parseInt(numeros[0]);
            }

            const mensagemInicial = await exibirMensagemInicial(pagefinal);

            let stopButton = document.createElement('button');
            stopButton.textContent = 'Stop and Save Progress';
            stopButton.style.position = 'fixed';
            stopButton.style.top = '15%';
            stopButton.style.left = '50%';
            stopButton.style.transform = 'translateX(-50%)';
            stopButton.style.zIndex = '10001';
            stopButton.style.padding = '10px';
            document.body.appendChild(stopButton);

            stopButton.addEventListener('click', async () => {
                stopSearch = true;
                stopButton.remove();
                document.getElementById('mensagem')?.remove();
                
                const db = await openIndexedDB();
                const allKeys = await getAllKeys(db);
                let combinedContent = ["<!DOCTYPE html><html><head><style>img{max-width:100%;} body{font-family:sans-serif;}</style></head><body>"];

                for (const key of allKeys) {
                    if (key === 'lastProcessedIndex') continue;
                    const content = await getTodoConteudoByKey(db, key);
                    if (content) combinedContent.push(content);
                }
                
                combinedContent.push("</body></html>");
                await downloadResultados(combinedContent, 'perlego_book.html');
            });

            // The main automated loop
            async function rolarEProcessar(pagina) {
                if (stopSearch || (pagefinal > 0 && pagina > pagefinal)) {
                    if (pagefinal > 0 && pagina > pagefinal) stopButton.click();
                    return;
                }

                const db = await openIndexedDB();
                const lastProcessed = await getLastProcessedIndex(db);

                // Skip if already in database (Continuity feature)
                if (pagina <= lastProcessed) {
                    return rolarEProcessar(pagina + 1);
                }

                const conteudo = await procurarElementoEAutoRolar(pagina);
                const msg = document.getElementById('mensagem');

                if (!conteudo) {
                    if (msg) msg.textContent = `Auto-Scrolling: Page ${pagina}/${pagefinal} loading...`;
                    // Retry after 3 seconds as in your original snippet
                    setTimeout(() => rolarEProcessar(pagina), 3000);
                } else {
                    if (msg) msg.textContent = `Captured Page ${pagina}/${pagefinal}`;
                    
                    const progresso = Math.floor((pagina / pagefinal) * 100);
                    enviarProgresso(progresso);

                    // Save each page to IndexedDB to keep memory usage low
                    const key = `p${pagina.toString().padStart(5, '0')}`;
                    await putTodoConteudo(db, key, [conteudo]);
                    await putLastProcessedIndex(db, pagina);

                    // Delay before next page to prevent browser hang
                    setTimeout(() => rolarEProcessar(pagina + 1), 1000);
                }
            }

            rolarEProcessar(1);
        } catch (error) {
            console.error("Automation error:", error);
        }
    }

    // --- Database Helpers (Preserving original IndexedDB logic) ---

    async function openIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = window.indexedDB.open('MeuBancoDeDados', 1);
            request.onupgradeneeded = (e) => e.target.result.createObjectStore('conteudo');
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.error);
        });
    }

    async function putTodoConteudo(db, key, content) {
        return new Promise((resolve) => {
            const trans = db.transaction(['conteudo'], 'readwrite');
            trans.objectStore('conteudo').put(content, key);
            trans.oncomplete = () => resolve();
        });
    }

    async function getTodoConteudoByKey(db, key) {
        return new Promise((resolve) => {
            const request = db.transaction(['conteudo'], 'readonly').objectStore('conteudo').get(key);
            request.onsuccess = (e) => resolve(e.target.result);
        });
    }

    async function getAllKeys(db) {
        return new Promise((resolve) => {
            const request = db.transaction(['conteudo'], 'readonly').objectStore('conteudo').getAllKeys();
            request.onsuccess = (e) => resolve(e.target.result.sort());
        });
    }

    async function getLastProcessedIndex(db) {
        return new Promise((resolve) => {
            const request = db.transaction(['conteudo'], 'readonly').objectStore('conteudo').get('lastProcessedIndex');
            request.onsuccess = (e) => resolve(e.target.result || 0);
        });
    }

    async function putLastProcessedIndex(db, index) {
        return new Promise((resolve) => {
            const trans = db.transaction(['conteudo'], 'readwrite');
            trans.objectStore('conteudo').put(index, 'lastProcessedIndex');
            trans.oncomplete = () => resolve();
        });
    }

    async function clearIndexedDB() {
        const db = await openIndexedDB();
        db.transaction(['conteudo'], 'readwrite').objectStore('conteudo').clear();
    }

    startSearchingAndSaving();
})();
