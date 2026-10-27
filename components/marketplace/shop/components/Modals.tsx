'use client';
import Link from 'next/link';
import { useState } from 'react';

import { contactDetails } from '@/lib/contact/details';

import { IS_DEMO,services } from '../services';
import type { Address } from '../types';
import { ErrorState, Icon, Modal, Skeleton, useAsync } from './ui';

export function LocationModal({ selected, onSelect, onClose }: { selected?: Address; onSelect: (a: Address) => void; onClose: () => void }) {
  const list = useAsync(() => services.location.saved(), []); const [adding, setAdding] = useState(false); const [label, setLabel] = useState('Home'); const [line, setLine] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const pick = (a: Address) => { services.location.select(a); onSelect(a); onClose(); };
  const current = () => {
    if (!navigator.geolocation) return setMsg('Location is not available on this device.'); setBusy(true); setMsg('');
    navigator.geolocation.getCurrentPosition(async (pos) => { try { pick(await services.location.resolveCurrent({ lat: pos.coords.latitude, lng: pos.coords.longitude })); } catch { setMsg('Unable to detect location.'); setBusy(false); } },
      () => { setMsg('Location permission denied. Choose a saved address instead.'); setBusy(false); });
  };
  const save = async () => { if (!line.trim()) return setMsg('Please enter the full address.'); try { pick(await services.location.add({ label, line: line.trim() })); } catch { setMsg('Unable to save address.'); } };
  return <Modal title="Select Delivery Location" onClose={onClose}>
    <button className="row-btn" onClick={current} disabled={busy}><Icon n="pin" /><span>{busy ? 'Detecting…' : 'Use Current Location'}</span></button>
    <h4>Saved Locations</h4>
    {list.loading ? <Skeleton h={56} /> : list.error ? <ErrorState text="Unable to load addresses." onRetry={list.retry} /> :
      list.data!.map((a) => <button key={a.id} className={'row-btn' + (selected?.id === a.id ? ' on' : '')} onClick={() => pick(a)}><Icon n={a.label === 'Work' ? 'shop' : 'home'} /><span><b>{a.label}</b><small>{a.line}</small></span>{selected?.id === a.id && <Icon n="check" />}</button>)}
    {adding ? <div className="form"><select value={label} onChange={(e) => setLabel(e.target.value)}><option>Home</option><option>Work</option><option>Farm</option><option>Other</option></select>
      <textarea placeholder="Full address with pincode" value={line} onChange={(e) => setLine(e.target.value)} rows={3} /><button className="btn primary" onClick={save}>Save & Deliver Here</button></div>
      : <button className="btn outline wide" onClick={() => setAdding(true)}>+ Add New Address</button>}
    {msg && <p className="note err">{msg}</p>}
  </Modal>;
}

export function SupportModal({ onClose }: { onClose: () => void }) {
  return IS_DEMO ? <SupportNotConnected onClose={onClose} /> : <SupportLive onClose={onClose} />;
}
// Marketplace support (phone line, tickets) has no backend yet: do not show placeholder numbers
// or pretend a request was sent. Point to the real Contact Us page instead.
function SupportNotConnected({ onClose }: { onClose: () => void }) {
  return <Modal title="Support" onClose={onClose}>
    <p className="note">Marketplace support is not connected yet, so messages cannot be sent from here. Please reach the Hawk Aerospace team through the Contact Us page.</p>
    <Link className="btn primary wide" href="/contact" onClick={onClose}>Open Contact Us</Link>
    <p className="note">{contactDetails.email}</p>
  </Modal>;
}
function SupportLive({ onClose }: { onClose: () => void }) {
  const c = useAsync(() => services.support.contact(), []); const [text, setText] = useState(''); const [ticket, setTicket] = useState(''); const [err, setErr] = useState('');
  const send = async () => { if (!text.trim()) return setErr('Please describe your issue.'); try { setTicket((await services.support.createTicket(text)).ticketId); } catch { setErr('Unable to send. Please try again.'); } };
  return <Modal title="24x7 Expert Support" onClose={onClose}>
    {c.loading ? <Skeleton h={70} /> : c.error ? <ErrorState text="Unable to load support details." onRetry={c.retry} /> : <>
      <a className="btn primary wide" href={`tel:${c.data!.phone.replace(/\s/g, '')}`}><Icon n="phone" s={18} /> Call {c.data!.phone}</a>
      <p className="note">{c.data!.email} · Available {c.data!.hours}</p>
      {ticket ? <p className="note ok">Request sent. Your reference is <b>{ticket}</b>. Our team will contact you shortly.</p> : <div className="form">
        <textarea rows={3} placeholder="Tell us how we can help" value={text} onChange={(e) => setText(e.target.value)} /><button className="btn outline" onClick={send}>Send Message</button>{err && <p className="note err">{err}</p>}</div>}</>}
  </Modal>;
}
