export function getMoscowNow() {
  // Moscow time is UTC+3, no DST.
  const MSK_OFFSET_MIN = 180;
  const msk = new Date(Date.now() + MSK_OFFSET_MIN * 60 * 1000);
  return {
    date: msk,
    hour: msk.getUTCHours(),
    minute: msk.getUTCMinutes(),
    day: msk.getUTCDay(), // 0=Sun ... 6=Sat
  };
}

export function timeToMinutes(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm).trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
}

export function formatDirectionLabel(label) {
  const s = String(label ?? "").trim();
  const low = s.toLowerCase();
  if (!s) return "—";
  if (low.includes("кпп")) return s;

  // Common short forms
  if (s === "112") return "КПП 1 (тит.112)";
  if (low.startsWith("тит.") || low.startsWith("т.")) return s;

  // numbers like 085, 097
  if (/^\d{2,4}(\/\d)?$/.test(s)) return `тит.${s}`;
  return s;
}

export function daysLabel(routeDays) {
  const v = String(routeDays ?? "").toLowerCase();
  if (v.includes("week") || v.includes("будн")) return "Пн-Пт";
  if (v.includes("weekend") || v.includes("выход")) return "Сб-Вс";
  if (v.includes("sat") || v.includes("суб")) return "Сб";
  if (v.includes("sun") || v.includes("воск")) return "Вс";
  return "Ежедн.";
}

export function isRouteActiveToday(routeDays, mskDay){
  const v = String(routeDays ?? "").toLowerCase();
  const isWeekday = mskDay >= 1 && mskDay <= 5;

  if (v.includes("week") || v.includes("будн")) return isWeekday;
  if (v.includes("weekend") || v.includes("выход")) return !isWeekday;
  if (v.includes("sat") || v.includes("суб")) return mskDay === 6;
  if (v.includes("sun") || v.includes("воск")) return mskDay === 0;
  return true;
}

export function pickWindow(times, nowMin) {
  // times: array of "HH:MM" sorted
  const mins = times.map(timeToMinutes).filter(x => x != null);
  if (!mins.length) return { prev:"", next:"", after:"", nextMin:null };

  let idx = mins.findIndex(m => m >= nowMin);
  if (idx === -1) idx = 0; // tomorrow wrap

  const prevIdx = (idx - 1 + mins.length) % mins.length;
  const afterIdx = (idx + 1) % mins.length;

  const prev = times[prevIdx] || "";
  const next = times[idx] || "";
  const after = times[afterIdx] || "";

  let nextMin = mins[idx];
  // If wrapped to tomorrow, add 1440 for countdown calc
  if (mins[idx] < nowMin) nextMin = mins[idx] + 1440;

  return { prev, next, after, nextMin };
}

export function routeNextCountdown(route, nowMin, mskDay){
  if (!isRouteActiveToday(route?.days, mskDay)) return null;

  let best = null;
  const dirs = Array.isArray(route?.directions) ? route.directions : [];

  for (const d of dirs) {
    const times = Array.isArray(d?.lines) ? d.lines : [];
    const w = pickWindow(times, nowMin);
    if (w.nextMin == null) continue;
    if (best == null || w.nextMin < best) best = w.nextMin;
  }

  if (best == null) return null;
  const diff = Math.max(0, best - nowMin);
  return diff;
}

export function qs(sel, root=document){ return root.querySelector(sel); }

export function initDrawer(activePage){
  const btn = qs("#menuBtn");
  const drawer = qs("#drawer");
  const backdrop = qs("#drawerBackdrop");

  function open(){
    drawer.classList.add("open");
    backdrop.classList.add("open");
  }
  function close(){
    drawer.classList.remove("open");
    backdrop.classList.remove("open");
  }

  btn?.addEventListener("click", open);
  backdrop?.addEventListener("click", close);

  // highlight active
  const linkInternal = qs("#linkInternal");
  const linkExternal = qs("#linkExternal");
  if (activePage === "internal") linkInternal?.classList.add("active");
  if (activePage === "external") linkExternal?.classList.add("active");

  return { open, close };
}

export function iconMenuSvg(){
  return `
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 6h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M4 12h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
}
