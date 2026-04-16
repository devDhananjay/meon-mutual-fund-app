/**
 * Copies RN 0.79–compatible Fabric spec typings into react-native-screens after npm install.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const screens = path.join(root, 'node_modules', 'react-native-screens');
const fixRoot = path.join(__dirname, 'rn-screens-codegen-fix');

const files = [
  'src/fabric/safe-area/SafeAreaViewNativeComponent.ts',
  'src/fabric/FullWindowOverlayNativeComponent.ts',
  'src/fabric/ScreenStackHeaderConfigNativeComponent.ts',
  'src/fabric/ScreenNativeComponent.ts',
  'src/fabric/ScreenStackNativeComponent.ts',
  'src/fabric/ModalScreenNativeComponent.ts',
  'src/fabric/SearchBarNativeComponent.ts',
  'src/fabric/ScreenStackHeaderSubviewNativeComponent.ts',
  'src/fabric/gamma/SplitViewHostNativeComponent.ts',
  'src/fabric/gamma/SplitViewScreenNativeComponent.ts',
  'src/fabric/gamma/stack/StackScreenNativeComponent.ts',
  'src/fabric/tabs/TabsHostNativeComponent.ts',
  'src/fabric/tabs/TabsScreenNativeComponent.ts',
  'src/fabric/tabs/TabsBottomAccessoryNativeComponent.ts',
  'src/fabric/tabs/TabsBottomAccessoryContentNativeComponent.ts',
  'src/native-stack/contexts/GHContext.tsx',
];

if (!fs.existsSync(screens)) {
  console.warn(
    '[apply-rn-screens-codegen-fix] react-native-screens not installed; skip.',
  );
  process.exit(0);
}

for (const rel of files) {
  const src = path.join(fixRoot, rel);
  const dest = path.join(screens, rel);
  if (!fs.existsSync(src)) {
    console.error('[apply-rn-screens-codegen-fix] missing fixture:', rel);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

console.log(
  '[apply-rn-screens-codegen-fix] react-native-screens Fabric specs updated.',
);
