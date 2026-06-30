const { createTamagui } = require('@tamagui/core');
const { createInterFont } = require('@tamagui/font-inter');
const { createAnimations } = require('@tamagui/animations-react-native');
const { defaultConfig } = require('@tamagui/config/v4');

const interFont = createInterFont();

const animations = createAnimations({
  fast: { type: 'spring', damping: 20, mass: 1.2, stiffness: 250 },
  medium: { type: 'spring', damping: 10, mass: 0.9, stiffness: 100 },
  slow: { type: 'spring', damping: 20, mass: 1.2, stiffness: 50 },
});

const config = createTamagui({
  ...defaultConfig,
  animations,
  fonts: {
    heading: interFont,
    body: interFont,
  },
});

module.exports = config;
module.exports.default = config;
module.exports.config = config;
