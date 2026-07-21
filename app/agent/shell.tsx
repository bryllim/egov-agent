"use client";

/* Persistent shell for every /agent route: owns the sidebar, the session user,
   and the conversation list so they survive navigation between pages. */

import Image from "next/image";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeCheck,
  Brain,
  ChevronRight,
  Landmark,
  LogOut,
  Menu,
  MessageCircle,
  Folder,
  ListChecks,
  PanelLeftClose,
  PanelLeftOpen,
  SquarePen,
  X,
} from "lucide-react";
import { AgentMark, AgentWordmark } from "@/components/brand";
import { PrivacyNoticeModal } from "@/components/privacy-notice-modal";
import {
  DEMO_PROFILE,
  getServerSessionUserSnapshot,
  getSessionUserSnapshot,
  readDemoUser,
  subscribeToSessionStorage,
  type Conversation,
  type User,
} from "./brain";

type AgentShellContextValue = {
  user: User;
  conversations: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  activeConvId: string | null;
  setActiveConvId: (id: string | null) => void;
  openPrivacyNotice: () => void;
};

const AgentShellContext = createContext<AgentShellContextValue | null>(null);

function normalizeConversationIds(conversations: Conversation[]) {
  const usedIds = new Set<string>();

  return conversations.map((conversation) => {
    let id = conversation.id;
    let suffix = 2;

    while (usedIds.has(id)) {
      id = `${conversation.id}-${suffix++}`;
    }

    usedIds.add(id);
    return id === conversation.id ? conversation : { ...conversation, id };
  });
}

export function useAgentShell() {
  const ctx = useContext(AgentShellContext);
  if (!ctx) throw new Error("useAgentShell must be used inside <AgentShell>");
  return ctx;
}

