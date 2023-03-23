require("webpack")
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  entry: {
    ruuvi: {
      import: [path.resolve(__dirname, 'src/ruuvi.js')],
    },
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'bundle.js',
    clean: true,
  },
  optimization: {
    minimize: true,
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
          "style-loader",
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
    }),
  ]
}
