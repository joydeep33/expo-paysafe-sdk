import {
  ConfigPlugin,
  withPlugins,
  withMainApplication,
  withAppBuildGradle,
  withPodfile,
} from "@expo/config-plugins";

const withPaysafe: ConfigPlugin = (config) => {
  return withPlugins(config, [
    // Android native module setup
    (config) =>
      withMainApplication(config, (mod) => {
        if (
          !mod.modResults.contents.includes(
            "import expo.modules.paysafe.PaysafeModule;"
          )
        ) {
          mod.modResults.contents = mod.modResults.contents.replace(
            "import android.app.Application;",
            `import android.app.Application;\nimport expo.modules.paysafe.PaysafeModule;`
          );
        }
        return mod;
      }),

    withAppBuildGradle((config) => {
      if (!config.modResults.contents.includes(`com.paysafe:android-sdk`)) {
        config.modResults.contents += `

dependencies {
  implementation 'com.paysafe:android-sdk:1.5.0' // adjust version as needed
}
        `.trim();
      }
      return config;
    }),

    // iOS: Add PaysafeCardPayments pod
    withPodfile((config) => {
      if (!config.modResults.contents.includes(`pod 'PaysafeCardPayments'`)) {
        config.modResults.contents += `\npod 'PaysafeCardPayments'\n`;
      }
      return config;
    }),
  ]);
};

export default withPaysafe;
