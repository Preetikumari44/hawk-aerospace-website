// Web stub for react-native-razorpay. The real native SDK cannot run in a
// browser — web payments use Razorpay checkout.js instead
// (see src/utils/razorpayCheckout.js).
const RazorpayCheckout = {
  open() {
    return Promise.reject(
      new Error('Use the Razorpay web checkout (checkout.js) on this platform.')
    );
  },
  onExternalWalletSelection() {},
};

export default RazorpayCheckout;
