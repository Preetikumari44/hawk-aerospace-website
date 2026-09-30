import { Platform } from 'react-native';

// The native SDK is only loaded on Android/iOS so the web bundle stays clean.
let NativeRazorpay = null;
if (Platform.OS !== 'web') {
  NativeRazorpay = require('react-native-razorpay').default;
}

let webScriptPromise = null;

const loadWebCheckoutScript = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Online payments are not supported on this platform.'));
  }
  if (window.Razorpay) return Promise.resolve();
  if (webScriptPromise) return webScriptPromise;

  webScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      webScriptPromise = null;
      reject(new Error('Unable to load the payment gateway. Please check your connection.'));
    };
    document.body.appendChild(script);
  });
  return webScriptPromise;
};

/**
 * Opens the real Razorpay payment page (Standard Checkout).
 *
 * Resolves with the checkout result:
 *   { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * Rejects on user dismissal or payment failure.
 *
 * options:
 *   key        - Razorpay API key id (rzp_test_... / rzp_live_...)
 *   orderId    - order id created on the server (order_xxxx)
 *   amount     - amount in paise
 *   currency   - defaults to INR
 *   name       - business name shown on the payment page
 *   description- optional description
 *   prefill    - optional { name, email, contact }
 *   themeColor - optional hex color
 */
export const openRazorpayCheckout = async (options) => {
  const {
    key,
    orderId,
    amount,
    currency = 'INR',
    name = 'Hawk Aerosystem',
    description = '',
    prefill = {},
    themeColor = '#4F46E5',
  } = options;

  if (!key || !orderId || !amount) {
    throw new Error('Invalid payment request. Please try again.');
  }

  if (Platform.OS === 'web') {
    await loadWebCheckoutScript();
    return new Promise((resolve, reject) => {
      const checkout = new window.Razorpay({
        key,
        amount,
        currency,
        name,
        description,
        order_id: orderId,
        prefill,
        theme: { color: themeColor },
        modal: {
          ondismiss: () => reject(new Error('PAYMENT_CANCELLED')),
        },
        handler: (response) => resolve(response),
      });
      checkout.on('payment.failed', (resp) => {
        reject(
          new Error(
            resp?.error?.description ||
              'The payment failed. No amount has been deducted, please try again.',
          ),
        );
      });
      checkout.open();
    });
  }

  if (!NativeRazorpay) {
    throw new Error('Online payments are not supported on this platform.');
  }

  try {
    // react-native-razorpay resolves with the same payload shape as web.
    const data = await NativeRazorpay.open({
      key,
      amount,
      currency,
      name,
      description,
      order_id: orderId,
      theme: { color: themeColor },
      ...(prefill && Object.keys(prefill).length ? { prefill } : {}),
    });
    return data;
  } catch (error) {
    // The native SDK rejects with an object like { code, description } when
    // the user dismisses the sheet or the payment fails.
    const message =
      error?.description ||
      error?.message ||
      'PAYMENT_FAILED';
    throw new Error(message);
  }
};
