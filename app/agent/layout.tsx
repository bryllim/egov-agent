import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { EGOV_SESSION_COOKIE, openEgovSession } from "@/lib/egov-session";
import { formatPersonName, formatProfileValue } from "@/lib/identity-display";
import { AgentShell } from "./shell";

export default async function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = openEgovSession(cookieStore.get(EGOV_SESSION_COOKIE)?.value);
  if (!session) redirect("/");

  const user = {
    ...session.user,
    name: formatPersonName(session.user.name),
    firstName: formatPersonName(session.user.firstName),
    sex: formatProfileValue(session.user.sex),
  };

  return <AgentShell initialUser={user}>{children}</AgentShell>;
}
