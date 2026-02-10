(function () {
	'use strict';

	// Guard: если запускают не в браузере / не в Lampa — выходим
	if (typeof window === 'undefined' || typeof document === 'undefined') return;
	if (typeof Lampa === 'undefined') return;

	// =============================
	// Plugin meta
	// =============================
	var PLUGIN_ID = 'rating_kp_imdb';
	var PLUGIN_NAME = 'Рейтинг KP + IMDb';
	var PLUGIN_VERSION = '2.1.0';
	var PLUGIN_AUTHOR = 'jefrexon-blip';

	// Storage keys
	var KEY_ENABLED = 'rating_kpimdb_enabled';
	var KEY_SHOW_KP = 'rating_kpimdb_show_kp';
	var KEY_SHOW_IMDB = 'rating_kpimdb_show_imdb';

	// Defaults
	function getEnabled() { return Lampa.Storage.get(KEY_ENABLED, true); }
	function getShowKp() { return Lampa.Storage.get(KEY_SHOW_KP, true); }
	function getShowImdb() { return Lampa.Storage.get(KEY_SHOW_IMDB, true); }

	function setEnabled(v) { Lampa.Storage.set(KEY_ENABLED, !!v); }
	function setShowKp(v) { Lampa.Storage.set(KEY_SHOW_KP, !!v); }
	function setShowImdb(v) { Lampa.Storage.set(KEY_SHOW_IMDB, !!v); }

	// Register plugin (so it has a name in Lampa)
	try {
		Lampa.Plugin.create(PLUGIN_ID, {
			name: PLUGIN_NAME,
			description: 'Показывает рейтинги Кинопоиска и IMDb в карточке фильма/сериала.',
			version: PLUGIN_VERSION,
			author: PLUGIN_AUTHOR
		});
	} catch (e) {
		// если в какой-то сборке API другой — просто продолжаем, логика плагина всё равно отработает
	}

	// =============================
	// Settings UI
	// =============================
	(function initSettings() {
		if (!Lampa.SettingsApi || !Lampa.SettingsApi.addParam) return;

		// Компонент в настройках плагинов
		try {
			Lampa.SettingsApi.addComponent({
				component: PLUGIN_ID,
				name: PLUGIN_NAME,
				icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 17.3l-5.4 3 1-6.1-4.4-4.3 6.1-.9L12 3l2.7 5.9 6.1.9-4.4 4.3 1 6.1z"/></svg>'
			});
		} catch (e) {}

		// Включение/выключение
		Lampa.SettingsApi.addParam({
			component: PLUGIN_ID,
			param: {
				name: KEY_ENABLED,
				type: 'toggle',
				"default": true
			},
			field: {
				name: 'Включить плагин',
				description: 'Если выключено — рейтинги не будут запрашиваться и отображаться.'
			},
			onChange: function (value) {
				setEnabled(value);
			}
		});

		// Показ IMDb
		Lampa.SettingsApi.addParam({
			component: PLUGIN_ID,
			param: {
				name: KEY_SHOW_IMDB,
				type: 'toggle',
				"default": true
			},
			field: {
				name: 'Показывать IMDb',
				description: 'Показывать рейтинг IMDb (если доступен).'
			},
			onChange: function (value) {
				setShowImdb(value);
			}
		});

		// Показ KP
		Lampa.SettingsApi.addParam({
			component: PLUGIN_ID,
			param: {
				name: KEY_SHOW_KP,
				type: 'toggle',
				"default": true
			},
			field: {
				name: 'Показывать Кинопоиск',
				description: 'Показывать рейтинг Кинопоиска (если доступен).'
			},
			onChange: function (value) {
				setShowKp(value);
			}
		});

		// Версия (просто информативная строка)
		Lampa.SettingsApi.addParam({
			component: PLUGIN_ID,
			param: {
				name: 'rating_kpimdb_version',
				type: 'static',
				"default": ''
			},
			field: {
				name: 'Версия',
				description: PLUGIN_NAME + ' v' + PLUGIN_VERSION + ' • ' + PLUGIN_AUTHOR
			}
		});
	})();

	// =============================
	// Helpers
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
			).split(';').forEach(function (s) {
				res = res || endsWith(origin, s);
			});
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
		if (n <= 0) return null; // считаем 0 как “нет данных”
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

			var kp = null;
			var imdb = null;

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
	var TTL_OK = 24 * 60 * 60 * 1000;   // 24ч
	var TTL_FAIL = 10 * 60 * 1000;      // 10 мин

	function cacheGet(movieId) {
		var now = Date.now();
		var cache = Lampa.Storage.cache(CACHE_KEY, CACHE_LIMIT, {});
		var rec = cache[movieId];
		if (!rec) return null;

		var ttl = rec.ttl || TTL_OK;
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

	// =============================
	// Core: rating fetch + render
	// =============================
	function showRating(render, paramsId, data) {
		if (!render || !render.length || !render.closest('body').length) return;

		// защита от “не та карточка”
		try {
			var current = Lampa.Activity.active && Lampa.Activity.active();
			if (current && current.activity && current.activity.data && current.activity.data.movie) {
				var currentId = current.activity.data.movie.id;
				if (currentId && currentId !== paramsId) return;
			}
		} catch (e) {}

		var kpText = '-';
		var imdbText = '-';

		if (data) {
			if (typeof data.kp === 'number' && !isNaN(data.kp) && data.kp > 0) kpText = data.kp.toFixed(1);
			if (typeof data.imdb === 'number' && !isNaN(data.imdb) && data.imdb > 0) imdbText = data.imdb.toFixed(1);
		}

		$('.wait_rating', render).remove();

		// Tooltip с версией (это “в UI” на карточке, но ненавязчиво)
		var tip = PLUGIN_NAME + ' v' + PLUGIN_VERSION;

		// Применяем настройки отображения
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

	function rating_kp_imdb(card, render) {
		if (!getEnabled()) return;
		if (!getShowKp() && !getShowImdb()) return;

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

		var cached = cacheGet(params.id);
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
								var fail = cacheSet(params.id, { kp: null, imdb: null, ok: false }, TTL_FAIL);
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
					var fail2 = cacheSet(params.id, { kp: null, imdb: null, ok: false }, TTL_FAIL);
					showRating(render, params.id, fail2);
					done();
				},
				false,
				{ headers: params.headers }
			);
		}

		function chooseFilm(items) {
			if (!items || !items.length) {
				var nf = cacheSet(params.id, { kp: null, imdb: null, ok: false }, TTL_FAIL);
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
				var unsure = cacheSet(params.id, { kp: null, imdb: null, ok: false }, TTL_FAIL);
				showRating(render, params.id, unsure);
				done();
				return;
			}

			var id = cards[0].kp_id || cards[0].kinopoisk_id || cards[0].kinopoiskId || cards[0].filmId;

			network.clear();
			network.timeout(5000);

			network["native"](
				params.rating_url + id + '.xml',
				function (str) {
					var parsed = parseXmlRatings(str);
					if (parsed) {
						var ok = cacheSet(params.id, { kp: parsed.kp, imdb: parsed.imdb, ok: true }, TTL_OK);
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

			function base_search(kpId) {
				network.clear();
				network.timeout(7000);
				network.silent(
					params.url + 'api/v2.2/films/' + kpId,
					function (data) {
						var kp = safeNumber(data && data.ratingKinopoisk);
						var imdb = safeNumber(data && data.ratingImdb);

						var okFlag = (kp !== null) || (imdb !== null);
						var ttl = okFlag ? TTL_OK : TTL_FAIL;

						var saved = cacheSet(params.id, { kp: kp, imdb: imdb, ok: okFlag }, ttl);
						showRating(render, params.id, saved);
						done();
					},
					function () {
						var fail3 = cacheSet(params.id, { kp: null, imdb: null, ok: false }, TTL_FAIL);
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

			var render = e.object.activity.render();
			if (!render || !render.length) return;

			// Если оба выключены — ничего не делаем
			if (!getShowKp() && !getShowImdb()) return;

			// Не дублируем
			if ($('.wait_rating', render).length) return;

			// Если оба блока скрыты и мы собираемся их показать — ставим “ожидание”
			// (на некоторых темах Lampa уже рисует .rate--kp/.rate--imdb)
			$('.info__rate', render).after(
				'<div style="width:2em;margin-top:1em;margin-right:1em" class="wait_rating">' +
					'<div class="broadcast__scan"><div></div></div>' +
				'</div>'
			);

			// Сразу проставим "-" (чтобы было видно даже до ответа)
			showRating(render, e.data.movie && e.data.movie.id, { kp: null, imdb: null });

			// Запуск запроса
			rating_kp_imdb(e.data.movie, render);
		});
	}

	if (!window.rating_plugin) startPlugin();
})();
