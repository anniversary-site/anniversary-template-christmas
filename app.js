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
  var orderEditor = new URLSearchParams(location.search).has("orderEditor") && window.parent !== window;
  var marketFacing = "down";
  var marketWalking = false;
  var lastPresencePublish = 0;
  var lastSnowballThrow = 0;
  var marketFrozenUntil = 0;

  function throwSnowball() {
    if ($("#desktop").hidden || Date.now() - lastSnowballThrow < 900 || Date.now() < marketFrozenUntil) return;
    lastSnowballThrow = Date.now();
    if (window.MarketPresence && window.MarketPresence.throwSnowball()) return;
    var player = $("#player");
    var x = parseFloat(player.style.left) || 50, y = parseFloat(player.style.top) || 62;
    var dx = marketFacing === "left" ? -250 / MAP_WIDTH * 100 : marketFacing === "right" ? 250 / MAP_WIDTH * 100 : 0;
    var dy = marketFacing === "up" ? -250 / MAP_HEIGHT * 100 : marketFacing === "down" ? 250 / MAP_HEIGHT * 100 : 0;
    showSnowball({ x: x, y: y, endX: Math.max(0, Math.min(100, x + dx)), endY: Math.max(0, Math.min(100, y + dy)) });
  }

  function showSnowball(event) {
    var world = $(".market-world");
    var x = Number(event.x), y = Number(event.y), endX = Number(event.endX), endY = Number(event.endY);
    if (!world || [x, y, endX, endY].some(function (value) { return !Number.isFinite(value) || value < 0 || value > 100; })) return;
    var snowball = el("span", "market-snowball");
    snowball.style.left = x + "%";
    snowball.style.top = y + "%";
    world.appendChild(snowball);
    var distance = Math.hypot((endX - x) / 100 * MAP_WIDTH, (endY - y) / 100 * MAP_HEIGHT);
    var duration = Math.max(180, Math.min(480, distance * 1.7));
    snowball.animate([
      { transform: "translate(-50%, -50%) scale(1)" },
      { transform: "translate(calc(-50% + " + ((endX - x) / 100 * MAP_WIDTH) + "px), calc(-50% + " + ((endY - y) / 100 * MAP_HEIGHT - 18) + "px)) scale(1.25)", offset: .5 },
      { transform: "translate(calc(-50% + " + ((endX - x) / 100 * MAP_WIDTH) + "px), calc(-50% + " + ((endY - y) / 100 * MAP_HEIGHT) + "px)) scale(.8)" }
    ], { duration: duration, easing: "ease-out" }).finished.catch(function () {}).then(function () { snowball.remove(); });
    if (!event.targetVisitorId) return;
    var target = Array.from($("#other-players").children).find(function (node) { return node.dataset.visitorId === event.targetVisitorId; });
    if (!target && window.MarketPresence && window.MarketPresence.isMe(event.targetVisitorId)) target = $("#player");
    if (!target) return;
    var until = Date.now() + 1800;
    target.dataset.snowedUntil = String(until);
    if (target.id === "player") {
      marketFrozenUntil = until;
      window.dispatchEvent(new Event("market-frozen"));
    }
    window.setTimeout(function () {
      if (Number(target.dataset.snowedUntil) !== until) return;
      target.classList.add("snowed");
      window.setTimeout(function () {
        if (Number(target.dataset.snowedUntil) === until) target.classList.remove("snowed");
      }, Math.max(0, until - Date.now()));
    }, duration);
  }

  window.MarketSnowball = { onEvent: showSnowball };

  function publishMarketPresence(force) {
    var player = $("#player");
    if (!player || !window.MarketPresence) return;
    var now = Date.now();
    if (!force && now - lastPresencePublish < 100) return;
    lastPresencePublish = now;
    window.MarketPresence.publish({
      x: parseFloat(player.style.left) || 50,
      y: parseFloat(player.style.top) || 62,
      facing: marketFacing,
      walking: marketWalking
    }, !!force);
  }

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
  $("#login-pw").addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    if (orderEditor) { e.preventDefault(); $("#login-ok").click(); }
    else tryLogin();
  });
  $("#login-cancel").onclick = function () { $("#login-pw").value = ""; $("#login-err").hidden = true; };

  function enter() {
    $("#login").hidden = true;
    $("#desktop").hidden = false;
    $("#taskbar").hidden = false;
    buildDesktop();
    var avatar = selectAvatar();
    window.DesktopMemos.enter();
    if (window.MarketPresence) {
      window.MarketPresence.start(avatar, function () {
        return {
          x: parseFloat(document.querySelector("#player").style.left) || 50,
          y: parseFloat(document.querySelector("#player").style.top) || 62,
          facing: marketFacing,
          walking: marketWalking
        };
      });
    }
    tick();
    if (S.siteMode !== "christmas") openInformation();
    else if (!orderEditor) openNotice();
  }

  function selectAvatar() {
    var sprite = document.querySelector("#player .avatar-sprite");
    if (!sprite) return;
    var avatar = Math.floor(Math.random() * 4) + 1;
    sprite.dataset.avatar = String(avatar);
    sprite.style.backgroundImage = 'url("assets/sprites/market-avatar-' + avatar + '.png' + (avatar === 3 ? '?v=2' : '') + '")';
    return avatar;
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
  } else if (orderEditor) {
    // 주문 사이트가 실제 로그인 화면부터 단계별로 보여 줍니다.
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
  var PLAYER_RADIUS = 17;
  // Tight map-space silhouettes prevent entering the painted object areas and rear sides.
  var BLOCKED_AREAS = [
    [[0,224],[34,180],[160,145],[304,194],[318,400],[300,446],[35,460],[0,415]], // photo studio
    [[309,345],[365,322],[408,312],[451,345],[455,473],[425,493],[320,485]],       // small photo booth
    [[0,557],[65,532],[155,533],[214,582],[231,773],[0,805]],                     // present stall
    [[350,96],[421,61],[535,48],[647,74],[680,258],[650,303],[360,300]],           // post office
    [[650,117],[710,34],[800,0],[900,43],[957,150],[980,292],[970,403],[930,430],
      [612,426],[585,343],[603,219]],                                               // tree and fence silhouette
    [[1030,248],[1033,147],[1071,91],[1160,101],[1261,57],[1378,91],[1410,179],
      [1410,314],[1371,348],[1060,341]],                                            // music stage
    [[1220,414],[1242,359],[1330,315],[1413,286],[1490,338],[1585,379],[1585,631],
      [1534,660],[1290,645],[1240,598]],                                            // bakery
    [[1052,620],[1103,594],[1150,589],[1191,617],[1225,657],[1235,710],[1180,737],
      [1080,723],[1044,682]],                                                       // snowman and sled
    [[124,477],[190,452],[250,479],[269,527],[132,540]],                            // left bench
    [[1070,831],[1144,806],[1214,824],[1232,870],[1080,880]],                       // lower bench
    [[0,730],[165,720],[224,771],[232,805],[0,829]],                               // left chalet base
    [[125,780],[354,768],[379,843],[146,860]],                                     // lower-left fence
    [[0,895],[390,880],[390,992],[0,992]],                                         // lower-left map edge
    [[800,875],[1255,780],[1285,824],[835,933]],                                   // lower market fence
    [[1390,830],[1585,765],[1585,992],[1430,992],[1370,904]]                      // lower-right tree/building edge
  ];
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
  function pointInPolygon(x, y, polygon) {
    var inside = false;
    for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      var xi = polygon[i][0], yi = polygon[i][1], xj = polygon[j][0], yj = polygon[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function segmentDistanceSquared(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    var t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
    var x = ax + t * dx, y = ay + t * dy;
    return (px - x) * (px - x) + (py - y) * (py - y);
  }
  function canOccupy(x, y) {
    if (x < PLAYER_RADIUS || x > MAP_WIDTH - PLAYER_RADIUS || y < PLAYER_RADIUS || y > MAP_HEIGHT - PLAYER_RADIUS) return false;
    var radiusSquared = PLAYER_RADIUS * PLAYER_RADIUS;
    return !BLOCKED_AREAS.some(function (polygon) {
      if (pointInPolygon(x, y, polygon)) return true;
      for (var i = 0; i < polygon.length; i++) {
        var a = polygon[i], b = polygon[(i + 1) % polygon.length];
        if (segmentDistanceSquared(x, y, a[0], a[1], b[0], b[1]) < radiusSquared) return true;
      }
      return false;
    });
  }
  function nearestWalkable(x, y) {
    if (canOccupy(x, y)) return { x: x, y: y };
    for (var radius = 12; radius <= 360; radius += 12) {
      for (var angle = 0; angle < 360; angle += 15) {
        var radians = angle * Math.PI / 180;
        var candidate = { x: x + Math.cos(radians) * radius, y: y + Math.sin(radians) * radius };
        if (canOccupy(candidate.x, candidate.y)) return candidate;
      }
    }
    return { x: MAP_WIDTH * .5, y: MAP_HEIGHT * .62 };
  }
  function setPlayer(left, top, snapToWalkable, persist) {
    var player = $("#player");
    if (!player) return;
    var x = Math.max(0, Math.min(MAP_WIDTH, left / 100 * MAP_WIDTH));
    var y = Math.max(0, Math.min(MAP_HEIGHT, top / 100 * MAP_HEIGHT));
    if (!canOccupy(x, y)) {
      if (!snapToWalkable) return false;
      var nearest = nearestWalkable(x, y); x = nearest.x; y = nearest.y;
    }
    left = x / MAP_WIDTH * 100;
    top = y / MAP_HEIGHT * 100;
    player.style.left = left + "%";
    player.style.top = top + "%";
    if (persist !== false) {
      try { localStorage.setItem("urluv-winter-player:" + (site.key || "demo"), JSON.stringify({ left: left, top: top })); } catch (e) {}
    }
    updateCamera();
    if (snapToWalkable) {
      marketWalking = false;
      publishMarketPresence(true);
    }
    return true;
  }
  function movePlayer(clientX, clientY) {
    var rect = $("#desktop").getBoundingClientRect();
    setPlayer((clientX - rect.left - camera.x) / camera.scale / MAP_WIDTH * 100,
      (clientY - rect.top - camera.y) / camera.scale / MAP_HEIGHT * 100, true);
  }
  function walkTo(icon) {
    setPlayer((icon.offsetLeft + icon.offsetWidth / 2) / MAP_WIDTH * 100,
      (icon.offsetTop + icon.offsetHeight * .9) / MAP_HEIGHT * 100, true);
  }
  function installMovement() {
    if (playerInstalled) return;
    playerInstalled = true;
    var player = $("#player"), start = { left: 50, top: 62 };
    try {
      var saved = JSON.parse(localStorage.getItem("urluv-winter-player:" + (site.key || "demo")) || "null");
      if (saved) start = saved;
      else if (site.key) {
        for (var attempt = 0; attempt < 30; attempt++) {
          var spawnX = MAP_WIDTH * (.43 + Math.random() * .14);
          var spawnY = MAP_HEIGHT * (.56 + Math.random() * .14);
          if (canOccupy(spawnX, spawnY)) {
            start = { left: spawnX / MAP_WIDTH * 100, top: spawnY / MAP_HEIGHT * 100 };
            break;
          }
        }
      }
    } catch (e) {}
    setPlayer(start.left, start.top, true);
    updateCamera();
    window.addEventListener("resize", updateCamera);
    var held = Object.create(null), velocity = { x: 0, y: 0 }, frame = 0, previousTime = 0;
    var directions = {
      ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down",
      ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right"
    };
    var fallbackDirections = {
      ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down",
      ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right"
    };
    function savePosition() {
      var left = parseFloat(player.style.left) || 50, top = parseFloat(player.style.top) || 62;
      try { localStorage.setItem("urluv-winter-player:" + (site.key || "demo"), JSON.stringify({ left: left, top: top })); } catch (e) {}
    }
    function approach(value, target, amount) {
      if (value < target) return Math.min(target, value + amount);
      return Math.max(target, value - amount);
    }
    function canTravel(x, y, nextX, nextY) {
      var distance = Math.hypot(nextX - x, nextY - y), steps = Math.max(1, Math.ceil(distance / 5));
      for (var i = 1; i <= steps; i++) {
        if (!canOccupy(x + (nextX - x) * i / steps, y + (nextY - y) * i / steps)) return false;
      }
      return true;
    }
    function animateMovement(time) {
      if (!previousTime) previousTime = time;
      var dt = Math.min(.04, (time - previousTime) / 1000);
      previousTime = time;
      if (dt === 0) { frame = requestAnimationFrame(animateMovement); return; }
      if (Date.now() < marketFrozenUntil) {
        held = Object.create(null); velocity.x = 0; velocity.y = 0;
      }
      var x = (parseFloat(player.style.left) || 50) / 100 * MAP_WIDTH;
      var y = (parseFloat(player.style.top) || 62) / 100 * MAP_HEIGHT;
      var horizontal = (held.right ? 1 : 0) - (held.left ? 1 : 0);
      var vertical = (held.down ? 1 : 0) - (held.up ? 1 : 0);
      var magnitude = Math.hypot(horizontal, vertical);
      if (magnitude) { horizontal /= magnitude; vertical /= magnitude; }
      var maxSpeed = 185, acceleration = 680, braking = 900;
      var targetX = horizontal * maxSpeed, targetY = vertical * maxSpeed;
      velocity.x = approach(velocity.x, targetX, (magnitude ? acceleration : braking) * dt);
      velocity.y = approach(velocity.y, targetY, (magnitude ? acceleration : braking) * dt);
      var nextX = x + velocity.x * dt, nextY = y + velocity.y * dt;
      var moved = false;
      if (canTravel(x, y, nextX, y)) { x = nextX; moved = moved || Math.abs(velocity.x) > .1; }
      else velocity.x = 0;
      if (canTravel(x, y, x, nextY)) { y = nextY; moved = moved || Math.abs(velocity.y) > .1; }
      else velocity.y = 0;

      if (magnitude) {
        marketFacing = Math.abs(horizontal) > Math.abs(vertical)
          ? (horizontal < 0 ? "left" : "right")
          : (vertical < 0 ? "up" : "down");
        player.classList.remove("facing-up", "facing-down", "facing-left", "facing-right");
        player.classList.add("facing-" + marketFacing);
      }
      if (moved) {
        setPlayer(x / MAP_WIDTH * 100, y / MAP_HEIGHT * 100, false, false);
        marketWalking = true;
        publishMarketPresence(false);
        player.classList.add("walking");
      }
      var stillMoving = Math.abs(velocity.x) > .5 || Math.abs(velocity.y) > .5;
      if (stillMoving || (magnitude && moved)) {
        frame = requestAnimationFrame(animateMovement);
      } else {
        frame = 0; previousTime = 0;
        player.classList.remove("walking");
        if (marketWalking) {
          marketWalking = false;
          publishMarketPresence(true);
        }
        savePosition();
      }
    }
    function startMovement() {
      if (!frame) { previousTime = 0; frame = requestAnimationFrame(animateMovement); }
    }
    function setDirection(direction, active) {
      if (active && Date.now() < marketFrozenUntil) return;
      if (active) {
        if (held[direction]) return;
        held[direction] = true;
        startMovement();
      } else {
        delete held[direction];
        if (!frame && (Math.abs(velocity.x) > .5 || Math.abs(velocity.y) > .5)) startMovement();
      }
    }
    document.addEventListener("keydown", function (event) {
      if (event.target.closest("input,textarea,select,[contenteditable=true]") || $("#desktop").hidden) return;
      if (event.code === "Space" && !event.target.closest("button,[role=button]")) {
        event.preventDefault();
        if (!event.repeat) throwSnowball();
        return;
      }
      var direction = directions[event.code] || fallbackDirections[event.key];
      if (!direction) return;
      event.preventDefault(); setDirection(direction, true);
    });
    document.addEventListener("keyup", function (event) {
      var direction = directions[event.code] || fallbackDirections[event.key];
      if (direction) setDirection(direction, false);
    });
    window.addEventListener("blur", function () {
      held = Object.create(null);
      if (!frame && (Math.abs(velocity.x) > .5 || Math.abs(velocity.y) > .5)) startMovement();
    });
    document.querySelectorAll(".market-dpad [data-move]").forEach(function (button) {
      var direction = button.dataset.move;
      button.addEventListener("pointerdown", function (event) {
        event.preventDefault();
        if (button.setPointerCapture) button.setPointerCapture(event.pointerId);
        setDirection(direction, true);
      });
      ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (name) {
        button.addEventListener(name, function () { setDirection(direction, false); });
      });
      button.addEventListener("click", function (event) {
        if (event.detail !== 0) return;
        setDirection(direction, true);
        window.setTimeout(function () { setDirection(direction, false); }, 140);
      });
    });
    $("#snowball-button").addEventListener("click", throwSnowball);
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
    return openFolder("gallery");
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
  function openNotice() {
    createWin("notice", "공지사항", { w: 540, h: 450 }, function (w, body) {
      var content = el("div", "content site-notice");
      var sections = [
        ["크리스마스 마켓 안내", [
          "방향키 또는 W·A·S·D로 캐릭터를 움직이고, 건물과 소품을 눌러 추억을 열어 보세요.",
          "트리의 이야기, 사진관의 사진·영상, 편지 우체국, 캐럴 무대와 크리스마스 카드를 둘러볼 수 있어요.",
          "하단의 선물 남기기로 카드를 남기고, 포토부스와 눈사람 게임도 즐겨 보세요."
        ]],
        ["이용 전 확인해 주세요", [
          "선물 카드·그림·포토부스 결과물은 이 사이트를 함께 보는 사람에게도 보여요. 주소·연락처 등 민감한 정보는 남기지 마세요.",
          "음악은 연결된 YouTube 영상의 설정에 따라 재생되지 않을 수 있어요."
        ]]
      ];
      sections.forEach(function (section) {
        var heading = el("h2"); heading.textContent = section[0];
        var list = el("ul");
        section[1].forEach(function (line) { var item = el("li"); item.textContent = line; list.appendChild(item); });
        content.append(heading, list);
      });
      body.appendChild(content);
    });
  }

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

  var ICON = { game: "💗", text: "📄", image: "🖼️", video: "🎞️", audio: "🎵", folder: "" };
  var FILE_ICON = { game: "assets/icons/heart.svg", text: "assets/icons/letter.svg", image: "assets/icons/file.svg", photo: "assets/icons/photo.svg", video: "assets/icons/video.svg", audio: "assets/icons/music.svg", folder: "assets/icons/folder.svg" };
  function openFolder(ref) {
    if (ref === "record") return openMusic();
    var f = S.folders[ref];
    createWin("folder:" + ref, f.title, { w: 520, h: 400 }, function (w, b) {
      b.appendChild(el("div", "addr", "/" + esc(f.title) + "/"));
      var c = el("div", "content"); var list = el("div", "files");
      var fileSignature = null;
      function drawFiles(files) {
        var signature = files.map(function (file) { return [file.mediaId || "", file.src || "", file.name].join("|"); }).join(";");
        if (signature === fileSignature) return;
        fileSignature = signature;
        list.replaceChildren();
        files.forEach(function (file) {
        var d = el("div", "file" + (file.type === "game" ? " game-file" : ""));
        var iconBox = el("div", "ic");
        if (file.mediaId && file.src) {
          var iconImage = el("img");
          iconImage.src = file.src;
          iconImage.className = "media-thumb";
          iconImage.alt = "";
          iconImage.draggable = false;
          iconBox.appendChild(iconImage);
        } else {
          var iconSrc = FILE_ICON[file.icon] || FILE_ICON[file.type];
          if (iconSrc) {
            var iconImageDefault = el("img");
            iconImageDefault.src = iconSrc;
            iconImageDefault.alt = "";
            iconImageDefault.draggable = false;
            iconBox.appendChild(iconImageDefault);
          } else iconBox.textContent = ICON[file.type] || "";
        }
        d.append(iconBox, document.createTextNode(file.name));
        d.addEventListener("click", function () {
          list.querySelectorAll(".sel").forEach(function (x) { x.classList.remove("sel"); });
          d.classList.add("sel");
          if (matchMedia("(pointer:coarse)").matches) viewFile(file);
        });
        d.addEventListener("dblclick", function () { viewFile(file); });
          if (file.mediaId && !(window.UrluvSite && window.UrluvSite.previewing)) {
          var remove = el("button", "btn file-delete", "삭제");
          remove.onclick = function (event) {
            event.stopPropagation();
            if (!window.confirm("이 사진을 삭제할까요?")) return;
            remove.disabled = true;
            window.UrluvSite.media.remove(file.mediaId).then(function () {
              loadFiles();
              window.dispatchEvent(new Event("urluv-site-media-updated"));
            }).catch(function () {
              remove.disabled = false;
              alert("파일을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.");
            });
          };
          d.appendChild(remove);
        }
        list.appendChild(d);
      });
      }
      var baseFiles = f.files.slice();
      function loadFiles() {
        if (ref !== "photo" || !window.UrluvSite || !window.UrluvSite.media) {
          drawFiles(baseFiles);
          return Promise.resolve();
        }
        return window.UrluvSite.media.list().then(function (files) {
          var captured = files.filter(function (m) { return m.type === "PHOTOBOOTH"; }).map(function (m, i) {
            return { name: "포토부스 " + String(i + 1).padStart(2, "0") + ".png", type: "image", src: m.url, caption: "포토부스에서 찍은 사진", mediaId: m.id };
          });
          drawFiles(baseFiles.concat(captured));
        }).catch(function () { drawFiles(baseFiles); });
      }
      c.appendChild(list); b.appendChild(c);
      loadFiles();
      var hasMediaApi = ref === "photo" && window.UrluvSite && window.UrluvSite.media;
      var refresh = hasMediaApi ? window.setInterval(loadFiles, 5000) : null;
      if (hasMediaApi) window.addEventListener("urluv-site-media-updated", loadFiles);
      w.onclose = function () {
        if (refresh) window.clearInterval(refresh);
        if (hasMediaApi) window.removeEventListener("urluv-site-media-updated", loadFiles);
      };
    });
  }

  function openPaint() {
    var api = window.UrluvSite && window.UrluvSite.media;
    createWin("paint-gallery", "크리스마스 카드", { w: 520, h: 400 }, function (w, b) {
      b.appendChild(el("div", "addr", "/크리스마스 마켓/카드/"));
      var actions = el("div", "generated-media-actions");
      var create = el("button", "btn", "새로 그리기");
      var status = el("span", "generated-media-status", "그림은 최대 50개까지 저장할 수 있어요.");
      if (window.UrluvSite && window.UrluvSite.previewing) create.disabled = true;
      create.onclick = openPaintCanvas;
      actions.append(create, status); b.appendChild(actions);
      var c = el("div", "content"); var list = el("div", "files"); c.appendChild(list); b.appendChild(c);
      var drawingSignature = null;
      function load() {
        if (!api) { list.replaceChildren(); status.textContent = "주문 사이트에서 그림을 저장하면 여기에 보여요."; return Promise.resolve(); }
        return api.list().then(function (files) {
          var drawings = files.filter(function (m) { return m.type === "DRAWING"; });
          status.textContent = "저장한 그림 " + drawings.length + " / 50";
          create.disabled = !!(window.UrluvSite && window.UrluvSite.previewing) || drawings.length >= 50;
          var signature = drawings.map(function (item) { return item.id; }).join(",");
          if (signature === drawingSignature) return;
          drawingSignature = signature;
          list.replaceChildren();
          drawings.forEach(function (item, i) {
            var file = { name: "크리스마스 카드 " + String(i + 1).padStart(2, "0") + ".png", type: "image", src: item.url, caption: "내가 그린 크리스마스 카드" };
            var tile = el("div", "file created-media-file");
            var thumb = el("img", "created-media-thumb"); thumb.src = item.url; thumb.alt = ""; thumb.draggable = false;
            var name = el("span", "created-media-name", file.name);
            tile.append(thumb, name);
            tile.ondblclick = function () { viewFile(file); };
            if (!(window.UrluvSite && window.UrluvSite.previewing)) {
              var remove = el("button", "btn file-delete", "삭제");
              remove.onclick = function () {
                if (!window.confirm("이 그림을 삭제할까요?")) return;
                remove.disabled = true;
                api.remove(item.id).then(function () {
                  load();
                  window.dispatchEvent(new Event("urluv-site-media-updated"));
                }).catch(function () { remove.disabled = false; alert("파일을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요."); });
              };
              tile.appendChild(remove);
            }
            list.appendChild(tile);
          });
        }).catch(function () { status.textContent = "그림 목록을 불러오지 못했어요. 새로고침해 주세요."; });
      }
      load();
      var refresh = api ? window.setInterval(load, 5000) : null;
      if (api) window.addEventListener("urluv-site-media-updated", load);
      w.onclose = function () {
        if (refresh) window.clearInterval(refresh);
        if (api) window.removeEventListener("urluv-site-media-updated", load);
      };
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
      var status = el("div", "booth-save-status", "사진관에 저장할 수 있는 사진은 최대 10장이에요.");
      var savedCount = 0;
      var countLabel = el("span", "booth-photo-count", "저장된 사진 0 / 10");
      shot.appendChild(countLabel);
      panel.append(frameRow, shot, result, status);
      root.append(stage, panel); b.appendChild(root);

      var mediaApi = window.UrluvSite && window.UrluvSite.media;
      function updateCount() {
        countLabel.textContent = "저장된 사진 " + savedCount + " / 10";
        sh.disabled = savedCount >= 10 || !!(window.UrluvSite && window.UrluvSite.previewing);
        if (window.UrluvSite && window.UrluvSite.previewing) status.textContent = "관리자 미리보기에서는 사진을 저장할 수 없어요.";
        else if (savedCount >= 10) status.textContent = "사진이 10장 저장되어 있어요. 사진관에서 사진을 삭제하면 다시 촬영할 수 있어요.";
        else status.textContent = "사진관에 저장할 수 있는 사진은 최대 10장이에요.";
      }
      function loadPhotoCount() {
        if (!mediaApi) return Promise.resolve();
        return mediaApi.list().then(function (files) {
          savedCount = files.filter(function (m) { return m.type === "PHOTOBOOTH"; }).length;
          updateCount();
        }).catch(function () { status.textContent = "저장된 사진 수를 불러오지 못했어요."; });
      }
      if (window.UrluvSite && window.UrluvSite.previewing) sh.disabled = true;
      loadPhotoCount();
      window.addEventListener("urluv-site-media-updated", loadPhotoCount);

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
      w.onclose = function () {
        if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
        window.removeEventListener("urluv-site-media-updated", loadPhotoCount);
      };

      sh.onclick = async function () {
        if (savedCount >= 10) { updateCount(); return; }
        sh.disabled = true;
        status.textContent = "사진을 저장하고 있어요…";
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
        result.replaceChildren();
        var imageUrl = cv.toDataURL("image/png");
        var th = el("img"); th.src = imageUrl; th.style.cssText = "height:60px;border:2px solid #fff";
        result.appendChild(th);
        var a = el("a", "btn", "기기에 저장"); a.href = imageUrl; a.download = "photobooth-" + Date.now() + ".png"; a.style.cssText = "text-decoration:none;color:#3a1f2a;display:inline-block";
        result.appendChild(a);
        if (!mediaApi) {
          status.textContent = "데모에서는 기기에만 저장돼요.";
          sh.disabled = false;
          return;
        }
        cv.toBlob(function (blob) {
          if (!blob) { status.textContent = "사진을 만들지 못했어요. 다시 촬영해 주세요."; sh.disabled = false; return; }
          mediaApi.upload("PHOTOBOOTH", blob).then(function () {
            savedCount += 1; updateCount();
            status.textContent = "사진관의 사진 폴더에 저장했어요.";
            window.dispatchEvent(new Event("urluv-site-media-updated"));
          }).catch(function (error) {
            status.textContent = error && error.code === "TOO_MANY_SITE_PHOTOS" ? error.message : "저장하지 못했어요. 다시 시도해 주세요.";
            mediaApi.list().then(function (files) { savedCount = files.filter(function (m) { return m.type === "PHOTOBOOTH"; }).length; updateCount(); }).catch(function () { sh.disabled = false; });
          });
        }, "image/png");
      };
    });
  }

  // paint
  function openPaintCanvas() {
    createWin("paint", "크리스마스 카드 만들기", { w: 560, h: 440 }, function (w, b) {
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
      var clr = el("button", "btn", "지우기"), sv = el("button", "btn", "이미지 저장");
      var status = el("span", "generated-media-status", "그림을 저장해요.");
      tools.append(sz, clr, sv, status);
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
      sv.onclick = function () {
        var api = window.UrluvSite && window.UrluvSite.media;
        if (!api) { var a = document.createElement("a"); a.href = cv.toDataURL("image/png"); a.download = "christmas-card.png"; a.click(); status.textContent = "데모에서는 기기에만 저장돼요."; return; }
        sv.disabled = true; status.textContent = "서버에 저장하고 있어요…";
        cv.toBlob(function (blob) {
          if (!blob) { status.textContent = "그림을 저장하지 못했어요."; sv.disabled = false; return; }
          api.upload("DRAWING", blob).then(function () {
            status.textContent = "크리스마스 카드 폴더에 저장했어요.";
            window.dispatchEvent(new Event("urluv-site-media-updated"));
          }).catch(function (error) {
            status.textContent = error && error.code === "TOO_MANY_SITE_DRAWINGS" ? error.message : "저장하지 못했어요. 다시 시도해 주세요.";
          }).finally(function () { sv.disabled = false; });
        }, "image/png");
      };
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
    if (act === "notice") openNotice();
    else if (act === "information") openInformation();
    else if (act === "gallery") openGalleryChoice();
    else if (act === "letter") openNote("letter");
    else if (act === "music") openMusic();
    else if (act === "booth") openBooth();
    else if (act === "paint") openPaint();
    else if (act === "game") openMinesweeper();
    else if (act === "logout") { try { sessionStorage.removeItem("anniv-auth"); } catch (er) {} if (site.forget) site.forget(); location.reload(); }
  });
  if (orderEditor) {
    window.UrluvEditorHooks = {
      enter: enter,
      openInformation: openInformation,
      openNote: openNote,
      createWin: createWin,
      highlight: showMapHighlight,
      closeAll: function () {
        Object.keys(openWins).forEach(function (key) {
          openWins[key].el.remove();
          openWins[key].task.remove();
          delete openWins[key];
        });
      }
    };
  }
})();
