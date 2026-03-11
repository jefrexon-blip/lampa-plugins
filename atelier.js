(function() {
  var __atelier_previous_manifest = typeof Lampa !== "undefined" ? Lampa.Manifest : null;
  if (typeof Lampa !== "undefined") {
    Lampa.Manifest = {
      type: "plugin",
      name: "Интерфейс",
      description: "Новая подача карточек, кнопок и рейтингов в Lampa.",
      version: "3.0.0",
      author: "jefrexon"
    };
  }
  (function() {
    "use strict";
    if (typeof window === "undefined" || typeof document === "undefined") return;
    var plugin = {
      id: "interface_mod",
      version: "3.0.0",
      author: "jefrexon"
    };
    var keys = {
      enabled: "interface_mod_enabled",
      accent: "interface_mod_accent",
      card_style: "interface_mod_card_style",
      button_layout: "interface_mod_button_layout",
      compact_buttons: "interface_mod_compact_buttons",
      movie_type: "interface_mod_movie_type",
      seasons_badge: "interface_mod_seasons_badge",
      badge_position: "interface_mod_badge_position",
      rating_palette: "interface_mod_rating_palette",
      rating_view: "interface_mod_rating_view",
      colored_status: "interface_mod_colored_status",
      minimal: "interface_mod_minimal",
      motion: "interface_mod_motion",
      focus_glow: "interface_mod_focus_glow",
      adaptive_badges: "interface_mod_adaptive_badges",
      safe_mode: "interface_mod_safe_mode"
    };
    var defaults = {
      enabled: true,
      accent: "ocean",
      card_style: "glass",
      button_layout: "wrap",
      compact_buttons: false,
      movie_type: true,
      seasons_badge: "aired",
      badge_position: "top-right",
      rating_palette: true,
      rating_view: "pill",
      colored_status: true,
      minimal: false,
      motion: "soft",
      focus_glow: true,
      adaptive_badges: true,
      safe_mode: false
    };
    var state = {
      started: false,
      observers: [],
      timers: {},
      settingsBound: false,
      listenerBound: false
    };
    function storageGet(key, fallback) {
      try {
        if (window.Lampa && Lampa.Storage && typeof Lampa.Storage.get === "function") {
          return Lampa.Storage.get(key, fallback);
        }
      } catch (e) {
      }
      try {
        if (window.Lampa && Lampa.Storage && typeof Lampa.Storage.field === "function") {
          var value = Lampa.Storage.field(key);
          return value === void 0 || value === null ? fallback : value;
        }
      } catch (e2) {
      }
      return fallback;
    }
    function storageSet(key, value) {
      try {
        if (window.Lampa && Lampa.Storage && typeof Lampa.Storage.set === "function") Lampa.Storage.set(key, value);
      } catch (e) {
      }
    }
    function read(name) {
      return storageGet(keys[name], defaults[name]);
    }
    function normalizeBool(value, fallback) {
      if (value === true || value === false) return value;
      if (value === "true" || value === "1" || value === 1 || value === "on") return true;
      if (value === "false" || value === "0" || value === 0 || value === "off") return false;
      return !!fallback;
    }
    function clamp(value, min, max) {
      value = Number(value) || 0;
      if (value < min) return min;
      if (value > max) return max;
      return value;
    }
    function clearTimer(name) {
      if (state.timers[name]) {
        clearTimeout(state.timers[name]);
        state.timers[name] = null;
      }
    }
    function schedule(name, delay, fn) {
      clearTimer(name);
      state.timers[name] = setTimeout(function() {
        state.timers[name] = null;
        fn();
      }, delay);
    }
    function disconnectObservers() {
      for (var i = 0; i < state.observers.length; i++) {
        try {
          state.observers[i].disconnect();
        } catch (e) {
        }
      }
      state.observers = [];
    }
    function observe(node, options, handler) {
      if (!node || typeof MutationObserver === "undefined") return null;
      var observer = new MutationObserver(handler);
      observer.observe(node, options);
      state.observers.push(observer);
      return observer;
    }
    function ensureManifest() {
      if (!window.Lampa) return;
      try {
        if (Lampa.Plugin && Lampa.Plugin.create) {
          Lampa.Plugin.create(plugin.id, {
            title: "Интерфейс",
            name: "Интерфейс",
            version: plugin.version,
            author: plugin.author,
            description: "Новая подача карточек, кнопок и рейтингов в Lampa."
          });
        }
      } catch (e2) {
      }
      try {
        if (__atelier_previous_manifest) Lampa.Manifest = __atelier_previous_manifest;
      } catch (e3) {
      }
    }
    function getSettings() {
      return {
        enabled: normalizeBool(read("enabled"), defaults.enabled),
        accent: String(read("accent") || defaults.accent),
        card_style: String(read("card_style") || defaults.card_style),
        button_layout: String(read("button_layout") || defaults.button_layout),
        compact_buttons: normalizeBool(read("compact_buttons"), defaults.compact_buttons),
        movie_type: normalizeBool(read("movie_type"), defaults.movie_type),
        seasons_badge: String(read("seasons_badge") || defaults.seasons_badge),
        badge_position: String(read("badge_position") || defaults.badge_position),
        rating_palette: normalizeBool(read("rating_palette"), defaults.rating_palette),
        rating_view: String(read("rating_view") || defaults.rating_view),
        colored_status: normalizeBool(read("colored_status"), defaults.colored_status),
        minimal: normalizeBool(read("minimal"), defaults.minimal),
        motion: String(read("motion") || defaults.motion),
        focus_glow: normalizeBool(read("focus_glow"), defaults.focus_glow),
        adaptive_badges: normalizeBool(read("adaptive_badges"), defaults.adaptive_badges),
        safe_mode: normalizeBool(read("safe_mode"), defaults.safe_mode)
      };
    }
    function setBodyFlags(settings) {
      var body = document.body;
      if (!body) return;
      body.setAttribute("data-ifx-enabled", settings.enabled ? "1" : "0");
      body.setAttribute("data-ifx-accent", settings.accent);
      body.setAttribute("data-ifx-card-style", settings.card_style);
      body.setAttribute("data-ifx-layout", settings.button_layout);
      body.setAttribute("data-ifx-compact", settings.compact_buttons ? "1" : "0");
      body.setAttribute("data-ifx-rating-view", settings.rating_view);
      body.setAttribute("data-ifx-minimal", settings.minimal ? "1" : "0");
      body.setAttribute("data-ifx-motion", settings.motion);
      body.setAttribute("data-ifx-focus", settings.focus_glow ? "1" : "0");
      body.setAttribute("data-ifx-safe", settings.safe_mode ? "1" : "0");
    }
    function removeNode(node) {
      if (node && node.parentNode) node.parentNode.removeChild(node);
    }
    function setStyle(id, css) {
      var node = document.getElementById(id);
      if (!node) {
        node = document.createElement("style");
        node.type = "text/css";
        node.id = id;
        document.head.appendChild(node);
      }
      if (node.styleSheet) node.styleSheet.cssText = css;
      else node.textContent = css;
    }
    function removeStyle(id) {
      removeNode(document.getElementById(id));
    }
    function getAccent(settings) {
      var palette = {
        ocean: { main: "#43c6ff", soft: "rgba(67,198,255,.18)", edge: "rgba(80,212,255,.55)" },
        ember: { main: "#ff8a5b", soft: "rgba(255,138,91,.18)", edge: "rgba(255,163,108,.55)" },
        lime: { main: "#87e36b", soft: "rgba(135,227,107,.18)", edge: "rgba(157,238,119,.55)" },
        rose: { main: "#ff6fa7", soft: "rgba(255,111,167,.18)", edge: "rgba(255,138,184,.55)" },
        violet: { main: "#9c8cff", soft: "rgba(156,140,255,.18)", edge: "rgba(173,161,255,.55)" }
      };
      return palette[settings.accent] || palette.ocean;
    }
    function buildCss(settings) {
      var accent = getAccent(settings);
      return ":root{--ifx-accent:" + accent.main + ";--ifx-accent-soft:" + accent.soft + ";--ifx-accent-edge:" + accent.edge + ';--ifx-card-radius:22px;--ifx-chip-radius:999px;--ifx-shadow:0 22px 48px rgba(0,0,0,.32);--ifx-line:rgba(255,255,255,.07);--ifx-panel:rgba(18,21,28,.72);--ifx-panel-strong:rgba(12,15,20,.84);--ifx-text-soft:rgba(255,255,255,.72);}body[data-ifx-enabled="1"] .card__view,body[data-ifx-enabled="1"] .full-start__poster,body[data-ifx-enabled="1"] .full-start-new__poster{overflow:hidden;border-radius:var(--ifx-card-radius);}body[data-ifx-enabled="1"][data-ifx-card-style="glass"] .card .card__view{box-shadow:var(--ifx-shadow);background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,0));}body[data-ifx-enabled="1"][data-ifx-card-style="glass"] .card.focus .card__view,body[data-ifx-enabled="1"][data-ifx-card-style="glass"] .card.hover .card__view{transform:translateY(-3px) scale(1.01);}body[data-ifx-enabled="1"][data-ifx-card-style="poster"] .card .card__view::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(9,11,16,0) 20%,rgba(9,11,16,.16) 60%,rgba(9,11,16,.74) 100%);pointer-events:none;}body[data-ifx-enabled="1"][data-ifx-card-style="clean"] .card .card__view{box-shadow:none!important;border:1px solid var(--ifx-line);}body[data-ifx-enabled="1"][data-ifx-focus="1"] .card.focus .card__view,body[data-ifx-enabled="1"][data-ifx-focus="1"] .card.hover .card__view{box-shadow:0 0 0 1px var(--ifx-accent-edge),0 0 0 4px var(--ifx-accent-soft),var(--ifx-shadow);}body[data-ifx-enabled="1"][data-ifx-motion="off"] *{transition:none!important;animation:none!important;}body[data-ifx-enabled="1"] .ifx-card-stack,body[data-ifx-enabled="1"] .ifx-full-stack{position:absolute;display:flex;flex-direction:column;gap:6px;z-index:10;pointer-events:none;max-width:80%;}body[data-ifx-enabled="1"] .ifx-pos-top-right{top:12px;right:12px;align-items:flex-end;}body[data-ifx-enabled="1"] .ifx-pos-top-left{top:12px;left:12px;align-items:flex-start;}body[data-ifx-enabled="1"] .ifx-pos-bottom-right{bottom:12px;right:12px;align-items:flex-end;}body[data-ifx-enabled="1"] .ifx-pos-bottom-left{bottom:12px;left:12px;align-items:flex-start;}body[data-ifx-enabled="1"] .ifx-chip{display:inline-flex;align-items:center;gap:6px;min-height:28px;padding:0 12px;border-radius:var(--ifx-chip-radius);background:rgba(8,10,14,.66);border:1px solid rgba(255,255,255,.1);backdrop-filter:blur(10px);color:#fff;font-size:14px;font-weight:600;line-height:1;letter-spacing:.02em;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis;}body[data-ifx-enabled="1"][data-ifx-minimal="1"] .ifx-chip{background:rgba(12,14,18,.78);backdrop-filter:none;box-shadow:none;}body[data-ifx-enabled="1"] .ifx-chip--accent{background:linear-gradient(135deg,var(--ifx-accent-soft),rgba(8,10,14,.82));border-color:var(--ifx-accent-edge);}body[data-ifx-enabled="1"] .ifx-chip--subtle{color:var(--ifx-text-soft);}body[data-ifx-enabled="1"] .ifx-chip--good{background:rgba(33,138,78,.26);border-color:rgba(76,202,129,.44);}body[data-ifx-enabled="1"] .ifx-chip--warn{background:rgba(175,122,28,.26);border-color:rgba(246,194,88,.44);}body[data-ifx-enabled="1"] .ifx-chip--bad{background:rgba(155,54,62,.26);border-color:rgba(248,102,112,.44);}body[data-ifx-enabled="1"] .ifx-chip--light{background:rgba(255,255,255,.78);color:#111;border-color:rgba(255,255,255,.88);}body[data-ifx-enabled="1"] .full-start__buttons,body[data-ifx-enabled="1"] .full-start-new__buttons{position:relative;gap:12px;}body[data-ifx-enabled="1"] .full-start__buttons .button,body[data-ifx-enabled="1"] .full-start-new__buttons .button,body[data-ifx-enabled="1"] .full-start__buttons .full-start__button,body[data-ifx-enabled="1"] .full-start-new__buttons .full-start__button{display:inline-flex;align-items:center;justify-content:center;min-height:54px;padding:0 22px;border-radius:20px;border:1px solid rgba(255,255,255,.10);background:linear-gradient(180deg,rgba(30,35,46,.92),rgba(15,18,26,.94));box-shadow:0 12px 30px rgba(0,0,0,.24);transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease,background .18s ease,color .18s ease;color:#f5f7fb!important;}body[data-ifx-enabled="1"] .full-start__buttons .button > *,body[data-ifx-enabled="1"] .full-start-new__buttons .button > *,body[data-ifx-enabled="1"] .full-start__buttons .full-start__button > *,body[data-ifx-enabled="1"] .full-start-new__buttons .full-start__button > *{color:inherit!important;}body[data-ifx-enabled="1"] .full-start__buttons .button.focus,body[data-ifx-enabled="1"] .full-start-new__buttons .button.focus,body[data-ifx-enabled="1"] .full-start__buttons .full-start__button.focus,body[data-ifx-enabled="1"] .full-start-new__buttons .full-start__button.focus,body[data-ifx-enabled="1"] .full-start__buttons .button.hover,body[data-ifx-enabled="1"] .full-start-new__buttons .button.hover,body[data-ifx-enabled="1"] .full-start__buttons .full-start__button.hover,body[data-ifx-enabled="1"] .full-start-new__buttons .full-start__button.hover{transform:translateY(-2px);border-color:rgba(132,212,255,.72);background:linear-gradient(180deg,rgba(42,56,78,.98),rgba(20,28,42,.98));box-shadow:0 0 0 3px rgba(86,194,255,.18),0 18px 34px rgba(0,0,0,.30);color:#ffffff!important;}body[data-ifx-enabled="1"] .full-start__buttons .button.selector.focus,body[data-ifx-enabled="1"] .full-start-new__buttons .button.selector.focus,body[data-ifx-enabled="1"] .full-start__buttons .full-start__button.selector.focus,body[data-ifx-enabled="1"] .full-start-new__buttons .full-start__button.selector.focus{color:#ffffff!important;}body[data-ifx-enabled="1"][data-ifx-compact="1"] .full-start__buttons .button,body[data-ifx-enabled="1"][data-ifx-compact="1"] .full-start-new__buttons .button,body[data-ifx-enabled="1"][data-ifx-compact="1"] .full-start__buttons .full-start__button,body[data-ifx-enabled="1"][data-ifx-compact="1"] .full-start-new__buttons .full-start__button{min-height:48px;padding:0 18px;border-radius:18px;}body[data-ifx-enabled="1"][data-ifx-layout="grid"] .full-start__buttons,body[data-ifx-enabled="1"][data-ifx-layout="grid"] .full-start-new__buttons{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));align-items:stretch;}body[data-ifx-enabled="1"][data-ifx-layout="strip"] .full-start__buttons,body[data-ifx-enabled="1"][data-ifx-layout="strip"] .full-start-new__buttons{display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important;overflow-y:hidden!important;padding-bottom:6px;}body[data-ifx-enabled="1"][data-ifx-layout="strip"] .full-start__buttons::-webkit-scrollbar,body[data-ifx-enabled="1"][data-ifx-layout="strip"] .full-start-new__buttons::-webkit-scrollbar{height:6px;}body[data-ifx-enabled="1"][data-ifx-layout="strip"] .full-start__buttons .button,body[data-ifx-enabled="1"][data-ifx-layout="strip"] .full-start-new__buttons .button,body[data-ifx-enabled="1"][data-ifx-layout="strip"] .full-start__buttons .full-start__button,body[data-ifx-enabled="1"][data-ifx-layout="strip"] .full-start-new__buttons .full-start__button{flex:0 0 auto;}body[data-ifx-enabled="1"] .ifx-rate-pill{display:inline-flex;align-items:center;justify-content:center;min-width:44px;padding:4px 10px;border-radius:999px;background:rgba(7,10,14,.72);border:1px solid rgba(255,255,255,.08);box-shadow:0 10px 26px rgba(0,0,0,.18);}body[data-ifx-enabled="1"][data-ifx-rating-view="clean"] .ifx-rate-pill{padding:0;min-width:0;background:none;border:0;box-shadow:none;}body[data-ifx-enabled="1"] .ifx-status-good{color:#86f1ab!important;}body[data-ifx-enabled="1"] .ifx-status-warn{color:#ffd36d!important;}body[data-ifx-enabled="1"] .ifx-status-bad{color:#ff8a8a!important;}body[data-ifx-enabled="1"] .ifx-meta-inline{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;}body[data-ifx-enabled="1"] .ifx-meta-inline .ifx-chip{pointer-events:none;}';
    }
    function colorForRating(value) {
      var n = parseFloat(String(value || "").replace(",", "."));
      if (!isFinite(n)) return "";
      if (n >= 8.2) return "ifx-chip--good";
      if (n >= 6.8) return "ifx-chip--warn";
      return "ifx-chip--bad";
    }
    function text(node) {
      if (!node) return "";
      return String(node.textContent || "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
    }
    function findOne(root, selector) {
      if (!root || !root.querySelector) return null;
      return root.querySelector(selector);
    }
    function findAll(root, selector) {
      if (!root || !root.querySelectorAll) return [];
      return root.querySelectorAll(selector);
    }
    function mediaTypeFromCard(card) {
      if (!card) return "";
      if (card.className && /card--tv/.test(card.className)) return "Сериал";
      var attrs = [
        card.getAttribute("data-type"),
        card.getAttribute("data-card_type"),
        card.getAttribute("data-cardtype")
      ];
      for (var i = 0; i < attrs.length; i++) {
        if (!attrs[i]) continue;
        if (String(attrs[i]).toLowerCase() === "tv") return "Сериал";
        if (String(attrs[i]).toLowerCase() === "movie") return "Фильм";
      }
      var label = text(findOne(card, ".card__type")) || text(findOne(card, ".card__temp"));
      if (/tv|series|serial|сериал/i.test(label)) return "Сериал";
      return "Фильм";
    }
    function parsePosterTone(view) {
      if (!view) return "dark";
      var img = findOne(view, "img");
      if (!img) return "dark";
      var src = String(img.getAttribute("src") || "");
      if (/white|light|bright/i.test(src)) return "light";
      return "dark";
    }
    function stackClass(position) {
      return "ifx-" + String(position || "top-right").replace(/(^|-)./g, function(part) {
        if (part === "-") return "";
        return part;
      });
    }
    function stackPositionClass(position) {
      if (position === "top-left") return "ifx-pos-top-left";
      if (position === "bottom-right") return "ifx-pos-bottom-right";
      if (position === "bottom-left") return "ifx-pos-bottom-left";
      return "ifx-pos-top-right";
    }
    function createChip(label, kind) {
      var item = document.createElement("div");
      item.className = "ifx-chip" + (kind ? " " + kind : "");
      item.textContent = label;
      return item;
    }
    function ensureStack(host, className) {
      var stack = findOne(host, "." + className);
      if (!stack) {
        stack = document.createElement("div");
        stack.className = className;
        host.appendChild(stack);
      }
      while (stack.firstChild) stack.removeChild(stack.firstChild);
      return stack;
    }
    function decorateCard(card, settings) {
      if (!card || card.getAttribute("data-ifx-card") === "1") return;
      var view = findOne(card, ".card__view");
      if (!view) return;
      card.setAttribute("data-ifx-card", "1");
      if (!settings.movie_type) return;
      var stack = ensureStack(view, "ifx-card-stack " + stackPositionClass(settings.badge_position));
      var type = mediaTypeFromCard(card);
      var tone = settings.adaptive_badges && parsePosterTone(view) === "light" ? " ifx-chip--light" : "";
      stack.appendChild(createChip(type, "ifx-chip--accent" + tone));
      var vote = findOne(card, ".card__vote");
      var year = text(findOne(card, ".card__age")) || text(findOne(card, ".card__quality")) || text(findOne(card, ".card__time"));
      if (year) stack.appendChild(createChip(year, "ifx-chip--subtle" + tone));
      if (settings.rating_palette && vote) {
        var mark = colorForRating(text(vote));
        if (mark) vote.classList.add(mark);
        if (settings.rating_view === "pill") vote.classList.add("ifx-rate-pill");
        else vote.classList.remove("ifx-rate-pill");
      }
    }
    function getBadgeLines(movie, settings) {
      var chips = [];
      var type = movie && (movie.name ? "Сериал" : "Фильм");
      if (settings.movie_type && type) chips.push({ text: type, kind: "ifx-chip--accent" });
      if (settings.seasons_badge !== "none" && movie) {
        var seasons = Number(movie.number_of_seasons || movie.seasons_count || movie.season_count || 0);
        var episodes = Number(movie.number_of_episodes || movie.episodes_count || 0);
        if (seasons > 0) {
          if (settings.seasons_badge === "total") chips.push({ text: seasons + " сез.", kind: "ifx-chip--subtle" });
          else if (episodes > 0) chips.push({ text: seasons + " сез. / " + episodes + " эп.", kind: "ifx-chip--subtle" });
          else chips.push({ text: seasons + " сез.", kind: "ifx-chip--subtle" });
        }
      }
      if (movie) {
        var status = movie.status || movie.release_status || "";
        if (status) chips.push({ text: String(status), kind: statusKind(status) });
        var age = movie.age || movie.age_restriction || movie.mpaa_rating || "";
        if (age) chips.push({ text: String(age), kind: "ifx-chip--subtle" });
      }
      return chips;
    }
    function statusKind(value) {
      var textValue = String(value || "").toLowerCase();
      if (/returning|released|выпущен|идет|ongoing|production/.test(textValue)) return "ifx-chip--good";
      if (/planned|post|rumored|анонс|ожидается/.test(textValue)) return "ifx-chip--warn";
      if (/ended|cancel|закрыт|заверш/i.test(textValue)) return "ifx-chip--bad";
      return "ifx-chip--subtle";
    }
    function decorateFull(root, movie, settings) {
      if (!root) return;
      var poster = findOne(root, ".full-start__poster") || findOne(root, ".full-start-new__poster");
      if (poster) {
        var tone = settings.adaptive_badges && parsePosterTone(poster) === "light" ? " ifx-chip--light" : "";
        var fullStack = ensureStack(poster, "ifx-full-stack " + stackPositionClass(settings.badge_position));
        var items = getBadgeLines(movie, settings);
        for (var i = 0; i < items.length; i++) {
          fullStack.appendChild(createChip(items[i].text, items[i].kind + tone));
        }
      }
      if (settings.rating_palette) {
        var ratingNodes = findAll(root, ".full-start__rate,.full-start-new__rate,.info__rate,.card__imdb-rate,.card__kinopoisk-rate,.rate--kp > div,.rate--imdb > div");
        for (var j = 0; j < ratingNodes.length; j++) styleRatingNode(ratingNodes[j], settings);
      }
      if (settings.colored_status) {
        var statusNodes = findAll(root, ".full-start__status,.full-start-new__status,.full-start__pg,.full-start-new__pg");
        for (var k = 0; k < statusNodes.length; k++) styleStatusNode(statusNodes[k]);
      }
      organizeButtons(root, settings);
      injectInlineMeta(root, movie, settings);
    }
    function styleRatingNode(node, settings) {
      if (!node) return;
      node.classList.remove("ifx-chip--good");
      node.classList.remove("ifx-chip--warn");
      node.classList.remove("ifx-chip--bad");
      node.classList.remove("ifx-rate-pill");
      var kind = colorForRating(text(node));
      if (kind) node.classList.add(kind);
      if (settings.rating_view === "pill") node.classList.add("ifx-rate-pill");
    }
    function styleStatusNode(node) {
      if (!node) return;
      node.classList.remove("ifx-status-good");
      node.classList.remove("ifx-status-warn");
      node.classList.remove("ifx-status-bad");
      var value = text(node).toLowerCase();
      if (/returning|released|выпущен|идет|production|ongoing/.test(value)) node.classList.add("ifx-status-good");
      else if (/planned|post|rumored|анонс|ожидается/.test(value)) node.classList.add("ifx-status-warn");
      else if (/ended|cancel|закрыт|заверш/.test(value)) node.classList.add("ifx-status-bad");
    }
    function organizeButtons(root, settings) {
      var list = findAll(root, ".full-start__buttons,.full-start-new__buttons");
      for (var i = 0; i < list.length; i++) {
        list[i].setAttribute("data-ifx-ready", settings.button_layout);
      }
    }
    function injectInlineMeta(root, movie, settings) {
      var holder = findOne(root, ".ifx-meta-inline");
      var info = findOne(root, ".full-start__details") || findOne(root, ".full-start-new__details") || findOne(root, ".full-start__head") || findOne(root, ".full-start-new__head");
      if (!info) return;
      if (!holder) {
        holder = document.createElement("div");
        holder.className = "ifx-meta-inline";
        info.appendChild(holder);
      }
      while (holder.firstChild) holder.removeChild(holder.firstChild);
      var tags = [];
      if (movie && movie.vote_average) tags.push({ text: "TMDB " + Number(movie.vote_average).toFixed(1), kind: colorForRating(movie.vote_average) });
      if (movie && movie.runtime) tags.push({ text: clamp(movie.runtime, 1, 999) + " мин", kind: "ifx-chip--subtle" });
      if (movie && movie.release_date) tags.push({ text: String(movie.release_date).slice(0, 4), kind: "ifx-chip--subtle" });
      if (movie && movie.genres && movie.genres.length) tags.push({ text: String(movie.genres[0].name || movie.genres[0]), kind: "ifx-chip--subtle" });
      for (var i = 0; i < tags.length; i++) holder.appendChild(createChip(tags[i].text, tags[i].kind));
      if (!tags.length) removeNode(holder);
    }
    function activeMovie() {
      try {
        if (window.Lampa && Lampa.Activity && Lampa.Activity.active) {
          var active = Lampa.Activity.active();
          if (active && active.activity && active.activity.data && active.activity.data.movie) return active.activity.data.movie;
        }
      } catch (e) {
      }
      return null;
    }
    function activeRender() {
      try {
        if (window.Lampa && Lampa.Activity && Lampa.Activity.active) {
          var active = Lampa.Activity.active();
          if (active && active.activity && active.activity.render) return active.activity.render();
        }
      } catch (e) {
      }
      return null;
    }
    function decorateScope(scope, settings) {
      var cards = findAll(scope || document.body, ".card");
      for (var i = 0; i < cards.length; i++) decorateCard(cards[i], settings);
      var render = activeRender();
      if (render) decorateFull(render, activeMovie(), settings);
    }
    function refreshAll() {
      var settings = getSettings();
      setBodyFlags(settings);
      if (!settings.enabled) {
        removeStyle("ifx-style");
        disconnectObservers();
        return;
      }
      setStyle("ifx-style", buildCss(settings));
      decorateScope(document.body, settings);
    }
    function restart() {
      disconnectObservers();
      clearTimer("refresh");
      state.started = false;
      start();
    }
    function listenApp() {
      if (state.listenerBound || !window.Lampa || !Lampa.Listener || !Lampa.Listener.follow) return;
      state.listenerBound = true;
      Lampa.Listener.follow("full", function() {
        schedule("full-refresh", 60, function() {
          decorateScope(document.body, getSettings());
        });
      });
      Lampa.Listener.follow("activity", function() {
        schedule("activity-refresh", 80, function() {
          decorateScope(document.body, getSettings());
        });
      });
    }
    function bindObservers() {
      if (!document.body) return;
      var settings = getSettings();
      if (settings.safe_mode) {
        observe(document.body, { childList: true, subtree: true }, function(items) {
          var touched = false;
          for (var i = 0; i < items.length; i++) {
            if (items[i].addedNodes && items[i].addedNodes.length) {
              touched = true;
              break;
            }
          }
          if (touched) schedule("safe-refresh", 120, function() {
            decorateScope(document.body, getSettings());
          });
        });
        return;
      }
      observe(document.body, { childList: true, subtree: true }, function(items) {
        var touched = false;
        for (var i = 0; i < items.length; i++) {
          if (items[i].addedNodes && items[i].addedNodes.length) {
            touched = true;
            break;
          }
        }
        if (touched) schedule("body-refresh", 50, function() {
          decorateScope(document.body, getSettings());
        });
      });
    }
    function settingsComponentSupported() {
      return window.Lampa && Lampa.SettingsApi && typeof Lampa.SettingsApi.addComponent === "function" && typeof Lampa.SettingsApi.addParam === "function";
    }
    function registerSettings() {
      if (state.settingsBound || !settingsComponentSupported()) return;
      state.settingsBound = true;
      ensureManifest();
      Lampa.SettingsApi.addComponent({
        component: plugin.id,
        name: "Интерфейс",
        icon: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4" width="18" height="4" rx="2" fill="currentColor"/><rect x="3" y="10" width="18" height="4" rx="2" fill="currentColor"/><rect x="3" y="16" width="18" height="4" rx="2" fill="currentColor"/></svg>'
      });
      addParam("enabled", "trigger", true, "Включить мод", "Обновляет карточки, постер и кнопки.", restart);
      addParam("accent", "select", defaults.accent, "Акцент", "Основной цвет плагина.", refreshAccent, {
        ocean: "Ocean",
        ember: "Ember",
        lime: "Lime",
        rose: "Rose",
        violet: "Violet"
      });
      addParam("card_style", "select", defaults.card_style, "Стиль карточек", "Визуальный режим карточек.", restart, {
        glass: "Glass",
        poster: "Poster",
        clean: "Clean"
      });
      addParam("button_layout", "select", defaults.button_layout, "Раскладка кнопок", "Отображение кнопок в полной карточке.", restart, {
        wrap: "Wrap",
        grid: "Grid",
        strip: "Strip"
      });
      addParam("compact_buttons", "trigger", defaults.compact_buttons, "Компактные кнопки", "Уменьшенные отступы в кнопках.", restart);
      addParam("movie_type", "trigger", defaults.movie_type, "Бейдж типа контента", "Добавляет метки фильм или сериал.", restart);
      addParam("seasons_badge", "select", defaults.seasons_badge, "Бейдж сезонов", "Информация о сезонах и эпизодах.", restart, {
        none: "Выключено",
        aired: "Сезоны и серии",
        total: "Только сезоны"
      });
      addParam("badge_position", "select", defaults.badge_position, "Позиция бейджей", "Где размещать стек бейджей.", restart, {
        "top-right": "Сверху справа",
        "top-left": "Сверху слева",
        "bottom-right": "Снизу справа",
        "bottom-left": "Снизу слева"
      });
      addParam("rating_palette", "trigger", defaults.rating_palette, "Подсветка рейтингов", "Окрашивает рейтинги по значению.", restart);
      addParam("rating_view", "select", defaults.rating_view, "Форма рейтинга", "Плашки или чистый текст.", restart, {
        pill: "Плашки",
        clean: "Текст"
      });
      addParam("colored_status", "trigger", defaults.colored_status, "Подсветка статусов", "Окрашивает статус релиза и возрастные метки.", restart);
      addParam("minimal", "trigger", defaults.minimal, "Минимализм", "Меньше блюра и визуального шума.", refreshAccent);
      addParam("motion", "select", defaults.motion, "Анимации", "Уровень движения интерфейса.", refreshAccent, {
        off: "Off",
        soft: "Soft",
        full: "Full"
      });
      addParam("focus_glow", "trigger", defaults.focus_glow, "Подсветка фокуса", "Дополнительный акцент на активных карточках.", refreshAccent);
      addParam("adaptive_badges", "trigger", defaults.adaptive_badges, "Адаптивные бейджи", "Светлый режим бейджей на ярких постерах.", restart);
      addParam("safe_mode", "trigger", defaults.safe_mode, "Safe mode", "Щадящий режим наблюдения за DOM.", restart);
      Lampa.SettingsApi.addParam({
        component: plugin.id,
        param: { name: "interface_mod_version", type: "static" },
        field: { name: "Версия", description: "Интерфейс " + plugin.version }
      });
    }
    function addParam(name, type, defaultValue, title, description, onChange, values) {
      var param = {
        component: plugin.id,
        param: {
          name: keys[name],
          type: type,
          default: defaultValue
        },
        field: {
          name: title,
          description: description
        },
        onChange: function(value) {
          storageSet(keys[name], value);
          if (onChange) onChange(value);
        }
      };
      if (values) param.param.values = values;
      Lampa.SettingsApi.addParam(param);
    }
    function refreshAccent() {
      schedule("accent-refresh", 20, refreshAll);
    }
    function start() {
      if (state.started) return;
      var settings = getSettings();
      setBodyFlags(settings);
      registerSettings();
      listenApp();
      if (!settings.enabled) {
        removeStyle("ifx-style");
        state.started = true;
        return;
      }
      setStyle("ifx-style", buildCss(settings));
      decorateScope(document.body, settings);
      bindObservers();
      state.started = true;
    }
    function waitForLampa() {
      if (!window.Lampa || !Lampa.SettingsApi || !Lampa.Listener) {
        setTimeout(waitForLampa, 250);
        return;
      }
      start();
    }
    waitForLampa();
  })();
})();
