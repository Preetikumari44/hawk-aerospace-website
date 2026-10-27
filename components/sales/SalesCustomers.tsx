'use client';

// Customer onboarding — Super App AddCustomerScreen +
// CustomerOtpVerificationScreen parity: choose existing (search + select for
// booking) / new (full form + T&C) + 6-box OTP with customerUid capture and
// continue-to-booking. NOTE: verify API takes {phone, otp} (VerifyCustomerOtpDto).

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import * as React from 'react';
import { useAsync } from '@/components/sales/useAsync';
import { aggregatorApi } from '@/lib/booking/role-apis';
import { useNotice } from '@/components/sales/SalesProviders';
import AsyncView from '@/components/sales/ui/AsyncView';
import Button from '@/components/sales/ui/Button';
import Panel from '@/components/sales/ui/Panel';

export interface SalesCustomer {
  id: string;
  uid: string;
  name: string;
  phone: string;
  email: string;
  address: string;
}

function toList(v: unknown): Record<string, unknown>[] {
  if (Array.isArray(v)) return v as Record<string, unknown>[];
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    for (const k of ['data', 'customers', 'items', 'results']) {
      if (Array.isArray(o[k])) return o[k] as Record<string, unknown>[];
    }
  }
  return [];
}

function mapCustomer(c: Record<string, unknown>, i: number): SalesCustomer {
  return {
    id: String(c.id ?? c._id ?? c.uid ?? i),
    uid: String(c.uid ?? c.id ?? c._id ?? i),
    name: String(c.name ?? 'Customer'),
    phone: String(c.phone ?? c.phoneNumber ?? ''),
    email: String(c.email ?? ''),
    address: String(c.address ?? ''),
  };
}

async function getCustomers(): Promise<SalesCustomer[]> {
  const raw = await aggregatorApi.getCustomers({ limit: 100 });
  return toList(raw).map(mapCustomer);
}

