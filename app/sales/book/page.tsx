'use client';

// On-behalf booking wizard — Super App sales ServiceBooking flow parity:
// customer context → service/location/schedule → estimate → aggregator
// checks → create with customerUid → confirm + pay (cash/gateway).

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { aggregatorApi } from '@/lib/booking/role-apis';
import { customerApi, mapsApi, paymentApi } from '@/lib/booking/api-client';
import { openRazorpayCheckout } from '@/lib/booking/razorpay-checkout';
import { haversineKm, isCountryWideService, MAX_SERVICE_DISTANCE_KM } from '@/lib/booking/geo';
import { useNotice } from '@/components/sales/SalesProviders';
import Button from '@/components/sales/ui/Button';
import Panel from '@/components/sales/ui/Panel';
import {
  buildOnBehalfPayload,
  estimateOnBehalf,
  formatINR,
  SALES_SERVICES,
  type OnBehalfDraft,
} from '@/lib/sales/booking';

const inputCls = 'h-10 w-full rounded-sm border bg-card px-3 text-body text-ink outline-none';
const SLOTS = ['morning', 'afternoon', 'evening'] as const;

function Wizard({ customerUid, customerName, servicePreset }: { customerUid: string; customerName: string; servicePreset?: string }) {
  const router = useRouter();
  const notify = useNotice();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<OnBehalfDraft>(() => {
    const valid = SALES_SERVICES.some((s) => s.key === servicePreset);
    const svc = (valid ? servicePreset : 'spraying') as OnBehalfDraft['service'];
    const subs = SALES_SERVICES.find((s) => s.key === svc)?.subs ?? ['Precision Spraying'];
    return {
      service: svc,
      subService: subs[0],
      areaValue: 1,
      areaUnit: 'acre',
      crop: '',
      date: '',
      slot: 'morning',
      location: '',
      coordinates: null,
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pincode: '',
      instructions: '',
    };
  });
  const [suggestions, setSuggestions] = useState<{ label: string; latitude: number | null; longitude: number | null }[]>([]);
  const [radiusMsg, setRadiusMsg] = useState<string | null>(null);
  const [radiusOk, setRadiusOk] = useState(true);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [checks, setChecks] = useState<{ weather?: unknown; restriction?: unknown } | null>(null);
  const [checking, setChecking] = useState(false);
  const [created, setCreated] = useState<{ id: string; bookingNumber: string } | null>(null);
  const [method, setMethod] = useState<'cash' | 'gateway'>('cash');
  const [coupon, setCoupon] = useState('');
  const [paying, setPaying] = useState(false);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => undefined,
      { timeout: 8000 },
    );
  }, []);

  const service = SALES_SERVICES.find((s) => s.key === draft.service) ?? SALES_SERVICES[0];
  const today = new Date().toISOString().slice(0, 10);

  async function searchLocation(q: string) {
    setDraft((d) => ({ ...d, location: q, coordinates: null }));
    setRadiusMsg(null);
    setRadiusOk(true);
    if (q.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const res = q.trim().length >= 2 ? await mapsApi.autocomplete(q.trim(), gps ? { latitude: gps.lat, longitude: gps.lng, radiusKm: 100 } : {}) : [];
      setSuggestions(res.slice(0, 4));
    } catch {
      setSuggestions([]);
    }
  }

  function pickSuggestion(s: { label: string; latitude: number | null; longitude: number | null }) {
    const coords = s.latitude != null && s.longitude != null ? { lat: s.latitude, lng: s.longitude } : null;
    if (!isCountryWideService(draft.service) && coords && gps) {
      const km = haversineKm(coords, gps);
      if (km != null && km > MAX_SERVICE_DISTANCE_KM) {
        setDraft((d) => ({ ...d, location: s.label, coordinates: null }));
        setRadiusMsg(`~${Math.round(km)}km away — only within ${MAX_SERVICE_DISTANCE_KM}km of you. Pick a closer site.`);
        setRadiusOk(false);
        setSuggestions([]);
        return;
      }
      setRadiusMsg(km != null ? `Within service area (~${Math.round(km)}km).` : null);
    } else if (isCountryWideService(draft.service) && coords) {
      setRadiusMsg('Available anywhere in your country — verified at checks.');
    }
    setRadiusOk(true);
    setDraft((d) => ({ ...d, location: s.label, coordinates: coords ?? d.coordinates }));
    setSuggestions([]);
  }

  const stepValid = useMemo(() => {
    if (step === 0) return draft.subService !== '' && draft.areaValue > 0 && draft.date !== '';
    if (step === 1) return draft.location.trim() !== '' && draft.coordinates !== null && radiusOk;
    return true;
  }, [step, draft, radiusOk]);

  async function runEstimate() {
    const total = await estimateOnBehalf(draft);
    setEstimate(total);
    if (total == null) notify({ title: 'Estimate unavailable', message: 'Continuing without an estimate.' });
    setStep(2);
  }

  async function runChecks() {
    if (!draft.coordinates) return;
    setChecking(true);
    try {
      const [weather, restriction] = await Promise.all([
        aggregatorApi.checkWeather({ latitude: draft.coordinates.lat, longitude: draft.coordinates.lng, targetDate: draft.date }).catch(() => null),
        aggregatorApi.checkRestrictions({ latitude: draft.coordinates.lat, longitude: draft.coordinates.lng, serviceType: draft.service }).catch(() => null),
      ]);
      setChecks({ weather, restriction });
      setStep(3);
    } finally {
      setChecking(false);
    }
  }

  async function create() {
    try {
      const res = (await aggregatorApi.createBooking(buildOnBehalfPayload(draft, customerUid))) as Record<string, unknown>;
      const booking = (res.booking ?? res) as Record<string, unknown>;
      const id = String(booking.bookingNumber ?? booking.id ?? '');
      if (!id) throw new Error('Booking creation returned no id.');
      setCreated({ id, bookingNumber: id });
      setStep(4);
    } catch (err) {
      notify({ title: 'Create failed', message: err instanceof Error ? err.message : 'Could not create booking.' });
    }
  }

  async function pay() {
    if (!created) return;
    setPaying(true);
    try {
      const couponCode = coupon.trim().toUpperCase() || undefined;
      if (method === 'cash') {
        await customerApi.completePayment(created.id, { method: 'cash', ...(couponCode ? { couponCode } : {}) });
        notify({ title: 'Cash booking confirmed', message: `Booking ${created.id} will be paid on site.` });
        router.push('/sales/bookings');
        return;
      }
      const order = await paymentApi.createRazorpayOrder({ bookingId: created.id, ...(couponCode ? { couponCode } : {}) });
      const keyId = order.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
      if (!keyId) throw new Error('Razorpay key is not configured.');
      const result = await openRazorpayCheckout({ keyId, orderId: order.orderId, amount: order.amount });
      await customerApi.completePayment(created.id, {
        method: 'gateway',
        ...(couponCode ? { couponCode } : {}),
        payment: {
          razorpayOrderId: result.razorpay_order_id,
          razorpayPaymentId: result.razorpay_payment_id,
          razorpaySignature: result.razorpay_signature,
        },
      });
      notify({ title: 'Payment completed', message: `Booking ${created.id} is paid.` });
      router.push('/sales/bookings');
    } catch (err) {
      notify({ title: 'Payment failed', message: err instanceof Error ? err.message : 'Please try again.' });
    } finally {
      setPaying(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-h1 font-bold text-ink">Book on Behalf</h1>
        <span className="text-small text-ink-muted">Step {Math.min(step + 1, 5)} of 5</span>
      </div>

      <Panel title={`Customer: ${customerName}`}>
        <p className="text-small text-ink-muted">Booking will be attributed to this customer (customerUid).</p>
        <Link href="/sales/dashboard" className="text-small font-bold text-primary hover:underline">Change customer</Link>
      </Panel>

      {step === 0 ? (
        <Panel title="1 · Service & Schedule">
          <div className="flex flex-wrap gap-2">
            {SALES_SERVICES.map((s) => (
              <Button key={s.key} variant={draft.service === s.key ? 'primary' : 'outline'} onClick={() => setDraft((d) => ({ ...d, service: s.key, subService: s.subs[0] }))}>
                {s.label}
              </Button>
            ))}
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <select value={draft.subService} onChange={(e) => setDraft((d) => ({ ...d, subService: e.target.value }))} className={inputCls}>
              {service.subs.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input value={draft.areaValue} onChange={(e) => setDraft((d) => ({ ...d, areaValue: Number(e.target.value) || 0 }))} placeholder="Area" type="number" min={1} className={inputCls} />
              <select value={draft.areaUnit} onChange={(e) => setDraft((d) => ({ ...d, areaUnit: e.target.value }))} className={inputCls}>
                <option value="acre">acre</option>
                <option value="hectare">hectare</option>
                <option value="sq_m">sq_m</option>
              </select>
            </div>
            <input value={draft.crop} onChange={(e) => setDraft((d) => ({ ...d, crop: e.target.value }))} placeholder="Crop / infra (optional)" className={inputCls} />
            <input value={draft.date} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} type="date" min={today} className={inputCls} />
          </div>
          <div className="mt-2 flex gap-2">
            {SLOTS.map((s) => (
              <Button key={s} variant={draft.slot === s ? 'primary' : 'outline'} onClick={() => setDraft((d) => ({ ...d, slot: s }))}>
                {s}
              </Button>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <Button disabled={!stepValid} onClick={() => void runEstimate()}>Continue →</Button>
          </div>
        </Panel>
      ) : null}

      {step === 1 ? (
        <Panel title="2 · Location">
          <input value={draft.location} onChange={(e) => void searchLocation(e.target.value)} placeholder="Village / site…" className={inputCls} />
          {suggestions.length > 0 ? (
            <ul className="mt-1 overflow-hidden rounded-sm border bg-card">
              {suggestions.map((s, i) => (
                <li key={i}>
                  <button type="button" onClick={() => pickSuggestion(s)} className="block w-full px-3 py-2 text-left text-body text-ink hover:bg-primary-light">
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {radiusMsg ? <p className={`mt-1 text-small ${radiusOk ? 'text-ink-muted' : 'font-semibold text-danger'}`}>{radiusMsg}</p> : null}
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <input value={draft.addressLine1} onChange={(e) => setDraft((d) => ({ ...d, addressLine1: e.target.value }))} placeholder="Address line 1" className={inputCls} />
            <input value={draft.addressLine2} onChange={(e) => setDraft((d) => ({ ...d, addressLine2: e.target.value }))} placeholder="Address line 2" className={inputCls} />
            <input value={draft.city} onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))} placeholder="City" className={inputCls} />
            <input value={draft.state} onChange={(e) => setDraft((d) => ({ ...d, state: e.target.value }))} placeholder="State" className={inputCls} />
            <input value={draft.pincode} onChange={(e) => setDraft((d) => ({ ...d, pincode: e.target.value }))} placeholder="Pincode" className={inputCls} />
            <input value={draft.instructions} onChange={(e) => setDraft((d) => ({ ...d, instructions: e.target.value }))} placeholder="Instructions (optional)" className={inputCls} />
          </div>
          <div className="mt-3 flex justify-between">
            <Button variant="outline" onClick={() => setStep(0)}>← Back</Button>
            <Button disabled={!stepValid} onClick={() => void runEstimate()}>Estimate →</Button>
          </div>
        </Panel>
      ) : null}

      {step === 2 ? (
        <Panel title="3 · Estimate & Checks">
          <p className="text-h2 font-bold text-ink">{estimate != null ? formatINR(estimate) : 'Estimate unavailable'}</p>
          <div className="mt-3 flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
            <Button disabled={checking} onClick={() => void runChecks()}>{checking ? 'Checking…' : 'Run Checks →'}</Button>
          </div>
        </Panel>
      ) : null}

      {step === 3 ? (
        <Panel title="4 · Flight Checks">
          <p className="text-small text-ink-muted">Weather: {checks?.weather ? JSON.stringify(checks.weather).slice(0, 160) : '—'}</p>
          <p className="mt-1 text-small text-ink-muted">Airspace: {checks?.restriction ? JSON.stringify(checks.restriction).slice(0, 160) : '—'}</p>
          <div className="mt-3 flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>← Back</Button>
            <Button onClick={() => void create()}>Create Booking →</Button>
          </div>
        </Panel>
      ) : null}

      {step === 4 && created ? (
        <Panel title="5 · Payment">
          <p className="text-h3 font-semibold text-ink">Booking {created.bookingNumber} created for {customerName}.</p>
          <div className="mt-2 flex gap-2">
            <Button variant={method === 'cash' ? 'primary' : 'outline'} onClick={() => setMethod('cash')}>Cash</Button>
            <Button variant={method === 'gateway' ? 'primary' : 'outline'} onClick={() => setMethod('gateway')}>Online</Button>
          </div>
          <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase().replace(/\s/g, ''))} placeholder="Coupon (optional)" className={`${inputCls} mt-2`} />
          <div className="mt-3 flex justify-end">
            <Button disabled={paying} onClick={() => void pay()}>{paying ? 'Processing…' : method === 'cash' ? 'Confirm Cash Booking' : 'Pay & Finish'}</Button>
          </div>
        </Panel>
      ) : null}
    </>
  );
}

function BookPage() {
  return <BookInner />;
}

function BookInner() {
  const search = useSearchParams();
  const customerUid = search.get('customerUid') ?? '';
  const customerName = search.get('name') ?? 'Customer';
  const servicePreset = search.get('service') ?? undefined;
  if (!customerUid) {
    return (
      <>
        <h1 className="text-h1 font-bold text-ink">Book on Behalf</h1>
        <Panel title="No customer selected">
          <p className="text-small text-ink-muted">Pick a customer first — the booking is attributed to them.</p>
          <Link href="/sales/dashboard" className="text-small font-bold text-primary hover:underline">Go to Customers →</Link>
        </Panel>
      </>
    );
  }
  return <Wizard customerUid={customerUid} customerName={customerName} servicePreset={servicePreset} />;
}

export default function SalesBookPage() {
  return (
    <Suspense fallback={<p className="text-small text-ink-muted">Loading…</p>}>
      <BookPage />
    </Suspense>
  );
}
