(function () {
  var layer = document.querySelector('#desktop-memos');
  var placement = document.querySelector('#memo-placement');
  var preview = placement.querySelector('.memo-preview');
  var add = document.querySelector('#memo-add');
  var toggle = document.querySelector('#memo-toggle');
  // 고객 사이트(siteKey 있음)는 메모를 서버에 한 장씩 저장해서 어느 기기·브라우저에서 열어도 같습니다.
  // 데모 화면은 예전처럼 이 브라우저에만 저장합니다.
  var site = window.UrluvSite || {};
  var siteKey = site.key;
  var server = !!(siteKey && site.memos);
  var readOnly = server && !!site.previewing;
  var storageKey = 'urluv-winter-gifts-v1' + (siteKey ? ':' + siteKey : ':demo');
  var visibilityKey = 'urluv-winter-gifts-visible:' + (siteKey || 'demo');
  var notes = [], visible = true, initialized = false, order = 1;
  var timers = {}, pending = {};

  function validNotes(list) {
    return Array.isArray(list) ? list.filter(function (n) {
      return n && typeof n.id === 'string' && typeof n.text === 'string' && Number.isFinite(n.x) && Number.isFinite(n.y);
    }) : [];
  }
  function localNotes() {
    try {
      var saved = localStorage.getItem(storageKey);
      if (saved !== null) return validNotes(JSON.parse(saved));
    } catch (e) {}
    return [];
  }
  if (!server) notes = localNotes();
  try { visible = localStorage.getItem(visibilityKey) !== '0'; } catch (e) {}

  function statusOf(id) {
    var card = Array.from(layer.children).find(function (c) { return c.dataset.memoId === id; });
    return card && card.querySelector('.memo-status');
  }
  function show(id, message) {
    var status = statusOf(id);
    if (!status) return;
    status.textContent = message || '';
    status.hidden = !message;
  }

  // 메모 한 장을 저장합니다. 글을 치는 중이면 잠깐 모았다가 보냅니다.
  function save(note, delay) {
    if (!server) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(notes));
        show(note.id, '');
      } catch (e) { show(note.id, '저장하지 못했어요. 내용을 복사해 주세요.'); }
      return;
    }
    if (readOnly) return;
    pending[note.id] = note;
    clearTimeout(timers[note.id]);
    timers[note.id] = setTimeout(function () { send(note); }, delay || 0);
  }
  function send(note, keepalive) {
    delete timers[note.id];
    delete pending[note.id];
    return site.memos.save(note, keepalive).then(function () {
      if (!pending[note.id]) show(note.id, '');
    }, function (error) {
      show(note.id, error && error.code === 'TOO_MANY_MEMOS' ? error.message : '저장하지 못했어요. 잠시 후 다시 고쳐 주세요.');
    });
  }
  function removeNote(note) {
    notes = notes.filter(function (n) { return n !== note; });
    clearTimeout(timers[note.id]); delete timers[note.id]; delete pending[note.id];
    if (!server) { save(note); render(); return; }
    render();
    site.memos.remove(note.id).catch(function () {
      // 지우지 못했으면 다시 보여 줍니다.
      notes.push(note); render(); show(note.id, '삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
    });
  }
  // 창을 닫기 전에 아직 안 보낸 글을 보냅니다.
  window.addEventListener('pagehide', function () {
    Object.keys(pending).forEach(function (id) { clearTimeout(timers[id]); send(pending[id], true); });
  });

  // 서버 메모를 불러옵니다. 예전에 이 브라우저에만 저장한 메모가 있으면 한 번 서버로 옮깁니다.
  function loadServer() {
    return site.memos.list().then(function (list) {
      var byId = {};
      var loaded = validNotes(list).map(function (m) { byId[m.id] = true; return { id: m.id, text: m.text, x: m.x, y: m.y }; });
      // 불러오는 사이에 붙인 메모는 그대로 둡니다.
      notes.forEach(function (n) { if (!byId[n.id]) { byId[n.id] = true; loaded.push(n); } });
      if (!readOnly) {
        localNotes().forEach(function (n) {
          if (!byId[n.id]) { byId[n.id] = true; loaded.push(n); save(n); }
        });
        try { localStorage.removeItem(storageKey); } catch (e) {}
      }
      notes = loaded;
      render();
    }, function () {
      add.disabled = true;
      layer.replaceChildren();
      var p = document.createElement('p'); p.className = 'memo-status desktop-memo-error'; p.setAttribute('role', 'status');
      p.textContent = '선물을 불러오지 못했어요. 새로고침해 주세요.';
      layer.appendChild(p);
    });
  }
  function size() {
    return { width: Math.min(260, innerWidth - 16), height: Math.min(240, Math.max(80, innerHeight - 54)) };
  }
  function position(x, y) {
    var s = size();
    return { x: Math.max(8, Math.min(x, innerWidth - s.width - 8)), y: Math.max(8, Math.min(y, innerHeight - 34 - s.height - 8)) };
  }
  function move(element, note) {
    var p = position(note.x, note.y);
    element.style.left = p.x + 'px';
    element.style.top = p.y + 'px';
  }
  function visibility() {
    layer.hidden = !visible;
    toggle.textContent = visible ? '선물 숨기기' : '선물 보기';
    toggle.setAttribute('aria-expanded', String(visible));
    toggle.classList.toggle('on', visible);
    try { localStorage.setItem(visibilityKey, visible ? '1' : '0'); } catch (e) {}
  }
  function cancelPlacement() {
    placement.hidden = true;
    add.classList.remove('on');
    add.setAttribute('aria-pressed', 'false');
  }
  function render(focusId) {
    layer.replaceChildren();
    notes.forEach(function (note) {
      var card = document.createElement('aside');
      card.className = 'desktop-memo win';
      card.dataset.memoId = note.id;
      card.setAttribute('aria-label', '마켓에 남긴 선물');
      var bar = document.createElement('div'); bar.className = 'titlebar';
      var label = document.createElement('label'); label.className = 'title'; label.textContent = '🎁 선물 카드';
      label.htmlFor = 'memo-' + note.id;
      var remove = document.createElement('button'); remove.className = 'tbtn'; remove.textContent = '✕';
      remove.setAttribute('aria-label', '이 선물 삭제');
      var text = document.createElement('textarea'); text.id = label.htmlFor;
      text.placeholder = '이곳에 마음을 적어 선물해 주세요.'; text.value = note.text; text.spellcheck = false;
      text.maxLength = 2000; text.readOnly = readOnly;
      var status = document.createElement('p'); status.className = 'memo-status'; status.setAttribute('role', 'status');
      status.hidden = true;
      text.addEventListener('input', function () { note.text = text.value; save(note, 600); });
      remove.onclick = function () { removeNote(note); add.focus(); };
      remove.hidden = readOnly;
      bar.append(label, remove); card.append(bar, text, status); layer.appendChild(card); move(card, note);
      card.addEventListener('pointerdown', function () { card.style.zIndex = ++order; });
      var drag = null;
      bar.addEventListener('pointerdown', function (e) {
        if (readOnly || e.target.closest('button') || e.button !== 0) return;
        e.preventDefault();
        var rect = card.getBoundingClientRect();
        drag = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        bar.setPointerCapture(e.pointerId);
      });
      bar.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var p = position(e.clientX - drag.x, e.clientY - drag.y);
        note.x = p.x; note.y = p.y; move(card, note);
      });
      function finish() { if (drag) { drag = null; save(note); } }
      bar.addEventListener('pointerup', finish);
      bar.addEventListener('pointercancel', finish);
      bar.addEventListener('lostpointercapture', finish);
      if (note.id === focusId) { card.style.zIndex = ++order; text.focus(); }
    });
  }
  add.onclick = function () {
    if (!placement.hidden) { cancelPlacement(); return; }
    visible = true; visibility();
    placement.hidden = false;
    add.classList.add('on'); add.setAttribute('aria-pressed', 'true');
    var p = position(innerWidth / 2, 80);
    preview.style.left = p.x + 'px'; preview.style.top = p.y + 'px';
    document.querySelector('#memo-placement-cancel').focus();
  };
  placement.addEventListener('pointermove', function (e) {
    var p = position(e.clientX, e.clientY);
    preview.style.left = p.x + 'px'; preview.style.top = p.y + 'px';
  });
  placement.addEventListener('click', function (e) {
    if (e.target.closest('p')) return;
    var p = position(e.clientX, e.clientY);
    var note = { id: Date.now().toString(36) + Math.random().toString(36).slice(2), text: '', x: p.x, y: p.y };
    notes.push(note); cancelPlacement(); render(note.id);
    save(note);
  });
  document.querySelector('#memo-placement-cancel').onclick = function () { cancelPlacement(); add.focus(); };
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !placement.hidden) { cancelPlacement(); add.focus(); }
  });
  toggle.onclick = function () { cancelPlacement(); visible = !visible; visibility(); };
  window.addEventListener('resize', function () {
    Array.from(layer.children).forEach(function (card, i) { if (notes[i]) move(card, notes[i]); });
  });
  if (readOnly) { add.disabled = true; add.title = '미리보기에서는 선물을 놓을 수 없어요.'; }
  window.DesktopMemos = { enter: function () {
    if (!initialized) { render(); initialized = true; if (server) loadServer(); }
    visibility();
  } };
})();
