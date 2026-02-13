/***********************
 * LME PubTorr / Parsers Catalog
 * Safe (no async/await, no Object.values)
 ***********************/

// ✅ Manifest (для автора/иконки в списке плагинов) — ставь самым первым
try {
  if (typeof Lampa !== 'undefined') {
    Lampa.Manifest = {
      type: 'plugin',
      name: 'LME PubTorr',
      description: 'Каталог парсеров + проверка доступности (Jackett / Prowlarr).',
      version: '1.0.1-prod',
      author: 'jefrexon',
      icon:
        '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
          '<path d="M4 6.5C4 5.119 5.119 4 6.5 4h11C18.881 4 20 5.119 20 6.5v11c0 1.381-1.119 2.5-2.5 2.5h-11C5.119 20 4 18.881 4 17.5v-11Z" stroke="currentColor" stroke-width="2"/>' +
          '<path d="M7 16l4-4 3 3 3-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<circle cx="17" cy="9" r="1.3" fill="currentColor"/>' +
        '</svg>'
    };
  }
} catch (e) {}

(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (typeof Lampa === 'undefined') return;
  if (typeof $ === 'undefined') return;

  /** =========================
   *  Meta
   *  ========================= */
  var PUBTORR_VERSION = (Lampa.Manifest && Lampa.Manifest.version) ? Lampa.Manifest.version : '1.0.1-prod';
  var PUBTORR_BUILD = '2026-02-13';

  /** =========================
   *  i18n
   *  ========================= */
  function translate() {
    try {
      Lampa.Lang.add({
        lme_parser: { ru: 'Каталог парсеров', en: 'Parsers catalog', uk: 'Каталог парсерів', zh: '解析器目录' },
        lme_parser_description: { ru: 'Нажмите для выбора парсера из', en: 'Click to select a parser from', uk: 'Натисніть для вибору парсера з', zh: '单击以从可用的' },
        lme_parser_current: { ru: 'Текущий выбор:', en: 'Current selection:', uk: 'Поточний вибір:', zh: '当前选择：' },
        lme_parser_selected: { ru: 'Выбрано', en: 'Selected', uk: 'Обрано', zh: '已选择' },
        lme_parser_refresh: { ru: 'Обновить проверку', en: 'Refresh check', uk: 'Оновити перевірку', zh: '刷新检测' },
        lme_parser_none: { ru: 'Не выбран', en: 'Not selected', uk: 'Не вибрано', zh: '未选择' },
        lme_parser_health: { ru: 'Индикация состояния парсеров', en: 'Parser health indicator', uk: 'Індикація стану парсерів', zh: '解析器状态指示' },
        lme_parser_status_ok: { ru: 'Доступен', en: 'Available', uk: 'Доступний', zh: '可用' },
        lme_parser_status_auth: { ru: 'Ошибка ключа', en: 'Auth error', uk: 'Помилка ключа', zh: '密钥错误' },
        lme_parser_status_network: { ru: 'Недоступен', en: 'Unavailable', uk: 'Недоступний', zh: '不可用' },
        lme_parser_status_unknown: { ru: 'Не проверен', en: 'Unchecked', uk: 'Не перевірено', zh: '未检查' },
        lme_parser_status_checking: { ru: 'Проверка', en: 'Checking', uk: 'Перевірка', zh: '检查中' },
        lme_parser_lastcheck: { ru: 'Последняя проверка:', en: 'Last check:', uk: 'Остання перевірка:', zh: '上次检查：' },
        lme_parser_version: { ru: 'Версия:', en: 'Version:', uk: 'Версія:', zh: '版本：' },

        lme_pubtorr: { ru: 'Каталог TorrServer', en: 'TorrServer catalog', uk: 'Каталог TorrServer', zh: 'TorrServer 目录' },
        lme_pubtorr_description: { ru: 'Бесплатные серверы от проекта LME', en: 'Free servers from the LME project', uk: 'Безкоштовні сервери від проєкту LME', zh: '来自 LME 项目的免费服务器' }
      });
    } catch (e) {}
  }

  /** =========================
   *  Parsers list
   *  ========================= */
  var parsersInfo = [
    { id: 'lampa_app', name: 'Lampa.app', settings: { url: 'lampa.app', key: '', parser_torrent_type: 'jackett' } },
    { id: 'jacred_viewbox_dev', name: 'Viewbox', settings: { url: 'jacred.viewbox.dev', key: 'viewbox', parser_torrent_type: 'jackett' } },
    { id: 'jackett_ip_188_119_113_252', name: 'Jackett (188.119.113.252)', settings: { url: '188.119.113.252:9117', key: '1', parser_torrent_type: 'jackett' } },
    { id: 'trs_my_to', name: 'Trs.my.to', settings: { url: 'trs.my.to:9118', key: '', parser_torrent_type: 'jackett' } },
    { id: 'jacred_my_to', name: 'Jacred.my.to', settings: { url: 'jacred.my.to', key: '', parser_torrent_type: 'jackett' } },
    { id: 'jacred_xyz', name: 'Jacred.xyz', settings: { url: 'jacred.xyz', key: '', parser_torrent_type: 'jackett' } },
    { id: 'jacred_pro', name: 'Jacred.pro', settings: { url: 'jacred.pro', key: '', parser_torrent_type: 'jackett' } },
    { id: 'jac_red_ru', name: 'jac-red.ru', settings: { url: 'jac-red.ru', key: '', parser_torrent_type: 'jackett' } }
  ];

  /** =========================
   *  Constants & flags
   *  ========================= */
  var STATUS = { ok: 'ok', authError: 'auth_error', networkError: 'network_error', unknown: 'unknown', checking: 'checking' };

  var STORAGE_KEY = 'lme_url_two';
  var HEALTH_KEY = 'lme_parser_health';
  var NO_PARSER_ID = 'no_parser';

  // прод настройки
  var CACHE_TTL = 10 * 60 * 1000;        // 10 минут
  var AJAX_TIMEOUT = 5500;               // чуть больше 5с
  var CONCURRENCY = 3;                   // ограничение параллельности
  var RETRY_COUNT = 1;                   // 1 повтор
  var RETRY_DELAY_MS = 900;              // задержка
  var SWR_WINDOW = 60 * 1000;            // stale-while-revalidate окно

  var DEBUG_KEY = 'pubtorr_debug';

  function debugEnabled() {
    try { return !!Lampa.Storage.get(DEBUG_KEY, false); } catch (e) { return false; }
  }
  function log() {
    if (!debugEnabled()) return;
    try { console.log.apply(console, arguments); } catch (e) {}
  }
  function warn() {
    try { console.warn.apply(console, arguments); } catch (e) {}
  }

  var STATUS_CLASS = {};
  STATUS_CLASS[STATUS.ok] = 'status-ok';
  STATUS_CLASS[STATUS.authError] = 'status-auth-error';
  STATUS_CLASS[STATUS.networkError] = 'status-network-error';
  STATUS_CLASS[STATUS.unknown] = 'status-unknown';
  STATUS_CLASS[STATUS.checking] = 'status-checking';

  function safeTrim(s) { return (s || '').toString().trim(); }

  function getProtocol() {
    try {
      if (Lampa.Utils && typeof Lampa.Utils.protocol === 'function') return Lampa.Utils.protocol();
    } catch (e) {}
    return (location.protocol === 'https:') ? 'https://' : 'http://';
  }

  function normalizeBaseUrl(raw) {
    var url = safeTrim(raw);
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url.replace(/\/+$/, '');
    return (getProtocol() + url).replace(/\/+$/, '');
  }

  function encodeQuery(v) {
    try { return encodeURIComponent(v || ''); } catch (e) { return ''; }
  }

  /** =========================
   *  Endpoints fallback (safe)
   *  ========================= */
  function getHealthPaths(parserType) {
    // Prowlarr: API health/status (нужен apikey)
    if (parserType === 'prowlarr') {
      return [
        { path: '/api/v1/health', needKey: true },
        { path: '/api/v1/system/status', needKey: true }
      ];
    }
    // Jackett: UI ping без ключа (самый совместимый)
    // (если CORS/SSL мешает — статус может быть unknown/network, но это лучше, чем "вечно недоступен" из-за неверного API)
    return [
      { path: '/', needKey: false },
      { path: '/UI/Dashboard', needKey: false }
    ];
  }

  function getApiKey(parser) {
    var settings = (parser && parser.settings) || {};
    var parserType = settings.parser_torrent_type || 'jackett';
    if (parserType === 'prowlarr') return settings.key || '';
    // спец-кейс как у старых конфигов (оставим, но для jackett он обычно не нужен для UI ping)
    if (settings.url === 'spawn.pp.ua:59117') return '2';
    return settings.key || '';
  }

  function buildUrls(parser) {
    if (!parser || !parser.settings) return [];
    var settings = parser.settings;
    var base = normalizeBaseUrl(settings.url);
    if (!base) return [];
    var parserType = settings.parser_torrent_type || 'jackett';
    var apiKey = getApiKey(parser);
    var paths = getHealthPaths(parserType);
    var out = [];

    for (var i = 0; i < paths.length; i++) {
      var p = paths[i];
      if (p.needKey) out.push(base + p.path + '?apikey=' + encodeQuery(apiKey));
      else out.push(base + p.path);
    }
    return out;
  }

  function statusFromXhr(xhr) {
    if (!xhr) return STATUS.networkError;

    // 0 — часто CORS/blocked. Это не равно "сервер умер".
    if (xhr.status === 0) return STATUS.unknown;

    if (xhr.status === 200) return STATUS.ok;

    // auth
    if (xhr.status === 401 || xhr.status === 403) return STATUS.authError;

    // 404 — сервер жив, путь не тот
    if (xhr.status === 404) return STATUS.unknown;

    return STATUS.networkError;
  }

  /** =========================
   *  Cache (with SWR)
   *  ========================= */
  var cache = {
    data: {},
    get: function (key) {
      var c = this.data[key];
      if (!c) return null;
      if (Date.now() > c.expiresAt) return null;
      return c;
    },
    set: function (key, status) {
      this.data[key] = {
        status: status,
        updatedAt: Date.now(),
        expiresAt: Date.now() + CACHE_TTL
      };
    }
  };

  function cacheKey(parserId, url) {
    return (parserId || 'unknown') + '::' + (url || '');
  }

  /** =========================
   *  Simple concurrency limiter
   *  ========================= */
  function runPool(tasks, limit) {
    limit = Math.max(1, limit || 1);
    var i = 0, active = 0;
    var results = [];
    return new Promise(function (resolve) {
      function next() {
        while (active < limit && i < tasks.length) {
          (function (idx) {
            active++;
            Promise.resolve().then(tasks[idx])
              .then(function (r) { results[idx] = r; })
              .catch(function (e) { results[idx] = e; })
              .finally(function () { active--; next(); });
          })(i);
          i++;
        }
        if (i >= tasks.length && active === 0) resolve(results);
      }
      next();
    });
  }

  /** =========================
   *  Network: request with retries & fallback urls (NO async/await)
   *  ========================= */
  function ajaxOnce(url) {
    return new Promise(function (resolve) {
      $.ajax({
        url: url,
        method: 'GET',
        timeout: AJAX_TIMEOUT,
        success: function (_resp, _text, xhr) { resolve({ ok: true, xhr: xhr }); },
        error: function (xhr) { resolve({ ok: false, xhr: xhr }); }
      });
    });
  }

  function delay(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  function requestWithFallback(urls) {
    // urls: [primary, fallback1, ...]
    var index = 0;

    function tryUrl(u) {
      var attempt = 0;

      function oneAttempt() {
        return ajaxOnce(u).then(function (res) {
          var st = statusFromXhr(res.xhr);

          // ok/auth — финал
          if (st === STATUS.ok || st === STATUS.authError) {
            return { status: st, usedUrl: u };
          }

          // network/unknown — retry
          if (attempt < RETRY_COUNT) {
            attempt++;
            return delay(RETRY_DELAY_MS + (attempt * 250)).then(oneAttempt);
          }

          // fail -> next url
          return null;
        });
      }

      return oneAttempt();
    }

    function nextUrl() {
      if (index >= urls.length) {
        return Promise.resolve({ status: STATUS.networkError, usedUrl: urls[0] || '' });
      }
      var u = urls[index++];
      return tryUrl(u).then(function (res) {
        if (res) return res;
        return nextUrl();
      });
    }

    return nextUrl();
  }

  /** =========================
   *  Check alive (prod)
   *  ========================= */
  var currentCheckToken = 0;

  function checkAlive(parsers) {
    if (!Array.isArray(parsers) || !parsers.length) return Promise.resolve({});

    var token = ++currentCheckToken;
    var results = {};

    var tasks = parsers.map(function (parser) {
      return function () {
        var parserId = parser.id || parser.name || 'unknown';
        var urls = buildUrls(parser);

        if (!urls.length) {
          results[parserId] = STATUS.unknown;
          return Promise.resolve();
        }

        // SWR key — по primary url
        var primaryKey = cacheKey(parserId, urls[0]);
        var cached = cache.get(primaryKey);

        if (cached) {
          results[parserId] = cached.status;

          // если свежий кеш — не трогаем сеть
          if (Date.now() - cached.updatedAt < SWR_WINDOW) {
            log('[PubTorr] SWR skip network for', parserId);
            return Promise.resolve();
          }
          // иначе — обновим сетью
        }

        return requestWithFallback(urls).then(function (net) {
          if (token !== currentCheckToken) return;

          results[parserId] = net.status;

          // Кэшируем по реально использованному url (чтобы fallback не "врал" первичному)
          if (net.usedUrl) {
            cache.set(cacheKey(parserId, net.usedUrl), net.status);
          }

          // и дополнительно, если это был primary — обновим primaryKey
          if (net.usedUrl === urls[0] && (net.status === STATUS.ok || net.status === STATUS.authError || net.status === STATUS.unknown)) {
            cache.set(primaryKey, net.status);
          }

          log('[PubTorr] check', parserId, '=>', net.status, 'url=', net.usedUrl);
        });
      };
    });

    return runPool(tasks, CONCURRENCY).then(function () { return results; });
  }

  /** =========================
   *  Selection apply
   *  ========================= */
  function getSelectedParserId() {
    try { return Lampa.Storage.get(STORAGE_KEY, NO_PARSER_ID); } catch (e) { return NO_PARSER_ID; }
  }

  function getParserById(parserId) {
    for (var i = 0; i < parsersInfo.length; i++) {
      if (parsersInfo[i].id === parserId) return parsersInfo[i];
    }
    return null;
  }

  function applySelectedParser(parserId) {
    var id = (typeof parserId !== 'undefined') ? parserId : getSelectedParserId();
    if (!id || id === NO_PARSER_ID) return false;

    var selected = getParserById(id);
    if (!selected || !selected.settings) {
      warn('PubTorr: parser not found', id);
      return false;
    }

    var settings = selected.settings;
    var parserType = settings.parser_torrent_type || 'jackett';

    try {
      Lampa.Storage.set(parserType === 'prowlarr' ? 'prowlarr_url' : 'jackett_url', settings.url);
      Lampa.Storage.set(parserType === 'prowlarr' ? 'prowlarr_key' : 'jackett_key', settings.key || '');
      Lampa.Storage.set('parser_torrent_type', parserType);
    } catch (e) {}

    return true;
  }

  /** =========================
   *  UI
   *  ========================= */
  function statusLabel(status) {
    switch (status) {
      case STATUS.ok: return Lampa.Lang.translate('lme_parser_status_ok');
      case STATUS.authError: return Lampa.Lang.translate('lme_parser_status_auth');
      case STATUS.networkError: return Lampa.Lang.translate('lme_parser_status_network');
      case STATUS.checking: return Lampa.Lang.translate('lme_parser_status_checking');
      default: return Lampa.Lang.translate('lme_parser_status_unknown');
    }
  }

  function allStatusClasses() {
    var s = '';
    for (var k in STATUS_CLASS) if (STATUS_CLASS.hasOwnProperty(k)) s += STATUS_CLASS[k] + ' ';
    return safeTrim(s);
  }

  function applyStatus(item, status) {
    var classes = allStatusClasses();
    try { item.removeClass(classes); } catch (e) {}
    item.addClass(STATUS_CLASS[status] || STATUS_CLASS[STATUS.unknown]);
    item.find('.pubtorr-parser-modal__status').text(statusLabel(status));

    // flash on result
    item.removeClass('pubtorr-flash-ok pubtorr-flash-bad');
    if (status === STATUS.ok) {
      item.addClass('pubtorr-flash-ok');
      setTimeout(function () { item.removeClass('pubtorr-flash-ok'); }, 600);
    } else if (status === STATUS.authError || status === STATUS.networkError) {
      item.addClass('pubtorr-flash-bad');
      setTimeout(function () { item.removeClass('pubtorr-flash-bad'); }, 600);
    }
  }

  function applySelection(list, selectedId) {
    list.find('.pubtorr-parser-modal__item').removeClass('is-selected');
    list.find('[data-parser-id="' + selectedId + '"]').addClass('is-selected');
  }

  function buildItem(parser) {
    var html =
      '<div class="pubtorr-parser-modal__item selector status-unknown" data-parser-id="' + parser.id + '">' +
        '<div class="pubtorr-parser-modal__info">' +
          '<div class="pubtorr-parser-modal__name">' + parser.name + '</div>' +
        '</div>' +
        '<div class="pubtorr-parser-modal__status"></div>' +
      '</div>';

    var item = $(html);
    applyStatus(item, STATUS.unknown);
    return item;
  }

  function updateCurrentLabel(wrapper, selectedId, parsers) {
    var current = null;
    for (var i = 0; i < parsers.length; i++) {
      if (parsers[i].id === selectedId) { current = parsers[i]; break; }
    }
    var label = current ? current.name : Lampa.Lang.translate('lme_parser_none');
    wrapper.find('.pubtorr-parser-modal__current-value').text(label);
  }

  function updateSettingsSelectedLabel(selectedId, parsers) {
    var current = null;
    for (var i = 0; i < parsers.length; i++) {
      if (parsers[i].id === selectedId) { current = parsers[i]; break; }
    }
    var label = current ? current.name : Lampa.Lang.translate('lme_parser_none');
    $('.pubtorr-parser-selected').text(Lampa.Lang.translate('lme_parser_selected') + ': ' + label);
  }

  function formatTime(ts) {
    if (!ts) return '—';
    try {
      var d = new Date(ts);
      var hh = ('0' + d.getHours()).slice(-2);
      var mm = ('0' + d.getMinutes()).slice(-2);
      var ss = ('0' + d.getSeconds()).slice(-2);
      return hh + ':' + mm + ':' + ss;
    } catch (e) { return '—'; }
  }

  function openParserModal() {
    var parsers = [{ id: NO_PARSER_ID, name: Lampa.Lang.translate('lme_parser_none') }].concat(parsersInfo.slice());
    var selectedId = getSelectedParserId();

    var modal = $(
      '<div class="pubtorr-parser-modal">' +
        '<div class="pubtorr-parser-modal__head">' +
          '<div class="pubtorr-parser-modal__current">' +
            '<div class="pubtorr-parser-modal__current-label">' + Lampa.Lang.translate('lme_parser_current') + '</div>' +
            '<div class="pubtorr-parser-modal__current-value"></div>' +
          '</div>' +
          '<div class="pubtorr-parser-modal__actions">' +
            '<div class="pubtorr-parser-modal__meta">' +
              '<div class="pubtorr-meta-line">' + Lampa.Lang.translate('lme_parser_version') + ' ' + PUBTORR_VERSION + ' (' + PUBTORR_BUILD + ')</div>' +
              '<div class="pubtorr-meta-line"><span class="pubtorr-lastcheck-label">' + Lampa.Lang.translate('lme_parser_lastcheck') + '</span> <span class="pubtorr-lastcheck-value">—</span></div>' +
            '</div>' +
            '<div class="pubtorr-parser-modal__action selector">' + Lampa.Lang.translate('lme_parser_refresh') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="pubtorr-parser-modal__list"></div>' +
        '<div class="pubtorr-parser-modal__legend">' +
          '<div class="pubtorr-parser-modal__legend-item status-ok">' + Lampa.Lang.translate('lme_parser_status_ok') + '</div>' +
          '<div class="pubtorr-parser-modal__legend-item status-auth-error">' + Lampa.Lang.translate('lme_parser_status_auth') + '</div>' +
          '<div class="pubtorr-parser-modal__legend-item status-network-error">' + Lampa.Lang.translate('lme_parser_status_network') + '</div>' +
          '<div class="pubtorr-parser-modal__legend-item status-unknown">' + Lampa.Lang.translate('lme_parser_status_unknown') + '</div>' +
        '</div>' +
      '</div>'
    );

    var list = modal.find('.pubtorr-parser-modal__list');
    var refreshAction = modal.find('.pubtorr-parser-modal__action');
    var healthEnabled = true;
    try { healthEnabled = Lampa.Storage.get(HEALTH_KEY, true); } catch (e) { healthEnabled = true; }

    parsers.forEach(function (parser) {
      var item = buildItem(parser);

      // оставляем hover:enter как ты хотел (TV UX), но без лишней логики на "no_parser"
      item.on('hover:enter', function () {
        try { Lampa.Storage.set(STORAGE_KEY, parser.id); } catch (e) {}
        applySelection(list, parser.id);
        updateCurrentLabel(modal, parser.id, parsers);
        updateSettingsSelectedLabel(parser.id, parsers);
        if (parser.id !== NO_PARSER_ID) applySelectedParser(parser.id);
      });

      list.append(item);
    });

    applySelection(list, selectedId);
    updateCurrentLabel(modal, selectedId, parsers);
    updateSettingsSelectedLabel(selectedId, parsers);

    var actionable = list.find('.pubtorr-parser-modal__item').first();

    Lampa.Modal.open({
      title: Lampa.Lang.translate('lme_parser'),
      html: modal,
      size: 'medium',
      scroll_to_center: true,
      select: actionable,
      onBack: function () {
        Lampa.Modal.close();
        Lampa.Controller.toggle('settings_component');
      }
    });

    if (!healthEnabled) {
      refreshAction.addClass('hide');
      modal.find('.pubtorr-parser-modal__legend').addClass('hide');
      return;
    }

    var parserItems = list.find('.pubtorr-parser-modal__item').not('[data-parser-id="' + NO_PARSER_ID + '"]');
    var lastCheckNode = modal.find('.pubtorr-lastcheck-value');

    function setChecking() {
      parserItems.each(function () { applyStatus($(this), STATUS.checking); });
    }

    function runChecks() {
      setChecking();

      var startedAt = Date.now();
      checkAlive(parsersInfo).then(function (statusMap) {
        parserItems.each(function () {
          var item = $(this);
          var parserId = item.attr('data-parser-id');
          var st = statusMap[parserId] || STATUS.unknown;
          applyStatus(item, st);
        });
        lastCheckNode.text(formatTime(startedAt));
      });
    }

    refreshAction.on('hover:enter', function () { runChecks(); });
    runChecks();
  }

  /** =========================
   *  Settings integration
   *  ========================= */
  function parserSetting() {
    applySelectedParser();

    // Если сборка поддерживает — добавим компонент (иконка в настройках чтобы не было undefined)
    try {
      if (Lampa.SettingsApi && Lampa.SettingsApi.addComponent) {
        Lampa.SettingsApi.addComponent({
          component: 'pubtorr',
          name: (Lampa.Manifest && Lampa.Manifest.name) ? Lampa.Manifest.name : 'LME PubTorr',
          icon: 'plugin'
        });
      }
    } catch (e) {}

    // Встроим кнопку в стандартный компонент "parser" — как у тебя было
    Lampa.SettingsApi.addParam({
      component: 'parser',
      param: { name: 'lme_parser_manage', type: 'button' },
      field: {
        name: Lampa.Lang.translate('lme_parser'),
        description: Lampa.Lang.translate('lme_parser_description') + ' ' + parsersInfo.length + '<div class="pubtorr-parser-selected"></div>'
      },
      onChange: function () { openParserModal(); },
      onRender: function (item) {
        applySelectedParser();
        var selectedId = getSelectedParserId();
        var current = getParserById(selectedId);
        var label = current ? current.name : Lampa.Lang.translate('lme_parser_none');
        item.find('.pubtorr-parser-selected').text(Lampa.Lang.translate('lme_parser_selected') + ': ' + label);

        setTimeout(function () {
          var parserUse = $('div[data-name="parser_use"]').first();
          if (parserUse.length) item.insertAfter(parserUse);
          try {
            if (Lampa.Storage.field('parser_use')) item.show();
            else item.hide();
          } catch (e) {}
        });
      }
    });

    Lampa.SettingsApi.addParam({
      component: 'parser',
      param: { name: HEALTH_KEY, type: 'trigger', "default": true },
      field: { name: Lampa.Lang.translate('lme_parser_health') },
      onRender: function (item) {
        setTimeout(function () {
          var manage = $('div[data-name="lme_parser_manage"]').first();
          if (manage.length) item.insertAfter(manage);
          try {
            if (Lampa.Storage.field('parser_use')) item.show();
            else item.hide();
          } catch (e) {}
        });
      }
    });

    // Debug toggle (по желанию)
    try {
      Lampa.SettingsApi.addParam({
        component: 'parser',
        param: { name: DEBUG_KEY, type: 'trigger', "default": false },
        field: { name: 'PubTorr Debug', description: 'Логи проверок в console.log' },
        onChange: function (v) {
          try { Lampa.Storage.set(DEBUG_KEY, !!v); } catch (e) {}
        }
      });
    } catch (e) {}
  }

  /** =========================
   *  Styles (modern checking)
   *  ========================= */
  function injectStyles() {
    if (window.__pubtorr_style_injected) return;
    window.__pubtorr_style_injected = true;

    Lampa.Template.add('pubtorr_style', '\
<style>\
.pubtorr-parser-modal{--pubtorr-status-ok:#19c37d;--pubtorr-status-auth:#ff4d4f;--pubtorr-status-network:#ff4d4f;--pubtorr-status-unknown:#8c8c8c;--pubtorr-status-checking:#f5a623;--pubtorr-selected-border:#fff;display:flex;flex-direction:column;gap:1em}\
.pubtorr-parser-modal__head{display:flex;align-items:flex-start;justify-content:space-between;gap:1em}\
.pubtorr-parser-modal__current-label{font-size:.9em;opacity:.7}\
.pubtorr-parser-modal__current-value{font-size:1.1em}\
.pubtorr-parser-modal__actions{display:flex;align-items:flex-start;gap:.8em}\
.pubtorr-parser-modal__meta{display:flex;flex-direction:column;gap:.25em;opacity:.75;font-size:.85em}\
.pubtorr-parser-modal__action{padding:.5em .9em;border-radius:.6em;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2)}\
.pubtorr-parser-modal__action.focus{border-color:var(--pubtorr-selected-border)}\
.pubtorr-parser-modal__list{display:flex;flex-direction:column;gap:.6em}\
.pubtorr-parser-modal__item{position:relative;display:flex;align-items:center;justify-content:space-between;gap:1em;padding:.8em 1em .8em 1.8em;border-radius:.7em;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);overflow:hidden}\
.pubtorr-parser-modal__item::before{content:\'\';position:absolute;left:.8em;top:50%;width:.55em;height:.55em;border-radius:50%;background:var(--pubtorr-status-color,var(--pubtorr-status-unknown));transform:translateY(-50%);box-shadow:0 0 .6em rgba(0,0,0,0.3)}\
.pubtorr-parser-modal__item.is-selected,.pubtorr-parser-modal__item.focus{border-color:var(--pubtorr-selected-border)}\
.pubtorr-parser-modal__info{display:flex;flex-direction:column;gap:.25em;min-width:0}\
.pubtorr-parser-modal__name{font-size:1em}\
.pubtorr-parser-modal__status{font-size:.8em;opacity:.7;text-align:right;align-self:center}\
.pubtorr-parser-modal__legend{display:flex;flex-wrap:wrap;gap:.8em 1.2em;font-size:.85em;opacity:.7}\
.pubtorr-parser-modal__legend-item{position:relative;padding-left:1.2em}\
.pubtorr-parser-modal__legend-item::before{content:\'\';position:absolute;left:0;top:.55em;width:.5em;height:.5em;border-radius:50%;background:var(--pubtorr-status-color,var(--pubtorr-status-unknown))}\
.pubtorr-parser-modal__item.status-ok,.pubtorr-parser-modal__legend-item.status-ok{--pubtorr-status-color:var(--pubtorr-status-ok)}\
.pubtorr-parser-modal__item.status-auth-error,.pubtorr-parser-modal__legend-item.status-auth-error{--pubtorr-status-color:var(--pubtorr-status-auth)}\
.pubtorr-parser-modal__item.status-network-error,.pubtorr-parser-modal__legend-item.status-network-error{--pubtorr-status-color:var(--pubtorr-status-network)}\
.pubtorr-parser-modal__item.status-unknown,.pubtorr-parser-modal__legend-item.status-unknown{--pubtorr-status-color:var(--pubtorr-status-unknown)}\
.pubtorr-parser-modal__item.status-checking{--pubtorr-status-color:var(--pubtorr-status-checking)}\
@media(max-width:600px){.pubtorr-parser-modal__head{flex-direction:column;align-items:flex-start}.pubtorr-parser-modal__actions{width:100%;justify-content:space-between}.pubtorr-parser-modal__item{flex-direction:column;align-items:flex-start}.pubtorr-parser-modal__status{text-align:left}}\
\
@keyframes pubtorrPulse{0%{transform:translateY(-50%) scale(.9);opacity:.55}50%{transform:translateY(-50%) scale(1.12);opacity:1}100%{transform:translateY(-50%) scale(.9);opacity:.55}}\
@keyframes pubtorrShimmer{0%{transform:translateX(-120%);opacity:0}15%{opacity:.9}60%{opacity:.9}100%{transform:translateX(140%);opacity:0}}\
@keyframes pubtorrDotsA{0%{content:\'\'}25%{content:\'.\'}50%{content:\'..\'}75%{content:\'...\'}100%{content:\'\';}}\
.pubtorr-parser-modal__item.status-checking{border-color:rgba(245,166,35,.35)}\
.pubtorr-parser-modal__item.status-checking::before{animation:pubtorrPulse 1.05s ease-in-out infinite;box-shadow:0 0 0 .22em rgba(245,166,35,.16),0 0 .9em rgba(245,166,35,.35)}\
.pubtorr-parser-modal__item.status-checking::after{content:\'\';position:absolute;inset:0;background:linear-gradient(110deg,transparent 0%,rgba(255,255,255,.08) 35%,rgba(255,255,255,.14) 50%,rgba(255,255,255,.08) 65%,transparent 100%);transform:translateX(-120%);animation:pubtorrShimmer 1.1s ease-in-out infinite;pointer-events:none}\
.pubtorr-parser-modal__item.status-checking .pubtorr-parser-modal__status{position:relative;opacity:.85}\
.pubtorr-parser-modal__item.status-checking .pubtorr-parser-modal__status::after{content:\'\';display:inline-block;width:1.2em;margin-left:.15em;text-align:left;opacity:.8;animation:pubtorrDotsA 1.1s steps(1,end) infinite}\
\
@keyframes pubtorrResultFlashOk{0%{box-shadow:0 0 0 rgba(25,195,125,0)}30%{box-shadow:0 0 .9em rgba(25,195,125,.25)}100%{box-shadow:0 0 0 rgba(25,195,125,0)}}\
@keyframes pubtorrResultFlashBad{0%{box-shadow:0 0 0 rgba(255,77,79,0)}30%{box-shadow:0 0 .9em rgba(255,77,79,.22)}100%{box-shadow:0 0 0 rgba(255,77,79,0)}}\
.pubtorr-flash-ok{animation:pubtorrResultFlashOk .55s ease-out}\
.pubtorr-flash-bad{animation:pubtorrResultFlashBad .55s ease-out}\
</style>\
');
    $('body').append(Lampa.Template.get('pubtorr_style', {}, true));
  }

  /** =========================
   *  Boot
   *  ========================= */
  function add() {
    translate();
    injectStyles();
    parserSetting();
  }

  function startPlugin() {
    window.plugin_lmepublictorr_ready = true;

    if (window.appready) add();
    else if (Lampa.Listener && Lampa.Listener.follow) {
      Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') add();
      });
    } else {
      setTimeout(add, 1200);
    }
  }

  if (!window.plugin_lmepublictorr_ready) startPlugin();
})();
