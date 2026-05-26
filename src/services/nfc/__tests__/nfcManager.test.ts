import { Platform } from 'react-native';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import { readTag } from '../nfcManager';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const VALID_TAG = {
  id: 'mock-id',
  ndefMessage: [{ payload: [] }],
};

beforeAll(() => {
  delete process.env.EXPO_PUBLIC_ENABLE_NFC_MOCK;
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// iOS tests
// ---------------------------------------------------------------------------

describe('readTag — iOS', () => {
  beforeEach(() => {
    // jest-expo defaults to ios; set explicitly to be self-documenting
    (Platform as { OS: string }).OS = 'ios';
  });

  // iOS reads via a Mifare tag session: raw READ pages → Type 2 NDEF TLV →
  // decoded text. Set up the mocks so the read resolves to `decoded`.
  function mockMifareRead(decoded: string) {
    (NfcManager.getTag as jest.Mock).mockResolvedValueOnce({ id: 'mock-id' });
    // Page bytes containing an NDEF-Message TLV (0x03, len 4) and Terminator (0xFE)
    (NfcManager.sendMifareCommandIOS as jest.Mock).mockResolvedValueOnce([
      0x03, 0x04, 0xaa, 0xbb, 0xcc, 0xdd, 0xfe,
    ]);
    (Ndef.decodeMessage as jest.Mock).mockReturnValueOnce([{ payload: [] }]);
    (Ndef.text.decodePayload as jest.Mock).mockReturnValueOnce(decoded);
  }

  it('opens a Mifare tag session with the alertMessage option on iOS', async () => {
    mockMifareRead('tutoria:module-a');

    await readTag();

    expect(NfcManager.requestTechnology).toHaveBeenCalledWith(NfcTech.MifareIOS, {
      alertMessage: 'Hold your Tutoria card near the top of your iPhone',
    });
  });

  it('calls setAlertMessageIOS with "Card detected!" for a valid card', async () => {
    mockMifareRead('tutoria:module-a');

    await readTag();

    expect(NfcManager.setAlertMessageIOS).toHaveBeenCalledWith('Card detected!');
    expect(NfcManager.invalidateSessionWithErrorIOS).not.toHaveBeenCalled();
  });

  it('calls invalidateSessionWithErrorIOS for an invalid card on iOS', async () => {
    mockMifareRead('not-tutoria:foo');

    await readTag();

    expect(NfcManager.invalidateSessionWithErrorIOS).toHaveBeenCalledWith(
      'This is not a Tutoria card',
    );
    expect(NfcManager.setAlertMessageIOS).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Android tests
// ---------------------------------------------------------------------------

describe('readTag — Android', () => {
  beforeEach(() => {
    (Platform as { OS: string }).OS = 'android';
  });

  afterAll(() => {
    // Restore to ios so other suites are unaffected
    (Platform as { OS: string }).OS = 'ios';
  });

  it('calls requestTechnology with only NfcTech.Ndef on Android (no options object)', async () => {
    (NfcManager.getTag as jest.Mock).mockResolvedValueOnce(VALID_TAG);
    (Ndef.text.decodePayload as jest.Mock).mockReturnValueOnce('tutoria:module-a');

    await readTag();

    expect(NfcManager.requestTechnology).toHaveBeenCalledWith(NfcTech.Ndef);
    expect(NfcManager.requestTechnology).not.toHaveBeenCalledWith(NfcTech.Ndef, expect.any(Object));
    expect(NfcManager.setAlertMessageIOS).not.toHaveBeenCalled();
    expect(NfcManager.invalidateSessionWithErrorIOS).not.toHaveBeenCalled();
  });
});
