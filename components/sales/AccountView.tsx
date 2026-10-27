'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useBookingAuth } from '@/lib/booking/auth-context';
import { aggregatorApi } from '@/lib/booking/role-apis';
import { useSessionIdentity } from '@/lib/booking/session-identity';
import { useProfile, useNotice } from '@/components/sales/SalesProviders';
import AsyncView from '@/components/sales/ui/AsyncView';
import Button from '@/components/sales/ui/Button';

const inputCls = 'h-10 w-full rounded-xl border bg-card px-3 text-sm text-foreground outline-none';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-3 border-t py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-sm text-foreground">{value}</span>
    </div>
  );
}

const PREF_KEYS = [
  'pushNotifications',
  'smsNotifications',
  'emailNotifications',
  'bookingUpdates',
  'commissionUpdates',
  'customerUpdates',
  'settlementAlerts',
  'marketingPromotions',
] as const;

const PREF_LABELS: Record<string, string> = {
  pushNotifications: 'Push notifications',
  smsNotifications: 'SMS notifications',
  emailNotifications: 'Email notifications',
  bookingUpdates: 'Booking updates',
  commissionUpdates: 'Commission updates',
  customerUpdates: 'Customer updates',
  settlementAlerts: 'Settlement alerts',
  marketingPromotions: 'Marketing promotions',
};

