"use client";

// Per-conversation chat — Super App ChatScreen parity: Socket.IO live
// messages + typing indicator + call signalling, read receipts, end chat,
// image/location attach, booking/order ref header. 5s poll stays as backup.

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import Footer from "@/components/homepage/footer/default";
import Navbar from "@/components/homepage/navbar/default";
import { Button } from "@/components/ui/button";
import { LayoutLines } from "@/components/ui/layout-lines";
import { AerialScene } from "@/components/visuals/aerial-scene";
import { apiUpload } from "@/lib/booking/api-client";
import { useBookingAuth } from "@/lib/booking/auth-context";
import { chatApi } from "@/lib/booking/role-apis";
import {
  connectSocket,
  emitTyping,
  joinConversationRoom,
  leaveConversationRoom,
} from "@/lib/booking/socket";

interface Msg {
  id: string;
  text: string;
  mine: boolean;
  time: string;
  read: boolean;
  messageType: string;
  mediaUrl?: string;
}

function toList(v: unknown, myUid?: string): Msg[] {
  const raw = Array.isArray(v) ? v : (v as Record<string, unknown>)?.messages;
  if (!Array.isArray(raw)) return [];
  return (raw as Record<string, unknown>[]).map((m, i) => {
    const sender = String(m.senderUid ?? m.senderId ?? m.uid ?? "");
    const mine =
      Boolean(m.mine ?? m.fromMe ?? m.isOwn) || (myUid != null && myUid !== "" && sender === myUid);
    const readBy = m.readBy;
    return {
      id: String(m.id ?? m._id ?? i),
      text: String(m.text ?? m.body ?? m.message ?? ""),
      mine,
      time: String(m.createdAt ?? m.time ?? ""),
      read: Array.isArray(readBy) ? readBy.length > 1 : Boolean(m.read ?? m.isRead),
      messageType: String(m.messageType ?? "text"),
      mediaUrl: typeof m.mediaUrl === "string" ? m.mediaUrl : undefined,
    };
  });
}

