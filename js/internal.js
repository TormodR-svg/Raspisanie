import { qs, getMoscowNow, pickWindow, routeNextCountdown, formatDirectionLabel, daysLabel, initDrawer, iconMenuSvg } from "./utils.js";

async function loadData(){
  const res = await fetch("./data/internal.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Не удалось загрузить расписание");
  return res.json();
}

function daysLabelLong(routeDays){
  const v = String(routeDays ?? "").toLowerCase();
  if (v.includes("week") || v.includes("будн")) return "Пн - Пт";
  if (v.includes("weekend") || v.includes("выход")) return "Сб - Вс";
  if (v.includes("sat") || v.includes("суб")) return "Суббота";
  if (v.includes("sun") || v.includes("воск")) return "Воскресенье";
  return "Ежедневно";
}

function timeDisplay(t){
  const s = String(t ?? "").trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return "—";
  const hh = String(m[1]).padStart(2,"0");
  const mm = m[2];
  return `${hh} : ${mm}`;
}

function setupModal(){
  const modal = qs("#modal");
  const closeBtn = qs("#modalClose");
  const titleEl = qs("#modalTitle");
  const subEl = qs("#modalSubtitle");
  const colA = qs("#modalColA");
  const colB = qs("#modalColB");
  const th = qs("#modalTh");
  const rowsHost = qs("#modalRows");

  function close(){
    modal?.classList.remove("open");
    modal?.setAttribute("aria-hidden","true");
    document.body.classList.remove("modal-open");
  }

  function openForRoute(route){
    // title like screenshot
    const id = String(route?.id ?? "").trim() || "";
    titleEl.textContent = id ? `Расписание автобуса №${id}` : (String(route?.title ?? "Расписание"));
    subEl.textContent = daysLabelLong(route?.days);

    const dirs = Array.isArray(route?.directions) ? route.directions : [];
    const a = dirs[0];
    const b = dirs[1];

    const aLabel = formatDirectionLabel(a?.label ?? "—");
    const bLabel = formatDirectionLabel(b?.label ?? "—");

    const aTimes = Array.isArray(a?.lines) ? a.lines : [];
    const bTimes = Array.isArray(b?.lines) ? b.lines : [];

    const twoCols = !!b;
    th.classList.toggle("one", !twoCols);

    colA.textContent = aLabel;
    colB.textContent = twoCols ? bLabel : "";

    rowsHost.innerHTML = "";

    const n = Math.max(aTimes.length, bTimes.length, 1);
    for (let i=0;i<n;i++){
      const row = document.createElement("div");
      row.className = twoCols ? "modal-row" : "modal-row one";

      const ca = document.createElement("div");
      ca.className = "cell" + (aTimes[i] ? "" : " muted");
      ca.textContent = timeDisplay(aTimes[i]);

      row.appendChild(ca);

      if (twoCols){
        const cb = document.createElement("div");
        cb.className = "cell" + (bTimes[i] ? "" : " muted");
        cb.textContent = timeDisplay(bTimes[i]);
        row.appendChild(cb);
      }

      rowsHost.appendChild(row);
    }

    modal.classList.add("open");
    modal.setAttribute("aria-hidden","false");
    document.body.classList.add("modal-open");
  }

  closeBtn?.addEventListener("click", close);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal?.classList.contains("open")) close();
  });

  return { openForRoute, close };
}

function makeCard(route, nowMin, mskDay, modalApi){
  const card = document.createElement("div");
  card.className = "route-card";
  card.setAttribute("role","button");
  card.setAttribute("tabindex","0");

  const left = document.createElement("div");
  left.className = "route-left";
  left.innerHTML = `
    <div class="route-num">${route.id ?? ""}</div>
    <div class="route-days">${daysLabel(route.days)}</div>
  `;

  const right = document.createElement("div");
  right.className = "route-right";

  const dirs = Array.isArray(route?.directions) ? route.directions : [];
  const showDirs = dirs.slice(0, 2);

  const dirsWrap = document.createElement("div");
  dirsWrap.className = showDirs.length <= 1 ? "dirs one" : "dirs";

  function renderDir(d){
    const label = formatDirectionLabel(d?.label ?? "");
    const times = Array.isArray(d?.lines) ? d.lines : [];
    const w = pickWindow(times, nowMin);

    const el = document.createElement("div");
    el.className = "dir";
    el.innerHTML = `
      <div class="dir-title">${label}</div>
      <div class="dir-times">
        <span class="t-prev">${w.prev || ""}</span>
        <span class="t-next">${w.next || ""}</span>
        <span class="t-after">${w.after || ""}</span>
      </div>
    `;
    return el;
  }

  if (showDirs.length === 0) {
    const el = document.createElement("div");
    el.className = "center-note";
    el.textContent = "Нет данных";
    right.appendChild(el);
  } else if (showDirs.length === 1) {
    dirsWrap.appendChild(renderDir(showDirs[0]));
  } else {
    dirsWrap.appendChild(renderDir(showDirs[0]));
    const div = document.createElement("div");
    div.className = "divider";
    dirsWrap.appendChild(div);
    dirsWrap.appendChild(renderDir(showDirs[1]));
  }

  right.appendChild(dirsWrap);

  

  card.appendChild(left);
  card.appendChild(right);

  const open = () => modalApi.openForRoute(route);
  card.addEventListener("click", open);
  card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") open(); });

  return card;
}

async function main(){
  initDrawer("internal");
  const btn = qs("#menuBtn");
  if (btn) btn.innerHTML = iconMenuSvg();

  const modalApi = setupModal();

  const host = qs("#list");
  host.innerHTML = `<div class="center-note">Загрузка…</div>`;

  const data = await loadData();
  const now = getMoscowNow();
  const nowMin = now.hour * 60 + now.minute;

  host.innerHTML = "";
  const routes = (data.routes || []).filter(r => String(r?.id ?? "").trim() !== "");
  for (const route of routes) {
    host.appendChild(makeCard(route, nowMin, now.day, modalApi));
  }
}

main().catch(err => {
  const host = qs("#list");
  host.innerHTML = `<div class="center-note">${String(err.message || err)}</div>`;
});
