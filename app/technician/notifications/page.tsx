"use client";

// Technician notifications — teammate placeholder content, live data.

import { useTech } from "@/lib/tech/data";

export default function TechNotifications() {
  const { notifications, loading } = useTech();
  return (
    <>
      <div className="title">Notifications</div>
      {loading ? (
        <div className="card mt-3.5">
          Loading…
        </div>
      ) : notifications.length === 0 ? (
        <div className="empty mt-3.5">
          No notifications available.
        </div>
      ) : (
        <div className="card mt-3.5">
          {notifications.map((n) => (
            <div key={n.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <b style={{ fontSize: 13 }}>{n.title}</b>
              <p className="sub">{n.body}</p>
              <p className="sub">{n.time}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
