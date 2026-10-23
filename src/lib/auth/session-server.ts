import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchSessionVersion, readSessionVersion } from "./session-version";
import {
  isSessionVersionCurrent,
  ADMIN_SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  signSessionToken,
  verifySessionToken,
  type AdminSession,
} from "./session";

export async function createAdminSession(session: AdminSession): Promise<void> {
  // Stamp the current session_version (audit M7); callers never pass it.
  const sessionVersion = (await fetchSessionVersion("admins", session.adminId)) ?? 1;
  const token = await signSessionToken({ ...session, sessionVersion });
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  const dbVersion = await readSessionVersion("admins", session.adminId);
  return isSessionVersionCurrent(session.sessionVersion ?? 1, dbVersion)
    ? session
    : null;
}

async function hasSessionCookie(): Promise<boolean> {
  return Boolean((await cookies()).get(ADMIN_SESSION_COOKIE)?.value);
}

export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    // A cookie that still parses but no longer matches the DB version was
    // revoked; clear it via the route handler (Server Components can't).
    redirect(
      (await hasSessionCookie())
        ? "/api/auth/session-revoked?p=admin"
        : "/admin/login",
    );
  }
  return session;
}
