const { withAndroidManifest } = require('@expo/config-plugins');

const NFC_ACTION = 'android.nfc.action.NDEF_DISCOVERED';
const DEFAULT_CATEGORY = 'android.intent.category.DEFAULT';
const MIME_TYPE = 'text/plain';

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

const withNfcIntentFilter = (config) =>
  withAndroidManifest(config, (config) => {
    const activity = findMainActivity(config.modResults);
    if (!activity) return config;
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
