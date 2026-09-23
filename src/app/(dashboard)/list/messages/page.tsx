"use client";

import { Notice, withSuspense } from "@/components/ui/Page";
import { markMessageRead, sendMessage } from "@/lib/actions";
import { useAuth } from "@/lib/auth-context";
import { col, useLiveQuery } from "@/lib/live";
import { useOptions } from "@/lib/options";
import type { Message } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { limit, orderBy, query, where } from "firebase/firestore";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";

const Compose = ({ replyTo, onSent }: { replyTo?: { id: string; name: string } | null; onSent: () => void }) => {
  const { user, profile, role } = useAuth();
  const staff = role === "admin" || role === "finance" || role === "teacher";
  const teachers = useOptions("teachers", { order: "surname" });
  const students = useOptions("students", { order: "surname", enabled: staff });
  const parents = useOptions("parents", { order: "surname", enabled: staff });
  const office = useOptions("admins", { order: "surname", enabled: staff });
  const [to, setTo] = useState(replyTo?.id ?? "");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groups = [
    { label: "Lecturers", options: teachers.options },
    ...(staff
      ? [
          { label: "Office", options: office.options },
          { label: "Students", options: students.options },
          { label: "Guardians", options: parents.options },
        ]
      : []),
  ];

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await sendMessage({ id: user!.uid, name: profile?.displayName ?? "" }, { toId: to, body });
      setBody("");
      toast("Message sent!");
      onSent();
    } catch (err) {
      const issues = (err as { issues?: { message: string }[] }).issues;
      setError(issues?.[0]?.message ?? (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={send} className="flex flex-col gap-2">
      {replyTo ? (
        <p className="text-sm text-gray-500">To {replyTo.name}</p>
      ) : (
        <select
          required
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm bg-white"
        >
          <option value="">Choose recipient...</option>
          {groups.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.options
                .filter((o) => o.value !== user?.uid)
                .map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      )}
      <textarea
        required
        rows={4}
        maxLength={4000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a message..."
        className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
      />
      {error && <Notice tone="error">{error}</Notice>}
      <button disabled={busy} className="bg-blue-400 text-white p-2 rounded-md self-start px-6 disabled:opacity-60">
        {busy ? "Sending..." : "Send"}
      </button>
    </form>
  );
};

const MessagesPage = () => {
  const { user } = useAuth();
  const params = useSearchParams();
  const [tab, setTab] = useState<"inbox" | "sent">(params.get("tab") === "sent" ? "sent" : "inbox");
  const [composing, setComposing] = useState(false);
  const [reply, setReply] = useState<{ id: string; name: string } | null>(null);
  const uid = user?.uid ?? "";

  const { data, loading, error } = useLiveQuery<Message>(
    () =>
      uid
        ? query(col("messages"), where(tab === "inbox" ? "toId" : "fromId", "==", uid), orderBy("sentAt", "desc"), limit(50))
        : null,
    `messages|${tab}|${uid}`
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-lg font-semibold">Messages</h1>
        <div className="flex gap-2 text-sm">
          {(["inbox", "sent"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 rounded-md capitalize ${tab === t ? "bg-lamaSky" : "bg-slate-100"}`}
            >
              {t}
            </button>
          ))}
          <button onClick={() => { setReply(null); setComposing((c) => !c); }} className="px-3 py-1 rounded-md bg-lamaYellow">
            {composing ? "Close" : "New message"}
          </button>
        </div>
      </div>
      {(composing || reply) && <Compose replyTo={reply} onSent={() => { setComposing(false); setReply(null); }} />}
      {error && <Notice tone="error">{error}</Notice>}
      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : !data.length ? (
        <p className="text-sm text-gray-400">No messages.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-gray-100">
          {data.map((m) => (
            <li key={m.id} className={`py-3 flex flex-col gap-1 ${tab === "inbox" && !m.read ? "font-medium" : ""}`}>
              <div className="flex justify-between gap-2 text-sm">
                <span>{tab === "inbox" ? `From ${m.fromName}` : `To ${m.toName}`}</span>
                <span className="text-xs text-gray-400 whitespace-nowrap">{formatDateTime(m.sentAt)}</span>
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-line font-normal">{m.body}</p>
              {tab === "inbox" && (
                <div className="flex gap-4 text-xs text-gray-500">
                  <button className="underline" onClick={() => setReply({ id: m.fromId, name: m.fromName })}>Reply</button>
                  {!m.read && <button className="underline" onClick={() => markMessageRead(m.id)}>Mark as read</button>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default withSuspense(MessagesPage);
