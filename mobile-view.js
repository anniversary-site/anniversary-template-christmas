(function () {
  if (document.body.classList.contains("order-editor-mode")) return;
  var controls = document.createElement("div");
  controls.className = "mobile-view-controls";
  controls.innerHTML = '<div class="mobile-rotate-prompt" role="status"><strong>가로 화면으로 돌려 주세요</strong><span>기념일 사이트는 가로 화면에서 더 잘 보여요.</span><button type="button" class="btn mobile-enter-fullscreen">전체화면으로 보기</button></div><button type="button" class="btn mobile-fullscreen-toggle" aria-label="전체화면으로 보기">⛶</button><button type="button" class="btn mobile-fullscreen-close" aria-label="전체화면 종료" hidden>✕</button><span class="mobile-fullscreen-status" role="status" aria-live="polite"></span>';
  document.body.appendChild(controls);
  var enter = controls.querySelector(".mobile-enter-fullscreen");
  var toggle = controls.querySelector(".mobile-fullscreen-toggle");
  var close = controls.querySelector(".mobile-fullscreen-close");
  var status = controls.querySelector(".mobile-fullscreen-status");
  var mobile = window.matchMedia("(max-width: 1100px) and (pointer: coarse)");
  var canFullscreen = !!(document.fullscreenEnabled && document.documentElement.requestFullscreen);
  var standalone = function () { return navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches; };

  function sync() {
    var active = !!document.fullscreenElement;
    controls.hidden = !mobile.matches;
    close.hidden = !active;
    toggle.hidden = active || standalone();
    enter.textContent = canFullscreen ? "전체화면으로 보기" : "주소창 없이 보는 방법";
    toggle.textContent = canFullscreen ? "⛶" : "ⓘ";
    toggle.setAttribute("aria-label", canFullscreen ? "전체화면으로 보기" : "주소창 없이 보는 방법");
  }
  async function openFullscreen() {
    if (!canFullscreen) {
      status.textContent = "아이폰에서는 Safari 공유 메뉴의 ‘홈 화면에 추가’로 열면 주소창 없이 볼 수 있어요.";
      return;
    }
    try {
      await document.documentElement.requestFullscreen();
      if (screen.orientation && screen.orientation.lock) {
        try { await screen.orientation.lock("landscape"); } catch (error) { /* 직접 회전할 수 있습니다. */ }
      }
      status.textContent = "";
    } catch (error) {
      status.textContent = "이 브라우저에서는 전체화면을 열 수 없어요. Safari에서 홈 화면에 추가해 이용해 주세요.";
    }
    sync();
  }
  async function exitFullscreen() {
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
    sync();
  });
  mobile.addEventListener("change", sync);
  sync();
})();
