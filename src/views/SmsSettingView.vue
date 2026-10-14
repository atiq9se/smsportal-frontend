<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
} from "@/components/ui";

const form = ref({
  apiUrl: "",
  sendUrl: "",
  username: "",
  password: "",
  senderId: "",
});

const loading = ref(true);
const saving = ref(false);
const error = ref("");
const saved = ref(false);

const balance = ref<number | null>(null);
const balanceLoading = ref(false);
const balanceError = ref("");
const configured = ref(false);

const mainWallet = ref<{
  balanceTaka: number;
  smsRemaining: number;
  providerBalance?: number | null;
  allocatedTaka?: number;
} | null>(null);

const formattedMainBalance = computed(() =>
  mainWallet.value
    ? `৳${mainWallet.value.balanceTaka.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : "—"
);

const mainSmsRemaining = computed(() =>
  mainWallet.value ? mainWallet.value.smsRemaining.toLocaleString() : "—"
);

const mainProviderBalance = computed(() =>
  mainWallet.value && typeof mainWallet.value.providerBalance === "number"
    ? `৳${mainWallet.value.providerBalance.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : "—"
);

const mainAllocated = computed(() =>
  mainWallet.value && typeof mainWallet.value.allocatedTaka === "number"
    ? `৳${mainWallet.value.allocatedTaka.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : "—"
);

const formattedBalance = computed(() =>
  balance.value === null
    ? "—"
    : `৳${balance.value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
);

async function loadSettings() {
  try {
    const res = await fetch("/api/sms-settings");
    const data = await res.json();
    const settings = data?.settings;

    if (settings) {
      form.value = {
        apiUrl: settings.apiUrl ?? "",
        sendUrl: settings.sendUrl ?? "",
        username: settings.username ?? "",
        password: settings.password ?? "",
        senderId: settings.senderId ?? "",
      };
      configured.value = Boolean(settings.configured);
    }

    if (data?.wallet) {
      mainWallet.value = {
        balanceTaka: Number(data.wallet.balanceTaka) || 0,
        smsRemaining: Number(data.wallet.smsRemaining) || 0,
        providerBalance:
          typeof data.wallet.providerBalance === "number"
            ? data.wallet.providerBalance
            : null,
        allocatedTaka: Number(data.wallet.allocatedTaka) || 0,
      };
    }
  } catch {
    /* keep the empty defaults */
  } finally {
    loading.value = false;
  }
}

async function fetchBalance() {
  balanceLoading.value = true;
  balanceError.value = "";

  try {
    const res = await fetch("/api/sms-settings/balance");
    const data = await res.json();

    if (data?.success && typeof data.balance === "number") {
      balance.value = data.balance;
      configured.value = true;
    } else {
      balance.value = null;
      balanceError.value = data?.message ?? "Balance unavailable.";
      if (data?.configured === false) configured.value = false;
    }
  } catch {
    balance.value = null;
    balanceError.value = "Network error. Please try again.";
  } finally {
    balanceLoading.value = false;
  }
}

async function saveSettings() {
  error.value = "";
  saved.value = false;

  if (
    (!form.value.apiUrl.trim() && !form.value.sendUrl.trim()) ||
    !form.value.username.trim() ||
    !form.value.password
  ) {
    error.value =
      "A balance or send API link, plus username and password, are required.";
    return;
  }

  saving.value = true;

  try {
    const res = await fetch("/api/sms-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form.value),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      error.value = data?.message ?? "Failed to save settings.";
      return;
    }

    saved.value = true;
    configured.value = true;
    if (data.wallet) {
      mainWallet.value = {
        balanceTaka: Number(data.wallet.balanceTaka) || 0,
        smsRemaining: Number(data.wallet.smsRemaining) || 0,
        providerBalance:
          typeof data.wallet.providerBalance === "number"
            ? data.wallet.providerBalance
            : null,
        allocatedTaka: Number(data.wallet.allocatedTaka) || 0,
      };
    }
    await fetchBalance();
  } catch {
    error.value = "Network error. Please try again.";
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await loadSettings();
  await fetchBalance();
});
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="SMS Setting"
      description="Connect the portal to your SMS provider and monitor the account balance"
    />

    <div class="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <Card class="lg:col-span-2">
        <CardHeader>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Gateway API</CardTitle>
              <CardDescription>
                Provider credentials used to send SMS and to read the account balance
              </CardDescription>
            </div>
            <Badge :variant="configured ? 'success' : 'default'" dot>
              {{ configured ? "Connected" : "Not configured" }}
            </Badge>
          </div>
        </CardHeader>
        <CardContent class="space-y-4">
          <div v-if="loading" class="py-6 text-sm text-zinc-400">Loading settings…</div>

          <form v-else class="space-y-4" @submit.prevent="saveSettings">
            <div v-if="error" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {{ error }}
            </div>

            <div v-if="saved" class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
              Settings saved successfully.
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">API Link</label>
              <input
                v-model="form.apiUrl"
                type="url"
                autocomplete="off"
                placeholder="https://aamarsms.com/balance"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <p class="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                The balance endpoint of your provider. Username and password are appended automatically.
              </p>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Send API Link</label>
              <input
                v-model="form.sendUrl"
                type="url"
                autocomplete="off"
                placeholder="https://aamarsms.com/api"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <p class="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                The endpoint SMS are sent to. Leave blank to use the API link with “balance” swapped for “api”.
              </p>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Username</label>
              <input
                v-model="form.username"
                autocomplete="username"
                placeholder="dfl@aamarsms.com"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Password</label>
              <input
                v-model="form.password"
                type="password"
                autocomplete="current-password"
                placeholder="Account password"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Sender ID</label>
              <input
                v-model="form.senderId"
                autocomplete="off"
                placeholder="SMSPortal"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <p class="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                The approved sender name/number shown on the recipient's phone.
              </p>
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <button type="button" @click="fetchBalance" class="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                Refresh Balance
              </button>
              <button type="submit" :disabled="saving" class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
                <svg v-if="saving" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="8" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4z" />
                </svg>
                {{ saving ? "Saving..." : "Save Settings" }}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div class="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Main Balance</CardTitle>
            <CardDescription>Live provider balance minus credits already assigned to users</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center dark:border-zinc-800 dark:bg-zinc-800/50">
              <p class="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Available to Assign</p>
              <p class="mt-2 text-3xl font-bold tabular-nums text-zinc-900 dark:text-white">{{ formattedMainBalance }}</p>
              <p class="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{{ mainSmsRemaining }} SMS credits remaining</p>
            </div>

            <dl class="mt-4 space-y-2 text-sm">
              <div class="flex items-center justify-between">
                <dt class="text-zinc-500 dark:text-zinc-400">Provider balance</dt>
                <dd class="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">{{ mainProviderBalance }}</dd>
              </div>
              <div class="flex items-center justify-between">
                <dt class="text-zinc-500 dark:text-zinc-400">Assigned to users</dt>
                <dd class="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">{{ mainAllocated }}</dd>
              </div>
            </dl>

            <p class="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
              Assigning SMS is capped at this amount. The provider deducts real credit only when SMS are actually sent.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Provider Balance</CardTitle>
            <CardDescription>Live credit balance of the connected account</CardDescription>
          </CardHeader>
          <CardContent>
            <div v-if="balanceLoading" class="py-10 text-center text-zinc-400">Checking balance…</div>

            <div v-else-if="balanceError" class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
              {{ balanceError }}
            </div>

            <div v-else class="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center dark:border-zinc-800 dark:bg-zinc-800/50">
              <p class="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Available Balance</p>
              <p class="mt-2 text-3xl font-bold tabular-nums text-zinc-900 dark:text-white">{{ formattedBalance }}</p>
              <p v-if="form.username" class="mt-2 truncate text-xs text-zinc-500 dark:text-zinc-400">{{ form.username }}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
