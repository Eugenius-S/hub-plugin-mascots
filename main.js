// «Маскоты» (владелец 07.10: «галерея маскотов для шапки, без поверх всех»): каталог — маскоты petdex.dev, выбранный
// живёт в шапке боковой панели (sidebar.header, API 1.5), галерея — «Настройки» → «Маскоты». Без окна поверх всех и
// без хоткеев. Картинка — превью petdex: полоса 1152×208, шесть кадров покоя 192×208 (assets.petdex.dev/pets/<id>/
// preview.webp); кадры листает свой таймер, а не CSS — страница вставляет элемент места заново на каждом снимке, и
// CSS-анимация начиналась бы сначала. Каталог (catalog.json) собирает tools/petdex_catalog.py этого репо; выбор — в этом браузере
// (localStorage). Выбран маскот — облачко плагина mascot в шапке прячется (body.has-pet), чтобы не было двух.
const CDN = "https://assets.petdex.dev/pets";
const KEY = "hub.mascots.pet";
const AVATAR = "hub.mascots.avatar";   // "1" — маскот вместо значка аккаунта в шапке (владелец 07.10)
const asAvatar = () => { try { return localStorage.getItem(AVATAR) === "1"; } catch { return false; } };
const FRAMES = 6, STEP_MS = 180, PAGE = 60;
const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const preview = (id) => `${CDN}/${encodeURIComponent(id)}/preview.webp`;

let hub = null, catalog = null, loadError = "", head = null;
let query = "", shown = PAGE, grid = null, more = null, count = null, now = null, filtersBox = null;
const filter = { kind: null, color: null };   // выбранное по строкам: И между строками, одно в строке
const expanded = new Set();   // строки, развёрнутые по «+N ещё»
const SHOWN_CHIPS = 8;
const cards = new Map();   // id -> кнопка в сетке: выбор отмечаем без перерисовки

// строки каталога: [id, имя, тип, версия, цвет, набор (ГГГГ-ММ)]; строки фильтров — как на petdex.dev
const KIND = { character: "Персонаж", creature: "Существо", object: "Предмет" };
const COLOR = { orange: ["Оранжевый", "#f97316"], red: ["Красный", "#ef4444"], blue: ["Синий", "#3b82f6"], brown: ["Коричневый", "#92400e"],
  yellow: ["Жёлтый", "#eab308"], pink: ["Розовый", "#ec4899"], purple: ["Фиолетовый", "#a855f7"], teal: ["Бирюзовый", "#14b8a6"],
  green: ["Зелёный", "#22c55e"], gray: ["Серый", "#9ca3af"], white: ["Белый", "#e5e7eb"], black: ["Чёрный", "#111827"] };
// строки фильтров: тип и цвет (владелец 07.10: версию и набор убрать, цвет — все сразу, без «+N ещё»); версия и месяц
// набора остаются в каталоге — вернуть строку = добавить её сюда
const ROWS = [
  { key: "kind", label: "Тип", at: 2, name: (v) => KIND[v] || v, dot: () => "#6b7280" },
  { key: "color", label: "Цвет", at: 4, all: true, name: (v) => COLOR[v]?.[0] || v, dot: (v) => COLOR[v]?.[1] || "#9ca3af" },
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
}

function choose(pet) {
  try { pet ? localStorage.setItem(KEY, JSON.stringify(pet)) : localStorage.removeItem(KEY); } catch { /* нет хранилища */ }
  paintHead();
  paintNow();
  mark();
}

// маскот: рамка одного кадра и полоса внутри; play() листает кадры, пока не вызвали stop()
function sprite(id, cls) {
  const box = hub.el("div", `pet ${cls}`.trim()), img = document.createElement("img");
  img.referrerPolicy = "no-referrer";   // CDN petdex отдаёт 403 на чужой Referer (защита от хотлинка) — без него отдаёт
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

// маскот в шапке: справа от названия (место sidebar.header) или вместо значка аккаунта — на кнопке «Настройки» слева;
// огонёк связи на кнопке остаётся. Значок аккаунта прячется классом, кнопку не трогаем: её перерисовывает хаб
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
    head.root.title = `${pet.name || pet.id} — галерея маскотов`;
    head.root.append(head.sprite.node);
  }
  head.sprite.play();
}

function paintNow() {
  if (!now) return;
  const pet = chosen();
  if (!pet) {
    now.replaceChildren(hub.el("p", "pets-note", "Маскот не выбран: в шапке — облачко, которое показывает состояние флота. Выберите маскота ниже."));
    return;
  }
  const s = sprite(pet.id, "");
  s.play();
  const text = hub.el("div");
  text.append(hub.el("b", null, pet.name || pet.id), hub.el("span", null, asAvatar() ? "сейчас вместо аватара в шапке" : "сейчас в шапке боковой панели"));
  const off = hub.el("button", "btn", "Вернуть облачко");
  off.type = "button";
  off.addEventListener("click", () => choose(null));
  const box = hub.el("div", "pets-now");
  const opt = hub.el("label", "pets-opt");
  const cb = document.createElement("input");
  cb.type = "checkbox"; cb.checked = asAvatar();
  cb.addEventListener("change", () => {
    try { cb.checked ? localStorage.setItem(AVATAR, "1") : localStorage.removeItem(AVATAR); } catch { /* нет хранилища */ }
    paintHead(); paintNow();
  });
  opt.append(cb, hub.el("span", null, "Вместо аватара в шапке"));
  box.append(s.node, text, opt, off);
  now.replaceChildren(box);
}

