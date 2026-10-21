"""The "Mascots" plugin: the petdex.dev catalog and the manifest. The page in Chrome is not here; the catalog build runs
without a network, on short samples of the manifest, the sitemap and the home page. The UI strings (en/ru) are checked by
running the STR table and t() from main.js in node. Run: python3 -m unittest discover -s tests"""
import json
import os
import re
import shutil
import subprocess
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


def read(name):
    with open(os.path.join(ROOT, name), encoding="utf-8") as f:
        return f.read()


def node_eval(lang, code, rows=False):
    """Run the STR table and t() from main.js in node for a given hub.lang; `code` is a JS expression, result as JSON.
    With rows=True the COLOR table and ROWS (the filter rows) are included as well."""
    node = shutil.which("node")
    if not node:
        raise unittest.SkipTest("no node")
    js = read("main.js")
    src = js[js.index("const STR = {"):js.index("\n", js.index("const named"))]
    if rows:
        src += "\n" + js[js.index("const COLOR = {"):js.index("\n];", js.index("const ROWS")) + 3]
    prog = f"const hub = {{ lang: {json.dumps(lang)} }};\n{src}\nconsole.log(JSON.stringify({code}));"
    r = subprocess.run([node, "-e", prog], capture_output=True, text=True, encoding="utf-8")
    if r.returncode:
        raise AssertionError(r.stderr)
    return json.loads(r.stdout)


class Catalog(unittest.TestCase):
    def test_only_real_pets_once_popular_first_then_alphabetical(self):
        cat = pc.build(MANIFEST, SITEMAP, HOME)
        self.assertEqual([p[0] for p in cat["pets"]], ["boba", "alpha-cat", "zeta-fox"])
        self.assertEqual(cat["top"], 1)   # lulu is on the home page but not in the manifest: it does not get in

    def test_row_is_name_kind_version_color_era(self):
        rows = {p[0]: p for p in pc.build(MANIFEST, SITEMAP, HOME, {"boba": "brown"})["pets"]}
        self.assertEqual(rows["boba"], ["boba", "Boba", "creature", 1, "brown", "2026-05"])
        self.assertEqual(rows["zeta-fox"], ["zeta-fox", "Zeta Fox", "creature", 2, "", "2026-07"])   # es/ does not count
        self.assertEqual(rows["alpha-cat"], ["alpha-cat", "Alpha Cat", "character", 1, "", ""])   # name from the slug, no lastmod

    def test_shipped_catalog_is_sane(self):
        cat = json.loads(read("catalog.json"))
        ids = [p[0] for p in cat["pets"]]
        self.assertGreater(len(ids), 1000)
        self.assertEqual(len(ids), len(set(ids)))
        self.assertTrue(all(pc.ID.match(i) and len(p) == 6 for i, p in zip(ids, cat["pets"])))
        self.assertIn("boba", ids[:cat["top"]])
        self.assertEqual({p[2] for p in cat["pets"]}, {"character", "creature", "object"})
        self.assertGreater(sum(1 for p in cat["pets"] if p[4]), len(ids) * 0.9)   # the color is computed for almost all


class Manifest(unittest.TestCase):
    def test_manifest_is_complete(self):
        man = json.loads(read("hub-plugin.json"))
        self.assertEqual((man["name"], man["web"], man["hub"]), ("mascots", "main.js", "^1.5"))   # sidebar.header is API 1.5
        for key in ("icon", "description", "why", "version"):
            self.assertTrue(str(man.get(key) or "").strip(), key)
        for key in ("icon", "web"):
            self.assertTrue(os.path.isfile(os.path.join(PLUGIN, man[key])), man[key])

    def test_description_is_english_and_the_russian_text_is_in_i18n(self):
        man = json.loads(read("hub-plugin.json"))
        for key in ("description", "why"):
            self.assertFalse(re.search(r"[\u0400-\u04ff]", man[key]), key)
            self.assertTrue(re.search(r"[\u0400-\u04ff]", man["i18n"]["ru"][key]), key)

    def test_filter_rows_are_type_and_color_with_all_colors_shown(self):
        js = read("main.js")
        rows = re.findall(r'\{ key: "(\w+)", label: "(\w+)"', js)
        self.assertEqual(rows, [("kind", "row_kind"), ("color", "row_color")])   # the version and the era are removed
        self.assertRegex(js, r'key: "color"[^\n]*all: true')   # all colors at once, without "+N more"

    def test_header_mascot_opens_the_gallery(self):
        js = read("main.js")
        self.assertIn('"hub.settingsTab", "x:mascots"', js)   # a plugin tab in Settings: x:<id>

    def test_cloud_plugin_is_one_choice_and_never_drawn_with_a_pet(self):
        # the kalimullin:mascot cloud is a gallery card; we never copy its code, our choice hides it and turns it on
        js = read("main.js")
        css = read("mascots.css")
        self.assertIn('const CLOUD = "kalimullin:mascot"', js)
        self.assertIn('"/api/plugins/toggle", { name: CLOUD, enabled: true }', js)
        self.assertIn("body.has-pet .mascot.in-header { display: none; }", css)   # a mascot is picked: no cloud in the header
        self.assertIn('toggle("has-pet", !!pet)', js)   # no mascot: no class, the cloud is visible

    def test_images_are_requested_without_referer(self):
        # the petdex CDN answers 403 to a request with a foreign Referer: without this line all previews in the hub are broken
        self.assertIn('referrerPolicy = "no-referrer"', read("main.js"))

    def test_main_js_is_valid_module(self):
        node = shutil.which("node")
        if not node:
            self.skipTest("no node")
        r = subprocess.run([node, "--input-type=module", "--check"], input=read("main.js"), capture_output=True,
                           text=True, encoding="utf-8")
        self.assertEqual(r.returncode, 0, r.stderr)


