(() => {
  const CONFIG = {
    rootId: "__pink_utc_clock_root__",
    positionKey: "__pink_utc_clock_pos__",
    defaultTimeZone: "UTC",
    timeZones: [
      "UTC",
      "Asia/Tokyo",
      "America/New_York",
      "Europe/London",
      "Australia/Sydney",
    ],
    timezoneResetMs: 10 * 60 * 1000,
    viewportPadding: 8,
    dragClickThreshold: 3,
  };

  if (document.getElementById(CONFIG.rootId)) return;

  const state = {
    currentTimeZone: CONFIG.defaultTimeZone,
    timezoneResetTimer: null,
    visibilityTransitionTimer: null,
    pointerEventsTimer: null,
    isHidden: false,
    isDragging: false,
    dragMoved: false,
    suppressBobbleClick: false,
    activeDragHandle: null,
    dragStartX: 0,
    dragStartY: 0,
    dragOriginLeft: 0,
    dragOriginTop: 0,
  };

  const formatterByZone = new Map();

  const host = createHost();
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });
  const ui = createClockUi();
  shadow.append(ui.style, ui.box, ui.bobble);

  restorePosition();
  bindEvents();
  setTimeZone(CONFIG.defaultTimeZone, false);

  const clockTimer = setInterval(updateClock, 1000);
  window.addEventListener("pagehide", cleanup);

  function createHost() {
    const el = document.createElement("div");
    el.id = CONFIG.rootId;
    Object.assign(el.style, {
      all: "initial",
      position: "fixed",
      zIndex: "2147483647",
      right: "12px",
      bottom: "12px",
      pointerEvents: "none",
    });
    return el;
  }

  function createClockUi() {
    const style = document.createElement("style");
    style.textContent = `
      .clock {
        pointer-events: none;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 11px;
        line-height: 1;
        color: #2a2a2a;
        background:
          radial-gradient(130% 220% at -8% 50%, rgba(255,205,228,0.5) 0%, rgba(255,182,214,0.28) 45%, rgba(255,166,201,0.18) 100%),
          linear-gradient(130deg, rgba(255,204,227,0.36) 0%, rgba(255,182,212,0.24) 52%, rgba(255,166,198,0.28) 100%);
        border: 1px solid rgba(255,198,223,0.82);
        border-radius: 999px;
        padding: 5px 8px;
        box-shadow: 0 10px 28px rgba(255,130,190,0.2), inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(255,172,205,0.3);
        user-select: none;
        opacity: 0.92;
        display: flex;
        align-items: center;
        gap: 4px;
        backdrop-filter: saturate(150%) blur(8px);
        transform: scale(1);
        transition: opacity 160ms ease, transform 180ms ease;
        position: relative;
        overflow: hidden;
      }

      .clock:hover {
        opacity: 1;
      }

      .glow,
      .sheen {
        position: absolute;
        pointer-events: none;
        border-radius: 999px;
      }

      .glow {
        left: -4px;
        top: 1px;
        width: 36%;
        height: calc(100% - 2px);
        background: radial-gradient(120% 120% at 20% 50%, rgba(255,232,245,0.72) 0%, rgba(255,208,230,0.34) 58%, rgba(255,192,218,0.05) 100%);
      }

      .sheen {
        left: 8%;
        top: 1px;
        width: 76%;
        height: 38%;
        background: linear-gradient(180deg, rgba(255,255,255,0.44), rgba(255,255,255,0.04));
      }

      .drag-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: linear-gradient(180deg, rgba(255,154,203,0.97), rgba(255,86,169,0.92));
        border: 1px solid rgba(255,162,208,0.9);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.56), 0 1px 4px rgba(255,72,158,0.42);
        flex: 0 0 auto;
        cursor: grab;
        pointer-events: auto;
      }

      .drag-dot.is-alt-zone {
        background: linear-gradient(180deg, rgba(255,195,225,0.96), rgba(255,125,190,0.9));
        border-color: rgba(255,188,220,0.9);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.6), 0 1px 3px rgba(255,95,170,0.4);
      }

      .timezone {
        pointer-events: auto;
        font: inherit;
        font-weight: 560;
        color: #fff;
        border: 1px solid rgba(255,182,213,0.7);
        border-radius: 999px;
        background: transparent;
        padding: 1px 6px;
        max-width: 118px;
        cursor: pointer;
        outline: none;
        transition: border-color 120ms ease, background-color 120ms ease;
      }

      .timezone:hover,
      .timezone:focus {
        border-color: rgba(255,196,221,0.9);
        background-color: rgba(255,255,255,0.08);
      }

      .time {
        color: #2a2a2a;
        font-variant-numeric: tabular-nums;
        font-weight: 700;
      }

      .minimize {
        pointer-events: auto;
        width: 14px;
        height: 14px;
        border-radius: 999px;
        border: 1px solid rgba(255,182,213,0.7);
        background: rgba(255,255,255,0.14);
        color: #fff;
        font: 600 11px/1 monospace;
        cursor: pointer;
        padding: 0;
        margin: 0;
        transform: translateY(-0.5px);
      }

      .bobble {
        display: none;
        pointer-events: auto;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: 1px solid rgba(255,190,220,0.82);
        background: radial-gradient(circle at 35% 28%, rgba(255,238,247,0.72) 0%, rgba(255,170,210,0.48) 42%, rgba(255,103,178,0.5) 100%);
        box-shadow: 0 8px 20px rgba(255,120,185,0.2), inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(255,150,200,0.24);
        color: #fff;
        cursor: grab;
        font: 600 10px/1 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-variant-numeric: tabular-nums;
        padding: 0;
        margin: 0;
        opacity: 0;
        transform: scale(0.82);
        backdrop-filter: saturate(150%) blur(6px);
        transition: opacity 160ms ease, transform 190ms cubic-bezier(.2,.9,.25,1);
      }
    `;

    const box = document.createElement("div");
    box.className = "clock";
    box.setAttribute("role", "timer");
    box.setAttribute("aria-live", "polite");

    const glow = document.createElement("span");
    glow.className = "glow";

    const sheen = document.createElement("span");
    sheen.className = "sheen";

    const dragDot = document.createElement("span");
    dragDot.className = "drag-dot";

    const timezoneSelect = document.createElement("select");
    timezoneSelect.className = "timezone";
    timezoneSelect.setAttribute("aria-label", "Clock timezone");
    for (const timeZone of CONFIG.timeZones) {
      timezoneSelect.append(new Option(timeZone, timeZone));
    }

    const time = document.createElement("span");
    time.className = "time";
    time.textContent = "--:--:--";

    const minimize = document.createElement("button");
    minimize.className = "minimize";
    minimize.type = "button";
    minimize.setAttribute("aria-label", "Minimize clock");
    minimize.textContent = "-";

    const bobble = document.createElement("button");
    bobble.className = "bobble";
    bobble.type = "button";
    bobble.setAttribute("aria-label", "Show clock");
    bobble.textContent = "--:--";

    box.append(glow, sheen, dragDot, timezoneSelect, time, minimize);

    return { style, box, dragDot, timezoneSelect, time, minimize, bobble };
  }

  function bindEvents() {
    ui.timezoneSelect.addEventListener("change", () => {
      setTimeZone(ui.timezoneSelect.value, true);
    });

    ui.minimize.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      hideClock();
    });

    ui.bobble.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (state.suppressBobbleClick) {
        state.suppressBobbleClick = false;
        return;
      }
      showClock();
    });

    bindDragHandle(ui.dragDot);
    bindDragHandle(ui.bobble);

    ui.dragDot.addEventListener("dblclick", resetPosition);

    window.addEventListener("mousemove", handlePointerProximity, { passive: true });
  }

  function bindDragHandle(handle) {
    handle.addEventListener("mousedown", (event) => {
      enablePointerEvents();
      beginDrag(event.clientX, event.clientY, handle);
    });

    handle.addEventListener(
      "touchstart",
      (event) => {
        enablePointerEvents();
        const touch = event.touches[0];
        beginDrag(touch.clientX, touch.clientY, handle);
      },
      { passive: true }
    );
  }

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

  function safeTimeZone(timeZone) {
    if (!CONFIG.timeZones.includes(timeZone)) return CONFIG.defaultTimeZone;
    try {
      getFormatter(timeZone);
      return timeZone;
    } catch {
      return CONFIG.defaultTimeZone;
    }
  }

  function setTimeZone(nextTimeZone, shouldRestartResetTimer) {
    state.currentTimeZone = safeTimeZone(nextTimeZone);
    ui.timezoneSelect.value = state.currentTimeZone;
    ui.dragDot.classList.toggle(
      "is-alt-zone",
      state.currentTimeZone !== CONFIG.defaultTimeZone
    );
    updateClock();

    clearTimezoneResetTimer();
    if (shouldRestartResetTimer && state.currentTimeZone !== CONFIG.defaultTimeZone) {
      state.timezoneResetTimer = setTimeout(() => {
        setTimeZone(CONFIG.defaultTimeZone, false);
      }, CONFIG.timezoneResetMs);
    }
  }

  function updateClock() {
    const now = new Date();
    const formatter = getFormatter(state.currentTimeZone);
    const formattedTime = formatter.format(now);

    ui.time.textContent = formattedTime;
    ui.bobble.textContent = formattedTime.slice(0, 5);
    ui.box.title = `${state.currentTimeZone} ${now.toISOString()}`;
  }

  function hideClock() {
    if (state.isHidden) return;
    state.isHidden = true;
    clearTimeout(state.visibilityTransitionTimer);
    enablePointerEvents();

    ui.box.style.opacity = "0";
    ui.box.style.transform = "scale(0.96)";
    state.visibilityTransitionTimer = setTimeout(() => {
      ui.box.style.display = "none";
      ui.bobble.style.display = "inline-flex";
      ui.bobble.style.opacity = "0";
      ui.bobble.style.transform = "scale(0.82)";
      requestAnimationFrame(() => {
        ui.bobble.style.opacity = "0.96";
        ui.bobble.style.transform = "scale(1)";
      });
    }, 150);
  }

  function showClock() {
    if (!state.isHidden) return;
    state.isHidden = false;
    clearTimeout(state.visibilityTransitionTimer);

    ui.bobble.style.opacity = "0";
    ui.bobble.style.transform = "scale(0.82)";
    state.visibilityTransitionTimer = setTimeout(() => {
      ui.bobble.style.display = "none";
      ui.box.style.display = "flex";
      ui.box.style.opacity = "0";
      ui.box.style.transform = "scale(0.96)";
      requestAnimationFrame(() => {
        ui.box.style.opacity = "0.92";
        ui.box.style.transform = "scale(1)";
      });
      setTimeout(disablePointerEvents, 190);
    }, 150);
  }

  function enablePointerEvents() {
    host.style.pointerEvents = "auto";
    ui.box.style.pointerEvents = "auto";
  }

  function disablePointerEvents() {
    if (state.isHidden || state.isDragging) return;
    host.style.pointerEvents = "none";
    ui.box.style.pointerEvents = "none";
  }

  function handlePointerProximity(event) {
    if (state.isHidden || state.isDragging) return;

    const rect = host.getBoundingClientRect();
    const isNear =
      event.clientX >= rect.left - 24 &&
      event.clientX <= rect.right + 24 &&
      event.clientY >= rect.top - 24 &&
      event.clientY <= rect.bottom + 24;

    if (!isNear) return;

    enablePointerEvents();
    clearTimeout(state.pointerEventsTimer);
    state.pointerEventsTimer = setTimeout(disablePointerEvents, 600);
  }

  function beginDrag(x, y, handle) {
    state.activeDragHandle = handle;
    state.isDragging = true;
    state.dragMoved = false;
    state.activeDragHandle.style.cursor = "grabbing";
    if (!state.isHidden) ui.box.style.opacity = "1";
    enablePointerEvents();

    const rect = host.getBoundingClientRect();
    state.dragOriginLeft = rect.left;
    state.dragOriginTop = rect.top;
    state.dragStartX = x;
    state.dragStartY = y;

    host.style.left = `${rect.left}px`;
    host.style.top = `${rect.top}px`;
    host.style.right = "auto";
    host.style.bottom = "auto";

    window.addEventListener("mousemove", handleMouseDrag, { passive: false });
    window.addEventListener("mouseup", endDrag, { passive: true, once: true });
    window.addEventListener("touchmove", handleTouchDrag, { passive: false });
    window.addEventListener("touchend", endDrag, { passive: true, once: true });
  }

  function handleMouseDrag(event) {
    if (!state.isDragging) return;
    if (event.cancelable) event.preventDefault();
    moveTo(event.clientX, event.clientY);
  }

  function handleTouchDrag(event) {
    if (!state.isDragging) return;
    event.preventDefault();
    const touch = event.touches[0];
    moveTo(touch.clientX, touch.clientY);
  }

  function moveTo(x, y) {
    const dx = x - state.dragStartX;
    const dy = y - state.dragStartY;
    if (
      Math.abs(dx) > CONFIG.dragClickThreshold ||
      Math.abs(dy) > CONFIG.dragClickThreshold
    ) {
      state.dragMoved = true;
    }

    const rect = host.getBoundingClientRect();
    const width = rect.width || 150;
    const height = rect.height || 30;
    const left = clamp(
      state.dragOriginLeft + dx,
      CONFIG.viewportPadding,
      window.innerWidth - width - CONFIG.viewportPadding
    );
    const top = clamp(
      state.dragOriginTop + dy,
      CONFIG.viewportPadding,
      window.innerHeight - height - CONFIG.viewportPadding
    );

    host.style.left = `${left}px`;
    host.style.top = `${top}px`;
  }

  function endDrag() {
    const draggedHandle = state.activeDragHandle;
    if (draggedHandle === ui.bobble && state.dragMoved) {
      state.suppressBobbleClick = true;
    }

    state.isDragging = false;
    if (draggedHandle) draggedHandle.style.cursor = "grab";
    savePosition();
    setTimeout(disablePointerEvents, 150);
  }

  function restorePosition() {
    try {
      const saved = localStorage.getItem(CONFIG.positionKey);
      if (!saved) return;

      const { left, top } = JSON.parse(saved);
      if (!Number.isFinite(left) || !Number.isFinite(top)) return;

      host.style.left = `${left}px`;
      host.style.top = `${top}px`;
      host.style.right = "auto";
      host.style.bottom = "auto";
    } catch {}
  }

  function savePosition() {
    try {
      const rect = host.getBoundingClientRect();
      localStorage.setItem(
        CONFIG.positionKey,
        JSON.stringify({ left: rect.left, top: rect.top })
      );
    } catch {}
  }

  function resetPosition() {
    host.style.right = "12px";
    host.style.bottom = "12px";
    host.style.left = "auto";
    host.style.top = "auto";
    try {
      localStorage.removeItem(CONFIG.positionKey);
    } catch {}
  }

  function clearTimezoneResetTimer() {
    if (state.timezoneResetTimer === null) return;
    clearTimeout(state.timezoneResetTimer);
    state.timezoneResetTimer = null;
  }

  function cleanup() {
    clearInterval(clockTimer);
    clearTimezoneResetTimer();
    clearTimeout(state.visibilityTransitionTimer);
    clearTimeout(state.pointerEventsTimer);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
})();
