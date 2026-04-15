const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * Custom resolver: some stale graphs still request the legacy path
 * `react-native-screens/src/native-stack/contexts/GHContext.tsx` (removed in v4).
 * We map that to `src/contexts.tsx`. A patch-package shim also exists under the old path.
 *
 * @type {import('metro-config').MetroConfig}
 */
const projectRoot = __dirname;
const defaultConfig = getDefaultConfig(projectRoot);
const upstreamResolveRequest = defaultConfig.resolver.resolveRequest;

const config = {
  // Ensure react-native-screens sources are always watched (helps Metro file SHA-1 on some setups)
  watchFolders: [path.resolve(projectRoot, 'node_modules/react-native-screens')],
  resolver: {
    resolveRequest(context, moduleName, platform) {
      const isLegacyGh =
        typeof moduleName === 'string' &&
        moduleName.includes('react-native-screens') &&
        moduleName.includes('native-stack/contexts/GHContext');
      if (isLegacyGh) {
        return {
          filePath: path.resolve(
            projectRoot,
            'node_modules/react-native-screens/src/contexts.tsx',
          ),
          type: 'sourceFile',
        };
      }
      if (typeof upstreamResolveRequest === 'function') {
        return upstreamResolveRequest(context, moduleName, platform);
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
