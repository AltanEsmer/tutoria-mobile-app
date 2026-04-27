/** @type {import('jest').Config} */
const config = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|zustand)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  collectCoverageFrom: [
    'src/services/**/*.ts',
    'src/stores/**/*.ts',
    'src/hooks/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/index.ts',
  ],
  coverageThreshold: {
    './src/stores/useAuthStore.ts': { lines: 100 },
    './src/stores/useNfcStore.ts': { lines: 100 },
    './src/stores/useLessonStore.ts': { lines: 85 },
    './src/stores/useProgressStore.ts': { lines: 85 },
    './src/services/api/progress.ts': { lines: 100 },
    './src/services/nfc/tagParser.ts': { lines: 100 },
  },
};

module.exports = config;
