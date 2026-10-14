import { computed, ref } from "vue";
import type { SessionUser } from "@/types";

const STORAGE_KEY = "sms_user";

function readStoredUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

const user = ref<SessionUser | null>(readStoredUser());

export function useAuth() {
  const isAuthenticated = computed(() => user.value !== null);
  const isAdmin = computed(() => user.value?.role === "admin");
  const basePath = computed(() =>
    user.value?.role === "admin" ? "/admin" : "/user"
  );

  function login(sessionUser: SessionUser) {
    user.value = sessionUser;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionUser));
  }

  function logout() {
    user.value = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Confirm the local session against the server. If the server session
   * cookie has expired or is missing, the stale local user is cleared so
   * the router sends the visitor back to the login page instead of letting
   * them hit "Admin access required." errors.
   */
  async function refresh(): Promise<boolean> {
    try {
      const res = await fetch("/api/auth/session");
      const data: { success?: boolean; user?: SessionUser | null } = await res
        .json()
        .catch(() => ({}));

      if (res.ok && data.success && data.user) {
        login(data.user);
        return true;
      }
    } catch {
      /* treat a network error as an invalid session */
    }

    logout();
    return false;
  }

  return { user, isAuthenticated, isAdmin, basePath, login, logout, refresh };
}