function matches() {
  const q = query.trim().toLowerCase();
  const on = ROWS.filter((r) => filter[r.key] != null);
  return catalog.pets.filter((p) => (!q || p[0].includes(q) || p[1].toLowerCase().includes(q))
    && on.every((r) => p[r.at] === filter[r.key]));
}

function changed() { paintFilters(); paintGrid(true); }

// чипы строки: значение и число маскотов во всём каталоге, по убыванию; сверх SHOWN_CHIPS — «+N ещё»
function paintFilters() {
  if (!filtersBox || !catalog) return;
  const rows = ROWS.map((r) => {
    const n = new Map();
    for (const p of catalog.pets) if (p[r.at] !== "" && p[r.at] != null) n.set(p[r.at], (n.get(p[r.at]) || 0) + 1);
    const vals = [...n].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
    if (!vals.length) return null;
    const row = hub.el("div", "pets-frow");
    row.append(hub.el("span", "pets-flabel", r.label));
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
      const m = hub.el("button", "pets-chip more", `+${vals.length - SHOWN_CHIPS} ещё`);
      m.type = "button";
      m.addEventListener("click", () => { expanded.add(r.key); paintFilters(); });
      chips.append(m);
    }
    row.append(chips);
    return row;
  }).filter(Boolean);
  if (ROWS.some((r) => filter[r.key] != null)) {
    const reset = hub.el("button", "btn quiet pets-reset", "Сбросить фильтры");
    reset.type = "button";
    reset.addEventListener("click", () => { for (const r of ROWS) filter[r.key] = null; changed(); });
    rows.push(reset);
  }
  filtersBox.replaceChildren(...rows);
}

function card([id, name]) {
  const b = hub.el("button", "pets-card");
  b.type = "button";
  b.title = `${name} — выбрать`;
  b.setAttribute("aria-pressed", String(id === chosen()?.id));
  const s = sprite(id, "");
  b.append(s.node, hub.el("span", "pets-name", name));
  b.addEventListener("pointerenter", () => s.play());
  b.addEventListener("pointerleave", () => s.stop());
  b.addEventListener("click", () => choose({ id, name }));
  cards.set(id, b);
  return b;
}

function paintGrid(reset) {
  const list = matches();
  if (reset) { shown = PAGE; cards.clear(); grid.replaceChildren(); }
  grid.append(...list.slice(grid.children.length, shown).map(card));
  count.textContent = list.length ? `${Math.min(shown, list.length)} из ${list.length}` : "Ничего не нашлось";
  more.hidden = shown >= list.length;
}

function build(root) {
  const page = hub.el("div", "pets");
  now = hub.el("div");
  const bar = hub.el("div", "pets-bar");
  const q = hub.el("input", "pets-q");
  q.type = "search"; q.placeholder = "Найти маскота по имени"; q.value = query;
  q.addEventListener("input", () => { query = q.value; if (catalog) paintGrid(true); });
  count = hub.el("span", "pets-count");
  bar.append(q, count);
  filtersBox = hub.el("div", "pets-filters");
  grid = hub.el("div", "pets-grid");
  more = hub.el("button", "btn pets-more", "Показать ещё");
  more.type = "button"; more.hidden = true;
  more.addEventListener("click", () => { shown += PAGE; paintGrid(false); });
  page.append(now, bar, filtersBox, grid, more, hub.el("p", "pets-note",
    "Маскоты — из открытой галереи petdex.dev (превью подгружаются оттуда). Выбор хранится в этом браузере."));
  root.replaceChildren(page);
  paintNow();
  if (catalog) changed();
  else if (loadError) count.textContent = loadError;
}

async function load() {
  try {
    const r = await fetch(hub.url("catalog.json"));
    if (!r.ok) throw new Error(`каталог: ${r.status}`);
    catalog = await r.json();
    if (grid) changed();
  } catch (e) {
    loadError = `Каталог не загрузился: ${e.message || e}`;
    if (count) count.textContent = loadError;
  }
}

export default function register(h) {
  hub = h;
  hub.addStyle("mascots.css");
  hub.addSlot("sidebar.header", {
    id: "mascot", order: 10,
    render(root) {
      if (head?.root === root) return;   // root живёт между снимками — маскота рисуем один раз
      head = { root, sprite: null };
      root.addEventListener("click", () => {   // клик по маскоту — его галерея в «Настройках»
        try { localStorage.setItem("hub.settingsTab", "x:mascots"); } catch { /* нет хранилища */ }
        if (location.hash === "#/settings") dispatchEvent(new HashChangeEvent("hashchange"));
        else location.hash = "#/settings";
      });
      paintHead();
    },
  });
  hub.addSettings({
    id: "mascots", title: "Маскоты", hint: "Галерея маскотов petdex.dev для шапки",
    render(root) {
      if (!root.querySelector(".pets")) build(root);
    },
  });
  addEventListener("storage", (e) => { if (e.key === KEY || e.key === AVATAR) { paintHead(); paintNow(); mark(); } });
  document.addEventListener("visibilitychange", () => { document.hidden ? head?.sprite?.stop() : head?.sprite?.play(); });
  load();
}
