document.addEventListener('DOMContentLoaded', () => {
    let socket;
    try {
        if (typeof io !== 'undefined') socket = io();
        else socket = { on: () => {}, emit: () => {}, id: 'offline' };
    } catch (e) {
        socket = { on: () => {}, emit: () => {}, id: 'offline' };
    }

    // --- СЛОВНИКИ ПЕРЕКЛАДУ (Додано botHit) ---
    const i18n = {
        uk: {
            title: "МОРСЬКИЙ БІЙ", playBot: "ГРАТИ З БОТОМ", onlineMode: "⚓ ОНЛАЙН",
            createRoom: "СТВОРИТИ КІМНАТУ", enterCode: "ВВЕДИ КОД КІМНАТИ", join: "ПРИЄДНАТИСЬ",
            roomCreated: "КІМНАТА СТВОРЕНА", copy: "Скопіювати", waiting: "Чекаємо на друга...", cancel: "Скасувати",
            settingsTitle: "НАЛАШТУВАННЯ", theme: "Тема:", language: "Мова:", close: "Закрити",
            placementTitle: "Розстановка", placementSub: "Вибери корабель та тисни на поле",
            direction: "Напрямок:", horizontal: "Горизонтально", vertical: "Вертикально",
            reset: "Скинути", yourFleet: "Твій флот", ready: "ГОТОВИЙ",
            battleTitle: "БІЙ!", enemyBoard: "Поле супротивника", yourBoard: "Твоє поле", playAgain: "ГРАТИ ЗНОВУ",
            msgSelectCode: "Введіть 6-значний код кімнати!", msgCopied: "Код скопійовано!", msgCopyErr: "Помилка копіювання!",
            turnYours: "Твій хід! Стріляй.", turnEnemy: "Хід супротивника...",
            hit: "Попав! Стріляй ще раз.", miss: "Промах. Хід супротивника...",
            botHit: "Бот попав! Він стріляє ще раз...",
            win: "ТИ ПЕРЕМОЖЕЦЬ! 🎉", lose: "СУПРОТИВНИК ПЕРЕМІГ! ☠️", waitOpponent: "Очікуємо на супротивника...",
            enemyRun: "СУПРОТИВНИК ВТІК! ТИ ПЕРЕМІГ! 🏆"
        },
        en: {
            title: "BATTLESHIP", playBot: "PLAY WITH BOT", onlineMode: "⚓ ONLINE",
            createRoom: "CREATE ROOM", enterCode: "ENTER ROOM CODE", join: "JOIN",
            roomCreated: "ROOM CREATED", copy: "Copy Code", waiting: "Waiting for opponent...", cancel: "Cancel",
            settingsTitle: "SETTINGS", theme: "Theme:", language: "Language:", close: "Close",
            placementTitle: "Placement", placementSub: "Select a ship and place it on the board",
            direction: "Direction:", horizontal: "Horizontal", vertical: "Vertical",
            reset: "Reset", yourFleet: "Your Fleet", ready: "READY",
            battleTitle: "BATTLE!", enemyBoard: "Enemy Board", yourBoard: "Your Board", playAgain: "PLAY AGAIN",
            msgSelectCode: "Enter a 6-digit room code!", msgCopied: "Code copied!", msgCopyErr: "Copy failed!",
            turnYours: "Your turn! Fire.", turnEnemy: "Opponent's turn...",
            hit: "Hit! Fire again.", miss: "Miss. Opponent's turn...",
            botHit: "Bot hit! Firing again...",
            win: "YOU WON! 🎉", lose: "OPPONENT WON! ☠️", waitOpponent: "Waiting for opponent...",
            enemyRun: "OPPONENT FLED! YOU WIN! 🏆"
        }
    };
    let currentLang = 'uk';

    // Елементи UI
    const mainMenu = document.getElementById('main-menu');
    const placementScreen = document.getElementById('placement-screen');
    const gameScreen = document.getElementById('game-screen');
    const roomModal = document.getElementById('room-modal');
    const settingsModal = document.getElementById('settings-modal');

    // Кнопки
    const playBotBtn = document.getElementById('play-bot-btn');
    const createRoomBtn = document.getElementById('create-room-btn');
    const joinRoomBtn = document.getElementById('join-room-btn');
    const roomCodeInput = document.getElementById('room-code-input');
    const cancelRoomBtn = document.getElementById('cancel-room-btn');
    const readyBtn = document.getElementById('ready-btn');
    const resetBoardBtn = document.getElementById('reset-board-btn');
    const restartGameBtn = document.getElementById('restart-game-btn');
    const copyCodeBtn = document.getElementById('copy-code-btn');
    
    // Налаштування та Назад
    const settingsBtn = document.getElementById('settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const toggleThemeBtn = document.getElementById('toggle-theme-btn');
    const toggleLangBtn = document.getElementById('toggle-lang-btn');
    const backBtn = document.getElementById('back-btn');

    const boardSize = 10;
    const letters = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З', 'И', 'К'];

    let isHorizontal = true;
    let currentShipSize = 4;
    let grid = createEmptyGrid(); 
    let availableShips = { 4: 1, 3: 2, 2: 3, 1: 4 }; 
    let totalShipsPlaced = 0;
    
    let isBotMode = false;
    let isOnlineMode = false;
    let isPlayerTurn = false;
    let playerHits = 0;
    let botHits = 0;
    const totalShipBlocks = 20; 

    // --- СИСТЕМА СПОВІЩЕНЬ ---
    function showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerText = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    }

    // --- НАЛАШТУВАННЯ ТА НАЗАД ---
    settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
    closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));

    toggleThemeBtn.addEventListener('click', () => {
        const html = document.documentElement;
        if (html.getAttribute('data-theme') === 'light') {
            html.setAttribute('data-theme', 'dark');
            toggleThemeBtn.innerText = '☀️ Світла';
        } else {
            html.setAttribute('data-theme', 'light');
            toggleThemeBtn.innerText = '🌙 Темна';
        }
    });

    toggleLangBtn.addEventListener('click', () => {
        currentLang = currentLang === 'uk' ? 'en' : 'uk';
        toggleLangBtn.innerText = currentLang === 'uk' ? '🇺🇸 English' : '🇺🇦 Українська';
        updateTranslations();
        document.getElementById('orientation-text').innerText = i18n[currentLang][isHorizontal ? 'horizontal' : 'vertical'];
    });

    function updateTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            el.innerText = i18n[currentLang][el.dataset.i18n];
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            el.placeholder = i18n[currentLang][el.dataset.i18nPlaceholder];
        });
    }

    backBtn.addEventListener('click', () => {
        placementScreen.classList.add('hidden');
        mainMenu.classList.remove('hidden');
        backBtn.classList.add('hidden'); 
        resetBoardBtn.click(); 
        
        if (isOnlineMode) {
            window.location.reload(); 
        }
    });

    // --- КОПІЮВАННЯ КОДУ ---
    copyCodeBtn.addEventListener('click', () => {
        const code = document.getElementById('generated-code').innerText;
        navigator.clipboard.writeText(code).then(() => {
            showNotification(i18n[currentLang].msgCopied, 'info');
        }).catch(() => {
            showNotification(i18n[currentLang].msgCopyErr, 'error');
        });
    });

    // --- НАВІГАЦІЯ ТА МЕНЮ ---
    playBotBtn.addEventListener('click', () => {
        isBotMode = true; isOnlineMode = false;
        showPlacementScreen();
    });

    createRoomBtn.addEventListener('click', () => {
        isBotMode = false; isOnlineMode = true;
        socket.emit('createRoom');
    });

    joinRoomBtn.addEventListener('click', () => {
        const code = roomCodeInput.value.trim();
        if (code.length === 6) {
            isBotMode = false; isOnlineMode = true;
            socket.emit('joinRoom', code);
        } else showNotification(i18n[currentLang].msgSelectCode, 'error');
    });

    socket.on('roomCreated', (code) => {
        document.getElementById('generated-code').innerText = code;
        roomModal.classList.remove('hidden');
    });
    
    socket.on('joinSuccess', () => roomModal.classList.add('hidden'));
    socket.on('joinError', (msg) => showNotification(msg, 'error'));
    socket.on('startGame', () => {
        roomModal.classList.add('hidden');
        showPlacementScreen();
    });

    cancelRoomBtn.addEventListener('click', () => roomModal.classList.add('hidden'));

    function showPlacementScreen() {
        mainMenu.classList.add('hidden');
        placementScreen.classList.remove('hidden');
        backBtn.classList.remove('hidden'); 
        initPlacementBoard();
        updateShipButtons();
    }

    // --- ЛОГІКА РОЗСТАНОВКИ КОРАБЛІВ ---
    const toggleDirBtn = document.getElementById('toggle-dir-btn');
    const orientationText = document.getElementById('orientation-text');

    toggleDirBtn.addEventListener('click', () => {
        isHorizontal = !isHorizontal;
        orientationText.innerText = i18n[currentLang][isHorizontal ? 'horizontal' : 'vertical'];
        toggleDirBtn.innerText = isHorizontal ? '➡️' : '⬇️';
    });

    document.querySelectorAll('.ship-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if(btn.disabled) return;
            document.querySelectorAll('.ship-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentShipSize = parseInt(btn.dataset.size);
        });
    });

    resetBoardBtn.addEventListener('click', () => {
        grid = createEmptyGrid();
        availableShips = { 4: 1, 3: 2, 2: 3, 1: 4 };
        totalShipsPlaced = 0;
        readyBtn.classList.add('hidden');
        initPlacementBoard();
        updateShipButtons();
        selectNextAvailableShip();
    });

    function createEmptyGrid() { return Array(boardSize).fill(null).map(() => Array(boardSize).fill(0)); }

    function initPlacementBoard() {
        drawBoard(document.getElementById('player-board'), grid, true);
    }

    function drawBoard(container, gridData, isPlacement = false, isEnemy = false) {
        container.innerHTML = '';
        container.appendChild(createHeaderCell('')); 
        letters.forEach(letter => container.appendChild(createHeaderCell(letter)));

        for (let y = 0; y < boardSize; y++) {
            container.appendChild(createHeaderCell(y + 1));
            for (let x = 0; x < boardSize; x++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.x = x; cell.dataset.y = y;
                
                if (gridData[y][x] === 1 && !isEnemy) cell.classList.add('ship');
                
                if (isPlacement) {
                    cell.addEventListener('mouseover', handleMouseOver);
                    cell.addEventListener('mouseout', handleMouseOut);
                    cell.addEventListener('click', handleCellClick);
                } else if (isEnemy) {
                    cell.classList.add('enemy-cell');
                    cell.addEventListener('click', handleEnemyCellClick);
                }
                container.appendChild(cell);
            }
        }
    }

    function createHeaderCell(text) {
        const div = document.createElement('div');
        div.classList.add('header-cell'); div.innerText = text;
        return div;
    }

    function getTargetCells(startX, startY, size, horizontal) {
        let cells = [];
        for (let i = 0; i < size; i++) {
            let x = horizontal ? startX + i : startX; let y = horizontal ? startY : startY + i;
            if (x < boardSize && y < boardSize) cells.push({x, y});
            else return null; 
        }
        return cells;
    }

    function isValidPlacement(targetCells, targetGrid = grid) {
        if (!targetCells) return false;
        for (let cell of targetCells) {
            for(let dy = -1; dy <= 1; dy++) {
                for(let dx = -1; dx <= 1; dx++) {
                    let checkY = cell.y + dy; let checkX = cell.x + dx;
                    if(checkY >= 0 && checkY < boardSize && checkX >= 0 && checkX < boardSize) {
                        if(targetGrid[checkY][checkX] === 1) return false;
                    }
                }
            }
        }
        return true;
    }

    function handleMouseOver(e) {
        if (availableShips[currentShipSize] === 0) return;
        const x = parseInt(e.target.dataset.x); const y = parseInt(e.target.dataset.y);
        const cells = getTargetCells(x, y, currentShipSize, isHorizontal);
        const isValid = isValidPlacement(cells, grid);
        const className = isValid ? 'hover-valid' : 'hover-invalid';

        if (cells) cells.forEach(c => document.querySelector(`#player-board .cell[data-x="${c.x}"][data-y="${c.y}"]`)?.classList.add(className));
        else e.target.classList.add('hover-invalid');
    }

    function handleMouseOut() { document.querySelectorAll('#player-board .cell').forEach(c => c.classList.remove('hover-valid', 'hover-invalid')); }

    function handleCellClick(e) {
        if (availableShips[currentShipSize] === 0) return;
        const x = parseInt(e.target.dataset.x); const y = parseInt(e.target.dataset.y);
        const cells = getTargetCells(x, y, currentShipSize, isHorizontal);
        
        if (isValidPlacement(cells, grid)) {
            cells.forEach(c => {
                grid[c.y][c.x] = 1;
                document.querySelector(`#player-board .cell[data-x="${c.x}"][data-y="${c.y}"]`).classList.add('ship');
            });
            handleMouseOut(); availableShips[currentShipSize]--; totalShipsPlaced++; updateShipButtons();

            if (totalShipsPlaced === 10) readyBtn.classList.remove('hidden');
            else if (availableShips[currentShipSize] === 0) selectNextAvailableShip();
        }
    }

    function updateShipButtons() {
        document.querySelectorAll('.ship-btn').forEach(btn => {
            let size = parseInt(btn.dataset.size);
            btn.querySelector('.count').innerText = availableShips[size];
            if (availableShips[size] === 0) { btn.disabled = true; btn.classList.remove('active'); } 
            else btn.disabled = false;
        });
    }

    function selectNextAvailableShip() {
        for (let size = 4; size >= 1; size--) {
            if (availableShips[size] > 0) {
                currentShipSize = size;
                document.querySelector(`.ship-btn[data-size="${size}"]`)?.classList.add('active'); break;
            }
        }
    }

    // --- ЛОГІКА БОЮ (МУЛЬТИПЛЕЄР ТА БОТ) ---

    readyBtn.addEventListener('click', () => {
        readyBtn.classList.add('hidden');
        backBtn.classList.add('hidden'); 
        
        const statusEl = document.getElementById('game-status');
        statusEl.classList.remove('win-anim', 'lose-anim'); 
        
        if (isBotMode) {
            startBotGame();
        } else if (isOnlineMode) {
            updateStatus(i18n[currentLang].waitOpponent, false);
            socket.emit('playerReady', grid);
        }
    });

    socket.on('matchStarted', (turnId) => {
        placementScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        restartGameBtn.classList.add('hidden');
        
        playerGameGrid = JSON.parse(JSON.stringify(grid));
        
        drawBoard(document.getElementById('player-game-board'), playerGameGrid, false, false);
        drawBoard(document.getElementById('enemy-game-board'), createEmptyGrid(), false, true);

        isPlayerTurn = (socket.id === turnId);
        updateStatus(isPlayerTurn ? i18n[currentLang].turnYours : i18n[currentLang].turnEnemy, !isPlayerTurn);
    });

    socket.on('fireResult', (data) => {
        const { x, y, result, shooter, nextTurn, isWin } = data;
        
        if (shooter === socket.id) {
            const cell = document.querySelector(`#enemy-game-board .cell[data-x="${x}"][data-y="${y}"]`);
            cell.classList.add(result); 
        } else {
            const cell = document.querySelector(`#player-game-board .cell[data-x="${x}"][data-y="${y}"]`);
            cell.classList.add(result);
        }

        if (isWin) {
            endGame(shooter === socket.id ? i18n[currentLang].win : i18n[currentLang].lose, shooter === socket.id);
            return;
        }

        isPlayerTurn = (socket.id === nextTurn);
        if (isPlayerTurn) updateStatus(i18n[currentLang].turnYours, false);
        else updateStatus(i18n[currentLang].turnEnemy, true);
    });

    socket.on('opponentDisconnected', () => {
        if (!gameScreen.classList.contains('hidden')) {
            endGame(i18n[currentLang].enemyRun, true);
            showNotification(i18n[currentLang].enemyRun, 'info');
        }
    });

    function handleEnemyCellClick(e) {
        if (!isPlayerTurn) return;
        
        const x = parseInt(e.target.dataset.x);
        const y = parseInt(e.target.dataset.y);

        if (e.target.classList.contains('hit') || e.target.classList.contains('miss')) return;

        if (isOnlineMode) socket.emit('fire', { x, y });
        else if (isBotMode) processBotModePlayerShot(x, y, e.target);
    }

    function startBotGame() {
        placementScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        restartGameBtn.classList.add('hidden');
        
        playerGameGrid = JSON.parse(JSON.stringify(grid));
        botGrid = createEmptyGrid();
        
        const shipsToPlace = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];
        for (let size of shipsToPlace) {
            let placed = false;
            while (!placed) {
                let x = Math.floor(Math.random() * boardSize); let y = Math.floor(Math.random() * boardSize);
                let horiz = Math.random() > 0.5; let cells = getTargetCells(x, y, size, horiz);
                if (isValidPlacement(cells, botGrid)) { cells.forEach(c => botGrid[c.y][c.x] = 1); placed = true; }
            }
        }

        drawBoard(document.getElementById('player-game-board'), playerGameGrid, false, false);
        drawBoard(document.getElementById('enemy-game-board'), createEmptyGrid(), false, true); 

        isPlayerTurn = true; playerHits = 0; botHits = 0;
        updateStatus(i18n[currentLang].turnYours, false);
    }

    function processBotModePlayerShot(x, y, cellElement) {
        if (botGrid[y][x] === 1) {
            botGrid[y][x] = 3; cellElement.classList.add('hit'); playerHits++;
            if (playerHits === totalShipBlocks) return endGame(i18n[currentLang].win, true);
            updateStatus(i18n[currentLang].hit, false);
        } else {
            botGrid[y][x] = 2; cellElement.classList.add('miss');
            isPlayerTurn = false; updateStatus(i18n[currentLang].miss, true);
            setTimeout(botTurn, 800);
        }
    }

    function botTurn() {
        if (isPlayerTurn) return;
        let x, y;
        do {
            x = Math.floor(Math.random() * boardSize); y = Math.floor(Math.random() * boardSize);
        } while (playerGameGrid[y][x] === 2 || playerGameGrid[y][x] === 3);

        const targetDomCell = document.querySelector(`#player-game-board .cell[data-x="${x}"][data-y="${y}"]`);

        if (playerGameGrid[y][x] === 1) {
            playerGameGrid[y][x] = 3; 
            targetDomCell.classList.add('hit'); botHits++;
            if (botHits === totalShipBlocks) return endGame(i18n[currentLang].lose, false);
            
            // ВАЖЛИВО: Тепер тут береться текст з перекладу!
            updateStatus(i18n[currentLang].botHit, true); 
            setTimeout(botTurn, 800);
        } else {
            playerGameGrid[y][x] = 2; targetDomCell.classList.add('miss');
            isPlayerTurn = true; updateStatus(i18n[currentLang].turnYours, false);
        }
    }

    function updateStatus(text, isRed) {
        const statusEl = document.getElementById('game-status');
        statusEl.innerText = text; statusEl.style.color = isRed ? 'var(--red-ink)' : 'var(--ink-color)';
    }

    function endGame(msg, isWin) {
        isPlayerTurn = false; 
        updateStatus(msg, !isWin); 
        
        const statusEl = document.getElementById('game-status');
        if (isWin) {
            statusEl.classList.add('win-anim');
        } else {
            statusEl.classList.add('lose-anim');
        }
        
        restartGameBtn.classList.remove('hidden');
    }

    restartGameBtn.addEventListener('click', () => {
        gameScreen.classList.add('hidden');
        resetBoardBtn.click(); 
        
        const statusEl = document.getElementById('game-status');
        statusEl.classList.remove('win-anim', 'lose-anim'); 
        
        mainMenu.classList.remove('hidden');
        if(isOnlineMode) window.location.reload(); 
    });
});