<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { useAuth } from "@/composables/useAuth";
import type {
  AdminUser,
  DashboardData,
  MessageSummary,
  WalletBalance,
} from "@/types";

const { user } = useAuth();

const stats = ref<DashboardData["stats"]>([]);
const wallet = ref<WalletBalance | null>(null);
const summary = ref<MessageSummary | null>(null);
const users = ref<AdminUser[]>([]);
const providerBalance = ref<number | null>(null);
const loaded = ref(false);

async function fetchAdminData() {
  try {
    const [dashboardRes, messagesRes, usersRes, balanceRes] = await Promise.all([
      fetch("/api/dashboard"),
      fetch("/api/messages?pageSize=5"),
      fetch("/api/users"),
      fetch("/api/sms-settings/balance"),
    ]);

    const dashboardData: DashboardData = await dashboardRes.json();
    const messagesData = await messagesRes.json();
    const usersData: { users?: AdminUser[] } = await usersRes.json();
    const balanceData = await balanceRes.json().catch(() => null);

    stats.value = dashboardData.stats ?? [];
    wallet.value = dashboardData.balance ?? null;
    summary.value = messagesData.summary ?? null;
    users.value = usersData.users ?? [];
    providerBalance.value =
      balanceData?.success && typeof balanceData.balance === "number"
        ? balanceData.balance
        : null;
  } catch {
    stats.value = [];
    wallet.value = null;
    summary.value = null;
    users.value = [];
    providerBalance.value = null;
  } finally {
    loaded.value = true;
  }
}

onMounted(fetchAdminData);

const today = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const adminName = computed(() => user.value?.name ?? "Administrator");

const totalUsers = computed(() => users.value.length);
const adminCount = computed(
  () => users.value.filter((u) => u.role === "admin").length
);
const activeUsers = computed(() => users.value.filter((u) => u.active).length);

const totalMessages = computed(() => summary.value?.total ?? 0);

const balanceTaka = computed(() =>
  wallet.value ? Number(wallet.value.balanceTaka).toLocaleString() : "0"
);
const smsRemainingValue = computed(() =>
  wallet.value ? Number(wallet.value.smsRemaining).toLocaleString() : "0"
);

const providerBalanceValue = computed(() =>
  providerBalance.value === null
    ? "—"
    : providerBalance.value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
);

const deliveryBreakdown = computed(() => {
  const s = summary.value;
  const total = s?.total || 0;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  return [
    {
      label: "Delivered",
      value: s?.delivered ?? 0,
      percent: pct(s?.delivered ?? 0),
      bar: "bg-emerald-500",
      dot: "bg-emerald-500",
    },
    {
      label: "Pending",
      value: s?.pending ?? 0,
      percent: pct(s?.pending ?? 0),
      bar: "bg-amber-500",
      dot: "bg-amber-500",
    },
    {
      label: "Failed",
      value: s?.failed ?? 0,
      percent: pct(s?.failed ?? 0),
      bar: "bg-red-500",
      dot: "bg-red-500",
    },
  ];
});

const quickActions = [
  {
    to: "/admin/users",
    label: "User Management",
    description: "Manage portal accounts",
    icon: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z",
    accent:
      "bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400",
  },
  {
    to: "/admin/reports",
    label: "Send SMS History",
    description: "Review delivery logs",
    icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-5l-5 5v-5z",
    accent:
      "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
  },
];

</script>