class Languages(unittest.TestCase):
    def test_both_tables_have_the_same_keys(self):
        en, ru = node_eval("en", "[Object.keys(STR.en).sort(), Object.keys(STR.ru).sort()]")
        self.assertEqual(en, ru)

    def test_english_is_the_default(self):
        for lang in ("en", "de", "uk", "xx", ""):
            self.assertEqual(node_eval(lang, 't("show_more")'), "Show more", lang)
            self.assertEqual(node_eval(lang, 'ROWS.map((r) => t(r.label))', rows=True), ["Type", "Color"], lang)
            self.assertEqual(node_eval(lang, 'ROWS[1].name("orange")', rows=True), "Orange", lang)

    def test_russian_when_the_hub_is_russian(self):
        self.assertEqual(node_eval("ru", 't("show_more")'), "Показать ещё")
        self.assertEqual(node_eval("ru", 'ROWS.map((r) => t(r.label))', rows=True), ["Тип", "Цвет"])
        self.assertEqual(node_eval("ru", 'ROWS[0].name("creature")', rows=True), "Существо")
        self.assertEqual(node_eval("ru", 't("count", { n: 60, total: 4800 })'), "60 из 4800")

    def test_language_is_read_at_use_time(self):
        js = read("main.js")
        self.assertIn("hub?.lang", js)   # read on every call, not once at module load
        self.assertNotRegex(js, r"const lang = hub")

    def test_substitution_and_fallback_to_the_key(self):
        self.assertEqual(node_eval("en", 't("count", { n: 60, total: 4800 })'), "60 of 4800")
        self.assertEqual(node_eval("en", 't("more_chips", { n: 5 })'), "+5 more")
        self.assertEqual(node_eval("en", 't("no_such_key")'), "no_such_key")

    def test_unknown_catalog_value_keeps_its_own_text(self):
        for lang in ("en", "ru"):
            self.assertEqual(node_eval(lang, 'ROWS[1].name("ultraviolet")', rows=True), "ultraviolet", lang)

    def test_every_catalog_kind_and_color_has_a_name_in_both_languages(self):
        cat = json.loads(read("catalog.json"))
        kinds = {p[2] for p in cat["pets"]}
        colors = {p[4] for p in cat["pets"] if p[4]}
        en, ru, hexes = node_eval("en", "[STR.en, STR.ru, COLOR]", rows=True)
        for table in (en, ru):
            self.assertEqual({f"kind_{k}" for k in kinds} - set(table), set())
            self.assertEqual({f"color_{c}" for c in colors} - set(table), set())
        self.assertEqual(colors - set(hexes), set())   # and a dot color

    def test_every_string_of_the_table_is_used_and_no_russian_outside_it(self):
        js = read("main.js")
        start, end = js.index("const STR = {"), js.index("// hub is set in register()")
        ru_start = js.index("  ru: {", start)
        self.assertFalse(re.search(r"[\u0400-\u04ff]", js[:ru_start] + js[end:]))   # Russian lives only in STR.ru
        used = js[:start] + js[end:]
        keys = node_eval("en", "Object.keys(STR.en)")
        dynamic = ("kind_", "color_")   # picked by the catalog value in named()
        for k in keys:
            if not k.startswith(dynamic):
                self.assertIn(f'"{k}"', used, k)


if __name__ == "__main__":
    unittest.main()
