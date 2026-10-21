// "Mascots": the catalog is the petdex.dev mascots; the chosen one lives in the sidebar header (sidebar.header, API 1.5),
// the gallery is Settings → Mascots. No always-on-top window, no hotkeys. The picture is the petdex preview: a 1152×208
// strip of six idle frames 192×208 (assets.petdex.dev/pets/<id>/preview.webp); frames are flipped by our own timer, not
// CSS: the page re-inserts the slot element on every snapshot, and a CSS animation would restart each time. The catalog
// (catalog.json) is built by tools/petdex_catalog.py of this repo; the choice is kept in this browser (localStorage).
// When a mascot is picked, the cloud of the mascot plugin in the header hides (body.has-pet), so there are never two.
//
// UI strings: en by default, ru when the hub language is Russian; the language is picked at use time by hub.lang.
// The cloud is the kalimullin:mascot plugin. We do not copy its code: it draws the cloud in the header itself, and our
// choice decides which of the two is visible. "Cloud" in the gallery = no mascot picked (the cloud shows in the header);
// if that plugin is switched off, the card turns it on via /api/plugins/toggle (on the owner's click).
const STR = {
  en: {
    title: "Mascots",
    hint: "The petdex.dev mascot gallery for the header",
    kind_character: "Character", kind_creature: "Creature", kind_object: "Object",
    color_orange: "Orange", color_red: "Red", color_blue: "Blue", color_brown: "Brown", color_yellow: "Yellow", color_pink: "Pink",
    color_purple: "Purple", color_teal: "Teal", color_green: "Green", color_gray: "Gray", color_white: "White", color_black: "Black",
    row_kind: "Type",
    row_color: "Color",
    cloud: "Cloud",
    cloud_off: "Cloud · off",
    cloud_search: "cloud mascot",
    cloud_toggle_failed: "Could not turn the cloud on: {error}",
    head_title: "{name} — mascot gallery",
    now_cloud: "The header now shows the cloud (the mascot plugin): it shows the state of the fleet. Pick a mascot below and the cloud makes room for it.",
    now_cloud_off: "No mascot picked. The cloud (the mascot plugin) is off: the Cloud card below turns it on, or pick a mascot.",
    now_none: "No mascot picked. Pick a mascot below.",
    now_as_avatar: "now instead of the avatar in the header",
    now_in_header: "now in the sidebar header",
    back_to_cloud: "Bring the cloud back",
    remove_pet: "Remove the mascot",
    as_avatar: "Instead of the avatar in the header",
    more_chips: "+{n} more",
    reset_filters: "Reset filters",
    pick: "{name} — pick",
    cloud_pick: "Cloud (the mascot plugin) — pick",
    cloud_off_pick: "Cloud (the mascot plugin) is off — turn on and pick",
    count: "{n} of {total}",
    nothing: "Nothing found",
    search: "Find a mascot by name",
    show_more: "Show more",
    foot: "The mascots come from the open petdex.dev gallery (previews are loaded from there). The choice is kept in this browser.",
    catalog_status: "catalog: {status}",
    load_failed: "The catalog failed to load: {error}",
  },
  ru: {
    title: "Маскоты",
    hint: "Галерея маскотов petdex.dev для шапки",
    kind_character: "Персонаж", kind_creature: "Существо", kind_object: "Предмет",
    color_orange: "Оранжевый", color_red: "Красный", color_blue: "Синий", color_brown: "Коричневый", color_yellow: "Жёлтый",
    color_pink: "Розовый", color_purple: "Фиолетовый", color_teal: "Бирюзовый", color_green: "Зелёный", color_gray: "Серый",
    color_white: "Белый", color_black: "Чёрный",
    row_kind: "Тип",
    row_color: "Цвет",
    cloud: "Облачко",
    cloud_off: "Облачко · выкл.",
    cloud_search: "облачко mascot",
    cloud_toggle_failed: "Не удалось включить облачко: {error}",
    head_title: "{name} — галерея маскотов",
    now_cloud: "Сейчас в шапке — облачко (плагин mascot): показывает состояние флота. Выберите маскота ниже — облачко уступит ему место.",
    now_cloud_off: "Маскот не выбран. Облачко (плагин mascot) выключено: карточка «Облачко» ниже включит его, или выберите маскота.",
    now_none: "Маскот не выбран. Выберите маскота ниже.",
    now_as_avatar: "сейчас вместо аватара в шапке",
    now_in_header: "сейчас в шапке боковой панели",
    back_to_cloud: "Вернуть облачко",
    remove_pet: "Убрать маскота",
    as_avatar: "Вместо аватара в шапке",
    more_chips: "+{n} ещё",
    reset_filters: "Сбросить фильтры",
    pick: "{name} — выбрать",
    cloud_pick: "Облачко (плагин mascot) — выбрать",
    cloud_off_pick: "Облачко (плагин mascot) выключено — включить и выбрать",
    count: "{n} из {total}",
    nothing: "Ничего не нашлось",
    search: "Найти маскота по имени",
    show_more: "Показать ещё",
    foot: "Маскоты — из открытой галереи petdex.dev (превью подгружаются оттуда). Выбор хранится в этом браузере.",
    catalog_status: "каталог: {status}",
    load_failed: "Каталог не загрузился: {error}",
  },
};
// hub is set in register(); hub.lang is read on every call, never at module load
const lang = () => (STR[hub?.lang] ? hub.lang : "en");
const t = (k, v) => {
  let r = STR[lang()][k] ?? STR.en[k] ?? k;
  for (const n in v) r = r.replaceAll(`{${n}}`, v[n]);
  return r;
};
// a catalog value (kind, color) -> its name in the current language; an unknown value stays as it is
const named = (prefix, v) => { const k = `${prefix}_${v}`; return STR[lang()][k] ?? STR.en[k] ?? v; };
const CDN = "https://assets.petdex.dev/pets";
const CLOUD = "kalimullin:mascot";
const KEY = "hub.mascots.pet";
const AVATAR = "hub.mascots.avatar";   // "1": the mascot instead of the account icon in the header
// the Settings button (#conn) sat in the header; in a hub with the ☰ menu (v1.1) it is a menu item (#nav-extra), no place for an avatar there
const accountInHeader = () => { const c = document.getElementById("conn"); return !!c && !c.closest("#nav-extra"); };
const asAvatar = () => { try { return localStorage.getItem(AVATAR) === "1" && accountInHeader(); } catch { return false; } };
const FRAMES = 6, STEP_MS = 180, PAGE = 60;
const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
// the cloud plugin in this hub: null = not installed, {on} = enabled (a disabled plugin is not loaded and serves no files)
const cloud = () => {
  const p = (hub?.snapshot()?.plugins || []).find((x) => x.name === CLOUD);
  return p && !p.missing ? { on: !p.disabled } : null;
};
const preview = (id) => `${CDN}/${encodeURIComponent(id)}/preview.webp`;

