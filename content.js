if (!document.getElementById("__pink_utc_clock_root__")) {
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
  box.style.background = "rgba(255,192,203,0.35)"; // 半透明粉色
  box.style.border = "1px solid rgba(255,105,180,0.45)";
  box.style.borderRadius = "999px";
  box.style.padding = "6px 10px";
  box.style.boxShadow = "0 4px 14px rgba(0,0,0,.12)";
  box.style.userSelect = "none";
  box.style.opacity = "0.92";
  box.style.display = "flex";
  box.style.alignItems = "center";
  box.style.gap = "6px";
  box.style.backdropFilter = "saturate(120%) blur(2px)"; 
  box.style.transition = "opacity 120ms ease";

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
  dot.style.background = "#ff4da6";
  dot.style.flex = "0 0 auto";
  dot.style.cursor = "grab";
  dot.style.pointerEvents = "auto"; 

  const label = document.createElement("span");
  label.style.fontWeight = "600";
  label.textContent = "UTC";
  label.style.pointerEvents = "none"; 

  const timeEl = document.createElement("span");
  timeEl.style.fontVariantNumeric = "tabular-nums";
  timeEl.style.letterSpacing = "0.3px";
  timeEl.textContent = "--:--";
  timeEl.style.pointerEvents = "none";

  box.append(dot, label, timeEl);
  shadow.appendChild(box);

  function two(n) { return n.toString().padStart(2, "0"); }
  function update() {
    const d = new Date();
    const h = two(d.getUTCHours());
    const m = two(d.getUTCMinutes());
    timeEl.textContent = `${h}:${m}`;
    box.title = d.toUTCString();
  }
  update();
  const timer = setInterval(update, 1000);
  window.addEventListener("pagehide", () => clearInterval(timer));

  let dragging = false;
  let startX = 0, startY = 0;
  let originLeft = 0, originTop = 0;

  function enablePE() {
    host.style.pointerEvents = "auto";
    box.style.pointerEvents = "auto";
  }
  function disablePE() {
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

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mouseup", endDrag, { passive: true, once: true });

    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", endDrag, { passive: true, once: true });
  }

  function onMouseMove(e) {
    if (!dragging) return;
    e.preventDefault();
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
}
