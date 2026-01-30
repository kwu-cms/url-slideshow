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
    copyUrlBtn: document.getElementById('copy-url-btn'),
    fsStartBtn: document.getElementById('fs-start-btn'),
    fsStopBtn: document.getElementById('fs-stop-btn'),
    fsExitBtn: document.getElementById('fs-exit-btn'),
    fsCurrentIndex: document.getElementById('fs-current-index'),
    fsTotalUrls: document.getElementById('fs-total-urls')
};

// URLリストの管理
function addUrl(url) {
    if (!url || !url.trim()) {
        return false;
    }

    // URLの正規化（http://またはhttps://がない場合は追加）
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'https://' + normalizedUrl;
    }

    state.urls.push(normalizedUrl);
    return true;
}

function addUrls(urlsText) {
    if (!urlsText || !urlsText.trim()) {
        return 0;
    }

    // 改行区切りで分割し、空行を除外
    const urlLines = urlsText.split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);

    if (urlLines.length === 0) {
        return 0;
    }

    let addedCount = 0;
    urlLines.forEach(url => {
        if (addUrl(url)) {
            addedCount++;
        }
    });

    if (addedCount > 0) {
        saveToLocalStorage();
        renderUrlList();
        updateDisplayInfo();
    }

    return addedCount;
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
    state.isFullscreen = true;
    document.body.classList.add('fullscreen-mode');
    elements.displayArea.classList.add('fullscreen-mode');
    return Promise.resolve();
}

function exitFullscreen() {
    state.isFullscreen = false;
    document.body.classList.remove('fullscreen-mode');
    elements.displayArea.classList.remove('fullscreen-mode');
}

function handleFullscreenChange() {
    // この関数は不要になったが、互換性のため残す
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

// URLパラメータの解析
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const result = {};
    
    // URLリストの取得（カンマ区切りまたは配列形式）
    const urlsParam = params.get('urls');
    if (urlsParam) {
        result.urls = urlsParam.split(',').map(url => {
            url = url.trim();
            // 二重エンコードされている場合に対応
            try {
                url = decodeURIComponent(url);
                // さらにエンコードされている可能性がある場合
                if (url.includes('%')) {
                    url = decodeURIComponent(url);
                }
            } catch (e) {
                // デコードに失敗した場合はそのまま使用
            }
            // URLの正規化
            if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            return url;
        }).filter(url => url);
    }
    
    // 表示時間の取得
    const displayTimeParam = params.get('displayTime') || params.get('time');
    if (displayTimeParam !== null) {
        const time = parseInt(displayTimeParam);
            if (!isNaN(time) && time > 0) {
                result.displayTime = time;
            }
    }
    
    // ループ再生の取得
    const loopParam = params.get('loop') || params.get('looping');
    if (loopParam !== null) {
        result.loop = loopParam === 'true' || loopParam === '1';
    }
    
    // フルスクリーンの取得
    const fullscreenParam = params.get('fullscreen');
    if (fullscreenParam !== null) {
        result.fullscreen = fullscreenParam === 'true' || fullscreenParam === '1';
    }
    
    // 再生状態の取得（playing, play, stateパラメータに対応）
    const playingParam = params.get('playing') || params.get('play') || params.get('state');
    if (playingParam !== null) {
        result.playing = playingParam === 'true' || playingParam === '1' || playingParam === 'playing';
    }
    
    return result;
}

