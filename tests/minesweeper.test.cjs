const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../minesweeper.js'), 'utf8'), context);
const Game = context.window.MinesweeperAPI;

test('invalid sizes and mine counts are rejected', () => {
  for (const args of [[0,9,1], [9,9,81], [9,9,-1], [1.5,9,1]]) {
    assert.throws(() => new Game(...args), { name: 'RangeError' });
  }
  assert.throws(() => new Game().revealCell(-1,0), { name: 'RangeError' });
});

test('first click is safe, mine counts and neighboring numbers are correct', () => {
  for (let i=0;i<100;i++) {
    const game = new Game(), r=i%9, c=Math.floor(i/9)%9;
    game.revealCell(r,c);
    assert.equal(game.board[r][c].isMine,false);
    assert.equal(game.board.flat().filter(c=>c.isMine).length,10);
    game.board.forEach((row,r)=>row.forEach((cell,c)=>{
      assert.equal(cell.neighborMines,game.getNeighbors(r,c).filter(n=>n.isMine).length);
    }));
  }
  const dense=new Game(3,3,8);
  assert.equal(dense.revealCell(1,1).status,'win');
});

test('flags do not start the game, prevent revealing and are capped', () => {
  const game = new Game(3,3,1);
  game.toggleFlag(0,0); game.revealCell(0,0);
  assert.equal(game.initialized,false);
  game.toggleFlag(1,1);
  assert.equal(game.flagsCount,1);
  game.toggleFlag(0,0); game.revealCell(0,0);
  assert.equal(game.initialized,true);
});

test('empty areas expand without recursion and correctly win', () => {
  const game = new Game(100,100,0);
  assert.equal(game.revealCell(0,0).status,'win');
  assert.ok(game.board.flat().every(c=>c.isRevealed));
});

test('loss and win are terminal, restart clears all state', () => {
  const game = new Game(3,3,1);
  game.generateMines(0,0);
  const r=game.board.findIndex(row=>row.some(c=>c.isMine));
  const c=game.board[r].findIndex(cell=>cell.isMine);
  assert.equal(game.revealCell(r,c).status,'game-over');
  const before=JSON.stringify(game.board);
  game.revealCell(0,0); game.toggleFlag(0,0);
  assert.equal(JSON.stringify(game.board),before);
  game.initBoard();
  assert.equal(game.initialized,false);
  assert.equal(game.status,'ready');
  assert.equal(game.flagsCount,0);
  assert.ok(game.board.flat().every(c=>!c.isMine&&!c.isRevealed));
  const won=new Game(1,2,1);
  assert.equal(won.revealCell(0,0).status,'win');
  won.toggleFlag(0,1);won.revealCell(0,1);
  assert.equal(won.status,'win');
  assert.equal(won.board[0][1].isRevealed,false);
});

test('touch: long press toggles a flag without revealing, short tap reveals, cancelled hold does nothing', () => {
  const timers = new Map(); let timerId = 0;
  class Element {
    constructor() { this.events = {}; this.children = []; this.style = {}; this.dataset = {}; this.attributes = {}; this.classList = { toggle() {} }; }
    addEventListener(name, fn) { this.events[name] = fn; }
    appendChild(child) { this.children.push(child); }
    setAttribute(name, value) { this.attributes[name] = value; }
    querySelector(selector) { return this.nodes[selector]; }
  }
  const nodes = Object.fromEntries(['.mine-board','.mine-status','.mine-count','.mine-reset'].map(s=>[s,new Element()]));
  const ctx = { window: {}, document: { createElement() { const el = new Element(); el.nodes = nodes; return el; } },
    setTimeout(fn) { timers.set(++timerId,fn); return timerId; }, clearTimeout(id) { timers.delete(id); },
    setInterval() { return 1; }, clearInterval() {} };
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../minesweeper.js'),'utf8'),ctx);
  const cleanup=ctx.window.mountMinesweeper(new Element());
  const cell=nodes['.mine-board'].children[0];
  const down={pointerType:'touch',isPrimary:true,clientX:10,clientY:10};
  function hold() { cell.events.pointerdown(down); const callbacks=[...timers.values()];timers.clear();callbacks.forEach(f=>f());cell.events.pointerup();cell.events.click(); }
  hold();assert.equal(cell.textContent,'🚩');assert.equal(nodes['.mine-count'].textContent,'🚩 9');
  hold();assert.equal(cell.textContent,'');assert.equal(nodes['.mine-count'].textContent,'🚩 10');
  cell.events.pointerdown(down);cell.events.pointercancel();cell.events.click();assert.equal(cell.attributes['aria-disabled'],'false');
  cell.events.pointerdown(down);cell.events.pointerup();cell.events.click();assert.equal(cell.attributes['aria-disabled'],'true');
  cleanup();assert.equal(timers.size,0);
});