let hub = null, catalog = null, loadError = "", head = null;
let cloudCard = null, cloudSig = "", cloudNote = "";   // the cloud card, what we last showed (on/off), error message
let query = "", shown = PAGE, grid = null, more = null, count = null, now = null, filtersBox = null;
const filter = { kind: null, color: null };   // what is picked per row: AND between rows, one per row
const expanded = new Set();   // rows expanded with "+N more"
const SHOWN_CHIPS = 8;
const cards = new Map();   // id -> a button in the grid: the choice is marked without a redraw

// catalog rows: [id, name, kind, version, color, era (YYYY-MM)]; the filter rows are like on petdex.dev; names come from STR
const COLOR = { orange: "#f97316", red: "#ef4444", blue: "#3b82f6", brown: "#92400e", yellow: "#eab308", pink: "#ec4899",
  purple: "#a855f7", teal: "#14b8a6", green: "#22c55e", gray: "#9ca3af", white: "#e5e7eb", black: "#111827" };
// filter rows: type and color; the sprite version and the era month
// stay in the catalog: to bring a row back, add it here
const ROWS = [
  { key: "kind", label: "row_kind", at: 2, name: (v) => named("kind", v), dot: () => "#6b7280" },
  { key: "color", label: "row_color", at: 4, all: true, name: (v) => named("color", v), dot: (v) => COLOR[v] || "#9ca3af" },
];

