"use client";

/* Persistent shell for every /agent route: owns the sidebar, the session user,
   and the conversation list so they survive navigation between pages. */

import Image from "next/image";
import {
  createContext,
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
  MessageCircle,
  Folder,
  PanelLeftClose,
  PanelLeftOpen,
  SquarePen,
  Workflow,
} from "lucide-react";
import { AgentMark, AgentWordmark } from "@/components/brand";
import {
  DEMO_PROFILE,
  RECENT_CONVERSATIONS,
  getServerSessionUserSnapshot,
  getSessionUserSnapshot,
  readDemoUser,
  seedConversation,
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
};

const AgentShellContext = createContext<AgentShellContextValue | null>(null);

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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!readDemoUser(sessionStorage.getItem("egov-user"))) {
      router.replace("/");
    }
  }, [router, sessionUser]);

  /* Seed the sidebar with realistic past conversations */
  useEffect(() => {
    if (!user) return;
    setConversations((cs) =>
      cs.length
        ? cs
        : RECENT_CONVERSATIONS.map((title, i) => seedConversation(title, user, i))
    );
  }, [user]);

  const goToChat = () => {
    if (pathname !== "/agent") router.push("/agent");
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
    sessionStorage.removeItem("egov-user");
    window.speechSynthesis?.cancel();
    router.push("/");
  };

  if (!user) return null;

  const onChat = pathname === "/agent";

  return (
    <AgentShellContext.Provider
      value={{
        user,
        conversations,
        setConversations,
        activeConvId,
        setActiveConvId,
      }}
    >
      <main className="flex h-dvh overflow-hidden bg-[#f7faff] text-slate-900">
        <aside
          className={`flex w-[76px] shrink-0 flex-col bg-white/85 shadow-[10px_0_30px_rgba(6,61,125,0.04)] backdrop-blur-xl transition-[width] duration-300 ease-out ${
            sidebarCollapsed ? "sm:w-[84px]" : "sm:w-[280px]"
          }`}
        >
          <div className="flex h-full flex-col px-3 py-4 sm:px-4 sm:py-5">
            <div
              className={`flex items-center justify-center ${
                sidebarCollapsed
                  ? "sm:flex-col sm:gap-3"
                  : "sm:justify-between sm:gap-3"
              }`}
            >
              <div className="sm:hidden">
                <AgentMark size={34} />
              </div>
              <div className="hidden min-w-0 sm:block">
                {sidebarCollapsed ? (
                  <AgentMark size={34} />
                ) : (
                  <AgentWordmark size={32} />
                )}
              </div>
              <button
                type="button"
                onClick={() => setSidebarCollapsed((value) => !value)}
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-label={
                  sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
                }
                aria-expanded={!sidebarCollapsed}
                className="hidden h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-slate-400 shadow-[0_8px_20px_rgba(11,22,36,0.05)] transition hover:border-[#0a4f9e]/30 hover:text-[#0a4f9e] sm:flex"
              >
                {sidebarCollapsed ? (
                  <PanelLeftOpen size={17} />
                ) : (
                  <PanelLeftClose size={17} />
                )}
              </button>
            </div>

            <nav className="mt-8 space-y-2" aria-label="Agent navigation">
              <SidebarNavButton
                active={onChat && activeConvId === null}
                expanded={!sidebarCollapsed}
                icon={<SquarePen size={18} />}
                label="New conversation"
                onClick={newConversation}
              />
              <SidebarNavButton
                active={pathname.startsWith("/agent/agencies")}
                expanded={!sidebarCollapsed}
                icon={<Landmark size={18} />}
                label="Connected agencies"
                onClick={() => router.push("/agent/agencies")}
              />
              <SidebarNavButton
                active={pathname.startsWith("/agent/memory")}
                expanded={!sidebarCollapsed}
                icon={<Brain size={18} />}
                label="Memory"
                onClick={() => router.push("/agent/memory")}
              />
              <SidebarNavButton
                active={pathname.startsWith("/agent/vault")}
                expanded={!sidebarCollapsed}
                icon={<Folder size={18} />}
                label="Vault"
                onClick={() => router.push("/agent/vault")}
              />
              <SidebarNavButton
                active={pathname.startsWith("/agent/how-it-works")}
                expanded={!sidebarCollapsed}
                icon={<Workflow size={18} />}
                label="How it works"
                onClick={() => router.push("/agent/how-it-works")}
              />
              <div className="my-5 h-px bg-slate-200/70" />
              <RecentConversations
                expanded={!sidebarCollapsed}
                conversations={conversations}
                activeId={onChat ? activeConvId : null}
                onSelect={selectConversation}
              />
            </nav>

            <div className="mt-auto space-y-3">
              <button
                type="button"
                aria-label="View profile"
                title="View profile"
                onClick={() => router.push("/agent/profile")}
                className={`group flex w-full cursor-pointer items-center justify-center rounded-2xl px-2 py-3 text-left transition-all duration-200 hover:bg-[#f6f9ff] ${
                  pathname.startsWith("/agent/profile") ? "bg-[#f6f9ff]" : ""
                } ${
                  sidebarCollapsed ? "" : "sm:justify-start sm:gap-3 sm:px-3"
                }`}
              >
                <Image
                  src={user.photoSrc ?? DEMO_PROFILE.photoSrc}
                  alt={user.name}
                  width={40}
                  height={40}
                  className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-[#0a4f9e]/10 transition group-hover:ring-[#0a4f9e]/30"
                />
                {!sidebarCollapsed && (
                  <>
                    <div className="hidden min-w-0 flex-1 leading-tight sm:block">
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
                      className="hidden shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#0a4f9e] sm:block"
                    />
                  </>
                )}
              </button>

              <div className="space-y-2">
                <SidebarControlButton
                  danger
                  expanded={!sidebarCollapsed}
                  icon={<LogOut size={18} />}
                  label="Sign out"
                  onClick={signOut}
                />
              </div>
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">{children}</section>
      </main>
    </AgentShellContext.Provider>
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
      title={label}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`group flex h-11 w-full cursor-pointer items-center justify-center text-[14px] font-medium transition-all duration-200 ${
        expanded ? "sm:justify-start sm:gap-3 sm:px-3" : "sm:px-0"
      } ${
        active
          ? "bg-brand-gradient rounded-xl text-white shadow-[0_14px_30px_rgba(6,61,125,0.2)]"
          : "rounded-2xl text-slate-500 hover:bg-[#f6f9ff] hover:text-[#0a4f9e]"
      }`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
        {icon}
      </span>
      {expanded && <span className="hidden truncate sm:block">{label}</span>}
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
    <div className="space-y-2">
      {expanded && (
        <div className="font-pixel hidden px-3 text-[9px] uppercase tracking-[0.18em] text-slate-400 sm:block">
          Previous conversations
        </div>
      )}
      <div className="max-h-[132px] space-y-1.5 overflow-y-auto overscroll-contain pr-1 sm:max-h-[168px]">
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
                  ? "sm:justify-start sm:gap-3 sm:px-3 sm:py-2.5"
                  : "h-10 sm:px-0"
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
                <span className="hidden min-w-0 sm:block">
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
      onClick={onClick}
      title={label}
      className={`flex h-11 w-full cursor-pointer items-center justify-center rounded-2xl text-[14px] font-medium transition-all duration-200 ${
        expanded ? "sm:justify-start sm:gap-3 sm:px-3" : "sm:px-0"
      } ${tone}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
        {icon}
      </span>
      {expanded && <span className="hidden truncate sm:block">{label}</span>}
    </button>
  );
}
