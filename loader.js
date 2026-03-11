(function () {
  'use strict';

  var URL = 'https://jefrexon-blip.github.io/lampa-plugins/atlas.js';
  var VERSION = '1.0.0-prod';

  function boot() {
    if (!window.Lampa || !Lampa.Utils || !Lampa.Utils.putScriptAsync) {
      return setTimeout(boot, 250);
    }

    if (window.__atlas_loader_loaded) return;
    window.__atlas_loader_loaded = true;

    Lampa.Utils.putScriptAsync([URL + '?v=' + encodeURIComponent(VERSION)], function () {
      try { console.log('[Atlas] loaded', VERSION); } catch (e) {}
    });
  }

  boot();
})();
