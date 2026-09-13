const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Let Metro bundle document/archive file types as assets, so files under
// assets/archive/** can be require()'d from lib/archiveStore.ts and shared/
// downloaded from the Archive tab. Add more extensions here if a new file
// type shows up that isn't in this list yet.
config.resolver.assetExts.push('pdf', 'docx', 'doc', 'pptx', 'xlsx', 'zip');

module.exports = config;
