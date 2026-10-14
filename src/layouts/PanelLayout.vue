<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import LogoutButton from "@/components/LogoutButton.vue";
import SidebarNav from "@/components/SidebarNav.vue";
import { useAuth } from "@/composables/useAuth";

const props = defineProps<{ role: "admin" | "user" }>();

const { user } = useAuth();
const username = computed(() => user.value?.username ?? "");

const route = useRoute();
const sidebarOpen = ref(false);

watch(
  () => route.path,
  () => {
    sidebarOpen.value = false;
  }
);

function closeSidebar() {
  sidebarOpen.value = false;
}

const base = computed(() => (props.role === "admin" ? "/admin" : "/user"));
const panelLabel = computed(() =>
  props.role === "admin" ? "Admin Panel" : "User Panel"
);
const logoTo = computed(() => base.value);

type NavItem = {
  suffix: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
  userOnly?: boolean;
};

const NAV: NavItem[] = [
  {
    suffix: "",
    label: "Dashboard",
    icon: "M3 12l9-9 9 9M5 10v10a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V10",
  },
  {
    suffix: "/send",
    label: "Send SMS By Group",
    icon: "M12 19l9 2-9-18-9 18 9-2zm0 0v-8",
    userOnly: true,
  },
  {
    suffix: "/send-by-number",
    label: "Send SMS By Number",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    userOnly: true,
  },
  {
    suffix: "/groups",
    label: "Groups",
    icon: "M3 7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14l-1.5-1.5L6 21l-1.5-1.5L3 21V7zm10-2h8a2 2 0 0 1 2 2v14l-1.5-1.5L20 21l-1.5-1.5L17 21V7a2 2 0 0 1 2-2m-2 6h6m-6 4h6m-6 4h6",
    userOnly: true,
  },
  {
    suffix: "/contacts",
    label: "Contact Add (Bulk)",
    icon: "M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87m6-1.13a4 4 0 1 0-6 0m6 0A4 4 0 0 1 14 12m-6 0a4 4 0 0 1-2 3.5M15 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z",
    userOnly: true,
  },
  {
    suffix: "/contacts/add-single",
    label: "Add Single Contact",
    icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
    userOnly: true,
  },
  {
    suffix: "/google-contacts",
    label: "Google Contact",
    icon: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9m-9 9a9 9 0 019-9",
    userOnly: true,
  },
  {
    suffix: "/balance",
    label: "My Balance",
    icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
    userOnly: true,
  },
  {
    suffix: "/change-password",
    label: "Change Password",
    icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
    userOnly: true,
  },
  {
    suffix: "/users",
    label: "User Management",
    icon: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z",
    adminOnly: true,
  },
  {
    suffix: "/user-sms-balance",
    label: "User SMS Balance",
    icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
    adminOnly: true,
  },
  {
    suffix: "/sms-setting",
    label: "SMS Setting",
    icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2.83 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
    adminOnly: true,
  },
  {
    suffix: "/reports",
    label: "Send SMS History",
    icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-5l-5 5v-5z",
  },
];

const navItems = computed(() =>
  NAV.filter((item) => {
    if (item.adminOnly && props.role !== "admin") return false;
    if (item.userOnly && props.role !== "user") return false;
    return true;
  }).map((item) => ({
    to: base.value + item.suffix,
    label: item.label,
    icon: item.icon,
  }))
);
</script>

<template>
  <div class="flex min-h-screen bg-zinc-100 dark:bg-zinc-950">
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
      @click="closeSidebar"
    />

    <aside
      class="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-zinc-950 transition-transform duration-300 ease-in-out dark:bg-black lg:translate-x-0"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <RouterLink
        :to="logoTo"
        class="flex items-center gap-3 px-6 py-5 transition-colors hover:bg-zinc-900/50 dark:hover:bg-zinc-800/50"
      >
        <div
          class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white"
        >
          <svg
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-5l-5 5v-5z"
            />
          </svg>
        </div>
        <div>
          <p class="text-sm font-bold text-white">SMS Portal</p>
          <p v-if="username" class="text-xs text-zinc-300">{{ username }}</p>
          <p class="text-xs text-zinc-500">{{ panelLabel }}</p>
        </div>
      </RouterLink>

      <SidebarNav :items="navItems" />
    </aside>

    <div class="flex min-h-screen flex-1 flex-col min-w-0 lg:ml-64">
      <header
        class="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-zinc-200 bg-white/80 px-4 py-2 backdrop-blur sm:px-6 sm:py-2 lg:px-8 dark:border-zinc-800 dark:bg-zinc-900/80"
      >
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 lg:hidden"
            aria-label="Open navigation menu"
            @click="sidebarOpen = true"
          >
            <svg
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <img src="/logo.png" alt="Shuveccha group" class="h-18 w-auto rounded sm:h-20" />
        </div>
        <LogoutButton />
      </header>

      <main class="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
        <router-view />
      </main>
    </div>
  </div>
</template>
