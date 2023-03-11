require("webpack")
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const TerserPlugin = require("terser-webpack-plugin");
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  entry: {
    ruuvi: {
      import: [path.resolve(__dirname, 'src/ruuvi.js')],
      dependOn: ['jquery', 'crypto'],
    },
    auth: {
      import: [path.resolve(__dirname, 'src/auth.js')],
      dependOn: ['jquery', 'crypto'],
    },
    jquery: 'jquery',
    crypto: path.resolve(__dirname, 'src/crypto.js'),
    style: path.resolve(__dirname, 'src/scss/style.scss'),
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
  module: {
    rules: [
      {
        test: /\.(woff|woff2)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader', // Translates CSS into CommonJS
          'sass-loader', // Compiles Sass to CSS
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'src/index.html'),
      filename: 'index.html',
      scriptLoading: 'blocking',
      inject: 'head',
      favicon: path.resolve(__dirname, 'src/favicon.ico'),
      chunks: ['ruuvi', 'jquery', 'crypto', 'style'],
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'src/auth.html'),
      filename: 'auth.html',
      scriptLoading: 'blocking',
      inject: 'head',
      favicon: path.resolve(__dirname, 'src/favicon.ico'),
      chunks: ['auth', 'jquery', 'crypto', 'style'],
    }),
    new MiniCssExtractPlugin({
      filename: 'style.css',
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: path.resolve(__dirname, 'src/crypto_browserify.js') },
      ],
    }),
  ]
}
