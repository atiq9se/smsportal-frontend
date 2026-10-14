<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import {
  Badge,
  Card,
  CardContent,
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
import type { Message, MessageSummary, WalletBalance } from "@/types";

const { user } = useAuth();

const wallet = ref<WalletBalance | null>(null);
const messages = ref<Message[]>([]);
const summary = ref<MessageSummary | null>(null);
const loaded = ref(false);

const uid = computed(() => (user.value?.id ? String(user.value.id) : ""));

async function load() {
  try {
    const requests: Promise<Response>[] = [
      fetch(`/api/messages?pageSize=10&userId=${uid.value}`),
    ];
    requests.push(fetch("/api/wallet"));
    if (uid.value) requests.push(fetch(`/api/users/${uid.value}`));

    const [messagesRes, walletRes, userRes] = await Promise.all(requests);

    const messagesData = await messagesRes.json();
    const walletData = await walletRes.json();
    const userData = userRes ? await userRes.json() : null;

    messages.value = messagesData.messages ?? [];
    summary.value = messagesData.summary ?? null;

    if (walletData && typeof walletData.balanceTaka === "number") {
      wallet.value = {
        balanceTaka: Number(walletData.balanceTaka) || 0,
        smsRemaining: Number(walletData.smsRemaining) || 0,
        smsCostTaka: Number(walletData.smsCostTaka) || 0.35,
      };
    } else if (userData?.success && userData.user) {
      wallet.value = {
        balanceTaka: Number(userData.user.balanceTaka) || 0,
        smsRemaining: Number(userData.user.smsBalance) || 0,
        smsCostTaka: 0.35,
      };
    }
  } catch {
    wallet.value = null;
    messages.value = [];
    summary.value = null;
  } finally {
    loaded.value = true;
  }
}

onMounted(load);

const balanceTaka = computed(() =>
  wallet.value ? Number(wallet.value.balanceTaka).toLocaleString() : "0"
);
const smsRemaining = computed(() =>
  wallet.value ? Number(wallet.value.smsRemaining).toLocaleString() : "0"
);
const smsCost = computed(() =>
  wallet.value ? wallet.value.smsCostTaka ?? 0.35 : 0.35
);
const totalSent = computed(() => String(summary.value?.total ?? 0));
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="My Balance" :description="`Account: ${user?.username ?? ''}`">
      <template #action>
        <RouterLink
          to="/user/send"
          class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          Send New SMS
        </RouterLink>
      </template>
    </PageHeader>

    <div v-if="!loaded" class="py-12 text-center text-zinc-400">
      Loading balance…
    </div>

    <template v-else>
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Balance Taka"
          :value="balanceTaka"
          accent="bg-purple-100 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400"
          href="/user/reports"
        >
          <template #icon>
            <span class="text-2xl" role="img" aria-hidden="true">💳</span>
          </template>
        </StatCard>
        <StatCard
          title="SMS Remaining"
          :value="smsRemaining"
          accent="bg-indigo-100 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400"
          href="/user/reports"
        >
          <template #icon>
            <span class="text-2xl" role="img" aria-hidden="true">📱</span>
          </template>
        </StatCard>
        <StatCard
          title="Total Sent"
          :value="totalSent"
          accent="bg-blue-100 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
          href="/user/reports"
        >
          <template #icon>
            <span class="text-2xl" role="img" aria-hidden="true">📊</span>
          </template>
        </StatCard>
        <StatCard
          title="SMS Rate (৳)"
          :value="String(smsCost)"
          accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
          href="/user/reports"
        >
          <template #icon>
            <span class="text-2xl" role="img" aria-hidden="true">🏷️</span>
          </template>
        </StatCard>
      </div>

      <Card>
        <CardHeader>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Recent Usage</CardTitle>
            <RouterLink
              to="/user/reports"
              class="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              View all
            </RouterLink>
          </div>
        </CardHeader>
        <CardContent>
          <div v-if="messages.length === 0" class="py-12 text-center">
            <span class="text-4xl" role="img" aria-hidden="true">📭</span>
            <p class="mt-3 text-zinc-500 dark:text-zinc-400">
              No messages sent yet
            </p>
          </div>
          <Table v-else>
            <TableHeader>
              <TableRow>
                <TableHead class="w-[90px]">ID</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Message</TableHead>
                <TableHead class="w-[140px]">Status</TableHead>
                <TableHead class="w-[160px]">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="m in messages" :key="m.id">
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
