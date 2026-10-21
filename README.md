# Mascots — an Agents Hub plugin

Mascots from [petdex.dev](https://petdex.dev) for the hub header. The gallery is Settings → Mascots: search and filters
by type and color. The chosen mascot lives in the sidebar header (next to the search; in a hub without the ☰ menu, next
to the title), and with the "Instead of the avatar in the header" checkbox it takes the place of the account icon, the
same size, without the circle and the connection light (only in a hub where the account button sits in the header; in a
hub with the ☰ menu it is a menu item and the mascot stays next to the search). It moves at its own pace; with "reduce
motion" it stands still.

If the [mascot](https://github.com/kalimullin/hub-plugin-mascot) plugin (the purple "cloud") is installed alongside, it is the
first card of the gallery: pick the cloud and it shows in the header, pick a mascot and the cloud hides, never both at once.
A disabled plugin is switched on by the card itself (on click). We do not take the cloud's code, it stays a separate plugin.

The choice is kept in this browser. Images are loaded from `assets.petdex.dev`; the catalog (`catalog.json`) is built by
`tools/petdex_catalog.py` from the open petdex data.

The UI is in English by default and in Russian for a hub whose language is Russian (`hub.lang`); the catalog's
type and color names are translated the same way.

Needs a hub with plugin API 1.5 or newer. Install: Settings → Plugins → "Available to install" → mascots.

Tests: `python3 -m unittest discover -s tests`. Code is MIT; the mascots belong to their authors on petdex.dev.

Icon — [3D Fluency](https://icons8.com/icons/3d-fluency) by Icons8.