// Reached only via the header's profile menu; intentionally not in the sidebar.
export default function AccountView({ section }: { section: string }) {
  const profile = useProfile();
  const notify = useNotice();
  const router = useRouter();
  const { logout } = useBookingAuth();
  const session = useSessionIdentity();
  const [editing, setEditing] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [state, setState] = useState('');
  const [regions, setRegions] = useState('');
  const [savingBiz, setSavingBiz] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, boolean> | null>(null);
  const [prefsSaving, setPrefsSaving] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [delReason, setDelReason] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    aggregatorApi
      .getNotificationSettings()
      .then((v) => setPrefs((v ?? {}) as Record<string, boolean>))
      .catch(() => setPrefs({}));
  }, []);

  async function saveBusiness() {
    setSavingBiz(true);
    try {
      await aggregatorApi.updateProfile({
        ...(businessName.trim() ? { businessName: businessName.trim() } : {}),
        ...(state.trim() ? { state: state.trim() } : {}),
        ...(regions.trim()
          ? { regions: regions.split(',').map((r) => r.trim()).filter(Boolean) }
          : {}),
      });
      notify({ title: 'Profile updated', message: 'Your business profile was saved.' });
      setEditing(false);
      profile.reload();
    } catch (err) {
      notify({ title: 'Save failed', message: err instanceof Error ? err.message : 'Could not save.' });
    } finally {
      setSavingBiz(false);
    }
  }

  async function togglePref(key: string, value: boolean) {
    setPrefsSaving(key);
    const prev = prefs;
    setPrefs((p) => ({ ...(p ?? {}), [key]: value }));
    try {
      await aggregatorApi.updateNotificationSettings({ [key]: value });
    } catch (err) {
      setPrefs(prev);
      notify({ title: 'Preference failed', message: err instanceof Error ? err.message : 'Could not save.' });
    } finally {
      setPrefsSaving(null);
    }
  }

  async function deleteAccount() {
    if (delReason.trim().length < 10) {
      notify({ title: 'Reason required', message: 'Tell us why (min 10 characters).' });
      return;
    }
    setDeleting(true);
    try {
      await aggregatorApi.deleteAccount(delReason.trim());
      logout();
      router.replace('/');
    } catch (err) {
      notify({ title: 'Delete failed', message: err instanceof Error ? err.message : 'Could not delete.' });
      setDeleting(false);
    }
  }

  return (
    <div className="w-full max-w-[480px]">
      <h1 className="mb-3 text-xl font-bold text-foreground">Account</h1>
      <AsyncView query={profile} loadingLines={5} errorTitle="Couldn't load your profile.">
        {(p) => (
          <>
            <div className="mb-4 flex items-center gap-2 rounded-3xl border bg-card p-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-base font-bold text-brand">
                {p.fullName.charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-foreground">{p.fullName}</p>
                <p className="text-xs text-muted-foreground">{p.role}</p>
              </div>
            </div>

            <section className="mb-3 rounded-3xl border bg-card p-3">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Profile</h2>
                <Button variant="outline" onClick={() => setEditing((e) => !e)}>
                  {editing ? 'Close' : 'Edit'}
                </Button>
              </div>
              <Row label="Full Name" value={p.fullName} />
              <Row label="Phone" value={p.phone} />
              <Row label="Email" value={p.email} />
              <Row label="User ID" value={session?.uid || '—'} />
              <Row label="Detailed Address" value={session?.address || '—'} />
              {editing ? (
                <div className="mt-2 flex flex-col gap-2 border-t pt-2">
                  <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Business / firm name" className={inputCls} />
                  <input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" className={inputCls} />
                  <input value={regions} onChange={(e) => setRegions(e.target.value)} placeholder="Regions (comma separated)" className={inputCls} />
                  <Button disabled={savingBiz} onClick={() => void saveBusiness()}>
                    {savingBiz ? 'Saving…' : 'Save Business Profile'}
                  </Button>
                </div>
              ) : null}
            </section>

            <section className="mb-3 rounded-3xl border bg-card p-3">
              <h2 className="mb-1 text-sm font-semibold text-foreground">Account Settings</h2>
              <Row label="Notifications" value={p.notifications} />
              <Row label="Payout Method" value={p.payoutMethod} />
            </section>

            <section className="mb-3 rounded-3xl border bg-card p-3">
              <h2 className="mb-1 text-sm font-semibold text-foreground">Notification Preferences</h2>
              {prefs === null ? (
                <p className="text-xs text-muted-foreground">Loading…</p>
              ) : (
                PREF_KEYS.map((k) => (
                  <label key={k} className="flex cursor-pointer items-center justify-between gap-2 border-t py-2">
                    <span className="text-xs text-muted-foreground">{PREF_LABELS[k]}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(prefs[k])}
                      disabled={prefsSaving === k}
                      onChange={(e) => void togglePref(k, e.target.checked)}
                      className="size-4"
                    />
                  </label>
                ))
              )}
            </section>

            <section className="mb-3 rounded-3xl border bg-card p-3">
              <h2 className="mb-1 text-sm font-semibold text-foreground">Roles</h2>
              <p className="text-xs text-muted-foreground">Signed in as Sales Aggregator.</p>
              <Link href="/account" className="text-xs font-bold text-brand hover:underline">
                My Roles · switch or apply →
              </Link>
            </section>

            <section className="mb-3 rounded-3xl border border-destructive bg-card p-3">
              <h2 className="mb-1 text-sm font-semibold text-destructive">Danger Zone</h2>
              {!showDelete ? (
                <Button variant="outline" onClick={() => setShowDelete(true)}>
                  Delete Account
                </Button>
              ) : (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={delReason}
                    onChange={(e) => setDelReason(e.target.value)}
                    placeholder="Why are you leaving? (min 10 characters)"
                    rows={3}
                    className="w-full rounded-xl border bg-card p-2 text-sm text-foreground outline-none"
                  />
                  <div className="flex gap-2">
                    <Button variant="danger" block disabled={deleting} onClick={() => void deleteAccount()}>
                      {deleting ? 'Deleting…' : 'Yes, delete my account'}
                    </Button>
                    <Button variant="outline" onClick={() => setShowDelete(false)}>
                      Keep
                    </Button>
                  </div>
                </div>
              )}
            </section>

            <Button
              variant="danger"
              block
              onClick={() => {
                logout();
                router.replace('/');
              }}
            >
              Logout
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">Opened section: {section}</p>
          </>
        )}
      </AsyncView>
    </div>
  );
}
