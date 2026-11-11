// URLUV 백엔드에서 고객 사이트를 불러옵니다.
// 주소가 .../{사이트키}(예: cupid.urluv.shop/{사이트키}) 또는 ?site={사이트키}이면 백엔드 모드, 아니면 data.js 데모 화면입니다.
// 백엔드 모드에서는 비밀번호 확인과 사진·편지를 모두 서버가 맡고, 이 파일들에는 고객 정보가 들어가지 않습니다.
(function () {
  var KEY_PATTERN = /^[a-km-np-z2-9]{12}$/;
  var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var API_URL = LOCAL ? "http://localhost:8080/api/v1" : "https://dh7rgee1s6v8m.cloudfront.net/api/v1";

  function siteKeyFromLocation() {
    var parts = location.pathname.split("/").filter(Boolean);
    var last = parts[parts.length - 1];
    if (KEY_PATTERN.test(last || "")) return last;
    var query = new URLSearchParams(location.search).get("site");
    return KEY_PATTERN.test(query || "") ? query : null;
  }

  var key = siteKeyFromLocation();
  if (!key) { window.UrluvSite = { key: null }; return; }

  // 404.html이 ?site={키}로 넘겨준 경우 주소창을 고객이 받은 /{키} 모양으로 되돌립니다.
  // (로컬 정적 서버는 /{키} 새로고침을 못 하므로 그대로 둡니다.)
  if (!LOCAL && new URLSearchParams(location.search).get("site") === key) {
    history.replaceState(null, "", location.pathname.replace(/[^/]*$/, "") + key + location.hash);
  }

  var S = window.SITE;
  var tokenKey = "anniv-site-token:" + key;

  // 데모 내용이 고객 화면에 섞이지 않도록 먼저 비워 둡니다. 서버 내용은 비밀번호 확인 뒤에 채웁니다.
  S.passwordHash = null;
  S.loginMessage = "비밀번호를 입력해 주세요.";
  S.userName = "";
  S.names = [];
  S.information = {};
  S.notes = { letter: { title: "크리스마스 편지", text: "" } };
  S.folders.photo = { title: "Photo", files: [] };
  S.folders.video = { title: "Video", files: [] };
  delete S.folders.photo_dear;
  delete S.folders.photo_dewy;
  S.music = { title: S.music && S.music.title || "Our playlist", tracks: [] };

  function call(path, options) {
    options = options || {};
    var headers = {};
    if (options.body) headers["Content-Type"] = "application/json";
    if (options.token) headers.Authorization = "Bearer " + options.token;
    return fetch(API_URL + path, {
      method: options.method || "GET",
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      keepalive: !!options.keepalive
    }).catch(function () {
      throw { status: 0, code: "NETWORK", message: "연결이 불안정해요. 잠시 후 다시 시도해 주세요." };
    }).then(function (response) {
      return response.json().catch(function () { return null; }).then(function (json) {
        if (!response.ok || !json || !json.success) {
          var error = json && json.error || {};
          throw { status: response.status, code: error.code || "UNKNOWN", message: error.message || "사이트를 불러오지 못했어요." };
        }
        return json.data;
      });
    });
  }

  function dotted(date) { return date ? String(date).replace(/-/g, ".") : ""; }

  // 서버 내용을 data.js 모양으로 채웁니다. app.js가 같은 window.SITE 객체를 보고 있어서 새로 만들지 않고 고칩니다.
  function apply(content) {
    var recipient = content.recipientName || "";
    S.userName = recipient;
    S.names = recipient ? [recipient] : [];
    S.startDate = content.specialDay || content.useStartDate || S.startDate;
    S.expiresOn = content.useEndDate || "";
    S.information = {
      specialDate: dotted(content.specialDay),
      specialPlace: content.specialPlace || "",
      story: content.specialOccasion || ""
    };
    S.notes.letter.text = content.letter || "";

    var photos = [], videos = [];
    (content.documents || []).forEach(function (document) {
      (document.photos || []).forEach(function (p) { photos.push(p); });
      (document.videos || []).forEach(function (v) { videos.push(v); });
    });
    var bySlot = function (a, b) { return a.documentNo - b.documentNo || a.slot - b.slot; };
    S.folders.photo.files = photos.sort(bySlot).map(function (p, i) {
      return { name: p.caption || "사진 " + (i + 1), type: "image", src: p.url, caption: p.caption || "" };
    });
    S.folders.video.files = videos.sort(bySlot).map(function (v, i) {
      return { name: v.title || "영상 " + (i + 1), type: "video", src: v.url, caption: v.title || "" };
    });
    S.music.tracks = (content.musics || []).filter(function (m) { return m.youtubeUrl; }).map(function (m) {
      return { title: m.title, artist: m.artist, url: m.youtubeUrl };
    });
    if (content.linkUrl) S.icons.forEach(function (icon) { if (icon.type === "link") icon.url = content.linkUrl; });
  }

  // 내용을 연 토큰을 메모 저장에도 씁니다.
  var activeToken = null;
  function load(token) {
    return call("/sites/" + key, { token: token }).then(function (content) {
      apply(content); activeToken = token; return true;
    });
  }
  var memoPath = "/sites/" + key + "/memos";

  function forget() { try { sessionStorage.removeItem(tokenKey); } catch (e) {} }

  // 운영자 미리보기: 관리자 화면이 연 주소 끝의 #preview={토큰}. 주소창에서 바로 지우고 이 탭에만 기억합니다(30분 뒤 서버가 거절).
  var previewKey = "anniv-site-preview:" + key;
  var previewToken = new URLSearchParams(location.hash.slice(1)).get("preview");
  try {
    if (previewToken) {
      sessionStorage.setItem(previewKey, previewToken);
      history.replaceState(null, "", location.pathname + location.search);
    } else previewToken = sessionStorage.getItem(previewKey);
  } catch (e) {}

  window.UrluvSite = {
    key: key,
    // 잠금 화면 정보(받는 분 이름·힌트). 비밀번호 없이 받을 수 있습니다.
    lock: function () { return call("/sites/" + key + "/lock"); },
    // 비밀번호가 맞으면 내용을 채우고 true, 틀리면 false. 그 밖의 오류는 { message }로 거절합니다.
    open: function (password) {
      return call("/sites/" + key + "/unlock", { method: "POST", body: { password: password } }).then(function (result) {
        try { sessionStorage.setItem(tokenKey, JSON.stringify(result)); } catch (e) {}
        return load(result.siteAccessToken);
      }, function (error) {
        if (error.code === "WRONG_SITE_PASSWORD") return false;
        throw error;
      });
    },
    // 이 탭에서 이미 열었으면 다시 묻지 않습니다.
    resume: function () {
      var saved = null;
      try { saved = JSON.parse(sessionStorage.getItem(tokenKey)); } catch (e) {}
      if (!saved || !saved.siteAccessToken || !(Date.parse(saved.expiresAt) > Date.now())) return Promise.resolve(false);
      return load(saved.siteAccessToken).catch(function () { forget(); return false; });
    },
    forget: forget,
    // 바탕화면 메모는 서버에 한 장씩 저장해서 어느 기기에서 열어도 같고, 서로 다른 메모를 지우지 않습니다.
    // 운영자 미리보기에서는 보기만 합니다.
    memos: {
      list: function () { return call(memoPath, { token: activeToken }); },
      save: function (note, keepalive) {
        return call(memoPath + "/" + encodeURIComponent(note.id), {
          method: "PUT", token: activeToken, keepalive: keepalive,
          body: { text: note.text, x: Math.max(0, Math.round(note.x)), y: Math.max(0, Math.round(note.y)) }
        });
      },
      remove: function (id) {
        return call(memoPath + "/" + encodeURIComponent(id), { method: "DELETE", token: activeToken });
      }
    },
    // 운영자 미리보기면 비밀번호 없이 내용을 채웁니다. 미리보기가 아니면 false.
    previewing: !!previewToken,
    preview: function () {
      if (!previewToken) return Promise.resolve(false);
      return load(previewToken).catch(function (error) {
        if (error && error.status === 401) error.message = "미리보기 링크가 만료됐어요. 관리자 화면에서 다시 열어주세요.";
        throw error;
      });
    }
  };
})();
