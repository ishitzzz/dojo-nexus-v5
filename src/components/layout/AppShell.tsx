"use client";

import { useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import ThemeToggle from "@/components/ThemeToggle";

// ─────────────────────────────────────────────────────────────
// ICON COMPONENTS
// ─────────────────────────────────────────────────────────────
function HomeIcon()    { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function DojoIcon()    { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l4 4 4-4M12 8v8"/></svg>; }
function NexusIcon()   { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="12" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><line x1="8" y1="11" x2="16" y2="7"/><line x1="8" y1="13" x2="16" y2="17"/></svg>; }
function UploadIcon()  { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="12" x2="12" y2="18"/><line x1="9" y1="15" x2="15" y2="15"/></svg>; }
function ReaderIcon()  { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>; }
function UserIcon()    { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }

// ─────────────────────────────────────────────────────────────
// NAV ITEM
// ─────────────────────────────────────────────────────────────
interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  expanded: boolean;
  active: boolean;
  onClick: () => void;
}

function NavItem({ icon, label, expanded, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        width: "100%",
        padding: expanded ? "10px 16px" : "10px",
        borderRadius: "8px",
        border: "none",
        cursor: "pointer",
        background: active ? "var(--accent-soft)" : "transparent",
        color: active ? "var(--accent)" : "var(--text-secondary)",
        transition: "background-color 150ms ease, color 150ms ease, padding 200ms ease",
        textAlign: "left",
        whiteSpace: "nowrap",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-secondary)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
        }
      }}
    >
      <span style={{ flexShrink: 0, display: "flex" }}>{icon}</span>
      <span
        style={{
          fontSize: "13px",
          fontWeight: active ? 600 : 400,
          opacity: expanded ? 1 : 0,
          transition: "opacity 180ms ease",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// UPLOAD DRAWER
// ─────────────────────────────────────────────────────────────
function UploadDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setStatus("Processing syllabus...");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", "syllabus");
      const res = await fetch("/api/upload-syllabus", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      localStorage.setItem("generatedCourse", JSON.stringify(data));
      onClose();
      router.push(`/roadmap?topic=${encodeURIComponent(data.courseTitle || "Uploaded Syllabus")}`);
    } catch {
      setStatus("Upload failed. Please try again.");
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 200,
        }}
      />
      {/* Drawer */}
      <div
        className="slide-up"
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(480px, 92vw)",
          borderRadius: "16px 16px 0 0",
          padding: "32px 28px",
          zIndex: 201,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderBottom: "none",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>Sync Syllabus</h2>
          <button
            onClick={onClose}
            style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontSize: "18px" }}
          >
            ✕
          </button>
        </div>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>
          Upload a PDF syllabus or exam paper. We&apos;ll generate a structured roadmap for you.
        </p>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "8px",
            background: "var(--accent)",
            color: "#fff",
            fontWeight: 600,
            fontSize: "14px",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            transition: "background-color 150ms ease, opacity 150ms ease",
          }}
        >
          {loading ? "Processing..." : "Choose PDF File"}
        </button>
        {status && (
          <p style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center", marginTop: "12px" }}>
            {status}
          </p>
        )}
        <input ref={fileRef} type="file" accept=".pdf,.png,.jpg" className="hidden" onChange={handleUpload} />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// APPSHELL
// ─────────────────────────────────────────────────────────────
interface AppShellProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { icon: <HomeIcon />,   label: "Home",         href: "/dashboard" },
  { icon: <DojoIcon />,   label: "Dojo",         href: "/roadmap"   },
  { icon: <NexusIcon />,  label: "Nexus",        href: "/nexus"     },
];

const TOOL_ITEMS = [
  { icon: <ReaderIcon />, label: "Smart Reader",  href: "/reader"   },
];

export default function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/") || pathname.startsWith("/app" + href);

  const go = (href: string) => router.push(href);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

      {/* ── LEFT SIDEBAR ─────────────────────────── */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        style={{
          width: expanded ? "220px" : "64px",
          flexShrink: 0,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          padding: "12px 8px",
          gap: "4px",
          background: "var(--bg-secondary)",
          borderRight: "1px solid var(--border)",
          transition: "width 200ms cubic-bezier(0.16,1,0.3,1)",
          overflow: "hidden",
          zIndex: 50,
        }}
      >
        {/* Logo / Brand mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: expanded ? "8px 16px" : "8px 10px",
            marginBottom: "8px",
            overflow: "hidden",
            transition: "padding 200ms ease",
          }}
        >
          <span style={{ fontSize: "22px", flexShrink: 0 }}>🥋</span>
          <span
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "var(--text-primary)",
              opacity: expanded ? 1 : 0,
              transition: "opacity 180ms ease",
              whiteSpace: "nowrap",
            }}
          >
            The Dojo
          </span>
        </div>

        {/* Main nav */}
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            icon={item.icon}
            label={item.label}
            href={item.href}
            expanded={expanded}
            active={isActive(item.href)}
            onClick={() => go(item.href)}
          />
        ))}

        {/* Divider */}
        <div style={{ height: "1px", background: "var(--border)", margin: "8px 4px" }} />

        {/* Syllabus upload — triggers drawer */}
        <NavItem
          icon={<UploadIcon />}
          label="Syllabus Upload"
          href="#upload"
          expanded={expanded}
          active={false}
          onClick={() => setUploadOpen(true)}
        />

        {/* Smart Reader */}
        {TOOL_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            icon={item.icon}
            label={item.label}
            href={item.href}
            expanded={expanded}
            active={isActive(item.href)}
            onClick={() => go(item.href)}
          />
        ))}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* ThemeToggle at bottom */}
        <div
          style={{
            display: "flex",
            justifyContent: expanded ? "flex-start" : "center",
            padding: expanded ? "4px 8px" : "4px 0",
            transition: "padding 200ms ease",
          }}
        >
          {expanded ? (
            <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingLeft: "8px" }}>
              <ThemeToggle sidebar />
              <span
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  opacity: expanded ? 1 : 0,
                  transition: "opacity 180ms ease",
                  whiteSpace: "nowrap",
                }}
              >
                Toggle theme
              </span>
            </div>
          ) : (
            <ThemeToggle sidebar />
          )}
        </div>

        {/* User avatar */}
        <button
          title="Profile"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            width: "100%",
            padding: expanded ? "10px 16px" : "10px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            background: "transparent",
            color: "var(--text-secondary)",
            transition: "background-color 150ms ease, padding 200ms ease",
            overflow: "hidden",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-card)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          }}
        >
          <span style={{ flexShrink: 0, display: "flex" }}><UserIcon /></span>
          <span
            style={{
              fontSize: "13px",
              opacity: expanded ? 1 : 0,
              transition: "opacity 180ms ease",
              whiteSpace: "nowrap",
              color: "var(--text-secondary)",
            }}
          >
            Profile
          </span>
        </button>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────── */}
      <main
        style={{
          flex: 1,
          overflow: "auto",
          background: "var(--bg-primary)",
          position: "relative",
        }}
      >
        {children}
      </main>

      {/* ── UPLOAD DRAWER ────────────────────────── */}
      <UploadDrawer open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}
