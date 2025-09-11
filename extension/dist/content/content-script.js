/******/ (() => {
    // webpackBootstrap
    function _regenerator() {
        /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e,
            t,
            r = 'function' == typeof Symbol ? Symbol : {},
            n = r.iterator || '@@iterator',
            o = r.toStringTag || '@@toStringTag';
        function i(r, n, o, i) {
            var c = n && n.prototype instanceof Generator ? n : Generator,
                u = Object.create(c.prototype);
            return (
                _regeneratorDefine2(
                    u,
                    '_invoke',
                    (function (r, n, o) {
                        var i,
                            c,
                            u,
                            f = 0,
                            p = o || [],
                            y = !1,
                            G = {
                                p: 0,
                                n: 0,
                                v: e,
                                a: d,
                                f: d.bind(e, 4),
                                d: function d(t, r) {
                                    return (
                                        (i = t), (c = 0), (u = e), (G.n = r), a
                                    );
                                },
                            };
                        function d(r, n) {
                            for (
                                c = r, u = n, t = 0;
                                !y && f && !o && t < p.length;
                                t++
                            ) {
                                var o,
                                    i = p[t],
                                    d = G.p,
                                    l = i[2];
                                r > 3
                                    ? (o = l === n) &&
                                      ((u = i[(c = i[4]) ? 5 : ((c = 3), 3)]),
                                      (i[4] = i[5] = e))
                                    : i[0] <= d &&
                                      ((o = r < 2 && d < i[1])
                                          ? ((c = 0), (G.v = n), (G.n = i[1]))
                                          : d < l &&
                                            (o = r < 3 || i[0] > n || n > l) &&
                                            ((i[4] = r),
                                            (i[5] = n),
                                            (G.n = l),
                                            (c = 0)));
                            }
                            if (o || r > 1) return a;
                            throw ((y = !0), n);
                        }
                        return function (o, p, l) {
                            if (f > 1)
                                throw TypeError('Generator is already running');
                            for (
                                y && 1 === p && d(p, l), c = p, u = l;
                                (t = c < 2 ? e : u) || !y;

                            ) {
                                i ||
                                    (c
                                        ? c < 3
                                            ? (c > 1 && (G.n = -1), d(c, u))
                                            : (G.n = u)
                                        : (G.v = u));
                                try {
                                    if (((f = 2), i)) {
                                        if ((c || (o = 'next'), (t = i[o]))) {
                                            if (!(t = t.call(i, u)))
                                                throw TypeError(
                                                    'iterator result is not an object',
                                                );
                                            if (!t.done) return t;
                                            (u = t.value), c < 2 && (c = 0);
                                        } else
                                            1 === c &&
                                                (t = i['return']) &&
                                                t.call(i),
                                                c < 2 &&
                                                    ((u = TypeError(
                                                        "The iterator does not provide a '" +
                                                            o +
                                                            "' method",
                                                    )),
                                                    (c = 1));
                                        i = e;
                                    } else if (
                                        (t = (y = G.n < 0)
                                            ? u
                                            : r.call(n, G)) !== a
                                    )
                                        break;
                                } catch (t) {
                                    (i = e), (c = 1), (u = t);
                                } finally {
                                    f = 1;
                                }
                            }
                            return { value: t, done: y };
                        };
                    })(r, o, i),
                    !0,
                ),
                u
            );
        }
        var a = {};
        function Generator() {}
        function GeneratorFunction() {}
        function GeneratorFunctionPrototype() {}
        t = Object.getPrototypeOf;
        var c = [][n]
                ? t(t([][n]()))
                : (_regeneratorDefine2((t = {}), n, function () {
                      return this;
                  }),
                  t),
            u =
                (GeneratorFunctionPrototype.prototype =
                Generator.prototype =
                    Object.create(c));
        function f(e) {
            return (
                Object.setPrototypeOf
                    ? Object.setPrototypeOf(e, GeneratorFunctionPrototype)
                    : ((e.__proto__ = GeneratorFunctionPrototype),
                      _regeneratorDefine2(e, o, 'GeneratorFunction')),
                (e.prototype = Object.create(u)),
                e
            );
        }
        return (
            (GeneratorFunction.prototype = GeneratorFunctionPrototype),
            _regeneratorDefine2(u, 'constructor', GeneratorFunctionPrototype),
            _regeneratorDefine2(
                GeneratorFunctionPrototype,
                'constructor',
                GeneratorFunction,
            ),
            (GeneratorFunction.displayName = 'GeneratorFunction'),
            _regeneratorDefine2(
                GeneratorFunctionPrototype,
                o,
                'GeneratorFunction',
            ),
            _regeneratorDefine2(u),
            _regeneratorDefine2(u, o, 'Generator'),
            _regeneratorDefine2(u, n, function () {
                return this;
            }),
            _regeneratorDefine2(u, 'toString', function () {
                return '[object Generator]';
            }),
            (_regenerator = function _regenerator() {
                return { w: i, m: f };
            })()
        );
    }
    function _regeneratorDefine2(e, r, n, t) {
        var i = Object.defineProperty;
        try {
            i({}, '', {});
        } catch (e) {
            i = 0;
        }
        (_regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) {
            function o(r, n) {
                _regeneratorDefine2(e, r, function (e) {
                    return this._invoke(r, n, e);
                });
            }
            r
                ? i
                    ? i(e, r, {
                          value: n,
                          enumerable: !t,
                          configurable: !t,
                          writable: !t,
                      })
                    : (e[r] = n)
                : (o('next', 0), o('throw', 1), o('return', 2));
        }),
            _regeneratorDefine2(e, r, n, t);
    }
    function asyncGeneratorStep(n, t, e, r, o, a, c) {
        try {
            var i = n[a](c),
                u = i.value;
        } catch (n) {
            return void e(n);
        }
        i.done ? t(u) : Promise.resolve(u).then(r, o);
    }
    function _asyncToGenerator(n) {
        return function () {
            var t = this,
                e = arguments;
            return new Promise(function (r, o) {
                var a = n.apply(t, e);
                function _next(n) {
                    asyncGeneratorStep(a, r, o, _next, _throw, 'next', n);
                }
                function _throw(n) {
                    asyncGeneratorStep(a, r, o, _next, _throw, 'throw', n);
                }
                _next(void 0);
            });
        };
    }
    function _typeof(o) {
        '@babel/helpers - typeof';
        return (
            (_typeof =
                'function' == typeof Symbol &&
                'symbol' == typeof Symbol.iterator
                    ? function (o) {
                          return typeof o;
                      }
                    : function (o) {
                          return o &&
                              'function' == typeof Symbol &&
                              o.constructor === Symbol &&
                              o !== Symbol.prototype
                              ? 'symbol'
                              : typeof o;
                      }),
            _typeof(o)
        );
    }
    function _classCallCheck(a, n) {
        if (!(a instanceof n))
            throw new TypeError('Cannot call a class as a function');
    }
    function _defineProperties(e, r) {
        for (var t = 0; t < r.length; t++) {
            var o = r[t];
            (o.enumerable = o.enumerable || !1),
                (o.configurable = !0),
                'value' in o && (o.writable = !0),
                Object.defineProperty(e, _toPropertyKey(o.key), o);
        }
    }
    function _createClass(e, r, t) {
        return (
            r && _defineProperties(e.prototype, r),
            t && _defineProperties(e, t),
            Object.defineProperty(e, 'prototype', { writable: !1 }),
            e
        );
    }
    function _toPropertyKey(t) {
        var i = _toPrimitive(t, 'string');
        return 'symbol' == _typeof(i) ? i : i + '';
    }
    function _toPrimitive(t, r) {
        if ('object' != _typeof(t) || !t) return t;
        var e = t[Symbol.toPrimitive];
        if (void 0 !== e) {
            var i = e.call(t, r || 'default');
            if ('object' != _typeof(i)) return i;
            throw new TypeError('@@toPrimitive must return a primitive value.');
        }
        return ('string' === r ? String : Number)(t);
    }
    /**
     * 최소 기능 Content Script
     * 빌드 문제를 우회하고 기본 기능만 제공
     */
    // 기본 유틸리티
    var MinimalUtils = /*#__PURE__*/ (function () {
        function MinimalUtils() {
            _classCallCheck(this, MinimalUtils);
        }
        return _createClass(MinimalUtils, null, [
            {
                key: 'detectPlatform',
                value: function detectPlatform() {
                    var hostname = window.location.hostname;
                    if (hostname.includes('instagram.com')) return 'INSTAGRAM';
                    if (hostname.includes('tiktok.com')) return 'TIKTOK';
                    if (
                        hostname.includes('youtube.com') ||
                        hostname.includes('youtu.be')
                    )
                        return 'YOUTUBE';
                    return null;
                },
            },
            {
                key: 'log',
                value: function log(level, message) {
                    var data =
                        arguments.length > 2 && arguments[2] !== undefined
                            ? arguments[2]
                            : null;
                    var timestamp = new Date().toISOString();
                    var prefix = '[VideoSaver '.concat(timestamp, ']');
                    switch (level) {
                        case 'info':
                            console.log(
                                ''
                                    .concat(prefix, ' \u2139\uFE0F ')
                                    .concat(message),
                                data || '',
                            );
                            break;
                        case 'warn':
                            console.warn(
                                ''
                                    .concat(prefix, ' \u26A0\uFE0F ')
                                    .concat(message),
                                data || '',
                            );
                            break;
                        case 'error':
                            console.error(
                                ''.concat(prefix, ' \u274C ').concat(message),
                                data || '',
                            );
                            break;
                        case 'success':
                            console.log(
                                ''.concat(prefix, ' \u2705 ').concat(message),
                                data || '',
                            );
                            break;
                        default:
                            console.log(
                                ''.concat(prefix, ' ').concat(message),
                                data || '',
                            );
                    }
                },
            },
        ]);
    })(); // 환경 설정 (빌드 시 주입됨)
    var environment = {
        SERVER_URL: 'http://localhost:3000' || 0,
        NODE_ENV: 'development' || 0,
        GOOGLE_API_KEY: false || null,
        isDevelopment: 'development' === 'development',
    };

    // 기본 API 클라이언트
    var MinimalApiClient = /*#__PURE__*/ (function () {
        function MinimalApiClient() {
            var serverUrl =
                arguments.length > 0 && arguments[0] !== undefined
                    ? arguments[0]
                    : environment.SERVER_URL;
            _classCallCheck(this, MinimalApiClient);
            this.serverUrl = serverUrl;
        }
        return _createClass(MinimalApiClient, [
            {
                key: 'checkConnection',
                value: (function () {
                    var _checkConnection = _asyncToGenerator(
                        /*#__PURE__*/ _regenerator().m(function _callee() {
                            var response, _t;
                            return _regenerator().w(
                                function (_context) {
                                    while (1)
                                        switch ((_context.p = _context.n)) {
                                            case 0:
                                                _context.p = 0;
                                                _context.n = 1;
                                                return fetch(
                                                    ''.concat(
                                                        this.serverUrl,
                                                        '/health',
                                                    ),
                                                    {
                                                        method: 'GET',
                                                        timeout: 5000,
                                                    },
                                                );
                                            case 1:
                                                response = _context.v;
                                                return _context.a(
                                                    2,
                                                    response.ok,
                                                );
                                            case 2:
                                                _context.p = 2;
                                                _t = _context.v;
                                                MinimalUtils.log(
                                                    'error',
                                                    'Server connection failed',
                                                    _t,
                                                );
                                                return _context.a(2, false);
                                        }
                                },
                                _callee,
                                this,
                                [[0, 2]],
                            );
                        }),
                    );
                    function checkConnection() {
                        return _checkConnection.apply(this, arguments);
                    }
                    return checkConnection;
                })(),
            },
        ]);
    })(); // 메인 Content Script 클래스
    var MinimalContentScript = /*#__PURE__*/ (function () {
        function MinimalContentScript() {
            _classCallCheck(this, MinimalContentScript);
            this.platform = MinimalUtils.detectPlatform();
            this.apiClient = new MinimalApiClient();
            this.init();
        }
        return _createClass(MinimalContentScript, [
            {
                key: 'init',
                value: function init() {
                    MinimalUtils.log('info', 'Minimal Content Script 시작', {
                        platform: this.platform,
                        url: window.location.href,
                        environment: environment.NODE_ENV,
                    });
                    if (!this.platform) {
                        MinimalUtils.log(
                            'warn',
                            '지원되지 않는 플랫폼',
                            window.location.hostname,
                        );
                        return;
                    }

                    // 서버 연결 확인
                    this.checkServerConnection();

                    // Chrome Extension 메시지 리스너
                    this.setupMessageListeners();

                    // 환경변수 설정 확인
                    this.validateEnvironment();
                },
            },
            {
                key: 'checkServerConnection',
                value: (function () {
                    var _checkServerConnection = _asyncToGenerator(
                        /*#__PURE__*/ _regenerator().m(function _callee2() {
                            var isConnected, _t2;
                            return _regenerator().w(
                                function (_context2) {
                                    while (1)
                                        switch ((_context2.p = _context2.n)) {
                                            case 0:
                                                _context2.p = 0;
                                                _context2.n = 1;
                                                return this.apiClient.checkConnection();
                                            case 1:
                                                isConnected = _context2.v;
                                                if (isConnected) {
                                                    MinimalUtils.log(
                                                        'success',
                                                        '서버 연결 확인됨',
                                                    );
                                                } else {
                                                    MinimalUtils.log(
                                                        'warn',
                                                        '서버 연결 실패 - 기본 모드로 실행',
                                                    );
                                                }
                                                _context2.n = 3;
                                                break;
                                            case 2:
                                                _context2.p = 2;
                                                _t2 = _context2.v;
                                                MinimalUtils.log(
                                                    'error',
                                                    '서버 연결 확인 중 오류',
                                                    _t2,
                                                );
                                            case 3:
                                                return _context2.a(2);
                                        }
                                },
                                _callee2,
                                this,
                                [[0, 2]],
                            );
                        }),
                    );
                    function checkServerConnection() {
                        return _checkServerConnection.apply(this, arguments);
                    }
                    return checkServerConnection;
                })(),
            },
            {
                key: 'setupMessageListeners',
                value: function setupMessageListeners() {
                    var _this = this;
                    chrome.runtime.onMessage.addListener(function (
                        request,
                        sender,
                        sendResponse,
                    ) {
                        _this.handleMessage(request, sender, sendResponse);
                        return true;
                    });
                },
            },
            {
                key: 'handleMessage',
                value: (function () {
                    var _handleMessage = _asyncToGenerator(
                        /*#__PURE__*/ _regenerator().m(function _callee3(
                            request,
                            sender,
                            sendResponse,
                        ) {
                            var _t3, _t4;
                            return _regenerator().w(
                                function (_context3) {
                                    while (1)
                                        switch ((_context3.p = _context3.n)) {
                                            case 0:
                                                _context3.p = 0;
                                                _t3 = request.action;
                                                _context3.n =
                                                    _t3 === 'ping'
                                                        ? 1
                                                        : _t3 === 'getStatus'
                                                        ? 2
                                                        : 3;
                                                break;
                                            case 1:
                                                sendResponse({
                                                    success: true,
                                                    message:
                                                        'Content Script 응답',
                                                });
                                                return _context3.a(3, 4);
                                            case 2:
                                                sendResponse({
                                                    success: true,
                                                    data: {
                                                        platform: this.platform,
                                                        serverUrl:
                                                            environment.SERVER_URL,
                                                        environment:
                                                            environment.NODE_ENV,
                                                    },
                                                });
                                                return _context3.a(3, 4);
                                            case 3:
                                                sendResponse({
                                                    error: '알 수 없는 액션입니다.',
                                                });
                                            case 4:
                                                _context3.n = 6;
                                                break;
                                            case 5:
                                                _context3.p = 5;
                                                _t4 = _context3.v;
                                                MinimalUtils.log(
                                                    'error',
                                                    '메시지 처리 실패',
                                                    _t4.message,
                                                );
                                                sendResponse({
                                                    error: _t4.message,
                                                });
                                            case 6:
                                                return _context3.a(2);
                                        }
                                },
                                _callee3,
                                this,
                                [[0, 5]],
                            );
                        }),
                    );
                    function handleMessage(_x, _x2, _x3) {
                        return _handleMessage.apply(this, arguments);
                    }
                    return handleMessage;
                })(),
            },
            {
                key: 'validateEnvironment',
                value: function validateEnvironment() {
                    MinimalUtils.log('info', '환경 설정 확인', {
                        serverUrl: environment.SERVER_URL,
                        nodeEnv: environment.NODE_ENV,
                        hasApiKey: !!environment.GOOGLE_API_KEY,
                        isDevelopment: environment.isDevelopment,
                    });
                    if (!environment.GOOGLE_API_KEY) {
                        MinimalUtils.log(
                            'warn',
                            'GOOGLE_API_KEY 환경변수가 설정되지 않았습니다.',
                        );
                    }
                },
            },
        ]);
    })(); // Content Script 실행
    try {
        var contentScript = new MinimalContentScript();

        // 디버깅용 글로벌 접근
        if (environment.isDevelopment) {
            window.MinimalContentScript = contentScript;
            window.MinimalUtils = MinimalUtils;
            window.environment = environment;
        }
    } catch (error) {
        console.error('❌ Minimal Content Script 실행 오류:', error);
        console.error('오류 위치:', error.stack);
    }
    /******/
})();
