/******/ (() => { // webpackBootstrap
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
// Service Worker - 백그라운드 작업 처리
// 환경별 서버 URL 설정
var BackgroundService = /*#__PURE__*/function () {
  function BackgroundService() {
    _classCallCheck(this, BackgroundService);
    // 환경별 서버 URL (실제 배포 시 수정 가능)
    this.serverUrl = this.getServerUrl();
    this.init();
  }

  /**
   * 환경별 서버 URL 결정
   */
  return _createClass(BackgroundService, [{
    key: "getServerUrl",
    value: function getServerUrl() {
      // Chrome Extension에서는 location을 직접 사용할 수 없으므로
      // chrome.management API를 통해 개발 모드 확인
      return chrome.runtime.getManifest().version.includes('dev') || chrome.runtime.getManifest().name.includes('개발') ? 'http://localhost:3000' : 'https://api.yourdomain.com'; // 프로덕션 URL로 변경
    }
  }, {
    key: "init",
    value: function init() {
      var _this = this;
      // 확장프로그램 설치 시 (정말 설치일 때만!)
      chrome.runtime.onInstalled.addListener(function (details) {
        console.log('Service Worker 시작, 이유:', details.reason);
        if (details.reason === 'install') {
          console.log('⚡ 실제 설치: 기본 설정 초기화');
          _this.handleInstall();
        } else if (details.reason === 'update') {
          console.log('⚡ 업데이트: 설정 유지');
          _this.handleUpdate(details.previousVersion);
        } else {
          console.log('⚡ 재시작: 설정 그대로 유지');
          // 재시작 시에는 설정을 건드리지 않음
        }
      });

      // 메시지 수신
      chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        _this.handleMessage(request, sender, sendResponse);
        return true; // 비동기 응답을 위해 필요
      });

      // 컨텍스트 메뉴 생성
      this.createContextMenus();

      // 주기적 작업 스케줄링
      this.schedulePeriodicTasks();
    }
  }, {
    key: "handleInstall",
    value: function handleInstall() {
      console.log('InsightReel이 설치되었습니다.');

      // 올바른 설정 키와 구조 사용
      chrome.storage.sync.set({
        videosaverSettings: {
          autoAnalysis: false,
          // 기본값 false (팝업과 일치)
          autoSave: true,
          showNotifications: true
        },
        serverUrl: this.serverUrl
      });

      // 환영 페이지 표시 (선택사항)
      // chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
    }
  }, {
    key: "handleUpdate",
    value: function handleUpdate(previousVersion) {
      console.log("\uD655\uC7A5\uD504\uB85C\uADF8\uB7A8\uC774 ".concat(previousVersion, "\uC5D0\uC11C \uC5C5\uB370\uC774\uD2B8\uB418\uC5C8\uC2B5\uB2C8\uB2E4."));
      // 업데이트 로직
    }
  }, {
    key: "handleMessage",
    value: function () {
      var _handleMessage = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(request, sender, sendResponse) {
        var _t, _t2;
        return _regenerator().w(function (_context) {
          while (1) switch (_context.p = _context.n) {
            case 0:
              _context.p = 0;
              _t = request.action;
              _context.n = _t === 'downloadVideo' ? 1 : _t === 'testServer' ? 3 : _t === 'getSettings' ? 5 : _t === 'saveSettings' ? 7 : 9;
              break;
            case 1:
              _context.n = 2;
              return this.downloadVideo(request.data, sendResponse);
            case 2:
              return _context.a(3, 10);
            case 3:
              _context.n = 4;
              return this.testServerConnection(sendResponse);
            case 4:
              return _context.a(3, 10);
            case 5:
              _context.n = 6;
              return this.getSettings(sendResponse);
            case 6:
              return _context.a(3, 10);
            case 7:
              _context.n = 8;
              return this.saveSettings(request.data, sendResponse);
            case 8:
              return _context.a(3, 10);
            case 9:
              sendResponse({
                error: '알 수 없는 액션입니다.'
              });
            case 10:
              _context.n = 12;
              break;
            case 11:
              _context.p = 11;
              _t2 = _context.v;
              console.error('메시지 처리 실패:', _t2);
              sendResponse({
                error: _t2.message
              });
            case 12:
              return _context.a(2);
          }
        }, _callee, this, [[0, 11]]);
      }));
      function handleMessage(_x, _x2, _x3) {
        return _handleMessage.apply(this, arguments);
      }
      return handleMessage;
    }()
  }, {
    key: "createContextMenus",
    value: function createContextMenus() {
      var _this2 = this;
      chrome.contextMenus.create({
        id: 'saveVideo',
        title: '이 영상 저장 및 분석',
        contexts: ['video'],
        documentUrlPatterns: ['https://www.instagram.com/*', 'https://www.tiktok.com/*']
      });
      chrome.contextMenus.create({
        id: 'openSpreadsheet',
        title: '분석 결과 스프레드시트 열기',
        contexts: ['page'],
        documentUrlPatterns: ['https://www.instagram.com/*', 'https://www.tiktok.com/*']
      });

      // 컨텍스트 메뉴 클릭 처리
      chrome.contextMenus.onClicked.addListener(function (info, tab) {
        _this2.handleContextMenuClick(info, tab);
      });
    }
  }, {
    key: "handleContextMenuClick",
    value: function () {
      var _handleContextMenuClick = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(info, tab) {
        var settings, _t3;
        return _regenerator().w(function (_context2) {
          while (1) switch (_context2.n) {
            case 0:
              _t3 = info.menuItemId;
              _context2.n = _t3 === 'saveVideo' ? 1 : _t3 === 'openSpreadsheet' ? 2 : 4;
              break;
            case 1:
              // 현재 탭의 content script에 메시지 전송
              chrome.tabs.sendMessage(tab.id, {
                action: 'saveCurrentVideo',
                videoUrl: info.srcUrl
              });
              return _context2.a(3, 4);
            case 2:
              _context2.n = 3;
              return this.getStoredSettings();
            case 3:
              settings = _context2.v;
              if (settings.spreadsheetUrl) {
                chrome.tabs.create({
                  url: settings.spreadsheetUrl
                });
              } else {
                this.showNotification('스프레드시트가 아직 생성되지 않았습니다.');
              }
              return _context2.a(3, 4);
            case 4:
              return _context2.a(2);
          }
        }, _callee2, this);
      }));
      function handleContextMenuClick(_x4, _x5) {
        return _handleContextMenuClick.apply(this, arguments);
      }
      return handleContextMenuClick;
    }()
  }, {
    key: "downloadVideo",
    value: function () {
      var _downloadVideo = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(data, sendResponse) {
        var response, result, errorResult, _t4;
        return _regenerator().w(function (_context3) {
          while (1) switch (_context3.p = _context3.n) {
            case 0:
              _context3.p = 0;
              _context3.n = 1;
              return fetch("".concat(this.serverUrl, "/api/process-video"), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
              });
            case 1:
              response = _context3.v;
              _context3.n = 2;
              return response.json();
            case 2:
              result = _context3.v;
              if (response.ok) {
                // 성공 알림
                this.showNotification("\u2705 \uC601\uC0C1\uC774 \uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4!\n\uCE74\uD14C\uACE0\uB9AC: ".concat(result.mainCategory));

                // 스프레드시트 URL 저장
                if (result.spreadsheetUrl) {
                  chrome.storage.sync.set({
                    spreadsheetUrl: result.spreadsheetUrl
                  });
                }
              }
              sendResponse(result);
              _context3.n = 4;
              break;
            case 3:
              _context3.p = 3;
              _t4 = _context3.v;
              errorResult = {
                error: _t4.message
              };
              sendResponse(errorResult);
            case 4:
              return _context3.a(2);
          }
        }, _callee3, this, [[0, 3]]);
      }));
      function downloadVideo(_x6, _x7) {
        return _downloadVideo.apply(this, arguments);
      }
      return downloadVideo;
    }()
  }, {
    key: "testServerConnection",
    value: function () {
      var _testServerConnection = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(sendResponse) {
        var response, result, _t5;
        return _regenerator().w(function (_context4) {
          while (1) switch (_context4.p = _context4.n) {
            case 0:
              _context4.p = 0;
              _context4.n = 1;
              return fetch("".concat(this.serverUrl, "/health"), {
                method: 'GET',
                timeout: 5000
              });
            case 1:
              response = _context4.v;
              result = {
                connected: response.ok,
                status: response.status,
                timestamp: new Date().toISOString()
              };
              sendResponse(result);
              _context4.n = 3;
              break;
            case 2:
              _context4.p = 2;
              _t5 = _context4.v;
              sendResponse({
                connected: false,
                error: _t5.message,
                suggestion: '로컬 서버가 실행 중인지 확인해주세요.'
              });
            case 3:
              return _context4.a(2);
          }
        }, _callee4, this, [[0, 2]]);
      }));
      function testServerConnection(_x8) {
        return _testServerConnection.apply(this, arguments);
      }
      return testServerConnection;
    }()
  }, {
    key: "getSettings",
    value: function () {
      var _getSettings = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5(sendResponse) {
        var settings, _t6;
        return _regenerator().w(function (_context5) {
          while (1) switch (_context5.p = _context5.n) {
            case 0:
              _context5.p = 0;
              _context5.n = 1;
              return this.getStoredSettings();
            case 1:
              settings = _context5.v;
              sendResponse(settings);
              _context5.n = 3;
              break;
            case 2:
              _context5.p = 2;
              _t6 = _context5.v;
              sendResponse({
                error: _t6.message
              });
            case 3:
              return _context5.a(2);
          }
        }, _callee5, this, [[0, 2]]);
      }));
      function getSettings(_x9) {
        return _getSettings.apply(this, arguments);
      }
      return getSettings;
    }()
  }, {
    key: "saveSettings",
    value: function () {
      var _saveSettings = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6(settings, sendResponse) {
        var _t7;
        return _regenerator().w(function (_context6) {
          while (1) switch (_context6.p = _context6.n) {
            case 0:
              _context6.p = 0;
              _context6.n = 1;
              return chrome.storage.sync.set(settings);
            case 1:
              sendResponse({
                success: true
              });
              _context6.n = 3;
              break;
            case 2:
              _context6.p = 2;
              _t7 = _context6.v;
              sendResponse({
                error: _t7.message
              });
            case 3:
              return _context6.a(2);
          }
        }, _callee6, null, [[0, 2]]);
      }));
      function saveSettings(_x0, _x1) {
        return _saveSettings.apply(this, arguments);
      }
      return saveSettings;
    }()
  }, {
    key: "getStoredSettings",
    value: function getStoredSettings() {
      return new Promise(function (resolve) {
        chrome.storage.sync.get(['videosaverSettings', 'serverUrl', 'spreadsheetUrl'], function (result) {
          // 올바른 설정 구조로 반환
          var settings = result.videosaverSettings || {};
          resolve(_objectSpread(_objectSpread({}, settings), {}, {
            serverUrl: result.serverUrl,
            spreadsheetUrl: result.spreadsheetUrl
          }));
        });
      });
    }
  }, {
    key: "showNotification",
    value: function showNotification(message) {
      var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'basic';
      chrome.storage.sync.get(['videosaverSettings'], function (result) {
        var settings = result.videosaverSettings || {};
        if (settings.showNotifications === false) return;
        chrome.notifications.create({
          type: type,
          iconUrl: 'icons/icon48.png',
          title: 'InsightReel',
          message: message
        });
      });
    }
  }, {
    key: "schedulePeriodicTasks",
    value: function schedulePeriodicTasks() {
      var _this3 = this;
      // 1시간마다 서버 연결 상태 확인
      setInterval(/*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee7() {
        var _t8;
        return _regenerator().w(function (_context7) {
          while (1) switch (_context7.p = _context7.n) {
            case 0:
              _context7.p = 0;
              _context7.n = 1;
              return fetch("".concat(_this3.serverUrl, "/health"));
            case 1:
              chrome.storage.local.set({
                lastServerCheck: Date.now()
              });
              _context7.n = 3;
              break;
            case 2:
              _context7.p = 2;
              _t8 = _context7.v;
              console.log('서버 연결 확인 실패:', _t8);
            case 3:
              return _context7.a(2);
          }
        }, _callee7, null, [[0, 2]]);
      })), 60 * 60 * 1000); // 1시간

      // 매일 오래된 데이터 정리 알림
      setInterval(function () {
        _this3.checkDataCleanup();
      }, 24 * 60 * 60 * 1000); // 24시간
    }
  }, {
    key: "checkDataCleanup",
    value: function () {
      var _checkDataCleanup = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee8() {
        var response, _t9;
        return _regenerator().w(function (_context8) {
          while (1) switch (_context8.p = _context8.n) {
            case 0:
              _context8.p = 0;
              _context8.n = 1;
              return fetch("".concat(this.serverUrl, "/api/cleanup-old-files"), {
                method: 'POST'
              });
            case 1:
              response = _context8.v;
              if (response.ok) {
                console.log('오래된 파일 정리 완료');
              }
              _context8.n = 3;
              break;
            case 2:
              _context8.p = 2;
              _t9 = _context8.v;
              console.log('파일 정리 확인 실패:', _t9);
            case 3:
              return _context8.a(2);
          }
        }, _callee8, this, [[0, 2]]);
      }));
      function checkDataCleanup() {
        return _checkDataCleanup.apply(this, arguments);
      }
      return checkDataCleanup;
    }() // 웹 요청 수정 (필요시)
  }, {
    key: "modifyWebRequests",
    value: function modifyWebRequests() {
      chrome.webRequest.onBeforeSendHeaders.addListener(function (details) {
        // 필요시 헤더 수정
        return {
          requestHeaders: details.requestHeaders
        };
      }, {
        urls: ['https://www.instagram.com/*', 'https://www.tiktok.com/*']
      }, ['blocking', 'requestHeaders']);
    }
  }]);
}(); // Service Worker 초기화
new BackgroundService();
/******/ })()
;