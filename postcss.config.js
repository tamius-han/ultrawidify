const path = require('path');
const aliases = require('./paths.config');

module.exports = {
  plugins: [
    require('postcss-import')({
      resolve(id) {
        for (const alias in aliases) {
          if (id === alias || id.startsWith(alias + '/')) {
            return path.resolve(
              aliases[alias],
              id.slice(alias.length + 1)
            )
          }
        }
        return id
      },
    }),

    require('@tailwindcss/postcss'),
    require('postcss-nested'),
    require('autoprefixer'),
  ],
};
