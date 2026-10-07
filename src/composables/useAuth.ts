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

  function login(sessionUser: SessionUser) {
    user.value = sessionUser;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionUser));
  }

  function logout() {
    user.value = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  return { user, isAuthenticated, login, logout };
}
