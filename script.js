// ============================================================================
// 定数定義
// ============================================================================
const CONSTANTS = {
    UI_HIDE_DELAY: 5000, // 5秒（ミリ秒）
    DEFAULT_DISPLAY_TIME: 5,
    STORAGE_KEY: 'urlSlideshowData',
    URL_PREFIX: 'https://',
    EMPTY_MESSAGE: 'URLを追加してください'
};

const SELECTORS = {
    fullscreenOverlay: '#fullscreen-overlay',
    statusIndicator: '#status-indicator',
    statusText: '#status-text'
};

// ============================================================================
// アプリケーションの状態管理
// ============================================================================
const state = {
    urls: [],
    currentIndex: 0,
    displayTime: CONSTANTS.DEFAULT_DISPLAY_TIME,
    isLooping: true,
    isPlaying: false,
    timer: null,
    isFullscreen: false,
    uiHideTimer: null
};

// ============================================================================
// DOM要素の取得
// ============================================================================
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
    clearBtn: document.getElementById('clear-btn'),
    fsStartBtn: document.getElementById('fs-start-btn'),
    fsStopBtn: document.getElementById('fs-stop-btn'),
    fsExitBtn: document.getElementById('fs-exit-btn'),
    fsCurrentIndex: document.getElementById('fs-current-index'),
    fsTotalUrls: document.getElementById('fs-total-urls'),
    helpBtn: document.getElementById('help-btn'),
    helpModal: document.getElementById('help-modal'),
    helpModalClose: document.getElementById('help-modal-close')
};

// ============================================================================
// ユーティリティ関数
// ============================================================================

/**
 * URLを正規化（プロトコルがない場合は追加）
 */
function normalizeUrl(url) {
    if (!url || !url.trim()) {
        return null;
    }
    
    let normalized = url.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
        normalized = CONSTANTS.URL_PREFIX + normalized;
    }
    return normalized;
}

/**
 * フルスクリーンオーバーレイ要素を取得
 */
function getFullscreenOverlay() {
    return document.querySelector(SELECTORS.fullscreenOverlay);
}

/**
 * UI更新処理を一括実行
 */
function updateUI() {
    renderUrlList();
    updateDisplayInfo();
    updateStatusDisplay();
    updateFullscreenButtonState();
}

// ============================================================================
// URLリストの管理
// ============================================================================

/**
 * 単一のURLを追加
 */
function addUrl(url) {
    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) {
        return false;
    }
    state.urls.push(normalizedUrl);
    return true;
}

/**
 * 複数のURLを追加（改行区切り）
 */
function addUrls(urlsText) {
    if (!urlsText || !urlsText.trim()) {
        return 0;
    }

    const urlLines = urlsText
        .split(/\r?\n/)
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
        updateUI();
    }

    return addedCount;
}

/**
 * URLを削除
 */
function removeUrl(index) {
    if (!confirm('このURLを削除しますか？')) {
        return;
    }

    state.urls.splice(index, 1);
    
    // 現在のインデックスを調整
    if (state.currentIndex >= state.urls.length) {
        state.currentIndex = Math.max(0, state.urls.length - 1);
    }

    saveToLocalStorage();
    updateUI();

    if (state.urls.length === 0) {
        stop();
    }
}

/**
 * URLの順序を変更
 */
function moveUrl(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= state.urls.length) {
        return;
    }

    // URLを入れ替え
    [state.urls[index], state.urls[newIndex]] = [state.urls[newIndex], state.urls[index]];

    // 現在表示中のURLのインデックスを更新
    if (state.currentIndex === index) {
        state.currentIndex = newIndex;
    } else if (state.currentIndex === newIndex) {
        state.currentIndex = index;
    }

    saveToLocalStorage();
    updateUI();
}

/**
 * URLリストをレンダリング
 */
