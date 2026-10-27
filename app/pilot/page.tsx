"use client";



// Pilot home — Super App HomeScreen parity: profile + availability, rating,

// overview cards (incl. Upcoming/Rejected), FM carousel, suggested FMs with

// distance + 150km join, Join/Pending/Invites team tabs, promos, products,

// support chat. Live socket refresh via provider.



import Link from "next/link";

import { Package } from "lucide-react";

import * as React from "react";



import { teamApi } from "@/lib/booking/role-apis";

import { usePilot, type TeamEntry } from "@/lib/pilot/data";



type TeamTab = "suggested" | "pending" | "invite" | "joined";



export default function PilotHome() {

  const {

    profile,

    setAvailable,

    toggling,

    missions,

    incoming,

    rejected,

    earnings,

    products,

    promotions,

    teams,

    loading,

    error,

    reload,

    showToast,

    act,

  } = usePilot();


  const [teamTab, setTeamTab] = React.useState<TeamTab>("suggested");

  const [joinPhone, setJoinPhone] = React.useState("");

  const [teaming, setTeaming] = React.useState(false);



  const on = profile.availability === "active";

  const completed = missions.filter((m) => /complet/i.test(m.status)).length;

  const upcoming = missions.filter((m) => /upcoming|confirm|assign|schedul/i.test(m.status)).length;



  async function teamAct(id: string, kind: TeamEntry["kind"]) {

    if (kind === "joined") return;

    setTeaming(true);

    try {

      if (kind === "suggested") await teamApi.requestToJoin({ managerId: id });

      else if (kind === "pending") await teamApi.cancel(id);

      else await teamApi.accept(id);

      showToast("Done.");

      reload();

    } catch (err) {

      showToast(err instanceof Error ? err.message : "Action failed.");

    } finally {

      setTeaming(false);

    }

  }



  async function joinByPhone() {

    const digits = joinPhone.replace(/\D/g, "").slice(-10);

    if (digits.length !== 10) {

      showToast("Enter a valid 10-digit number.");

      return;

    }

    setTeaming(true);

    try {

      await teamApi.requestToJoin({ phone: `+91${digits}` });

      showToast("Join request sent.");

      setJoinPhone("");

      reload();

    } catch (err) {

      showToast(err instanceof Error ? err.message : "Action failed.");

    } finally {

      setTeaming(false);

    }

  }



  const tabbed = teams.filter((t) =>

    teamTab === "joined" ? t.kind === "joined" : t.kind === teamTab,

  );

  const joined = teams.filter((t) => t.kind === "joined");



  return (

    <>

      <div className="flex justify-end items-center mb-2">
        <div className="flex gap-3 items-center">
          <div className="text-right">
            <div style={{ fontSize: 13, fontWeight: 700 }}>
              {toggling ? "Updating…" : on ? "Active" : "Off-Duty"}
            </div>
            <div className="p-sub m-0" style={{ fontSize: 11 }}>
              {on ? "Visible to Fleet Managers" : "Hidden from Fleet Managers"}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label="Duty status"
            className={"p-switch" + (on ? " on" : "")}
            disabled={toggling}
            onClick={() => void (async () => {
              try {
                await setAvailable(!on);
              } catch {
                showToast("Duty update failed.");
              }
            })()}
          >
            <span className="p-switch-thumb" />
          </button>
        </div>
      </div>

      {error ? (

        <div className="p-card">

          {error} <button className="p-btn outline" onClick={reload}>Retry</button>

        </div>

      ) : null}



      {loading ? (

        <div className="p-card">Loading…</div>

      ) : (

        <>

          <div className="p-overview mt-4">

            <div className="p-ovcard dark">

              <div className="p-ovlabel">Total Earnings</div>

              <div className="p-ovvalue">₹{earnings.total.toLocaleString("en-IN")}</div>

            </div>

            <div className="p-ovcard">

              <div className="p-ovlabel">Completed</div>

              <div className="p-ovvalue">{completed}</div>

            </div>

            <div className="p-ovcard">

              <div className="p-ovlabel">Upcoming</div>

              <div className="p-ovvalue">{upcoming}</div>

            </div>

            <div className="p-ovcard">

              <div className="p-ovlabel">Rejected</div>

              <div className="p-ovvalue">{rejected.length}</div>

            </div>

          </div>



          {joined.length > 0 && (

            <>

              <h3 className="mt-5 mb-2.5" style={{ fontSize: 18 }}>

                Your Fleet Managers ({joined.length})

              </h3>

              <div className="p-hscroll">

                {joined.map((t) => (

                  <div className="p-mission" style={{ minWidth: 260 }} key={t.id}>

                    <div className="flex gap-2.5 items-center">

                      <span className="p-avatar">{(t.name[0] || "F").toUpperCase()}</span>

                      <div>

                        <b>{t.name}</b>

                        <p className="p-sub m-0">{t.detail}</p>

                      </div>

                    </div>

                    {t.phone ? (

                      <p className="p-sub mt-2">{t.phone}</p>

                    ) : null}

                  </div>

                ))}

              </div>

            </>

          )}



          <div className="p-card">

            <h3 className="mb-1.5" style={{ fontSize: 18 }}>My Teams</h3>

            <div className="p-segment mb-2.5">

              {(["suggested", "pending", "invite"] as const).map((t) => (

                <button key={t} className={teamTab === t ? "active" : ""} onClick={() => setTeamTab(t)}>

                  {t === "suggested" ? "Join" : t === "pending" ? "Pending" : "Invites"}

                </button>

              ))}

            </div>

            {teamTab === "suggested" && (

              <div className="flex gap-2 mb-2.5">

                <input

                  value={joinPhone}

                  onChange={(e) => setJoinPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}

                  placeholder="Manager phone (10-digit)"

                  inputMode="numeric"

                  className="p-input"

                  style={{ maxWidth: 220 }}

                />

                <button className="p-btn secondary" disabled={teaming} onClick={() => void joinByPhone()}>

                  Request

                </button>

              </div>

            )}

            {tabbed.length === 0 ? (

              <p className="p-sub m-0">

                {teamTab === "suggested"

                  ? "No suggested managers nearby. Requests you send appear under Pending."

                  : teamTab === "pending"

                    ? "No outgoing requests."

                    : "No invites."}

              </p>

            ) : (

              tabbed.slice(0, 6).map((t) => (

                <div className="p-teamrow" key={t.id}>

                  <div>

                    <b style={{ fontSize: 13 }}>{t.name}</b>

                    <p className="p-sub m-0">

                      {t.detail}

                      {t.distanceKm != null ? ` · ${t.distanceKm} km away` : ""}

                    </p>

                  </div>

                  <button

                    className="p-btn secondary"

                    disabled={teaming}

                    onClick={() => void teamAct(t.id, t.kind)}

                  >

                    {t.kind === "suggested" ? "Join" : t.kind === "pending" ? "Withdraw" : "Accept"}

                  </button>

                </div>

              ))

            )}

          </div>



          <h3 className="mt-5 mb-2.5" style={{ fontSize: 18 }}>Promotions & Offers</h3>

          <div className="p-hscroll">

            <div className="p-promo green">

              <em>REFER & EARN</em>

              <strong>Invite. Earn. Fly.</strong>

              <span style={{ fontSize: 10 }}>Share your code, earn on every signup</span>

              <Link href="/refer" style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>Open Refer & Earn →</Link>

            </div>

            {promotions.map((p) => (

              <div className={"p-promo " + p.tone} key={p.id}>

                <em>{p.badge}</em>

                <strong>{p.title}</strong>

                <span style={{ fontSize: 10 }}>{p.subtitle}</span>

                <button onClick={() => showToast(p.subtitle)}>{p.ctaLabel} →</button>

              </div>

            ))}

          </div>



          <div className="flex justify-between items-center mt-5 mb-2.5">

            <h3 className="m-0" style={{ fontSize: 18 }}>Popular Products</h3>

            <Link href="/pilot/marketplace" style={{ color: "var(--p-forest)", fontSize: 13, fontWeight: 600 }}>

              View All

            </Link>

          </div>

          <div className="p-hscroll">

            {(products.length ? products.slice(0, 6) : [{ id: "p1", name: "Propeller Set", price: 1200 }, { id: "p2", name: "Flight Battery", price: 6800 }]).map(

              (p, i) => (

                <div className="p-mini" key={String((p as Record<string, unknown>).id ?? i)}>

                  <div className="p-miniimg"><Package size={22} aria-hidden="true" /></div>

                  <b style={{ fontSize: 11 }}>{String((p as Record<string, unknown>).name ?? "Product")}</b>

                  <div style={{ fontSize: 9, color: "var(--p-muted)" }}>Starting from</div>

                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--p-forest)" }}>

                    ₹{Number((p as Record<string, unknown>).price ?? 0).toLocaleString("en-IN")}

                  </div>

                  <button onClick={() => showToast("Added to cart.")}>Add to Cart</button>

                </div>

              ),

            )}

          </div>



          {incoming.length > 0 && (

            <>

              <h3 className="mt-5 mb-2.5" style={{ fontSize: 18 }}>Assigned Requests</h3>

              <div className="p-hscroll">

                {incoming.slice(0, 5).map((m) => (

                  <div className="p-mission" style={{ minWidth: 300 }} key={m.id}>

                    <b>{m.serviceType}</b>

                    <p className="p-sub my-1 mx-0">

                      {m.id} · {m.customerName}

                    </p>

                    <p className="p-sub m-0">

                      {m.address} · {m.scheduledDate}

                    </p>

                    <div className="flex gap-2 mt-2.5">

                      <button className="p-btn" onClick={() => void act(m.id, (id) => import("@/lib/booking/role-apis").then((a) => a.pilotApi.acceptMission(id)), "Accepted.")}>

                        Accept

                      </button>

                      <button className="p-btn outline" onClick={() => void act(m.id, (id) => import("@/lib/booking/role-apis").then((a) => a.pilotApi.rejectMission(id, {})), "Rejected.")}>

                        Reject

                      </button>

                    </div>

                  </div>

                ))}

              </div>

            </>

          )}

          

          <div className="p-card">
            <h3 className="mb-1.5" style={{ fontSize: 18 }}>Drone Handover</h3>
            <p className="p-sub mb-2.5">
              Take over and hand back drones using secure codes.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Link href="/pilot/handover" className="p-btn">
                Open Drone Handover
              </Link>
            </div>
          </div>

        </>

      )}

    </>

  );
}
