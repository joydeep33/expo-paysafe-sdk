import { requireNativeModule } from 'expo-modules-core';

const Paysafe = requireNativeModule('Paysafe');

export async function initiateCheckout(options: {
  amount: number;
  currencyCode: string;
  customerId?: string;
  requestBillingAddress?: boolean;
  environment?: 'TEST' | 'LIVE';
}): Promise<string> {
  return await Paysafe.initiateCheckout(options);
}

export default {
  initiateCheckout,
};