<template>
  <div class="space-y-6">
    <div
      class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-800 p-6 text-white shadow-xl sm:p-8"
    >
      <div
        class="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl"
      />
      <div
        class="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-white/10 blur-2xl"
      />
      <div class="relative flex flex-wrap items-start justify-between gap-4">
        <div class="flex items-start gap-4">
          <div
            class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur"
          >
            <svg
              class="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9.5 12l1.75 1.75L15 10"
              />
            </svg>
          </div>
          <div>
            <span
              class="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide"
            >
              Administrator
            </span>
            <h1 class="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Admin Control Center
            </h1>
            <p class="mt-1 text-sm text-indigo-100">
              Logged in as {{ adminName }} · {{ today }}
            </p>
          </div>
        </div>
        <RouterLink
          to="/admin/users"
          class="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z"
            />
          </svg>
          Manage Users
        </RouterLink>
      </div>
    </div>

    <div v-if="!loaded" class="py-12 text-center text-zinc-400">
      Loading admin dashboard…
    </div>

    <template v-else>
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <div
          class="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Total Users
            </p>
            <span
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
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
                  d="M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87M15 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zm6 1a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM9 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"
                />
              </svg>
            </span>
          </div>
          <p
            class="mt-3 text-3xl font-bold text-zinc-900 tabular-nums dark:text-white"
          >
            {{ totalUsers }}
          </p>
          <p class="mt-1 text-xs text-zinc-400">
            {{ adminCount }} admin · {{ activeUsers }} active
          </p>
        </div>

        <div
          class="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Main Balance (Taka)
            </p>
            <span
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400"
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
                  d="M3 10h18M7 15h1m4 0h1m4 0h.01M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"
                />
              </svg>
            </span>
          </div>
          <p
            class="mt-3 text-3xl font-bold text-zinc-900 tabular-nums dark:text-white"
          >
            {{ balanceTaka }}
          </p>
          <p class="mt-1 text-xs text-zinc-400">Main wallet available balance</p>
        </div>

        <div
          class="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              SMS Remaining
            </p>
            <span
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
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
                  d="M7 8h10M7 12h6m-2 8H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6m-5 9v-6h6v6a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z"
                />
              </svg>
            </span>
          </div>
          <p
            class="mt-3 text-3xl font-bold text-zinc-900 tabular-nums dark:text-white"
          >
            {{ smsRemainingValue }}
          </p>
          <p class="mt-1 text-xs text-zinc-400">Credits left in wallet</p>
        </div>

        <div
          class="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Provider Balance (Taka)
            </p>
            <span
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400"
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
                  d="M3 10h18M7 15h1m4 0h1m4 0h.01M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"
                />
              </svg>
            </span>
          </div>
          <p
            class="mt-3 text-3xl font-bold text-zinc-900 tabular-nums dark:text-white"
          >
            {{ providerBalanceValue }}
          </p>
          <p class="mt-1 text-xs text-zinc-400">
            <RouterLink
              to="/admin/sms-setting"
              class="hover:text-indigo-600 hover:underline dark:hover:text-indigo-400"
            >
              Live SMS gateway balance
            </RouterLink>
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Delivery Overview</CardTitle>
          </CardHeader>
          <CardContent class="space-y-5">
            <div v-for="item in deliveryBreakdown" :key="item.label">
              <div class="mb-2 flex items-center justify-between text-sm">
                <span class="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                  <span class="h-2 w-2 rounded-full" :class="item.dot" />
                  {{ item.label }}
                </span>
                <span class="font-semibold text-zinc-900 tabular-nums dark:text-white">
                  {{ item.value }}
                </span>
              </div>
              <div class="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  class="h-full rounded-full transition-all"
                  :class="item.bar"
                  :style="{ width: `${item.percent}%` }"
                />
              </div>
            </div>
            <div
              class="rounded-xl bg-zinc-50 p-4 text-sm dark:bg-zinc-800/50"
            >
              <p class="font-medium text-zinc-700 dark:text-zinc-200">
                Delivery rate
              </p>
              <p class="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
                {{
                  totalMessages > 0
                    ? Math.round(
                        ((summary?.delivered ?? 0) / totalMessages) * 100
                      )
                    : 0
                }}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <RouterLink
          v-for="action in quickActions"
          :key="action.to"
          :to="action.to"
          class="group flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-5 transition-all hover:border-indigo-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        >
          <span
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            :class="action.accent"
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
                :d="action.icon"
              />
            </svg>
          </span>
          <div class="min-w-0">
            <p class="font-semibold text-zinc-900 dark:text-white">
              {{ action.label }}
            </p>
            <p class="truncate text-sm text-zinc-500">{{ action.description }}</p>
          </div>
        </RouterLink>
      </div>

    </template>
  </div>
</template>
