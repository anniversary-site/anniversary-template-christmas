(function () {
  if (!new URLSearchParams(location.search).has('orderEditor') || window.parent === window) return;

  var allowedOrigins = ['https://urluv.shop', 'https://www.urluv.shop', 'https://staging.urluv.shop', 'https://edit.urluv.shop', 'https://urluv-order.vercel.app', 'http://localhost:5173', 'http://127.0.0.1:5173'];
  var parentOrigin = null;
  try {
    var referrerOrigin = new URL(document.referrer).origin;
    if (allowedOrigins.includes(referrerOrigin)) parentOrigin = referrerOrigin;
  } catch (e) {}

  document.body.classList.add('order-editor-mode');
  var hooks = window.UrluvEditorHooks;
  var state = { data: {}, media: { photos: [], videos: [] }, limits: {} };
  var step = '';
  var entered = false;
  var localPreviews = { photos: {}, videos: {} };
  var activeInputs = {};
  var aiBusy = false;

  function $(selector, root) { return (root || document).querySelector(selector); }
  function node(tag, className, text) {
    var result = document.createElement(tag);
    if (className) result.className = className;
    if (text != null) result.textContent = text;
    return result;
  }
  function post(type, payload) {
    if (!parentOrigin) return;
    window.parent.postMessage(Object.assign({ channel: 'urluv-order-editor', type: type }, payload || {}), parentOrigin);
  }
  function patch(field, value) {
    state.data[field] = value;
    post('patch', { field: field, value: value });
  }
  function value(field, fallback) { return state.data[field] || fallback || ''; }
  function setInput(input, next) {
    if (document.activeElement !== input && input.value !== next) input.value = next;
  }
  function field(parent, label, name, example, options) {
    options = options || {};
    var wrap = node('label', 'order-editor-field');
    var title = node('span', '', label);
    var input = node(options.multiline ? 'textarea' : 'input', 'order-editor-input');
    if (!options.multiline) input.type = options.type || 'text';
    input.placeholder = example;
    input.setAttribute('aria-label', label);
    if (options.maxLength) input.maxLength = options.maxLength;
    input.value = value(name);
    input.addEventListener('input', function () { patch(name, input.value); });
    wrap.append(title, input);
    parent.appendChild(wrap);
    activeInputs[name] = input;
    return input;
  }

  function login() {
    $('#login').hidden = false;
    $('#desktop').hidden = true;
    $('#taskbar').hidden = true;
    hooks.closeAll();
    $('#login-msg').textContent = '선물 받는 분이 처음 보게 될 화면이에요.';
    var user = $('#login-user');
    user.disabled = false;
    user.placeholder = '예: 겨울 마켓 방문자';
    user.value = value('recipientName');
    user.oninput = function () { patch('recipientName', user.value); };
    activeInputs.recipientName = user;
    var password = $('#login-pw');
    password.placeholder = state.data.sitePasswordSet ? '설정된 비밀번호 · 변경 시 입력' : '4~20자 입력';
    password.value = value('sitePassword');
    password.oninput = function () { patch('sitePassword', password.value); };
    activeInputs.sitePassword = password;
    var hint = $('#order-editor-hint');
    if (!hint) {
      var wrap = node('label', 'order-editor-login-hint');
      wrap.appendChild(node('span', '', 'Password hint:'));
      hint = node('input'); hint.id = 'order-editor-hint';
      hint.placeholder = '예: 우리가 처음 만난 날';
      wrap.appendChild(hint);
      $('.login-main').appendChild(wrap);
    }
    hint.value = value('sitePasswordHint');
    hint.oninput = function () { patch('sitePasswordHint', hint.value); };
    activeInputs.sitePasswordHint = hint;
    $('#login-demo-row').hidden = true;
    $('#login-cancel').hidden = true;
    $('#login-ok').textContent = '다음 단계';
    $('#login-ok').onclick = function () { post('next'); };
    $('#login-err').hidden = true;
  }

  function enterDesktop() {
    if (!entered) { hooks.enter(); entered = true; }
    $('#login').hidden = true;
    $('#desktop').hidden = false;
    $('#taskbar').hidden = false;
    hooks.closeAll();
    activeInputs = {};
  }

  function information() {
    hooks.openInformation('우리의 크리스마스');
    var content = $('.information-content', hooks.createWin('information').body);
    content.replaceChildren();
    content.appendChild(node('p', 'order-editor-example', '예시를 눌러 두 사람의 이야기로 바꿔 보세요.'));
    var day = field(content, '특별한 날', 'specialDay', '예: 2026-12-25', { type: 'date' });
    if (!state.data.specialDay) {
      day.value = '2026-12-25';
      day.dataset.example = 'true';
      day.classList.add('order-editor-sample');
      day.addEventListener('focus', function () {
        if (day.dataset.example) { day.value = ''; delete day.dataset.example; day.classList.remove('order-editor-sample'); }
      });
      day.addEventListener('input', function () { delete day.dataset.example; day.classList.remove('order-editor-sample'); });
    }
    field(content, '특별한 장소', 'specialPlace', '예: 우리의 겨울 마켓', { maxLength: 100 });
    field(content, '우리의 이야기', 'specialOccasion', '예: 올해도 함께여서 참 좋았어.', { multiline: true, maxLength: 50 });
  }

  function chooseLetter(choice) {
    patch('letterChoice', choice);
    var original = $('#order-editor-original-choice');
    var ai = $('#order-editor-ai-choice');
    if (original) original.setAttribute('aria-pressed', String(choice === 'ORIGINAL'));
    if (ai) ai.setAttribute('aria-pressed', String(choice === 'AI'));
  }
  function letter() {
    hooks.openNote('letter');
    var content = $('.content', hooks.createWin('note:letter').body);
    content.replaceChildren();
    content.appendChild(node('p', 'order-editor-example', '받는 분에게 전하고 싶은 말을 적어 주세요.'));
    var original = field(content, '내가 쓴 편지', 'letterInput', '예: 함께 보낸 겨울이 참 좋았어.', { multiline: true, maxLength: 2000 });
    original.rows = 6;
    original.addEventListener('input', function () { chooseLetter('ORIGINAL'); });
    var controls = node('div', 'order-editor-letter-actions');
    var originalChoice = node('button', 'btn', '원문 사용');
    originalChoice.type = 'button'; originalChoice.id = 'order-editor-original-choice';
    originalChoice.onclick = function () { chooseLetter('ORIGINAL'); };
    var generate = node('button', 'btn', 'AI 도움받기');
    generate.type = 'button'; generate.id = 'order-editor-ai-generate';
    generate.onclick = function () { post('generate-ai'); };
    controls.append(originalChoice, generate);
    content.appendChild(controls);
    var aiBox = node('div', 'order-editor-ai-box'); aiBox.id = 'order-editor-ai-box';
    var aiText = field(aiBox, 'AI가 다듬은 편지 · 직접 수정 가능', 'letterAi', 'AI 문장을 생성하면 여기에 보여요.', { multiline: true, maxLength: 2000 });
    aiText.rows = 6;
    var aiChoice = node('button', 'btn', '이 문장 사용');
    aiChoice.type = 'button'; aiChoice.id = 'order-editor-ai-choice';
    aiChoice.onclick = function () { chooseLetter('AI'); };
    aiBox.appendChild(aiChoice);
    content.appendChild(aiBox);
    syncLetter();
  }
  function syncLetter() {
    var aiBox = $('#order-editor-ai-box');
    if (!aiBox) return;
    aiBox.hidden = !value('letterAi');
    setInput(activeInputs.letterAi, value('letterAi'));
    $('#order-editor-ai-generate').disabled = aiBusy;
    $('#order-editor-ai-generate').textContent = aiBusy ? '생성 중…' : value('letterAi') ? 'AI 문장 다시 생성' : 'AI 도움받기';
    $('#order-editor-original-choice').setAttribute('aria-pressed', String(state.data.letterChoice === 'ORIGINAL'));
    $('#order-editor-ai-choice').setAttribute('aria-pressed', String(state.data.letterChoice === 'AI'));
  }

  function media(kind) {
    var title = kind === 'photos' ? '사진관 / 사진' : '사진관 / 영상';
    var win = hooks.createWin('order-editor-' + kind, title, { w: 620, h: 470 }, function (w, body) {
      body.appendChild(node('div', 'addr', '/사진관/' + (kind === 'photos' ? '사진/' : '영상/')));
      var content = node('div', 'content order-editor-media-content');
      content.appendChild(node('p', 'order-editor-example', kind === 'photos' ? '빈 파일을 눌러 사진을 넣어 보세요.' : '영상을 넣으면 사진관의 영상 폴더에 보여요.'));
      var list = node('div', 'order-editor-media-files'); list.id = 'order-editor-media-files';
      content.appendChild(list); body.appendChild(content);
    });
    if (win) renderMedia(kind);
  }
  function renderMedia(kind) {
    var list = $('#order-editor-media-files'); if (!list) return;
    list.replaceChildren();
    var items = state.media[kind] || [];
    var count = items.filter(Boolean).length;
    var summary = node('p', 'order-editor-media-count', kind === 'photos' ? '사진 ' + count + '장 · 최소 ' + (state.limits.minPhotos || 0) + '장' : '영상 ' + count + '개 · 선택 사항');
    list.appendChild(summary);
    items.forEach(function (item, index) {
      if (!item) return;
      var card = node('div', 'order-editor-media-card');
      var icon = node('img');
      icon.alt = '';
      icon.src = kind === 'photos'
        ? (localPreviews.photos[index] || item.url || 'assets/icons/photo.svg')
        : 'assets/icons/video.svg';
      icon.onerror = function () { icon.onerror = null; icon.src = kind === 'photos' ? 'assets/icons/photo.svg' : 'assets/icons/video.svg'; };
      card.appendChild(icon);
      card.appendChild(node('span', 'order-editor-media-name', item.name || '업로드 중…'));
      card.appendChild(node('small', '', item.status === 'loading' ? '업로드 중…' : item.status === 'error' ? '업로드 실패 · 다시 올려 주세요' : '저장됨'));
      if (item.status === 'ready') {
        var caption = node('input', 'order-editor-input');
        caption.value = item.text || '';
        caption.placeholder = kind === 'photos' ? '사진 설명' : '영상 제목';
        caption.maxLength = state.limits.captionMaxLength || 10;
        caption.setAttribute('aria-label', (kind === 'photos' ? '사진 설명 ' : '영상 제목 ') + (index + 1));
        caption.onchange = function () { post('caption', { kind: kind, index: index, value: caption.value }); };
        card.appendChild(caption);
      }
      var remove = node('button', 'btn', '삭제'); remove.type = 'button';
      remove.onclick = function () {
        state.media[kind][index] = null;
        if (localPreviews[kind][index]) { URL.revokeObjectURL(localPreviews[kind][index]); delete localPreviews[kind][index]; }
        post('remove', { kind: kind, index: index }); renderMedia(kind);
      };
      card.appendChild(remove);
      list.appendChild(card);
    });
    var add = node('label', 'order-editor-upload');
    add.appendChild(node('img')).src = kind === 'photos' ? 'assets/icons/photo.svg' : 'assets/icons/video.svg';
    add.appendChild(node('span', '', kind === 'photos' ? '사진 추가' : '영상 추가'));
    var input = node('input'); input.type = 'file';
    input.accept = kind === 'photos' ? 'image/*,.heic' : 'video/*';
    input.setAttribute('aria-label', kind === 'photos' ? '사진 추가' : '영상 추가');
    input.onchange = function () {
      var file = input.files && input.files[0]; if (!file) return;
      var index = state.media[kind].findIndex(function (item) { return !item; });
      if (index < 0) return;
      if (kind === 'photos') localPreviews.photos[index] = URL.createObjectURL(file);
      state.media[kind][index] = { name: file.name, status: 'loading', text: '' };
      post('upload', { kind: kind, index: index, file: file });
      renderMedia(kind);
    };
    add.appendChild(input); list.appendChild(add);
    if (items.every(Boolean)) add.hidden = true;
  }

  function music() {
    hooks.createWin('order-editor-music', '겨울 플레이리스트', { w: 620, h: 540 }, function (w, body) {
      var content = node('div', 'content order-editor-music-content');
      content.appendChild(node('p', 'order-editor-example', '캐럴 무대에서 들을 음악을 적어 주세요.'));
      var list = node('div'); list.id = 'order-editor-music-list'; content.appendChild(list);
      body.appendChild(content);
    });
    renderMusic();
  }
  function renderMusic() {
    var list = $('#order-editor-music-list'); if (!list) return;
    list.replaceChildren();
    var musics = state.data.musics && state.data.musics.length ? state.data.musics : [{ title: '', artist: '', youtubeUrl: '' }];
    musics.forEach(function (music, index) {
      var card = node('div', 'order-editor-music-card');
      card.appendChild(node('strong', '', '음악 ' + (index + 1)));
      [['title', '음악 제목'], ['artist', '가수'], ['youtubeUrl', '유튜브 링크 (선택)']].forEach(function (fieldInfo) {
        var wrap = node('label', 'order-editor-field'); wrap.appendChild(node('span', '', fieldInfo[1]));
        var input = node('input', 'order-editor-input'); input.value = music[fieldInfo[0]] || '';
        input.placeholder = fieldInfo[1]; input.setAttribute('aria-label', '음악 ' + (index + 1) + ' ' + fieldInfo[1]);
        input.oninput = function () {
          var next = musics.map(function (item) { return Object.assign({}, item); });
          next[index][fieldInfo[0]] = input.value;
          state.data.musics = next; post('patch', { field: 'musics', value: next });
        };
        wrap.appendChild(input); card.appendChild(wrap);
      });
      if (musics.length > 1) {
        var remove = node('button', 'btn', '음악 삭제'); remove.type = 'button';
        remove.onclick = function () { state.data.musics = musics.filter(function (_, i) { return i !== index; }); post('patch', { field: 'musics', value: state.data.musics }); renderMusic(); };
        card.appendChild(remove);
      }
      list.appendChild(card);
    });
    var add = node('button', 'btn', '+ 음악 추가'); add.type = 'button';
    add.onclick = function () { state.data.musics = musics.concat({ title: '', artist: '', youtubeUrl: '' }); post('patch', { field: 'musics', value: state.data.musics }); renderMusic(); };
    list.appendChild(add);
  }

  function link() {
    hooks.createWin('order-editor-link', '마켓 입구 안내판', { w: 560, h: 310 }, function (w, body) {
      var content = node('div', 'content');
      content.appendChild(node('p', 'order-editor-example', '완성된 사이트에서 안내판을 누르면 열리는 주소예요.'));
      field(content, '연결할 웹 주소', 'linkUrl', '예: https://www.youtube.com/watch?v=...', { type: 'url', maxLength: 500 });
      body.appendChild(content);
    });
  }

  function show(next) {
    if (next === 'login') { login(); return; }
    enterDesktop();
    var targetId = { information: 'tree', letter: 'letter', photo: 'photo', video: 'photo', music: 'music', link: 'internet' }[next];
    var target = window.SITE.icons.find(function (icon) { return icon.id === targetId; });
    hooks.highlight(target && target.highlight);
    if (next === 'information') information();
    else if (next === 'letter') letter();
    else if (next === 'photo') media('photos');
    else if (next === 'video') media('videos');
    else if (next === 'music') music();
    else if (next === 'link') link();
  }
  window.addEventListener('message', function (event) {
    if (event.source !== window.parent || !allowedOrigins.includes(event.origin)) return;
    if (!parentOrigin) { parentOrigin = event.origin; post('ready'); }
    if (event.origin !== parentOrigin) return;
    var message = event.data;
    if (!message || message.channel !== 'urluv-order-editor') return;
    if (message.type === 'ping') { post('ready'); return; }
    if (message.type === 'ai-status') { aiBusy = !!message.busy; syncLetter(); return; }
    if (message.type !== 'render' || !message.step) return;
    state.data = message.data || {};
    state.media = message.media || { photos: [], videos: [] };
    state.limits = message.limits || {};
    if (step !== message.step) { step = message.step; show(step); return; }
    Object.keys(activeInputs).forEach(function (name) {
      if (activeInputs[name] && !activeInputs[name].dataset.example) setInput(activeInputs[name], value(name));
    });
    if (step === 'letter') syncLetter();
    if (step === 'photo' || step === 'video') renderMedia(step === 'photo' ? 'photos' : 'videos');
  });
  post('ready');
})();
