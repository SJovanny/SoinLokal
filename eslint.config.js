const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

module.exports = [
  ...compat.extends('expo'),
  {
    rules: {
      'no-console': 'warn',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**', 'jest.setup.js'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        expect: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },
  {
    ignores: [
      'admin-web/**',
      'supabase/**',
      'coverage/**',
      '.expo/**',
      'scripts/**',
      'eslint.config.js',
      'jest.config.js',
      'jest.setup.js',
      'babel.config.js',
      'metro.config.js',
      'tamagui.config.js',
      'tamagui.config.d.ts',
    ],
  },
];
