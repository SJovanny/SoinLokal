import { debugLog, DEV_CONFIG, IS_DEVELOPMENT, devAlert } from '../devConfig';

describe('debugLog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs message with prefix when ENABLE_DEBUG_LOGS is true', () => {
    // In test env __DEV__ = true, so ENABLE_DEBUG_LOGS = true
    if (DEV_CONFIG.ENABLE_DEBUG_LOGS) {
      debugLog('test message');
      expect(console.log).toHaveBeenCalledWith(
        '[SoinLokal Debug] test message',
      );
    }
  });

  it('logs message with data when provided', () => {
    if (DEV_CONFIG.ENABLE_DEBUG_LOGS) {
      debugLog('test', { key: 'value' });
      expect(console.log).toHaveBeenCalledWith(
        '[SoinLokal Debug] test',
        { key: 'value' },
      );
    }
  });
});

describe('devAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs warning in development mode', () => {
    if (IS_DEVELOPMENT) {
      devAlert('Title', 'Message');
      expect(console.warn).toHaveBeenCalledWith(
        '[DEV ALERT] Title: Message',
      );
    }
  });
});

describe('DEV_CONFIG', () => {
  it('has expected shape', () => {
    expect(typeof DEV_CONFIG.SHOW_DEBUG_INFO).toBe('boolean');
    expect(typeof DEV_CONFIG.ENABLE_DEBUG_LOGS).toBe('boolean');
    expect(typeof DEV_CONFIG.IGNORE_SSL).toBe('boolean');
    expect(typeof DEV_CONFIG.USE_MOCK_DATA).toBe('boolean');
    expect(typeof DEV_CONFIG.NETWORK_DELAY).toBe('number');
    expect(typeof DEV_CONFIG.OFFLINE_MODE).toBe('boolean');
  });
});
