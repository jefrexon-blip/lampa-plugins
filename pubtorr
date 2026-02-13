(function () {
  'use strict';

  /** =========================
   *  i18n
   *  ========================= */
  function translate() {
    Lampa.Lang.add({
      lme_parser: {
        ru: 'Каталог парсеров',
        en: 'Parsers catalog',
        uk: 'Каталог парсерів',
        zh: '解析器目录'
      },
      lme_parser_description: {
        ru: 'Нажмите для выбора парсера из ',
        en: 'Click to select a parser from the ',
        uk: 'Натисніть для вибору парсера з ',
        zh: '单击以从可用的 '
      },
      lme_parser_current: {
        ru: 'Текущий выбор:',
        en: 'Current selection:',
        uk: 'Поточний вибір:',
        zh: '当前选择：'
      },
      lme_parser_selected: {
        ru: 'Выбрано',
        en: 'Selected',
        uk: 'Обрано',
        zh: '已选择'
      },
      lme_parser_refresh: {
        ru: 'Обновить проверку',
        en: 'Refresh check',
        uk: 'Оновити перевірку',
        zh: '刷新检测'
      },
      lme_parser_none: {
        ru: 'Не выбран',
        en: 'Not selected',
        uk: 'Не вибрано',
        zh: '未选择'
      },
      lme_parser_none_description: {
        ru: 'Без активного парсера',
        en: 'No active parser',
        uk: 'Без активного парсера',
        zh: '未启用解析器'
      },
      lme_parser_health: {
        ru: 'Индикация состояния парсеров',
        en: 'Parser health indicator',
        uk: 'Індикація стану парсерів',
        zh: '解析器状态指示'
      },
      lme_parser_status_ok: {
        ru: 'Доступен',
        en: 'Available',
        uk: 'Доступний',
        zh: '可用'
      },
      lme_parser_status_auth: {
        ru: 'Ошибка ключа',
        en: 'Auth error',
        uk: 'Помилка ключа',
        zh: '密钥错误'
      },
      lme_parser_status_network: {
        ru: 'Недоступен',
        en: 'Unavailable',
        uk: 'Недоступний',
        zh: '不可用'
      },
      lme_parser_status_unknown: {
        ru: 'Не проверен',
        en: 'Unchecked',
        uk: 'Не перевірено',
        zh: '未检查'
      },
      lme_parser_status_checking: {
        ru: 'Проверка',
        en: 'Checking',
        uk: 'Перевірка',
        zh: '检查中'
      },

      lme_pubtorr: {
        ru: 'Каталог TorrServer',
        en: 'TorrServer catalog',
        uk: 'Каталог TorrServer',
        zh: 'TorrServer 目录'
      },
      lme_pubtorr_description: {
        ru: 'Бесплатные серверы от проекта LME',
        en: 'Free servers from the LME project',
        uk: 'Безкоштовні сервери від проєкту LME',
        zh: '来自 LME 项目的免费服务器'
      },
      lme_pubtorr_firstrun: {
        ru: "Привет! Ты установил плагин LME PubTorr, учти что если стоит Mods's то в разделе парсеров будет ошибка, которая не влияет на работу. Хочешь избавиться - оставь или LME PubTorr или Mods's.",
        en: "Hello! You have installed the LME PubTorr plugin. Note that if Mods's is enabled, there will be an error in the parsers section that does not affect functionality. If you want to get rid of it, keep either LME PubTorr or Mods's.",
        uk: "Привіт! Ви встановили плагін LME PubTorr, врахуйте, що якщо активовано Mods's, то в розділі парсерів буде помилка, яка не впливає на роботу. Якщо хочете позбутися - залиште або LME PubTorr, або Mods's.",
        zh: "你好！你安装了LME PubTorr插件，请注意，如果启用了Mods's，解析器部分将出现错误，但这不会影响功能。如果你想摆脱它，请保留LME PubTorr或Mods's。"
      }
    });
  }

  var Lang = { translate: translate };

  /** =========================
   *  Parsers list
   *  ========================= */
  var parsersInfo = [
    { id: 'lampa_app', name: 'Lampa.app', settings: { url: 'lampa.app', key: '', parser_torrent_type: 'jackett' } },
    { id: 'jacred_viewbox_dev', name: 'Viewbox', settings: { url: 'jacred.viewbox.dev', key: 'viewbox', parser_torrent_type: 'jackett' } },
    { id: 'unknown', name: 'Unknown', settings: { url: '188.119.113.252:9117', key: '1', parser_torrent_type: 'jackett' } },
    { id: 'trs_my_to', name: 'Trs.my.to', settings: { url: 'trs.my.to:9118', key: '', parser_torrent_type: 'jackett' } },
    { id: 'jacred_my_to', name: 'Jacred.my.to', settings: { url: 'jacred.my.to', key: '', parser_torrent_type: 'jackett' } },
    { id: 'jacred_xyz', name: 'Jacred.xyz', settings: { url: 'jacred.xyz', key: '', parser_torrent_type: 'jackett' } },
    { id: 'jacred_pro', name: 'Jacred.pro', settings: { url: 'jacred.pro', key: '', parser_torrent_type: 'jackett' } },
    { id: 'jac_red_ru', name: 'jac-red.ru', settings: { url: 'jac-red.ru', key: '', parser_torrent_type: 'jackett' } }
  ];

  /** =========================
   *  Constants & helpers
   *  ========================= */
  var STATUS = {
    ok: 'ok',
    authError: 'auth_error',
    networkError: 'network_error',
    unknown: 'unknown',
    checking: 'checking'
  };

  var STORAGE_KEY = 'lme_url_two';
  var HEALTH_KEY = 'lme_parser_health';
  var NO_PARSER_ID = 'no_parser';

  var CACHE_TTL = 10 * 60 * 1000; // 10 min
  var AJAX_TIMEOUT = 5000;

  var STATUS_CLASS = {};
  STATUS_CLASS[STATUS.ok] = 'status-ok';
  STATUS_CLASS[STATUS.authError] = 'status-auth-error';
  STATUS_CLASS[STATUS.networkError] = 'status-network-error';
  STATUS_CLASS[STATUS.unknown] = 'status-unknown';
  STATUS_CLASS[STATUS.checking] = 'status-checking';

  function safeTrim(s) {
    return (s || '').toString().trim();
  }

  function getProtocol() {
    if (Lampa.Utils && typeof Lampa.Utils.protocol === 'function') return Lampa.Utils.protocol();
    return location.protocol === 'https:' ? 'https://' : 'http://';
  }

  function normalizeBaseUrl(raw) {
    var url = safeTrim(raw);
    if (!url) return '';
    // если уже есть протокол — оставляем
    if (/^https?:\/\//i.test(url)) return url.replace(/\/+$/, '');
    // иначе добавим протокол
    return (getProtocol() + url).replace(/\/+$/, '');
  }

  function encodeQuery(v) {
    try { return encodeURIComponent(v || ''); } catch (e) { return ''; }
  }

  function createHealthCheckUrl(parser) {
    if (!parser || !parser.settings) return null;

    var settings = parser.settings;
    var base = normalizeBaseUrl(settings.url);
    if (!base) return null;

    var parserType = settings.parser_torrent_type || 'jackett';

    var apiKey = '';
    if (parserType === 'prowlarr') apiKey = settings.key || '';
    else if (settings.url === 'spawn.pp.ua:59117') apiKey = '2';
    else apiKey = settings.key || '';

    var path = (parserType === 'prowlarr')
      ? '/api/v1/health'
      : '/api/v2.0/indexers/status:healthy/results';

    return base + path + '?apikey=' + encodeQuery(apiKey);
  }

  function statusFromXhr(xhr) {
    if (!xhr) return STATUS.networkError;
    if (xhr.status === 200) return STATUS.ok;
    if (xhr.status === 401) return STATUS.authError;
    return STATUS.networkError;
  }

  /** =========================
   *  Cache
   *  ========================= */
  var cache = {
    data: {},
    get: function (key) {
      var c = this.data[key];
      if (c && Date.now() < c.expiresAt) return c;
      return null;
    },
    set: function (key, status) {
      this.data[key] = { status: status, expiresAt: Date.now() + CACHE_TTL };
    }
  };

  function cacheKey(parserId, url) {
    return (parserId || 'unknown') + '::' + (url || '');
  }

  /** =========================
   *  Health check
   *  ========================= */
  function checkAlive(parsers) {
    if (!Array.isArray(parsers) || !parsers.length) return Promise.resolve({});

    var results = {};
    var requests = parsers.map(function (parser) {
      return new Promise(function (resolve) {
        var url = createHealthCheckUrl(parser);
        var parserId = parser.id || parser.name || 'unknown';

        if (!url) {
          results[parserId] = STATUS.unknown;
          resolve();
          return;
        }

        var key = cacheKey(parserId, url);
        var cached = cache.get(key);
        if (cached) {
          results[parserId] = cached.status;
          resolve();
          return;
        }

        $.ajax({
          url: url,
          method: 'GET',
          timeout: AJAX_TIMEOUT,
          success: function (_resp, _text, xhr) {
            var st = statusFromXhr(xhr);
            // кэшируем ok/auth (а сетевые — нет, чтобы быстрее “оживали”)
            if (xhr && (xhr.status === 200 || xhr.status === 401)) cache.set(key, st);
            results[parserId] = st;
            resolve();
          },
          error: function (xhr) {
            results[parserId] = statusFromXhr(xhr);
            resolve();
          }
        });
      });
    });

    return Promise.allSettled(requests).then(function () { return results; });
  }

  /** =========================
   *  Selection apply
   *  ========================= */
  function getSelectedParserId() {
    return Lampa.Storage.get(STORAGE_KEY, NO_PARSER_ID);
  }

  function getParserById(parserId) {
    return parsersInfo.find(function (p) { return p.id === parserId; });
  }

  function applySelectedParser(parserId) {
    var id = (typeof parserId !== 'undefined') ? parserId : getSelectedParserId();
    if (!id || id === NO_PARSER_ID) return false;

    var selected = getParserById(id);
    if (!selected || !selected.settings) {
      console.warn('PubTorr: parser not found', id);
      return false;
    }

    var settings = selected.settings;
    var parserType = settings.parser_torrent_type || 'jackett';

    Lampa.Storage.set(parserType === 'prowlarr' ? 'prowlarr_url' : 'jackett_url', settings.url);
    Lampa.Storage.set(parserType === 'prowlarr' ? 'prowlarr_key' : 'jackett_key', settings.key || '');
    Lampa.Storage.set('parser_torrent_type', parserType);

    return true;
  }

  /** =========================
   *  UI helpers
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

  function applyStatus(item, status) {
    var classes = Object.values(STATUS_CLASS).join(' ');
    item.removeClass(classes);
    item.addClass(STATUS_CLASS[status] || STATUS_CLASS[STATUS.unknown]);
    item.find('.pubtorr-parser-modal__status').text(statusLabel(status));

    // ✅ optional premium flash on result
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
    var current = parsers.find(function (p) { return p.id === selectedId; });
    var label = current ? current.name : Lampa.Lang.translate('lme_parser_none');
    wrapper.find('.pubtorr-parser-modal__current-value').text(label);
  }

  function updateSettingsSelectedLabel(selectedId, parsers) {
    var current = parsers.find(function (p) { return p.id === selectedId; });
    var label = current ? current.name : Lampa.Lang.translate('lme_parser_none');
    var text = Lampa.Lang.translate('lme_parser_selected') + ': ' + label;
    $('.pubtorr-parser-selected').text(text);
  }

  /** =========================
   *  Modal
   *  ========================= */
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
    var healthEnabled = Lampa.Storage.get(HEALTH_KEY, true);

    parsers.forEach(function (parser) {
      var item = buildItem(parser);

      item.on('hover:enter', function () {
        Lampa.Storage.set(STORAGE_KEY, parser.id);
        applySelection(list, parser.id);
        updateCurrentLabel(modal, parser.id, parsers);
        updateSettingsSelectedLabel(parser.id, parsers);

        if (parser.id === NO_PARSER_ID) return;
        applySelectedParser(parser.id);
      });

      list.append(item);
    });

    applySelection(list, selectedId);
    updateCurrentLabel(modal, selectedId, parsers);
    updateSettingsSelectedLabel(selectedId, parsers);

    var actionableItems = list.find('.pubtorr-parser-modal__item').first();

    Lampa.Modal.open({
      title: Lampa.Lang.translate('lme_parser'),
      html: modal,
      size: 'medium',
      scroll_to_center: true,
      select: actionableItems,
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

    function setChecking() {
      parserItems.each(function () {
        applyStatus($(this), STATUS.checking);
      });
    }

    function runChecks() {
      setChecking();
      checkAlive(parsersInfo).then(function (statusMap) {
        parserItems.each(function () {
          var item = $(this);
          // ✅ FIX: правильное чтение data-parser-id
          var parserId = item.attr('data-parser-id');
          var st = statusMap[parserId] || STATUS.unknown;
          applyStatus(item, st);
        });
      });
    }

    refreshAction.on('hover:enter', function () {
      runChecks();
    });

    runChecks();
  }

  /** =========================
   *  Settings integration
   *  ========================= */
  function parserSetting() {
    applySelectedParser();

    Lampa.SettingsApi.addParam({
      component: 'parser',
      param: { name: 'lme_parser_manage', type: 'button' },
      field: {
        name: Lampa.Lang.translate('lme_parser'),
        description: Lampa.Lang.translate('lme_parser_description') + ' ' + parsersInfo.length + '<div class="pubtorr-parser-selected"></div>'
      },
      onChange: function () {
        openParserModal();
      },
      onRender: function (item) {
        applySelectedParser();

        var selectedId = getSelectedParserId();
        var current = parsersInfo.find(function (p) { return p.id === selectedId; });
        var label = current ? current.name : Lampa.Lang.translate('lme_parser_none');

        item.find('.pubtorr-parser-selected').text(Lampa.Lang.translate('lme_parser_selected') + ': ' + label);

        setTimeout(function () {
          var parserUse = $('div[data-name="parser_use"]').first();
          if (parserUse.length) item.insertAfter(parserUse);
          if (Lampa.Storage.field('parser_use')) item.show(); else item.hide();
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
          if (Lampa.Storage.field('parser_use')) item.show(); else item.hide();
        });
      }
    });
  }

  var Parser = { parserSetting: parserSetting };

  /** =========================
   *  Styles (includes checking animations)
   *  ========================= */
  function injectStyles() {
    Lampa.Template.add('pubtorr_style', '\
<style>\
.pubtorr-parser-modal{--pubtorr-status-ok:#19c37d;--pubtorr-status-auth:#ff4d4f;--pubtorr-status-network:#ff4d4f;--pubtorr-status-unknown:#8c8c8c;--pubtorr-status-checking:#f5a623;--pubtorr-selected-border:#fff;display:flex;flex-direction:column;gap:1em}\
.pubtorr-parser-modal__head{display:flex;align-items:center;justify-content:space-between;gap:1em}\
.pubtorr-parser-modal__current-label{font-size:.9em;opacity:.7}\
.pubtorr-parser-modal__current-value{font-size:1.1em}\
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
@media(max-width:600px){.pubtorr-parser-modal__head{flex-direction:column;align-items:flex-start}.pubtorr-parser-modal__item{flex-direction:column;align-items:flex-start}.pubtorr-parser-modal__status{text-align:left}}\
\
/* ===== Modern checking animation ===== */\
@keyframes pubtorrPulse{0%{transform:translateY(-50%) scale(.9);opacity:.55}50%{transform:translateY(-50%) scale(1.12);opacity:1}100%{transform:translateY(-50%) scale(.9);opacity:.55}}\
@keyframes pubtorrShimmer{0%{transform:translateX(-120%);opacity:0}15%{opacity:.9}60%{opacity:.9}100%{transform:translateX(140%);opacity:0}}\
@keyframes pubtorrDotsA{0%{content:\'\'}25%{content:\'.\'}50%{content:\'..\'}75%{content:\'...\'}100%{content:\'\';}}\
.pubtorr-parser-modal__item.status-checking{border-color:rgba(245,166,35,.35)}\
.pubtorr-parser-modal__item.status-checking::before{animation:pubtorrPulse 1.05s ease-in-out infinite;box-shadow:0 0 0 .22em rgba(245,166,35,.16),0 0 .9em rgba(245,166,35,.35)}\
.pubtorr-parser-modal__item.status-checking::after{content:\'\';position:absolute;inset:0;background:linear-gradient(110deg,transparent 0%,rgba(255,255,255,.08) 35%,rgba(255,255,255,.14) 50%,rgba(255,255,255,.08) 65%,transparent 100%);transform:translateX(-120%);animation:pubtorrShimmer 1.1s ease-in-out infinite;pointer-events:none}\
.pubtorr-parser-modal__item.status-checking .pubtorr-parser-modal__status{position:relative;opacity:.85}\
.pubtorr-parser-modal__item.status-checking .pubtorr-parser-modal__status::after{content:\'\';display:inline-block;width:1.2em;margin-left:.15em;text-align:left;opacity:.8;animation:pubtorrDotsA 1.1s steps(1,end) infinite}\
\
/* result flash */\
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
  Lampa.Platform.tv();

  function add() {
    Lang.translate();
    injectStyles();
    Parser.parserSetting();
  }

  function startPlugin() {
    window.plugin_lmepublictorr_ready = true;
    if (window.appready) add();
    else {
      Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') add();
      });
    }
  }

  if (!window.plugin_lmepublictorr_ready) startPlugin();
})();
