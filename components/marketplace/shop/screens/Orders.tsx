'use client';
import { EmptyState, ErrorState, Icon, inr, Skeleton, useAsync } from '../components/ui';
import { IS_DEMO,services } from '../services';
import { type Order,STATUS_FLOW } from '../types';

const date = (s: string) => new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
export function OrderHistory({ onBack, onTrack, onShop }: { onBack: () => void; onTrack: (id: string) => void; onShop: () => void }) {
  const r = useAsync(() => services.orders.list(), []);
  return <div className="page"><button className="back" onClick={onBack}><Icon n="back" /> Order History</button>
    {IS_DEMO && <p className="note">Sample order data. Real order history is not connected yet.</p>}
    {r.loading ? <Skeleton h={130} /> : r.error ? <ErrorState text="Unable to load orders." onRetry={r.retry} /> : r.data!.length === 0 ? <EmptyState title="No orders yet" text="Your orders will appear here." action={<button className="btn primary" onClick={onShop}>Shop Now</button>} /> :
      <div className="orders">{r.data!.map((o) => <article className="box" key={o.id}><div className="o-h"><h3>Order #{o.id}</h3><span className={'status ' + o.status.replace(/\s/g, '').toLowerCase()}>{o.status}</span></div>
        {o.items.map((i) => <p key={i.productId}>{i.name}<br /><small>{i.qty} × {inr(i.unitPrice)}</small></p>)}
        <p className="meta">{date(o.createdAt)}</p><div className="o-f"><b>Total: {inr(o.totals.total)}</b>
          {o.status !== 'Cancelled' && <button className="btn outline" onClick={() => onTrack(o.id)}>View Details</button>}</div></article>)}</div>}</div>;
}
export function OrderTracking({ id, onBack }: { id: string; onBack: () => void }) {
  const r = useAsync(() => services.orders.get(id), [id]); const o: Order | undefined = r.data;
  const idx = o ? STATUS_FLOW.indexOf(o.status) : -1;
  return <div className="page"><button className="back" onClick={onBack}><Icon n="back" /> Order Details</button>
    {r.loading ? <Skeleton h={260} /> : r.error || !o ? <ErrorState text="Unable to load this order." onRetry={r.retry} /> : <div className="box"><h3>Order #{o.id}</h3>{o.items.map((i) => <p key={i.productId}>{i.name} <small>× {i.qty}</small></p>)}<p><b>Total: {inr(o.totals.total)}</b></p>
      <p className="meta"><Icon n="pin" s={16} /> Delivery location: {o.address.line}</p>{!IS_DEMO && <p className="meta"><Icon n="truck" s={16} /> Estimated delivery: <b>{date(o.eta)}</b></p>}
      {IS_DEMO && <p className="note">Sample order: no real delivery or tracking data is connected.</p>}{o.status === 'Cancelled' ? <p className="note err">This order was cancelled.</p> : <ol className="timeline">{STATUS_FLOW.map((s, i) =>
        <li key={s} className={i < idx || o.status === 'Delivered' ? 'done' : i === idx ? 'now' : ''}><i>{i < idx || o.status === 'Delivered' ? '✓' : i === idx ? '●' : '○'}</i>{s}</li>)}</ol>}</div>}</div>;
}
