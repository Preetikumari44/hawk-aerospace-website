"use client";

// Technician dashboard — Super App TechnicianHomeScreen parity: duty
// toggle, rating, overview, active/next carousels with Start actions,
// incoming with max-3 guard + details modal + view-all modal, rejected
// modal with re-accept, products, promos + refer card, support chat.

import Link from "next/link";
import { Sprout, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { chatApi, technicianApi } from "@/lib/booking/role-apis";
import { useTech, type TechTicket } from "@/lib/tech/data";

export default function TechDashboard() {
  const {
    profile, rating, ratingCount, dutyOn, setDuty,
    incoming, tickets, rejected, activeQueue, nextQueue,
    products, addToCart, showToast, loading, live, earnings,
    acceptTicket, rejectTicket, reload,
  } = useTech();
  const router = useRouter();
  const [acting, setActing] = React.useState<string | null>(null);
  const [viewAll, setViewAll] = React.useState(false);
  const [detailTicket, setDetailTicket] = React.useState<TechTicket | null>(null);
  const [showRejected, setShowRejected] = React.useState(false);

  const active = activeQueue.length ? activeQueue : tickets.filter((t) => !/complet|clos|reject|resolv/i.test(t.status));
  const activeTicket = active[0] ?? null;
  const nextTicket = (nextQueue[0] ?? active[1] ?? incoming[0] ?? null);
  const totalRepairs = tickets.filter((t) => /complet|clos|resolv|done/i.test(t.status)).length || tickets.length;
  const upcomingCount = incoming.length;

  async function act(id: string, fn: (mid: string) => Promise<void>, ok: string) {
    setActing(id);
    try {
      await fn(id);
      showToast(ok);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setActing(null);
    }
  }

  async function startRepair(id: string) {
    setActing(id);
    try {
      await technicianApi.updateTicketStage(id, { stage: "in_progress" });
      showToast("Repair started.");
      reload();
      router.push(`/technician/tickets/${encodeURIComponent(id)}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setActing(null);
    }
  }

  async function acceptGuarded(t: TechTicket) {
    // Max 3: 1 active + 2 next, no same-date (mobile parity messaging).
    if (active.length >= 3) {
      showToast("You already hold 3 tickets (1 active + 2 next). Finish one first.");
      return;
    }
    if (t.date && active.some((a) => a.date && a.date === t.date)) {
      showToast("You already hold a ticket on that date.");
      return;
    }
    await act(t.id, acceptTicket, "Ticket accepted.");
  }

  async function openSupportChat() {
    try {
      const conv = (await chatApi.createConversation({
        participantUid: "admin",
        participantRole: "admin",
        type: "support",
        supportCategory: "other",
      })) as Record<string, unknown>;
      const cid = String(conv.id ?? conv._id ?? conv.conversationId ?? "");
      router.push(cid ? `/chat/${cid}` : "/chat");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not open support chat.");
    }
  }

  return (
    <>
      <div className="pagehead">
        <div className="flex gap-3 items-center">
          <span className="avatar" style={{ width: 44, height: 44, fontSize: 18 }}>
            {(profile.name[0] || "T").toUpperCase()}
          </span>
          <div>
            <div className="title">Welcome back, {profile.name}</div>
            <p className="sub flex items-center gap-1">
              {rating != null ? (
                <>
                  <Star size={12} className="inline" aria-hidden="true" /> {rating.toFixed(1)}
                  {ratingCount != null ? ` (${ratingCount})` : ""} ·{" "}
                </>
              ) : null}
              {profile.statusDescription}{live ? " · Live" : ""}
            </p>
          </div>
        </div>
        <button
          className={dutyOn ? "status" : "btn secondary"}
          onClick={() => setDuty(!dutyOn)}
          aria-pressed={dutyOn}
        >
          <span className="dot" style={dutyOn ? undefined : { background: "#b33b3b" }} />
          {dutyOn ? "Active" : "Off-Duty"}
        </button>
      </div>

      {loading ? (
        <div className="card">Loading…</div>
      ) : (
        <>
          <div className="grid4">
            <Link className="card no-underline text-inherit" href="/technician/earnings">
              <div className="statlabel">Total Earnings</div>
              <div className="statvalue">₹{earnings.total.toLocaleString("en-IN")}</div>
            </Link>
            <Link className="card no-underline text-inherit" href="/technician/tasks">
              <div className="statlabel">Total Repairs</div>
              <div className="statvalue">{totalRepairs}</div>
            </Link>
            <Link className="card no-underline text-inherit" href="/technician/tasks">
              <div className="statlabel">Upcoming Tickets</div>
              <div className="statvalue">{upcomingCount}</div>
            </Link>
            <button className="card text-left" style={{ cursor: "pointer" }} onClick={() => setShowRejected(true)}>
              <div className="statlabel">Rejected Tickets</div>
              <div className="statvalue">{rejected.length}</div>
            </button>
          </div>

          <div className="grid2 mt-4.5">
            <div className="card">
              <h3 className="sectiontitle">Active Ticket</h3>
              {activeTicket ? (
                <>
                  <b>{activeTicket.title}</b>
                  <p className="sub">
                    {activeTicket.id} · {activeTicket.status} · {activeTicket.date}
                  </p>
                  <p className="sub">{activeTicket.issue}</p>
                  <div className="flex gap-2 mt-2.5 flex-wrap">
                    <button className="btn" disabled={acting === activeTicket.id} onClick={() => void startRepair(activeTicket.id)}>
                      Start Repair
                    </button>
                    <Link href={`/technician/tickets/${encodeURIComponent(activeTicket.id)}`} className="btn secondary">
                      View Details
                    </Link>
                  </div>
                </>
              ) : (
                <div className="empty">No active ticket right now.</div>
              )}
            </div>
            <div className="card">
              <h3 className="sectiontitle">Next Ticket</h3>
              {nextTicket ? (
                <>
                  <b>{nextTicket.title}</b>
                  <p className="sub">
                    {nextTicket.id} · {nextTicket.status}
                  </p>
                  <div className="flex gap-2 mt-2.5 flex-wrap">
                    <button className="btn" disabled={acting === nextTicket.id} onClick={() => void startRepair(nextTicket.id)}>
                      Start Transit
                    </button>
                    <Link href={`/technician/tickets/${encodeURIComponent(nextTicket.id)}`} className="btn secondary">
                      View Details
                    </Link>
                  </div>
                </>
              ) : (
                <div className="empty">No upcoming tickets.</div>
              )}
            </div>
          </div>

          <div className="grid2 mt-4.5">
            <div className="card">
              <h3 className="sectiontitle">Incoming Tickets ({incoming.length})</h3>
              {incoming.length === 0 ? (
                <div className="empty">No incoming tickets.</div>
              ) : (
                incoming.slice(0, 4).map((t) => (
                  <div className="cartrow" key={t.id}>
                    <div>
                      <b>{t.title}</b>
                      <p className="sub">
                        {t.id} · {t.priority} · {t.date}
                      </p>
                    </div>
                    <div className="actions flex gap-2">
                      <button className="btn" disabled={acting === t.id} onClick={() => void acceptGuarded(t)}>
                        Accept
                      </button>
                      <button className="btn danger" disabled={acting === t.id} onClick={() => void act(t.id, rejectTicket, "Ticket rejected.")}>
                        Reject
                      </button>
                      <button className="btn secondary" onClick={() => setDetailTicket(t)}>
                        Details
                      </button>
                    </div>
                  </div>
                ))
              )}
              <div className="flex gap-2 mt-2.5 flex-wrap">
                <button className="btn secondary" onClick={() => setViewAll(true)}>
                  View All
                </button>
                <Link href="/technician/tasks" className="btn secondary">
                  View all tasks →
                </Link>
              </div>
            </div>
            <div className="card offer">
              <b style={{ fontSize: 13 }}>REFER & EARN</b>
              <div style={{ fontSize: 25, fontWeight: 800 }}>Invite. Earn. Fly.</div>
              <p className="sub">Share your code, earn on every signup</p>
              <Link href="/refer" className="btn inline-block mt-2.5">
                Open Refer & Earn
              </Link>
            </div>
            <div className="card offer">
              <b style={{ fontSize: 13 }}>AGRI OFFER</b>
              <div style={{ fontSize: 25, fontWeight: 800 }}>10% OFF</div>
              <p className="sub">Your First Spray Mission</p>
              <Link href="/technician/marketplace" className="btn inline-block mt-2.5">
                Redeem Now
              </Link>
            </div>
          </div>

          <div className="card mt-4.5">
            <h3 className="sectiontitle">Support</h3>
            <p className="sub">24x7 Expert Support — chat with our team anytime.</p>
            <div className="flex gap-2 flex-wrap">
              <button className="btn secondary" onClick={() => void openSupportChat()}>
                Chat with Support
              </button>
              <Link href="/support" className="btn secondary">
                Help Center
              </Link>
            </div>
          </div>

          <h3 className="sectiontitle mt-5.5">
            Popular Products
          </h3>
          <div className="products">
            {products.slice(0, 4).map((p) => (
              <div className="card product" key={p.id}>
                <div className="productimg"><Sprout size={22} aria-hidden="true" /></div>
                <div className="productbody">
                  <Link href={`/technician/marketplace/${encodeURIComponent(p.id)}`} className="productname">
                    {p.name}
                  </Link>
                  <div className="sub">{p.description}</div>
                  <div className="price">Starting from ₹{p.startingFrom.toLocaleString("en-IN")}</div>
                  <button
                    className="btn"
                    style={{ width: "100%" }}
                    onClick={() => {
                      addToCart(p);
                      showToast(`${p.name} added to cart`);
                    }}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {viewAll ? (
        <Modal title={`Incoming Tickets (${incoming.length})`} onClose={() => setViewAll(false)}>
          {incoming.length === 0 ? (
            <div className="empty">No incoming tickets.</div>
          ) : (
            incoming.map((t) => (
              <div className="cartrow" key={t.id}>
                <div>
                  <b>{t.title}</b>
                  <p className="sub">{t.id} · {t.priority} · {t.date}</p>
                </div>
                <div className="actions flex gap-2">
                  <button className="btn" disabled={acting === t.id} onClick={() => void acceptGuarded(t)}>
                    Accept
                  </button>
                  <button className="btn danger" disabled={acting === t.id} onClick={() => void act(t.id, rejectTicket, "Ticket rejected.")}>
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </Modal>
      ) : null}

      {detailTicket ? (
        <Modal title={detailTicket.title} onClose={() => setDetailTicket(null)}>
          <p className="sub">{detailTicket.id} · {detailTicket.status} · {detailTicket.priority}</p>
          <p className="sub">Drone: {detailTicket.droneName || "—"}</p>
          <p className="sub">Raised by: {detailTicket.raisedBy || "—"}</p>
          <p className="sub">{detailTicket.issue}</p>
          <div className="flex gap-2 mt-2.5 flex-wrap">
            <button className="btn" disabled={acting === detailTicket.id} onClick={() => void acceptGuarded(detailTicket)}>
              Accept
            </button>
            <button className="btn danger" disabled={acting === detailTicket.id} onClick={() => void act(detailTicket.id, rejectTicket, "Ticket rejected.")}>
              Reject
            </button>
            <Link href={`/technician/tickets/${encodeURIComponent(detailTicket.id)}`} className="btn secondary">
              Full Details
            </Link>
          </div>
        </Modal>
      ) : null}

      {showRejected ? (
        <Modal title={`Rejected Tickets (${rejected.length})`} onClose={() => setShowRejected(false)}>
          {rejected.length === 0 ? (
            <div className="empty">No rejected tickets.</div>
          ) : (
            rejected.map((t) => (
              <div className="cartrow" key={t.id}>
                <div>
                  <b>{t.title}</b>
                  <p className="sub">{t.id} · {t.date}</p>
                </div>
                <button className="btn" disabled={acting === t.id} onClick={() => void act(t.id, async (mid) => { await technicianApiAccept(mid); }, "Re-accepted.")}>
                  Accept
                </button>
              </div>
            ))
          )}
        </Modal>
      ) : null}
    </>
  );
}

async function technicianApiAccept(id: string) {
  const { technicianApi } = await import("@/lib/booking/role-apis");
  await technicianApi.acceptTicket(id);
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-foreground/40 p-4"
    >
      <div className="card" style={{ maxWidth: 560, width: "100%", maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-2.5">
          <b>{title}</b>
          <button className="btn secondary" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}
