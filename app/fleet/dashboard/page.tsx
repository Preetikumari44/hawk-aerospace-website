"use client";

// Fleet dashboard — exact teammate layout (fleet-manager-dashboard-new),
// backend-first data via FleetDataProvider + live incoming FM requests with
// accept/reject + pilot/drone assignment (Super App parity).

import Link from "next/link";
import * as React from "react";

import { fleetApi, teamApi } from "@/lib/booking/role-apis";
import { useFleetData, type TeamPilot } from "@/lib/fleet/data";

export default function FleetDashboard() {
  const {
    user,
    dutyOn,
    setDuty,
    togglingDuty,
    pilots,
    drones,
    missions,
    requests,
    team,
    teamTabCounts,
    earnings,
    products,
    addToCart,
    showToast,
    loading,
    live,
    reload,
  } = useFleetData();
  const [acting, setActing] = React.useState<string | null>(null);
  const [teamTab, setTeamTab] = React.useState<"invite" | "pending" | "request">("invite");
  const [invitePhone, setInvitePhone] = React.useState("");

  const active = drones.filter((d) => d.status === "Assigned").length;
  const available = drones.filter((d) => d.status === "Deployable").length;
  const maint = drones.filter((d) => d.status === "Maintenance").length;
  const activePilots = pilots.filter((p) => p.status !== "Off-Duty").length;
  const mActive = missions.filter((m) => m.tab === "Active").length;
  const mUp = missions.filter((m) => m.tab === "Upcoming").length;
  const mDone = missions.filter((m) => m.tab === "Completed").length;
  const next = missions.find((m) => m.tab === "Upcoming");
  const label = (s: string) => (s === "Assigned" ? "Active" : s === "Deployable" ? "Available" : s);
  const badge = (s: string) => (s === "Maintenance" ? "red" : s === "Assigned" ? "blue" : "");

  async function teamAct(t: TeamPilot) {
    setActing(t.id);
    try {
      if (t.kind === "invite") {
        await teamApi.invitePilot(
          t.phone ? { phone: t.phone } : { pilotUid: t.id },
        );
        showToast("Invite sent.");
      } else if (t.kind === "pending") {
        await teamApi.cancel(t.id);
        showToast("Request withdrawn.");
      } else {
        await teamApi.accept(t.id);
        showToast("Request accepted.");
      }
      reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setActing(null);
    }
  }

  async function inviteByPhone() {
    const digits = invitePhone.replace(/\D/g, "").slice(-10);
    if (digits.length !== 10) {
      showToast("Enter a valid 10-digit number.");
      return;
    }
    setActing("invite-phone");
    try {
      await teamApi.invitePilot({ phone: `+91${digits}` });
      showToast("Invite sent.");
      setInvitePhone("");
      reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setActing(null);
    }
  }

  const teamTabList = team.filter((t) => t.kind === teamTab);

  async function handleRequest(requestId: string, bookingId: string, accept: boolean) {
    setActing(requestId);
    try {
      if (accept) await fleetApi.acceptFleetManagerRequest(requestId, bookingId);
      else await fleetApi.rejectFleetManagerRequest(requestId, bookingId, "Rejected from web");
      showToast(accept ? "Request accepted." : "Request rejected.");
      reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Request action failed.");
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="dash">
      <div className="welcome">
        <div className="welcomeL">
          <div className="bigAvatar">{user.name[0]}</div>
          <div>
            <small>Welcome back,</small>
            <h1>{user.name}</h1>
          </div>
        </div>
        <div className="statusCard">
          <span className="statusDot" style={dutyOn === false ? { background: "#c0392b" } : undefined} />
          <div>
            <b>{dutyOn === false ? "Off-Duty" : "Active"}</b>
            <span>
              {dutyOn === false ? "You are Off-Duty" : "You are Active Full Day"}
              {live ? " · Live" : ""}
            </span>
          </div>
          <button
            className="btn secondary"
            disabled={togglingDuty || dutyOn === null}
            onClick={() =>
              void (async () => {
                try {
                  await setDuty(!(dutyOn !== false));
                } catch {
                  showToast("Duty update failed.");
                }
              })()
            }
          >
            {togglingDuty ? "…" : dutyOn === false ? "Go Active" : "Go Off-Duty"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card">Loading fleet data…</div>
      ) : (
        <>
          {requests.length > 0 && (
            <>
              <div className="secHead">
                <h2>Incoming Requests ({requests.length})</h2>
                <Link href="/fleet/missions">View All →</Link>
              </div>
              <div className="card">
                <div className="tableWrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Booking</th>
                        <th>Service</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.slice(0, 5).map((r, i) => {
                        const rid = String(r.requestId ?? r.id ?? i);
                        const bid = String(r.bookingId ?? r.bookingNumber ?? "");
                        return (
                          <tr key={rid}>
                            <td>
                              <b>{bid || rid}</b>
                            </td>
                            <td>{String(r.serviceType ?? r.type ?? "")}</td>
                            <td>
                              <span className="badge">Pending</span>
                            </td>
                            <td>
                              <button
                                className="btn primary"
                                disabled={acting === rid}
                                onClick={() => void handleRequest(rid, bid, true)}
                              >
                                Accept
                              </button>{" "}
                              <button
                                className="btn secondary"
                                disabled={acting === rid}
                                onClick={() => void handleRequest(rid, bid, false)}
                              >
                                Reject
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          <div className="kpis">
            <div className="kpi dark">
              <span>Total Fleet</span>
              <strong>{drones.length}</strong>
            </div>
            <div className="kpi">
              <span>Active Drones</span>
              <strong>{active}</strong>
            </div>
            <div className="kpi">
              <span>Active Pilots</span>
              <strong>{activePilots}</strong>
            </div>
            <div className="kpi">
              <span>Upcoming Missions</span>
              <strong>{mUp}</strong>
            </div>
          </div>

          <div className="kpis">
            <div className="kpi dark">
              <span>Earnings</span>
              <strong>₹{earnings.total.toLocaleString("en-IN")}</strong>
            </div>
            <div className="kpi">
              <span>Pending</span>
              <strong>₹{earnings.pending.toLocaleString("en-IN")}</strong>
            </div>
            <div className="kpi">
              <span>Completed</span>
              <strong>{mDone}</strong>
            </div>
            <Link className="kpi no-underline text-inherit" href="/fleet/earnings">
              <span>Open Earnings →</span>
              <strong>Wallet</strong>
            </Link>
          </div>

          {mActive > 0 && (
            <>
              <div className="secHead">
                <h2>Active Missions</h2>
                <Link href="/fleet/missions">View All →</Link>
              </div>
              <div className="card">
                {missions
                  .filter((m) => m.tab === "Active")
                  .slice(0, 3)
                  .map((m) => (
                    <div className="dRow" key={m.id}>
                      <span>
                        <b>{m.type}</b>
                        <small>
                          {m.client} · {m.pilot ?? "Unassigned pilot"} · {m.drone ?? "Unassigned drone"}
                        </small>
                      </span>
                      <span className="flex gap-1.5 items-center">
                        <span className="badge blue">{m.status}</span>
                        <Link href={`/fleet/bookings/${encodeURIComponent(m.id)}`}>Details →</Link>
                      </span>
                    </div>
                  ))}
              </div>
            </>
          )}

          <div className="secHead">
            <h2>Drone Handover</h2>
            <Link href="/fleet/handover">Open Handover →</Link>
          </div>
          <div className="card mb-3">
            <p className="muted m-0">
              Share the 4-character issue code with your pilot in person, then verify the return code here.
            </p>
          </div>

          <div className="secHead">
            <h2>Team Pilots</h2>
            <Link href="/fleet/resources">View All →</Link>
          </div>
          <div className="card">
            <div className="actions mb-2.5">
              {(["invite", "pending", "request"] as const).map((t) => (
                <button
                  key={t}
                  className={"btn " + (teamTab === t ? "primary" : "secondary")}
                  onClick={() => setTeamTab(t)}
                >
                  {t === "invite" ? `Invite (${teamTabCounts.invite})` : t === "pending" ? `Pending (${teamTabCounts.pending})` : `Requests (${teamTabCounts.request})`}
                </button>
              ))}
            </div>
            {teamTab === "invite" && (
              <div className="search mb-2.5">
                <input
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="Invite by phone (10-digit)"
                />
                <button className="btn primary" disabled={acting === "invite-phone"} onClick={() => void inviteByPhone()}>
                  Invite
                </button>
              </div>
            )}
            {teamTabList.length === 0 ? (
              <div className="empty">
                {teamTab === "invite"
                  ? "No pilots nearby — invite one by phone (150km radius applied)."
                  : teamTab === "pending"
                    ? "No outgoing invites."
                    : "No join requests."}
              </div>
            ) : (
              teamTabList.slice(0, 5).map((t) => (
                <div className="dRow" key={t.id}>
                  <span>
                    <b>{t.name}</b>
                    <small>{t.detail}{t.phone ? ` · ${t.phone}` : ""}</small>
                  </span>
                  <span className="flex gap-1.5">
                    {t.kind === "invite" ? (
                      <button className="btn primary" disabled={acting === t.id} onClick={() => void teamAct(t)}>
                        Invite
                      </button>
                    ) : t.kind === "pending" ? (
                      <button className="btn secondary" disabled={acting === t.id} onClick={() => void teamAct(t)}>
                        Withdraw
                      </button>
                    ) : (
                      <>
                        <button className="btn primary" disabled={acting === t.id} onClick={() => void teamAct(t)}>
                          Accept
                        </button>
                        <button
                          className="btn secondary"
                          disabled={acting === t.id}
                          onClick={() => void (async () => {
                            setActing(t.id);
                            try {
                              await teamApi.reject(t.id);
                              showToast("Request rejected.");
                              reload();
                            } catch (err) {
                              showToast(err instanceof Error ? err.message : "Action failed.");
                            } finally {
                              setActing(null);
                            }
                          })()}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="secHead">
            <h2>Promotions & Offers</h2>
          </div>
          <div className="offers">
            <div className="offer green">
              <em>REFER & EARN</em>
              <strong>Invite. Earn. Fly.</strong>
              <span>Share your code, earn on every signup</span>
              <Link href="/refer">Open Refer & Earn →</Link>
            </div>
            <div className="offer green">
              <em>FLEET OFFER</em>
              <strong>20% OFF</strong>
              <span>Scheduled maintenance package</span>
              <Link href="/fleet/resources">Redeem Now →</Link>
            </div>
            <div className="offer brown">
              <em>FLEET BONUS</em>
              <strong>₹500 Credit</strong>
              <span>On completing 5 missions this month</span>
              <Link href="/fleet/missions">View Details →</Link>
            </div>
            <div className="offer teal">
              <em>SPECIAL OFFER</em>
              <strong>15% OFF Spare Parts</strong>
              <span>On bulk marketplace orders</span>
              <Link href="/fleet/marketplace">View Details →</Link>
            </div>
          </div>

          <div className="secHead">
            <h2>Popular Products</h2>
            <Link href="/fleet/marketplace">View All</Link>
          </div>
          <div className="prods">
            {products.slice(0, 4).map((p) => (
              <div className="prod" key={p.id}>
                <div className="prodImg">{p.image}</div>
                <b title={p.name}>{p.name}</b>
                <small>Starting from</small>
                <div className="pp">₹{p.price.toLocaleString("en-IN")}</div>
                <button
                  onClick={() => {
                    addToCart(p);
                    showToast(`${p.name} added to cart`);
                  }}
                >
                  Add to Cart
                </button>
              </div>
            ))}
          </div>

          <div className="sumGrid">
            <div className="panel">
              <div className="panelHead">
                <h2>Fleet Overview</h2>
                <Link href="/fleet/resources">View All →</Link>
              </div>
              <div className="kv">
                <div>
                  <span>Total drones</span>
                  <b>{drones.length}</b>
                </div>
                <div>
                  <span>Active</span>
                  <b>{active}</b>
                </div>
                <div>
                  <span>Available</span>
                  <b>{available}</b>
                </div>
                <div>
                  <span>Maintenance</span>
                  <b>{maint}</b>
                </div>
                <div>
                  <span>Pilots</span>
                  <b>{pilots.length}</b>
                </div>
                <div>
                  <span>Upcoming</span>
                  <b>{mUp}</b>
                </div>
              </div>
            </div>
            <div className="panel">
              <div className="panelHead">
                <h2>Drone Status</h2>
                <Link href="/fleet/resources">View All →</Link>
              </div>
              {drones.slice(0, 3).map((d) => (
                <div className="dRow" key={d.id}>
                  <span>
                    <b>{d.code}</b>
                    <small>{d.model}</small>
                  </span>
                  <span className={"badge " + badge(d.status)}>{label(d.status)}</span>
                </div>
              ))}
            </div>
            <div className="panel">
              <div className="panelHead">
                <h2>Mission Summary</h2>
                <Link href="/fleet/missions">View All →</Link>
              </div>
              <div className="miniStats">
                <div>
                  <strong>{mActive}</strong>
                  <span>Active</span>
                </div>
                <div>
                  <strong>{mUp}</strong>
                  <span>Upcoming</span>
                </div>
                <div>
                  <strong>{mDone}</strong>
                  <span>Completed</span>
                </div>
              </div>
              <div className="note">{next ? `Next: ${next.location}` : "No upcoming missions"}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
