import { ConfigPlugin, withAppBuildGradle, withPlugins, withPodfile } from '@expo/config-plugins';
import path from 'path';

const withPaysafe: ConfigPlugin = (config) => {
  return withPlugins(config, [
    // Modify Android build.gradle
    (config) => {
      return withAppBuildGradle(config, (config) => {
        config.modResults.contents = config.modResults.contents.replace(
          /dependencies \{/,
          `dependencies {
        implementation 'com.paysafe:android-sdk:1.0.0' // replace with actual version`
        );
        return config;
      });
    },

    // Modify iOS Podfile
    (config) => {
      return withPodfile(config, (config) => {
        config.modResults.contents += `\npod 'PaysafeSDK'\n`;
        return config;
      });
    },
  ]);
};

export default withPaysafe;