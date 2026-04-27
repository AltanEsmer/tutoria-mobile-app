module.exports = {
  downloadAsync: jest.fn().mockResolvedValue({ status: 200, uri: '/cache/audio/test.mp3' }),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false }),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  cacheDirectory: '/mock-cache/',
  documentDirectory: '/mock-documents/',
};
