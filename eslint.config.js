import eslintPluginTypeScript from '@typescript-eslint/eslint-plugin';
import eslintParserTypeScript from '@typescript-eslint/parser';
import eslintPluginReact from 'eslint-plugin-react';
import eslintPluginReactHooks from 'eslint-plugin-react-hooks';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintConfigExpo from 'eslint-config-expo';
import importPlugin from 'eslint-plugin-import';
import reactNativePlugin from 'eslint-plugin-react-native';

export default [
  {
    ignores: ['node_modules/**', 'dist/**', '.expo/**', 'coverage/**', '**/*.json', '__mocks__/**', '**/__tests__/**/*.js'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: eslintParserTypeScript,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': eslintPluginTypeScript,
      react: eslintPluginReact,
      'react-hooks': eslintPluginReactHooks,
      import: importPlugin,
      'react-native': reactNativePlugin,
    },
    rules: {
      ...eslintConfigExpo.rules,
      ...eslintPluginTypeScript.configs.recommended.rules,
      ...eslintPluginReactHooks.configs.recommended.rules,
      ...eslintConfigPrettier.rules,
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/react-in-jsx-scope': 'off',
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [{ pattern: '@/**', group: 'internal', position: 'before' }],
          pathGroupsExcludedImportTypes: ['builtin'],
          alphabetize: { order: 'asc', caseInsensitive: true },
          'newlines-between': 'never',
        },
      ],
      'react-native/no-unused-styles': 'off',
      'react-native/split-platform-components': 'off',
      'react-native/no-inline-styles': 'off',
      'react-native/no-color-literals': 'off',
    },
  },
];