function ChatInner({ id }: { id: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const { isAuthenticated, requestLogin, backendUser, user } = useBookingAuth();
  const [msgs, setMsgs] = React.useState<Msg[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [peerTyping, setPeerTyping] = React.useState(false);
  const [calling, setCalling] = React.useState(false);
  const [ending, setEnding] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [ref, setRef] = React.useState<{ id: string; title: string } | null>(null);
  const [convTitle, setConvTitle] = React.useState("Chat");
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const typingTimeout = React.useRef<number | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const myUid =
    (backendUser?.uid as string | undefined) ??
    (backendUser?.id as string | undefined) ??
    user?.id ??
    "";

  const load = React.useCallback(async () => {
    try {
      setMsgs(toList(await chatApi.getMessages(id), myUid || undefined));
      chatApi.markAsRead(id).catch(() => undefined);
    } catch {
      /* keep previous messages */
    } finally {
      setLoading(false);
    }
  }, [id, myUid]);

  // Conversation meta → ref header (booking/order link).
  React.useEffect(() => {
    const qId = search.get("refId");
    const qTitle = search.get("refTitle");
    if (qId) {
      setRef({ id: qId, title: qTitle ?? qId });
      return;
    }
    if (!isAuthenticated) return;
    chatApi
      .getConversation(id)
      .then((c) => {
        const o = (c ?? {}) as Record<string, unknown>;
        const linked = String(o.bookingId ?? o.orderId ?? "");
        if (linked) {
          setRef({
            id: linked,
            title: String(o.title ?? o.bookingNumber ?? linked),
          });
        }
        if (typeof o.title === "string" && o.title) setConvTitle(o.title);
      })
      .catch(() => undefined);
  }, [id, isAuthenticated, search]);

  // Live socket: join room, message/read/typing events; poll backup.
  React.useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void load();
    joinConversationRoom(id);
    const s = connectSocket();
    const onMessage = (data: { conversationId?: string }) => {
      if (!data || (data.conversationId && data.conversationId !== id)) return;
      void load();
    };
    const onTyping = (data: { conversationId?: string; isTyping?: boolean; uid?: string }) => {
      if (!data || data.conversationId !== id || data.uid === myUid) return;
      if (data.isTyping) {
        setPeerTyping(true);
        if (typingTimeout.current) window.clearTimeout(typingTimeout.current);
        typingTimeout.current = window.setTimeout(() => setPeerTyping(false), 2000);
      } else {
        setPeerTyping(false);
      }
    };
    s?.on("chat:message:sent", onMessage);
    s?.on("chat:message:read", onMessage);
    s?.on("chat:typing", onTyping);
    const t = window.setInterval(() => void load(), 5000);
    return () => {
      window.clearInterval(t);
      s?.off("chat:message:sent", onMessage);
      s?.off("chat:message:read", onMessage);
      s?.off("chat:typing", onTyping);
      leaveConversationRoom(id);
      if (typingTimeout.current) window.clearTimeout(typingTimeout.current);
    };
  }, [isAuthenticated, id, load, myUid]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length, peerTyping]);

  function handleDraftChange(value: string) {
    setDraft(value);
    emitTyping(id, value.length > 0);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      emitTyping(id, false);
      await chatApi.sendMessage(id, { text: draft.trim(), messageType: "text" });
      setDraft("");
      await load();
    } catch {
      /* surface stays; retry below */
    } finally {
      setSending(false);
    }
  }

  async function sendImage(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file, file.name);
      form.append("category", "other");
      const res = await apiUpload<{ downloadUrl?: string; url?: string }>(
        "/files/upload",
        form,
      );
      const url = res.downloadUrl ?? res.url ?? "";
      if (!url) throw new Error("Upload returned no URL.");
      await chatApi.sendMessage(id, {
        text: file.name,
        messageType: "image",
        mediaUrl: url,
      });
      await load();
    } catch {
      /* surface stays */
    } finally {
      setUploading(false);
    }
  }

  async function shareLocation() {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
        chatApi
          .sendMessage(id, { text: `My location: ${url}`, messageType: "text" })
          .then(() => load())
          .catch(() => undefined);
      },
      () => undefined,
      { timeout: 8000 },
    );
  }

  async function startCall() {
    setCalling(true);
    try {
      await chatApi.initiateCall(id);
    } catch {
      /* signal is best-effort */
    } finally {
      window.setTimeout(() => setCalling(false), 4000);
    }
  }

  async function endChat() {
    if (!window.confirm("End this chat? The conversation will be closed.")) return;
    setEnding(true);
    try {
      await chatApi.deleteConversation(id);
      router.push("/chat");
    } catch {
      setEnding(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <main className="hawk-theme hawk-forest relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-16">
      <LayoutLines />
            <div aria-hidden className="absolute inset-0 -z-30">
              <AerialScene variant="terrain" />
            </div>
            <div
              aria-hidden
              className="absolute inset-0 -z-20"
              style={{
                background:
                  "linear-gradient(160deg, rgba(11,36,24,0.93) 0%, rgba(12,58,42,0.82) 55%, rgba(11,36,24,0.95) 100%)",
              }}
            />
            <div aria-hidden className="hawk-grid absolute inset-0 -z-10 text-white opacity-30" />

        <div className="border-border bg-card shadow-2xl backdrop-blur-md flex max-w-md flex-col items-center gap-4 rounded-3xl border p-8 text-center">
          <span className="eyebrow">Chat</span>
          <Button size="lg" onClick={() => requestLogin(`/chat/${id}`)}>
            Log In to Chat
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="hawk-theme hawk-forest relative min-h-screen w-full overflow-hidden">
      <LayoutLines />
            <div aria-hidden className="absolute inset-0 -z-30">
        <AerialScene variant="terrain" />
      </div>
      <div
        aria-hidden
        className="absolute inset-0 -z-20"
        style={{
          background:
            "linear-gradient(160deg, rgba(11,36,24,0.93) 0%, rgba(12,58,42,0.82) 55%, rgba(11,36,24,0.95) 100%)",
        }}
      />
      <div aria-hidden className="hawk-grid absolute inset-0 -z-10 text-white opacity-30" />
      <Navbar />
      <section className="px-4 pt-28 pb-16 sm:pt-36 sm:pb-24">
        <div className="max-w-container mx-auto flex max-w-2xl flex-col gap-4">
          <Link href="/chat" className="text-muted-foreground text-sm underline underline-offset-4">
            ← All conversations
          </Link>
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl font-semibold">{convTitle}</h1>
              {ref ? (
                <p className="text-brand text-xs font-semibold">ID: #{ref.id}</p>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => void startCall()} disabled={calling}>
                {calling ? "Calling…" : "Call"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => void endChat()} disabled={ending}>
                {ending ? "Ending…" : "End Chat"}
              </Button>
            </div>
          </div>
          <div className="border-border bg-card shadow-2xl backdrop-blur-md flex min-h-[320px] flex-col gap-2 rounded-3xl border p-4">
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading messages…</p>
            ) : msgs.length === 0 ? (
              <p className="text-muted-foreground text-sm">No messages yet. Say hello below.</p>
            ) : (
              msgs.map((m) => (
                <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      m.mine ? "bg-brand text-white" : "border-border bg-card border"
                    }`}
                  >
                    {m.messageType === "image" && m.mediaUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- user-uploaded chat media preview.
                      <img src={m.mediaUrl} alt={m.text || "attachment"} className="mb-1 max-h-48 rounded-lg" />
                    ) : null}
                    {m.text ? <span>{m.text}</span> : null}
                    <span
                      className={`mt-0.5 block text-right text-[10px] ${
                        m.mine ? "opacity-70" : "text-muted-foreground"
                      }`}
                    >
                      {m.time ? `${m.time.slice(11, 16) || m.time} ` : ""}
                      {m.mine ? (m.read ? "✓✓" : "✓") : ""}
                    </span>
                  </div>
                </div>
              ))
            )}
            {peerTyping && (
              <p className="text-muted-foreground text-xs italic">typing…</p>
            )}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={send} className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void sendImage(f);
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              aria-label="Attach image"
            >
              {uploading ? "…" : "+"}
            </Button>
            <Button type="button" variant="outline" onClick={() => void shareLocation()} aria-label="Share location">
              ◎
            </Button>
            <input
              value={draft}
              onChange={(e) => handleDraftChange(e.target.value)}
              placeholder="Type a message…"
              className="border-input bg-card focus:border-brand focus:ring-ring h-12 flex-1 rounded-xl border px-3.5 text-base outline-none transition-colors focus:ring-2"
            />
            <Button type="submit" disabled={sending || !draft.trim()}>
              {sending ? "…" : "Send"}
            </Button>
          </form>
        </div>
      </section>
      <Footer />
    </main>
  );
}

export default function ChatThreadPage() {
  const params = useParams<{ id?: string | string[] }>();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id ?? "");
  return (
    <React.Suspense fallback={<main className="hawk-theme hawk-forest relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-16">
      <LayoutLines />
            <div aria-hidden className="absolute inset-0 -z-30">
              <AerialScene variant="terrain" />
            </div>
            <div
              aria-hidden
              className="absolute inset-0 -z-20"
              style={{
                background:
                  "linear-gradient(160deg, rgba(11,36,24,0.93) 0%, rgba(12,58,42,0.82) 55%, rgba(11,36,24,0.95) 100%)",
              }}
            />
            <div aria-hidden className="hawk-grid absolute inset-0 -z-10 text-white opacity-30" />
Loading…</main>}>
      <ChatInner id={id} />
    </React.Suspense>
  );
}
