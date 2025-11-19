// Use shared ESLint config from @nexuscore/config package
const sharedConfig = require('@nexuscore/config').eslint;

module.exports = {
  ...sharedConfig,
  parserOptions: {
    ...sharedConfig.parserOptions,
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
};
