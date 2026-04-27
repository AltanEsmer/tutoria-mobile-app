module.exports = {
  useAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    stop: jest.fn(),
    replace: jest.fn(),
    remove: jest.fn(),
    playing: false,
  })),
  useAudioRecorder: jest.fn(() => ({
    record: jest.fn(),
    stop: jest.fn(),
    isRecording: false,
    uri: null,
  })),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  requestRecordingPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  RecordingPresets: { HIGH_QUALITY: {} },
};
