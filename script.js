// アプリケーションの状態管理
const state = {
    urls: [],
    currentIndex: 0,
    displayTime: 5,
    isLooping: true,
    isPlaying: false,
    timer: null,
    isFullscreen: false
};

// DOM要素の取得
const elements = {
    urlInput: document.getElementById('url-input'),
    addUrlBtn: document.getElementById('add-url-btn'),
    urlList: document.getElementById('url-list'),
    displayTime: document.getElementById('display-time'),
    loopCheckbox: document.getElementById('loop-checkbox'),
    startBtn: document.getElementById('start-btn'),
    stopBtn: document.getElementById('stop-btn'),
    fullscreenBtn: document.getElementById('fullscreen-btn'),
    contentFrame: document.getElementById('content-frame'),
    currentIndex: document.getElementById('current-index'),
    totalUrls: document.getElementById('total-urls'),
    displayArea: document.getElementById('display-area'),
    exportBtn: document.getElementById('export-btn'),
    importBtn: document.getElementById('import-btn'),
    importFile: document.getElementById('import-file'),
    fsStartBtn: document.getElementById('fs-start-btn'),
    fsStopBtn: document.getElementById('fs-stop-btn'),
    fsExitBtn: document.getElementById('fs-exit-btn'),
    fsCurrentIndex: document.getElementById('fs-current-index'),
    fsTotalUrls: document.getElementById('fs-total-urls')
};

// URLリストの管理
function addUrl(url) {
    if (!url || !url.trim()) {
        alert('URLを入力してください');
        return;
    }

    // URLの正規化（http://またはhttps://がない場合は追加）
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'https://' + normalizedUrl;
    }

    state.urls.push(normalizedUrl);
    saveToLocalStorage();
    renderUrlList();
    updateDisplayInfo();
}

function removeUrl(index) {
    if (confirm('このURLを削除しますか？')) {
        state.urls.splice(index, 1);
        if (state.currentIndex >= state.urls.length) {
            state.currentIndex = Math.max(0, state.urls.length - 1);
        }
        saveToLocalStorage();
        renderUrlList();
        updateDisplayInfo();
        if (state.urls.length === 0) {
            stop();
        }
    }
}

function moveUrl(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= state.urls.length) {
        return;
    }

    [state.urls[index], state.urls[newIndex]] = [state.urls[newIndex], state.urls[index]];
    
    // 現在表示中のURLのインデックスを更新
    if (state.currentIndex === index) {
        state.currentIndex = newIndex;
    } else if (state.currentIndex === newIndex) {
        state.currentIndex = index;
    }

    saveToLocalStorage();
    renderUrlList();
    updateDisplayInfo();
}

function renderUrlList() {
    if (state.urls.length === 0) {
        elements.urlList.innerHTML = '<p class="empty-message">URLがありません</p>';
        return;
    }

    elements.urlList.innerHTML = state.urls.map((url, index) => {
        const isActive = index === state.currentIndex && state.isPlaying;
        return `
            <div class="url-item ${isActive ? 'active' : ''}">
                <span class="url-text">${url}</span>
                <div class="url-controls">
                    <button class="btn btn-small btn-secondary" onclick="moveUrl(${index}, -1)" ${index === 0 ? 'disabled' : ''}>↑</button>
                    <button class="btn btn-small btn-secondary" onclick="moveUrl(${index}, 1)" ${index === state.urls.length - 1 ? 'disabled' : ''}>↓</button>
                    <button class="btn btn-small btn-danger" onclick="removeUrl(${index})">削除</button>
                </div>
            </div>
        `;
    }).join('');
}

function updateDisplayInfo() {
    elements.currentIndex.textContent = state.currentIndex + 1;
    elements.totalUrls.textContent = state.urls.length;
    if (elements.fsCurrentIndex && elements.fsTotalUrls) {
        elements.fsCurrentIndex.textContent = state.currentIndex + 1;
        elements.fsTotalUrls.textContent = state.urls.length;
    }
}

// 表示制御
function showUrl(index) {
    if (state.urls.length === 0 || index < 0 || index >= state.urls.length) {
        return;
    }

    state.currentIndex = index;
    elements.contentFrame.src = state.urls[index];
    updateDisplayInfo();
    renderUrlList();
}

function nextUrl() {
    if (state.urls.length === 0) {
        return;
    }

    state.currentIndex++;
    
    if (state.currentIndex >= state.urls.length) {
        if (state.isLooping) {
            state.currentIndex = 0;
        } else {
            stop();
            return;
        }
    }

    showUrl(state.currentIndex);
}

function start() {
    if (state.urls.length === 0) {
        alert('URLを追加してください');
        return;
    }

    state.isPlaying = true;
    state.displayTime = parseInt(elements.displayTime.value) || 5;
    state.isLooping = elements.loopCheckbox.checked;

    elements.startBtn.disabled = true;
    elements.stopBtn.disabled = false;
    if (elements.fsStartBtn) elements.fsStartBtn.disabled = true;
    if (elements.fsStopBtn) elements.fsStopBtn.disabled = false;
    elements.displayTime.disabled = true;
    elements.loopCheckbox.disabled = true;

    // 最初のURLを表示
    if (state.currentIndex >= state.urls.length) {
        state.currentIndex = 0;
    }
    showUrl(state.currentIndex);

    // タイマーを開始
    state.timer = setInterval(() => {
        nextUrl();
    }, state.displayTime * 1000);

    renderUrlList();
}

