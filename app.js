(function () {
  var S = window.SITE;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var el = function (tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); };

  // theme
  var r = document.documentElement.style;
  r.setProperty("--main", S.theme.main); r.setProperty("--dark", S.theme.dark);
  r.setProperty("--light", S.theme.light); r.setProperty("--bg", S.theme.bg);
  document.title = S.title;

  // ---------- login ----------
  $("#login-title").textContent = S.loginTitle;
  $("#login-msg").textContent = S.loginMessage;
  $("#login-user").value = S.userName;
  $("#sm-title").textContent = S.startMenu;

  // 순수 JS SHA-256 (file:// 등 비보안 컨텍스트에서도 동작)
  function sha256(str) {
    var m = unescape(encodeURIComponent(str)), l = m.length, w = [], i, j;
    var K = [], H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var p = 2, n = 0;
    while (n < 64) {
      var prime = true;
      for (i = 2; i * i <= p; i++) if (p % i === 0) { prime = false; break; }
      if (prime) { K[n++] = (Math.pow(p, 1 / 3) * 4294967296) | 0; }
      p++;
    }
    for (i = 0; i < l; i++) w[i >> 2] |= m.charCodeAt(i) << (24 - (i % 4) * 8);
    w[l >> 2] |= 0x80 << (24 - (l % 4) * 8);
    w[(((l + 8) >> 6) << 4) + 15] = l * 8;
    var rr = function (x, c) { return (x >>> c) | (x << (32 - c)); };
    for (j = 0; j < w.length; j += 16) {
      var a = H.slice(), x = [];
      for (i = 0; i < 64; i++) {
        if (i < 16) x[i] = w[j + i] | 0;
        else x[i] = (x[i - 16] + (rr(x[i - 15], 7) ^ rr(x[i - 15], 18) ^ (x[i - 15] >>> 3)) + x[i - 7] + (rr(x[i - 2], 17) ^ rr(x[i - 2], 19) ^ (x[i - 2] >>> 10))) | 0;
        var t1 = (a[7] + (rr(a[4], 6) ^ rr(a[4], 11) ^ rr(a[4], 25)) + ((a[4] & a[5]) ^ (~a[4] & a[6])) + K[i] + x[i]) | 0;
        var t2 = ((rr(a[0], 2) ^ rr(a[0], 13) ^ rr(a[0], 22)) + ((a[0] & a[1]) ^ (a[0] & a[2]) ^ (a[1] & a[2]))) | 0;
        a = [(t1 + t2) | 0, a[0], a[1], a[2], (a[3] + t1) | 0, a[4], a[5], a[6]];
      }
      for (i = 0; i < 8; i++) H[i] = (H[i] + a[i]) | 0;
    }
    return H.map(function (h) { return ("00000000" + (h >>> 0).toString(16)).slice(-8); }).join("");
  }

  var site = window.UrluvSite || { key: null };

  function wrongPassword(message) {
    $("#login-err").textContent = message || "Wrong Password!";
    $("#login-err").hidden = false;
    var l = $("#login"); l.classList.remove("shake"); void l.offsetWidth; l.classList.add("shake");
    $("#login-pw").select();
  }

  var checking = false;
  function tryLogin() {
    // 고객 사이트: 비밀번호 확인과 내용은 서버가 줍니다.
    if (site.key) {
      if (checking) return;
      checking = true; $("#login-ok").disabled = true;
      site.open($("#login-pw").value).then(function (ok) {
        if (ok) enter(); else wrongPassword();
      }, function (error) {
        wrongPassword(error && error.message);
      }).then(function () { checking = false; $("#login-ok").disabled = false; });
      return;
    }
    if (sha256(S.passwordSalt + $("#login-pw").value) === S.passwordHash) {
      try { sessionStorage.setItem("anniv-auth", "1"); } catch (e) {}
      enter();
    } else {
      wrongPassword();
    }
  }
  $("#login-ok").onclick = tryLogin;
  $("#login-pw").addEventListener("keydown", function (e) { if (e.key === "Enter") tryLogin(); });
  $("#login-cancel").onclick = function () { $("#login-pw").value = ""; $("#login-err").hidden = true; };

  function enter() {
    $("#login").hidden = true;
    $("#desktop").hidden = false;
    $("#taskbar").hidden = false;
    buildDesktop();
    selectAvatar();
    window.DesktopMemos.enter();
    tick();
    if (S.siteMode !== "christmas" && !openWins.information) openInformation();
  }

  function selectAvatar() {
    var sprite = document.querySelector("#player .avatar-sprite");
    if (!sprite) return;
    var avatar = Math.floor(Math.random() * 4) + 1;
    sprite.dataset.avatar = String(avatar);
    sprite.style.backgroundImage = 'url("assets/sprites/market-avatar-' + avatar + '.png")';
  }
  if (site.key && site.previewing) {
    // 운영자 미리보기: 비밀번호 화면을 건너뛰고 바로 엽니다.
    var banner = document.createElement("p");
    banner.className = "admin-preview-banner";
    banner.setAttribute("role", "status");
    banner.textContent = "관리자 미리보기 · 고객에게는 비밀번호 화면부터 보여요";
    document.body.appendChild(banner);
    site.preview().then(function () { enter(); }, function (error) {
      banner.textContent += " · " + (error && error.message || "사이트를 불러오지 못했어요.");
    });
  } else if (site.key) {
    // 받는 분 이름과 힌트를 잠금 화면에 보여 주고, 이 탭에서 이미 열었으면 바로 들어갑니다.
    site.lock().then(function (lock) {
      $("#login-user").value = lock.recipientName || "";
      $("#login-msg").textContent = lock.passwordHint ? S.loginMessage + "\n(힌트: " + lock.passwordHint + ")" : S.loginMessage;
    }, function (error) {
      $("#login-msg").textContent = error && error.message || "사이트를 불러오지 못했어요.";
      $("#login-pw").disabled = true; $("#login-ok").disabled = true;
    });
    site.resume().then(function (ok) { if (ok) enter(); });
  } else {
    // 데모 화면: 비밀번호를 몰라도 둘러볼 수 있게 우회 버튼을 보여 줍니다(고객 사이트에는 없음).
    $("#login-demo-row").hidden = false;
    $("#login-demo").onclick = function () {
      try { sessionStorage.setItem("anniv-auth", "1"); } catch (e) {}
      enter();
    };
    try { if (sessionStorage.getItem("anniv-auth") === "1") { setTimeout(enter, 0); } } catch (e) {}
  }

  // ---------- clock / d-day ----------
  function tick() {
    var d = new Date();
    var h = d.getHours(), m = d.getMinutes();
    $("#clock").textContent = (h % 12 || 12) + ":" + String(m).padStart(2, "0") + " " + (h < 12 ? "AM" : "PM");
    var start = new Date(S.startDate + "T00:00:00");
    var today = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var days = Math.floor((today - start) / 864e5) + 1;
    if (S.siteMode === "christmas" && !Number.isNaN(start.getTime())) {
      var until = Math.round((start - today) / 864e5);
      $("#dday").textContent = until > 0 ? "❄ D-" + until : until === 0 ? "❄ D-DAY" : "❄ D+" + Math.abs(until);
    } else $("#dday").textContent = "♥ D+" + days;
    window.RenewalNotice.update(d);
  }
  setInterval(tick, 20000);
  $("#clover").onclick = function () { alert("메리 크리스마스!\n오늘의 추억을 선물해요."); };

  // ---------- desktop ----------
  var MAP_WIDTH = 1585, MAP_HEIGHT = 992;
  var camera = { scale: 1, x: 0, y: 0 };
  var selectedMapHighlight = null, requestedMapHighlight = null, mapHighlightCache = Object.create(null);
  function showMapHighlight(path) {
    var layer = $("#market-highlight-map");
    requestedMapHighlight = path || null;
    if (!path) {
      layer.classList.remove("is-visible");
      return;
    }
    if (mapHighlightCache[path] === true) {
      layer.style.backgroundImage = 'url("' + path + '")';
      layer.classList.add("is-visible");
      return;
    }
    if (mapHighlightCache[path]) return;
    var image = new Image();
    mapHighlightCache[path] = image;
    image.onload = function () {
      mapHighlightCache[path] = true;
      if (requestedMapHighlight === path) {
        layer.style.backgroundImage = 'url("' + path + '")';
        layer.classList.add("is-visible");
      }
    };
    image.src = path;
  }
  function updateCamera() {
    var desktop = $("#desktop"), world = $(".market-world"), player = $("#player");
    if (!desktop || !world || !player || desktop.hidden) return;
    var width = desktop.clientWidth, height = desktop.clientHeight;
    if (!width || !height) return;
    var scale = Math.max(width / MAP_WIDTH, height / MAP_HEIGHT);
    var worldWidth = MAP_WIDTH * scale, worldHeight = MAP_HEIGHT * scale;
    var playerX = (parseFloat(player.style.left) || 50) / 100 * MAP_WIDTH * scale;
    var playerY = (parseFloat(player.style.top) || 62) / 100 * MAP_HEIGHT * scale;
    var x = Math.max(width - worldWidth, Math.min(0, width / 2 - playerX));
    var y = Math.max(height - worldHeight, Math.min(0, height / 2 - playerY));
    camera = { scale: scale, x: x, y: y };
    world.style.transform = "translate3d(" + x + "px," + y + "px,0) scale(" + scale + ")";
  }

  function buildDesktop() {
    var dt = $("#desktop");
    if (dt.querySelector(".desktop-icons")) return;
    var iconGrid = el("div", "desktop-icons");
    var world = $(".market-world");
    world.appendChild(iconGrid);
    S.icons.forEach(function (ic) {
      var d = el("div", "dicon");
      d.dataset.marketId = ic.id;
      d.setAttribute("role", "button");
      d.setAttribute("tabindex", "0");
      d.setAttribute("aria-label", ic.label + " 가판대 열기");
      d.title = ic.label;
      var label = el("span", "lb"); label.textContent = ic.label;
      d.appendChild(label);
      var open = function () { launch(ic); };
      d.addEventListener("mouseenter", function () { showMapHighlight(ic.highlight); });
      d.addEventListener("mouseleave", function () { showMapHighlight(selectedMapHighlight); });
      d.addEventListener("focus", function () { showMapHighlight(ic.highlight); });
      d.addEventListener("blur", function () { showMapHighlight(selectedMapHighlight); });
      d.addEventListener("click", function () {
        document.querySelectorAll(".dicon.sel").forEach(function (x) { x.classList.remove("sel"); });
        d.classList.add("sel");
        selectedMapHighlight = ic.highlight;
        showMapHighlight(selectedMapHighlight);
        walkTo(d);
        window.setTimeout(open, 180);
      });
      d.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); d.click(); }
      });
      iconGrid.appendChild(d);
    });
    dt.addEventListener("click", function (e) {
      if (e.target === dt || e.target === world || e.target === iconGrid) {
        document.querySelectorAll(".dicon.sel").forEach(function (x) { x.classList.remove("sel"); });
        selectedMapHighlight = null;
        showMapHighlight(null);
        movePlayer(e.clientX, e.clientY);
      }
    });
    installMovement();
  }

  var playerInstalled = false;
  function setPlayer(left, top) {
    var player = $("#player");
    if (!player) return;
    left = Math.max(3, Math.min(97, left));
    top = Math.max(5, Math.min(95, top));
    player.style.left = left + "%";
    player.style.top = top + "%";
    try { localStorage.setItem("urluv-winter-player:" + (site.key || "demo"), JSON.stringify({ left: left, top: top })); } catch (e) {}
    updateCamera();
  }
  function movePlayer(clientX, clientY) {
    var rect = $("#desktop").getBoundingClientRect();
    setPlayer((clientX - rect.left - camera.x) / camera.scale / MAP_WIDTH * 100,
      (clientY - rect.top - camera.y) / camera.scale / MAP_HEIGHT * 100);
  }
  function walkTo(icon) {
    setPlayer((icon.offsetLeft + icon.offsetWidth / 2) / MAP_WIDTH * 100,
      (icon.offsetTop + icon.offsetHeight * .9) / MAP_HEIGHT * 100);
  }
  function installMovement() {
    if (playerInstalled) return;
    playerInstalled = true;
    var player = $("#player"), start = { left: 50, top: 62 };
    try { start = JSON.parse(localStorage.getItem("urluv-winter-player:" + (site.key || "demo")) || "null") || start; } catch (e) {}
    player.style.left = start.left + "%"; player.style.top = start.top + "%";
    updateCamera();
    window.addEventListener("resize", updateCamera);
    function step(dx, dy) {
      var left = parseFloat(player.style.left) || 50, top = parseFloat(player.style.top) || 62;
      player.classList.remove("facing-up", "facing-down", "facing-left", "facing-right");
      player.classList.add(Math.abs(dx) > Math.abs(dy)
        ? (dx < 0 ? "facing-left" : "facing-right")
        : (dy < 0 ? "facing-up" : "facing-down"));
      setPlayer(left + dx / MAP_WIDTH * 100, top + dy / MAP_HEIGHT * 100);
      player.classList.add("walking"); window.clearTimeout(player.walkTimer);
      player.walkTimer = window.setTimeout(function () { player.classList.remove("walking"); }, 180);
    }
    document.addEventListener("keydown", function (event) {
      if (event.target.closest("input,textarea,[contenteditable=true]") || $("#desktop").hidden) return;
      var move = { ArrowUp:[0,-44],w:[0,-44],W:[0,-44],ArrowDown:[0,44],s:[0,44],S:[0,44],ArrowLeft:[-44,0],a:[-44,0],A:[-44,0],ArrowRight:[44,0],d:[44,0],D:[44,0] }[event.key];
      if (!move) return;
      event.preventDefault(); step(move[0], move[1]);
    });
    document.querySelectorAll(".market-dpad [data-move]").forEach(function (button) {
      button.addEventListener("click", function () {
        var move = { up:[0,-60],down:[0,60],left:[-60,0],right:[60,0] }[button.dataset.move];
        step(move[0], move[1]);
      });
    });
  }

  function launch(ic) {
    if (ic.type === "information") openInformation(ic.windowTitle);
    else if (ic.type === "gallery") openGalleryChoice();
    else if (ic.type === "folder") openFolder(ic.ref);
    else if (ic.type === "note") openNote(ic.ref);
    else if (ic.type === "gift") $("#memo-add").click();
    else if (ic.type === "photobooth") openBooth();
    else if (ic.type === "paint") openPaint();
    else if (ic.type === "game") openMinesweeper();
    else if (ic.type === "link") window.open(ic.url, "_blank", "noopener");
    else if (ic.type === "trash") alert("휴지통은 비어 있어요. 우리 추억은 하나도 버리지 않았거든요.");
  }

  function openGalleryChoice() {
    var chooser = createWin("photo-gallery-choice", "사진관", { w: 390, h: 250 }, function (w, body) {
      var content = el("div", "content gallery-choice");
      content.appendChild(el("p", "gallery-choice-title", "무엇을 볼까요?"));
      [["📷 사진 보기", "photo"], ["🎞️ 영상 보기", "video"]].forEach(function (choice) {
        var button = el("button", "btn gallery-choice-button", choice[0]);
        button.onclick = function () {
          w.el.querySelector(".titlebar .tbtn:last-child").click();
          openFolder(choice[1]);
        };
        content.appendChild(button);
      });
      body.appendChild(content);
    });
    return chooser;
  }

  // ---------- window manager ----------
  var openWins = {}, z = 10, cascade = 0;
  var windowsEl = $("#windows"), tasksEl = $("#tasks");

  function focusWin(w) {
    document.querySelectorAll("#windows .win").forEach(function (x) { x.classList.remove("focused"); });
    w.el.classList.add("focused"); w.el.style.zIndex = ++z;
    w.el.hidden = false; w.min = false;
    document.querySelectorAll("#tasks .btn").forEach(function (b) { b.classList.remove("on"); });
    w.task.classList.add("on");
  }

  function createWin(key, title, opts, build) {
    if (key && openWins[key]) { focusWin(openWins[key]); return openWins[key]; }
    opts = opts || {};
    var win = el("div", "win");
    var tb = el("div", "titlebar");
    var t = el("span", "title"); t.textContent = title;
    var bMin = el("button", "tbtn", "_"), bMax = el("button", "tbtn", "□"), bClose = el("button", "tbtn", "✕");
    tb.append(t, bMin, bMax, bClose);
    var body = el("div", "win-body"); body.style.cssText = "flex:1;min-height:0;display:flex;flex-direction:column";
    win.append(tb, body);
    var W = Math.min(opts.w || 520, innerWidth - 20), H = Math.min(opts.h || 400, innerHeight - 70);
    win.style.width = W + "px"; win.style.height = H + "px";
    var off = (cascade++ % 6) * 26;
    win.style.left = Math.max(4, Math.min(innerWidth - W - 4, 110 + off)) + "px";
    win.style.top = Math.max(4, 30 + off) + "px";
    windowsEl.appendChild(win);

    var task = el("button", "btn"); task.textContent = title;
    tasksEl.appendChild(task);
    var w = { el: win, task: task, title: t, body: body, key: key };
    if (key) openWins[key] = w;

    win.addEventListener("pointerdown", function () { focusWin(w); });
    task.onclick = function () {
      if (w.min || !win.classList.contains("focused")) focusWin(w);
      else { win.hidden = true; w.min = true; task.classList.remove("on"); }
    };
    bMin.onclick = function (e) { e.stopPropagation(); win.hidden = true; w.min = true; task.classList.remove("on"); };
    bMax.onclick = function (e) { e.stopPropagation(); win.classList.toggle("max"); };
    tb.addEventListener("dblclick", function () { win.classList.toggle("max"); });
    bClose.onclick = function (e) {
      e.stopPropagation();
      if (w.onclose) w.onclose();
      win.remove(); task.remove(); if (key) delete openWins[key];
    };
    // drag
    tb.addEventListener("pointerdown", function (e) {
      if (e.target.closest(".tbtn") || win.classList.contains("max") || matchMedia("(max-width:640px)").matches) return;
      var sx = e.clientX, sy = e.clientY, ox = win.offsetLeft, oy = win.offsetTop;
      tb.setPointerCapture(e.pointerId);
      var mv = function (ev) {
        win.style.left = Math.max(-W + 80, Math.min(innerWidth - 80, ox + ev.clientX - sx)) + "px";
        win.style.top = Math.max(0, Math.min(innerHeight - 70, oy + ev.clientY - sy)) + "px";
      };
      var up = function () { tb.removeEventListener("pointermove", mv); tb.removeEventListener("pointerup", up); };
      tb.addEventListener("pointermove", mv); tb.addEventListener("pointerup", up);
    });
    build(w, body);
    focusWin(w);
    return w;
  }

  // ---------- apps ----------
  function openInformation(title) {
    createWin("information", title || (S.siteMode === "christmas" ? "우리의 크리스마스" : "Our Story"), { w: 520, h: 360 }, function (w, body) {
      var info = S.information || {};
      var content = el("div", "content information-content");
      var list = el("dl", "information-list");
      [["특별한 날", info.specialDate], ["특별한 장소", info.specialPlace], ["우리의 이야기", info.story]].forEach(function (field) {
        var term = el("dt"); term.textContent = field[0];
        var detail = el("dd"); detail.textContent = field[1] || "";
        list.append(term, detail);
      });
      content.appendChild(list); body.appendChild(content);
    });
  }

  function openNote(ref) {
    var n = S.notes[ref];
    createWin("note:" + ref, n.title || (ref === "letter" ? "Letter" : ref + " - Notepad"), { w: 560, h: 420 }, function (w, b) {
      b.appendChild(el("div", "menubar", "<span>File</span><span>Edit</span><span>Search</span><span>Help</span>"));
      var c = el("div", "content"); var p = el("pre", "note"); p.textContent = n.text; c.appendChild(p); b.appendChild(c);
    });
  }

  function textWin(name, text) {
    createWin("text:" + name, name + " - Notepad", { w: 480, h: 340 }, function (w, b) {
      var c = el("div", "content"); var p = el("pre", "note"); p.textContent = text; c.appendChild(p); b.appendChild(c);
    });
  }

  function placeholderSVG(label, hue) {
    var h = hue || 340;
    return "data:image/svg+xml;utf8," + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(' + h + ',80%,88%)"/><stop offset="1" stop-color="hsl(' + (h + 30) + ',70%,72%)"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><text x="200" y="150" font-size="60" text-anchor="middle">♥</text><text x="200" y="200" font-size="18" text-anchor="middle" fill="#7a3550" font-family="monospace">' + esc(label) + "</text></svg>");
  }

  function viewFile(f) {
    if (f.type === "game" && f.ref === "minesweeper") return openMinesweeper();
    if (f.type === "text") return textWin(f.name, f.text);
    if (f.type === "folder") return openFolder(f.ref);
    createWin("view:" + f.name, f.name, { w: 520, h: 420 }, function (w, b) {
      var c = el("div", "content"); var v = el("div", "viewer");
      if (f.type === "image") {
        var ph = placeholderSVG(f.caption || f.name, 330 + (f.name.length * 7) % 40);
        var img = el("img"); img.onerror = function () { img.onerror = null; img.src = ph; };
        img.src = f.src || ph;
        img.alt = f.caption || f.name; v.appendChild(img);
      } else if (f.type === "video") {
        var vph = function () { var im = el("img"); im.src = placeholderSVG("▶ " + (f.caption || f.name), 320); return im; };
        if (f.src) {
          var vd = el("video"); vd.src = f.src; vd.controls = true; vd.playsInline = true;
          vd.onerror = function () { vd.replaceWith(vph()); };
          v.appendChild(vd);
        } else v.appendChild(vph());
      } else if (f.type === "audio") {
        v.appendChild(el("div", "", '<div style="font-size:48px;text-align:center">🎵</div>'));
        if (f.src) { var a = el("audio"); a.src = f.src; a.controls = true; v.appendChild(a); }
        else v.appendChild(el("div", "cap", "(오디오 파일을 data.js에 연결해 주세요)"));
      }
      if (f.caption) v.appendChild(el("div", "cap", esc(f.caption)));
      c.appendChild(v); b.appendChild(c);
      w.onclose = function () { var m = c.querySelector("video,audio"); if (m) m.pause(); };
    });
  }

  var ICON = { game: "💗", text: "📄", image: "🖼️", video: "🎞️", audio: "🎵", folder: "📁" };
  var FILE_ICON = { game: "assets/icons/heart.svg", text: "assets/icons/letter.svg", image: "assets/icons/file.svg", video: "assets/icons/video.svg", audio: "assets/icons/music.svg" };
  function openFolder(ref) {
    if (ref === "record") return openMusic();
    var f = S.folders[ref];
    createWin("folder:" + ref, f.title, { w: 520, h: 400 }, function (w, b) {
      b.appendChild(el("div", "addr", "/" + esc(f.title) + "/"));
      var c = el("div", "content"); var list = el("div", "files");
      f.files.forEach(function (file) {
        var d = el("div", "file" + (file.type === "game" ? " game-file" : ""));
        var iconBox = el("div", "ic");
        var iconSrc = file.type === "folder" && ref.indexOf("photo") === 0 ? "assets/icons/file.svg" : FILE_ICON[file.type];
        if (iconSrc) {
          var iconImage = el("img");
          iconImage.src = iconSrc;
          iconImage.alt = "";
          iconImage.draggable = false;
          iconBox.appendChild(iconImage);
        } else {
          iconBox.textContent = ICON[file.type] || "";
        }
        d.append(iconBox, document.createTextNode(file.name));
        d.addEventListener("click", function () {
          list.querySelectorAll(".sel").forEach(function (x) { x.classList.remove("sel"); });
          d.classList.add("sel");
          if (matchMedia("(pointer:coarse)").matches) viewFile(file);
        });
        d.addEventListener("dblclick", function () { viewFile(file); });
        list.appendChild(d);
      });
      c.appendChild(list); b.appendChild(c);
    });
  }

  // photobooth
  function openBooth() {
    createWin("booth", "Photo Booth", { w: 460, h: 560 }, function (w, b) {
      var frame = S.frames[0], stream = null;
      var root = el("div", "booth");
      var stage = el("div", "booth-stage"), box = el("div", "booth-frame");
      var ph = el("div", "ph", "카메라를 허용하면\n여기에 내 모습이 나와요");
      ph.style.whiteSpace = "pre-line";
      var video = el("video"); video.autoplay = true; video.muted = true; video.playsInline = true; video.hidden = true;
      var deco = el("div", "deco");
      box.append(ph, video, deco); stage.appendChild(box);
      var panel = el("div", "booth-panel");
      var frameRow = el("div", "row", "① Select the Frame");
      S.frames.forEach(function (fr, i) {
        var bt = el("button", "btn" + (i === 0 ? " on" : ""), esc(fr.label));
        bt.onclick = function () { frame = fr; panel.querySelectorAll(".row .btn").forEach(function (x) { x.classList.remove("on"); }); bt.classList.add("on"); paint(); };
        frameRow.appendChild(bt);
      });
      var shot = el("div", "row", "② Take a Photo ");
      var sh = el("button", "shutter"); sh.setAttribute("aria-label", "촬영");
      shot.appendChild(sh);
      var result = el("div", "row");
      panel.append(frameRow, shot, result);
      root.append(stage, panel); b.appendChild(root);

      function paint() {
        box.style.setProperty("--fc", frame.color);
        deco.innerHTML = "";
        [[6, 6], [82, 8], [10, 86], [84, 84]].forEach(function (p) {
          var i = el("i", "", frame.deco); i.style.left = p[0] + "%"; i.style.top = p[1] + "%"; deco.appendChild(i);
        });
      }
      paint();

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } }).then(function (s) {
          stream = s; video.srcObject = s; video.hidden = false; ph.hidden = true;
        }).catch(function () { ph.textContent = "카메라를 사용할 수 없어요.\n(그래도 촬영하면 프레임 샘플이 저장돼요)"; });
      }
      w.onclose = function () { if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); };

      sh.onclick = async function () {
        await document.fonts.load('28px "Departure Mono"');
        var cv = document.createElement("canvas"); cv.width = 600; cv.height = 800;
        var g = cv.getContext("2d");
        g.fillStyle = "#fdf6f9"; g.fillRect(0, 0, 600, 800);
        if (!video.hidden && video.videoWidth) {
          var vw = video.videoWidth, vh = video.videoHeight, tr = 600 / 800, sr = vw / vh, sx = 0, sy = 0, sw = vw, sh2 = vh;
          if (sr > tr) { sw = vh * tr; sx = (vw - sw) / 2; } else { sh2 = vw / tr; sy = (vh - sh2) / 2; }
          g.save(); g.translate(600, 0); g.scale(-1, 1); g.drawImage(video, sx, sy, sw, sh2, 0, 0, 600, 800); g.restore();
        } else {
          var gr = g.createLinearGradient(0, 0, 600, 800); gr.addColorStop(0, "#fde3ec"); gr.addColorStop(1, "#f6a6c1");
          g.fillStyle = gr; g.fillRect(0, 0, 600, 800);
          g.font = '120px "Departure Mono", serif'; g.textAlign = "center"; g.fillStyle = "#fff"; g.fillText("♥", 300, 430);
        }
        g.strokeStyle = frame.color; g.lineWidth = 50; g.strokeRect(0, 0, 600, 800);
        g.fillStyle = frame.color; g.font = '56px "Departure Mono", serif'; g.textAlign = "center";
        [[60, 80], [540, 80], [60, 760], [540, 760]].forEach(function (p) { g.fillText(frame.deco, p[0], p[1]); });
        g.fillStyle = "#fff"; g.font = '28px "Departure Mono", monospace'; g.fillText(S.names.join(" ♥ ") + "  " + new Date().toISOString().slice(0, 10), 300, 785);
        result.innerHTML = "";
        var a = el("a", "btn", "💾 저장"); a.href = cv.toDataURL("image/png"); a.download = "photobooth-" + Date.now() + ".png"; a.style.cssText = "text-decoration:none;color:#3a1f2a;display:inline-block";
        var th = el("img"); th.src = a.href; th.style.cssText = "height:60px;border:2px solid #fff";
        result.append(th, a);
      };
    });
  }

  // paint
  function openPaint() {
    createWin("paint", "untitled - Paint", { w: 560, h: 440 }, function (w, b) {
      var root = el("div", "paint"), tools = el("div", "paint-tools");
      var cv = el("canvas"); root.append(tools, cv); b.appendChild(root);
      var colors = ["#000000", "#e8789a", "#b8456b", "#ff9eb5", "#f4c542", "#7ec8a9", "#3d5f0d", "#5aa9e6", "#8d6ad8", "#ffffff"];
      var color = colors[0], size = 4, eraser = false;
      colors.forEach(function (c, i) {
        var s = el("div", "sw" + (i === 0 ? " on" : "")); s.style.background = c;
        s.onclick = function () { color = c; eraser = false; tools.querySelectorAll(".sw").forEach(function (x) { x.classList.remove("on"); }); s.classList.add("on"); };
        tools.appendChild(s);
      });
      var sz = el("input"); sz.type = "range"; sz.min = 1; sz.max = 24; sz.value = size; sz.oninput = function () { size = +sz.value; };
      var clr = el("button", "btn", "Clear"), sv = el("button", "btn", "Save");
      tools.append(sz, clr, sv);
      var g;
      function fit() {
        var r = cv.getBoundingClientRect(), old = g && cv.width ? cv.toDataURL() : null;
        cv.width = Math.max(1, r.width); cv.height = Math.max(1, r.height);
        g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height);
        if (old) { var im = new Image(); im.onload = function () { g.drawImage(im, 0, 0); }; im.src = old; }
      }
      requestAnimationFrame(fit);
      new ResizeObserver(function () { if (cv.getBoundingClientRect().width) fit(); }).observe(cv);
      var drawing = false, lx, ly;
      var pos = function (e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      cv.addEventListener("pointerdown", function (e) { drawing = true; cv.setPointerCapture(e.pointerId); var p = pos(e); lx = p[0]; ly = p[1]; });
      cv.addEventListener("pointermove", function (e) {
        if (!drawing) return; var p = pos(e);
        g.strokeStyle = color; g.lineWidth = size; g.lineCap = "round"; g.beginPath(); g.moveTo(lx, ly); g.lineTo(p[0], p[1]); g.stroke(); lx = p[0]; ly = p[1];
      });
      cv.addEventListener("pointerup", function () { drawing = false; });
      clr.onclick = function () { g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height); };
      sv.onclick = function () { var a = document.createElement("a"); a.href = cv.toDataURL("image/png"); a.download = "paint.png"; a.click(); };
    });
  }

  function openMusic() {
    createWin("music", "Music", { w: 520, h: 640 }, function (w, body) {
      w.el.classList.add("music-window");
      w.onclose = window.MusicPlayer.mount(body);
    });
  }

  function openMinesweeper() {
    createWin("game:minesweeper", "Game - minesweeper", { w: 390, h: 530 }, function (w, body) {
      w.onclose = window.mountMinesweeper(body);
    });
  }

  // ---------- start menu ----------
  var sm = $("#startmenu");
  $("#start").onclick = function (e) { e.stopPropagation(); sm.hidden = !sm.hidden; $("#start").setAttribute("aria-expanded", String(!sm.hidden)); };
  document.addEventListener("pointerdown", function (e) { if (!sm.hidden && !e.target.closest("#startmenu,#start")) sm.hidden = true; });
  sm.addEventListener("click", function (e) {
    var a = e.target.closest("button"); if (!a) return; sm.hidden = true;
    var act = a.dataset.act;
    if (act === "information") openInformation();
    else if (act === "gift") $("#memo-add").click();
    else if (act === "booth") openBooth();
    else if (act === "paint") openPaint();
    else if (act === "logout") { try { sessionStorage.removeItem("anniv-auth"); } catch (er) {} if (site.forget) site.forget(); location.reload(); }
  });
})();
