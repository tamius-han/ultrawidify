const webpack = require('webpack');
const ejs = require('ejs');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const WebpackShellPlugin = require('webpack-shell-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ChromeExtensionReloader = require('webpack-chrome-extension-reloader');
const { VueLoaderPlugin } = require('vue-loader');
const path = require('path');

const config = {
  mode: process.env.NODE_ENV,
  devtool: `${process.env.CHANNEL === 'stable' ? undefined : "inline-source-map"}`,
  context: __dirname + '/src',
  entry: {
    'ext/uw': './ext/uw.js',
    'uw-bg': './uw-bg.js',
    'popup/popup': './popup/popup.js',
    'options/options': './options/options.js',
    'csui/csui': './csui/csui.js',
    // 'install/first-time/first-time':'./install/first-time/first-time.js',
  },
  output: {
    path: __dirname + `/dist-${process.env.BROWSER == 'firefox' ? 'ff' : process.env.BROWSER}`,
    filename: '[name].js',
  },

  devtool: "source-map",

  resolve: {
    // maybe we'll move vue stuff to TS some day, but today is not the day
    extensions: [
      '.ts', '.tsx',
      '.js', '.vue'
    ],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        exclude: /node_modules/
      },
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
        test: /\.(sc|c)ss$/,
        use: [
          // MiniCssExtractPlugin.loader,
          'vue-style-loader',
          {
            loader: 'css-loader',
            // modules: {
            //   localIdentName: "[name]-[hash]"
            // }
            // options: {
            //   modules: true,
            //   // localIdentName: "🔶uw_[local]"
            //   localIdentName: "[name]-[hash]"
            //   // localIdentName: "uw_[local]"
            // }
          },
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true
            }
          }
        ],
      },
      // {
      //   test: /\.scss$/,
      //   use: [
      //     // MiniCssExtractPlugin.loader,
      //     'css-loader',
      //   //  {
      //   //     loader: 'css-loader',
      //   //     // options: {
      //   //     //   modules: true,
      //   //     //   localIdentName: "🔶uw_[local]"
      //   //     // }
      //   //   },
      //     'sass-loader'
      //   ],
      // },
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
      { from: 'res', to: 'res', ignore: ['css', 'css/**']},
      { from: 'ext', to: 'ext', ignore: ['conf/*', 'lib/**']},
      { from: 'csui', to: 'csui', ignore: ['src']},

      // we need to get webextension-polyfill and put it in common/lib
      { from: '../node_modules/webextension-polyfill/dist/browser-polyfill.js', to: 'common/lib/browser-polyfill.js'},

      // This is extension icon, as used on extension lists and/or extension's action button
      // This folder does not contain any GUI icons — these are in /res/icons.
      // (TODO: check if this copy is even necessary — /icons has same content as /res/icons)
      { from: 'icons', to: 'icons', ignore: ['icon.xcf'] },
      { from: 'popup/popup.html', to: 'popup/popup.html', transform: transformHtml },
      { from: 'csui/csui.html', to: 'csui/csui.html', transform: transformHtml },
      { from: 'options/options.html', to: 'options/options.html', transform: transformHtml },
      // { from: 'install/first-time/first-time.html', to: 'install/first-time/first-time.html', transform: transformHtml},
      {
        from: 'manifest.json',
        to: 'manifest.json',
        transform: (content) => {
          const jsonContent = JSON.parse(content);
          // jsonContent.version = version;

          // if (config.mode === 'development') {
          //   jsonContent['content_security_policy'] = "script-src 'self' 'unsafe-eval'; object-src 'self'";
          // }

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
                                    }.${process.env.BUILD_NUMBER === undefined ? 0 : process.env.BUILD_NUMBER}`;
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
                                    }.${process.env.BUILD_NUMBER === undefined ? 0 : process.env.BUILD_NUMBER}`;
            jsonContent.browser_action.default_title = "Ultrawidify Testing";

            // because we don't want web-ext to submit this as proper release
            delete jsonContent.applications;
          }

          if (process.env.BROWSER !== 'firefox') {
            jsonContent.version = jsonContent.version.replace(/[a-zA-Z-]/g, '');
            delete jsonContent.options_ui.browser_style;
            delete jsonContent.background.scripts;
          } else {
            delete jsonContent.background.service_worker;
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
      'process.env.CHANNEL': JSON.stringify(process.env.CHANNEL),

      '__VUE_OPTIONS_API__': true,
      '__VUE_PROD_DEVTOOLS__': false
    })
  ],
  optimization: {
    // minimize: false,
    // occurrenceOrder: false,
    // providedExports: false,
    // usedExports: false,
    // concatenateModules: false,
    // sideEffects: false,
  }
};

if (config.mode === 'production') {
  config.plugins = (config.plugins || []).concat([
    new webpack.DefinePlugin({
      '__VUE_OPTIONS_API__': true,
      '__VUE_PROD_DEVTOOLS__': false,

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