function stop() {
    state.isPlaying = false;

    if (state.timer) {
        clearInterval(state.timer);
        state.timer = null;
    }

    elements.startBtn.disabled = false;
    elements.stopBtn.disabled = true;
    if (elements.fsStartBtn) elements.fsStartBtn.disabled = false;
    if (elements.fsStopBtn) elements.fsStopBtn.disabled = true;
    elements.displayTime.disabled = false;
    elements.loopCheckbox.disabled = false;

    renderUrlList();
}

// フルスクリーン機能
function toggleFullscreen() {
    if (!state.isFullscreen) {
        enterFullscreen();
    } else {
        exitFullscreen();
    }
}

function enterFullscreen() {
    if (elements.displayArea.requestFullscreen) {
        elements.displayArea.requestFullscreen();
    } else if (elements.displayArea.webkitRequestFullscreen) {
        elements.displayArea.webkitRequestFullscreen();
    } else if (elements.displayArea.mozRequestFullScreen) {
        elements.displayArea.mozRequestFullScreen();
    } else if (elements.displayArea.msRequestFullscreen) {
        elements.displayArea.msRequestFullscreen();
    }
}

function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
}

function handleFullscreenChange() {
    state.isFullscreen = !!(document.fullscreenElement || 
                            document.webkitFullscreenElement || 
                            document.mozFullScreenElement || 
                            document.msFullscreenElement);
    
    if (state.isFullscreen) {
        elements.displayArea.classList.add('fullscreen-mode');
    } else {
        elements.displayArea.classList.remove('fullscreen-mode');
    }
}

// エクスポート/インポート機能
function exportData() {
    const data = {
        urls: state.urls,
        displayTime: state.displayTime,
        isLooping: state.isLooping
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `url-slideshow-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importData(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (data.urls && Array.isArray(data.urls)) {
                state.urls = data.urls;
                if (data.displayTime) {
                    state.displayTime = data.displayTime;
                    elements.displayTime.value = data.displayTime;
                }
                if (typeof data.isLooping === 'boolean') {
                    state.isLooping = data.isLooping;
                    elements.loopCheckbox.checked = data.isLooping;
                }
                
                state.currentIndex = 0;
                saveToLocalStorage();
                renderUrlList();
                updateDisplayInfo();
                
                if (state.isPlaying) {
                    stop();
                }
                
                alert('データをインポートしました');
            } else {
                alert('無効なデータ形式です');
            }
        } catch (error) {
            alert('ファイルの読み込みに失敗しました: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// ローカルストレージ機能
function saveToLocalStorage() {
    const data = {
        urls: state.urls,
        displayTime: state.displayTime,
        isLooping: state.isLooping
    };
    localStorage.setItem('urlSlideshowData', JSON.stringify(data));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('urlSlideshowData');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            if (data.urls && Array.isArray(data.urls)) {
                state.urls = data.urls;
            }
            if (data.displayTime) {
                state.displayTime = data.displayTime;
                elements.displayTime.value = data.displayTime;
            }
            if (typeof data.isLooping === 'boolean') {
                state.isLooping = data.isLooping;
                elements.loopCheckbox.checked = data.isLooping;
            }
        } catch (error) {
            console.error('ローカルストレージの読み込みに失敗しました:', error);
        }
    }
}

// イベントリスナーの設定
elements.addUrlBtn.addEventListener('click', () => {
    addUrl(elements.urlInput.value);
    elements.urlInput.value = '';
    elements.urlInput.focus();
});

elements.urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addUrl(elements.urlInput.value);
        elements.urlInput.value = '';
    }
});

elements.startBtn.addEventListener('click', start);
elements.stopBtn.addEventListener('click', stop);

elements.fullscreenBtn.addEventListener('click', toggleFullscreen);

if (elements.fsStartBtn) {
    elements.fsStartBtn.addEventListener('click', start);
}
if (elements.fsStopBtn) {
    elements.fsStopBtn.addEventListener('click', stop);
}
if (elements.fsExitBtn) {
    elements.fsExitBtn.addEventListener('click', exitFullscreen);
}

elements.exportBtn.addEventListener('click', exportData);
elements.importBtn.addEventListener('click', () => {
    elements.importFile.click();
});

elements.importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        importData(file);
        e.target.value = ''; // 同じファイルを再度選択できるようにリセット
    }
});

// フルスクリーン変更の監視
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
document.addEventListener('mozfullscreenchange', handleFullscreenChange);
document.addEventListener('MSFullscreenChange', handleFullscreenChange);

// ESCキーでフルスクリーン解除（ブラウザのデフォルト動作を利用）

// キーボードショートカット
document.addEventListener('keydown', (e) => {
    // スペースキーで開始/停止（フォーカスがinput要素にない場合）
    if (e.key === ' ' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (state.isPlaying) {
            stop();
        } else {
            start();
        }
    }
    
    // ESCキーでフルスクリーン解除（ブラウザのデフォルト動作）
});

// グローバルスコープに移動関数を公開（onclick属性から呼び出すため）
window.moveUrl = moveUrl;
window.removeUrl = removeUrl;

// 初期化
loadFromLocalStorage();
renderUrlList();
updateDisplayInfo();