export default function SalesCustomers() {
  const router = useRouter();
  const notify = useNotice();
  const customers = useAsync(getCustomers);
  const [mode, setMode] = useState<'choose' | 'existing' | 'new'>('choose');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [terms, setTerms] = useState(false);
  const [otpPhone, setOtpPhone] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [verifiedUid, setVerifiedUid] = useState<string | null>(null);
  const [busy, setBusy] = useState<'add' | 'otp' | 'verify' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editEmail, setEditEmail] = React.useState('');
  const [editAddress, setEditAddress] = React.useState('');
  const [editSaving, setEditSaving] = React.useState(false);

  const list = customers.status === 'success' ? customers.data : [];
  const q = search.trim().toLowerCase();
  const filtered = q
    ? list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
          c.email.toLowerCase().includes(q),
      )
    : list;
  const selected = list.find((c) => c.id === selectedId) ?? null;

  async function addCustomer() {
    const digits = phone.replace(/\D/g, '').slice(-10);
    if (!name.trim()) {
      notify({ title: 'Name required', message: 'Enter the customer name.' });
      return;
    }
    if (digits.length !== 10) {
      notify({ title: 'Invalid mobile', message: 'Enter a valid 10-digit mobile number.' });
      return;
    }
    if (!terms) {
      notify({ title: 'Terms required', message: 'Confirm the customer agreed to the terms.' });
      return;
    }
    setBusy('add');
    try {
      await aggregatorApi.addCustomer({
        name: name.trim(),
        phone: `+91${digits}`,
        ...(address.trim() ? { address: address.trim() } : {}),
        ...(email.trim() ? { email: email.trim() } : {}),
      });
      try {
        await aggregatorApi.sendCustomerOtp({ name: name.trim(), phone: `+91${digits}` });
      } catch {
        /* verify step can resend */
      }
      setOtpPhone(`+91${digits}`);
      setOtp(['', '', '', '', '', '']);
      setVerifiedUid(null);
      notify({ title: 'Customer added', message: `OTP sent to +91${digits}. Enter it below to verify.` });
      customers.reload();
    } catch (err) {
      notify({ title: 'Add failed', message: err instanceof Error ? err.message : 'Could not add customer.' });
    } finally {
      setBusy(null);
    }
  }

  async function sendOtp() {
    if (!otpPhone.trim()) return;
    setBusy('otp');
    try {
      await aggregatorApi.sendCustomerOtp({ name: name.trim() || 'Customer', phone: otpPhone.trim() });
      notify({ title: 'OTP sent', message: `OTP sent to ${otpPhone.trim()}.` });
    } catch (err) {
      notify({ title: 'OTP failed', message: err instanceof Error ? err.message : 'Could not send OTP.' });
    } finally {
      setBusy(null);
    }
  }

  async function verifyOtp() {
    const code = otp.join('');
    if (!otpPhone.trim() || code.length !== 6) return;
    setBusy('verify');
    try {
      const res = (await aggregatorApi.verifyCustomerOtp({ phone: otpPhone.trim(), otp: code })) as Record<
        string,
        unknown
      >;
      const uid = String(res.customerUid ?? (res.customer as Record<string, unknown> | undefined)?.uid ?? '');
      if (!uid) throw new Error('Verification succeeded but returned no customer id.');
      setVerifiedUid(uid);
      notify({ title: 'Customer verified', message: `${otpPhone.trim()} is verified. Continue to booking.` });
      customers.reload();
    } catch (err) {
      notify({ title: 'Verify failed', message: err instanceof Error ? err.message : 'Incorrect code.' });
    } finally {
      setBusy(null);
    }
  }

  function setDigit(i: number, v: string) {
    const d = v.replace(/\D/g, '').slice(-1);
    setOtp((prev) => {
      const next = [...prev];
      next[i] = d;
      return next;
    });
    if (d && i < 5) {
      document.getElementById(`sales-otp-${i + 1}`)?.focus();
    }
  }

  function continueBooking(customerUid: string, label: string) {
    router.push(`/sales/book?customerUid=${encodeURIComponent(customerUid)}&name=${encodeURIComponent(label)}`);
  }

  function startEdit(c: SalesCustomer) {
    setEditingId(c.id);
    setEditName(c.name);
    setEditEmail(c.email);
    setEditAddress(c.address);
  }

  async function saveEdit(c: SalesCustomer) {
    if (!editName.trim()) {
      notify({ title: 'Name required', message: 'Customer name cannot be empty.' });
      return;
    }
    setEditSaving(true);
    try {
      await aggregatorApi.updateCustomer(c.uid, {
        name: editName.trim(),
        ...(editEmail.trim() ? { email: editEmail.trim() } : {}),
        ...(editAddress.trim() ? { address: editAddress.trim() } : {}),
      });
      notify({ title: 'Customer updated', message: `${editName.trim()} was saved.` });
      setEditingId(null);
      customers.reload();
    } catch (err) {
      notify({ title: 'Update failed', message: err instanceof Error ? err.message : 'Could not save.' });
    } finally {
      setEditSaving(false);
    }
  }

  const inputCls = 'h-10 w-full rounded-xl border bg-card px-3 text-sm text-foreground outline-none';

  return (
    <Panel title="Customers" action={<Link href="/sales/book" className="text-xs font-bold text-brand hover:underline">Book on behalf →</Link>}>
      <div className="flex gap-2">
        {(['choose', 'existing', 'new'] as const).map((m) => (
          <Button key={m} variant={mode === m ? 'primary' : 'outline'} onClick={() => setMode(m)}>
            {m === 'choose' ? 'Choose' : m === 'existing' ? 'Existing' : 'New'}
          </Button>
        ))}
      </div>

      {mode === 'choose' ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Pick an existing customer or add a new one — then continue straight into an on-behalf booking.
        </p>
      ) : null}

      {mode === 'existing' ? (
        <div className="mt-2 flex flex-col gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name / mobile / email" className={inputCls} />
          <AsyncView query={customers} isEmpty={(c) => c.length === 0} emptyTitle="No customers yet." emptyHint="Add a new customer first." loadingLines={2} errorTitle="Couldn't load customers.">
            {(rows) => (
              <ul className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
                {filtered.map((c) => (
                  <li key={c.id}>
                    <label className={`flex cursor-pointer items-start gap-2 rounded-xl border p-2 ${selectedId === c.id ? 'border-primary bg-muted' : 'bg-card'}`}>
                      <input
                        type="radio"
                        name="sales-customer"
                        checked={selectedId === c.id}
                        onChange={() => setSelectedId(c.id)}
                        className="mt-1"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-foreground">{c.name}</span>
                        <span className="block text-xs text-muted-foreground">{c.phone}{c.email ? ` · ${c.email}` : ''}</span>
                        {editingId === c.id ? (
                          <span className="mt-1 block" onClick={(e) => e.stopPropagation()}>
                            <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" className="mb-1 h-9 w-full rounded-xl border bg-card px-2 text-xs text-foreground outline-none" />
                            <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" className="mb-1 h-9 w-full rounded-xl border bg-card px-2 text-xs text-foreground outline-none" />
                            <input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} placeholder="Address" className="mb-1 h-9 w-full rounded-xl border bg-card px-2 text-xs text-foreground outline-none" />
                            <span className="flex gap-2">
                              <Button variant="outline" onClick={() => void saveEdit(c)} disabled={editSaving}>
                                {editSaving ? 'Saving…' : 'Save'}
                              </Button>
                              <Button variant="outline" onClick={() => setEditingId(null)}>
                                Cancel
                              </Button>
                            </span>
                          </span>
                        ) : (
                          <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); startEdit(c); }} className="mt-1 text-xs font-bold text-brand hover:underline">
                            Edit
                          </button>
                        )}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </AsyncView>
          <Button
            disabled={!selected}
            onClick={() => selected && continueBooking(selected.uid, selected.name)}
          >
            Continue with Selected
          </Button>
        </div>
      ) : null}

      {mode === 'new' ? (
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-foreground">New customer</p>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name *" className={inputCls} />
            <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="Mobile (10-digit) *" inputMode="numeric" className={inputCls} />
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" className={inputCls} />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" type="email" className={inputCls} />
            <label className="flex items-start gap-2 text-xs text-foreground">
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1" />
              Customer agreed to the terms *
            </label>
            <Button onClick={() => void addCustomer()} disabled={busy !== null}>
              {busy === 'add' ? 'Adding…' : 'Add + send OTP'}
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-foreground">Verify customer OTP</p>
            <input value={otpPhone} onChange={(e) => setOtpPhone(e.target.value)} placeholder="Customer phone (+91…)" className={inputCls} />
            <div className="flex justify-between gap-2">
              {otp.map((d, i) => (
                <input
                  key={i}
                  id={`sales-otp-${i}`}
                  value={d}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !otp[i] && i > 0) {
                      document.getElementById(`sales-otp-${i - 1}`)?.focus();
                    }
                  }}
                  inputMode="numeric"
                  maxLength={1}
                  aria-label={`OTP digit ${i + 1}`}
                  className="h-11 w-full rounded-xl border bg-card text-center text-base font-bold text-foreground outline-none"
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => void sendOtp()} disabled={busy !== null}>
                {busy === 'otp' ? 'Sending…' : 'Resend'}
              </Button>
              <Button variant="outline" onClick={() => void verifyOtp()} disabled={busy !== null || otp.join('').length !== 6}>
                {busy === 'verify' ? 'Verifying…' : 'Verify & Proceed'}
              </Button>
            </div>
            {verifiedUid ? (
              <Button onClick={() => continueBooking(verifiedUid, otpPhone)}>
                Continue to Booking →
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {mode === 'choose' ? (
        <div className="mt-3">
          <AsyncView query={customers} isEmpty={(c) => c.length === 0} emptyTitle="No customers yet." emptyHint="Added customers appear here." loadingLines={2} errorTitle="Couldn't load customers.">
            {(list) => (
              <ul className="grid gap-2 sm:grid-cols-2">
                {list.slice(0, 6).map((c) => (
                  <li key={c.id} className="rounded-xl border bg-card p-2">
                    <p className="text-sm font-semibold text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  </li>
                ))}
              </ul>
            )}
          </AsyncView>
        </div>
      ) : null}
    </Panel>
  );
}