function loadFromUrlParams() {
    const urlParams = getUrlParams();
    
    // URLリストの設定
    if (urlParams.urls && urlParams.urls.length > 0) {
        state.urls = urlParams.urls;
        saveToLocalStorage();
        renderUrlList();
        updateDisplayInfo();
    }
    
    // 表示時間の設定
    if (urlParams.displayTime !== undefined) {
        state.displayTime = urlParams.displayTime;
        elements.displayTime.value = urlParams.displayTime;
        saveToLocalStorage();
    }
    
    // ループ再生の設定
    if (urlParams.loop !== undefined) {
        state.isLooping = urlParams.loop;
        elements.loopCheckbox.checked = urlParams.loop;
        saveToLocalStorage();
    }
    
    // フルスクリーンと再生の設定
    const shouldFullscreen = urlParams.fullscreen === true;
    const shouldPlay = urlParams.playing === true && state.urls.length > 0;
    
    if (shouldFullscreen && shouldPlay) {
        // フルスクリーンと再生の両方が必要な場合
        // まずDOMの準備を待つ
        setTimeout(() => {
            enterFullscreen();
            // フルスクリーンが完了してから再生を開始
            setTimeout(() => {
                start();
            }, 100);
        }, 200);
    } else if (shouldFullscreen) {
        // フルスクリーンのみ
        setTimeout(() => {
            enterFullscreen();
        }, 200);
    } else if (shouldPlay) {
        // 再生のみ
        setTimeout(() => {
            start();
        }, 200);
    }
}

// 現在の設定をURLパラメータ形式で取得（フルスクリーン再生用）
function getFullscreenPlaybackUrlParams() {
    const params = new URLSearchParams();
    
    // URLリスト（必須）
    if (state.urls.length === 0) {
        return null;
    }
    const encodedUrls = state.urls.map(url => encodeURIComponent(url)).join(',');
    params.set('urls', encodedUrls);
    
    // 表示時間
    if (state.displayTime !== 5) {
        params.set('displayTime', state.displayTime.toString());
    }
    
    // ループ再生
    if (state.isLooping !== true) {
        params.set('loop', state.isLooping.toString());
    }
    
    // フルスクリーンと再生を常に含める
    params.set('fullscreen', 'true');
    params.set('playing', 'true');
    
    return params.toString();
}

// 現在の設定をクリップボードにコピー（フルスクリーン再生用）
function copyCurrentUrlToClipboard() {
    const params = getFullscreenPlaybackUrlParams();
    
    if (!params) {
        alert('URLが設定されていません。URLを追加してからコピーしてください。');
        return;
    }
    
    const baseUrl = window.location.origin + window.location.pathname;
    const fullUrl = `${baseUrl}?${params}`;
    
    navigator.clipboard.writeText(fullUrl).then(() => {
        // フィードバックを表示（簡単なアラートまたはボタンのテキスト変更）
        const originalText = elements.copyUrlBtn.textContent;
        elements.copyUrlBtn.textContent = 'コピーしました！';
        elements.copyUrlBtn.style.background = '#28a745';
        setTimeout(() => {
            elements.copyUrlBtn.textContent = originalText;
            elements.copyUrlBtn.style.background = '';
        }, 2000);
    }).catch(err => {
        alert('クリップボードへのコピーに失敗しました: ' + err.message);
    });
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
    const inputValue = elements.urlInput.value;
    if (!inputValue || !inputValue.trim()) {
        alert('URLを入力してください');
        return;
    }
    
    const addedCount = addUrls(inputValue);
    if (addedCount > 0) {
        elements.urlInput.value = '';
        elements.urlInput.focus();
    } else {
        alert('有効なURLが見つかりませんでした');
    }
});

elements.urlInput.addEventListener('keydown', (e) => {
    // Ctrl+EnterまたはCmd+Enterで追加
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const inputValue = elements.urlInput.value;
        if (!inputValue || !inputValue.trim()) {
            return;
        }
        
        const addedCount = addUrls(inputValue);
        if (addedCount > 0) {
            elements.urlInput.value = '';
            elements.urlInput.focus();
        }
    }
});

elements.displayTime.addEventListener('change', () => {
    state.displayTime = parseInt(elements.displayTime.value) || 5;
    saveToLocalStorage();
});

elements.loopCheckbox.addEventListener('change', () => {
    state.isLooping = elements.loopCheckbox.checked;
    saveToLocalStorage();
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
    elements.fsExitBtn.addEventListener('click', () => {
        exitFullscreen();
    });
}

elements.copyUrlBtn.addEventListener('click', copyCurrentUrlToClipboard);
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

// フルスクリーン変更の監視（不要になったが互換性のため残す）

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

// URLパラメータの読み込み（ローカルストレージより優先）
loadFromUrlParams();
