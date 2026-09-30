import { updateStoredUser, normalizeFrontendRole } from './api';

/**
 * Completes a phone-number login after the user's identity has been verified:
 * stores the authenticated user, performs the frontend role switch if needed and
 * navigates to the correct screen. Mirrors the OTP screen's success path so the
 * same logic is shared by the manual OTP flow and the Firebase auto-verification
 * flow.
 */
export const completePhoneLogin = async ({
  user,
  onNavigate,
  onSwitchRole,
  phoneNumber,
}) => {
  await updateStoredUser(user || null);

  const primaryRole = normalizeFrontendRole(user?.primaryRole || user?.role);

  if (primaryRole && primaryRole !== 'customer') {
    if (onSwitchRole) {
      await onSwitchRole(primaryRole);
    }
    return;
  }

  const hasRealName =
    user?.name && !/^\+?\d+$/.test(user.name) && user.name !== 'New User';

  if (hasRealName) {
    onNavigate('Home', { user });
    return;
  }

  onNavigate('OtpVerifiedScreen', {
    user,
    phoneNumber,
  });
};