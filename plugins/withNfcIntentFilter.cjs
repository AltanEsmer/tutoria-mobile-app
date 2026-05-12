const { withAndroidManifest } = require('@expo/config-plugins');

const NFC_ACTION = 'android.nfc.action.NDEF_DISCOVERED';
const DEFAULT_CATEGORY = 'android.intent.category.DEFAULT';
const MIME_TYPE = 'text/plain';
const NFC_FEATURE = 'android.hardware.nfc';

function findMainActivity(manifest) {
  const application = manifest.manifest.application?.[0];
  if (!application) return null;
  return (application.activity || []).find(
    (a) => a.$?.['android:name'] === '.MainActivity',
  );
}

function hasNfcIntentFilter(activity) {
  return (activity['intent-filter'] || []).some((filter) =>
    (filter.action || []).some(
      (a) => a.$?.['android:name'] === NFC_ACTION,
    ),
  );
}

function hasNfcUsesFeature(manifest) {
  const features = manifest.manifest['uses-feature'] || [];
  return features.some((f) => f.$?.['android:name'] === NFC_FEATURE);
}

const withNfcIntentFilter = (config) =>
  withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const activity = findMainActivity(manifest);
    if (!activity) return config;

    // android.hardware.nfc with required=false keeps the app installable on devices
    // without NFC hardware (e.g. older tablets, emulators) while still declaring the
    // capability for Play Store filtering and runtime intent dispatch.
    if (!hasNfcUsesFeature(manifest)) {
      manifest.manifest['uses-feature'] = manifest.manifest['uses-feature'] || [];
      manifest.manifest['uses-feature'].push({
        $: {
          'android:name': NFC_FEATURE,
          'android:required': 'false',
        },
      });
    }

    if (hasNfcIntentFilter(activity)) return config;

    activity['intent-filter'] = activity['intent-filter'] || [];
    activity['intent-filter'].push({
      action: [{ $: { 'android:name': NFC_ACTION } }],
      category: [{ $: { 'android:name': DEFAULT_CATEGORY } }],
      data: [{ $: { 'android:mimeType': MIME_TYPE } }],
    });

    return config;
  });

module.exports = withNfcIntentFilter;
