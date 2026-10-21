#!/usr/bin/env python3
"""The petdex.dev mascot catalog for the "Mascots" plugin (catalog.json in the repo root).

Where each field comes from (open data only; the site's /api/ is closed in robots.txt, pages with parameters sit behind a
Cloudflare check, we do not touch them):
- name, kind (character/creature/object), sprite version: the public manifest `assets.petdex.dev/manifests/petdex-v1.json`
  (the same one `npx petdex` reads);
- "era" (Class of <month>): the month of the mascot's `lastmod` in sitemap.xml (for petdex it equals the approval date);
- color: computed here: Chrome decodes the first frame of the preview (assets.petdex.dev/pets/<id>/preview.webp) into a
  canvas and we take the dominant color family. It is not petdex's own color (that is not available openly): the
  counters differ slightly;
- moods (Wholesome, Playful...) petdex serves only as pages of 60 and through its API: not taken.
Order: the popular ones from the home page, then alphabetical. Colors of the mascots already computed are taken from the
previous catalog.json: a re-run computes only the new ones. Run: python3 tools/petdex_catalog.py [--no-colors | --recolor];
needs Google Chrome (for color): without it everything else updates and the color stays as it was."""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

SITE = "https://petdex.dev"
MANIFEST = "https://assets.petdex.dev/manifests/petdex-v1.json"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "catalog.json")
ID = re.compile(r"^[a-z0-9][a-z0-9-]*$")
UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")   # foreign uploads without a preview
BATCH = 250   # images per Chrome run

# Chrome computes the color: frame 0 of the preview (192×208) -> 48×52, pixels by family; black/white/gray (outlines,
# background) count only when there is nothing colored
COLOR_JS = r"""
const FAM = (r, g, b) => {
  const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255, l = (mx + mn) / 2, d = mx - mn;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (l < 0.16) return "black";
  if (l > 0.9 && s < 0.5) return "white";
  if (s < 0.16) return "gray";
  let h;
  if (mx === r / 255) h = ((g - b) / 255 / d + 6) % 6; else if (mx === g / 255) h = (b - r) / 255 / d + 2; else h = (r - g) / 255 / d + 4;
  h *= 60;
  if (h < 15 || h >= 345) return l < 0.30 ? "brown" : (s < 0.5 && l > 0.7 ? "pink" : "red");
  if (h < 40) return l < 0.33 ? "brown" : "orange";
  if (h < 65) return l < 0.28 ? "brown" : "yellow";
  if (h < 165) return "green";
  if (h < 200) return "teal";
  if (h < 255) return "blue";
  if (h < 300) return "purple";
  return "pink";
};
const load = (id) => new Promise((ok) => {
  const img = new Image();
  img.crossOrigin = "anonymous"; img.referrerPolicy = "no-referrer";
  img.onload = () => {
    try {
      const c = document.createElement("canvas"); c.width = 48; c.height = 52;
      const x = c.getContext("2d", { willReadFrequently: true });
      x.drawImage(img, 0, 0, 192, 208, 0, 0, 48, 52);
      const px = x.getImageData(0, 0, 48, 52).data, n = {};
      for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 128) { const f = FAM(px[i], px[i + 1], px[i + 2]); n[f] = (n[f] || 0) + 1; }
      const chroma = Object.entries(n).filter(([f]) => !["black", "white", "gray"].includes(f)).sort((a, b) => b[1] - a[1]);
      const all = Object.entries(n).sort((a, b) => b[1] - a[1]);
      ok([id, (chroma[0] && chroma[0][1] >= 12 ? chroma[0] : all[0] || [""])[0]]);
    } catch (e) { ok([id, ""]); }
  };
  img.onerror = () => ok([id, ""]);
  img.src = "https://assets.petdex.dev/pets/" + encodeURIComponent(id) + "/preview.webp";
});
Promise.all(IDS.map(load)).then((r) => { document.getElementById("out").textContent = JSON.stringify(r); });
"""


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "agents-hub-mascots/1"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.read().decode("utf-8")
    except urllib.error.URLError:   # urllib does not go through an https proxy (some machines have one in the environment); curl does
        r = subprocess.run(["curl", "-sfL", "-m", "90", url], capture_output=True, timeout=120)
        if r.returncode:
            raise
        return r.stdout.decode("utf-8")


def title(pet_id):
    return " ".join(w[:1].upper() + w[1:] for w in pet_id.split("-") if w)


