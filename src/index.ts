import { requireNativeModule } from "expo-modules-core";

const Paysafe = requireNativeModule("Paysafe");

export async function initiateCheckout(options: {
  apiKey: string;
  accountId: string;
  amount: number;
  currencyCode: string;
  environment?: "TEST" | "LIVE";
  merchantRefNum?: string;
  bundleId?: string;
  promotionId?: string;
  customer?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  merchantDescriptor?: {
    dynamicDescriptor: string;
    phone: string;
  };
}): Promise<string> {
  return await Paysafe.initiateCheckout(options);
}

export default {
  initiateCheckout,
};
