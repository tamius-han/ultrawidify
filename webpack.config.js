const webpack = require('webpack');
const ejs = require('ejs');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const WebpackShellPluginNext = require('webpack-shell-plugin-next');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { VueLoaderPlugin } = require('vue-loader');
const path = require('path');
const aliases = require('./paths.config');

const config = {
  watchOptions: {
    ignored: /node_modules/
  },
  mode: process.env.NODE_ENV,
  devtool: `${process.env.CHANNEL === 'stable' ? undefined : "inline-source-map"}`,
  context: __dirname + '/src',
  entry: {
    'ext/uw': './ext/uw.js',
    'uw-bg': './uw-bg.js',
    'csui/csui-popup': './csui/csui-popup.js',
    // 'csui/settings': './csui/settings.js',
    // 'csui/csui': './csui/csui.js',

    // 'ui/pages/updated/updated': './ui/pages/updated/updated.js',
    'ui/pages/updated/updated': './ui/pages/updated/updated.js',
    'ui/pages/settings/settings': './ui/pages/settings/settings.js',
  },
  output: {
    path: __dirname + `/dist-${process.env.BROWSER == 'firefox' ? 'ff' : process.env.BROWSER}`,
    filename: '[name].js',
  },

  devtool: "source-map",

  resolve: {
    alias: aliases, // SEE: paths.conf.js
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
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              appendTsSuffixTo: [/\.vue$/],
              transpileOnly: true,
            }
          }
        ],
      },
      {
        test: /\.vue$/,
        use: [
          {
            loader: 'vue-loader'
          }
        ]
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader'
          }
        ]
      },
      {
        test: /\.(sc|c|postc)ss$/,
        use: [
          'vue-style-loader',
          {
            loader: 'css-loader',
            options: {
              // Uncomment if you want CSS modules
              // modules: {
              //   localIdentName: "[name]-[hash]"
              // }
            }
          },
          'postcss-loader',
        ]
      },
      {
        test: /\.(png|jpg|webp|gif|svg|ico)$/,
        type: 'asset/resource',
        generator: {
          filename: '[path][name][ext]' // Webpack 5 uses generator.filename
        }
      },
      {
        test: /\.(woff(2)?)$/,
        type: 'asset/resource',
        generator: {
          filename: '[path][name][ext]'
        }
      }
    ]
  },
  plugins: [
    new VueLoaderPlugin(),
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'res', to: 'res', globOptions: { ignore: ['css', 'css/**'] } },
        { from: 'ext', to: 'ext', globOptions: { ignore: ['conf/*', 'lib/**'] } },
        { from: 'csui', to: 'csui', globOptions: { ignore: ['src'] }},
        { from: 'ui/res', to: 'ui/res' },

        // we need to get webextension-polyfill and put it in common/lib
        { from: '../node_modules/webextension-polyfill/dist/browser-polyfill.js', to: 'common/lib/browser-polyfill.js'},

        // This is extension icon, as used on extension lists and/or extension's action button
        // This folder does not contain any GUI icons — these are in /res/icons.
        // (TODO: check if this copy is even necessary — /icons has same content as /res/icons)
        { from: 'icons', to: 'icons', globOptions: { ignore: ['icon.xcf'] } },
        { from: 'csui/csui-popup.html', to: 'csui/csui-popup.html', transform: transformHtml },
        { from: 'csui/csui-overlay-normal.html', to: 'csui/csui.html', transform: transformHtml },
        { from: 'csui/csui-overlay-dark.html', to: 'csui/csui-dark.html', transform: transformHtml },
        { from: 'csui/csui-overlay-light.html', to: 'csui/csui-light.html', transform: transformHtml },
        { from: 'ui/pages/settings/index.html', to: 'ui/pages/settings/index.html', transform: transformHtml },
        // { from: 'ui/pages/installed/index.html', to: 'ui/pages/installed/index.html', transform: transformHtml },
        { from: 'ui/pages/updated/index.html',  to: 'ui/pages/updated/index.html', transform: transformHtml },
        { from: 'ui/pages/settings/index.html', to: 'ui/pages/settings/index.html', transform: transformHtml },
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
              try {
                delete jsonContent.options_ui.browser_style;
              } catch (e) { }
              try {
                delete jsonContent.background.scripts;
              } catch (e) {}
            } else {
              delete jsonContent.background.service_worker;
            }

            return JSON.stringify(jsonContent, null, 2);
          },
        },
      ]
  }),
    new WebpackShellPluginNext({
      onBuildEnd: {
        scripts: ['node scripts/remove-evals.js'],
        blocking: true,
        parallel: false,
      },
    }),
    new webpack.DefinePlugin({
      'process.env.BROWSER': JSON.stringify(process.env.BROWSER),
      'process.env.CHANNEL': JSON.stringify(process.env.CHANNEL),

      '__VUE_OPTIONS_API__': true,
      '__VUE_PROD_DEVTOOLS__': false,
      '__VUE_PROD_HYDRATION_MISMATCH_DETAILS__': true
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
    // new ChromeExtensionReloader(), // no longer a thing for webpack 5
  ]);
}

function transformHtml(content) {
  return ejs.render(content.toString(), {
    ...process.env,
  });
}

module.exports = config;
