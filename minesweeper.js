(function () {
  class MinesweeperAPI {
    constructor(rows = 9, cols = 9, mines = 10) {
      if (![rows, cols, mines].every(Number.isInteger) || rows < 1 || cols < 1 || mines < 0 || mines >= rows * cols) {
        throw new RangeError('지뢰 수는 전체 칸 수보다 작아야 합니다.');
      }
      this.rows = rows;
      this.cols = cols;
      this.minesCount = mines;
      this.initBoard();
    }
    initBoard() {
      this.board = Array.from({ length: this.rows }, () => Array.from({ length: this.cols }, () => ({
        isMine: false, isRevealed: false, isFlagged: false, neighborMines: 0
      })));
      this.initialized = false;
      this.status = 'ready';
    }
    cell(row, col) {
      if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || col < 0 || row >= this.rows || col >= this.cols) throw new RangeError('잘못된 칸 좌표입니다.');
      return this.board[row][col];
    }
    neighborPositions(row, col) {
      const result = [];
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const r = row + dr, c = col + dc;
        if ((dr || dc) && r >= 0 && c >= 0 && r < this.rows && c < this.cols) result.push([r, c]);
      }
      return result;
    }
    getNeighbors(row, col) { return this.neighborPositions(row, col).map(([r, c]) => this.board[r][c]); }
    generateMines(firstRow, firstCol) {
      this.cell(firstRow, firstCol);
      if (this.initialized) return;
      const candidates = [];
      for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
        if (r !== firstRow || c !== firstCol) candidates.push([r, c]);
      }
      // Partial shuffle avoids retries and terminates even on a densely mined board.
      for (let i = 0; i < this.minesCount; i++) {
        const j = i + Math.floor(Math.random() * (candidates.length - i));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        const [r, c] = candidates[i];
        this.board[r][c].isMine = true;
      }
      this.calculateNeighbors();
      this.initialized = true;
      this.status = 'progress';
    }
    calculateNeighbors() {
      this.board.forEach((row, r) => row.forEach((cell, c) => {
        cell.neighborMines = this.getNeighbors(r, c).filter(n => n.isMine).length;
      }));
    }
    result() { return { status: this.status, board: this.board }; }
    get finished() { return this.status === 'win' || this.status === 'game-over'; }
    get flagsCount() { return this.board.flat().filter(c => c.isFlagged).length; }
    toggleFlag(row, col) {
      const cell = this.cell(row, col);
      if (this.finished || cell.isRevealed) return this.result();
      if (cell.isFlagged || this.flagsCount < this.minesCount) cell.isFlagged = !cell.isFlagged;
      return this.result();
    }
    revealCell(row, col) {
      const cell = this.cell(row, col);
      if (this.finished || cell.isRevealed || cell.isFlagged) return this.result();
      if (!this.initialized) this.generateMines(row, col);
      cell.isRevealed = true;
      if (cell.isMine) { this.status = 'game-over'; return this.result(); }
      if (cell.neighborMines === 0) this.revealNeighbors(row, col);
      if (this.checkWin()) this.status = 'win';
      return this.result();
    }
    revealNeighbors(row, col) {
      const pending = [[row, col]];
      while (pending.length) {
        const [r, c] = pending.pop();
        for (const [nr, nc] of this.neighborPositions(r, c)) {
          const cell = this.board[nr][nc];
          if (cell.isRevealed || cell.isMine || cell.isFlagged) continue;
          cell.isRevealed = true;
          if (cell.neighborMines === 0) pending.push([nr, nc]);
        }
      }
    }
    checkWin() { return this.board.every(row => row.every(cell => cell.isMine || cell.isRevealed)); }
  }

  function mountMinesweeper(body) {
    const game = new MinesweeperAPI();
    const root = document.createElement('div'); root.className = 'minesweeper';
    root.innerHTML = '<div class="mine-toolbar"><span class="mine-count"></span><button class="btn mine-reset">새 게임</button></div><p class="mine-status" role="status"></p><div class="mine-board" role="group" aria-label="minesweeper 게임판, 9행 9열"></div><p class="mine-help">클릭: 칸 열기 · 우클릭: 깃발<br>모바일: 짧게 터치하면 열기 · 길게 누르면 깃발</p>';
    body.appendChild(root);
    const board = root.querySelector('.mine-board'), status = root.querySelector('.mine-status');
    const count = root.querySelector('.mine-count');
    const buttons = [];
    const clearGestures = [];
    function render() {
      count.textContent = '🚩 ' + (game.minesCount - game.flagsCount);
      status.hidden = !game.finished;
      status.textContent = game.status === 'win' ? '성공! 모든 안전한 칸을 찾았어요.' : game.status === 'game-over' ? '지뢰를 밟았어요. 새 게임으로 다시 도전하세요!' : '';
      game.board.forEach((row, r) => row.forEach((cell, c) => {
        const bt = buttons[r * game.cols + c];
        const showMine = cell.isMine && game.finished;
        bt.className = 'mine-cell' + (cell.isRevealed ? ' revealed' : '') + (showMine ? ' mine' : '');
        bt.textContent = showMine ? '' : cell.isFlagged ? '🚩' : cell.isRevealed && cell.neighborMines ? cell.neighborMines : '';
        if (showMine) {
          const heart = document.createElement('img');
          heart.src = 'assets/icons/heart.svg';
          heart.alt = '';
          heart.draggable = false;
          heart.className = 'mine-heart';
          bt.appendChild(heart);
        }
        bt.dataset.number = cell.neighborMines;
        const label = showMine ? '지뢰' : cell.isFlagged ? (game.status === 'game-over' && !cell.isMine ? '잘못 꽂은 깃발' : '깃발') : cell.isRevealed ? (cell.neighborMines ? '주변 지뢰 ' + cell.neighborMines + '개' : '빈 칸') : '닫힌 칸';
        bt.setAttribute('aria-label', (r + 1) + '행 ' + (c + 1) + '열, ' + label);
        bt.setAttribute('aria-disabled', String(game.finished || cell.isRevealed));
        if (game.status === 'game-over' && cell.isFlagged && !cell.isMine) bt.textContent = '✕';
      }));
    }
    function act(r, c, flag) {
      if (flag) game.toggleFlag(r, c);
      else {
        game.revealCell(r, c);
      }
      render();
    }
    for (let r = 0; r < game.rows; r++) for (let c = 0; c < game.cols; c++) {
      const bt = document.createElement('button'); bt.type = 'button';
      let holdTimer = null, touchGesture = false, suppressClick = false, origin = null;
      function cancelHold() { clearTimeout(holdTimer); holdTimer = null; }
      clearGestures.push(cancelHold);
      bt.addEventListener('pointerdown', e => {
        cancelHold();
        touchGesture = e.pointerType === 'touch' || e.pointerType === 'pen';
        suppressClick = false;
        if (!touchGesture || !e.isPrimary) return;
        origin = { x: e.clientX, y: e.clientY };
        holdTimer = setTimeout(() => {
          holdTimer = null;
          suppressClick = true;
          act(r, c, true);
        }, 500);
      });
      bt.addEventListener('pointermove', e => {
        if (origin && Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > 10) {
          cancelHold(); suppressClick = true;
        }
      });
      bt.addEventListener('pointerup', () => { cancelHold(); origin = null; });
      bt.addEventListener('pointercancel', () => { cancelHold(); origin = null; suppressClick = true; });
      bt.addEventListener('pointerleave', cancelHold);
      bt.addEventListener('click', () => {
        if (suppressClick) { suppressClick = false; return; }
        act(r, c, false);
      });
      bt.addEventListener('contextmenu', e => {
        e.preventDefault();
        if (!touchGesture) act(r, c, true);
      });
      buttons.push(bt); board.appendChild(bt);
    }
    root.querySelector('.mine-reset').onclick = () => {
      clearGestures.forEach(cancel => cancel());
      game.initBoard(); render();
    };
    render();
    return () => { clearGestures.forEach(cancel => cancel()); };
  }
  window.MinesweeperAPI = MinesweeperAPI;
  window.mountMinesweeper = mountMinesweeper;
})();
