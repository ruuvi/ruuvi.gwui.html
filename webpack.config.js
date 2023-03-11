require("webpack")
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  entry: {
    ruuvi: {
      import: [path.resolve(__dirname, 'src/ruuvi.js')],
      dependOn: ['jquery'],
    },
    auth: {
      import: [path.resolve(__dirname, 'src/auth.js')],
      dependOn: ['jquery'],
    },
    jquery: 'jquery',
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    publicPath: '',
    clean: true,
  },
  optimization: {
    runtimeChunk: 'single',
    minimize: true,
    minimizer: [new TerserPlugin({
      include: /(jquery)\.js/,
    })],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'src/index.html'),
      filename: 'index.html',
      scriptLoading: 'blocking',
      inject: 'head',
      favicon: path.resolve(__dirname, 'src/favicon.ico'),
      chunks: ['ruuvi', 'jquery'],
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'src/auth.html'),
      filename: 'auth.html',
      scriptLoading: 'blocking',
      inject: 'head',
      favicon: path.resolve(__dirname, 'src/favicon.ico'),
      chunks: ['auth', 'jquery'],
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'src/crypto-js-4.0.0/core.js'),
          to: path.resolve(__dirname, 'build/crypto-js-4.0.0/core.js')
        },
        {
          from: path.resolve(__dirname, 'src/crypto-js-4.0.0/md5.js'),
          to: path.resolve(__dirname, 'build/crypto-js-4.0.0/md5.js')
        },
        {
          from: path.resolve(__dirname, 'src/crypto-js-4.0.0/sha256.js'),
          to: path.resolve(__dirname, 'build/crypto-js-4.0.0/sha256.js')
        },
        {
          from: path.resolve(__dirname, 'src/crypto-js-4.0.0/enc-base64.js'),
          to: path.resolve(__dirname, 'build/crypto-js-4.0.0/enc-base64.js')
        },
        { from: path.resolve(__dirname, 'src/crypto_browserify.js') },
        {
          from: path.resolve(__dirname, 'src/css/style.css'),
          to: path.resolve(__dirname, 'build/css/')
        },
        {
          from: path.resolve(__dirname, 'src/assets/fonts/'),
          to: path.resolve(__dirname, 'build/assets/fonts/')
        },
      ],
    }),
  ]
}
