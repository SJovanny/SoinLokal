module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@supabase/.*)',
  ],
  setupFilesAfterEnv: ['./jest.setup.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/utils/**/*.ts',
    'src/utils/**/*.tsx',
    '!src/**/*.d.ts',
    '!src/utils/supabase.ts',
    '!src/utils/pdfExport.ts',
    '!src/utils/routing.ts',
    '!src/utils/mapboxGeocoding.ts',
    '!src/utils/nativeGeocoding.ts',
    '!src/utils/geocoding.ts',
    '!src/utils/mapbox.ts',
    '!src/utils/navigation.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 85,
      lines: 90,
      statements: 90,
    },
  },
};
