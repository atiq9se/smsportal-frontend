<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import type { MessageSummary, MessagesResponse } from "@/types";

type Message = MessagesResponse["messages"][number];

const statusStyles: Record<string, string> = {
  Delivered:
    "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
  Pending: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  Failed: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
};

const SMS_COST_TAKA = 0.35;

function costOf(status: string): number {
  return status === "Delivered" ? SMS_COST_TAKA : 0;
}

function taka(value: number): string {
  return `৳${value.toFixed(2)}`;
}

const typeStyles: Record<string, string> = {
  OTP: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  Promotional:
    "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
  Transactional:
    "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  Alert: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
};

const summaryCards = [
  {
    key: "total",
    label: "Total Sent",
    accent:
      "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  },
  {
    key: "delivered",
    label: "Delivered",
    accent:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
  },
  {
    key: "pending",
    label: "Pending",
    accent:
      "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  },
  {
    key: "failed",
    label: "Failed",
    accent: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
  },
] as const;

interface DailyStats {
  date: string;
  total: number;
  delivered: number;
  pending: number;
  failed: number;
  cost: number;
}

const messages = ref<Message[]>([]);
const summary = ref<MessageSummary | null>(null);
const dailyStats = ref<DailyStats[]>([]);
const loading = ref(true);
const q = ref("");
const status = ref("");
const type = ref("");
const dateFrom = ref("");
const dateTo = ref("");
const page = ref(1);
const pageSize = ref(20);
const totalPages = ref(1);

let controller: AbortController | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

async function load() {
  const local = new AbortController();
  controller = local;
  loading.value = true;
  try {
    const params = new URLSearchParams();
    if (q.value) params.set("q", q.value);
    if (status.value) params.set("status", status.value);
    if (type.value) params.set("type", type.value);
    if (dateFrom.value) params.set("dateFrom", dateFrom.value);
    if (dateTo.value) params.set("dateTo", dateTo.value);
    params.set("page", String(page.value));
    params.set("pageSize", String(pageSize.value));

    const res = await fetch(`/api/messages?${params.toString()}`, {
      signal: local.signal,
    });
    const data: MessagesResponse = await res.json();

    messages.value = data.messages ?? [];
    summary.value = data.summary ?? null;
    totalPages.value = data.totalPages ?? 1;

    const statsMap = new Map<string, DailyStats>();
    for (const m of data.messages ?? []) {
      const existing = statsMap.get(m.date) ?? {
        date: m.date,
        total: 0,
        delivered: 0,
        pending: 0,
        failed: 0,
        cost: 0,
      };
      existing.total++;
      existing.cost += costOf(m.status);
      if (m.status === "Delivered") existing.delivered++;
      else if (m.status === "Pending") existing.pending++;
      else if (m.status === "Failed") existing.failed++;
      statsMap.set(m.date, existing);
    }
    dailyStats.value = Array.from(statsMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  } catch {
    if (!local.signal.aborted) {
      messages.value = [];
      summary.value = null;
      dailyStats.value = [];
    }
  } finally {
    if (!local.signal.aborted) loading.value = false;
  }
}

function scheduleLoad() {
  if (timer) clearTimeout(timer);
  controller?.abort();
  timer = setTimeout(load, 200);
}

watch([q, status, type, dateFrom, dateTo], () => {
  page.value = 1;
  scheduleLoad();
}, { immediate: true });

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
  controller?.abort();
});

const deliveryRate = computed(() =>
  summary.value && summary.value.total > 0
    ? Math.round((summary.value.delivered / summary.value.total) * 100)
    : 0
);

const totalCost = computed(() =>
  messages.value.reduce((sum, m) => sum + costOf(m.status), 0)
);

function clearFilters() {
  q.value = "";
  status.value = "";
  type.value = "";
  dateFrom.value = "";
  dateTo.value = "";
}

function csvEscape(value: unknown): string {
  const s = String(value ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportCsv() {
  if (messages.value.length === 0) return;

  const headers = [
    "ID",
    "Phone Number",
    "Message",
    "Type",
    "Status",
    "Cost (Taka)",
    "Date & Time",
  ];
  const rows = messages.value.map((m) =>
    [m.id, m.to, m.content, m.type, m.status, costOf(m.status).toFixed(2), `${m.date} ${m.time}`]
      .map(csvEscape)
      .join(",")
  );
  const csv = "\uFEFF" + [headers.map(csvEscape).join(","), ...rows].join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `reports_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">Reports</h1>
        <p class="mt-1 text-sm text-zinc-500">SMS delivery reports and analytics</p>
      </div>
      <button
        class="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        :disabled="messages.length === 0"
        @click="exportCsv"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        Export CSV
      </button>
    </div>

    <div class="grid grid-cols-2 gap-5 lg:grid-cols-6">
      <div
        v-for="card in summaryCards"
        :key="card.key"
        class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <span
          class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
          :class="card.accent"
        >
          {{ card.label }}
        </span>
        <p class="mt-3 text-2xl font-bold text-zinc-900 dark:text-white">
          {{ summary ? summary[card.key] : "—" }}
        </p>
      </div>
      <div
        class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <span
          class="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-600 dark:bg-violet-950 dark:text-violet-400"
        >
          Delivery Rate
        </span>
        <p class="mt-3 text-2xl font-bold text-zinc-900 dark:text-white">
          {{ deliveryRate }}%
        </p>
      </div>
      <div
        class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <span
          class="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-950 dark:text-blue-400"
        >
          Total Cost
        </span>
        <p class="mt-3 text-2xl font-bold text-zinc-900 dark:text-white">
          {{ taka(totalCost) }}
        </p>
      </div>
    </div>

    <div
      class="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div
        class="flex flex-wrap items-center gap-3 border-b border-zinc-100 px-6 py-4 dark:border-zinc-800"
      >
        <div class="relative w-full max-w-xs">
          <span
            class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400"
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
                d="M21 21l-4.35-4.35M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0z"
              />
            </svg>
          </span>
          <input
            v-model="q"
            type="search"
            placeholder="Search by ID, number or message..."
            class="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        <select
          v-model="status"
          class="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 outline-none transition focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        >
          <option value="">All Status</option>
          <option>Delivered</option>
          <option>Pending</option>
          <option>Failed</option>
        </select>

        <select
          v-model="type"
          class="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 outline-none transition focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        >
          <option value="">All Types</option>
          <option>OTP</option>
          <option>Promotional</option>
          <option>Transactional</option>
          <option>Alert</option>
        </select>

        <div class="flex items-center gap-1">
          <input
            v-model="dateFrom"
            type="date"
            aria-label="From date"
            class="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 outline-none transition focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          />
          <span class="px-1 text-zinc-400">to</span>
          <input
            v-model="dateTo"
            type="date"
            aria-label="To date"
            class="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 outline-none transition focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          />
        </div>

        <button
          class="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          @click="clearFilters"
        >
          Clear
        </button>
      </div>

      <div
        v-if="dailyStats.length > 0"
        class="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800"
      >
        <h3 class="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">
          Daily Summary
        </h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr
                class="border-b border-zinc-100 text-xs uppercase tracking-wider text-zinc-400 dark:border-zinc-800"
              >
                <th class="px-4 py-2 font-medium">Date</th>
                <th class="px-4 py-2 text-right font-medium">Total</th>
                <th class="px-4 py-2 text-right font-medium">Delivered</th>
                <th class="px-4 py-2 text-right font-medium">Pending</th>
                <th class="px-4 py-2 text-right font-medium">Failed</th>
                <th class="px-4 py-2 text-right font-medium">Rate</th>
                <th class="px-4 py-2 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
              <tr
                v-for="d in dailyStats"
                :key="d.date"
                class="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <td class="px-4 py-2 font-mono text-xs text-zinc-500">
                  {{ d.date }}
                </td>
                <td class="px-4 py-2 text-right text-zinc-900 dark:text-white">
                  {{ d.total }}
                </td>
                <td class="px-4 py-2 text-right text-emerald-600">
                  {{ d.delivered }}
                </td>
                <td class="px-4 py-2 text-right text-amber-600">
                  {{ d.pending }}
                </td>
                <td class="px-4 py-2 text-right text-red-600">{{ d.failed }}</td>
                <td class="px-4 py-2 text-right font-medium">
                  {{
                    d.total > 0
                      ? `${Math.round((d.delivered / d.total) * 100)}%`
                      : "—"
                  }}
                </td>
                <td class="px-4 py-2 text-right font-medium text-zinc-900 dark:text-white">
                  {{ taka(d.cost) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr
              class="border-b border-zinc-100 text-xs uppercase tracking-wider text-zinc-400 dark:border-zinc-800"
            >
              <th class="px-6 py-3 font-medium">ID</th>
              <th class="px-6 py-3 font-medium">Phone Number</th>
              <th class="px-6 py-3 font-medium">Message</th>
              <th class="px-6 py-3 font-medium">Type</th>
              <th class="px-6 py-3 font-medium">Status</th>
              <th class="px-6 py-3 font-medium">Cost</th>
              <th class="px-6 py-3 font-medium">Date &amp; Time</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
            <tr v-if="loading">
              <td colspan="7" class="px-6 py-12 text-center text-sm text-zinc-400">
                Loading messages...
              </td>
            </tr>
            <tr v-else-if="messages.length === 0">
              <td colspan="7" class="px-6 py-12 text-center text-sm text-zinc-400">
                No messages found for the selected filters.
              </td>
            </tr>
            <template v-else>
              <tr
                v-for="m in messages"
                :key="m.id"
                class="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
              <td class="px-6 py-3.5 font-mono text-xs text-zinc-500">{{ m.id }}</td>
              <td class="px-6 py-3.5">
                <p class="font-mono font-medium text-zinc-900 dark:text-white">
                  {{ m.to }}
                </p>
              </td>
              <td class="max-w-md truncate px-6 py-3.5 text-zinc-500">
                {{ m.content }}
              </td>
              <td class="px-6 py-3.5">
                <span
                  class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                  :class="typeStyles[m.type]"
                >
                  {{ m.type }}
                </span>
              </td>
              <td class="px-6 py-3.5">
                <span
                  class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                  :class="statusStyles[m.status]"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-current" />
                  {{ m.status }}
                </span>
              </td>
              <td
                class="whitespace-nowrap px-6 py-3.5 font-medium"
                :class="
                  costOf(m.status) > 0
                    ? 'text-zinc-900 dark:text-white'
                    : 'text-zinc-400'
                "
              >
                {{ taka(costOf(m.status)) }}
              </td>
              <td class="whitespace-nowrap px-6 py-3.5 text-zinc-500">
                {{ m.date }} {{ m.time }}
              </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div
        class="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-6 py-4 dark:border-zinc-800"
      >
        <p class="text-sm text-zinc-500">
          Showing
          <span class="font-medium text-zinc-700 dark:text-zinc-300">
            {{ loading ? "—" : messages.length }}
          </span>
          of
          <span class="font-medium text-zinc-700 dark:text-zinc-300">
            {{ summary ? summary.total : "—" }}
          </span>
          messages
        </p>
        <div class="flex items-center gap-2">
          <button
            @click="page > 1 && (page--, scheduleLoad())"
            :disabled="page <= 1 || loading"
            class="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Previous
          </button>
          <span class="px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Page {{ page }} of {{ totalPages }}
          </span>
          <button
            @click="page < totalPages && (page++, scheduleLoad())"
            :disabled="page >= totalPages || loading"
            class="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
