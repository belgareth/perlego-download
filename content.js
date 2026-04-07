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
            async function rolarEProcessar(pagina)
