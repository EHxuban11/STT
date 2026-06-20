import Logo from "@/components/Logo";
import GitHubStarPill from "@/components/GitHubStarPill";

const links = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#faq", label: "FAQ" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo />

        <nav className="hidden items-center gap-7 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <GitHubStarPill />
          <a
            href="#download"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
          >
            Download
          </a>
        </div>
      </div>
    </header>
  );
}
