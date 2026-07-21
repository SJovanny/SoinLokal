// Mock react-native
jest.mock('react-native', () => {
  const RN = {
    Alert: { alert: jest.fn() },
    StyleSheet: { create: (s) => s, flatten: (s) => s },
    Platform: { OS: 'ios', select: (obj) => obj.ios },
    Dimensions: {
      get: () => ({ width: 375, height: 812 }),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    TouchableOpacity: 'TouchableOpacity',
    TouchableWithoutFeedback: 'TouchableWithoutFeedback',
    ActivityIndicator: 'ActivityIndicator',
    TextInput: 'TextInput',
    View: 'View',
    Text: 'Text',
    ScrollView: 'ScrollView',
    FlatList: 'FlatList',
    Image: 'Image',
    SafeAreaView: 'SafeAreaView',
    KeyboardAvoidingView: 'KeyboardAvoidingView',
    Modal: 'Modal',
    Switch: 'Switch',
    StatusBar: 'StatusBar',
    Linking: { openURL: jest.fn() },
  };
  return RN;
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
  FontAwesome: 'FontAwesome',
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'fr', changeLanguage: jest.fn() },
  }),
  Trans: ({ children }) => children,
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
  },
}));

// Suppress console.log in tests (from debugLog)
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock __DEV__
global.__DEV__ = true;
