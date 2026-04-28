// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Prevent Jest coverage reports and test artefacts from triggering Metro's
// file watcher / Fast Refresh while `npm run start` is running alongside tests.
config.watchFolders = (config.watchFolders ?? []).filter(
  (folder) => !folder.includes('coverage'),
);
config.resolver = {
  ...config.resolver,
  blockList: [
    ...(Array.isArray(config.resolver?.blockList) ? config.resolver.blockList : []),
    new RegExp(`${path.resolve(__dirname, 'coverage').replace(/\\/g, '/')}(/.*)?`),
  ],
};

module.exports = config;