function chosen() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || "null");
    return p && typeof p.id === "string" ? p : null;
  } catch { return null; }
}

function mark() {
  const id = chosen()?.id;
  for (const [cid, b] of cards) b.setAttribute("aria-pressed", String(cid === id));
  cloudCard?.setAttribute("aria-pressed", String(!id && !!cloud()?.on));
}

// "Cloud": no mascot picked, so the kalimullin:mascot plugin shows in the header; if it is off, turn it on first
async function chooseCloud() {
  cloudNote = "";
  choose(null);
  if (cloud()?.on === false) {
    const r = await hub.post("/api/plugins/toggle", { name: CLOUD, enabled: true });
    if (r.error) { cloudNote = t("cloud_toggle_failed", { error: r.error }); paintNow(); }
  }
}

function choose(pet) {
  try { pet ? localStorage.setItem(KEY, JSON.stringify(pet)) : localStorage.removeItem(KEY); } catch { /* no storage */ }
  paintHead();
  paintNow();
  mark();
}

// a mascot: a one-frame box with the strip inside; play() flips the frames until stop() is called
function sprite(id, cls) {
  const box = hub.el("div", `pet ${cls}`.trim()), img = document.createElement("img");
  img.referrerPolicy = "no-referrer";   // the petdex CDN answers 403 to a foreign Referer (hotlink protection); without one it serves
  img.src = preview(id); img.alt = ""; img.loading = "lazy"; img.decoding = "async"; img.draggable = false;
  box.append(img);
  let timer = null, i = 0;
  const show = (n) => { i = n; img.style.transform = `translateX(${(-n * 100 / FRAMES).toFixed(4)}%)`; };
  return {
    node: box,
    play() { if (timer || calm()) return; timer = setInterval(() => show((i + 1) % FRAMES), STEP_MS); },
    stop() { clearInterval(timer); timer = null; show(0); },
  };
}

// the mascot in the header: right of the title (the sidebar.header slot) or instead of the account icon, on the left of the
// Settings button; the connection light on the button stays. The account icon is hidden by a class, the button itself is
// not touched: the hub redraws it
function paintHead() {
  if (!head) return;
  const pet = chosen(), avatar = !!pet && asAvatar();
  const conn = document.getElementById("conn");
  head.sprite?.stop();
  head.sprite = null;
  head.root.replaceChildren();
  conn?.querySelector(".pet-avatar")?.remove();
  document.body.classList.toggle("has-pet", !!pet);
  document.body.classList.toggle("pet-as-avatar", avatar && !!conn);
  if (!pet) return;
  head.sprite = sprite(pet.id, avatar && conn ? "pet-avatar" : "pet-head");
  if (avatar && conn) conn.prepend(head.sprite.node);
  else {
    head.root.title = t("head_title", { name: pet.name || pet.id });
    head.root.append(head.sprite.node);
  }
  head.sprite.play();
}

