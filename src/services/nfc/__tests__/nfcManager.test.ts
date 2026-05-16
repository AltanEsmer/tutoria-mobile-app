import { Platform } from 'react-native';
import { NfcManager, NfcTech, Ndef } from 'react-native-nfc-manager';
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

  it('calls requestTechnology with alertMessage option on iOS', async () => {
    (NfcManager.getTag as jest.Mock).mockResolvedValueOnce(VALID_TAG);
    (Ndef.text.decodePayload as jest.Mock).mockReturnValueOnce('tutoria:module-a');

    await readTag();

    expect(NfcManager.requestTechnology).toHaveBeenCalledWith(NfcTech.Ndef, {
      alertMessage: 'Hold your Tutoria card near the top of your iPhone',
    });
  });

  it('calls setAlertMessageIOS with "Card detected!" for a valid card', async () => {
    (NfcManager.getTag as jest.Mock).mockResolvedValueOnce(VALID_TAG);
    (Ndef.text.decodePayload as jest.Mock).mockReturnValueOnce('tutoria:module-a');

    await readTag();

    expect(NfcManager.setAlertMessageIOS).toHaveBeenCalledWith('Card detected!');
    expect(NfcManager.invalidateSessionWithErrorIOS).not.toHaveBeenCalled();
  });

  it('calls invalidateSessionWithErrorIOS for an invalid card on iOS', async () => {
    (NfcManager.getTag as jest.Mock).mockResolvedValueOnce(VALID_TAG);
    (Ndef.text.decodePayload as jest.Mock).mockReturnValueOnce('not-tutoria:foo');

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
