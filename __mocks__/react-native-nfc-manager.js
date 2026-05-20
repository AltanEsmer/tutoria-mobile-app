const NfcManager = {
  start: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  requestTechnology: jest.fn().mockResolvedValue(undefined),
  cancelTechnologyRequest: jest.fn().mockResolvedValue(undefined),
  getTag: jest.fn().mockResolvedValue(null),
  isSupported: jest.fn().mockResolvedValue(true),
  isEnabled: jest.fn().mockResolvedValue(true),
  registerTagEvent: jest.fn().mockResolvedValue(undefined),
  unregisterTagEvent: jest.fn().mockResolvedValue(undefined),
  setAlertMessageIOS: jest.fn().mockResolvedValue(undefined),
  invalidateSessionWithErrorIOS: jest.fn().mockResolvedValue(undefined),
};

const NfcTech = { Ndef: 'Ndef' };

const Ndef = {
  text: {
    decodePayload: jest.fn().mockReturnValue('tutoria:mock-module'),
  },
  decodeMessage: jest.fn().mockReturnValue([]),
  uri: { decodePayload: jest.fn() },
};

module.exports = { __esModule: true, default: NfcManager, NfcManager, NfcTech, Ndef };
