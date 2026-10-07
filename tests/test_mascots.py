"""Плагин «Маскоты»: каталог petdex.dev и манифест. Страница в Chrome — не
здесь; сборка каталога — без сети, на коротких образцах манифеста, sitemap и главной."""
import json
import os
import re
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLUGIN = ROOT
sys.path.insert(0, os.path.join(ROOT, "tools"))
import petdex_catalog as pc  # noqa: E402
SITEMAP = """<urlset><url><loc>https://petdex.dev/</loc><lastmod>2026-09-27T20:16:40.790Z</lastmod></url>
<url><loc>https://petdex.dev/pets/zeta-fox</loc><lastmod>2026-07-29T16:34:12.331Z</lastmod></url>
<url><loc>https://petdex.dev/es/pets/zeta-fox</loc><lastmod>2026-07-30T00:00:00.000Z</lastmod></url>
<url><loc>https://petdex.dev/pets/boba</loc><lastmod>2026-05-02T17:24:16.807Z</lastmod></url>
<url><loc>https://petdex.dev/pets/alpha-cat</loc></url></urlset>"""
HOME = ('<a aria-label="Open menu" href="/x"></a><a aria-label="Open Boba" class="c" href="/pets/boba"></a>'
        '<a aria-label="Open 噜噜" href="/pets/lulu"></a><a aria-label="Open Boba" href="/pets/boba"></a>')
MANIFEST = {"pets": [
    {"slug": "zeta-fox", "displayName": "Zeta Fox", "kind": "creature", "spriteVersionNumber": 2},
    {"slug": "boba", "displayName": "Boba", "kind": "creature", "spriteVersionNumber": 1},
    {"slug": "alpha-cat", "kind": "character"},
    {"slug": "90de1b44-3df5-4597-aa30-393619f89d87", "displayName": "uuid", "kind": "object"},
    {"slug": "Bad_Id", "displayName": "bad", "kind": "object"},
    {"slug": "boba", "displayName": "dup", "kind": "object"}]}


class Catalog(unittest.TestCase):
    def test_only_real_pets_once_popular_first_then_alphabetical(self):
        cat = pc.build(MANIFEST, SITEMAP, HOME)
        self.assertEqual([p[0] for p in cat["pets"]], ["boba", "alpha-cat", "zeta-fox"])
        self.assertEqual(cat["top"], 1)   # lulu с главной, но в манифесте его нет — не попадает

    def test_row_is_name_kind_version_color_era(self):
        rows = {p[0]: p for p in pc.build(MANIFEST, SITEMAP, HOME, {"boba": "brown"})["pets"]}
        self.assertEqual(rows["boba"], ["boba", "Boba", "creature", 1, "brown", "2026-05"])
        self.assertEqual(rows["zeta-fox"], ["zeta-fox", "Zeta Fox", "creature", 2, "", "2026-07"])   # es/ — не в счёт
        self.assertEqual(rows["alpha-cat"], ["alpha-cat", "Alpha Cat", "character", 1, "", ""])   # имя из slug, нет lastmod

    def test_shipped_catalog_is_sane(self):
        with open(os.path.join(PLUGIN, "catalog.json"), encoding="utf-8") as f:
            cat = json.load(f)
        ids = [p[0] for p in cat["pets"]]
        self.assertGreater(len(ids), 1000)
        self.assertEqual(len(ids), len(set(ids)))
        self.assertTrue(all(pc.ID.match(i) and len(p) == 6 for i, p in zip(ids, cat["pets"])))
        self.assertIn("boba", ids[:cat["top"]])
        self.assertEqual({p[2] for p in cat["pets"]}, {"character", "creature", "object"})
        self.assertGreater(sum(1 for p in cat["pets"] if p[4]), len(ids) * 0.9)   # цвет посчитан почти у всех


class Manifest(unittest.TestCase):
    def test_manifest_is_complete(self):
        with open(os.path.join(PLUGIN, "hub-plugin.json"), encoding="utf-8") as f:
            man = json.load(f)
        self.assertEqual((man["name"], man["web"], man["hub"]), ("mascots", "main.js", "^1.5"))   # sidebar.header — API 1.5
        for key in ("icon", "description", "why", "version"):
            self.assertTrue(str(man.get(key) or "").strip(), key)
        for key in ("icon", "web"):
            self.assertTrue(os.path.isfile(os.path.join(PLUGIN, man[key])), man[key])

    def test_filter_rows_are_type_and_color_with_all_colors_shown(self):
        with open(os.path.join(PLUGIN, "main.js"), encoding="utf-8") as f:
            js = f.read()
        rows = re.findall(r'\{ key: "(\w+)", label: "([^"]+)"', js)
        self.assertEqual(rows, [("kind", "Тип"), ("color", "Цвет")])   # версия и набор — убраны (владелец 07.10)
        self.assertRegex(js, r'key: "color"[^\n]*all: true')   # цвета сразу все, без «+N ещё»

    def test_header_mascot_opens_the_gallery(self):
        with open(os.path.join(PLUGIN, "main.js"), encoding="utf-8") as f:
            js = f.read()
        self.assertIn('"hub.settingsTab", "x:mascots"', js)   # вкладка плагина в «Настройках»: x:<id>

    def test_images_are_requested_without_referer(self):
        # CDN petdex отвечает 403 на запрос с чужого Referer — без этой строки в хабе все превью «битые» (07.10)
        with open(os.path.join(PLUGIN, "main.js"), encoding="utf-8") as f:
            self.assertIn('referrerPolicy = "no-referrer"', f.read())


if __name__ == "__main__":
    unittest.main()
