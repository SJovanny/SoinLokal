import { createTamagui } from 'tamagui';
import { createInterFont } from '@tamagui/font-inter';
import { createAnimations } from '@tamagui/animations-react-native';
import { defaultConfig } from '@tamagui/config/v4';

declare const config: ReturnType<typeof createTamagui>;

export { config };
export default config;

export type Conf = typeof config;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}