function paintNow() {
  if (!now) return;
  const pet = chosen();
  if (!pet) {
    const c = cloud();
    now.replaceChildren(hub.el("p", "pets-note", cloudNote || t(c?.on ? "now_cloud" : c ? "now_cloud_off" : "now_none")));
    return;
  }
  const s = sprite(pet.id, "");
  s.play();
  const text = hub.el("div");
  text.append(hub.el("b", null, pet.name || pet.id), hub.el("span", null, t(asAvatar() ? "now_as_avatar" : "now_in_header")));
  const off = hub.el("button", "btn", t(cloud() ? "back_to_cloud" : "remove_pet"));
  off.type = "button";
  off.addEventListener("click", () => (cloud() ? chooseCloud() : choose(null)));
  const box = hub.el("div", "pets-now");
  const opt = hub.el("label", "pets-opt");
  const cb = document.createElement("input");
  cb.type = "checkbox"; cb.checked = asAvatar();
  cb.addEventListener("change", () => {
    try { cb.checked ? localStorage.setItem(AVATAR, "1") : localStorage.removeItem(AVATAR); } catch { /* no storage */ }
    paintHead(); paintNow();
  });
  opt.append(cb, hub.el("span", null, t("as_avatar")));
  box.append(s.node, text, ...(accountInHeader() ? [opt] : []), off);   // no button in the header: no "instead of the avatar" choice
  now.replaceChildren(box);
}

function matches() {
  const q = query.trim().toLowerCase();
  const on = ROWS.filter((r) => filter[r.key] != null);
  return catalog.pets.filter((p) => (!q || p[0].includes(q) || p[1].toLowerCase().includes(q))
    && on.every((r) => p[r.at] === filter[r.key]));
}

function changed() { paintFilters(); paintGrid(true); }

// row chips: the value and the number of mascots in the whole catalog, descending; beyond SHOWN_CHIPS — "+N more"
function paintFilters() {
  if (!filtersBox || !catalog) return;
  const rows = ROWS.map((r) => {
    const n = new Map();
    for (const p of catalog.pets) if (p[r.at] !== "" && p[r.at] != null) n.set(p[r.at], (n.get(p[r.at]) || 0) + 1);
    const vals = [...n].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
    if (!vals.length) return null;
    const row = hub.el("div", "pets-frow");
    row.append(hub.el("span", "pets-flabel", t(r.label)));
    const chips = hub.el("div", "pets-chips");
    const open = r.all || expanded.has(r.key) || (filter[r.key] != null && vals.findIndex(([v]) => v === filter[r.key]) >= SHOWN_CHIPS);
    for (const [v, c] of open ? vals : vals.slice(0, SHOWN_CHIPS)) {
      const b = hub.el("button", "pets-chip");
      b.type = "button";
      b.setAttribute("aria-pressed", String(filter[r.key] === v));
      const dot = hub.el("i", "pets-dot");
      dot.style.background = r.dot(v);
      b.append(dot, r.name(v), hub.el("small", null, String(c)));
      b.addEventListener("click", () => { filter[r.key] = filter[r.key] === v ? null : v; changed(); });
      chips.append(b);
    }
    if (!open && vals.length > SHOWN_CHIPS) {
      const m = hub.el("button", "pets-chip more", t("more_chips", { n: vals.length - SHOWN_CHIPS }));
      m.type = "button";
      m.addEventListener("click", () => { expanded.add(r.key); paintFilters(); });
      chips.append(m);
    }
    row.append(chips);
    return row;
  }).filter(Boolean);
  if (ROWS.some((r) => filter[r.key] != null)) {
    const reset = hub.el("button", "btn quiet pets-reset", t("reset_filters"));
    reset.type = "button";
    reset.addEventListener("click", () => { for (const r of ROWS) filter[r.key] = null; changed(); });
    rows.push(reset);
  }
  filtersBox.replaceChildren(...rows);
}

function card([id, name]) {
  const b = hub.el("button", "pets-card");
  b.type = "button";
  b.title = t("pick", { name });
  b.setAttribute("aria-pressed", String(id === chosen()?.id));
  const s = sprite(id, "");
  b.append(s.node, hub.el("span", "pets-name", name));
  b.addEventListener("pointerenter", () => s.play());
  b.addEventListener("pointerleave", () => s.stop());
  b.addEventListener("click", () => choose({ id, name }));
  cards.set(id, b);
  return b;
}

