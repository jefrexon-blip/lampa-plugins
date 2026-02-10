Lampa.Manifest = {
  type: 'plugin',
  name: 'Рейтинг KP + IMDb',
  description: 'Показывает рейтинги Кинопоиска и IMDb в карточке фильма/сериала.',
  version: '2.2.1',
  author: 'jefrexon'
};

(function () {
  'use strict';

  // Guard: не браузер / не Lampa
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (typeof Lampa === 'undefined') return;

  // =============================
  // Meta
  // =============================
  var PLUGIN_ID = 'rating_kp_imdb';
  var PLUGIN_NAME = (Lampa.Manifest && Lampa.Manifest.name) ? Lampa.Manifest.name : 'Рейтинг KP + IMDb';
  var PLUGIN_VERSION = (Lampa.Manifest && Lampa.Manifest.version) ? Lampa.Manifest.version : '2.2.1';
  var PLUGIN_AUTHOR = (Lampa.Manifest && Lampa.Manifest.author) ? Lampa.Manifest.author : 'jefrexon';

  // Storage keys
  var KEY_ENABLED = 'rating_kpimdb_enabled';
  var KEY_SHOW_KP = 'rating_kpimdb_show_kp';
  var KEY_SHOW_IMDB = 'rating_kpimdb_show_imdb';
  var KEY_TTL_OK = 'rating_kpimdb_ttl_ok';
  var KEY_TTL_FAIL = 'rating_kpimdb_ttl_fail';

  // =============================
  // Storage helpers (compat)
  // =============================
  function storageGet(key, def) {
    try { return Lampa.Storage.get(key, def); } catch (e) {}
    try {
      var v = Lampa.Storage.field(key);
      return (v === undefined || v === null) ? def : v;
    } catch (e2) {}
    return def;
  }
  function storageSet(key, val) {
    try { Lampa.Storage.set(key, val); return; } catch (e) {}
    try { Lampa.Storage.set(key, val); } catch (e2) {}
  }

  function ensureDefaults() {
    if (storageGet(KEY_ENABLED, null) === null) storageSet(KEY_ENABLED, true);
    if (storageGet(KEY_SHOW_KP, null) === null) storageSet(KEY_SHOW_KP, true);
    if (storageGet(KEY_SHOW_IMDB, null) === null) storageSet(KEY_SHOW_IMDB, true);
    if (storageGet(KEY_TTL_OK, null) === null) storageSet(KEY_TTL_OK, '86400000');     // 24ч
    if (storageGet(KEY_TTL_FAIL, null) === null) storageSet(KEY_TTL_FAIL, '600000');   // 10м
  }

  function getEnabled() { return !!storageGet(KEY_ENABLED, true); }
  function getShowKp() { return !!storageGet(KEY_SHOW_KP, true); }
  function getShowImdb() { return !!storageGet(KEY_SHOW_IMDB, true); }

  function ttlValue(v, fallback) {
    var n = parseInt(v, 10);
    return isNaN(n) ? fallback : n;
  }
  function getTtlOk() { return ttlValue(storageGet(KEY_TTL_OK, '86400000'), 86400000); }
  function getTtlFail() { return ttlValue(storageGet(KEY_TTL_FAIL, '600000'), 600000); }

  // =============================
  // Plugin registration (internal list)
  // =============================
  try {
    if (Lampa.Plugin && Lampa.Plugin.create) {
      Lampa.Plugin.create(PLUGIN_ID, {
        name: PLUGIN_NAME,
        description: (Lampa.Manifest && Lampa.Manifest.description) || 'Показывает рейтинги Кинопоиска и IMDb.',
        version: PLUGIN_VERSION,
        author: PLUGIN_AUTHOR
      });
    }
  } catch (e) {}

  // =============================
  // Settings group
  // =============================
  function addSettingsGroup() {
    ensureDefaults();

    // SettingsApi (новые сборки)
    if (Lampa.SettingsApi && Lampa.SettingsApi.addComponent && Lampa.SettingsApi.addParam) {
      try {
        Lampa.SettingsApi.addComponent({
          component: PLUGIN_ID,
          name: PLUGIN_NAME
          // icon НЕ указываем -> будет стандартная звёздочка
        });
      } catch (e) {}

      Lampa.SettingsApi.addParam({
        component: PLUGIN_ID,
        param: { name: KEY_ENABLED, type: 'trigger', default: true },
        field: { name: 'Включить плагин', description: 'Полностью включает/выключает отображение рейтингов.' },
        onChange: function (v) { storageSet(KEY_ENABLED, !!v); }
      });

      Lampa.SettingsApi.addParam({
        component: PLUGIN_ID,
        param: { name: KEY_SHOW_IMDB, type: 'trigger', default: true },
        field: { name: 'Показывать IMDb', description: 'Показывать рейтинг IMDb в карточке.' },
        onChange: function (v) { storageSet(KEY_SHOW_IMDB, !!v); }
      });

      Lampa.SettingsApi.addParam({
        component: PLUGIN_ID,
        param: { name: KEY_SHOW_KP, type: 'trigger', default: true },
        field: { name: 'Показывать Кинопоиск', description: 'Показывать рейтинг Кинопоиска в карточке.' },
        onChange: function (v) { storageSet(KEY_SHOW_KP, !!v); }
      });

      Lampa.SettingsApi.addParam({
        component: PLUGIN_ID,
        param: {
          name: KEY_TTL_OK,
          type: 'select',
          values: {
            "3600000": "1 час",
            "21600000": "6 часов",
            "43200000": "12 часов",
            "86400000": "24 часа",
            "604800000": "7 дней"
          },
          default: "86400000"
        },
        field: { name: 'Кеш (успех)', description: 'Как долго хранить рейтинг, если он успешно найден.' },
        onChange: function (v) { storageSet(KEY_TTL_OK, String(v)); }
      });

      Lampa.SettingsApi.addParam({
        component: PLUGIN_ID,
        param: {
          name: KEY_TTL_FAIL,
          type: 'select',
          values: {
            "60000": "1 мин",
            "300000": "5 мин",
            "600000": "10 мин",
            "1800000": "30 мин",
            "3600000": "1 час"
          },
          default: "600000"
        },
        field: { name: 'Кеш (ошибка)', description: 'Как долго хранить “-”, если не найдено/ошибка (чтобы не спамить запросами).' },
        onChange: function (v) { storageSet(KEY_TTL_FAIL, String(v)); }
      });

      Lampa.SettingsApi.addParam({
        component: PLUGIN_ID,
        param: { name: 'rating_kpimdb_version', type: 'static' },
        field: { name: 'Версия', description: PLUGIN_NAME + ' v' + PLUGIN_VERSION + ' • ' + PLUGIN_AUTHOR }
      });

      return;
    }

    // Fallback: Settings.add (старые сборки)
    if (Lampa.Settings && Lampa.Settings.add) {
      try {
        Lampa.Settings.add({
          component: PLUGIN_ID,
          name: PLUGIN_NAME,
          params: [
            { name: KEY_ENABLED, type: 'trigger', default: true, caption: 'Включить плагин', desc: 'Полностью включает/выключает отображение рейтингов.' },
            { name: KEY_SHOW_IMDB, type: 'trigger', default: true, caption: 'Показывать IMDb', desc: 'Показывать рейтинг IMDb в карточке.' },
            { name: KEY_SHOW_KP, type: 'trigger', default: true, caption: 'Показывать Кинопоиск', desc: 'Показывать рейтинг Кинопоиска в карточке.' },
            {
              name: KEY_TTL_OK, type: 'select', default: '86400000',
              values: { "3600000": "1 час", "21600000": "6 часов", "43200000": "12 часов", "86400000": "24 часа", "604800000": "7 дней" },
              caption: 'Кеш (успех)', desc: 'Как долго хранить рейтинг, если он успешно найден.'
            },
            {
              name: KEY_TTL_FAIL, type: 'select', default: '600000',
              values: { "60000": "1 мин", "300000": "5 мин", "600000": "10 мин", "1800000": "30 мин", "3600000": "1 час" },
              caption: 'Кеш (ошибка)', desc: 'Как долго хранить “-”, если не найдено/ошибка.'
            },
            { name: 'rating_kpimdb_version', type: 'static', caption: 'Версия', desc: PLUGIN_NAME + ' v' + PLUGIN_VERSION + ' • ' + PLUGIN_AUTHOR }
          ]
        });
      } catch (e) {}
    }
  }

  // Запуск настроек после ready
  if (window.appready) addSettingsGroup();
  else if (Lampa.Listener && Lampa.Listener.follow) {
    Lampa.Listener.follow('app', function (e) {
      if (e.type === 'ready') addSettingsGroup();
    });
  } else {
    setTimeout(addSettingsGroup, 1500);
  }

  // =============================
  // Helpers (original)
  // =============================
  function endsWith(str, searchString) {
    var start = str.length - searchString.length;
    if (start < 0) return false;
    return str.indexOf(searchString, start) === start;
  }

  function salt(input) {
    var str = (input || '') + '';
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + c;
      hash = hash & hash;
    }
    var result = '';
    for (var _i = 0, j = 32 - 3; j >= 0; _i += 3, j -= 3) {
      var x = (((hash >>> _i) & 7) << 3) + ((hash >>> j) & 7);
      result += String.fromCharCode(x < 26 ? 97 + x : x < 52 ? 39 + x : x - 4);
    }
    return result;
  }

  function decodeSecret(input, password) {
    var result = '';
    password = (password || '') + '';
    if (input && password) {
      var hash = salt('123456789' + password);
      while (hash.length < input.length) hash += hash;
      var i = 0;
      while (i < input.length) {
        result += String.fromCharCode(input[i] ^ hash.charCodeAt(i));
        i++;
      }
    }
    return result;
  }

  function isDebug() {
    var res = false;
    var origin = window.location.origin || '';
    try {
      decodeSecret(
        [53, 10, 80, 65, 90, 90, 94, 78, 65, 120, 41, 25, 84, 66, 94, 72, 24, 92, 28, 32, 38, 67, 85, 83, 90, 75, 17, 23, 69, 34, 41, 11, 64, 28, 68, 66, 30, 86, 94, 44, 34, 1, 23, 95, 82, 0, 18, 64, 94, 34, 40, 8, 88, 28, 88, 85, 28, 80, 92, 38],
        atob('cHJpc21pc2hl')
      ).split(';').forEach(function (s) { res = res || endsWith(origin, s); });
    } catch (e) {}
    return !!res;
  }

  function cleanTitle(str) {
    return String(str || '').replace(/[\s.,:;’'`!?]+/g, ' ').trim();
  }

  function kpCleanTitle(str) {
    return cleanTitle(str)
      .replace(/^[ \/\\]+/, '')
      .replace(/[ \/\\]+$/, '')
      .replace(/\+( *[+\/\\])+/g, '+')
      .replace(/([+\/\\] *)+\+/g, '+')
      .replace(/( *[\/\\]+ *)+/g, '+');
  }

  function normalizeTitle(str) {
    return cleanTitle(
      String(str || '')
        .toLowerCase()
        .replace(/[\-\u2010-\u2015\u2E3A\u2E3B\uFE58\uFE63\uFF0D]+/g, '-')
        .replace(/ё/g, 'е')
    );
  }

  function equalTitle(t1, t2) {
    return typeof t1 === 'string' && typeof t2 === 'string' && normalizeTitle(t1) === normalizeTitle(t2);
  }

  function containsTitle(str, title) {
    return typeof str === 'string' && typeof title === 'string' && normalizeTitle(str).indexOf(normalizeTitle(title)) !== -1;
  }

  function safeNumber(v) {
    if (v === undefined || v === null) return null;
    var n = parseFloat(String(v).replace(',', '.'));
    if (isNaN(n)) return null;
    if (n <= 0) return null; // 0 считаем “нет данных”
    return n;
  }

  function parseXmlRatings(str) {
    if (!str || str.indexOf('<rating>') === -1) return null;
    try {
      var parser = new DOMParser();
      var doc = parser.parseFromString(str, 'text/xml');
      if (!doc) return null;

      var kpNode = doc.getElementsByTagName('kp_rating');
      var imdbNode = doc.getElementsByTagName('imdb_rating');

      var kp = null, imdb = null;

      if (kpNode && kpNode[0] && kpNode[0].textContent) kp = safeNumber(kpNode[0].textContent);
      if (imdbNode && imdbNode[0] && imdbNode[0].textContent) imdb = safeNumber(imdbNode[0].textContent);

      if (kp === null && imdb === null) return null;
      return { kp: kp, imdb: imdb };
    } catch (e) {
      return null;
    }
  }

  // =============================
  // Cache + singleflight
  // =============================
  var __inflight = Object.create(null);

  var CACHE_KEY = 'kp_rating';
  var CACHE_LIMIT = 500;

  function cacheGet(movieId) {
    var now = Date.now();
    var cache = Lampa.Storage.cache(CACHE_KEY, CACHE_LIMIT, {});
    var rec = cache[movieId];
    if (!rec) return null;

    var ttl = rec.ttl || getTtlOk();
    if ((now - rec.timestamp) > ttl) {
      delete cache[movieId];
      Lampa.Storage.set(CACHE_KEY, cache);
      return null;
    }
    return rec;
  }

  function cacheSet(movieId, data, ttl) {
    var now = Date.now();
    var cache = Lampa.Storage.cache(CACHE_KEY, CACHE_LIMIT, {});
    data = data || {};
    data.timestamp = now;
    data.ttl = ttl;
    cache[movieId] = data;
    Lampa.Storage.set(CACHE_KEY, cache);
    return data;
  }

  function cacheDelete(movieId) {
    var cache = Lampa.Storage.cache(CACHE_KEY, CACHE_LIMIT, {});
    if (cache[movieId]) {
      delete cache[movieId];
      Lampa.Storage.set(CACHE_KEY, cache);
    }
  }

  // =============================
  // UI render
  // =============================
  function showRating(render, paramsId, data) {
    if (!render || !render.length || !render.closest('body').length) return;

    // защита “не та карточка”
    try {
      var current = Lampa.Activity.active && Lampa.Activity.active();
      if (current && current.activity && current.activity.data && current.activity.data.movie) {
        var currentId = current.activity.data.movie.id;
        if (currentId && paramsId && currentId !== paramsId) return;
      }
    } catch (e) {}

    var kpText = '-';
    var imdbText = '-';

    if (data) {
      if (typeof data.kp === 'number' && !isNaN(data.kp) && data.kp > 0) kpText = data.kp.toFixed(1);
      if (typeof data.imdb === 'number' && !isNaN(data.imdb) && data.imdb > 0) imdbText = data.imdb.toFixed(1);
    }

    $('.wait_rating', render).remove();

    var tip = PLUGIN_NAME + ' v' + PLUGIN_VERSION;

    if (getShowImdb()) {
      $('.rate--imdb', render).removeClass('hide').attr('title', tip).find('> div').eq(0).text(imdbText);
    } else {
      $('.rate--imdb', render).addClass('hide');
    }

    if (getShowKp()) {
      $('.rate--kp', render).removeClass('hide').attr('title', tip).find('> div').eq(0).text(kpText);
    } else {
      $('.rate--kp', render).addClass('hide');
    }
  }

  // =============================
  // Core: fetch + choose
  // =============================
  function rating_kp_imdb(card, render, force) {
    if (!card || !card.id) return;
    if (!getEnabled()) return;
    if (!getShowKp() && !getShowImdb()) return;

    force = !!force;

    // allow force refresh
    if (force) {
      try { delete __inflight[card.id]; } catch (e) {}
    }

    var network = new Lampa.Reguest();

    var clean_title = kpCleanTitle(card.title);
    var search_date = card.release_date || card.first_air_date || card.last_air_date || '0000';
    var search_year = parseInt((search_date + '').slice(0, 4), 10);
    var orig = card.original_title || card.original_name;

    var kp_prox = '';
    var params = {
      id: card.id,
      url: kp_prox + 'https://kinopoiskapiunofficial.tech/',
      rating_url: kp_prox + 'https://rating.kinopoisk.ru/',
      headers: {
        'X-API-KEY': decodeSecret(
          [85, 4, 115, 118, 107, 125, 10, 70, 85, 67, 82, 14, 32, 110, 102, 43, 9, 19, 85, 73, 4, 83, 33, 110, 52, 44, 92, 21, 72, 22, 87, 1, 118, 32, 100, 127],
          atob('X0tQM3Bhc3N3b3Jk')
        )
      }
    };

    if (__inflight[params.id]) return;
    __inflight[params.id] = true;
    function done() { delete __inflight[params.id]; }

    var cached = !force ? cacheGet(params.id) : null;
    if (cached) {
      showRating(render, params.id, cached);
      done();
      return;
    }

    searchFilm();

    function searchFilm() {
      var url = params.url;
      var url_by_title = Lampa.Utils.addUrlComponent(
        url + 'api/v2.1/films/search-by-keyword',
        'keyword=' + encodeURIComponent(clean_title)
      );

      if (card.imdb_id) url = Lampa.Utils.addUrlComponent(url + 'api/v2.2/films', 'imdbId=' + encodeURIComponent(card.imdb_id));
      else url = url_by_title;

      network.clear();
      network.timeout(7000);

      network.silent(
        url,
        function (json) {
          if (json.items && json.items.length) chooseFilm(json.items);
          else if (json.films && json.films.length) chooseFilm(json.films);
          else if (url !== url_by_title) {
            network.clear();
            network.timeout(7000);
            network.silent(
              url_by_title,
              function (json2) {
                if (json2.items && json2.items.length) chooseFilm(json2.items);
                else if (json2.films && json2.films.length) chooseFilm(json2.films);
                else chooseFilm([]);
              },
              function () {
                var fail = cacheSet(params.id, { kp: null, imdb: null, ok: false }, getTtlFail());
                showRating(render, params.id, fail);
                done();
              },
              false,
              { headers: params.headers }
            );
          } else {
            chooseFilm([]);
          }
        },
        function () {
          var fail2 = cacheSet(params.id, { kp: null, imdb: null, ok: false }, getTtlFail());
          showRating(render, params.id, fail2);
          done();
        },
        false,
        { headers: params.headers }
      );
    }

    function chooseFilm(items) {
      if (!items || !items.length) {
        var nf = cacheSet(params.id, { kp: null, imdb: null, ok: false }, getTtlFail());
        showRating(render, params.id, nf);
        done();
        return;
      }

      var is_sure = false;
      var is_imdb = false;

      items.forEach(function (c) {
        var year = c.start_date || c.year || '0000';
        c.tmp_year = parseInt((year + '').slice(0, 4), 10);
      });

      if (card.imdb_id) {
        var tmp = items.filter(function (elem) {
          return (elem.imdb_id || elem.imdbId) == card.imdb_id;
        });
        if (tmp.length) {
          items = tmp;
          is_sure = true;
          is_imdb = true;
        }
      }

      var cards = items;

      if (cards.length && orig) {
        var t0 = cards.filter(function (elem) {
          return (
            containsTitle(elem.orig_title || elem.nameOriginal, orig) ||
            containsTitle(elem.en_title || elem.nameEn, orig) ||
            containsTitle(elem.title || elem.ru_title || elem.nameRu, orig)
          );
        });
        if (t0.length) {
          cards = t0;
          is_sure = true;
        }
      }

      if (cards.length && card.title) {
        var t1 = cards.filter(function (elem) {
          return (
            containsTitle(elem.title || elem.ru_title || elem.nameRu, card.title) ||
            containsTitle(elem.en_title || elem.nameEn, card.title) ||
            containsTitle(elem.orig_title || elem.nameOriginal, card.title)
          );
        });
        if (t1.length) {
          cards = t1;
          is_sure = true;
        }
      }

      if (cards.length > 1 && search_year) {
        var t2 = cards.filter(function (c) { return c.tmp_year == search_year; });
        if (!t2.length) t2 = cards.filter(function (c) { return c.tmp_year && c.tmp_year > search_year - 2 && c.tmp_year < search_year + 2; });
        if (t2.length) cards = t2;
      }

      if (cards.length == 1 && is_sure && !is_imdb) {
        if (search_year && cards[0].tmp_year) {
          is_sure = cards[0].tmp_year > search_year - 2 && cards[0].tmp_year < search_year + 2;
        }
        if (is_sure) {
          is_sure = false;
          if (orig) {
            is_sure = is_sure || equalTitle(cards[0].orig_title || cards[0].nameOriginal, orig) ||
              equalTitle(cards[0].en_title || cards[0].nameEn, orig) ||
              equalTitle(cards[0].title || cards[0].ru_title || cards[0].nameRu, orig);
          }
          if (card.title) {
            is_sure = is_sure || equalTitle(cards[0].title || cards[0].ru_title || cards[0].nameRu, card.title) ||
              equalTitle(cards[0].en_title || cards[0].nameEn, card.title) ||
              equalTitle(cards[0].orig_title || cards[0].nameOriginal, card.title);
          }
        }
      }

      if (!(cards.length == 1 && is_sure)) {
        var unsure = cacheSet(params.id, { kp: null, imdb: null, ok: false }, getTtlFail());
        showRating(render, params.id, unsure);
        done();
        return;
      }

      var id = cards[0].kp_id || cards[0].kinopoisk_id || cards[0].kinopoiskId || cards[0].filmId;

      // 1) Try XML (fast)
      network.clear();
      network.timeout(5000);

      network["native"](
        params.rating_url + id + '.xml',
        function (str) {
          var parsed = parseXmlRatings(str);
          if (parsed) {
            var ok = cacheSet(params.id, { kp: parsed.kp, imdb: parsed.imdb, ok: true }, getTtlOk());
            showRating(render, params.id, ok);
            done();
            return;
          }
          base_search(id);
        },
        function () {
          base_search(id);
        },
        false,
        { dataType: 'text' }
      );

      // 2) Fallback: REST
      function base_search(kpId) {
        network.clear();
        network.timeout(7000);
        network.silent(
          params.url + 'api/v2.2/films/' + kpId,
          function (data) {
            var kp = safeNumber(data && data.ratingKinopoisk);
            var imdb = safeNumber(data && data.ratingImdb);

            var okFlag = (kp !== null) || (imdb !== null);
            var ttl = okFlag ? getTtlOk() : getTtlFail();

            var saved = cacheSet(params.id, { kp: kp, imdb: imdb, ok: okFlag }, ttl);
            showRating(render, params.id, saved);
            done();
          },
          function () {
            var fail3 = cacheSet(params.id, { kp: null, imdb: null, ok: false }, getTtlFail());
            showRating(render, params.id, fail3);
            done();
          },
          false,
          { headers: params.headers }
        );
      }
    }
  }

  // =============================
  // Hook into Lampa
  // =============================
  function startPlugin() {
    window.rating_plugin = true;
    if (isDebug()) return;

    Lampa.Listener.follow('full', function (e) {
      if (e.type !== 'complite') return;

      if (!getEnabled()) return;

      var render = e.object && e.object.activity && e.object.activity.render ? e.object.activity.render() : null;
      if (!render || !render.length) return;

      // если оба выключены — ничего не делаем
      if (!getShowKp() && !getShowImdb()) return;

      // --- кнопка обновления рейтинга ---
      try {
        if (!$('.rating_refresh_btn', render).length) {
          var btn = $('<div class="rating_refresh_btn" style="display:inline-flex;align-items:center;justify-content:center;width:2.1em;height:2.1em;margin-left:.6em;border-radius:.6em;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);">↻</div>');
          btn.attr('title', 'Обновить рейтинг (' + PLUGIN_NAME + ' v' + PLUGIN_VERSION + ')');

          btn.on('hover:enter hover:click hover:touch', function () {
            try {
              var movie = e.data && e.data.movie;
              if (!movie || !movie.id) return;

              cacheDelete(movie.id);

              $('.wait_rating', render).remove();
              $('.info__rate', render).after(
                '<div style="width:2em;margin-top:1em;margin-right:1em" class="wait_rating">' +
                  '<div class="broadcast__scan"><div></div></div>' +
                '</div>'
              );

              // сразу покажем "-"
              showRating(render, movie.id, { kp: null, imdb: null });

              rating_kp_imdb(movie, render, true);
            } catch (err) {}
          });

          // ставим рядом с рейтингом
          $('.info__rate', render).append(btn);
        }
      } catch (err2) {}

      // --- ожидание ---
      if (!$('.wait_rating', render).length) {
        $('.info__rate', render).after(
          '<div style="width:2em;margin-top:1em;margin-right:1em" class="wait_rating">' +
            '<div class="broadcast__scan"><div></div></div>' +
          '</div>'
        );
      }

      // сразу "-"
      try { showRating(render, e.data.movie && e.data.movie.id, { kp: null, imdb: null }); } catch (ex) {}

      // запрос
      rating_kp_imdb(e.data.movie, render, false);
    });
  }

  if (!window.rating_plugin) startPlugin();
})();
