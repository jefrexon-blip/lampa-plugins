(function () {
    'use strict';

    /** =========================================================
     *  InterFace MOD (production hardened, NO About/Donate)
     *  - no manifest overwrite
     *  - no leaks (observers tracked + stop/restart)
     *  - ES5-only
     *  - throttled DOM work
     *  - safer FullCard wrap (chain onCreate)
     *  ========================================================= */

    var InterFaceMod = {
        name: 'interface_mod',
        version: '2.4.0',
        debug: false,
        settings: {
            enabled: true,
            // Buttons layout inside full card: wrap|grid|strip
            buttons_layout: 'wrap',
            // Movie/TV badge
            show_movie_type: true,
            // Theme preset
            theme: 'default',
            // Dynamic accent color: auto|pink|cyan|purple|green|orange|blue
            accent: 'auto',
            // Ratings coloring
            colored_ratings: true,
            // Ratings style: text|badge
            ratings_style: 'badge',
            // Season/Episodes label mode: none|aired|total
            seasons_info_mode: 'aired',
            // Badges corner for full-card season label: top-right|top-left|bottom-right|bottom-left
            label_position: 'top-right',
            // Show all action buttons (organize)
            show_buttons: true,
            // Colorize status + age rating chips
            colored_elements: true,
            // Compact full-card buttons paddings
            compact_buttons: false,
            // Minimal UI mode (less visual noise)
            minimal_mode: false,
            // Motion level: off|soft|full
            motion: 'soft',
            // Cinematic hover / focus effects
            cinema_hover: true,
            // Adaptive badge contrast (try to detect poster brightness)
            adaptive_badges: true,
            // Safe mode: disables heavy effects/observers
            safe_mode: false
        },
        _runtime: {
            started: false,
            observers: [],
            styles: {},
            fullCardWrapped: false,
            throttles: {}
        }
    };

    /** =========================
     *  Small utilities (ES5)
     *  ========================= */
    function log() {
        if (!InterFaceMod.debug) return;
        try { console.log.apply(console, arguments); } catch (e) { }
    }

    function throttle(key, fn, wait) {
        var rt = InterFaceMod._runtime;
        if (!rt.throttles[key]) rt.throttles[key] = { t: null, last: 0 };
        var obj = rt.throttles[key];
        return function () {
            var now = Date.now();
            var args = arguments;

            if (obj.t) return;

            var diff = now - obj.last;
            if (diff >= wait) {
                obj.last = now;
                fn.apply(null, args);
            } else {
                obj.t = setTimeout(function () {
                    obj.t = null;
                    obj.last = Date.now();
                    fn.apply(null, args);
                }, wait - diff);
            }
        };
    }

    function addStyle(id, cssText) {
        removeStyle(id);
        var style = document.createElement('style');
        style.type = 'text/css';
        style.id = id;
        style.appendChild(document.createTextNode(cssText));
        document.head.appendChild(style);
        InterFaceMod._runtime.styles[id] = true;
    }

    function removeStyle(id) {
        var el = document.getElementById(id);
        if (el && el.parentNode) el.parentNode.removeChild(el);
        delete InterFaceMod._runtime.styles[id];
    }

    function trackObserver(obs) {
        InterFaceMod._runtime.observers.push(obs);
        return obs;
    }

    function stopAllObservers() {
        var list = InterFaceMod._runtime.observers;
        for (var i = 0; i < list.length; i++) {
            try { list[i].disconnect(); } catch (e) { }
        }
        InterFaceMod._runtime.observers = [];
    }

    function storageGet(key, def) {
        try {
            if (Lampa && Lampa.Storage && typeof Lampa.Storage.get === 'function') {
                var v = Lampa.Storage.get(key, def);
                return (typeof v === 'undefined' || v === null) ? def : v;
            }
        } catch (e) { }
        return def;
    }

    function storageSet(key, val) {
        try {
            if (Lampa && Lampa.Storage && typeof Lampa.Storage.set === 'function') {
                Lampa.Storage.set(key, val);
            }
        } catch (e) { }
    }

    function ensureOnceStartGuard() {
        if (InterFaceMod._runtime.started) return false;
        InterFaceMod._runtime.started = true;
        return true;
    }

    function clearLabelsInContainer($container) {
        try { $container.find('.season-info-label').remove(); } catch (e) { }
        try { $container.find('.ifm-content-label').remove(); } catch (e2) { }
        try { $container.children('.ifm-badges').remove(); } catch (e3) { }
    }

    function posToClass(pos) {
        return (pos === 'top-left') ? 'ifm-pos-tl' :
               (pos === 'bottom-right') ? 'ifm-pos-br' :
               (pos === 'bottom-left') ? 'ifm-pos-bl' : 'ifm-pos-tr';
    }

    function getBadgesContainer($poster, pos) {
        var cls = posToClass(pos || 'top-right');
        var $c = $poster.children('.ifm-badges.' + cls);
        if ($c.length) return $c;
        // remove other positions to avoid duplicates
        $poster.children('.ifm-badges').remove();
        $c = $('<div class="ifm-badges ' + cls + '"></div>');
        $poster.append($c);
        return $c;
    }

    function setBadgesContrast($poster, $container) {
        if (!InterFaceMod.settings.adaptive_badges) return;
        if (!$poster || !$container || !$container.length) return;

        $container.removeClass('ifm-contrast-dark ifm-contrast-light');

        // Try to sample poster image luminance (best effort).
        try {
            var img = $poster.find('img').get(0);
            if (!img || !img.naturalWidth || !img.naturalHeight) return;

            var canvas = document.createElement('canvas');
            var w = 24, h = 24;
            canvas.width = w; canvas.height = h;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            var data = ctx.getImageData(0, 0, w, h).data;

            var sum = 0;
            for (var i = 0; i < data.length; i += 4) {
                // Relative luminance approximation
                var r = data[i] / 255;
                var g = data[i + 1] / 255;
                var b = data[i + 2] / 255;
                var lum = (0.2126 * r + 0.7152 * g + 0.0722 * b);
                sum += lum;
            }
            var avg = sum / (data.length / 4);

            // Bright poster => dark badges, Dark poster => light badges
            if (avg > 0.60) $container.addClass('ifm-contrast-dark');
            else $container.addClass('ifm-contrast-light');
        } catch (e) {
            // Cross-origin images may taint canvas; ignore silently.
        }
    }

    function applyAccent(accent) {
        var a = accent || 'auto';
        var map = {
            auto: ['#4ea1ff', '#7c5cff'],
            pink: ['#fc00ff', '#ff4fd8'],
            cyan: ['#00dbde', '#12c2e9'],
            purple: ['#8a2387', '#6b6b83'],
            green: ['#43cea2', '#2ecc71'],
            orange: ['#f27121', '#ff6e7f'],
            blue: ['#12c2e9', '#4ea1ff']
        };
        var pair = map[a] || map.auto;
        try {
            document.body.style.setProperty('--ifm-accent', pair[0]);
            document.body.style.setProperty('--ifm-accent2', pair[1]);
        } catch (e) { }
    }

    function applyBodyFlags() {
        try {
            document.body.setAttribute('data-ifm-btn-layout', InterFaceMod.settings.buttons_layout || 'wrap');
            document.body.setAttribute('data-ifm-motion', InterFaceMod.settings.motion || 'soft');
            document.body.setAttribute('data-ifm-cinema', (InterFaceMod.settings.cinema_hover && InterFaceMod.settings.motion !== 'off' && !InterFaceMod.settings.safe_mode) ? '1' : '0');
            document.body.setAttribute('data-ifm-minimal', InterFaceMod.settings.minimal_mode ? '1' : '0');
            document.body.setAttribute('data-ifm-safe', InterFaceMod.settings.safe_mode ? '1' : '0');
        } catch (e) { }
    }


    /** =========================
     *  Themes
     *  ========================= */
    function applyTheme(theme) {
        removeStyle('interface_mod_theme');

        if (!theme || theme === 'default') return;

        
        // Premium themes are "soft": they primarily tune accents/focus/panels.
        // They intentionally avoid heavy global overrides to reduce conflicts.
        var themes = {
            pure_dark:
                "body{--ifm-accent:#4ea1ff;--ifm-accent2:#7c5cff;--ifm-panel:rgba(18,18,18,.92);--ifm-panel2:rgba(24,24,24,.92);--ifm-text:#fff;--ifm-border:rgba(255,255,255,.10);--ifm-shadow:rgba(0,0,0,.35);--ifm-blur:8px;--ifm-radius:12px;}" +
                "body{background:linear-gradient(180deg,#0b0b0c 0%,#0a0a0a 40%,#070708 100%);color:var(--ifm-text)}" +
                ".menu__item.focus,.menu__item.traverse,.menu__item.hover,.settings-folder.focus,.settings-param.focus,.selectbox-item.focus," +
                ".full-start__button.focus,.full-descr__tag.focus,.player-panel .button.focus{" +
                "background:linear-gradient(90deg,var(--ifm-accent),var(--ifm-accent2));color:#fff;box-shadow:0 10px 22px rgba(0,0,0,.35);border:none}" +
                ".card.focus .card__view::after,.card.hover .card__view::after{border:2px solid var(--ifm-accent);box-shadow:0 0 0 2px rgba(78,161,255,.18)}" +
                ".settings__content,.settings-input__content,.selectbox__content,.modal__content{background:var(--ifm-panel);border:1px solid var(--ifm-border)}",

            cinema_blue:
                "body{--ifm-accent:#2f80ff;--ifm-accent2:#00c2ff;--ifm-panel:rgba(8,18,32,.88);--ifm-panel2:rgba(10,22,40,.88);--ifm-text:#fff;" +
                "--ifm-border:rgba(47,128,255,.18);--ifm-shadow:rgba(0,0,0,.35);--ifm-blur:10px;--ifm-radius:12px;}" +
                "body{background:radial-gradient(1200px 700px at 20% 0%,rgba(47,128,255,.20) 0%,rgba(0,0,0,0) 60%)," +
                "linear-gradient(180deg,#070d18 0%,#04070d 100%);color:var(--ifm-text)}" +
                ".menu__item.focus,.menu__item.traverse,.menu__item.hover,.settings-folder.focus,.settings-param.focus,.selectbox-item.focus," +
                ".full-start__button.focus,.full-descr__tag.focus,.player-panel .button.focus{" +
                "background:linear-gradient(90deg,var(--ifm-accent),var(--ifm-accent2));color:#fff;box-shadow:0 10px 26px rgba(47,128,255,.18);border:none}" +
                ".card.focus .card__view::after,.card.hover .card__view::after{border:2px solid rgba(0,194,255,.9);box-shadow:0 0 0 2px rgba(0,194,255,.14)}" +
                ".settings__content,.settings-input__content,.selectbox__content,.modal__content{background:var(--ifm-panel);border:1px solid var(--ifm-border)}",

            glass_modern:
                "body{--ifm-accent:#a855f7;--ifm-accent2:#22d3ee;--ifm-panel:rgba(18,18,24,.70);--ifm-panel2:rgba(18,18,24,.55);" +
                "--ifm-text:#fff;--ifm-border:rgba(255,255,255,.14);--ifm-shadow:rgba(0,0,0,.32);--ifm-blur:14px;--ifm-radius:14px;}" +
                "body{background:radial-gradient(900px 520px at 10% 10%,rgba(168,85,247,.22) 0%,rgba(0,0,0,0) 60%)," +
                "radial-gradient(900px 520px at 90% 0%,rgba(34,211,238,.18) 0%,rgba(0,0,0,0) 55%)," +
                "linear-gradient(180deg,#0a0a12 0%,#05050a 100%);color:var(--ifm-text)}" +
                ".settings__content,.settings-input__content,.selectbox__content,.modal__content{background:var(--ifm-panel);border:1px solid var(--ifm-border);backdrop-filter:blur(var(--ifm-blur));}" +
                ".menu__item.focus,.menu__item.traverse,.menu__item.hover,.settings-folder.focus,.settings-param.focus,.selectbox-item.focus," +
                ".full-start__button.focus,.full-descr__tag.focus,.player-panel .button.focus{" +
                "background:linear-gradient(90deg,rgba(168,85,247,.85),rgba(34,211,238,.85));color:#fff;box-shadow:0 12px 28px rgba(0,0,0,.35);border:none}" +
                ".card.focus .card__view::after,.card.hover .card__view::after{border:2px solid rgba(168,85,247,.9);box-shadow:0 0 0 2px rgba(34,211,238,.12)}",

            // Legacy (kept for users who like it)
            neon:
                "body{background:linear-gradient(135deg,#0d0221 0%,#150734 50%,#1f0c47 100%);color:#fff}" +
                ".menu__item.focus,.menu__item.traverse,.menu__item.hover,.settings-folder.focus,.settings-param.focus," +
                ".selectbox-item.focus,.full-start__button.focus,.full-descr__tag.focus,.player-panel .button.focus{" +
                "background:linear-gradient(to right,#ff00ff,#00ffff);color:#fff;box-shadow:0 0 20px rgba(255,0,255,.4);" +
                "text-shadow:0 0 10px rgba(255,255,255,.5);border:none}" +
                ".card.focus .card__view::after,.card.hover .card__view::after{border:2px solid #ff00ff;box-shadow:0 0 20px #00ffff}" +
                ".head__action.focus,.head__action.hover{background:linear-gradient(45deg,#ff00ff,#00ffff);box-shadow:0 0 15px rgba(255,0,255,.3)}"
        };

        addStyle('interface_mod_theme', themes[theme] || '');
    }

    /** =========================
     *  Design system (badges / spacing / micro-animations)
     *  ========================= */
    function ensureDesignStyles() {
        // Base badge system + micro-animations + unified spacing. Insert once.
        var css =
            "body{--ifm-accent:var(--ifm-accent,#4ea1ff);--ifm-accent2:var(--ifm-accent2,#7c5cff);--ifm-panel:var(--ifm-panel,rgba(18,18,18,.92));" +
            "--ifm-border:var(--ifm-border,rgba(255,255,255,.12));--ifm-shadow:var(--ifm-shadow,rgba(0,0,0,.35));--ifm-text:var(--ifm-text,#fff);" +
            "--ifm-blur:var(--ifm-blur,10px);--ifm-radius:var(--ifm-radius,12px);--ifm-gap:8px;}" +

            "@keyframes ifmFadeUp{0%{opacity:0;transform:translateY(6px) scale(.98)}100%{opacity:1;transform:translateY(0) scale(1)}}" +
            "@keyframes ifmPulse{0%,100%{box-shadow:0 10px 22px var(--ifm-shadow)}50%{box-shadow:0 14px 28px rgba(0,0,0,.40)}}" +

            ".ifm-badge{display:inline-flex;flex-direction:column;gap:2px;align-items:center;justify-content:center;" +
            "padding:6px 10px;border-radius:var(--ifm-radius);color:var(--ifm-text);background:rgba(18,18,18,.55);" +
            "border:1px solid var(--ifm-border);backdrop-filter:blur(var(--ifm-blur));-webkit-backdrop-filter:blur(var(--ifm-blur));" +
            "box-shadow:0 10px 22px var(--ifm-shadow);text-align:center;line-height:1.15;white-space:nowrap;" +
            "animation:ifmFadeUp .22s ease-out both;}" +

            ".ifm-badge .ifm-sub{opacity:.85;font-size:12px}" +
            ".ifm-badge .ifm-main{font-weight:700;font-size:13px;letter-spacing:.2px}" +

            ".ifm-pos-tr{position:absolute;top:var(--ifm-gap);right:var(--ifm-gap)}" +
            ".ifm-pos-tl{position:absolute;top:var(--ifm-gap);left:var(--ifm-gap)}" +
            ".ifm-pos-br{position:absolute;bottom:var(--ifm-gap);right:var(--ifm-gap)}" +
            ".ifm-pos-bl{position:absolute;bottom:var(--ifm-gap);left:var(--ifm-gap)}" +

            // Season badge variants
            ".ifm-season.ifm-state-done{background:linear-gradient(135deg,rgba(16,120,88,.70),rgba(20,83,45,.65));}" +
            ".ifm-season.ifm-state-live{background:linear-gradient(135deg,rgba(245,158,11,.68),rgba(124,58,237,.55));}" +

            // Status & age badges
            ".ifm-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;" +
            "border:1px solid var(--ifm-border);backdrop-filter:blur(calc(var(--ifm-blur) - 2px));-webkit-backdrop-filter:blur(calc(var(--ifm-blur) - 2px));" +
            "box-shadow:0 8px 18px var(--ifm-shadow);font-weight:700;letter-spacing:.15px}" +

            ".ifm-status--completed{background:linear-gradient(135deg,rgba(16,120,88,.78),rgba(5,46,22,.65));color:#fff}" +
            ".ifm-status--canceled{background:linear-gradient(135deg,rgba(153,27,27,.80),rgba(69,10,10,.65));color:#fff}" +
            ".ifm-status--ongoing{background:linear-gradient(135deg,rgba(245,158,11,.82),rgba(234,88,12,.62));color:#111}" +
            ".ifm-status--production{background:linear-gradient(135deg,rgba(30,64,175,.82),rgba(14,116,144,.62));color:#fff}" +
            ".ifm-status--planned{background:linear-gradient(135deg,rgba(88,28,135,.82),rgba(67,56,202,.62));color:#fff}" +
            ".ifm-status--other{background:linear-gradient(135deg,rgba(71,85,105,.78),rgba(30,41,59,.62));color:#fff}" +

            ".ifm-age--kids{background:linear-gradient(135deg,rgba(16,185,129,.82),rgba(5,46,22,.62));color:#fff}" +
            ".ifm-age--children{background:linear-gradient(135deg,rgba(59,130,246,.82),rgba(30,64,175,.62));color:#fff}" +
            ".ifm-age--teens{background:linear-gradient(135deg,rgba(250,204,21,.86),rgba(234,179,8,.60));color:#111}" +
            ".ifm-age--almost{background:linear-gradient(135deg,rgba(249,115,22,.84),rgba(154,52,18,.62));color:#fff}" +
            ".ifm-age--adult{background:linear-gradient(135deg,rgba(239,68,68,.84),rgba(127,29,29,.62));color:#fff}" +

            // Movie/Serial outline labels
            ".ifm-content-label{position:absolute;top:var(--ifm-gap);left:var(--ifm-gap);display:inline-flex;align-items:center;gap:6px;" +
            "padding:5px 10px;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:.2px;" +
            "background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.18);backdrop-filter:blur(calc(var(--ifm-blur) - 2px));" +
            "box-shadow:0 10px 22px var(--ifm-shadow);color:#fff;animation:ifmFadeUp .18s ease-out both;}" +
            ".ifm-content-label.ifm-serial{border-color:rgba(47,128,255,.55)}" +
            ".ifm-content-label.ifm-movie{border-color:rgba(16,185,129,.55)}" +
            ".ifm-content-label .ifm-ico{font-size:13px;line-height:1}" +

            // Rating badge mode
            ".ifm-rate{display:inline-flex;align-items:center;justify-content:center;min-width:38px;padding:2px 8px;border-radius:999px;" +
            "border:1px solid rgba(255,255,255,.16);background:rgba(0,0,0,.18);backdrop-filter:blur(calc(var(--ifm-blur) - 2px));" +
            "box-shadow:0 8px 18px var(--ifm-shadow);font-weight:900;}" +

            // Buttons polish
            ".full-start-new__buttons,.full-start__buttons,.buttons-container{display:flex!important;flex-wrap:wrap!important;gap:10px!important;}" +
            ".full-start__button,.full-start-new__button,.button{border-radius:12px!important;transition:transform .12s ease,box-shadow .12s ease,background .12s ease;}" +
            ".full-start__button.focus,.full-start-new__button.focus,.button.focus{transform:scale(1.03);box-shadow:0 10px 24px rgba(0,0,0,.35)!important;}" +
            "body[data-ifm-compact-buttons='on'] .full-start__button,body[data-ifm-compact-buttons='on'] .full-start-new__button,body[data-ifm-compact-buttons='on'] .button{" +
            "padding-top:6px!important;padding-bottom:6px!important;min-height:34px!important;font-size:14px!important;}" +

            // Extra premium UX flags (motion/minimal/cinema/badges/buttons)
            "body[data-ifm-motion='off'] *{transition:none!important;animation:none!important;}body[data-ifm-motion='soft'] .ifm-glow{box-shadow:0 8px 24px rgba(0,0,0,.22)!important;}body[data-ifm-safe='1'] *{animation:none!important;}body[data-ifm-minimal='1'] .ifm-badge{backdrop-filter:none!important;box-shadow:none!important;}body[data-ifm-minimal='1'] .ifm-content-label{backdrop-filter:none!important;}body[data-ifm-cinema='1'] .card.focus .card__view,body[data-ifm-cinema='1'] .card.hover .card__view{transform:scale(1.02);}body[data-ifm-cinema='1'] .card.focus .card__view::after,body[data-ifm-cinema='1'] .card.hover .card__view::after{border-width:2px!important;}.ifm-badges{position:absolute;z-index:999;display:flex;flex-direction:column;gap:6px;pointer-events:none;}.ifm-badges.ifm-pos-tr{top:10px;right:10px;left:auto;bottom:auto;align-items:flex-end;}.ifm-badges.ifm-pos-tl{top:10px;left:10px;right:auto;bottom:auto;align-items:flex-start;}.ifm-badges.ifm-pos-br{bottom:10px;right:10px;left:auto;top:auto;align-items:flex-end;}.ifm-badges.ifm-pos-bl{bottom:10px;left:10px;right:auto;top:auto;align-items:flex-start;}.ifm-badges .ifm-badge,.ifm-badges .ifm-content-label{position:relative!important;top:auto!important;right:auto!important;bottom:auto!important;left:auto!important;margin:0!important;}.ifm-badges.ifm-contrast-dark .ifm-badge,.ifm-badges.ifm-contrast-dark .ifm-content-label{background:rgba(0,0,0,.62)!important;color:#fff!important;}.ifm-badges.ifm-contrast-light .ifm-badge,.ifm-badges.ifm-contrast-light .ifm-content-label{background:rgba(255,255,255,.70)!important;color:#101010!important;}body[data-ifm-btn-layout='strip'] .full-start-new__buttons,body[data-ifm-btn-layout='strip'] .full-start__buttons{flex-wrap:nowrap!important;overflow-x:auto!important;overflow-y:hidden!important;gap:10px!important;-webkit-overflow-scrolling:touch;}body[data-ifm-btn-layout='strip'] .full-start-new__buttons::-webkit-scrollbar,body[data-ifm-btn-layout='strip'] .full-start__buttons::-webkit-scrollbar{height:6px;}body[data-ifm-btn-layout='grid'] .full-start-new__buttons,body[data-ifm-btn-layout='grid'] .full-start__buttons{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important;}body[data-ifm-btn-layout='grid'] .full-start__button,body[data-ifm-btn-layout='grid'] .button{width:100%!important;}" +

            // Avoid negative offsets in posters
            ".card__view{position:relative;}";

        addStyle('interface_mod_design', css);
    }


    /** =========================
     *  Rating colors (throttled)
     *  ========================= */
    function applyColorByRating(el) {
        if (!el) return;
        var $el = $(el);
        var voteText = ($el.text() || '').trim();
        var match = voteText.match(/(\d+(\.\d+)?)/);
        if (!match) return;

        var vote = parseFloat(match[0]);
        if (isNaN(vote)) return;

        var style = (InterFaceMod.settings.ratings_style || 'badge');

        // Palette (premium)
        var cText = '';
        var cBg = '';

        if (vote >= 0 && vote <= 3) { cText = '#fff'; cBg = 'rgba(153, 27, 27, 0.78)'; }
        else if (vote > 3 && vote < 6) { cText = '#111'; cBg = 'rgba(234, 179, 8, 0.82)'; }
        else if (vote >= 6 && vote < 8) { cText = '#fff'; cBg = 'rgba(30, 64, 175, 0.78)'; }
        else if (vote >= 8 && vote <= 10) { cText = '#fff'; cBg = 'rgba(16, 120, 88, 0.78)'; }

        if (style === 'badge') {
            $el.addClass('ifm-rate');
            $el.css({ color: cText || '', 'background-color': cBg || '' });
        } else {
            $el.removeClass('ifm-rate');
            $el.css({ 'background-color': '' });
            // text-only color
            if (vote >= 0 && vote <= 3) $el.css('color', 'red');
            else if (vote > 3 && vote < 6) $el.css('color', 'orange');
            else if (vote >= 6 && vote < 8) $el.css('color', 'cornflowerblue');
            else if (vote >= 8 && vote <= 10) $el.css('color', 'lawngreen');
        }
    }

    function updateVoteColors() {
        if (!InterFaceMod.settings.colored_ratings) return;
        $('.card__vote').each(function () { applyColorByRating(this); });
        $('.full-start__rate, .full-start-new__rate').each(function () { applyColorByRating(this); });
        $('.info__rate, .card__imdb-rate, .card__kinopoisk-rate').each(function () { applyColorByRating(this); });
    }

    function enableVoteColors() {
        setTimeout(updateVoteColors, 200);

        var throttled = throttle('vote_colors', updateVoteColors, 250);

        var obs = trackObserver(new MutationObserver(function () {
            if (!InterFaceMod.settings.colored_ratings) return;
            throttled();
        }));

        obs.observe(document.body, { childList: true, subtree: true });

        Lampa.Listener.follow('full', function (data) {
            if (!InterFaceMod._runtime.started) return;
            if (!InterFaceMod.settings.colored_ratings) return;
            if (data && data.type === 'complite') setTimeout(updateVoteColors, 120);
        });
    }

    function disableVoteColors() {
        $('.card__vote, .full-start__rate, .full-start-new__rate, .info__rate, .card__imdb-rate, .card__kinopoisk-rate').css('color', '');
    }

    /** =========================
     *  Series status + age colors
     *  ========================= */
    function applyStatusColor(el) {
        var $el = $(el);
        var txt = ($el.text() || '').trim();

        var bg = '';
        var fg = '';

        if (txt.indexOf('Заверш') !== -1 || txt.indexOf('Ended') !== -1) { bg = 'rgba(46, 204, 113, 0.8)'; fg = 'white'; }
        else if (txt.indexOf('Отмен') !== -1 || txt.indexOf('Canceled') !== -1) { bg = 'rgba(231, 76, 60, 0.8)'; fg = 'white'; }
        else if (txt.indexOf('Онгоинг') !== -1 || txt.indexOf('Выход') !== -1 || txt.indexOf('В процессе') !== -1 || txt.indexOf('Return') !== -1) { bg = 'rgba(243, 156, 18, 0.8)'; fg = 'black'; }
        else if (txt.indexOf('производстве') !== -1 || txt.indexOf('Production') !== -1) { bg = 'rgba(52, 152, 219, 0.8)'; fg = 'white'; }
        else if (txt.indexOf('Запланировано') !== -1 || txt.indexOf('Planned') !== -1) { bg = 'rgba(155, 89, 182, 0.8)'; fg = 'white'; }
        else if (txt.indexOf('Пилотный') !== -1 || txt.indexOf('Pilot') !== -1) { bg = 'rgba(230, 126, 34, 0.8)'; fg = 'white'; }
        else if (txt.indexOf('Released') !== -1 || txt.indexOf('Выпущенный') !== -1) { bg = 'rgba(26, 188, 156, 0.8)'; fg = 'white'; }
        else if (txt.indexOf('Rumored') !== -1 || txt.indexOf('слух') !== -1) { bg = 'rgba(149, 165, 166, 0.8)'; fg = 'white'; }
        else if (txt.indexOf('Post') !== -1 || txt.indexOf('Скоро') !== -1) { bg = 'rgba(0, 188, 212, 0.8)'; fg = 'white'; }

        if (!bg) return;

        // Premium chip styling
        var cls = 'ifm-status--other';
        if (txt.indexOf('Заверш') !== -1 || txt.indexOf('Ended') !== -1) cls = 'ifm-status--completed';
        else if (txt.indexOf('Отмен') !== -1 || txt.indexOf('Canceled') !== -1) cls = 'ifm-status--canceled';
        else if (txt.indexOf('Онгоинг') !== -1 || txt.indexOf('Выход') !== -1 || txt.indexOf('В процессе') !== -1 || txt.indexOf('Return') !== -1) cls = 'ifm-status--ongoing';
        else if (txt.indexOf('производстве') !== -1 || txt.indexOf('Production') !== -1) cls = 'ifm-status--production';
        else if (txt.indexOf('Запланировано') !== -1 || txt.indexOf('Planned') !== -1) cls = 'ifm-status--planned';
        $el.removeClass('ifm-chip ifm-status--completed ifm-status--canceled ifm-status--ongoing ifm-status--production ifm-status--planned ifm-status--other');
        $el.addClass('ifm-chip ' + cls);
        $el.css({ 'background-color': '', 'color': '', 'border-radius': '', 'border': '', 'font-size': '', 'display': '' });
    }

    function applyAgeRatingColor(el) {
        var $el = $(el);
        var txt = ($el.text() || '').trim();

        var groups = {
            kids: ['G', 'TV-Y', 'TV-G', '0+', '3+', '0', '3'],
            children: ['PG', 'TV-PG', 'TV-Y7', '6+', '7+', '6', '7'],
            teens: ['PG-13', 'TV-14', '12+', '13+', '14+', '12', '13', '14'],
            almostAdult: ['R', 'TV-MA', '16+', '17+', '16', '17'],
            adult: ['NC-17', '18+', '18', 'X']
        };

        var colors = {
            kids: { bg: '#2ecc71', fg: 'white' },
            children: { bg: '#3498db', fg: 'white' },
            teens: { bg: '#f1c40f', fg: 'black' },
            almostAdult: { bg: '#e67e22', fg: 'white' },
            adult: { bg: '#e74c3c', fg: 'white' }
        };

        var g = null;
        var k, i;
        for (k in groups) {
            if (!groups.hasOwnProperty(k)) continue;

            if (groups[k].indexOf(txt) !== -1) { g = k; break; }

            for (i = 0; i < groups[k].length; i++) {
                if (txt.indexOf(groups[k][i]) !== -1) { g = k; break; }
            }
            if (g) break;
        }

        if (!g) return;

        var cls = (g === 'kids') ? 'ifm-age--kids' : (g === 'children') ? 'ifm-age--children' : (g === 'teens') ? 'ifm-age--teens' : (g === 'almost') ? 'ifm-age--almost' : 'ifm-age--adult';
        $el.removeClass('ifm-chip ifm-age--kids ifm-age--children ifm-age--teens ifm-age--almost ifm-age--adult');
        $el.addClass('ifm-chip ' + cls);
        $el.css({ 'background-color': '', 'color': '', 'border-radius': '', 'border': '', 'font-size': '', 'padding': '' });
    }

    function updateColoredElementsIn(scope) {
        if (!InterFaceMod.settings.colored_elements) return;
        var $root = scope ? $(scope) : $(document.body);
        $root.find('.full-start__status').each(function () { applyStatusColor(this); });
        $root.find('.full-start__pg').each(function () { applyAgeRatingColor(this); });
    }

    function enableColoredElements() {
        setTimeout(function () { updateColoredElementsIn(document.body); }, 200);

        var throttled = throttle('colored_elements', function () {
            updateColoredElementsIn(document.body);
        }, 250);

        var obs = trackObserver(new MutationObserver(function () {
            if (!InterFaceMod.settings.colored_elements) return;
            throttled();
        }));
        obs.observe(document.body, { childList: true, subtree: true });

        Lampa.Listener.follow('full', function (data) {
            if (!InterFaceMod._runtime.started) return;
            if (!InterFaceMod.settings.colored_elements) return;
            if (data && data.type === 'complite') {
                try { updateColoredElementsIn(data.object.activity.render()); } catch (e) { }
            }
        });
    }

    function disableColoredElements() {
        $('.full-start__status').css({
            'background-color': '',
            'color': '',
            'padding': '',
            'border-radius': '',
            'font-weight': '',
            'display': '',
            'font-size': '',
            'border': ''
        });
        $('.full-start__pg').css({
            'background-color': '',
            'color': '',
            'font-weight': '',
            'font-size': '',
            'border': '',
            'padding': '',
            'display': ''
        });
    }

    /** =========================
     *  Movie type labels (cards + full)
     *  ========================= */
    function ensureMovieTypeStyles() {
        // Uses design system classes (.ifm-content-label) - no negative offsets.
        addStyle('interface_mod_movie_type_styles',
            "body[data-movie-labels='on'] .card--tv .card__type{display:none!important}" +
            ".card__view{position:relative}" // ensure anchor
        );
    }

    function detectIsTVCard(cardEl) {
        var $card = $(cardEl);
        if ($card.hasClass('card--tv')) return true;

        var t1 = $card.attr('data-type');
        var t2 = $card.data('type');
        var t3 = $card.data('card_type');
        if (t1 === 'tv' || t2 === 'tv' || t3 === 'tv') return true;

        var txt = ($card.find('.card__type, .card__temp').text() || '');
        if (/(сезон|серия|серии|эпизод|ТВ|TV)/i.test(txt)) return true;

        return false;
    }

    function addLabelToCard(cardEl) {
        if (!InterFaceMod.settings.show_movie_type) return;

        var $card = $(cardEl);
        if ($card.find('.ifm-content-label').length) return;

        var $view = $card.find('.card__view');
        if (!$view.length) return;

        var isTV = detectIsTVCard(cardEl);

        var $label = $('<div class="ifm-content-label"></div>');
        if (isTV) {
            $label.addClass('ifm-serial');
            $label.append($('<span class="ifm-ico">📺</span>'));
            $label.append($('<span></span>').text('Сериал'));
        } else {
            $label.addClass('ifm-movie');
            $label.append($('<span class="ifm-ico">🎬</span>'));
            $label.append($('<span></span>').text('Фильм'));
        }

        $view.css('position','relative');
        var $stack = getBadgesContainer($view, 'top-left');
        $stack.append($label);
        setBadgesContrast($view, $stack);
    }

    function processCardsIn(scope) {
        if (!InterFaceMod.settings.show_movie_type) return;
        var $root = scope ? $(scope) : $(document.body);
        $root.find('.card').each(function () { addLabelToCard(this); });
    }

    function enableMovieTypeLabels() {
        ensureMovieTypeStyles();
        $('body').attr('data-movie-labels', InterFaceMod.settings.show_movie_type ? 'on' : 'off');

        setTimeout(function () { processCardsIn(document.body); }, 250);

        var throttled = throttle('movie_type_cards', function () {
            processCardsIn(document.body);
        }, 350);

        var obs = trackObserver(new MutationObserver(function (mutations) {
            if (!InterFaceMod.settings.show_movie_type) return;

            var need = false;
            for (var i = 0; i < mutations.length; i++) {
                var m = mutations[i];
                if (m.addedNodes && m.addedNodes.length) { need = true; break; }
            }
            if (need) throttled();
        }));

        obs.observe(document.body, { childList: true, subtree: true });

        Lampa.Listener.follow('full', function (data) {
            if (!InterFaceMod._runtime.started) return;
            if (!InterFaceMod.settings.show_movie_type) return;
            if (!data || data.type !== 'complite' || !data.data || !data.data.movie) return;

            try {
                var movie = data.data.movie;
                var isTV = !!(movie.number_of_seasons > 0 || movie.seasons || movie.season_count > 0 || movie.type === 'tv' || movie.card_type === 'tv');

                var $poster = $(data.object.activity.render()).find('.full-start__poster, .full-start-new__poster').first();
                if (!$poster.length) return;

                $poster.find('.ifm-content-label').remove();

                var pos = (InterFaceMod.settings.label_position || 'top-right');
                    $poster.css('position', 'relative');

                    // Put all poster badges into one stack container
                    var $stack = getBadgesContainer($poster, pos);

                    var $label = $('<div class="ifm-content-label ifm-badge ifm-type"></div>');
                    if (isTV) $label.addClass('ifm-state-live').text('Сериал');
                    else $label.addClass('ifm-state-done').text('Фильм');

                    $stack.append($label);
                    setBadgesContrast($poster, $stack);
            } catch (e) { }
        });
    }

    function disableMovieTypeLabels() {
        $('body').attr('data-movie-labels', 'off');
        $('.ifm-content-label').remove();
        removeStyle('interface_mod_movie_type_styles');
    }

    /** =========================
     *  Season/Episodes info label (full card)
     *  ========================= */
    function plural(number, one, two, five) {
        var n = Math.abs(number);
        n = n % 100;
        if (n >= 5 && n <= 20) return five;
        n = n % 10;
        if (n === 1) return one;
        if (n >= 2 && n <= 4) return two;
        return five;
    }

    function getStatusText(status) {
        if (status === 'Ended') return 'Завершён';
        if (status === 'Canceled') return 'Отменён';
        if (status === 'Returning Series') return 'Выходит';
        if (status === 'In Production') return 'В производстве';
        return status || 'Неизвестно';
    }

    function computeAired(movie) {
        var totalSeasons = movie.number_of_seasons || 0;
        var totalEpisodes = movie.number_of_episodes || 0;

        var airedSeasons = 0;
        var airedEpisodes = 0;

        if (movie.last_episode_to_air) {
            airedSeasons = movie.last_episode_to_air.season_number || 0;
            airedEpisodes = 0;

            if (movie.seasons && movie.seasons.length) {
                var lastS = movie.last_episode_to_air.season_number || 0;
                var lastE = movie.last_episode_to_air.episode_number || 0;

                for (var i = 0; i < movie.seasons.length; i++) {
                    var s = movie.seasons[i];
                    if (!s || s.season_number === 0) continue;
                    if (s.season_number < lastS) airedEpisodes += (s.episode_count || 0);
                    else if (s.season_number === lastS) airedEpisodes += lastE;
                }
            } else {
                airedEpisodes = movie.last_episode_to_air.episode_number || 0;
            }
        }

        if (!airedSeasons && totalSeasons) airedSeasons = totalSeasons;
        if (!airedEpisodes && totalEpisodes) airedEpisodes = totalEpisodes;

        if (totalEpisodes && airedEpisodes > totalEpisodes) airedEpisodes = totalEpisodes;

        return {
            totalSeasons: totalSeasons,
            totalEpisodes: totalEpisodes,
            airedSeasons: airedSeasons,
            airedEpisodes: airedEpisodes
        };
    }

    function buildSeasonInfoLabel(movie) {
        if (InterFaceMod.settings.seasons_info_mode === 'none') return null;

        var st = movie.status;
        var isCompleted = (st === 'Ended' || st === 'Canceled');
        var bgColor = isCompleted ? 'rgba(33, 150, 243, 0.8)' : 'rgba(244, 67, 54, 0.8)';

        var info = computeAired(movie);

        var displaySeasons = 0;
        var displayEpisodes = 0;

        if (InterFaceMod.settings.seasons_info_mode === 'aired') {
            displaySeasons = info.airedSeasons;
            displayEpisodes = info.airedEpisodes;
        } else {
            displaySeasons = info.totalSeasons;
            displayEpisodes = info.totalEpisodes;
        }

        var seasonsText = plural(displaySeasons, 'сезон', 'сезона', 'сезонов');
        var episodesText = plural(displayEpisodes, 'серия', 'серии', 'серий');

        var $el = $('<div class="season-info-label"></div>');

        if (isCompleted) {
            $el.append($('<div></div>').text(displaySeasons + ' ' + seasonsText + ' ' + displayEpisodes + ' ' + episodesText));
            $el.append($('<div></div>').text(getStatusText(st)));
        } else {
            if (InterFaceMod.settings.seasons_info_mode === 'aired' && info.totalEpisodes > 0 && info.airedEpisodes > 0 && info.airedEpisodes < info.totalEpisodes) {
                $el.append($('<div></div>').text(displaySeasons + ' ' + seasonsText + ' ' + info.airedEpisodes + ' ' + episodesText + ' из ' + info.totalEpisodes));
            } else {
                $el.append($('<div></div>').text(displaySeasons + ' ' + seasonsText + ' ' + displayEpisodes + ' ' + episodesText));
            }
        }

        var position = InterFaceMod.settings.label_position || 'top-right';
        var posClass = (position === 'top-left') ? 'ifm-pos-tl' :
                       (position === 'bottom-right') ? 'ifm-pos-br' :
                       (position === 'bottom-left') ? 'ifm-pos-bl' : 'ifm-pos-tr';

        // Upgrade to premium glass badge
        $el.addClass('ifm-badge ifm-season ' + posClass + ' ' + (isCompleted ? 'ifm-state-done' : 'ifm-state-live'));

        // Tag first/second line for typography
        var $kids = $el.children();
        if ($kids && $kids.length) {
            $kids.eq(0).addClass('ifm-main');
            if ($kids.length > 1) $kids.eq(1).addClass('ifm-sub');
        }

        // Keep above poster artwork
        $el.css({ 'z-index': '999' });

        return $el;
    }

    function enableSeasonInfo() {
        Lampa.Listener.follow('full', function (data) {
            if (!InterFaceMod._runtime.started) return;
            if (!data || data.type !== 'complite' || !data.data || !data.data.movie) return;

            var movie = data.data.movie;
            if (!movie || !movie.number_of_seasons) return;
            if (InterFaceMod.settings.seasons_info_mode === 'none') return;

            if (!data || data.type !== 'complite' || !data.data || !data.data.movie) return;

            var movie = data.data.movie;
            if (!movie || !movie.number_of_seasons) return;
            if (InterFaceMod.settings.seasons_info_mode === 'none') return;

            try {
                var $root = $(data.object.activity.render());
                var $poster = $root.find('.full-start-new__poster, .full-start__poster').first();
                if (!$poster.length) return;

                $poster.css('position', 'relative');
                clearLabelsInContainer($poster);

                var $label = buildSeasonInfoLabel(movie);
                if ($label) {
                    $poster.css('position','relative');
                    var $stack = getBadgesContainer($poster, (InterFaceMod.settings.label_position || 'top-right'));
                    $stack.append($label);
                    setBadgesContrast($poster, $stack);
                }
            } catch (e) { }
        });
    }

    function disableSeasonInfo() {
        $('.season-info-label').remove();
    }

    /** =========================
     *  Buttons organizer (safer)
     *  ========================= */
    function ensureButtonsStyle() {
        addStyle('interface_mod_buttons_style',
            ".full-start-new__buttons,.full-start__buttons{display:flex!important;flex-wrap:wrap!important;gap:10px!important}"
        );
    }

    function findButtonsContainer($root) {
        var $c = $root.find('.full-start-new__buttons');
        if ($c.length) return $c;
        $c = $root.find('.full-start__buttons');
        if ($c.length) return $c;
        $c = $root.find('.buttons-container');
        if ($c.length) return $c;
        return $();
    }

    function collectButtons($root) {
        var selectors = [
            '.buttons--container .full-start__button',
            '.full-start-new__buttons .full-start__button',
            '.full-start__buttons .full-start__button',
            '.buttons-container .button',
            '.full-start-new__buttons .button',
            '.full-start__buttons .button'
        ];

        var all = [];
        var seen = {};
        for (var i = 0; i < selectors.length; i++) {
            $root.find(selectors[i]).each(function () {
                var txt = ($(this).text() || '').trim();
                if (!txt) return;
                if (seen[txt]) return;
                seen[txt] = true;
                all.push(this);
            });
        }
        return all;
    }

    function categorizeButton(btn) {
        var cls = (btn.className || '');
        if (cls.indexOf('online') !== -1) return 'online';
        if (cls.indexOf('torrent') !== -1) return 'torrent';
        if (cls.indexOf('trailer') !== -1) return 'trailer';
        return 'other';
    }

    function organizeButtonsIn(rootEl) {
        if (!InterFaceMod.settings.show_buttons) return;
        if (!rootEl) return;

        var $root = $(rootEl);
        var $container = findButtonsContainer($root);
        if (!$container.length) return;

        var buttons = collectButtons($root);
        if (!buttons.length) return;

        var categories = { online: [], torrent: [], trailer: [], other: [] };
        for (var i = 0; i < buttons.length; i++) {
            var cat = categorizeButton(buttons[i]);
            categories[cat].push(buttons[i]);
        }

        $container.css({ display: 'flex', flexWrap: 'wrap', gap: '10px' });

        $(buttons).each(function () {
            try { $(this).detach(); } catch (e) { }
        });

        var order = ['online', 'torrent', 'trailer', 'other'];
        for (var o = 0; o < order.length; o++) {
            var arr = categories[order[o]];
            for (var j = 0; j < arr.length; j++) $container.append(arr[j]);
        }

        try {
            var needToggle = Lampa.Controller && Lampa.Controller.enabled && Lampa.Controller.enabled().name === 'full_start';
            if (needToggle) {
                Lampa.Controller.toggle('settings_component');
                setTimeout(function () { Lampa.Controller.toggle('full_start'); }, 100);
            }
        } catch (e2) { }
    }

    function wrapFullCardOnce() {
        if (InterFaceMod._runtime.fullCardWrapped) return;
        if (!Lampa.FullCard || !Lampa.FullCard.build) return;

        var origin = Lampa.FullCard.build;
        Lampa.FullCard.build = function (data) {
            var card = origin(data);

            var prevOnCreate = card.onCreate;
            card.onCreate = function () {
                try { if (typeof prevOnCreate === 'function') prevOnCreate.apply(card, arguments); } catch (e) { }
                if (!InterFaceMod._runtime.started) return;
                if (!InterFaceMod.settings.show_buttons) return;

                setTimeout(function () {
                    try {
                        if (card && card.activity && card.activity.render) organizeButtonsIn(card.activity.render());
                    } catch (e2) { }
                }, 250);
            };

            return card;
        };

        InterFaceMod._runtime.fullCardWrapped = true;
    }

    function enableButtonsOrganizer() {
        ensureButtonsStyle();
        wrapFullCardOnce();

        Lampa.Listener.follow('full', function (e) {
            if (!InterFaceMod._runtime.started) return;
            if (!InterFaceMod.settings.show_buttons) return;
            if (!e || e.type !== 'complite' || !e.object || !e.object.activity) return;

            setTimeout(function () {
                try { organizeButtonsIn(e.object.activity.render()); } catch (err) { }
            }, 300);
        });

        var throttled = throttle('buttons_org', function () {
            try {
                if (Lampa.Activity && Lampa.Activity.active && Lampa.Activity.active()) {
                    var act = Lampa.Activity.active();
                    if (act && act.activity && act.activity.render) organizeButtonsIn(act.activity.render());
                }
            } catch (e) { }
        }, 350);

        var obs = trackObserver(new MutationObserver(function (mutations) {
            if (!InterFaceMod.settings.show_buttons) return;

            var need = false;
            for (var i = 0; i < mutations.length; i++) {
                var m = mutations[i];
                if (m.type === 'childList' && m.addedNodes && m.addedNodes.length) { need = true; break; }
            }
            if (need) throttled();
        }));

        obs.observe(document.body, { childList: true, subtree: true });
    }

    /** =========================
     *  Settings + ordering
     *  ========================= */
    function loadSettings() {
        InterFaceMod.settings.show_buttons = storageGet('interface_mod_show_buttons', true);
        InterFaceMod.settings.show_movie_type = storageGet('interface_mod_show_movie_type', true);

        InterFaceMod.settings.theme = storageGet('interface_mod_theme_select', 'default');
        InterFaceMod.settings.accent = storageGet('interface_mod_accent', 'auto');

        InterFaceMod.settings.colored_ratings = storageGet('interface_mod_colored_ratings', true);
        InterFaceMod.settings.ratings_style = storageGet('interface_mod_ratings_style', 'badge');

        InterFaceMod.settings.compact_buttons = storageGet('interface_mod_compact_buttons', false);
        InterFaceMod.settings.buttons_layout = storageGet('interface_mod_buttons_layout', 'wrap');

        InterFaceMod.settings.colored_elements = storageGet('interface_mod_colored_elements', true);

        InterFaceMod.settings.seasons_info_mode = storageGet('interface_mod_seasons_info_mode', 'aired');
        InterFaceMod.settings.label_position = storageGet('interface_mod_label_position', 'top-right');

        InterFaceMod.settings.minimal_mode = storageGet('interface_mod_minimal_mode', false);
        InterFaceMod.settings.motion = storageGet('interface_mod_motion', 'soft');
        InterFaceMod.settings.cinema_hover = storageGet('interface_mod_cinema_hover', true);
        InterFaceMod.settings.adaptive_badges = storageGet('interface_mod_adaptive_badges', true);
        InterFaceMod.settings.safe_mode = storageGet('interface_mod_safe_mode', false);

        InterFaceMod.settings.enabled = (InterFaceMod.settings.seasons_info_mode !== 'none');
    }

    
    function registerSettings() {
        Lampa.SettingsApi.addComponent({
            component: 'interface_mod',
            name: 'Интерфейс мод',
            icon:
                '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                '<path d="M4 5C4 4.44772 4.44772 4 5 4H19C19.5523 4 20 4.44772 20 5V7C20 7.55228 19.5523 8 19 8H5C4.44772 8 4 7.55228 4 7V5Z" fill="currentColor"/>' +
                '<path d="M4 11C4 10.4477 4.44772 10 5 10H19C19.5523 10 20 10.4477 20 11V13C20 13.5523 19.5523 14 19 14H5C4.44772 14 4 13.5523 4 13V11Z" fill="currentColor"/>' +
                '<path d="M4 17C4 16.4477 4.44772 16 5 16H19C19.5523 16 20 16.4477 20 17V19C20 19.5523 19.5523 20 19 20H5C4.44772 20 4 19.5523 4 19V17Z" fill="currentColor"/>' +
                '</svg>'
        });

        function save(key, value) { try { Lampa.Storage.set(key, value); } catch (e) { } }
        function saveRestart(key, value) { save(key, value); restartRuntime(); }
        function saveSoft(key, value) { save(key, value); loadSettings(); applyAccent(InterFaceMod.settings.accent); applyBodyFlags(); }

        Lampa.SettingsApi.addParam({
            component: 'interface_mod',
            param: {
                name: 'interface_mod_seasons_info_mode',
                type: 'select',
                values: { none: 'Выключить', aired: 'Актуальная информация', total: 'Полное количество' },
                default: 'aired'
            },
            field: {
                name: 'Информация о сериях',
                description: 'Лейбл сезоны/серии на постере в карточке'
            },
            onChange: function (value) { saveRestart('interface_mod_seasons_info_mode', value); }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface_mod',
            param: {
                name: 'interface_mod_label_position',
                type: 'select',
                values: {
                    'top-right': 'Верхний правый',
                    'top-left': 'Верхний левый',
                    'bottom-right': 'Нижний правый',
                    'bottom-left': 'Нижний левый'
                },
                default: 'top-right'
            },
            field: {
                name: 'Позиция лейблов',
                description: 'Куда ставить стек лейблов на постере'
            },
            onChange: function (value) { saveRestart('interface_mod_label_position', value); }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface_mod',
            param: { name: 'interface_mod_show_movie_type', type: 'trigger', default: true },
            field: { name: 'Лейблы Фильм/Сериал', description: 'Меняет TV на Сериал и добавляет Фильм' },
            onChange: function (value) { saveRestart('interface_mod_show_movie_type', value); }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface_mod',
            param: {
                name: 'interface_mod_theme_select',
                type: 'select',
                values: {
                    default: 'Нет',
                    bywolf_mod: 'Bywolf_mod',
                    dark_night: 'Dark Night',
                    blue_cosmos: 'Blue Cosmos',
                    neon: 'Neon',
                    sunset: 'Dark MOD',
                    emerald: 'Emerald',
                    aurora: 'Aurora'
                },
                default: 'default'
            },
            field: { name: 'Тема интерфейса', description: 'Глобальная тема (аккуратно: влияет на UI)' },
            onChange: function (value) { saveRestart('interface_mod_theme_select', value); }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface_mod',
            param: {
                name: 'interface_mod_accent',
                type: 'select',
                values: { auto: 'Auto', pink: 'Pink', cyan: 'Cyan', purple: 'Purple', green: 'Green', orange: 'Orange', blue: 'Blue' },
                default: 'auto'
            },
            field: { name: 'Акцент', description: 'Цвет свечения/границ/бейджей (динамически)' },
            onChange: function (value) { saveSoft('interface_mod_accent', value); }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface_mod',
            param: { name: 'interface_mod_colored_ratings', type: 'trigger', default: true },
            field: { name: 'Цветные рейтинги', description: 'Подсветка рейтинга по значению' },
            onChange: function (value) { saveRestart('interface_mod_colored_ratings', value); }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface_mod',
            param: { name: 'interface_mod_ratings_style', type: 'select', values: { badge: 'Бейдж', text: 'Текст' }, default: 'badge' },
            field: { name: 'Стиль рейтинга', description: 'Бейдж компактнее и лучше читается' },
            onChange: function (value) { saveRestart('interface_mod_ratings_style', value); }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface_mod',
            param: { name: 'interface_mod_colored_elements', type: 'trigger', default: true },
            field: { name: 'Цветные статусы и PG', description: 'Статус сериала и возрастной рейтинг цветными' },
            onChange: function (value) { saveRestart('interface_mod_colored_elements', value); }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface_mod',
            param: { name: 'interface_mod_show_buttons', type: 'trigger', default: true },
            field: { name: 'Показывать все кнопки', description: 'Собирает все действия в один блок' },
            onChange: function (value) { saveRestart('interface_mod_show_buttons', value); }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface_mod',
            param: { name: 'interface_mod_buttons_layout', type: 'select', values: { wrap: 'Wrap', grid: 'Grid 2x', strip: 'Лента' }, default: 'wrap' },
            field: { name: 'Раскладка кнопок', description: 'Wrap — стандарт, Grid — компактно, Лента — горизонтально' },
            onChange: function (value) { saveRestart('interface_mod_buttons_layout', value); }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface_mod',
            param: { name: 'interface_mod_compact_buttons', type: 'trigger', default: false },
            field: { name: 'Компактные кнопки', description: 'Меньше паддинги / больше кнопок на экран' },
            onChange: function (value) { saveRestart('interface_mod_compact_buttons', value); }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface_mod',
            param: { name: 'interface_mod_minimal_mode', type: 'trigger', default: false },
            field: { name: 'Минимал режим', description: 'Меньше теней/блюра, чище интерфейс' },
            onChange: function (value) { saveSoft('interface_mod_minimal_mode', value); }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface_mod',
            param: { name: 'interface_mod_motion', type: 'select', values: { off: 'Off', soft: 'Soft', full: 'Full' }, default: 'soft' },
            field: { name: 'Анимации', description: 'Off выключает все движения' },
            onChange: function (value) { saveSoft('interface_mod_motion', value); }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface_mod',
            param: { name: 'interface_mod_cinema_hover', type: 'trigger', default: true },
            field: { name: 'Cinematic hover', description: 'Лёгкий зум/акцент на фокусе' },
            onChange: function (value) { saveSoft('interface_mod_cinema_hover', value); }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface_mod',
            param: { name: 'interface_mod_adaptive_badges', type: 'trigger', default: true },
            field: { name: 'Адаптивные бейджи', description: 'Пытается подбирать контраст под постер' },
            onChange: function (value) { saveRestart('interface_mod_adaptive_badges', value); }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface_mod',
            param: { name: 'interface_mod_safe_mode', type: 'trigger', default: false },
            field: { name: 'Safe mode', description: 'Отключает тяжёлые эффекты и снижает нагрузку' },
            onChange: function (value) { saveRestart('interface_mod_safe_mode', value); }
        });

        // Move after native Interface settings
        Lampa.Settings.listener.follow('open', function () {
            setTimeout(function () {
                var $mod = $('.settings-folder[data-component="interface_mod"]');
                var $std = $('.settings-folder[data-component="interface"]');
                if ($mod.length && $std.length) $mod.insertAfter($std);
            }, 100);
        });
    }

function startPlugin() {
        if (!ensureOnceStartGuard()) return;

        loadSettings();
        registerSettings();
        registerManifest();

        startRuntime();

        window.interface_mod = InterFaceMod;
        log('[InterfaceMod] started', InterFaceMod.version, InterFaceMod.settings);
    }

    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event && event.type === 'ready') startPlugin();
        });
    }
})();