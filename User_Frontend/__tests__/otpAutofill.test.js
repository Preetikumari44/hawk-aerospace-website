import { extractOtp, startOtpWatcher } from '../src/utils/otpAutofill';

describe('extractOtp', () => {
  it('extracts a standalone 6-digit code from HAWK SMS', () => {
    expect(
      extractOtp('Your HAWK verification code is: 123456. Do not share this code.'),
    ).toBe('123456');
  });

  it('extracts a bare 6-digit code', () => {
    expect(extractOtp('123456')).toBe('123456');
  });

  it('extracts from a Firebase-style SMS with trailing hash', () => {
    expect(
      extractOtp('Your verification code is 654321. <#> AB12CD34ef56'),
    ).toBe('654321');
  });

  it('extracts from a Twilio/backend-style SMS', () => {
    expect(extractOtp('Code: 482913. HAWK OTP, valid for 5 minutes.')).toBe('482913');
  });

  it('extracts the code surrounded by words', () => {
    expect(extractOtp('Your OTP 987654 for Hawk Aerosystem')).toBe('987654');
  });

  it('prefers the first standalone 6-digit group', () => {
    expect(extractOtp('Use 111222 or 333444 to log in')).toBe('111222');
  });

  it('falls back to a 4-8 digit run when no standalone 6-digit exists', () => {
    expect(extractOtp('your code is 12345. enter it please')).toBe('12345');
  });

  it('returns null for empty/null/whitespace input', () => {
    expect(extractOtp('')).toBeNull();
    expect(extractOtp(null)).toBeNull();
    expect(extractOtp(undefined)).toBeNull();
    expect(extractOtp('   ')).toBeNull();
  });

  it('returns null for non-string input', () => {
    expect(extractOtp(123456)).toBeNull();
    expect(extractOtp({ body: '123456' })).toBeNull();
  });

  it('returns null when no digit group is present', () => {
    expect(extractOtp('no numbers here')).toBeNull();
  });

  it('returns null for a 3-digit group (not an OTP)', () => {
    expect(extractOtp('call 911 now')).toBeNull();
  });
});

describe('startOtpWatcher', () => {
  it('never throws and always returns a usable watcher (js-level crash safety)', () => {
    // On the default (non-android, non-web) test platform it must return a
    // harmless no-op watcher.
    let watcher;
    expect(() => {
      watcher = startOtpWatcher({ onOtp: jest.fn(), onError: jest.fn() });
    }).not.toThrow();

    expect(typeof watcher).toBe('object');
    expect(typeof watcher.stop).toBe('function');
    expect(() => watcher.stop()).not.toThrow();
  });

  it('returns a crash-safe no-op watcher when called with no handlers', () => {
    const watcher = startOtpWatcher();
    expect(() => watcher.stop()).not.toThrow();
  });
});