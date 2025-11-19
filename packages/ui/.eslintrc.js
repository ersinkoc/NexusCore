module.exports = {
  extends: ['@nexuscore/config/eslint-preset'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  env: {
    browser: true,
  },
};
