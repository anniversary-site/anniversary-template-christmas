(function () {
  let apiReady;
  function loadYouTubeAPI() {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    if (!apiReady) apiReady = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (previous) previous();
        resolve(window.YT);
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.onerror = () => { apiReady = null; reject(new Error('YouTube API failed to load')); };
      document.head.appendChild(script);
    });
    return apiReady;
  }
  function youtubeId(value) {
    try {
      const url = new URL(value.trim());
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
      const host = url.hostname.toLowerCase();
      let id = null;
      if (host === 'youtu.be') id = url.pathname.split('/')[1];
      else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'www.youtube-nocookie.com'].includes(host)) {
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts[0] === 'watch') id = url.searchParams.get('v');
        else if (['embed','shorts','live'].includes(parts[0])) id = parts[1];
      }
      return /^[\w-]{11}$/.test(id || '') ? id : null;
    } catch { return null; }
  }
  function mountMusic(body) {
    const config = window.SITE.music || {};
    const valid = t => t && typeof t.title === 'string' && typeof t.artist === 'string' && typeof t.url === 'string' && youtubeId(t.url);
    const preset = (Array.isArray(config.tracks) ? config.tracks : []).filter(valid);
    const seen = new Set();
    let tracks = preset.filter(track => {
      const id = youtubeId(track.url);
      if (seen.has(id)) return false;
      seen.add(id); return true;
    }), current = null;
    const root = document.createElement('div'); root.className = 'music-app';
    root.innerHTML = '<header class="music-header"><img src="assets/icons/music.svg" alt="" draggable="false"><div><h2></h2><p class="music-now">곡을 선택해 주세요.</p><a class="music-external" target="_blank" rel="noopener noreferrer" hidden>YouTube에서 보기 ↗</a></div></header><div class="music-player"><p>목록에서 곡을 선택하면<br>YouTube 영상이 여기에 표시돼요.</p></div><div class="music-controls"><button class="btn music-play" type="button" disabled>▶ 재생</button><button class="btn music-repeat" type="button" aria-pressed="false">전체 반복: OFF</button></div><div class="music-table-wrap"><table class="music-table"><thead><tr><th scope="col">Track</th><th scope="col">Name</th><th scope="col">Artist</th></tr></thead><tbody></tbody></table><p class="music-empty">아직 등록된 곡이 없어요.</p></div><p class="music-footnote">재생되지 않는 영상은 ‘YouTube에서 보기’로 열어 주세요.</p>';
    body.appendChild(root);
    root.querySelector('h2').textContent = config.title || 'Our little playlist';
    const player = root.querySelector('.music-player');
    const external = root.querySelector('.music-external');
    const tbody = root.querySelector('tbody');
    let ytPlayer = null, selectedVersion = 0, ready = false, repeatAll = false;
    const playButton = root.querySelector('.music-play');
    const repeatButton = root.querySelector('.music-repeat');
    function setReady(value) {
      ready = value;
      playButton.disabled = !value;
    }
    let playing = false;
    function setPlaying(value) {
      playing = value;
      playButton.textContent = value ? 'Ⅱ 일시정지' : '▶ 재생';
      playButton.setAttribute('aria-label', value ? '일시정지' : '재생');
    }
    playButton.onclick = () => {
      if (!ready) return;
      if (playing) ytPlayer.pauseVideo();
      else ytPlayer.playVideo();
    };
    repeatButton.onclick = () => {
      repeatAll = !repeatAll;
      repeatButton.textContent = '전체 반복: ' + (repeatAll ? 'ON' : 'OFF');
      repeatButton.setAttribute('aria-pressed', String(repeatAll));
    };
    const footnote = root.querySelector(".music-footnote");
    footnote.textContent = '재생되지 않는 영상은 ‘YouTube에서 보기’로 열어 주세요.';
    function select(track, autoplay = false) {
      setReady(false);
      setPlaying(false);
      const version = ++selectedVersion;
      if (ytPlayer) { ytPlayer.destroy(); ytPlayer = null; }
      current = track;
      const id = youtubeId(track.url);
      const iframe = document.createElement('iframe');
      const embedUrl = new URL('https://www.youtube.com/embed/' + id);
      const shareToken = new URL(track.url).searchParams.get('si');
      if (shareToken) embedUrl.searchParams.set('si', shareToken);
      else embedUrl.searchParams.set('playsinline', '1');
      embedUrl.searchParams.set('enablejsapi', '1');
      if (window.location && /^https?:$/.test(window.location.protocol)) embedUrl.searchParams.set('origin', window.location.origin);
      iframe.src = embedUrl.href;
      iframe.title = track.title + ' — ' + track.artist;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      player.replaceChildren(iframe);
      loadYouTubeAPI().then(YT => {
        if (version !== selectedVersion) return;
        ytPlayer = new YT.Player(iframe, { events: {
          onReady: event => {
            if (version !== selectedVersion) return;
            setReady(true);
            if (autoplay) event.target.playVideo();
          },
          onStateChange: event => {
            if (version !== selectedVersion) return;
            if (event.data === 1) setPlaying(true);
            else if ([0, 2, 5, -1].includes(event.data)) setPlaying(false);
            if (event.data !== 0) return;
            const nextIndex = tracks.indexOf(current) + 1;
            if (nextIndex < tracks.length) select(tracks[nextIndex], true);
            else if (repeatAll && tracks.length) select(tracks[0], true);
          },
          onError: () => {
            if (version !== selectedVersion) return;
            setReady(false);
            setPlaying(false);
          }
        }});
      }).catch(() => {
        if (version === selectedVersion) setReady(false);
      });
      root.querySelector('.music-now').textContent = track.title + ' — ' + track.artist;
      external.href = 'https://www.youtube.com/watch?v=' + id; external.hidden = false;
      renderList();
    }
    function renderList() {
      tbody.replaceChildren();
      root.querySelector('.music-empty').hidden = tracks.length > 0;
      tracks.forEach((track, index) => {
        const row = document.createElement('tr');
        if (track === current) row.className = 'playing';
        const number = document.createElement('td'); number.textContent = index + 1;
        const name = document.createElement('td');
        const button = document.createElement('button'); button.type = 'button';
        button.textContent = track.title; button.title = track.title + ' 재생';
        button.setAttribute('aria-pressed', String(track === current));
        button.onclick = () => select(track, true);
        name.appendChild(button);
        const artist = document.createElement('td'); artist.textContent = track.artist;
        row.append(number, name, artist); tbody.appendChild(row);
      });
    }
    setReady(false);
    if (tracks.length) select(tracks[0]);
    else renderList();
    return () => { selectedVersion++; if (ytPlayer) ytPlayer.destroy(); player.replaceChildren(); };
  }
  window.MusicPlayer = { youtubeId: youtubeId, mount: mountMusic };
})();
