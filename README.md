// README.md

# expo-paysafe-sdk

Custom Expo config plugin + native module for integrating Paysafe card payments with 3D Secure support in React Native Expo apps.

---

## 📦 Installation

```bash
# Install your custom package (replace with actual npm name)
npm install expo-paysafe-sdk

# Or if using Yarn
yarn add expo-paysafe-sdk
```

## ⚙️ Add the Config Plugin to `app.config.js`

```js
// app.config.js
import withPaysafe from "expo-paysafe-sdk/plugin/withPaysafe";

export default withPaysafe({
  name: "YourApp",
  slug: "your-app",
  // other config...
});
```

## 💳 Usage (React Native)

```ts
import { initiateCheckout } from "expo-paysafe-sdk";

const token = await initiateCheckout({
  apiKey: "<YOUR_API_KEY>",
  accountId: "<YOUR_ACCOUNT_ID>",
  amount: 100.0, // in currency units
  currencyCode: "USD",
  environment: "TEST", // or 'LIVE'
});

// send `token` to your backend to complete payment
```

---

## 🖥️ Backend Integration

Once you receive the `paymentHandleToken` from the mobile SDK, make an API call to Paysafe's servers:

### 🔐 `POST /cardpayments/v1/accounts/{accountId}/auths`

**Example (Node.js):**

```ts
import axios from "axios";

const authPaysafe = async (paymentHandleToken: string) => {
  const result = await axios.post(
    "https://api.test.paysafe.com/cardpayments/v1/accounts/<ACCOUNT_ID>/auths",
    {
      merchantRefNum: "ref-" + Date.now(),
      amount: 10000, // amount in minor units (e.g. 100.00 USD → 10000)
      currencyCode: "USD",
      paymentHandleToken,
    },
    {
      auth: {
        username: "<API_KEY_USERNAME>",
        password: "<API_KEY_PASSWORD>",
      },
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return result.data;
};
```

### 📘 Paysafe Test Card for 3DS

Use this for testing:

- Card Number: `4000 0000 0000 1091`
- Expiry: `12/30`
- CVV: `123`

---

## 🧪 Test & Build

Use `expo run:ios` or `expo run:android` after plugin is applied.

---

## 🧩 Supported Features

- ✅ Card Payments
- ✅ 3D Secure (3DS)
- ✅ React Native + Expo SDK
- ✅ Expo Config Plugin

---

## 🔒 Disclaimer

This module helps bridge native Paysafe SDK in Expo apps. You are responsible for securely handling API credentials and compliance.

---

MIT License © 2025
