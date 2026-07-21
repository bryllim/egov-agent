import { AgentShell } from "./shell";

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AgentShell>{children}</AgentShell>;
}
