(function () {
  if (document.body.classList.contains("order-editor-mode")) return;
  var controls = document.createElement("div");
  controls.className = "mobile-view-controls";
  controls.innerHTML = '<div class="mobile-rotate-prompt" role="status"><strong>가로 화면으로 돌려 주세요</strong><span>기념일 사이트는 가로 화면에서 더 잘 보여요.</span><button type="button" class="btn mobile-enter-fullscreen">전체화면으로 보기</button><span class="mobile-fullscreen-status" aria-live="polite"></span></div><button type="button" class="btn mobile-fullscreen-toggle" aria-label="전체화면으로 보기">⛶</button><button type="button" class="btn mobile-fullscreen-close" aria-label="전체화면 종료" hidden>✕</button>';
  document.body.appendChild(controls);
  var enter = controls.querySelector(".mobile-enter-fullscreen");
  var toggle = controls.querySelector(".mobile-fullscreen-toggle");
  var close = controls.querySelector(".mobile-fullscreen-close");
  var status = controls.querySelector(".mobile-fullscreen-status");
  var mobile = window.matchMedia("(max-width: 1100px) and (pointer: coarse)");

  function sync() {
    var active = !!document.fullscreenElement || document.documentElement.classList.contains("mobile-immersive");
    controls.hidden = !mobile.matches;
    close.hidden = !active;
    toggle.hidden = active;
  }
  async function openFullscreen() {
    document.documentElement.classList.add("mobile-immersive");
    sync();
    if (!document.documentElement.requestFullscreen) {
      status.textContent = "이 브라우저는 전체화면을 지원하지 않아요. 가로로 돌려 이용해 주세요.";
      return;
    }
    try {
      await document.documentElement.requestFullscreen();
      if (screen.orientation && screen.orientation.lock) {
        try { await screen.orientation.lock("landscape"); } catch (error) { /* 직접 회전할 수 있습니다. */ }
      }
      status.textContent = "";
    } catch (error) {
      status.textContent = "전체화면을 열 수 없어요. 가로로 돌려 이용해 주세요.";
    }
    sync();
  }
  async function exitFullscreen() {
    document.documentElement.classList.remove("mobile-immersive");
    if (document.fullscreenElement && document.exitFullscreen) {
      try { await document.exitFullscreen(); } catch (error) { /* 레이아웃은 복원합니다. */ }
    }
    status.textContent = "";
    sync();
  }
  enter.addEventListener("click", openFullscreen);
  toggle.addEventListener("click", openFullscreen);
  close.addEventListener("click", exitFullscreen);
  document.addEventListener("fullscreenchange", function () {
    if (!document.fullscreenElement) document.documentElement.classList.remove("mobile-immersive");
    sync();
  });
  mobile.addEventListener("change", sync);
  sync();
})();
