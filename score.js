(function() {
  Lampa.Manifest = {
    type: "plugin",
    name: "CineScore",
    description: "Показывает KP и IMDb в карточке фильма или сериала, хранит кэш и умеет обновлять данные вручную.",
    version: "3.0.0",
    author: "jefrexon"
  };
  (function() {
    "use strict";
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (typeof Lampa === "undefined" || typeof $ === "undefined") return;
    var PLUGIN_ID = "cine_score";
    var SETTINGS_COMPONENT = "cine_score_component";
    var CSS_ID = "cine_score_styles";
    var CACHE_KEY = "cine_score_cache_v1";
    var CACHE_LIMIT = 250;
    var inflight = {};
    var cardTokens = {};
    var booted = false;
    var defaults = {
      enabled: true,
      showKp: true,
      showImdb: true,
      showSource: true,
      compact: false,
      animation: true,
      ttlOk: "86400000",
      ttlFail: "900000"
    };
    var keyMap = {
      enabled: "cine_score_enabled",
      showKp: "cine_score_show_kp",
      showImdb: "cine_score_show_imdb",
      showSource: "cine_score_show_source",
      compact: "cine_score_compact",
      animation: "cine_score_animation",
      ttlOk: "cine_score_ttl_ok",
      ttlFail: "cine_score_ttl_fail"
    };
    function read(key, fallback) {
      try {
        return Lampa.Storage.get(key, fallback);
      } catch (e) {
      }
      try {
        var value = Lampa.Storage.field(key);
        return value === void 0 || value === null ? fallback : value;
      } catch (e2) {
      }
      return fallback;
    }
    function write(key, value) {
      try {
        Lampa.Storage.set(key, value);
      } catch (e) {
      }
    }
    function ensureDefaults() {
      var name;
      for (name in defaults) {
        if (defaults.hasOwnProperty(name) && read(keyMap[name], null) === null) write(keyMap[name], defaults[name]);
      }
    }
    function settings() {
      return {
        enabled: !!read(keyMap.enabled, defaults.enabled),
        showKp: !!read(keyMap.showKp, defaults.showKp),
        showImdb: !!read(keyMap.showImdb, defaults.showImdb),
        showSource: !!read(keyMap.showSource, defaults.showSource),
        compact: !!read(keyMap.compact, defaults.compact),
        animation: !!read(keyMap.animation, defaults.animation),
        ttlOk: toNumber(read(keyMap.ttlOk, defaults.ttlOk), 864e5),
        ttlFail: toNumber(read(keyMap.ttlFail, defaults.ttlFail), 9e5)
      };
    }
    function toNumber(value, fallback) {
      var number = parseInt(value, 10);
      return isNaN(number) ? fallback : number;
    }
    function clampRating(value) {
      if (value === void 0 || value === null) return null;
      var number = parseFloat(String(value).replace(",", "."));
      if (!isFinite(number) || number <= 0) return null;
      if (number > 10) number = number / 10;
      return Math.round(number * 10) / 10;
    }
    function formatRating(value) {
      return typeof value === "number" && isFinite(value) ? value.toFixed(1) : "—";
    }
    function ratingTone(value) {
      if (typeof value !== "number") return "muted";
      if (value >= 8) return "good";
      if (value >= 6.5) return "mid";
      return "bad";
    }
    function sourceLabel(source) {
      if (source === "cache") return "Кэш";
      if (source === "xml") return "XML";
      if (source === "api") return "API";
      if (source === "fallback") return "Fallback";
      return "Нет данных";
    }
    function notify(text) {
      try {
        Lampa.Noty.show(text);
      } catch (e) {
      }
    }
    function activeMovie() {
      try {
        var current = Lampa.Activity.active && Lampa.Activity.active();
        if (current && current.activity && current.activity.data && current.activity.data.movie) return current.activity.data.movie;
      } catch (e) {
      }
      return null;
    }
    function activeMovieId() {
      var movie = activeMovie();
      return movie && movie.id ? movie.id : null;
    }
    function cacheReadAll() {
      var cache = read(CACHE_KEY, {});
      if (!cache || typeof cache !== "object") return {};
      return cache;
    }
    function cacheWriteAll(cache) {
      write(CACHE_KEY, cache);
    }
    function cacheTrim(cache) {
      var keys = [];
      var key;
      for (key in cache) {
        if (cache.hasOwnProperty(key)) keys.push(key);
      }
      keys.sort(function(left, right) {
        var lt = cache[left] && cache[left].saved_at ? cache[left].saved_at : 0;
        var rt = cache[right] && cache[right].saved_at ? cache[right].saved_at : 0;
        return rt - lt;
      });
      while (keys.length > CACHE_LIMIT) {
        delete cache[keys.pop()];
      }
      return cache;
    }
    function cacheGet(id, ttlOk, ttlFail) {
      var cache = cacheReadAll();
      var item = cache[id];
      var ttl;
      if (!item) return null;
      ttl = item.ok ? ttlOk : ttlFail;
      if (Date.now() - item.saved_at > ttl) {
        delete cache[id];
        cacheWriteAll(cache);
        return null;
      }
      item.source = "cache";
      return item;
    }
    function cacheSet(id, payload, ok, ttl) {
      var cache = cacheReadAll();
      cache[id] = {
        kp: payload && typeof payload.kp === "number" ? payload.kp : null,
        imdb: payload && typeof payload.imdb === "number" ? payload.imdb : null,
        ok: !!ok,
        source: payload && payload.source ? payload.source : "fallback",
        saved_at: Date.now(),
        ttl: ttl
      };
      cacheTrim(cache);
      cacheWriteAll(cache);
      return cache[id];
    }
    function css() {
      if (document.getElementById(CSS_ID)) return;
      var style = document.createElement("style");
      style.id = CSS_ID;
      style.type = "text/css";
      style.textContent = '.cine-score{display:flex;flex-wrap:wrap;gap:12px;margin:18px 0 0;align-items:stretch;}.cine-score--compact{gap:8px;}.cine-score__item{min-width:114px;display:flex;flex-direction:column;justify-content:center;padding:14px 16px;border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,.04));box-shadow:0 14px 30px rgba(0,0,0,.16);border:1px solid rgba(255,255,255,.07);backdrop-filter:blur(18px);}.cine-score--compact .cine-score__item{min-width:98px;padding:10px 12px;border-radius:14px;}.cine-score__item[data-tone="good"]{background:linear-gradient(180deg,rgba(51,182,112,.24),rgba(17,83,54,.18));border-color:rgba(64,204,129,.34);}.cine-score__item[data-tone="mid"]{background:linear-gradient(180deg,rgba(236,180,68,.22),rgba(130,92,22,.18));border-color:rgba(246,199,90,.28);}.cine-score__item[data-tone="bad"]{background:linear-gradient(180deg,rgba(233,94,94,.22),rgba(116,34,34,.18));border-color:rgba(236,112,112,.26);}.cine-score__item[data-tone="muted"]{opacity:.88;}.cine-score__top{display:flex;align-items:center;justify-content:space-between;gap:10px;}.cine-score__label{font-size:0.85em;text-transform:uppercase;letter-spacing:.14em;opacity:.75;}.cine-score__value{font-size:2.1em;font-weight:700;line-height:1;margin-top:8px;}.cine-score--compact .cine-score__value{font-size:1.7em;margin-top:6px;}.cine-score__meta{margin-top:8px;font-size:.88em;opacity:.74;}.cine-score__item.is-loading .cine-score__value{opacity:.45;}.cine-score__actions{display:flex;align-items:center;gap:10px;}.cine-score__refresh{display:inline-flex;align-items:center;gap:8px;height:44px;padding:0 16px;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.06);cursor:pointer;}.cine-score__refresh svg{width:16px;height:16px;}.cine-score__refresh:empty{display:none;}.cine-score__refresh.loading svg{animation:cine-score-spin 1s linear infinite;}.cine-score__refresh.focus,.cine-score__refresh.hover{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.22);}.cine-score__foot{width:100%;display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:.92em;opacity:.8;}.cine-score__status{padding:8px 12px;border-radius:12px;background:rgba(255,255,255,.05);}.cine-score__status[data-kind="ok"]{color:#70db98;}.cine-score__status[data-kind="fail"]{color:#ff9a9a;}.cine-score__stamp{opacity:.68;}.cine-score__item.is-pop{animation:cine-score-rise .35s ease;}@keyframes cine-score-spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}@keyframes cine-score-rise{0%{transform:translateY(8px);opacity:.5;}100%{transform:none;opacity:1;}}';
      document.head.appendChild(style);
    }
    function addSettings() {
      if (!Lampa.SettingsApi || !Lampa.SettingsApi.addComponent || !Lampa.SettingsApi.addParam) return;
      try {
        Lampa.SettingsApi.addComponent({
          component: SETTINGS_COMPONENT,
          name: "CineScore",
          icon: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.8"/><path d="M7 15.5 10.5 12 13 14.5 17 9.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        });
      } catch (e) {
      }
      addParam("enabled", "Включить", "Показывать панель рейтингов в полной карточке.", "trigger");
      addParam("showImdb", "Показывать IMDb", "Оставлять рейтинг IMDb в панели.", "trigger");
      addParam("showKp", "Показывать Кинопоиск", "Оставлять рейтинг Кинопоиска в панели.", "trigger");
      addParam("showSource", "Показывать источник", "Показывать источник и время обновления.", "trigger");
      addParam("compact", "Компактный режим", "Более плотная карточка рейтингов.", "trigger");
      addParam("animation", "Анимация обновления", "Подсвечивать новые значения после загрузки.", "trigger");
      try {
        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: {
            name: keyMap.ttlOk,
            type: "select",
            values: {
              "3600000": "1 час",
              "21600000": "6 часов",
              "43200000": "12 часов",
              "86400000": "24 часа",
              "172800000": "48 часов"
            },
            default: defaults.ttlOk
          },
          field: {
            name: "Кэш успешных ответов",
            description: "Сколько хранить актуальные данные."
          },
          onChange: function(value) {
            write(keyMap.ttlOk, String(value || defaults.ttlOk));
          }
        });
      } catch (e2) {
      }
      try {
        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: {
            name: keyMap.ttlFail,
            type: "select",
            values: {
              "300000": "5 минут",
              "900000": "15 минут",
              "1800000": "30 минут",
              "3600000": "1 час"
            },
            default: defaults.ttlFail
          },
          field: {
            name: "Кэш ошибок",
            description: "Сколько ждать перед новой попыткой после неудачи."
          },
          onChange: function(value) {
            write(keyMap.ttlFail, String(value || defaults.ttlFail));
          }
        });
      } catch (e3) {
      }
      try {
        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: {
            name: "cine_score_version",
            type: "static"
          },
          field: {
            name: "Версия",
            description: (Lampa.Manifest && Lampa.Manifest.name ? Lampa.Manifest.name : "CineScore") + " " + (Lampa.Manifest && Lampa.Manifest.version ? Lampa.Manifest.version : "3.0.0")
          }
        });
      } catch (e4) {
      }
    }
    function addParam(name, title, description, type) {
      try {
        Lampa.SettingsApi.addParam({
          component: SETTINGS_COMPONENT,
          param: {
            name: keyMap[name],
            type: type || "trigger",
            default: defaults[name]
          },
          field: {
            name: title,
            description: description
          },
          onChange: function(value) {
            write(keyMap[name], type === "trigger" ? !!value : value);
          }
        });
      } catch (e) {
      }
    }
    function createRequest() {
      return new Lampa.Reguest();
    }
    function decodeSecret(input, password) {
      var result = "";
      var hash;
      var index = 0;
      if (!input || !password) return result;
      hash = salt("123456789" + password);
      while (hash.length < input.length) hash += hash;
      while (index < input.length) {
        result += String.fromCharCode(input[index] ^ hash.charCodeAt(index));
        index++;
      }
      return result;
    }
    function salt(input) {
      var hash = 0;
      var i;
      var result = "";
      var left;
      var right;
      var code;
      for (i = 0; i < input.length; i++) {
        code = input.charCodeAt(i);
        hash = (hash << 5) - hash + code;
        hash = hash & hash;
      }
      for (left = 0, right = 29; right >= 0; left += 3, right -= 3) {
        code = ((hash >>> left & 7) << 3) + (hash >>> right & 7);
        result += String.fromCharCode(code < 26 ? 97 + code : code < 52 ? 39 + code : code - 4);
      }
      return result;
    }
    function normalizedTitle(value) {
      return String(value || "").toLowerCase().replace(/[\u0401]/g, "е").replace(/[^\w\u0400-\u04ff]+/g, " ").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
    }
    function includesTitle(left, right) {
      var a = normalizedTitle(left);
      var b = normalizedTitle(right);
      if (!a || !b) return false;
      return a.indexOf(b) !== -1 || b.indexOf(a) !== -1;
    }
    function extractYear(movie) {
      var value = movie.release_date || movie.first_air_date || movie.last_air_date || movie.year || "";
      value = String(value);
      if (value.length >= 4) return parseInt(value.slice(0, 4), 10);
      return 0;
    }
    function requestJson(url, headers, onSuccess, onError, timeout) {
      var network = createRequest();
      network.clear();
      network.timeout(timeout || 6e3);
      network.silent(url, function(json) {
        onSuccess(json);
      }, function() {
        onError();
      }, false, headers ? { headers: headers } : void 0);
    }
    function requestText(url, onSuccess, onError, timeout) {
      var network = createRequest();
      network.clear();
      network.timeout(timeout || 4e3);
      network["native"](url, function(text) {
        onSuccess(text);
      }, function() {
        onError();
      });
    }
    function parseXml(text) {
      var parser;
      var doc;
      var kpNode;
      var imdbNode;
      var kp;
      var imdb;
      if (!text || text.indexOf("<rating>") === -1) return null;
      try {
        parser = new DOMParser();
        doc = parser.parseFromString(text, "text/xml");
        kpNode = doc.getElementsByTagName("kp_rating");
        imdbNode = doc.getElementsByTagName("imdb_rating");
        kp = kpNode && kpNode[0] ? clampRating(kpNode[0].textContent) : null;
        imdb = imdbNode && imdbNode[0] ? clampRating(imdbNode[0].textContent) : null;
        if (kp === null && imdb === null) return null;
        return { kp: kp, imdb: imdb, source: "xml" };
      } catch (e) {
      }
      return null;
    }
    function chooseCandidate(items, movie) {
      var year = extractYear(movie);
      var imdbId = movie.imdb_id || movie.imdbId;
      var original = movie.original_title || movie.original_name || "";
      var title = movie.title || movie.name || "";
      var scored = [];
      var i;
      var item;
      var score;
      var itemTitle;
      var itemOriginal;
      var itemYear;
      for (i = 0; i < items.length; i++) {
        item = items[i];
        itemTitle = item.nameRu || item.title || item.ru_title || "";
        itemOriginal = item.nameOriginal || item.orig_title || item.nameEn || item.en_title || "";
        itemYear = parseInt(String(item.year || item.startYear || item.start_date || "").slice(0, 4), 10) || 0;
        score = 0;
        if (imdbId && (item.imdbId === imdbId || item.imdb_id === imdbId)) score += 10;
        if (includesTitle(itemTitle, title)) score += 5;
        if (includesTitle(itemOriginal, original)) score += 5;
        if (year && itemYear && itemYear === year) score += 4;
        if (year && itemYear && Math.abs(itemYear - year) === 1) score += 2;
        scored.push({ item: item, score: score });
      }
      scored.sort(function(left, right) {
        return right.score - left.score;
      });
      if (!scored.length || scored[0].score < 4) return null;
      return scored[0].item;
    }
    function findKinopoiskId(movie, done, fail) {
      var title = movie.title || movie.name || movie.original_title || movie.original_name || "";
      var imdbId = movie.imdb_id || movie.imdbId;
      var apiRoot = "https://kinopoiskapiunofficial.tech/";
      var headers = {
        "X-API-KEY": decodeSecret(
          [85, 4, 115, 118, 107, 125, 10, 70, 85, 67, 82, 14, 32, 110, 102, 43, 9, 19, 85, 73, 4, 83, 33, 110, 52, 44, 92, 21, 72, 22, 87, 1, 118, 32, 100, 127],
          atob("X0tQM3Bhc3N3b3Jk")
        )
      };
      var searchUrl = Lampa.Utils.addUrlComponent(apiRoot + "api/v2.1/films/search-by-keyword", "keyword=" + encodeURIComponent(title));
      function resolveFromItems(json) {
        var list = json && json.items && json.items.length ? json.items : json && json.films && json.films.length ? json.films : [];
        var selected = chooseCandidate(list, movie);
        var kpId = selected && (selected.kinopoiskId || selected.kinopoisk_id || selected.kp_id || selected.filmId);
        if (kpId) done({ kpId: kpId, headers: headers, apiRoot: apiRoot });
        else fail();
      }
      if (imdbId) {
        requestJson(Lampa.Utils.addUrlComponent(apiRoot + "api/v2.2/films", "imdbId=" + encodeURIComponent(imdbId)), headers, function(json) {
          var list = json && json.items && json.items.length ? json.items : [];
          var selected = chooseCandidate(list, movie);
          var kpId = selected && (selected.kinopoiskId || selected.kinopoisk_id || selected.kp_id || selected.filmId);
          if (kpId) done({ kpId: kpId, headers: headers, apiRoot: apiRoot });
          else requestJson(searchUrl, headers, resolveFromItems, fail, 6e3);
        }, function() {
          requestJson(searchUrl, headers, resolveFromItems, fail, 6e3);
        }, 6e3);
      } else {
        requestJson(searchUrl, headers, resolveFromItems, fail, 6e3);
      }
    }
    function fetchRatings(movie, done, fail) {
      findKinopoiskId(movie, function(meta) {
        requestText("https://rating.kinopoisk.ru/" + meta.kpId + ".xml", function(text) {
          var parsed = parseXml(text);
          if (parsed) {
            done(parsed);
            return;
          }
          requestJson(meta.apiRoot + "api/v2.2/films/" + meta.kpId, meta.headers, function(json) {
            var kp = clampRating(json && (json.ratingKinopoisk || json.ratingKinopoiskVoteCount && json.ratingKinopoisk));
            var imdb = clampRating(json && (json.ratingImdb || json.ratingImdbVoteCount && json.ratingImdb));
            if (kp === null && imdb === null) {
              fail();
              return;
            }
            done({
              kp: kp,
              imdb: imdb,
              source: "api"
            });
          }, fail, 5e3);
        }, function() {
          requestJson(meta.apiRoot + "api/v2.2/films/" + meta.kpId, meta.headers, function(json) {
            var kp = clampRating(json && json.ratingKinopoisk);
            var imdb = clampRating(json && json.ratingImdb);
            if (kp === null && imdb === null) {
              fail();
              return;
            }
            done({
              kp: kp,
              imdb: imdb,
              source: "api"
            });
          }, fail, 5e3);
        }, 3500);
      }, fail);
    }
    function fallbackRatings(movie) {
      var kp = clampRating(movie && (movie.kp_rating || movie.kinopoisk_rating || movie.rating_kp));
      var imdb = clampRating(movie && (movie.imdb_rating || movie.rating_imdb));
      if (kp === null && imdb === null) return null;
      return {
        kp: kp,
        imdb: imdb,
        source: "fallback"
      };
    }
    function rootTarget(root) {
      var selectors = [
        ".full-start-new__rate-line",
        ".full-start__rate-line",
        ".full-start-new__details",
        ".full-start__details",
        ".full-start-new__right",
        ".full-start__right",
        ".full-start-new__head",
        ".full-start__head",
        ".full-start-new__body",
        ".full-start__body",
        ".full-start-new",
        ".full-start"
      ];
      var i;
      var holder = $();
      for (i = 0; i < selectors.length; i++) {
        holder = root.find(selectors[i]).eq(0);
        if (holder.length) return holder;
      }
      return holder;
    }
    function createPanel(root, config) {
      var block = root.find(".cine-score");
      var target;
      var html;
      if (block.length) return block;
      target = rootTarget(root);
      if (!target.length) target = root;
      if (!target.length) return $();
      html = '<div class="cine-score' + (config.compact ? " cine-score--compact" : "") + '"><div class="cine-score__item" data-key="kp"><div class="cine-score__top"><div class="cine-score__label">KP</div></div><div class="cine-score__value">—</div><div class="cine-score__meta">Кинопоиск</div></div><div class="cine-score__item" data-key="imdb"><div class="cine-score__top"><div class="cine-score__label">IMDb</div></div><div class="cine-score__value">—</div><div class="cine-score__meta">Internet Movie Database</div></div><div class="cine-score__foot"><div class="cine-score__status" data-role="status" data-kind="ok">Загрузка рейтингов</div><div class="cine-score__actions"><div class="cine-score__stamp" data-role="stamp"></div><div class="cine-score__refresh selector" data-role="refresh"><svg viewBox="0 0 24 24" fill="none"><path d="M20 12a8 8 0 1 1-2.34-5.66" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M20 4v5h-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Обновить</span></div></div></div></div>';
      block = $(html);
      if (target.hasClass("full-start-new__rate-line") || target.hasClass("full-start__rate-line")) target.after(block);
      else target.prepend(block);
      return block;
    }
    function markLoading(panel, config) {
      panel.toggleClass("cine-score--compact", !!config.compact);
      panel.find(".cine-score__item").addClass("is-loading").attr("data-tone", "muted");
      panel.find('[data-role="status"]').text("Получаем данные").attr("data-kind", "ok");
      panel.find('[data-role="stamp"]').text("");
      panel.find('[data-role="refresh"]').addClass("loading");
    }
    function applyVisibility(panel, config) {
      panel.find('[data-key="kp"]').toggle(!!config.showKp);
      panel.find('[data-key="imdb"]').toggle(!!config.showImdb);
    }
    function updateNativeRates(root, payload, config) {
      var kpNode = root.find(".rate--kp > div").eq(0);
      var imdbNode = root.find(".rate--imdb > div").eq(0);
      if (config.showKp && kpNode.length) kpNode.text(formatRating(payload.kp));
      if (config.showImdb && imdbNode.length) imdbNode.text(formatRating(payload.imdb));
    }
    function renderPanel(root, movie, payload, config, fromRefresh) {
      var panel = createPanel(root, config);
      var stamp = /* @__PURE__ */ new Date();
      var kpBlock;
      var imdbBlock;
      var status;
      var refresh;
      if (!panel.length) return;
      applyVisibility(panel, config);
      kpBlock = panel.find('[data-key="kp"]');
      imdbBlock = panel.find('[data-key="imdb"]');
      status = panel.find('[data-role="status"]');
      refresh = panel.find('[data-role="refresh"]');
      kpBlock.removeClass("is-loading");
      imdbBlock.removeClass("is-loading");
      refresh.removeClass("loading");
      kpBlock.attr("data-tone", ratingTone(payload.kp)).find(".cine-score__value").text(formatRating(payload.kp));
      imdbBlock.attr("data-tone", ratingTone(payload.imdb)).find(".cine-score__value").text(formatRating(payload.imdb));
      if (config.animation) {
        kpBlock.removeClass("is-pop");
        imdbBlock.removeClass("is-pop");
        void kpBlock.get(0).offsetWidth;
        kpBlock.addClass("is-pop");
        imdbBlock.addClass("is-pop");
      }
      if (config.showSource) {
        panel.find('[data-role="stamp"]').text(sourceLabel(payload.source || "fallback") + " • " + two(stamp.getHours()) + ":" + two(stamp.getMinutes()));
      } else {
        panel.find('[data-role="stamp"]').text("");
      }
      status.text(payload.ok === false ? "Не удалось получить свежие данные" : "Рейтинги обновлены").attr("data-kind", payload.ok === false ? "fail" : "ok");
      updateNativeRates(root, payload, config);
      if (fromRefresh) notify("Рейтинги обновлены");
    }
    function two(value) {
      return value < 10 ? "0" + value : String(value);
    }
    function attachRefresh(root, movie, token) {
      root.find('.cine-score [data-role="refresh"]').off("hover:enter").on("hover:enter", function() {
        loadForCard(movie, root, true, token);
      });
    }
    function safeToRender(movie, token) {
      var current = activeMovieId();
      if (!movie || !movie.id) return false;
      if (current && current !== movie.id) return false;
      if (cardTokens[movie.id] && cardTokens[movie.id] !== token) return false;
      return true;
    }
    function loadForCard(movie, root, force, token) {
      var config = settings();
      var cached;
      if (!movie || !movie.id || !root || !root.length) return;
      if (!config.enabled) return;
      if (!config.showKp && !config.showImdb) return;
      applyVisibility(createPanel(root, config), config);
      markLoading(root.find(".cine-score"), config);
      attachRefresh(root, movie, token);
      if (!force) {
        cached = cacheGet(movie.id, config.ttlOk, config.ttlFail);
        if (cached && safeToRender(movie, token)) {
          renderPanel(root, movie, cached, config, false);
          return;
        }
      }
      if (inflight[movie.id] && !force) return;
      inflight[movie.id] = true;
      fetchRatings(movie, function(payload) {
        var saved = cacheSet(movie.id, payload, true, config.ttlOk);
        delete inflight[movie.id];
        if (!safeToRender(movie, token)) return;
        renderPanel(root, movie, saved, config, !!force);
      }, function() {
        var fallback = fallbackRatings(movie);
        var saved;
        delete inflight[movie.id];
        if (fallback) {
          saved = cacheSet(movie.id, fallback, true, config.ttlFail);
        } else {
          saved = cacheSet(movie.id, { kp: null, imdb: null, source: "fallback" }, false, config.ttlFail);
        }
        if (!safeToRender(movie, token)) return;
        renderPanel(root, movie, saved, config, false);
      });
    }
    function onFull(event) {
      var activity;
      var root;
      var movie;
      var token;
      if (!event || event.type !== "complite" || !event.object || !event.object.activity || !event.object.activity.render) return;
      activity = event.object.activity;
      root = $(activity.render());
      movie = activity.data && activity.data.movie ? activity.data.movie : null;
      if (!movie || !movie.id || !root.length) return;
      token = String(Date.now()) + "_" + String(movie.id);
      cardTokens[movie.id] = token;
      loadForCard(movie, root, false, token);
    }
    function pluginCard() {
      if (!Lampa.Plugin || !Lampa.Plugin.create) return;
      try {
        Lampa.Plugin.create(PLUGIN_ID, {
          title: Lampa.Manifest && Lampa.Manifest.name ? Lampa.Manifest.name : "CineScore",
          desc: Lampa.Manifest && Lampa.Manifest.description ? Lampa.Manifest.description : "KP и IMDb в полной карточке"
        });
      } catch (e) {
      }
    }
    function init() {
      if (booted) return;
      booted = true;
      ensureDefaults();
      css();
      addSettings();
      pluginCard();
      Lampa.Listener.follow("full", onFull);
    }
    if (window.appready) init();
    else Lampa.Listener.follow("app", init);
  })();
})();
