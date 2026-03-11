;(function ($, Lampa) {
  'use strict';

  /**
   * TorrServer Preload UI (Improved)
   * - Красивый модал с прогрессом, метриками, ETA
   * - Авто-старт при достижении порога (настраивается полями Storage)
   * - Кнопка запуска блокируется до порога (опционально)
   * - Фиксы в Modal: bind/wheel/jump, правильные контексты
   */

  /***********************
   *  Small helpers
   ***********************/
  function clamp(n, a, b) {
    n = Number(n) || 0;
    return Math.max(a, Math.min(b, n));
  }

  function nowMs() {
    return Date.now ? Date.now() : +new Date();
  }

  // Безопасно читаем поля Storage (если их нет — дефолт)
  function getStorageField(name, def) {
    try {
      var v = Lampa.Storage.field(name);
      if (v === undefined || v === null || v === '') return def;
      return v;
    } catch (e) {
      return def;
    }
  }

  function toBool(v, def) {
    if (v === true || v === false) return v;
    if (v === 1 || v === '1' || v === 'true' || v === 'on' || v === 'yes') return true;
    if (v === 0 || v === '0' || v === 'false' || v === 'off' || v === 'no') return false;
    return !!def;
  }

  function toNum(v, def) {
    var n = parseFloat(String(v).replace(',', '.'));
    return isFinite(n) ? n : def;
  }

  function bytesToSizeSafe(bytes) {
    try {
      return Lampa.Utils.bytesToSize(bytes || 0);
    } catch (e) {
      // fallback (rough)
      var b = bytes || 0;
      var u = ['B', 'KB', 'MB', 'GB', 'TB'];
      var i = 0;
      while (b >= 1024 && i < u.length - 1) {
        b /= 1024;
        i++;
      }
      return (i === 0 ? b : b.toFixed(1)) + ' ' + u[i];
    }
  }

  function formatTimeSec(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    if (sec < 60) return sec + 's';
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    if (m < 60) return m + 'm ' + s + 's';
    var h = Math.floor(m / 60);
    m = m % 60;
    return h + 'h ' + m + 'm';
  }

  /***********************
   *  Modal (fixed)
   ***********************/
  var Modal = (function () {
    var modalID = 0;

    function Modal(params) {
      this.id = ++modalID;
      this.active = params || {};
      this.html = Lampa.Template.get('modal', { title: this.active.title });
      this.scroll = new Lampa.Scroll({ over: true, mask: this.active.mask });
      this.last = false;
    }

    Modal.prototype.open = function () {
      var _this = this;

      this.html.on('click', function (e) {
        if (
          !$(e.target).closest($('.modal__content', _this.html)).length &&
          Lampa.DeviceInput.canClick(e.originalEvent)
        ) window.history.back();
      });

      this.title(this.active.title);

      this.html.toggleClass('modal--medium', this.active.size === 'medium');
      this.html.toggleClass('modal--large', this.active.size === 'large');
      this.html.toggleClass('modal--full', this.active.size === 'full');
      this.html.toggleClass('modal--overlay', !!this.active.overlay);
      this.html.toggleClass('modal--align-center', this.active.align === 'center');

      if (this.active.zIndex) this.html.css('z-index', this.active.zIndex);

      this.scroll.render().toggleClass('layer--height', this.active.size === 'full');
      this.html.find('.modal__body').append(this.scroll.render());

      this.bind(this.active.html);

      // FIX: wheel вызывает Modal.roll
      this.scroll.onWheel = function (step) {
        _this.roll(step > 0 ? 'down' : 'up');
      };

      this.scroll.append(this.active.html);

      if (this.active.buttons) this.buttons();

      $('body').append(this.html);

      this.max();
      this.toggle(this.active.select);
    };

    Modal.prototype.max = function () {
      try {
        this.scroll
          .render()
          .find('.scroll__content')
          .css(
            'max-height',
            Math.round(window.innerHeight - this.scroll.render().offset().top - window.innerHeight * 0.1) + 'px'
          );
      } catch (e) {}
    };

    Modal.prototype.buttons = function () {
      var _this = this;
      var footer = $('<div class="modal__footer"></div>');

      this.active.buttons.forEach(function (button) {
        var btn = $('<div class="modal__button selector" style="width: 50%;text-align: center"></div>');
        btn.text(button.name);

        // allow disable state
        if (button.disabled) btn.addClass('disabled').css({ opacity: 0.5, pointerEvents: 'none' });

        btn.on('click hover:enter', function () {
          if (btn.hasClass('disabled')) return;
          button.onSelect && button.onSelect();
        });

        footer.append(btn);

        // expose reference if needed
        if (button.__ref) button.__ref(btn);
        if (button.ref) button.ref(btn);
      });

      this.scroll.append(footer);
    };

    Modal.prototype.bind = function (where) {
      var _this = this;

      where
        .find('.selector')
        .off('hover:focus.ts hover:enter.ts')
        .on('hover:focus.ts', function (e) {
          _this.last = e.target;
          _this.scroll.update($(e.target));
        })
        .on('hover:enter.ts', function (e) {
          _this.last = e.target;
          if (_this.active.onSelect) _this.active.onSelect($(e.target));
        });
    };

    Modal.prototype.jump = function (tofoward) {
      // FIX: без this.select
      var select = this.scroll.render().find('.selector.focus');
      if (!select.length) select = this.scroll.render().find('.selector').first();

      select = tofoward ? select.nextAll().filter('.selector') : select.prevAll().filter('.selector');
      select = select.slice(0, 10).last();

      if (select.length) {
        Lampa.Controller.collectionFocus(select[0], this.scroll.render());
      }
    };

    Modal.prototype.roll = function (direction) {
      var select = this.scroll.render().find('.selector');

      if (select.length) {
        Navigator.move(direction);
      } else {
        var step = Math.round(window.innerHeight * 0.15);
        this.scroll.wheel(direction === 'down' ? step : -step);
      }
    };

    Modal.prototype.toggle = function (need_select) {
      var _this = this;

      Lampa.Controller.add('Modal-' + this.id, {
        invisible: true,
        toggle: function () {
          Lampa.Controller.collectionSet(_this.scroll.render());
          Lampa.Controller.collectionFocus(need_select || _this.last, _this.scroll.render());
          Lampa.Layer.visible(_this.scroll.render(true));
        },
        up: function () {
          _this.roll('up');
        },
        down: function () {
          _this.roll('down');
        },
        right: function () {
          if (Navigator.canmove('right')) Navigator.move('right');
          else _this.jump(true);
        },
        left: function () {
          if (Navigator.canmove('left')) Navigator.move('left');
          else _this.jump(false);
        },
        back: function () {
          if (_this.active.onBack) _this.active.onBack();
        }
      });

      Lampa.Controller.toggle('Modal-' + this.id);
    };

    Modal.prototype.update = function (new_html) {
      this.last = false;
      this.scroll.clear();
      this.scroll.append(new_html);
      this.bind(new_html);
      this.max();
      this.toggle(this.active.select);
    };

    Modal.prototype.title = function (title) {
      this.html.find('.modal__title').text(title);
      this.html.toggleClass('modal--empty-title', !title);
    };

    Modal.prototype.destroy = function () {
      this.last = false;
      try {
        this.scroll.destroy();
      } catch (e) {}
      this.html.remove();
    };

    Modal.prototype.close = function () {
      this.destroy();
    };

    Modal.prototype.render = function () {
      return this.html;
    };

    return Modal;
  })();

  /***********************
   *  Lang
   ***********************/
  Lampa.Lang.add({
    ts_preload_preload: {
      en: 'Preload',
      ru: 'Предзагрузка',
      be: 'Перадзагрузка',
      uk: 'Передзавантаження',
      pt: 'Pré-carregar',
      zh: '预加载'
    },
    ts_preload_speed: {
      en: 'Speed',
      ru: 'Скорость',
      be: 'Хуткасць',
      uk: 'Швидкість',
      pt: 'Velocidade',
      zh: '速度'
    },
    ts_preload_seeds: {
      en: 'seeds',
      ru: 'раздают',
      be: 'раздаюць',
      uk: 'роздають',
      pt: 'seeds',
      zh: '种子'
    },
    ts_preload_peers: {
      en: 'Peers',
      ru: 'Подключились',
      be: 'Падключыліся',
      uk: 'Підключилися',
      pt: 'Peers',
      zh: '连接数'
    },
    ts_preload_eta: {
      en: 'ETA',
      ru: 'Осталось',
      be: 'Засталося',
      uk: 'Залишилось',
      pt: 'Falta',
      zh: '剩余'
    },
    ts_preload_ready: {
      en: 'Ready to start',
      ru: 'Можно запускать',
      be: 'Можна запускаць',
      uk: 'Можна запускати',
      pt: 'Pode iniciar',
      zh: '可以开始'
    },
    ts_preload_wait: {
      en: 'Buffering…',
      ru: 'Буферизация…',
      be: 'Буферызацыя…',
      uk: 'Буферизація…',
      pt: 'Carregando…',
      zh: '缓冲中…'
    }
  });

  /***********************
   *  TorrServer helpers
   ***********************/
  function tsIP() {
    // Для поддержки версии 1.6.5
    return !!Lampa.Torserver && !!Lampa.Torserver.ip
      ? Lampa.Torserver.ip()
      : Lampa.Storage.get(
          Lampa.Storage.field('torrserver_use_link') === 'two' ? 'torrserver_url_two' : 'torrserver_url'
        );
  }

  // Для отключения ламповой предзагрузки, формируем ссылку без &preload
  if (!!Lampa.Torserver && !!Lampa.Torserver.stream && !!Lampa.Torserver.url) {
    Lampa.Torserver.stream = function (path, hash, id) {
      return (
        Lampa.Torserver.url() +
        '/stream/' +
        encodeURIComponent(path.split('\\').pop().split('/').pop()) +
        '?link=' +
        hash +
        '&index=' +
        id +
        '&play'
      );
    };
  }

  /***********************
   *  Player wrapper (keeps playlist/stat/callback)
   ***********************/
  var lampaPlay = Lampa.Player.play;
  var lampaCallback = Lampa.Player.callback;
  var lampaPlaylist = Lampa.Player.playlist;
  var lampaStat = Lampa.Player.stat;

  var player = null;

  function params(obj) {
    var prop,
      pairs = [];
    for (prop in obj) pairs.push(prop + (obj[prop] ? '=' + obj[prop] : ''));
    return pairs.join('&');
  }

  function parseUrl(url) {
    var m,
      base_url,
      stream,
      args,
      arg = {};

    if (!!(m = url.match(/^(https?:\/\/.+?)(\/stream\/[^?]+)\?(.+)$/i))) {
      base_url = m[1];
      stream = m[2];
      args = m[3];
      args.split('&').map(function (v) {
        var p = v.split('=');
        arg[p[0]] = p[1] || null;
      });

      delete arg['play'];
      delete arg['preload'];
      delete arg['stat'];
    }

    args = params(arg);

    return {
      clearUrl: base_url + stream + '?' + args,
      base_url: base_url,
      stream: stream,
      args: '?' + args,
      arg: arg
    };
  }

  var Player = (function () {
    function Player(data) {
      data.url = parseUrl(data.url).clearUrl + '&play';
      this.playerData = data;
      this.playList = null;
      this.statUrl = null;
      this.callback = null;
    }

    Player.prototype.setPlayList = function (playlist) {
      playlist.map(function (data) {
        data.url = parseUrl(data.url).clearUrl + '&play';
      });
      this.playList = playlist;
    };

    Player.prototype.setStatUrl = function (url) {
      this.statUrl = url;
    };

    Player.prototype.setCallback = function (callback) {
      this.callback = callback;
    };

    Player.prototype.play = function () {
      lampaPlay(this.playerData);
      this.playList && lampaPlaylist(this.playList);
      this.callback && lampaCallback(this.callback);
      this.statUrl && lampaStat(this.statUrl);
      player = null;
    };

    return Player;
  })();

  // Proxy playlist/stat/callback while player is staged
  Lampa.Player.playlist = function (playlist) {
    if (player) player.setPlayList(playlist);
    else lampaPlaylist(playlist);
  };

  Lampa.Player.stat = function (url) {
    if (player) player.setStatUrl(url);
    else lampaStat(url);
  };

  Lampa.Player.callback = function (callback) {
    if (player) player.setCallback(callback);
    else lampaCallback(callback);
  };

  /***********************
   *  Styles injection
   ***********************/
  function injectPreloadStyles() {
    if (document.getElementById('ts-preload-style')) return;

    var css = `
      .ts-preload{ padding: 10px 2px 2px; min-width: 280px; }
      .ts-preload__card{
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 14px;
        padding: 14px;
      }
      .ts-preload__title{
        font-size: 1.08em;
        margin-bottom: 10px;
        opacity: .92;
      }
      .ts-preload__grid{
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px 12px;
        align-items: baseline;
      }
      .ts-preload__label{ opacity: .72; white-space: nowrap; }
      .ts-preload__value{
        font-variant-numeric: tabular-nums;
        text-align: right;
        max-width: 60vw;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        opacity: .95;
      }
      .ts-preload__progress{
        margin-top: 12px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 999px;
        height: 10px;
        overflow: hidden;
      }
      .ts-preload__bar{
        height: 100%;
        width: 0%;
        background: rgba(16,163,127,0.95);
        transition: width .22s ease;
      }
      .ts-preload__meta{
        margin-top: 10px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap: 10px;
        font-size: .95em;
        opacity: .78;
      }
      .ts-preload__hint{
        margin-top: 10px;
        font-size: .95em;
        opacity: .78;
      }
      .ts-preload__scan{
        margin-top: 12px;
        height: 2px;
        background: rgba(255,255,255,0.08);
        overflow: hidden;
        border-radius: 999px;
        position: relative;
      }
      .ts-preload__scan:before{
        content:"";
        position:absolute;
        left:-35%;
        top:0;
        height:100%;
        width:35%;
        background: rgba(255,255,255,0.22);
        animation: tsPreloadScan 1.05s linear infinite;
      }
      @keyframes tsPreloadScan{
        0%{ transform: translateX(0); }
        100%{ transform: translateX(400%); }
      }

      /* Optional: make modal buttons look nicer if Lampa theme allows */
      .modal__button.disabled{ opacity:.45 !important; }
    `;

    var style = document.createElement('style');
    style.id = 'ts-preload-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /***********************
   *  Main: override play with preload
   ***********************/
  Lampa.Player.play = function (data) {
    try {
      var enabled = toBool(getStorageField('torrserver_preload', false), false);

      // only if data.url exists and is torrserver link
      if (
        enabled &&
        data &&
        data.url &&
        tsIP() &&
        data.url.indexOf(tsIP()) > -1 &&
        (
          // "start from beginning" or timecode < 60 sec
          getStorageField('player_timecode', '') === 'again' ||
          !data.timeline ||
          !data.timeline.time ||
          parseFloat('0' + data.timeline.time) < 60
        )
      ) {
        preload(data);
        return;
      }
    } catch (e) {}

    lampaPlay(data);
  };

  /***********************
   *  Preload flow (Improved)
   ***********************/
  function preload(data) {
    var u = parseUrl(data.url);

    // no hash => normal play
    if (!u.arg.link) return lampaPlay(data);

    injectPreloadStyles();

    // Create staged player wrapper
    player = new Player(data);

    // Save current controller to return back
    var controller = (Lampa.Controller.enabled() && Lampa.Controller.enabled().name) || 'content';

    // Network requests
    var network = new Lampa.Reguest();

    // Options (no UI settings here; read from Storage fields if user/other plugin sets them)
    // - torrserver_preload_min_percent: number (default 10)
    // - torrserver_preload_autostart: bool (default true)
    // - torrserver_preload_lock_launch: bool (default true)  // disables launch button until ready
    // - torrserver_preload_poll_ms: number (default 1000, min 500, max 5000)
    var minPercent = clamp(toNum(getStorageField('torrserver_preload_min_percent', 10), 10), 0, 100);
    var autoStart = toBool(getStorageField('torrserver_preload_autostart', true), true);
    var lockLaunch = toBool(getStorageField('torrserver_preload_lock_launch', true), true);
    var pollMs = clamp(toNum(getStorageField('torrserver_preload_poll_ms', 1000), 1000), 500, 5000);

    // UI nodes
    var modalHtml = $(`
      <div class="ts-preload">
        <div class="ts-preload__card">
          <div class="ts-preload__title">${Lampa.Lang.translate('loading')}</div>

          <div class="ts-preload__grid">
            <div class="ts-preload__label">${Lampa.Lang.translate('ts_preload_peers')}</div>
            <div class="ts-preload__value js-peer">0</div>

            <div class="ts-preload__label">${Lampa.Lang.translate('ts_preload_preload')}</div>
            <div class="ts-preload__value js-buff">0</div>

            <div class="ts-preload__label">${Lampa.Lang.translate('ts_preload_speed')}</div>
            <div class="ts-preload__value js-speed">0</div>

            <div class="ts-preload__label">${Lampa.Lang.translate('ts_preload_eta')}</div>
            <div class="ts-preload__value js-eta">—</div>
          </div>

          <div class="ts-preload__progress">
            <div class="ts-preload__bar js-bar"></div>
          </div>

          <div class="ts-preload__meta">
            <div class="js-pct">0%</div>
            <div class="js-thr">min ${minPercent}%</div>
          </div>

          <div class="ts-preload__hint js-hint">${Lampa.Lang.translate('ts_preload_wait')}</div>
          <div class="ts-preload__scan"></div>
        </div>
      </div>
    `);

    var peer = modalHtml.find('.js-peer');
    var buff = modalHtml.find('.js-buff');
    var speed = modalHtml.find('.js-speed');
    var eta = modalHtml.find('.js-eta');
    var bar = modalHtml.find('.js-bar');
    var pct = modalHtml.find('.js-pct');
    var thr = modalHtml.find('.js-thr');
    var hint = modalHtml.find('.js-hint');

    thr.text('min ' + minPercent + '%');

    var launchBtn = null;
    var reached = false;
    var lastSampleAt = 0;
    var lastBytes = 0;
    var lastSpeedBps = 0;
    var lastPreloadSize = 0;

    // Modal with buttons
    var modal = new Modal({
      title: Lampa.Lang.translate('loading'),
      html: modalHtml,
      onBack: cancel,
      buttons: [
        {
          name: Lampa.Lang.translate('cancel'),
          onSelect: cancel
        },
        {
          name: Lampa.Lang.translate('player_lauch'),
          disabled: lockLaunch && minPercent > 0,
          __ref: function (btn) {
            launchBtn = btn;
          },
          onSelect: play
        }
      ]
    });

    modal.open();

    function setLaunchEnabled(on) {
      if (!launchBtn) return;
      if (on) launchBtn.removeClass('disabled').css({ opacity: '', pointerEvents: '' });
      else launchBtn.addClass('disabled').css({ opacity: 0.5, pointerEvents: 'none' });
    }

    function destroy() {
      try {
        network.clear();
      } catch (e) {}

      try {
        modal.close();
      } catch (e) {}

      try {
        Lampa.Controller.toggle(controller);
      } catch (e) {}
    }

    function cancel() {
      if (player) {
        destroy();
        player.callback && player.callback();
        player = null;
      }
    }

    function play() {
      if (player) {
        destroy();
        player.play();
      }
    }

    // 30 минут на предзагрузку (как было)
    try {
      network.timeout(1800 * 1000);
    } catch (e) {}

    // Start preload request; on success/fail -> attempt play
    // IMPORTANT: request should not block UI; on completion it calls play (same as original)
    network.silent(u.clearUrl + '&preload', play, play);

    // Then switch to short timeout for polling
    try {
      network.timeout(2000);
    } catch (e) {}

    // Polling loop using /cache (TorServer)
    function updateUI(t) {
      var preloaded = (t.preloaded_bytes || 0);
      var preloadSz = (t.preload_size || 0);
      var activePeers = (t.active_peers || 0);
      var pendingPeers = (t.pending_peers || 0);
      var totalPeers = (t.total_peers || 0);
      var seeders = (t.connected_seeders || 0);

      var p = Math.floor(preloaded * 100 / (preloadSz || 1));
      p = clamp(p, 0, 100);

      // speed: TorServer might give bytes/sec (download_speed). In original they *8 with bytesToSize(..., true)
      // We'll keep the original behavior but also compute ETA using bytes/sec (not bits).
      var sp = (t.download_speed || 0);
      var spBytes = sp; // assume bytes/sec
      lastSpeedBps = spBytes;

      peer.text(activePeers + ' / ' + pendingPeers + ' (' + totalPeers + ') • ' + seeders + ' ' + Lampa.Lang.translate('ts_preload_seeds'));
      buff.text(bytesToSizeSafe(preloaded) + ' / ' + bytesToSizeSafe(preloadSz) + ' • ' + p + '%');
      speed.text(bytesToSizeSafe(sp * 8) + '/s'); // matches original "bits" feel
      pct.text(p + '%');
      bar.css('width', p + '%');

      lastPreloadSize = preloadSz;

      // ETA (rough): remaining bytes / speed bytes/sec
      if (spBytes > 0 && preloadSz > 0 && preloaded <= preloadSz) {
        var remain = Math.max(0, preloadSz - preloaded);
        eta.text(formatTimeSec(remain / spBytes));
      } else {
        eta.text('—');
      }

      var ready = (p >= minPercent) || (minPercent <= 0);
      if (ready && !reached) {
        reached = true;
        hint.text(Lampa.Lang.translate('ts_preload_ready') + (autoStart ? ' • auto' : ''));
        if (lockLaunch) setLaunchEnabled(true);
        if (autoStart) {
          // small delay so UI updates before switching
          setTimeout(function () {
            if (player) play();
          }, 150);
        }
      } else if (!ready) {
        hint.text(Lampa.Lang.translate('ts_preload_wait') + ' • ' + (minPercent > 0 ? ('до ' + minPercent + '%') : ''));
        if (lockLaunch) setLaunchEnabled(false);
      }

      // Extra smoothness: estimate speed from delta if API speed is 0
      // (optional) - only if needed:
      var tNow = nowMs();
      if (tNow - lastSampleAt >= pollMs) {
        var deltaB = preloaded - lastBytes;
        var deltaT = (tNow - lastSampleAt) / 1000;
        if (deltaT > 0 && deltaB > 0 && (!spBytes || spBytes <= 0)) {
          lastSpeedBps = deltaB / deltaT;
        }
        lastSampleAt = tNow;
        lastBytes = preloaded;
      }
    }

    function poll() {
      if (!player) return;

      network.silent(
        u.base_url + '/cache',
        function (resp) {
          if (!player) return;

          // TorServer usually returns object with Torrent inside or directly
          // Your original code expects: {Torrent: t}
          // We'll normalize:
          var t = null;

          if (resp && resp.Torrent) t = resp.Torrent;
          else if (resp && resp.preloaded_bytes !== undefined) t = resp;
          else if (resp && resp.result && resp.result.Torrent) t = resp.result.Torrent;

          if (t) updateUI(t);

          // schedule next poll
          setTimeout(poll, pollMs);
        },
        function () {
          if (!player) return;
          // On error, keep polling but slower, and show hint
          hint.text(Lampa.Lang.translate('ts_preload_wait') + ' • err');
          setTimeout(poll, Math.min(2000, pollMs * 2));
        },
        JSON.stringify({ action: 'get', hash: u.arg.link })
      );
    }

    // initial fake data
    updateUI({
      active_peers: 0,
      pending_peers: 0,
      total_peers: 0,
      connected_seeders: 0,
      preloaded_bytes: 0,
      preload_size: 0,
      download_speed: 0
    });

    // kick polling
    lastSampleAt = nowMs();
    lastBytes = 0;
    poll();
  }
})(jQuery, Lampa);
