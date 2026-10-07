<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  statusBadgeStyles,
} from "@/components/ui";
import { useAuth } from "@/composables/useAuth";
import type { DashboardData, WalletBalance } from "@/types";

const { user } = useAuth();

const stats = ref<DashboardData["stats"]>([]);
const recentMessages = ref<DashboardData["recentMessages"]>([]);
const wallet = ref<WalletBalance | null>(null);
const loaded = ref(false);

onMounted(async () => {
  try {
    const res = await fetch("/api/dashboard");
    const data: DashboardData = await res.json();
    stats.value = data.stats ?? [];
    recentMessages.value = data.recentMessages ?? [];
    wallet.value = data.balance ?? null;
  } catch {
    stats.value = [];
    recentMessages.value = [];
    wallet.value = null;
  } finally {
    loaded.value = true;
  }
});

const statConfigs = [
  {
    key: "totalSent",
    label: "Total Sent",
    icon: "📊",
    accent:
      "bg-blue-100 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
  },
  {
    key: "delivered",
    label: "Delivered",
    icon: "✅",
    accent:
      "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
  },
  {
    key: "pending",
    label: "Pending",
    icon: "⏳",
    accent:
      "bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
  },
  {
    key: "failed",
    label: "Failed",
    icon: "❌",
    accent: "bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400",
  },
] as const;

const today = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const firstName = computed(() => user.value?.name.split(" ")[0] ?? "there");

const statValues = computed(() => {
  const found = (label: string) =>
    stats.value.find((s) => s.label === label)?.value || "0";
  return {
    totalSent: found("Total Sent"),
    delivered: found("Delivered"),
    pending: found("Pending"),
    failed: found("Failed"),
  };
});

const smsBalance = computed(() =>
  stats.value.find((s) => s.label === "Remaining SMS Balance")
);
const smsTotal = computed(
  () =>
    smsBalance.value?.trend?.match(/of ([\d,]+) total/)?.[1]?.replace(",", "") ||
    "20000"
);
const smsRemaining = computed(() => smsBalance.value?.value || "0");

const balanceTaka = computed(() =>
  wallet.value
    ? Number(wallet.value.balanceTaka).toLocaleString()
    : Number(smsTotal.value).toLocaleString()
);

const smsRemainingValue = computed(() =>
  wallet.value
    ? Number(wallet.value.smsRemaining).toLocaleString()
    : Number(smsRemaining.value).toLocaleString()
);
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="`Welcome back, ${firstName}`" :description="today">
      <template #action>
        <RouterLink
          to="/dashboard/send"
          class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
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
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
          Send New SMS
        </RouterLink>
      </template>
    </PageHeader>

    <div v-if="!loaded" class="py-12 text-center text-zinc-400">
      Loading dashboard…
    </div>

    <template v-else>
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <StatCard
          title="Balance Taka"
          :value="balanceTaka"
          accent="bg-purple-100 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400"
          href="/dashboard/reports"
        >
          <template #icon>
            <span class="text-2xl" role="img" aria-hidden="true">💳</span>
          </template>
        </StatCard>
        <StatCard
          title="SMS Remaining"
          :value="smsRemainingValue"
          accent="bg-indigo-100 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400"
          href="/dashboard/reports"
        >
          <template #icon>
            <span class="text-2xl" role="img" aria-hidden="true">📱</span>
          </template>
        </StatCard>
      </div>

      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          v-for="config in statConfigs"
          :key="config.key"
          :title="config.label"
          :value="statValues[config.key]"
          :accent="config.accent"
          href="/dashboard/reports"
        >
          <template #icon>
            <span class="text-2xl" role="img" aria-hidden="true">{{
              config.icon
            }}</span>
          </template>
        </StatCard>
      </div>

      <Card>
        <CardHeader>
          <div class="flex items-center justify-between">
            <div>
              <CardTitle>Recent Sent Messages</CardTitle>
              <CardDescription>
                Latest messages sent through the portal
              </CardDescription>
            </div>
            <RouterLink
              to="/dashboard/reports"
              class="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              View all
            </RouterLink>
          </div>
        </CardHeader>
        <CardContent>
          <div v-if="recentMessages.length === 0" class="py-12 text-center">
            <span class="text-4xl" role="img" aria-hidden="true">📭</span>
            <p class="mt-3 text-zinc-500 dark:text-zinc-400">
              No messages sent yet
            </p>
            <RouterLink
              to="/dashboard/send"
              class="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Send your first SMS
            </RouterLink>
          </div>
          <Table v-else>
            <TableHeader>
              <TableRow>
                <TableHead class="w-[80px]">ID</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Message</TableHead>
                <TableHead class="w-[140px]">Status</TableHead>
                <TableHead class="w-[160px]">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="m in recentMessages" :key="m.id">
                <TableCell class="font-mono text-xs text-zinc-500">
                  {{ m.id }}
                </TableCell>
                <TableCell class="font-medium text-zinc-900 dark:text-white">
                  {{ m.to }}
                </TableCell>
                <TableCell class="max-w-md truncate text-zinc-500">
                  {{ m.content }}
                </TableCell>
                <TableCell>
                  <Badge :variant="statusBadgeStyles[m.status] || 'default'" dot>
                    {{ m.status }}
                  </Badge>
                </TableCell>
                <TableCell class="whitespace-nowrap text-zinc-400">
                  {{ m.time }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