export function AgentShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const sessionUser = useSyncExternalStore(
    subscribeToSessionStorage,
    getSessionUserSnapshot,
    getServerSessionUserSnapshot
  );
  const user = useMemo(() => readDemoUser(sessionUser), [sessionUser]);
  const [storedConversations, setStoredConversations] = useState<
    Conversation[]
  >([]);
  const conversations = useMemo(
    () => normalizeConversationIds(storedConversations),
    [storedConversations]
  );
  const setConversations: React.Dispatch<
    React.SetStateAction<Conversation[]>
  > = useCallback(
    (value) => {
      setStoredConversations((current) => {
        const base = normalizeConversationIds(current);
        const next = typeof value === "function" ? value(base) : value;
        return normalizeConversationIds(next);
      });
    },
    []
  );
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [privacyNoticeOpen, setPrivacyNoticeOpen] = useState(false);

  useEffect(() => {
    if (!readDemoUser(sessionStorage.getItem("egov-user"))) {
      router.replace("/");
    }
  }, [router, sessionUser]);

  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileSidebarOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileSidebarOpen]);

  const goToChat = () => {
    setMobileSidebarOpen(false);
    if (pathname !== "/agent") router.push("/agent");
  };

  const navigateTo = (href: string) => {
    setMobileSidebarOpen(false);
    router.push(href);
  };

  const newConversation = () => {
    setActiveConvId(null);
    goToChat();
  };

  const selectConversation = (id: string) => {
    setActiveConvId(id);
    goToChat();
  };

  const signOut = () => {
    setMobileSidebarOpen(false);
    sessionStorage.removeItem("egov-user");
    window.speechSynthesis?.cancel();
    router.push("/");
  };

  const openPrivacyNotice = useCallback(() => {
    setMobileSidebarOpen(false);
    setPrivacyNoticeOpen(true);
  }, []);
  const closePrivacyNotice = useCallback(
    () => setPrivacyNoticeOpen(false),
    [],
  );

  if (!user) return null;

  return (
    <AgentShellContext.Provider
      value={{
        user,
        conversations,
        setConversations,
        activeConvId,
        setActiveConvId,
        openPrivacyNotice,
      }}
    >
      <main
        aria-hidden={privacyNoticeOpen || undefined}
        inert={privacyNoticeOpen ? true : undefined}
        className="relative flex h-dvh overflow-hidden bg-[#f7faff] text-slate-900"
      >
        <header
          aria-label="Mobile app header"
          className="absolute inset-x-0 top-0 z-30 flex h-16 items-center justify-between bg-white/92 px-4 shadow-[0_1px_0_oklch(0_0_0/0.05),0_10px_24px_-22px_rgba(6,61,125,0.45)] backdrop-blur-xl sm:hidden"
        >
          <AgentWordmark size={30} />
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileSidebarOpen}
            aria-controls="mobile-agent-sidebar"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-[#f3f7fc] text-slate-600 transition-[background-color,color,transform] duration-150 hover:bg-[#eaf2fc] hover:text-[#0a4f9e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a4f9e]/30 active:scale-[0.96]"
          >
            <Menu size={20} strokeWidth={2.2} />
          </button>
        </header>

        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileSidebarOpen(false)}
          tabIndex={mobileSidebarOpen ? 0 : -1}
          className={`fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[1px] transition-opacity duration-300 sm:hidden ${
            mobileSidebarOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }`}
        />

        <aside
          aria-label="Agent sidebar"
          className={`hidden w-[76px] shrink-0 flex-col bg-white/85 shadow-[10px_0_30px_rgba(6,61,125,0.04)] backdrop-blur-xl transition-[width] duration-300 ease-out sm:flex ${
            sidebarCollapsed ? "sm:w-[84px]" : "sm:w-[280px]"
          }`}
        >
          <SidebarContent
            variant="desktop"
            user={user}
            pathname={pathname}
            expanded={!sidebarCollapsed}
            conversations={conversations}
            activeConvId={activeConvId}
            onNewConversation={newConversation}
            onSelectConversation={selectConversation}
            onNavigate={navigateTo}
            onSignOut={signOut}
            onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
          />
        </aside>

        <aside
          id="mobile-agent-sidebar"
          role="dialog"
          aria-label="Agent menu"
          aria-modal="true"
          aria-hidden={!mobileSidebarOpen}
          inert={mobileSidebarOpen ? undefined : true}
          className={`fixed inset-y-0 right-0 z-50 flex w-[min(88vw,328px)] shrink-0 transform flex-col bg-white/95 shadow-[-18px_0_45px_rgba(6,61,125,0.18)] backdrop-blur-xl transition-transform duration-300 ease-out sm:hidden ${
            mobileSidebarOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <SidebarContent
            variant="mobile"
            user={user}
            pathname={pathname}
            expanded
            conversations={conversations}
            activeConvId={activeConvId}
            onCloseMobile={() => setMobileSidebarOpen(false)}
            onNewConversation={newConversation}
            onSelectConversation={selectConversation}
            onNavigate={navigateTo}
            onSignOut={signOut}
          />
        </aside>

        <section className="flex min-w-0 flex-1 flex-col pt-16 sm:pt-0">
          {children}
        </section>
      </main>
      {privacyNoticeOpen && (
        <PrivacyNoticeModal onClose={closePrivacyNotice} />
      )}
    </AgentShellContext.Provider>
  );
}

function SidebarContent({
  activeConvId,
  conversations,
  expanded,
  onCloseMobile,
  onNavigate,
  onNewConversation,
  onSelectConversation,
  onSignOut,
  onToggleCollapsed,
  pathname,
  user,
  variant,
}: {
  activeConvId: string | null;
  conversations: Conversation[];
  expanded: boolean;
  onCloseMobile?: () => void;
  onNavigate: (href: string) => void;
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
  onSignOut: () => void;
  onToggleCollapsed?: () => void;
  pathname: string;
  user: User;
  variant: "desktop" | "mobile";
}) {
  const onChat = pathname === "/agent";
  const isDesktop = variant === "desktop";
  const collapseLabel = expanded ? "Collapse sidebar" : "Expand sidebar";

  return (
    <div className="flex h-full flex-col px-4 py-5">
      <div
        className={`flex items-center ${
          isDesktop
            ? expanded
              ? "justify-between gap-3"
              : "flex-col justify-center gap-3"
            : "justify-between gap-3"
        }`}
      >
        <div className="min-w-0">
          {expanded ? <AgentWordmark size={32} /> : <AgentMark size={34} />}
        </div>
        {isDesktop ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            title={collapseLabel}
            aria-label={collapseLabel}
            aria-expanded={expanded}
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-slate-400 shadow-[0_8px_20px_rgba(11,22,36,0.05)] transition hover:border-[#0a4f9e]/30 hover:text-[#0a4f9e]"
          >
            {expanded ? (
              <PanelLeftClose size={17} />
            ) : (
              <PanelLeftOpen size={17} />
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-slate-500 shadow-[0_8px_20px_rgba(11,22,36,0.06)] transition hover:border-[#0a4f9e]/30 hover:text-[#0a4f9e]"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav
        className="mt-8 flex min-h-0 flex-1 flex-col space-y-2"
        aria-label="Agent navigation"
      >
        <SidebarNavButton
          active={onChat && activeConvId === null}
          expanded={expanded}
          icon={<SquarePen size={18} />}
          label="New conversation"
          onClick={onNewConversation}
        />
        <SidebarNavButton
          active={pathname.startsWith("/agent/agencies")}
          expanded={expanded}
          icon={<Landmark size={18} />}
          label="Connected agencies"
          onClick={() => onNavigate("/agent/agencies")}
        />
        <SidebarNavButton
          active={pathname.startsWith("/agent/memory")}
          expanded={expanded}
          icon={<Brain size={18} />}
          label="Memory"
          onClick={() => onNavigate("/agent/memory")}
        />
        <SidebarNavButton
          active={pathname.startsWith("/agent/vault")}
          expanded={expanded}
          icon={<Folder size={18} />}
          label="Vault"
          onClick={() => onNavigate("/agent/vault")}
        />
        <SidebarNavButton
          active={pathname.startsWith("/agent/logs")}
          expanded={expanded}
          icon={<ListChecks size={18} />}
          label="Logs"
          onClick={() => onNavigate("/agent/logs")}
        />
        <div className="my-5 h-px bg-slate-200/70" />
        <RecentConversations
          expanded={expanded}
          conversations={conversations}
          activeId={onChat ? activeConvId : null}
          onSelect={onSelectConversation}
        />
      </nav>

      <div className="mt-4 shrink-0 space-y-3">
        <button
          type="button"
          data-audit="Opened profile"
          aria-label="View profile"
          title="View profile"
          onClick={() => onNavigate("/agent/profile")}
          className={`group flex w-full cursor-pointer items-center justify-center rounded-2xl px-2 py-3 text-left transition-all duration-200 hover:bg-[#f6f9ff] ${
            pathname.startsWith("/agent/profile") ? "bg-[#f6f9ff]" : ""
          } ${expanded ? "justify-start gap-3 px-3" : ""}`}
        >
          <Image
            src={user.photoSrc ?? DEMO_PROFILE.photoSrc}
            alt={user.name}
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-[#0a4f9e]/10 transition group-hover:ring-[#0a4f9e]/30"
          />
          {expanded && (
            <>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="flex min-w-0 items-center text-[13.5px] font-semibold">
                  <span className="truncate transition group-hover:text-[#0a4f9e]">
                    {user.name}
                  </span>
                </div>
                <div className="font-pixel mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#0a4f9e]/10 px-2.5 py-1 text-[9px] uppercase tracking-widest text-[#0a4f9e]">
                  <BadgeCheck size={12} className="shrink-0" />
                  <span className="truncate">Verified</span>
                </div>
              </div>
              <ChevronRight
                size={15}
                className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#0a4f9e]"
              />
            </>
          )}
        </button>

        <div className="space-y-2">
          <SidebarControlButton
            danger
            expanded={expanded}
            icon={<LogOut size={18} />}
            label="Sign out"
            onClick={onSignOut}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ sidebar pieces ----------------------------- */

function SidebarNavButton({
  active = false,
  expanded,
  icon,
  label,
  onClick,
}: {
  active?: boolean;
  expanded: boolean;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      data-audit={`Opened ${label}`}
      title={label}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`group flex h-11 w-full cursor-pointer items-center justify-center text-[14px] font-medium transition-all duration-200 ${
        expanded ? "justify-start gap-3 px-3" : "px-0"
      } ${
        active
          ? "bg-brand-gradient rounded-xl text-white shadow-[0_14px_30px_rgba(6,61,125,0.2)]"
          : "rounded-2xl text-slate-500 hover:bg-[#f6f9ff] hover:text-[#0a4f9e]"
      }`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
        {icon}
      </span>
      {expanded && <span className="truncate">{label}</span>}
    </button>
  );
}

function RecentConversations({
  expanded,
  conversations,
  activeId,
  onSelect,
}: {
  expanded: boolean;
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {expanded && (
        <div className="font-pixel shrink-0 px-3 text-[9px] uppercase tracking-[0.18em] text-slate-400">
          Previous conversations
        </div>
      )}
      <div className="relative mt-2 min-h-0 flex-1">
        <div className="scrollbar-subtle h-full space-y-1.5 overflow-y-auto overscroll-contain pr-1 [mask-image:linear-gradient(to_bottom,transparent,black_18px,black_calc(100%-18px),transparent)]">
          {conversations.map((conversation) => {
            const active = conversation.id === activeId;
            return (
              <button
                key={conversation.id}
                type="button"
                title={conversation.title}
                onClick={() => onSelect(conversation.id)}
                aria-current={active ? "true" : undefined}
                className={`group animate-step-in flex w-full cursor-pointer items-center justify-center rounded-xl text-left transition-all duration-200 ${
                  active
                    ? "bg-[#0a4f9e]/10"
                    : "hover:bg-[#f6f9ff] hover:text-[#0a4f9e]"
                } ${
                  expanded
                    ? "justify-start gap-3 px-3 py-2.5"
                    : "h-10 px-0"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition ${
                    active
                      ? "bg-[#0a4f9e] text-white"
                      : "bg-slate-100 text-slate-400 group-hover:bg-[#0a4f9e]/10 group-hover:text-[#0a4f9e]"
                  }`}
                >
                  <MessageCircle size={15} />
                </span>
                {expanded && (
                  <span className="min-w-0">
                    <span
                      className={`block truncate text-[13px] transition ${
                        active
                          ? "font-semibold text-[#0a4f9e]"
                          : "font-medium text-slate-600 group-hover:text-[#0a4f9e]"
                      }`}
                    >
                      {conversation.title}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SidebarControlButton({
  active = false,
  danger = false,
  expanded,
  icon,
  label,
  onClick,
}: {
  active?: boolean;
  danger?: boolean;
  expanded: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  const tone = active
    ? "bg-[#0a4f9e]/10 text-[#0a4f9e]"
    : danger
      ? "text-slate-400 hover:bg-red-50 hover:text-red-500"
      : "text-slate-400 hover:bg-[#f6f9ff] hover:text-[#0a4f9e]";

  return (
    <button
      type="button"
      data-audit={danger ? "Signed out" : label}
      onClick={onClick}
      title={label}
      className={`flex h-11 w-full cursor-pointer items-center justify-center rounded-2xl text-[14px] font-medium transition-all duration-200 ${
        expanded ? "justify-start gap-3 px-3" : "px-0"
      } ${tone}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
        {icon}
      </span>
      {expanded && <span className="truncate">{label}</span>}
    </button>
  );
}
