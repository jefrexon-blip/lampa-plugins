(function () {
  'use strict';

  var URL = 'https://jefrexon-blip.github.io/lampa-plugins/pubtorr.js';
  var VERSION = '1.0.0-prod';

  function boot() {
    if (!window.Lampa || !Lampa.Utils || !Lampa.Utils.putScriptAsync) {
      return setTimeout(boot, 250);
    }

    if (window.__pubtorr_loader_loaded) return;
    window.__pubtorr_loader_loaded = true;

    Lampa.Utils.putScriptAsync([URL + '?v=' + encodeURIComponent(VERSION)], function () {
      try { console.log('[PubTorr] loaded', VERSION); } catch (e) {}
    });
  }

  boot();
})();