function renderUrlList() {
    if (state.urls.length === 0) {
        elements.urlList.innerHTML = `<p class="empty-message">${CONSTANTS.EMPTY_MESSAGE}</p>`;
        return;
    }

    elements.urlList.innerHTML = state.urls.map((url, index) => {
        const isActive = index === state.currentIndex && state.isPlaying;
        const isFirst = index === 0;
        const isLast = index === state.urls.length - 1;
        
        return `
            <div class="url-item ${isActive ? 'active' : ''}">
                <span class="url-text">${url}</span>
                <div class="url-controls">
                    <button class="btn btn-small btn-secondary" onclick="moveUrl(${index}, -1)" ${isFirst ? 'style="display:none"' : ''}>
                        <i class="fas fa-arrow-up"></i>
                    </button>
                    <button class="btn btn-small btn-secondary" onclick="moveUrl(${index}, 1)" ${isLast ? 'style="display:none"' : ''}>
                        <i class="fas fa-arrow-down"></i>
                    </button>
                    <button class="btn btn-small btn-secondary" onclick="removeUrl(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================================================
// UI更新関数
// ============================================================================

/**
 * 表示情報を更新
 */
function updateDisplayInfo() {
    const current = state.currentIndex + 1;
    const total = state.urls.length;
    
    elements.currentIndex.textContent = current;
    elements.totalUrls.textContent = total;
    
    if (elements.fsCurrentIndex && elements.fsTotalUrls) {
        elements.fsCurrentIndex.textContent = current;
        elements.fsTotalUrls.textContent = total;
    }
    
    updateFullscreenButtonState();
}

/**
 * フルスクリーンボタンの状態を更新
 */
function updateFullscreenButtonState() {
    if (!elements.fullscreenBtn) return;
    
    elements.fullscreenBtn.style.display = state.urls.length === 0 ? 'none' : 'inline-flex';
}

/**
 * ステータス表示を更新
 */
function updateStatusDisplay() {
    const statusIndicator = document.querySelector(SELECTORS.statusIndicator);
    const statusText = document.querySelector(SELECTORS.statusText);
    
    if (!statusIndicator || !statusText) return;

    if (state.isPlaying) {
        statusIndicator.classList.add('playing');
        statusText.textContent = '再生中';
    } else {
        statusIndicator.classList.remove('playing');
        statusText.textContent = '停止中';
    }
}

// ============================================================================
// 表示制御
// ============================================================================

/**
 * URLを表示
 */
function showUrl(index) {
    if (state.urls.length === 0 || index < 0 || index >= state.urls.length) {
        return;
    }

    state.currentIndex = index;
    elements.contentFrame.src = state.urls[index];
    updateDisplayInfo();
    renderUrlList();
}

/**
 * 次のURLに移動
 */
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

/**
 * スライドショーを開始
 */
function start() {
    if (state.urls.length === 0) {
        alert('URLを追加してください');
        return;
    }

    state.isPlaying = true;
    state.displayTime = parseInt(elements.displayTime.value) || CONSTANTS.DEFAULT_DISPLAY_TIME;
    state.isLooping = elements.loopCheckbox.checked;

    // ボタンの状態を更新
    updatePlaybackButtons(true);

    // 最初のURLを表示
    if (state.currentIndex >= state.urls.length) {
        state.currentIndex = 0;
    }
    showUrl(state.currentIndex);

    // タイマーを開始
    state.timer = setInterval(() => {
        nextUrl();
    }, state.displayTime * 1000);

    // フルスクリーン中で再生開始した場合、UI非表示タイマーを開始
    if (state.isFullscreen) {
        startUIHideTimer();
    }

    renderUrlList();
}

/**
 * スライドショーを停止
 */
function stop() {
    state.isPlaying = false;

    // タイマーをクリア
    if (state.timer) {
        clearInterval(state.timer);
        state.timer = null;
    }

    // UI非表示タイマーをクリア
    clearUIHideTimer();

    // フルスクリーン中の場合、UIを表示状態に戻す
    if (state.isFullscreen) {
        const overlay = getFullscreenOverlay();
        if (overlay) {
            overlay.classList.remove('fade-out');
        }
    }

    // ボタンの状態を更新
    updatePlaybackButtons(false);

    updateStatusDisplay();
    renderUrlList();
}

/**
 * 再生/停止ボタンの状態を更新
 */
function updatePlaybackButtons(isPlaying) {
    elements.startBtn.style.display = isPlaying ? 'none' : 'inline-flex';
    elements.stopBtn.style.display = isPlaying ? 'inline-flex' : 'none';
    elements.stopBtn.disabled = !isPlaying;
    
    if (elements.fsStartBtn) elements.fsStartBtn.disabled = isPlaying;
    if (elements.fsStopBtn) elements.fsStopBtn.disabled = !isPlaying;
    
    elements.displayTime.disabled = isPlaying;
    elements.loopCheckbox.disabled = isPlaying;
}

// ============================================================================
// フルスクリーン機能
// ============================================================================

/**
 * フルスクリーンを切り替え
 */
function toggleFullscreen() {
    if (!state.isFullscreen) {
        enterFullscreen();
    } else {
        exitFullscreen();
    }
}

/**
 * フルスクリーンに入る
 */
function enterFullscreen() {
    state.isFullscreen = true;
    document.body.classList.add('fullscreen-mode');
    elements.displayArea.classList.add('fullscreen-mode');

    // マウス移動イベントリスナーを追加
    document.addEventListener('mousemove', handleMouseMove);

    // フルスクリーンオーバーレイのイベントリスナーを設定
    setTimeout(() => {
        setupFullscreenUIEvents();
    }, 100);

    // フルスクリーン時に自動的に再生開始（URLが設定されている場合）
    if (state.urls.length > 0 && !state.isPlaying) {
        setTimeout(() => {
            start();
        }, 100);
    } else if (state.isPlaying) {
        // 既に再生中の場合は、UI非表示タイマーを開始
        startUIHideTimer();
    }
}

/**
 * フルスクリーンを解除
 */
function exitFullscreen() {
    // フルスクリーン解除時に自動的に停止
    if (state.isPlaying) {
        stop();
    }

    // UI非表示タイマーをクリア
    clearUIHideTimer();

    // マウス移動イベントリスナーを削除
    document.removeEventListener('mousemove', handleMouseMove);

    state.isFullscreen = false;
    document.body.classList.remove('fullscreen-mode');
    elements.displayArea.classList.remove('fullscreen-mode');

    // UIを表示状態に戻す
    const overlay = getFullscreenOverlay();
    if (overlay) {
        overlay.classList.remove('fade-out');
    }
}

// ============================================================================
// UI自動非表示機能
// ============================================================================

/**
 * UI非表示タイマーを開始
 */
function startUIHideTimer() {
    clearUIHideTimer();

    // フルスクリーン中で再生中の場合のみタイマーを開始
    if (state.isFullscreen && state.isPlaying) {
        state.uiHideTimer = setTimeout(() => {
            const overlay = getFullscreenOverlay();
            if (overlay) {
                overlay.classList.add('fade-out');
            }
        }, CONSTANTS.UI_HIDE_DELAY);
    }
}

/**
 * UI非表示タイマーをクリア
 */
function clearUIHideTimer() {
    if (state.uiHideTimer) {
        clearTimeout(state.uiHideTimer);
        state.uiHideTimer = null;
    }
}

/**
 * フルスクリーンUIを表示
 */
function showFullscreenUI() {
    const overlay = getFullscreenOverlay();
    if (overlay) {
        overlay.classList.remove('fade-out');
    }
    // UIを表示したら、5秒後に再び非表示にするタイマーを開始
    startUIHideTimer();
}

/**
 * マウス移動時のハンドラ
 */
function handleMouseMove() {
    showFullscreenUI();
}

/**
 * フルスクリーンオーバーレイのイベントリスナーを設定
 */
function setupFullscreenUIEvents() {
    const overlay = getFullscreenOverlay();
    if (overlay) {
        overlay.addEventListener('mouseenter', showFullscreenUI);
        overlay.addEventListener('mousemove', showFullscreenUI);
    }
}

// ============================================================================
// エクスポート/インポート機能
// ============================================================================

/**
 * データをエクスポート
 */
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

/**
 * データをインポート
 */
function importData(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);

            if (!data.urls || !Array.isArray(data.urls)) {
                alert('無効なデータ形式です');
                return;
            }

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
            updateUI();

            if (state.isPlaying) {
                stop();
            }

            alert('データをインポートしました');
        } catch (error) {
            alert('ファイルの読み込みに失敗しました: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// ============================================================================
// URLパラメータ機能
// ============================================================================

/**
 * URLパラメータを解析
 */
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const result = {};

    // URLリストの取得
    const urlsParam = params.get('urls');
    if (urlsParam) {
        result.urls = urlsParam.split(',').map(url => {
            url = url.trim();
            // 二重エンコードされている場合に対応
            try {
                url = decodeURIComponent(url);
                if (url.includes('%')) {
                    url = decodeURIComponent(url);
                }
            } catch (e) {
                // デコードに失敗した場合はそのまま使用
            }
            return normalizeUrl(url);
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

    // 再生状態の取得
    const playingParam = params.get('playing') || params.get('play') || params.get('state');
    if (playingParam !== null) {
        result.playing = playingParam === 'true' || playingParam === '1' || playingParam === 'playing';
    }

    return result;
}

/**
 * URLパラメータから設定を読み込み
 */
function loadFromUrlParams() {
    const urlParams = getUrlParams();

    // URLリストの設定
    if (urlParams.urls && urlParams.urls.length > 0) {
        state.urls = urlParams.urls;
        saveToLocalStorage();
        updateUI();
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
        setTimeout(() => {
            enterFullscreen();
            setTimeout(() => {
                start();
            }, 100);
        }, 200);
    } else if (shouldFullscreen) {
        setTimeout(() => {
            enterFullscreen();
        }, 200);
    } else if (shouldPlay) {
        setTimeout(() => {
            start();
        }, 200);
    }
}

/**
 * フルスクリーン再生用のURLパラメータを取得
 */
function getFullscreenPlaybackUrlParams() {
    const params = new URLSearchParams();

    // URLリスト（必須）
    if (state.urls.length === 0) {
        return null;
    }
    const encodedUrls = state.urls.map(url => encodeURIComponent(url)).join(',');
    params.set('urls', encodedUrls);

    // 表示時間
    if (state.displayTime !== CONSTANTS.DEFAULT_DISPLAY_TIME) {
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

/**
 * 現在の設定をクリップボードにコピー
 */
function copyCurrentUrlToClipboard() {
    const params = getFullscreenPlaybackUrlParams();

    if (!params) {
        alert('URLが設定されていません。URLを追加してからコピーしてください。');
        return;
    }

    const baseUrl = window.location.origin + window.location.pathname;
    const fullUrl = `${baseUrl}?${params}`;

    navigator.clipboard.writeText(fullUrl).then(() => {
        // フィードバックを表示
        const originalHTML = elements.copyUrlBtn.innerHTML;
        elements.copyUrlBtn.innerHTML = 'コピーしました！ <i class="fas fa-check"></i>';
        elements.copyUrlBtn.style.background = '#28a745';
        setTimeout(() => {
            elements.copyUrlBtn.innerHTML = originalHTML;
            elements.copyUrlBtn.style.background = '';
        }, 3000);
    }).catch(err => {
        alert('クリップボードへのコピーに失敗しました: ' + err.message);
    });
}

// ============================================================================
// 設定管理
// ============================================================================

/**
 * 設定をクリア（初期状態に戻す）
 */
function clearSettings() {
    if (!confirm('すべての設定をクリアして初期状態に戻しますか？')) {
        return;
    }

    // 再生を停止
    if (state.isPlaying) {
        stop();
    }

    // フルスクリーンを解除
    if (state.isFullscreen) {
        exitFullscreen();
    }

    // 状態を初期値にリセット
    state.urls = [];
    state.currentIndex = 0;
    state.displayTime = CONSTANTS.DEFAULT_DISPLAY_TIME;
    state.isLooping = true;

    // UI要素をリセット
    elements.displayTime.value = CONSTANTS.DEFAULT_DISPLAY_TIME;
    elements.loopCheckbox.checked = true;
    elements.urlInput.value = '';

    // ローカルストレージをクリア
    localStorage.removeItem(CONSTANTS.STORAGE_KEY);

    // UIを更新
    updateUI();
}

// ============================================================================
// ローカルストレージ機能
// ============================================================================

/**
 * ローカルストレージに保存
 */
function saveToLocalStorage() {
    const data = {
        urls: state.urls,
        displayTime: state.displayTime,
        isLooping: state.isLooping
    };
    localStorage.setItem(CONSTANTS.STORAGE_KEY, JSON.stringify(data));
}

/**
 * ローカルストレージから読み込み
 */
function loadFromLocalStorage() {
    const saved = localStorage.getItem(CONSTANTS.STORAGE_KEY);
    if (!saved) {
        return;
    }

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

// ============================================================================
// イベントリスナーの設定
// ============================================================================

/**
 * イベントリスナーを初期化
 */
function initializeEventListeners() {
    // URL追加
    elements.addUrlBtn.addEventListener('click', handleAddUrlClick);
    elements.urlInput.addEventListener('keydown', handleUrlInputKeydown);

    // 設定変更
    elements.displayTime.addEventListener('change', () => {
        state.displayTime = parseInt(elements.displayTime.value) || CONSTANTS.DEFAULT_DISPLAY_TIME;
        saveToLocalStorage();
    });

    elements.loopCheckbox.addEventListener('change', () => {
        state.isLooping = elements.loopCheckbox.checked;
        saveToLocalStorage();
    });

    // 再生制御
    elements.startBtn.addEventListener('click', start);
    elements.stopBtn.addEventListener('click', stop);
    elements.fullscreenBtn.addEventListener('click', toggleFullscreen);

    // 操作方法モーダル
    if (elements.helpBtn) {
        elements.helpBtn.addEventListener('click', () => {
            if (elements.helpModal) {
                elements.helpModal.classList.add('show');
            }
        });
    }

    if (elements.helpModalClose) {
        elements.helpModalClose.addEventListener('click', () => {
            if (elements.helpModal) {
                elements.helpModal.classList.remove('show');
            }
        });
    }

    // モーダル外をクリックで閉じる
    if (elements.helpModal) {
        elements.helpModal.addEventListener('click', (e) => {
            if (e.target === elements.helpModal) {
                elements.helpModal.classList.remove('show');
            }
        });
    }

    // フルスクリーンコントロール
    if (elements.fsStartBtn) {
        elements.fsStartBtn.addEventListener('click', start);
    }
    if (elements.fsStopBtn) {
        elements.fsStopBtn.addEventListener('click', stop);
    }
    if (elements.fsExitBtn) {
        elements.fsExitBtn.addEventListener('click', exitFullscreen);
    }

    // データ管理
    elements.copyUrlBtn.addEventListener('click', copyCurrentUrlToClipboard);
    elements.exportBtn.addEventListener('click', exportData);
    elements.importBtn.addEventListener('click', () => {
        elements.importFile.click();
    });
    
    if (elements.clearBtn) {
        elements.clearBtn.addEventListener('click', clearSettings);
    }

    elements.importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            importData(file);
            e.target.value = ''; // 同じファイルを再度選択できるようにリセット
        }
    });

    // キーボードショートカット
    document.addEventListener('keydown', handleKeydown);
}

/**
 * URL追加ボタンのクリックハンドラ
 */
function handleAddUrlClick() {
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
}

/**
 * URL入力欄のキーダウンハンドラ
 */
function handleUrlInputKeydown(e) {
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
}

/**
 * キーボードショートカットのハンドラ
 */
function handleKeydown(e) {
    // ESCキーでフルスクリーン解除
    if (e.key === 'Escape' && state.isFullscreen) {
        e.preventDefault();
        exitFullscreen();
        return;
    }

    // スペースキーで開始/停止（フォーカスがinput要素にない場合）
    if (e.key === ' ' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (state.isPlaying) {
            stop();
        } else {
            start();
        }
    }
}

// ============================================================================
// 初期化
// ============================================================================

/**
 * アプリケーションを初期化
 */
function initialize() {
    // ローカルストレージから読み込み
    loadFromLocalStorage();
    
    // UIを更新
    updateUI();
    
    // イベントリスナーを設定
    initializeEventListeners();
    
    // URLパラメータの読み込み（ローカルストレージより優先）
    loadFromUrlParams();
}

// グローバルスコープに移動関数を公開（onclick属性から呼び出すため）
window.moveUrl = moveUrl;
window.removeUrl = removeUrl;

// アプリケーションを起動
initialize();
