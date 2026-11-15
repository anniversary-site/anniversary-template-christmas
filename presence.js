(function () {
  var players = new Map();
  var socket = null;
  var reconnectTimer = null;
  var heartbeatTimer = null;
  var stateReader = null;
  var visitorId = null;
  var avatar = 1;
  var started = false;
  var joined = false;
  var lastSentAt = 0;
  var reconnectDelay = 2000;

  function idForTab(siteKey) {
    var key = "urluv-market-visitor:" + siteKey;
    try {
      var existing = sessionStorage.getItem(key);
      if (existing) return existing;
      var created = window.crypto && window.crypto.randomUUID
        ? window.crypto.randomUUID()
        : "v-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
      sessionStorage.setItem(key, created);
      return created;
    } catch (e) {
      return "v-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
    }
  }

  function onlineLabel() {
    var label = document.getElementById("market-online");
    if (!label) return;
    label.hidden = !joined;
    label.textContent = "접속 " + (players.size + 1) + "명";
  }

  function removePlayer(id) {
    var player = players.get(id);
    if (player) player.remove();
    players.delete(id);
    onlineLabel();
  }

  function renderPlayer(data) {
    if (!data || typeof data.visitorId !== "string" || data.visitorId === visitorId) return;
    var avatarNumber = Number(data.avatar);
    if (!Number.isInteger(avatarNumber) || avatarNumber < 1 || avatarNumber > 4) return;
    var player = players.get(data.visitorId);
    if (!player) {
      player = document.createElement("div");
      player.className = "remote-player";
      var sprite = document.createElement("span");
      sprite.className = "avatar-sprite";
      var name = document.createElement("span");
      name.className = "player-name";
      name.textContent = "손님 " + data.visitorId.slice(-4).toUpperCase();
      player.appendChild(sprite);
      player.appendChild(name);
      var layer = document.getElementById("other-players");
      if (!layer) return;
      layer.appendChild(player);
      players.set(data.visitorId, player);
    }

    var x = Number(data.x), y = Number(data.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 100 || y < 0 || y > 100) return;
    player.style.left = x + "%";
    player.style.top = y + "%";
    player.style.zIndex = String(4 + Math.floor(y / 100 * 3));
    player.classList.remove("facing-up", "facing-down", "facing-left", "facing-right", "walking");
    player.classList.add("facing-" + (["up", "down", "left", "right"].includes(data.facing) ? data.facing : "down"));
    if (data.walking) player.classList.add("walking");
    var spriteElement = player.querySelector(".avatar-sprite");
    spriteElement.style.backgroundImage = 'url("assets/sprites/market-avatar-' + avatarNumber + '.png' + (avatarNumber === 3 ? '?v=2' : '') + '")';
    onlineLabel();
  }

  function onMessage(event) {
    if (event.type === "snapshot" && Array.isArray(event.players)) {
      players.forEach(function (player) { player.remove(); });
      players.clear();
      event.players.forEach(renderPlayer);
      joined = true;
      reconnectDelay = 2000;
      onlineLabel();
    } else if (event.type === "joined" || event.type === "moved") renderPlayer(event.player);
    else if (event.type === "left") removePlayer(event.visitorId);
  }

  function connect() {
    if (!started || !window.UrluvSite || !window.UrluvSite.connectMarketPresence) return;
    var state = stateReader();
    var current = window.UrluvSite.connectMarketPresence(visitorId, avatar, state, onMessage);
    if (!current) return;
    socket = current;
    current.addEventListener("open", function () {
      if (socket !== current) return;
      heartbeatTimer = window.setInterval(function () {
        if (socket === current && current.readyState === WebSocket.OPEN) {
          current.send(JSON.stringify({ type: "ping" }));
        }
      }, 10000);
    });
    current.addEventListener("close", function () {
      if (socket !== current) return;
      socket = null;
      joined = false;
      window.clearInterval(heartbeatTimer);
      heartbeatTimer = null;
      players.forEach(function (player) { player.remove(); });
      players.clear();
      onlineLabel();
      if (started) {
        reconnectTimer = window.setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(30000, reconnectDelay * 2);
      }
    });
    current.addEventListener("error", function () {
      try { current.close(); } catch (e) {}
    });
  }

  function publish(state, force) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    var now = Date.now();
    if (!force && now - lastSentAt < 100) return;
    lastSentAt = now;
    try {
      socket.send(JSON.stringify({
        type: "move", x: state.x, y: state.y,
        facing: state.facing, walking: state.walking
      }));
    } catch (e) {}
  }

  function stop() {
    started = false;
    joined = false;
    window.clearTimeout(reconnectTimer);
    window.clearInterval(heartbeatTimer);
    reconnectTimer = null;
    heartbeatTimer = null;
    if (socket) {
      try {
        if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "leave" }));
        socket.close();
      } catch (e) {}
    }
    socket = null;
    players.forEach(function (player) { player.remove(); });
    players.clear();
    onlineLabel();
  }

  window.MarketPresence = {
    start: function (selectedAvatar, readState) {
      if (!window.UrluvSite || !window.UrluvSite.key || window.UrluvSite.previewing) return;
      stop();
      visitorId = idForTab(window.UrluvSite.key);
      avatar = selectedAvatar;
      stateReader = readState;
      started = true;
      connect();
    },
    publish: publish,
    stop: stop
  };

  window.addEventListener("beforeunload", stop);
})();
