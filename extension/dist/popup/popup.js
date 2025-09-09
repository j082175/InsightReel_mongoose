/******/ (() => { // webpackBootstrap
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
// 팝업 스크립트
var VideoSaverPopup = /*#__PURE__*/function () {
  function VideoSaverPopup() {
    _classCallCheck(this, VideoSaverPopup);
    this.serverUrl = 'http://localhost:3000';
    this.init();
  }
  return _createClass(VideoSaverPopup, [{
    key: "init",
    value: function () {
      var _init = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
        return _regenerator().w(function (_context) {
          while (1) switch (_context.n) {
            case 0:
              console.log('🚀 팝업 초기화 시작');

              // 설정을 먼저 로드한 후 이벤트 리스너 설정
              _context.n = 1;
              return this.loadSettings();
            case 1:
              this.setupEventListeners();

              // 서버 상태와 통계는 병렬로 처리
              _context.n = 2;
              return Promise.all([this.checkServerStatus(), this.loadStats()]);
            case 2:
              console.log('📋 팝업 초기화 완료');
            case 3:
              return _context.a(2);
          }
        }, _callee, this);
      }));
      function init() {
        return _init.apply(this, arguments);
      }
      return init;
    }()
  }, {
    key: "checkServerStatus",
    value: function () {
      var _checkServerStatus = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
        var statusElement, statusText, response, _t;
        return _regenerator().w(function (_context2) {
          while (1) switch (_context2.p = _context2.n) {
            case 0:
              statusElement = document.getElementById('status');
              statusText = document.getElementById('statusText');
              _context2.p = 1;
              _context2.n = 2;
              return fetch("".concat(this.serverUrl, "/health"));
            case 2:
              response = _context2.v;
              if (!response.ok) {
                _context2.n = 3;
                break;
              }
              statusElement.className = 'status connected';
              statusText.textContent = '✅ 서버 연결됨';
              _context2.n = 4;
              break;
            case 3:
              throw new Error('서버 응답 오류');
            case 4:
              _context2.n = 6;
              break;
            case 5:
              _context2.p = 5;
              _t = _context2.v;
              statusElement.className = 'status error';
              statusText.textContent = '❌ 서버 연결 안됨 (로컬 서버를 시작해주세요)';
            case 6:
              return _context2.a(2);
          }
        }, _callee2, this, [[1, 5]]);
      }));
      function checkServerStatus() {
        return _checkServerStatus.apply(this, arguments);
      }
      return checkServerStatus;
    }()
  }, {
    key: "loadStats",
    value: function () {
      var _loadStats = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
        var response, stats, _t2;
        return _regenerator().w(function (_context3) {
          while (1) switch (_context3.p = _context3.n) {
            case 0:
              _context3.p = 0;
              _context3.n = 1;
              return fetch("".concat(this.serverUrl, "/api/stats"));
            case 1:
              response = _context3.v;
              if (!response.ok) {
                _context3.n = 3;
                break;
              }
              _context3.n = 2;
              return response.json();
            case 2:
              stats = _context3.v;
              document.getElementById('totalVideos').textContent = stats.total || 0;
              document.getElementById('todayVideos').textContent = stats.today || 0;
            case 3:
              _context3.n = 5;
              break;
            case 4:
              _context3.p = 4;
              _t2 = _context3.v;
              console.log('통계 로드 실패:', _t2);
            case 5:
              return _context3.a(2);
          }
        }, _callee3, this, [[0, 4]]);
      }));
      function loadStats() {
        return _loadStats.apply(this, arguments);
      }
      return loadStats;
    }()
  }, {
    key: "setupEventListeners",
    value: function setupEventListeners() {
      var _this = this;
      // 디바운스 타이머들을 인스턴스 변수로 관리
      this.debounceTimers = {};

      // 스프레드시트 열기
      document.getElementById('openSheets').addEventListener('click', /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4() {
        var response, data, _t3;
        return _regenerator().w(function (_context4) {
          while (1) switch (_context4.p = _context4.n) {
            case 0:
              _context4.p = 0;
              _context4.n = 1;
              return fetch("".concat(_this.serverUrl, "/api/test-sheets"));
            case 1:
              response = _context4.v;
              if (!response.ok) {
                _context4.n = 3;
                break;
              }
              _context4.n = 2;
              return response.json();
            case 2:
              data = _context4.v;
              if (!(data.result && data.result.spreadsheetUrl)) {
                _context4.n = 3;
                break;
              }
              chrome.tabs.create({
                url: data.result.spreadsheetUrl
              });
              return _context4.a(2);
            case 3:
              _context4.n = 5;
              break;
            case 4:
              _context4.p = 4;
              _t3 = _context4.v;
              console.log('서버에서 스프레드시트 정보 가져오기 실패:', _t3);
            case 5:
              // 백업: Chrome storage에서 확인
              chrome.storage.sync.get(['spreadsheetUrl'], function (result) {
                if (result.spreadsheetUrl) {
                  chrome.tabs.create({
                    url: result.spreadsheetUrl
                  });
                } else {
                  // 고정 URL 사용 (환경변수에서 설정한 스프레드시트)
                  var fallbackUrl = 'https://docs.google.com/spreadsheets/d/1UkGu6HObPNo6cPojBzhYeFxNVMkTksrsANTuSGKloJA';
                  chrome.tabs.create({
                    url: fallbackUrl
                  });
                }
              });
            case 6:
              return _context4.a(2);
          }
        }, _callee4, null, [[0, 4]]);
      })));

      // 연결 테스트
      document.getElementById('testConnection').addEventListener('click', /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5() {
        return _regenerator().w(function (_context5) {
          while (1) switch (_context5.n) {
            case 0:
              _context5.n = 1;
              return _this.testConnection();
            case 1:
              return _context5.a(2);
          }
        }, _callee5);
      })));

      // 채널 수집 버튼
      document.getElementById('collectChannel').addEventListener('click', /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6() {
        return _regenerator().w(function (_context6) {
          while (1) switch (_context6.n) {
            case 0:
              _context6.n = 1;
              return _this.collectChannel();
            case 1:
              return _context6.a(2);
          }
        }, _callee6);
      })));

      // 설정 토글 - 개별 디바운싱 (AI 분석 토글 추가)
      var toggles = ['useAI', 'autoAnalyze', 'autoSave', 'batchMode', 'showNotifications'];
      toggles.forEach(function (id) {
        document.getElementById(id).addEventListener('change', function (e) {
          // 해당 ID의 이전 타이머 취소
          if (_this.debounceTimers[id]) {
            clearTimeout(_this.debounceTimers[id]);
          }

          // 즉시 시각적 피드백
          var element = e.target;
          element.style.transform = 'scale(1.1)';
          element.style.transition = 'transform 0.15s ease';
          setTimeout(function () {
            element.style.transform = 'scale(1)';
          }, 150);
          console.log("".concat(id, " \uD1A0\uAE00: ").concat(e.target.checked)); // 디버그용

          // 200ms 후 실제 저장 (더 빠르게)
          _this.debounceTimers[id] = setTimeout(function () {
            _this.saveSetting(id, e.target.checked);
          }, 200);
        });
      });
    }
  }, {
    key: "testConnection",
    value: function () {
      var _testConnection = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee7() {
        var button, originalText, serverResponse, sheetsResponse, message, _t4;
        return _regenerator().w(function (_context7) {
          while (1) switch (_context7.p = _context7.n) {
            case 0:
              button = document.getElementById('testConnection');
              originalText = button.textContent;
              button.textContent = '테스트 중...';
              button.disabled = true;
              _context7.p = 1;
              _context7.n = 2;
              return fetch("".concat(this.serverUrl, "/health"));
            case 2:
              serverResponse = _context7.v;
              _context7.n = 3;
              return fetch("".concat(this.serverUrl, "/api/test-sheets"));
            case 3:
              sheetsResponse = _context7.v;
              message = '연결 테스트 결과:\n';
              message += "\uC11C\uBC84: ".concat(serverResponse.ok ? '✅' : '❌', "\n");
              message += "\uAD6C\uAE00 \uC2DC\uD2B8: ".concat(sheetsResponse.ok ? '✅' : '❌');
              this.showNotification(message);
              _context7.n = 5;
              break;
            case 4:
              _context7.p = 4;
              _t4 = _context7.v;
              this.showNotification('연결 테스트 실패: ' + _t4.message);
            case 5:
              _context7.p = 5;
              button.textContent = originalText;
              button.disabled = false;
              return _context7.f(5);
            case 6:
              return _context7.a(2);
          }
        }, _callee7, this, [[1, 4, 5, 6]]);
      }));
      function testConnection() {
        return _testConnection.apply(this, arguments);
      }
      return testConnection;
    }()
  }, {
    key: "collectChannel",
    value: function () {
      var _collectChannel = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee8() {
        var button, originalText, _yield$chrome$tabs$qu, _yield$chrome$tabs$qu2, tab, isChannelPage, response, _t5;
        return _regenerator().w(function (_context8) {
          while (1) switch (_context8.p = _context8.n) {
            case 0:
              button = document.getElementById('collectChannel');
              originalText = button.textContent;
              _context8.p = 1;
              _context8.n = 2;
              return chrome.tabs.query({
                active: true,
                currentWindow: true
              });
            case 2:
              _yield$chrome$tabs$qu = _context8.v;
              _yield$chrome$tabs$qu2 = _slicedToArray(_yield$chrome$tabs$qu, 1);
              tab = _yield$chrome$tabs$qu2[0];
              // YouTube 채널 페이지인지 확인
              isChannelPage = tab.url.includes('/channel/') || tab.url.includes('/@') || tab.url.includes('/c/') || tab.url.includes('/user/');
              if (isChannelPage) {
                _context8.n = 3;
                break;
              }
              this.showNotification('❌ YouTube 채널 페이지에서만 사용할 수 있습니다.');
              return _context8.a(2);
            case 3:
              // 버튼 상태 변경
              button.textContent = '수집 중...';
              button.disabled = true;

              // 콘텐츠 스크립트에 채널 수집 모달 표시 요청
              _context8.n = 4;
              return chrome.tabs.sendMessage(tab.id, {
                action: 'showChannelCollectModal'
              });
            case 4:
              response = _context8.v;
              if (!(response && response.success)) {
                _context8.n = 5;
                break;
              }
              // 팝업 닫기 (사용자가 모달에서 작업할 수 있도록)
              window.close();
              _context8.n = 6;
              break;
            case 5:
              throw new Error((response === null || response === void 0 ? void 0 : response.error) || '채널 수집 기능을 찾을 수 없습니다.');
            case 6:
              _context8.n = 8;
              break;
            case 7:
              _context8.p = 7;
              _t5 = _context8.v;
              console.error('채널 수집 실패:', _t5);
              this.showNotification('❌ 채널 수집 실패: ' + _t5.message);

              // 버튼 상태 복원
              button.textContent = '실패';
              button.style.background = '#f44336';
              setTimeout(function () {
                button.textContent = originalText;
                button.style.background = 'linear-gradient(45deg, #ff6b6b, #ee5a24)';
                button.disabled = false;
              }, 2000);
            case 8:
              return _context8.a(2);
          }
        }, _callee8, this, [[1, 7]]);
      }));
      function collectChannel() {
        return _collectChannel.apply(this, arguments);
      }
      return collectChannel;
    }()
  }, {
    key: "loadSettings",
    value: function () {
      var _loadSettings = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee9() {
        var result, settings, useAI, autoAnalyze, autoSave, batchMode, showNotifications, settingsContainer, _settingsContainer, _t6;
        return _regenerator().w(function (_context9) {
          while (1) switch (_context9.p = _context9.n) {
            case 0:
              _context9.p = 0;
              _context9.n = 1;
              return new Promise(function (resolve) {
                chrome.storage.sync.get(['videosaverSettings'], resolve);
              });
            case 1:
              result = _context9.v;
              settings = result.videosaverSettings || {};
              console.log('📋 로드된 설정:', settings);

              // DOM 요소가 준비되었는지 확인
              useAI = document.getElementById('useAI');
              autoAnalyze = document.getElementById('autoAnalyze');
              autoSave = document.getElementById('autoSave');
              batchMode = document.getElementById('batchMode');
              showNotifications = document.getElementById('showNotifications');
              if (!(!useAI || !autoAnalyze || !autoSave || !batchMode || !showNotifications)) {
                _context9.n = 2;
                break;
              }
              console.warn('⚠️ DOM 요소가 아직 준비되지 않음');
              return _context9.a(2);
            case 2:
              // 명시적으로 저장된 값 사용 (undefined인 경우만 기본값)
              useAI.checked = settings.useAI !== undefined ? settings.useAI : true; // AI 분석은 기본적으로 켜짐
              autoAnalyze.checked = settings.autoAnalysis !== undefined ? settings.autoAnalysis : false;
              autoSave.checked = settings.autoSave !== undefined ? settings.autoSave : true;
              batchMode.checked = settings.batchMode !== undefined ? settings.batchMode : false; // 배치 모드는 기본적으로 꺼짐
              showNotifications.checked = settings.showNotifications !== undefined ? settings.showNotifications : true;

              // 설정 로드 완료 후 설정 영역을 부드럽게 표시
              settingsContainer = document.getElementById('settingsContainer');
              if (settingsContainer) {
                settingsContainer.style.opacity = '1';
              }
              console.log('✅ UI 반영 완료');
              _context9.n = 4;
              break;
            case 3:
              _context9.p = 3;
              _t6 = _context9.v;
              console.error('❌ 설정 로드 실패:', _t6);

              // 에러 발생 시에도 설정 영역 표시 (기본값으로)
              _settingsContainer = document.getElementById('settingsContainer');
              if (_settingsContainer) {
                _settingsContainer.style.opacity = '1';
              }
            case 4:
              return _context9.a(2);
          }
        }, _callee9, null, [[0, 3]]);
      }));
      function loadSettings() {
        return _loadSettings.apply(this, arguments);
      }
      return loadSettings;
    }()
  }, {
    key: "saveSetting",
    value: function () {
      var _saveSetting = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee0(key, value) {
        var result, currentSettings, settingKey, updatedSettings, _t7;
        return _regenerator().w(function (_context0) {
          while (1) switch (_context0.p = _context0.n) {
            case 0:
              _context0.p = 0;
              console.log("\uD83D\uDCBE \uC124\uC815 \uC800\uC7A5 \uC2DC\uC791: ".concat(key, " = ").concat(value));

              // 현재 설정 가져오기
              _context0.n = 1;
              return new Promise(function (resolve) {
                chrome.storage.sync.get(['videosaverSettings'], resolve);
              });
            case 1:
              result = _context0.v;
              currentSettings = result.videosaverSettings || {};
              console.log('📋 현재 저장된 설정:', currentSettings);
              settingKey = key; // autoAnalyze를 autoAnalysis로 매핑
              if (key === 'autoAnalyze') {
                settingKey = 'autoAnalysis';
              }
              // useAI는 그대로 useAI로 저장
              updatedSettings = _objectSpread(_objectSpread({}, currentSettings), {}, _defineProperty({}, settingKey, value));
              console.log('🔄 업데이트될 설정:', updatedSettings);

              // 설정 저장
              _context0.n = 2;
              return new Promise(function (resolve) {
                chrome.storage.sync.set({
                  videosaverSettings: updatedSettings
                }, resolve);
              });
            case 2:
              console.log("\u2705 \uC124\uC815 \uC800\uC7A5 \uC644\uB8CC: ".concat(settingKey, " = ").concat(value));

              // 간단한 시각적 피드백 (알림 대신 체크마크)
              this.showQuickFeedback(settingKey);
              _context0.n = 4;
              break;
            case 3:
              _context0.p = 3;
              _t7 = _context0.v;
              console.error('❌ 설정 저장 실패:', _t7);
              this.showNotification("\u274C \uC124\uC815 \uC800\uC7A5\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4");
            case 4:
              return _context0.a(2);
          }
        }, _callee0, this, [[0, 3]]);
      }));
      function saveSetting(_x, _x2) {
        return _saveSetting.apply(this, arguments);
      }
      return saveSetting;
    }()
  }, {
    key: "showQuickFeedback",
    value: function showQuickFeedback(settingKey) {
      // 토글 옆에 간단한 체크마크 표시 (1초만)
      var elementId = settingKey;
      if (settingKey === 'autoAnalysis') {
        elementId = 'autoAnalyze';
      }
      var settingElement = document.getElementById(elementId);
      if (settingElement && settingElement.parentElement) {
        var feedback = document.createElement('span');
        feedback.textContent = '✓';
        feedback.style.cssText = "\n        color: #4caf50;\n        font-weight: bold;\n        margin-left: 5px;\n        animation: fadeOut 1s ease-out forwards;\n      ";

        // CSS 애니메이션 추가
        if (!document.getElementById('feedback-animation')) {
          var style = document.createElement('style');
          style.id = 'feedback-animation';
          style.textContent = "\n          @keyframes fadeOut {\n            0% { opacity: 1; }\n            100% { opacity: 0; }\n          }\n        ";
          document.head.appendChild(style);
        }
        settingElement.parentElement.appendChild(feedback);
        setTimeout(function () {
          if (feedback.parentElement) {
            feedback.parentElement.removeChild(feedback);
          }
        }, 1000);
      }
    }
  }, {
    key: "showNotification",
    value: function showNotification(message) {
      // 간단한 알림 표시
      var notification = document.createElement('div');
      notification.style.cssText = "\n      position: fixed;\n      top: 10px;\n      left: 10px;\n      right: 10px;\n      background: #333;\n      color: white;\n      padding: 10px;\n      border-radius: 5px;\n      z-index: 1000;\n      font-size: 12px;\n      white-space: pre-line;\n    ";
      notification.textContent = message;
      document.body.appendChild(notification);
      setTimeout(function () {
        document.body.removeChild(notification);
      }, 3000);
    }
  }]);
}(); // 팝업이 로드되면 초기화
document.addEventListener('DOMContentLoaded', function () {
  new VideoSaverPopup();
});
/******/ })()
;