const webpack = require('webpack');
const path = require('path');
require('dotenv').config();

module.exports = (env, argv) => {
  // 빌드 모드 우선순위: CLI --mode > 환경변수 > 기본값
  const NODE_ENV = argv.mode || process.env.NODE_ENV || 'development';

  // 환경변수 재설정으로 일관성 확보
  process.env.NODE_ENV = NODE_ENV;

  return {
    mode: NODE_ENV,

  entry: {
    'content/content-script': './content/content-script-main.js',
    'background/service-worker': './background/service-worker.js',
    'popup/popup': './popup/popup.js'
  },

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },

  plugins: [
    // 환경변수를 빌드 시 주입
    new webpack.DefinePlugin({
      // 서버 설정
      'process.env.SERVER_URL': JSON.stringify(process.env.SERVER_URL || 'http://localhost:3000'),
      'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
      'process.env.PORT': JSON.stringify(process.env.PORT || '3000'),
      
      // API 키들 (보안 중요)
      'process.env.GOOGLE_API_KEY': JSON.stringify(process.env.GOOGLE_API_KEY),
      'process.env.YOUTUBE_KEY_1': JSON.stringify(process.env.YOUTUBE_KEY_1),
      'process.env.YOUTUBE_KEY_2': JSON.stringify(process.env.YOUTUBE_KEY_2),
      'process.env.YOUTUBE_KEY_3': JSON.stringify(process.env.YOUTUBE_KEY_3),
      
      // 기능 플래그
      'process.env.USE_GEMINI': JSON.stringify(process.env.USE_GEMINI || 'true'),
      'process.env.USE_DYNAMIC_CATEGORIES': JSON.stringify(process.env.USE_DYNAMIC_CATEGORIES || 'true'),
      
      // 디버그 설정
      'process.env.DEBUG_MODE': JSON.stringify(NODE_ENV === 'development')
    })
  ],
  
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: {
                  chrome: '88' // Chrome Extension Manifest V3 최소 버전
                },
                modules: false // Webpack의 tree shaking 활용
              }]
            ]
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },

  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.json'],
    alias: {
      '@': path.resolve(__dirname, './content'),
      '@config': path.resolve(__dirname, './config')
    }
  },

  // Chrome Extension 최적화 설정
  optimization: {
    minimize: NODE_ENV === 'production',
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        }
      }
    }
  },

  // 개발자 도구 설정
  devtool: NODE_ENV === 'production' ? false : 'cheap-module-source-map'
  };
};