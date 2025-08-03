const path = require('path');

module.exports = {
  entry: './src/webview/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'webview.js',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  externals: {
    vscode: 'commonjs vscode',
  },
  target: 'web',
};