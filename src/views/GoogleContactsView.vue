<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { PageHeader, StatCard } from "@/components/ui";
import type { Group } from "@/types";
import { useAuth } from "@/composables/useAuth";

interface TokenResponse {
  access_token?: string;
  error?: string;
}

interface TokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
  callback: (resp: TokenResponse) => void;
}

interface GoogleOauth2 {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (resp: TokenResponse) => void;
  }) => TokenClient;
  revoke: (token: string, done?: () => void) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: GoogleOauth2;
      };
    };
  }
}

const { basePath } = useAuth();

const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? "";
const SCOPE = "https://www.googleapis.com/auth/contacts.readonly";
const GIS_SRC = "https://accounts.google.com/gsi/client";

const groups = ref<Group[]>([]);
const selectedGroup = ref("");
const loading = ref(false);
const loadingContacts = ref(false);
const message = ref<{ type: "success" | "error"; text: string } | null>(null);

const totalGroups = computed(() => groups.value.length);
const totalContacts = computed(() =>
  groups.value.reduce((sum, g) => sum + (g.contacts ?? 0), 0)
);
const selectedGroupObj = computed(
  () => groups.value.find((g) => g.id === selectedGroup.value) ?? null
);

onMounted(() => {
  fetch("/api/groups")
    .then((r) => r.json())
    .then((data) => {
      groups.value = data.groups ?? [];
    })
    .catch(() => {});
});

function dismissMessage() {
  message.value = null;
}

function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SRC}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("load failed")));
      return;
    }

    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("load failed"));
    document.head.appendChild(script);
  });
}

async function fetchAllGoogleContacts(accessToken: string) {
  const contacts: { phone: string; name?: string }[] = [];
  let pageToken = "";

  do {
    const url = new URL("https://people.googleapis.com/v1/people/me/connections");
    url.searchParams.set("personFields", "names,phoneNumbers");
    url.searchParams.set("pageSize", "1000");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const detail = await res.json().catch(() => null);
      throw new Error(
        detail?.error?.message ?? "Failed to read Google contacts."
      );
    }

    const data = await res.json();
    for (const person of data.connections ?? []) {
      const name: string | undefined = person.names?.[0]?.displayName;
      for (const phone of person.phoneNumbers ?? []) {
        const value = String(phone.value ?? "").trim();
        if (value) contacts.push({ phone: value, name });
      }
    }

    pageToken = data.nextPageToken ?? "";
  } while (pageToken);

  return contacts;
}

async function importContacts(contacts: { phone: string; name?: string }[]) {
  const res = await fetch("/api/contacts/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ groupId: selectedGroup.value, contacts }),
  });
  return res.json();
}

async function handleToken(tokenResponse: TokenResponse) {
  if (tokenResponse.error || !tokenResponse.access_token) {
    message.value = {
      type: "error",
      text: "Google login failed. Please try again.",
    };
    loading.value = false;
    return;
  }

  const accessToken = tokenResponse.access_token;
  loadingContacts.value = true;

  try {
    const contacts = await fetchAllGoogleContacts(accessToken);

    if (contacts.length === 0) {
      message.value = {
        type: "error",
        text: "No phone numbers found in your Google contacts.",
      };
      return;
    }

    const data = await importContacts(contacts);

    if (!data.success) {
      message.value = {
        type: "error",
        text: data.message ?? "Failed to import Google contacts.",
      };
      return;
    }

    const dupes = data.duplicates ?? [];
    message.value = {
      type: "success",
      text:
        dupes.length > 0
          ? `Imported ${data.imported} contact(s) from Google. Skipped ${dupes.length} duplicate number(s).`
          : `Imported ${data.imported} contact(s) from Google into "${selectedGroupObj.value?.name ?? "the group"}".`,
    };

    const res = await fetch("/api/groups");
    const refreshed = await res.json();
    groups.value = refreshed.groups ?? [];
  } catch (err) {
    message.value = {
      type: "error",
      text: err instanceof Error ? err.message : "Failed to import contacts.",
    };
  } finally {
    loadingContacts.value = false;
    loading.value = false;
    window.google?.accounts?.oauth2?.revoke(accessToken);
  }
}

async function handleGoogleLogin() {
  message.value = null;

  if (!selectedGroup.value) {
    message.value = { type: "error", text: "Please select a group first." };
    return;
  }

  if (!CLIENT_ID) {
    message.value = {
      type: "error",
      text: "Google login is not configured. Set VITE_GOOGLE_CLIENT_ID in the frontend .env file.",
    };
    return;
  }

  loading.value = true;

  try {
    await loadGisScript();
  } catch {
    message.value = {
      type: "error",
      text: "Could not load Google login. Check your connection.",
    };
    loading.value = false;
    return;
  }

  const client = window.google!.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    callback: (resp) => {
      void handleToken(resp);
    },
  });

  client.requestAccessToken();
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Google Contacts"
      description="Sign in with Google and import phone numbers into a group"
    />

    <div
      v-if="message"
      class="flex items-start gap-3 rounded-xl border p-4 text-sm"
      :class="
        message.type === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
          : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300'
      "
      role="alert"
    >
      <p class="flex-1 break-words">{{ message.text }}</p>
      <button
        type="button"
        class="shrink-0 rounded p-0.5 opacity-60 transition hover:opacity-100"
        aria-label="Dismiss"
        @click="dismissMessage"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <StatCard
        title="Total Groups"
        :value="totalGroups"
        accent="bg-blue-100 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
        :href="`${basePath}/groups`"
      >
        <template #icon>
          <span class="text-2xl" role="img" aria-hidden="true">📁</span>
        </template>
      </StatCard>
      <StatCard
        title="Total Contacts"
        :value="totalContacts.toLocaleString()"
        accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
        :href="`${basePath}/groups`"
      >
        <template #icon>
          <span class="text-2xl" role="img" aria-hidden="true">👥</span>
        </template>
      </StatCard>
    </div>

    <div class="flex justify-center">
      <div
        class="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div class="border-b border-zinc-100 px-6 py-5 dark:border-zinc-800">
          <p class="text-sm font-bold text-zinc-500">
            Select a group, then sign in with Google to import contacts
          </p>
        </div>

        <div class="space-y-6 p-6">
          <div>
            <label
              for="groupSelect"
              class="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              <span
                class="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white"
              >
                1
              </span>
              Select Group
            </label>
            <select
              id="groupSelect"
              v-model="selectedGroup"
              class="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="">Choose a group…</option>
              <option v-for="g in groups" :key="g.id" :value="g.id">
                {{ g.name }} ({{ g.contacts }} contacts)
              </option>
            </select>
            <p
              v-if="groups.length === 0"
              class="mt-1.5 text-xs text-amber-600 dark:text-amber-400"
            >
              No groups found — create a group first.
            </p>
          </div>

          <div>
            <p
              class="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              <span
                class="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white"
              >
                2
              </span>
              Sign in with Google
            </p>

            <button
              type="button"
              :disabled="!selectedGroup || loading || loadingContacts"
              class="mt-3 flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-white py-3 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              @click="handleGoogleLogin"
            >
              <svg v-if="loading || loadingContacts" class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <svg v-else class="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"
                />
              </svg>
              {{ loadingContacts ? "Importing contacts…" : "Continue with Google" }}
            </button>

            <p class="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
              Only the phone numbers from your Google contacts are imported into
              the selected group.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
