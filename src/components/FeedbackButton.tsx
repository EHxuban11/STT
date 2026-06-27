import { useCallback, useEffect, useState } from "react";
import { ExternalLink, MessageSquare, Send, X } from "lucide-react";
import { invoke, isTauri } from "@/lib/tauri";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "ok"; url: string; number?: number }
  | { kind: "err"; msg: string };

interface AppInfo {
  name?: string;
  version?: string;
}

const ENDPOINT = "https://issue-creator.xuban-ceccon.workers.dev/feedback";
const REPO = "EHxuban11/STT";
const APP = "yawningface-stt";

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    if (!isTauri) return;
    invoke<AppInfo>("get_app_info").then((info) => {
      if (info) setAppInfo(info);
    });
  }, []);

  const submit = useCallback(async () => {
    const text = message.trim();
    if (!text) {
      setStatus({ kind: "err", msg: "Write a short note first." });
      return;
    }

    setStatus({ kind: "sending" });
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          repo: REPO,
          app: APP,
          message: text,
          meta: {
            url: location.href,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            appName: appInfo?.name,
            appVersion: appInfo?.version,
            tauri: isTauri,
          },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        url?: string;
        number?: number;
        error?: string;
      };

      if (res.ok && data.ok && data.url) {
        setStatus({ kind: "ok", url: data.url, number: data.number });
        setMessage("");
      } else {
        setStatus({ kind: "err", msg: data.error || `Could not send feedback (${res.status}).` });
      }
    } catch {
      setStatus({ kind: "err", msg: "Could not reach the feedback service." });
    }
  }, [appInfo?.name, appInfo?.version, message]);

  const openIssue = useCallback(async (url: string) => {
    if (isTauri) {
      try {
        await invoke("open_external_url", { url });
        return;
      } catch {
        /* fall back to the browser path below */
      }
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  return (
    <div className="no-drag fixed bottom-5 right-5 z-[65]">
      {open && (
        <div className="mb-3 w-[min(340px,calc(100vw-2rem))] rounded-xl border border-line bg-app p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="text-sm font-bold text-ink">Send feedback</div>
            <button
              onClick={() => setOpen(false)}
              className="grid h-7 w-7 place-items-center rounded-lg text-muted transition-colors hover:bg-card hover:text-ink"
              title="Close"
            >
              <X size={15} />
            </button>
          </div>

          <textarea
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              if (status.kind !== "sending") setStatus({ kind: "idle" });
            }}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                if (status.kind !== "sending") submit();
              }
            }}
            placeholder="Bug, idea, or rough note..."
            className="h-28 w-full resize-none rounded-lg border border-line bg-card p-2.5 text-sm text-ink outline-none placeholder:text-faint focus:border-brand"
          />

          <button
            onClick={submit}
            disabled={status.kind === "sending"}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accentbtn px-3 py-2 text-sm font-semibold text-app transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send size={14} />
            {status.kind === "sending" ? "Sending..." : "Send"}
            {status.kind !== "sending" && (
              <span className="ml-1 text-xs font-normal opacity-70">Ctrl + Enter</span>
            )}
          </button>

          {status.kind === "ok" && (
            <button
              type="button"
              onClick={() => openIssue(status.url)}
              className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:underline"
            >
              Issue #{status.number ?? ""} created <ExternalLink size={12} />
            </button>
          )}
          {status.kind === "err" && (
            <div className="mt-2 text-xs font-medium leading-5 text-red-500">{status.msg}</div>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-full border border-line bg-ink px-4 py-2 text-sm font-semibold text-app shadow-pill transition-transform hover:-translate-y-0.5"
      >
        <MessageSquare size={15} />
        Feedback
      </button>
    </div>
  );
}
