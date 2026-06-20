import { Star } from "lucide-react";

const REPO_URL = "https://github.com/yawningface";

export default function GitHubStarPill({ label = "Star on GitHub" }: { label?: string }) {
  return (
    <a
      href={REPO_URL}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-card"
    >
      <Star className="h-3.5 w-3.5 fill-[#EBB303] text-[#EBB303]" aria-hidden />
      <span>{label}</span>
    </a>
  );
}
