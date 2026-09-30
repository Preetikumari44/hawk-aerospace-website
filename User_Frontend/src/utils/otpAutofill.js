import { Platform } from 'react-native';

/**
 * Extract a 6-digit one-time-code from an SMS message body.
 * Prefers a standalone 6-digit group, falls back to the first 4-8 digit run.
 */
export const extractOtp = (message) => {
  if (!message || typeof message !== 'string') return null;

  const standalone = message.match(/(?:^|\D)(\d{6})(?:\D|$)/);
  if (standalone) return standalone[1];

  const fallback = message.match(/\d{4,8}/);
  return fallback ? fallback[0] : null;
};

const noopWatcher = { supported: false, stop: () => {} };

/**
 * Cross-platform OTP auto-read.
 *
 * - Android/iOS: the app does NOT read the SMS itself. On Android, Google's
 *   Play Protect revokes SMS permissions for side-loaded apps and the SMS
 *   broker APIs (Retriever/User Consent) crash while Firebase's own SMS session
 *   is active. Instead the OTP input carries `autoComplete="sms-otp"`, so the
 *   SYSTEM keyboard shows a "Use OTP 123456" suggestion above the keyboard when
 *   the SMS arrives - tap it and the code fills (then auto-submits). iOS does
 *   the same via `textContentType="oneTimeCode"`. Zero permission, zero crash.
 * - Web: the WebOTP API (`navigator.credentials.get({ otp })`). The browser
 *   asks for permission and resolves as soon as the SMS is received.
 *
 * Returns `{ stop, supported }`. `stop()` tears the watcher down and
 * `supported` tells the caller whether auto-read is actually active so it can
 * show (or hide) the "detecting OTP" hint. This function never throws.
 */
export const startOtpWatcher = ({ onOtp, onError, timeoutMs = 90000 } = {}) => {
  try {
    if (Platform.OS === 'web') {
      // WebOTP is only exposed by Chromium browsers and only inside a secure
      // context (HTTPS). On insecure origins browsers do not expose the
      // Credential Management API at all, so the watcher no-ops and the user
      // types the code manually. We still attempt it whenever the API exists
      // (best-effort on HTTP/webview environments that happen to expose it).
      const hasCredentials =
        typeof window !== 'undefined' && Boolean(window?.navigator?.credentials);
      if (!hasCredentials) return noopWatcher;

      let cancelled = false;
      let controller = null;
      if (typeof AbortController !== 'undefined') controller = new AbortController();

      const timer = setTimeout(() => {
        cancelled = true;
        controller && controller.abort();
      }, timeoutMs);

      (async () => {
        try {
          const content = await window.navigator.credentials.get({
            otp: { transport: ['sms'] },
            signal: controller && controller.signal,
          });
          if (!cancelled && content && content.code) {
            onOtp && onOtp(content.code);
          }
        } catch (error) {
          const name = error && error.name;
          // Abort (timeout) and user dismissing the prompt are not failures.
          if (!cancelled && name !== 'AbortError' && name !== 'NotAllowedError') {
            onError && onError('WEBOTP_ERROR', String((error && error.message) || error));
          }
        } finally {
          clearTimeout(timer);
        }
      })();

      return {
        supported: true,
        stop: () => {
          cancelled = true;
          clearTimeout(timer);
          controller && controller.abort();
        },
      };
    }

    // Android/iOS: the OS one-time-code keyboard autofill handles everything.
    return noopWatcher;
  } catch (error) {
    // Never let an autofill helper crash the app.
    return noopWatcher;
  }
};