// the cloud card goes first in the grid while kalimullin:mascot is installed; search and filters hide it when it does not match
function paintCloud() {
  const c = cloud();
  cloudSig = String(c?.on ?? "");
  cloudCard?.remove();
  cloudCard = null;
  const q = query.trim().toLowerCase();
  if (!c || !grid || ROWS.some((r) => filter[r.key] != null) || (q && !t("cloud_search").includes(q))) return;
  const b = hub.el("button", "pets-card pets-cloud-card");
  b.type = "button";
  b.title = t(c.on ? "cloud_pick" : "cloud_off_pick");
  const pic = hub.el("div", "pets-cloud");
  if (c.on) {   // icon is the plugin's own file while it is enabled and served
    const img = document.createElement("img");
    img.src = `/ext/${CLOUD}/icon.svg`; img.alt = ""; img.draggable = false;
    img.addEventListener("error", () => img.replaceWith("☁"), { once: true });
    pic.append(img);
  } else pic.textContent = "☁";
  b.append(pic, hub.el("span", "pets-name", t(c.on ? "cloud" : "cloud_off")));
  b.addEventListener("click", chooseCloud);
  cloudCard = b;
  grid.prepend(b);
  mark();
}

function paintGrid(reset) {
  const list = matches();
  if (reset) { shown = PAGE; cards.clear(); grid.replaceChildren(); cloudCard = null; }
  grid.append(...list.slice(cards.size, shown).map(card));
  if (reset) paintCloud();
  count.textContent = list.length ? t("count", { n: Math.min(shown, list.length), total: list.length }) : t("nothing");
  more.hidden = shown >= list.length;
}

function build(root) {
  const page = hub.el("div", "pets");
  now = hub.el("div");
  const bar = hub.el("div", "pets-bar");
  const q = hub.el("input", "pets-q");
  q.type = "search"; q.placeholder = t("search"); q.value = query;
  q.addEventListener("input", () => { query = q.value; if (catalog) paintGrid(true); });
  count = hub.el("span", "pets-count");
  bar.append(q, count);
  filtersBox = hub.el("div", "pets-filters");
  grid = hub.el("div", "pets-grid");
  more = hub.el("button", "btn pets-more", t("show_more"));
  more.type = "button"; more.hidden = true;
  more.addEventListener("click", () => { shown += PAGE; paintGrid(false); });
  page.append(now, bar, filtersBox, grid, more, hub.el("p", "pets-note", t("foot")));
  root.replaceChildren(page);
  paintNow();
  if (catalog) changed();
  else if (loadError) count.textContent = loadError;
}

async function load() {
  try {
    const r = await fetch(hub.url("catalog.json"));
    if (!r.ok) throw new Error(t("catalog_status", { status: r.status }));
    catalog = await r.json();
    if (grid) changed();
  } catch (e) {
    loadError = t("load_failed", { error: e.message || e });
    if (count) count.textContent = loadError;
  }
}

export default function register(h) {
  hub = h;
  hub.addStyle("mascots.css");
  hub.addSlot("sidebar.header", {
    id: "mascot", order: 10,
    render(root) {
      if (head?.root === root) return;   // root lives across snapshots: the mascot is drawn once
      head = { root, sprite: null };
      root.addEventListener("click", () => {   // a click on the mascot opens its gallery in Settings
        try { localStorage.setItem("hub.settingsTab", "x:mascots"); } catch { /* no storage */ }
        if (location.hash === "#/settings") dispatchEvent(new HashChangeEvent("hashchange"));
        else location.hash = "#/settings";
      });
      paintHead();
    },
  });
  hub.addSettings({
    id: "mascots", title: t("title"), hint: t("hint"),
    render(root) {
      if (!root.querySelector(".pets")) build(root);
      else if (grid && String(cloud()?.on ?? "") !== cloudSig) { paintCloud(); paintNow(); }   // cloud plugin installed, enabled or removed
    },
  });
  addEventListener("storage", (e) => { if (e.key === KEY || e.key === AVATAR) { paintHead(); paintNow(); mark(); } });
  document.addEventListener("visibilitychange", () => { document.hidden ? head?.sprite?.stop() : head?.sprite?.play(); });
  load();
}
