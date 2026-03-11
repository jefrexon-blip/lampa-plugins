# Lampa Plugins

Коллекция пользовательских плагинов для Lampa с упором на удобство, визуальное качество и аккуратную публикацию через GitHub.

Для пользователей в корне репозитория остаются только готовые `js`-файлы плагинов. Исходники TypeScript вынесены во внутреннюю скрытую папку `.source` и не нужны для подключения.

## Подключение

Используйте прямые ссылки на нужные файлы из репозитория:

- `https://jefrexon-blip.github.io/lampa-plugins/interface_mod.js`
- `https://jefrexon-blip.github.io/lampa-plugins/rating.js`
- `https://jefrexon-blip.github.io/lampa-plugins/pubtorr.js`
- `https://jefrexon-blip.github.io/lampa-plugins/ts-preload.js`
- `https://jefrexon-blip.github.io/lampa-plugins/Parser.js`

## Плагины

- `interface_mod.js` — визуальный мод интерфейса, карточек и full-card.
- `rating.js` — вывод и обновление рейтингов KP и IMDb.
- `pubtorr.js` — каталог и переключение публичных парсеров.
- `ts-preload.js` — preload-интерфейс для TorrServer.
- `Parser.js` — загрузчик `pubtorr.js`.

## Каталог

Для автоматического списка плагинов используется файл [plugins.json](./plugins.json).

## Разработка

- Сборка: `npm install`
- Пересобрать плагины: `npm run build`
- Проверка TypeScript: `npm run check`