def eras_from_sitemap(xml):
    """{id: "2026-05"}: the month of the mascot page lastmod (for petdex, the approval date)."""
    out = {}
    for m in re.finditer(r"<url>\s*<loc>https://petdex\.dev/pets/([^</]+)</loc>(.*?)</url>", xml, flags=re.S):
        d = re.search(r"<lastmod>(\d{4}-\d{2})", m.group(2))
        if d:
            out[m.group(1)] = d.group(1)
    return out


def popular(home):
    """Mascots from the home page in display order: id and name from the "Open <name>" label (names may be non-Latin)."""
    out = {}
    for m in re.finditer(r'aria-label="Open ([^"]+)"[^>]*?href="/pets/([^"]+)"', home):
        out.setdefault(m.group(2), m.group(1))
    return out


def build(manifest, sitemap, home, colors=None):
    """[id, name, kind, version, color, era] for every mascot of the manifest; the popular first, then alphabetical."""
    colors, eras, top = colors or {}, eras_from_sitemap(sitemap), popular(home)
    rows = {}
    for p in manifest.get("pets", []):
        i = p.get("slug") or ""
        if not ID.match(i) or UUID.match(i) or i in rows:
            continue
        rows[i] = [i, p.get("displayName") or top.get(i) or title(i), p.get("kind") or "",
                   int(p.get("spriteVersionNumber") or 1), colors.get(i, ""), eras.get(i, "")]
    order = [i for i in top if i in rows] + sorted(i for i in rows if i not in top)
    return {"source": SITE, "built": time.strftime("%Y-%m-%d"), "top": len([i for i in top if i in rows]),
            "pets": [rows[i] for i in order]}


def find_chrome():
    for name in ("HUB_CHROME", "CHROME"):
        if os.environ.get(name) and os.path.isfile(os.environ[name]):
            return os.environ[name]
    for exe in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome"):
        if shutil.which(exe):
            return shutil.which(exe)
    for path in (r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                 r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                 "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"):
        if os.path.isfile(path):
            return path
    return None


def colors_for(ids, chrome):
    """{id: color family}: Chrome computes from the previews in batches; if a batch fails its mascots stay without color."""
    out = {}
    for n in range(0, len(ids), BATCH):
        chunk = ids[n:n + BATCH]
        with tempfile.TemporaryDirectory(prefix="petdex-") as tmp:
            page = os.path.join(tmp, "c.html")
            with open(page, "w", encoding="utf-8") as f:
                f.write(f'<!doctype html><meta charset="utf-8"><pre id="out"></pre><script>const IDS={json.dumps(chunk)};'
                        f"{COLOR_JS}</script>")
            try:
                r = subprocess.run([chrome, "--headless=new", "--disable-gpu", "--no-first-run", f"--user-data-dir={tmp}/p",
                                    "--virtual-time-budget=120000", "--dump-dom", "file:///" + page.replace("\\", "/")],
                                   capture_output=True, timeout=300, text=True, encoding="utf-8", errors="replace")
                m = re.search(r'<pre id="out">(.*?)</pre>', r.stdout, flags=re.S)
                for i, c in json.loads(m.group(1).replace("&quot;", '"')) if m and m.group(1).strip() else []:
                    if c:
                        out[i] = c
            except (subprocess.TimeoutExpired, ValueError, OSError) as e:
                print(f"batch {n}: {e}", file=sys.stderr)
        print(f"color: {min(n + BATCH, len(ids))}/{len(ids)}", flush=True)
    return out


def main():
    manifest, sitemap, home = json.loads(get(MANIFEST)), get(SITE + "/sitemap.xml"), get(SITE + "/")
    old = {}
    if os.path.exists(OUT) and "--recolor" not in sys.argv:
        with open(OUT, encoding="utf-8") as f:
            old = {p[0]: p[4] for p in json.load(f).get("pets", []) if len(p) > 4 and p[4]}
    cat = build(manifest, sitemap, home, old)
    todo = [p[0] for p in cat["pets"] if not p[4]]
    chrome = None if "--no-colors" in sys.argv else find_chrome()
    if todo and chrome:
        got = colors_for(todo, chrome)
        for p in cat["pets"]:
            p[4] = p[4] or got.get(p[0], "")
    elif todo:
        print(f"without color: {len(todo)} (no Chrome or --no-colors)")
    if len(cat["pets"]) < 100:
        sys.exit(f"suspiciously few mascots: {len(cat['pets'])}: did the site change?")
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        json.dump(cat, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(cat['pets'])} mascots, {cat['top']} popular, {sum(1 for p in cat['pets'] if p[4])} with color -> {OUT}")


if __name__ == "__main__":
    main()
