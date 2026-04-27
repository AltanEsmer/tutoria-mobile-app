module.exports = {
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  useNetInfo: jest.fn(() => ({ isConnected: true, isInternetReachable: true })),
  NetInfoStateType: { unknown: 'unknown', none: 'none', wifi: 'wifi', cellular: 'cellular' },
};
