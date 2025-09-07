const webpack = require('webpack');
const path = require('path');
require('dotenv').config();

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  
  entry: {
    'content/content-script': './content/content-script-minimal.js',
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
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
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
      'process.env.DEBUG_MODE': JSON.stringify(process.env.NODE_ENV === 'development')
    })
  ],
  
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  
  resolve: {
    extensions: ['.js', '.json']
  },
  
  // Chrome Extension에서 필요한 설정
  optimization: {
    minimize: process.env.NODE_ENV === 'production'
  }
};