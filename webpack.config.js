const webpack = require('webpack');
const ejs = require('ejs');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const WebpackShellPlugin = require('webpack-shell-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ChromeExtensionReloader = require('webpack-chrome-extension-reloader');
const { VueLoaderPlugin } = require('vue-loader');

const config = {
  mode: process.env.NODE_ENV,
  devtool: "inline-source-map",
  context: __dirname + '/src',
  entry: {
    'ext/uw': './ext/uw.js',
    'ext/uw-bg': './ext/uw-bg.js',
    'popup/popup': './popup/popup.js',
    'options/options': './options/options.js',
  },
  output: {
    path: __dirname + `/dist-${process.env.BROWSER == 'firefox' ? 'ff' : process.env.BROWSER}`,
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.js', '.vue'],
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loaders: 'vue-loader',
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        test: /\.scss$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
      },
      {
        test: /\.sass$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader?indentedSyntax'],
      },
      {
        test: /\.(png|jpg|gif|svg|ico)$/,
        loader: 'file-loader',
        options: {
          name: '[path][name].[ext]',
        },
      },
      {
        test: /\.(woff(2)?)$/,
        loader: 'file-loader',
        options: {
          name: '[path][name].[ext]',
        },
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: "babel-loader"
      },
    ],
  },
  plugins: [
    new VueLoaderPlugin(),
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
    new CopyWebpackPlugin([
      { from: 'res', to: 'res'},
      { from: 'ext', to: 'ext', ignore: ['conf/*', 'lib/**']},
      { from: 'icons', to: 'icons', ignore: ['icon.xcf'] },
      { from: 'popup/popup.html', to: 'popup/popup.html', transform: transformHtml },
      { from: 'options/options.html', to: 'options/options.html', transform: transformHtml },
      {
        from: 'manifest.json',
        to: 'manifest.json',
        transform: (content) => {
          const jsonContent = JSON.parse(content);
          // jsonContent.version = version;

          if (config.mode === 'development') {
            jsonContent['content_security_policy'] = "script-src 'self' 'unsafe-eval'; object-src 'self'";
          }

          if (process.env.CHANNEL === 'nightly') {
            jsonContent.name = "Ultrawidify - nightly";
            jsonContent.description = "FOR TESTING ONLY -- THIS BUILD USES ONLY THE FRESHEST COMMITS FROM GITHUB AND MAY THEREFORE BE COMPLETELY BROKEN";

            // version numbers for nightly builds: YYMM.DD.BUILD_NUMBER
            jsonContent.version = `${new Date()
                                            .toISOString()     // YYYY-MM-DDTHH:MM:SS...
                                            .split('T')[0]     // gives YYYY-MM-DD
                                            .substr(2)         // YYYY -> YY
                                            .replace('-', '')  // YY-MM-DD -> YYMM-DD
                                            .replace('-', '.') // YYMM-DD -> YYMM.DD
                                    }.${process.env.BUILD_NUMBER}`;
            jsonContent.browser_action.default_title = "Ultrawidify Nightly";
            
            // because we don't want web-ext to submit this as proper release
            delete jsonContent.applications;
          } else if (process.env.CHANNEL === 'testing') {
            jsonContent.name = "Ultrawidify - testing";
            jsonContent.description = "FOR TESTING ONLY -- this build is intended for testing a fix of certain bugs. It's not fit for normal use.";

            // version numbers for nightly builds: YYMM.DD.BUILD_NUMBER
            jsonContent.version = `${new Date()
                                            .toISOString()     // YYYY-MM-DDTHH:MM:SS...
                                            .split('T')[0]     // gives YYYY-MM-DD
                                            .substr(2)         // YYYY -> YY
                                            .replace('-', '')  // YY-MM-DD -> YYMM-DD
                                            .replace('-', '.') // YYMM-DD -> YYMM.DD
                                    }.${process.env.BUILD_NUMBER}`;
            jsonContent.browser_action.default_title = "Ultrawidify Testing";
            
            // because we don't want web-ext to submit this as proper release
            delete jsonContent.applications;
          }

          if (process.env.BROWSER !== 'firefox') {
            jsonContent.version = jsonContent.version.replace(/[a-zA-Z-]/g, '');
          }

          return JSON.stringify(jsonContent, null, 2);
        },
      },
    ]),
    new WebpackShellPlugin({
      onBuildEnd: ['node scripts/remove-evals.js'],
    }),
    new webpack.DefinePlugin({
      'process.env.BROWSER': JSON.stringify(process.env.BROWSER),
      'process.env.CHANNEL': JSON.stringify(process.env.CHANNEL)
    })
  ],
};

if (config.mode === 'production') {
  config.plugins = (config.plugins || []).concat([
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"production"',
      },
    })
  ]);
}

if (process.env.HMR === 'true') {
  config.plugins = (config.plugins || []).concat([
    new ChromeExtensionReloader(),
  ]);
}

function transformHtml(content) {
  return ejs.render(content.toString(), {
    ...process.env,
  });
}

module.exports = config;
