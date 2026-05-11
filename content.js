if (!document.getElementById("__pink_utc_clock_root__")) {
  const CLOCK_TIMEZONES = [
    "UTC",
    "Asia/Tokyo",
    "America/New_York",
    "Europe/London",
    "Australia/Sydney",
  ];
  const AUTO_RESET_MS = 10 * 60 * 1000;
  const HIDE_AUTO_RESTORE_MS = 5 * 60 * 1000;

  const host = document.createElement("div");
  host.id = "__pink_utc_clock_root__";

  host.style.all = "initial";
  host.style.position = "fixed";
  host.style.zIndex = "2147483647";
  host.style.right = "12px";
  host.style.bottom = "12px";
  host.style.pointerEvents = "none";

  try {
    const saved = localStorage.getItem("__pink_utc_clock_pos__");
    if (saved) {
      const { left, top } = JSON.parse(saved);
      if (Number.isFinite(left) && Number.isFinite(top)) {
        host.style.left = `${left}px`;
        host.style.top = `${top}px`;
        host.style.right = "auto";
        host.style.bottom = "auto";
      }
    }
  } catch {}

  document.documentElement.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });

  const box = document.createElement("div");
  box.setAttribute("role", "timer");
  box.setAttribute("aria-live", "polite");
  box.style.pointerEvents = "none"; 
  box.style.fontFamily = `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
  box.style.fontSize = "12px";
  box.style.lineHeight = "1";
  box.style.color = "#2a2a2a";
  box.style.background = `
    radial-gradient(130% 220% at -8% 50%, rgba(255,205,228,0.5) 0%, rgba(255,182,214,0.28) 45%, rgba(255,166,201,0.18) 100%),
    linear-gradient(130deg, rgba(255,204,227,0.36) 0%, rgba(255,182,212,0.24) 52%, rgba(255,166,198,0.28) 100%)
  `;
  box.style.border = "1px solid rgba(255,198,223,0.82)";
  box.style.borderRadius = "999px 999px 999px 999px / 999px 999px 999px 999px";
  box.style.padding = "7px 10px";
  box.style.boxShadow = "0 10px 28px rgba(255,130,190,0.2), inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(255,172,205,0.3)";
  box.style.userSelect = "none";
  box.style.opacity = "0.92";
  box.style.display = "flex";
  box.style.alignItems = "center";
  box.style.gap = "5px";
  box.style.backdropFilter = "saturate(150%) blur(8px)";
  box.style.transition = "opacity 120ms ease";
  box.style.position = "relative";
  box.style.overflow = "hidden";

  const peanutGlow = document.createElement("span");
  peanutGlow.style.position = "absolute";
  peanutGlow.style.left = "-4px";
  peanutGlow.style.top = "1px";
  peanutGlow.style.width = "36%";
  peanutGlow.style.height = "calc(100% - 2px)";
  peanutGlow.style.borderRadius = "999px";
  peanutGlow.style.background = "radial-gradient(120% 120% at 20% 50%, rgba(255,232,245,0.72) 0%, rgba(255,208,230,0.34) 58%, rgba(255,192,218,0.05) 100%)";
  peanutGlow.style.pointerEvents = "none";

  const topSheen = document.createElement("span");
  topSheen.style.position = "absolute";
  topSheen.style.left = "8%";
  topSheen.style.top = "1px";
  topSheen.style.width = "76%";
  topSheen.style.height = "38%";
  topSheen.style.borderRadius = "999px";
  topSheen.style.background = "linear-gradient(180deg, rgba(255,255,255,0.44), rgba(255,255,255,0.04))";
  topSheen.style.pointerEvents = "none";

  box.addEventListener("mouseenter", () => {
    box.style.opacity = "1";
  });
  box.addEventListener("mouseleave", () => {
    if (!dragging) box.style.opacity = "0.92";
  });

  const dot = document.createElement("span");
  dot.style.width = "8px";
  dot.style.height = "8px";
  dot.style.borderRadius = "50%";
  dot.style.background = "linear-gradient(180deg, rgba(255,154,203,0.97), rgba(255,86,169,0.92))";
  dot.style.border = "1px solid rgba(255,162,208,0.9)";
  dot.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.56), 0 1px 4px rgba(255,72,158,0.42)";
  dot.style.flex = "0 0 auto";
  dot.style.cursor = "grab";
  dot.style.pointerEvents = "auto";

  const tzSelect = document.createElement("select");
  tzSelect.setAttribute("aria-label", "Clock timezone");
  tzSelect.style.pointerEvents = "auto";
  tzSelect.style.font = "inherit";
  tzSelect.style.fontWeight = "600";
  tzSelect.style.color = "#ffffff";
  tzSelect.style.border = "1px solid rgba(255,182,213,0.7)";
  tzSelect.style.borderRadius = "999px";
  tzSelect.style.background = "transparent";
  tzSelect.style.padding = "1px 7px";
  tzSelect.style.maxWidth = "136px";
  tzSelect.style.cursor = "pointer";
  tzSelect.style.outline = "none";
  tzSelect.style.fontWeight = "560";
  tzSelect.style.transition = "border-color 120ms ease, background-color 120ms ease";
  for (const tz of CLOCK_TIMEZONES) {
    const option = document.createElement("option");
    option.value = tz;
    option.textContent = tz;
    tzSelect.appendChild(option);
  }

  const timeEl = document.createElement("span");
  timeEl.style.fontVariantNumeric = "tabular-nums";
  timeEl.style.letterSpacing = "0.3px";
  timeEl.style.color = "#2a2a2a";
  timeEl.style.fontWeight = "700";
  timeEl.textContent = "--:--:--";
  timeEl.style.pointerEvents = "none";

  const hideBtn = document.createElement("button");
  hideBtn.type = "button";
  hideBtn.setAttribute("aria-label", "Minimize clock");
  hideBtn.textContent = "–";
  hideBtn.style.pointerEvents = "auto";
  hideBtn.style.width = "16px";
  hideBtn.style.height = "16px";
  hideBtn.style.borderRadius = "999px";
  hideBtn.style.border = "1px solid rgba(255,182,213,0.7)";
  hideBtn.style.background = "rgba(255,255,255,0.14)";
  hideBtn.style.color = "#ffffff";
  hideBtn.style.font = "600 12px/1 monospace";
  hideBtn.style.cursor = "pointer";
  hideBtn.style.padding = "0";
  hideBtn.style.margin = "0";
  hideBtn.style.transform = "translateY(-0.5px)";

  const bobble = document.createElement("button");
  bobble.type = "button";
  bobble.setAttribute("aria-label", "Show clock");
  bobble.style.display = "none";
  bobble.style.pointerEvents = "auto";
  bobble.style.width = "14px";
  bobble.style.height = "14px";
  bobble.style.borderRadius = "50%";
  bobble.style.border = "1px solid rgba(255,162,208,0.92)";
  bobble.style.background = "linear-gradient(180deg, rgba(255,154,203,0.97), rgba(255,86,169,0.92))";
  bobble.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.56), 0 1px 4px rgba(255,72,158,0.42)";
  bobble.style.cursor = "pointer";
  bobble.style.padding = "0";
  bobble.style.margin = "0";

  box.append(peanutGlow, topSheen, dot, tzSelect, timeEl, hideBtn);
  shadow.append(box, bobble);

  let currentTimeZone = "UTC";
  let autoResetTimer = null;
  let hideRestoreTimer = null;
  let isHidden = false;
  const formatterByZone = new Map();

  function getFormatter(timeZone) {
    if (!formatterByZone.has(timeZone)) {
      formatterByZone.set(
        timeZone,
        new Intl.DateTimeFormat("en-GB", {
          timeZone,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    }
    return formatterByZone.get(timeZone);
  }

  function safeTimeZone(tz) {
    if (!CLOCK_TIMEZONES.includes(tz)) return "UTC";
    try {
      // Validate timezone support to avoid RangeError on some environments.
      getFormatter(tz);
      return tz;
    } catch {
      return "UTC";
    }
  }

  function clearAutoResetTimer() {
    if (autoResetTimer !== null) {
      clearTimeout(autoResetTimer);
      autoResetTimer = null;
    }
  }
  function clearHideRestoreTimer() {
    if (hideRestoreTimer !== null) {
      clearTimeout(hideRestoreTimer);
      hideRestoreTimer = null;
    }
  }

  function showClock() {
    if (!isHidden) return;
    isHidden = false;
    clearHideRestoreTimer();
    box.style.display = "flex";
    bobble.style.display = "none";
    setTimeout(disablePE, 0);
  }

  function hideClock() {
    if (isHidden) return;
    isHidden = true;
    clearHideRestoreTimer();
    box.style.display = "none";
    bobble.style.display = "inline-block";
    host.style.pointerEvents = "auto";
    hideRestoreTimer = setTimeout(() => {
      showClock();
    }, HIDE_AUTO_RESTORE_MS);
  }

  function setTimeZone(nextZone, shouldRestartResetTimer) {
    currentTimeZone = safeTimeZone(nextZone);
    tzSelect.value = currentTimeZone;
    if (currentTimeZone === "UTC") {
      dot.style.background = "linear-gradient(180deg, rgba(255,154,203,0.97), rgba(255,86,169,0.92))";
      dot.style.borderColor = "rgba(255,162,208,0.9)";
      dot.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.56), 0 1px 4px rgba(255,72,158,0.42)";
    } else {
      dot.style.background = "linear-gradient(180deg, rgba(255,195,225,0.96), rgba(255,125,190,0.9))";
      dot.style.borderColor = "rgba(255,188,220,0.9)";
      dot.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.6), 0 1px 3px rgba(255,95,170,0.4)";
    }
    update();

    clearAutoResetTimer();
    if (shouldRestartResetTimer && currentTimeZone !== "UTC") {
      autoResetTimer = setTimeout(() => {
        setTimeZone("UTC", false);
      }, AUTO_RESET_MS);
    }
  }

  function update() {
    const d = new Date();
    const formatter = getFormatter(currentTimeZone);
    timeEl.textContent = formatter.format(d);
    box.title = `${currentTimeZone} ${d.toISOString()}`;
  }
  tzSelect.value = "UTC";
  tzSelect.addEventListener("focus", () => {
    tzSelect.style.borderColor = "rgba(255,196,221,0.92)";
    tzSelect.style.backgroundColor = "rgba(255,255,255,0.08)";
  });
  tzSelect.addEventListener("blur", () => {
    tzSelect.style.borderColor = "rgba(255,182,213,0.7)";
    tzSelect.style.backgroundColor = "transparent";
  });
  tzSelect.addEventListener("mouseenter", () => {
    tzSelect.style.borderColor = "rgba(255,196,221,0.9)";
  });
  tzSelect.addEventListener("mouseleave", () => {
    if (document.activeElement !== tzSelect) {
      tzSelect.style.borderColor = "rgba(255,182,213,0.7)";
    }
  });
  tzSelect.addEventListener("change", () => {
    setTimeZone(tzSelect.value, true);
  });
  setTimeZone("UTC", false);
  const timer = setInterval(update, 1000);
  window.addEventListener("pagehide", () => {
    clearInterval(timer);
    clearAutoResetTimer();
    clearHideRestoreTimer();
    clearTimeout(peTimer);
  });

  let dragging = false;
  let startX = 0, startY = 0;
  let originLeft = 0, originTop = 0;

  function enablePE() {
    host.style.pointerEvents = "auto";
    box.style.pointerEvents = "auto";
  }
  function disablePE() {
    if (isHidden) return;
    if (!dragging) {
      host.style.pointerEvents = "none";
      box.style.pointerEvents = "none";
    }
  }

  function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }

  function beginDrag(x, y) {
    dragging = true;
    box.style.opacity = "1";
    dot.style.cursor = "grabbing";
    enablePE();

    const rect = host.getBoundingClientRect();
    originLeft = rect.left;
    originTop = rect.top;
    startX = x;
    startY = y;

    host.style.left = `${rect.left}px`;
    host.style.top = `${rect.top}px`;
    host.style.right = "auto";
    host.style.bottom = "auto";

    window.addEventListener("mousemove", onMouseMove, { passive: false });
    window.addEventListener("mouseup", endDrag, { passive: true, once: true });

    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", endDrag, { passive: true, once: true });
  }

  function onMouseMove(e) {
    if (!dragging) return;
    if (e.cancelable) e.preventDefault(); 
    moveTo(e.clientX, e.clientY);
  }
  function onTouchMove(e) {
    if (!dragging) return;

    e.preventDefault();
    const t = e.touches[0];
    moveTo(t.clientX, t.clientY);
  }

  function moveTo(x, y) {
    const dx = x - startX;
    const dy = y - startY;
    const newLeft = originLeft + dx;
    const newTop = originTop + dy;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = host.getBoundingClientRect();
    const w = rect.width || 150;
    const h = rect.height || 30;

    const clampedLeft = clamp(newLeft, 8, vw - w - 8);
    const clampedTop = clamp(newTop, 8, vh - h - 8);

    host.style.left = `${clampedLeft}px`;
    host.style.top = `${clampedTop}px`;
  }

  function endDrag() {
    dragging = false;
    dot.style.cursor = "grab";

    try {
      const rect = host.getBoundingClientRect();
      localStorage.setItem(
        "__pink_utc_clock_pos__",
        JSON.stringify({ left: rect.left, top: rect.top })
      );
    } catch {}
    setTimeout(disablePE, 150);
  }

  dot.addEventListener("mousedown", (e) => {
    enablePE();
    beginDrag(e.clientX, e.clientY);
  });

  dot.addEventListener("touchstart", (e) => {
    enablePE();
    const t = e.touches[0];
    beginDrag(t.clientX, t.clientY);
  }, { passive: true });

  let peTimer;
  window.addEventListener("mousemove", (e) => {
    if (isHidden) return;
    if (dragging) return;
    const r = host.getBoundingClientRect();
    const near = (
      e.clientX >= r.left - 24 && e.clientX <= r.right + 24 &&
      e.clientY >= r.top - 24 && e.clientY <= r.bottom + 24
    );
    if (near) {
      enablePE();
      clearTimeout(peTimer);
      peTimer = setTimeout(disablePE, 600);
    }
  }, { passive: true });

  dot.addEventListener("dblclick", () => {
    host.style.right = "12px";
    host.style.bottom = "12px";
    host.style.left = "auto";
    host.style.top = "auto";
    try { localStorage.removeItem("__pink_utc_clock_pos__"); } catch {}
  });

  hideBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    hideClock();
  });
  bobble.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    showClock();
  });
}
