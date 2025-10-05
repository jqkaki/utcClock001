
if (!document.getElementById("__pink_utc_clock_root__")) {
  const host = document.createElement("div");
  host.id = "__pink_utc_clock_root__";

  host.style.all = "initial";
  host.style.position = "fixed";
  host.style.zIndex = "2147483647"; // max-ish
  host.style.right = "12px";
  host.style.bottom = "12px";
  host.style.pointerEvents = "none"; // won't block page; inner will re-enable
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  // Container
  const box = document.createElement("div");
  box.setAttribute("role", "timer");
  box.setAttribute("aria-live", "polite");
  box.style.pointerEvents = "auto"; // allow hover/title
  box.style.fontFamily = `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
  box.style.fontSize = "12px";
  box.style.lineHeight = "1";
  box.style.color = "#2a2a2a";
  //box.style.background = "#ffc0cb"; (sold pink)
  box.style.background = "rgba(255, 192, 203, 0.97)";
  box.style.border = "1px solid rgba(0,0,0,.08)";
  box.style.borderRadius = "999px";
  box.style.padding = "6px 10px";
  box.style.boxShadow = "0 2px 10px rgba(0,0,0,.10)";
  box.style.userSelect = "none";
  box.style.opacity = "1";
  box.style.display = "flex";
  box.style.alignItems = "center";
  box.style.gap = "6px";

  const dot = document.createElement("span");
  dot.style.width = "6px";
  dot.style.height = "6px";
  dot.style.borderRadius = "50%";
  dot.style.background = "#ff4da6"; // deeper pink accent
  dot.style.flex = "0 0 auto";

  const label = document.createElement("span");
  label.style.fontWeight = "600";
  label.textContent = "UTC";

  const timeEl = document.createElement("span");
  timeEl.style.fontVariantNumeric = "tabular-nums";
  timeEl.style.letterSpacing = "0.3px";
  timeEl.textContent = "--:--"; 

  box.append(dot, label, timeEl);
  shadow.appendChild(box);

  function two(n) { return n.toString().padStart(2, "0"); }

  function update() {
    const d = new Date();
    const h = two(d.getUTCHours());
    const m = two(d.getUTCMinutes());
    // const s = two(d.getUTCSeconds());
    timeEl.textContent = `${h}:${m}`; //`${h}:${m}:${s}`
    box.title = d.toUTCString(); // tooltip with full date
    
    // dot.style.transform = s % 2 === 0 ? "scale(1)" : "scale(0.85)";
    // dot.style.transition = "transform 120ms ease-out";
  }


  update();
  const timer = setInterval(update, 1000);

  
  window.addEventListener("pagehide", () => clearInterval(timer));
}
