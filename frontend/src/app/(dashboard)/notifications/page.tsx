"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, Inbox } from "lucide-react";
import {
  fetchNotifications,
  markNotificationRead,
  type Notification,
} from "@/lib/api";

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?callbackUrl=%2Fnotifications");
    }
  }, [status, router]);

  useEffect(() => {
    const email = session?.user?.email;
    if (!email) return;

    let cancelled = false;
    (async () => {
      try {
        const notifs = await fetchNotifications(email);
        if (!cancelled) {
          setNotifications(notifs);
        }
      } catch (e) {
        console.error("Failed to load notifications", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.email]);

  const handleMarkRead = async (id: string, isRead: boolean) => {
    if (isRead) return;
    const email = session?.user?.email;
    if (!email) return;

    try {
      await markNotificationRead(id, email);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (e) {
      console.error("Failed to mark as read", e);
    }
  };

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[var(--muted)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-0 pb-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
            Account
          </p>
          <h1 className="font-bebas text-[clamp(2rem,5vw,2.75rem)] leading-none tracking-tight text-[var(--black)]">
            NOTIFICATIONS
          </h1>
        </div>
        <Bell className="h-6 w-6 text-[var(--gold)]" />
      </div>

      <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-[14px] text-[var(--muted)]">
            Fetching your notifications...
          </div>
        ) : notifications.length > 0 ? (
          <ul className="divide-y divide-[var(--border)]">
            {notifications.map((notif) => (
              <li
                key={notif.id}
                className={`flex items-start justify-between gap-4 p-4 transition-colors ${
                  notif.isRead ? "bg-[var(--surface)] opacity-70" : "bg-[var(--cream)]"
                }`}
              >
                <div>
                  <p
                    className={`text-[14px] ${
                      notif.isRead ? "text-[var(--muted)]" : "font-semibold text-[var(--black)]"
                    }`}
                  >
                    {notif.message}
                  </p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    {new Date(notif.createdAt).toLocaleString()} • {notif.type}
                  </p>
                </div>
                {!notif.isRead && (
                  <button
                    onClick={() => handleMarkRead(notif.id, notif.isRead)}
                    className="shrink-0 text-[var(--gold)] transition-transform hover:scale-110"
                    title="Mark as read"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="mb-4 h-12 w-12 text-[#E6E6DF]" strokeWidth={1} />
            <p className="text-[15px] font-semibold text-[var(--black)]">
              You're all caught up!
            </p>
            <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-[var(--muted)]">
              You have no notifications yet.
            </p>
            <div className="mt-6 border-l-2 border-[var(--gold)] bg-[var(--cream)] p-4 text-left">
              <p className="text-[13px] text-[var(--black)]">
                <span className="font-bold text-[var(--gold)]">Note:</span> We have automatically reported your recent fraud to the company's support mail on your behalf.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
