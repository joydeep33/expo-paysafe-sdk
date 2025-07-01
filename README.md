# expo-paysafe-sdk

A custom Expo plugin and native module to integrate the Paysafe SDK in Android and iOS apps using Expo.

## 🚀 Features

- Native support for Paysafe payment flows in React Native Expo
- Custom config plugin to automatically link SDK dependencies
- Works with `expo prebuild` via `withPaysafe` plugin
- Supports both Android and iOS

## 📦 Installation

```sh
npm install expo-paysafe-sdk
```

Add it to your `app.config.js` or `app.config.ts`:

```ts
import withPaysafe from "expo-paysafe-sdk/plugin/withPaysafe";

export default {
  name: "your-app",
  plugins: [withPaysafe],
};
```

## 🧩 Usage

```ts
import { initiateCheckout } from "expo-paysafe-sdk";

await initiateCheckout({
  amount: 1000,
  currencyCode: "USD",
  customerId: "user-id",
  requestBillingAddress: true,
  environment: "TEST",
});
```

> The native modules currently return a simulated token. You'll need to connect the actual Paysafe SDK in native code.

## 📲 Supported Platforms

- ✅ Android
- ✅ iOS

## 📝 License

MIT
