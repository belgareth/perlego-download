function updateProgressBar(progress) {
  const progressBar = document.getElementById('progress');
  progressBar.style.width = progress + '%';
}

function showProgressBar() {
  const progressBar = document.getElementById('progressBar');
  progressBar.style.display = 'block';
}

// THE FIX: Listen for updates, and FORCE the bar to show if it's hidden
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => { 
  if (message.type === 'progressUpdate') {
    showProgressBar(); 
    updateProgressBar(message.progress);
  }
});

document.getElementById('executar').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'startScript' });
  showProgressBar();
});

document.getElementById('manual').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'startScriptmanual' });
  console.log('Manual');
  showProgressBar();
});

document.getElementById('clear').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'resetAndStartCapture' });
  console.log('clear');
});
