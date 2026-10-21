# Маскоты — плагин Agents Hub

Маскоты из [petdex.dev](https://petdex.dev) для шапки хаба. Галерея — «Настройки» → «Маскоты»: поиск, фильтры по типу
и цвету. Выбранный маскот живёт в шапке боковой панели (рядом с поиском; в хабе без меню ☰ — рядом с названием), а с галочкой «Вместо аватара в шапке» —
на месте значка аккаунта, того же размера, без круга и огонька (только в хабе, где кнопка аккаунта стоит в шапке; в хабе с меню ☰ она — пункт меню, маскот остаётся рядом с поиском). Шевелится в своём ритме; при «уменьшить движение» стоит.

If the [mascot](https://github.com/kalimullin/hub-plugin-mascot) plugin (the purple "cloud") is installed alongside, it is the
first card of the gallery: pick the cloud and it shows in the header, pick a mascot and the cloud hides, never both at once.
A disabled plugin is switched on by the card itself (on click). We do not take the cloud's code, it stays a separate plugin.

Выбор хранится в этом браузере. Картинки грузятся с `assets.petdex.dev`; каталог (`catalog.json`) собирает
`tools/petdex_catalog.py` из открытых данных petdex.

Нужен хаб с API плагинов 1.5 или новее. Поставить: «Настройки» → «Плагины» → «Можно поставить» → mascots.

Тесты: `python3 -m unittest discover -s tests`. Код — MIT; маскоты — их авторов на petdex.dev.

Иконка — [3D Fluency](https://icons8.com/icons/3d-fluency) от Icons8.
