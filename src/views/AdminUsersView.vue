<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import type { AdminUser } from "@/types";

const users = ref<AdminUser[]>([]);
const loaded = ref(false);

const modalOpen = ref(false);
const submitting = ref(false);
const error = ref("");
const form = ref({
  username: "",
  password: "",
  name: "",
  role: "user" as "admin" | "user",
  active: true,
});

const assignModalOpen = ref(false);
const assignUserId = ref<number | null>(null);
const assignUserLabel = ref("");
const assignSubmitting = ref(false);
const assignError = ref("");
const assignForm = ref({
  amount: 0,
  costPerSms: 0.35,
  smsCount: 0,
});

async function fetchUsers() {
  try {
    const res = await fetch("/api/users");
    const data: { users?: AdminUser[] } = await res.json();
    users.value = data.users ?? [];
  } catch {
    users.value = [];
  } finally {
    loaded.value = true;
  }
}

onMounted(fetchUsers);

async function handleCreateUser() {
  error.value = "";
  submitting.value = true;

  try {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form.value),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      error.value = data.message ?? "Failed to create user.";
      return;
    }

    modalOpen.value = false;
    form.value = { username: "", password: "", name: "", role: "user", active: true };
    await fetchUsers();
  } catch {
    error.value = "Network error. Please try again.";
  } finally {
    submitting.value = false;
  }
}

function openModal() {
  error.value = "";
  form.value = { username: "", password: "", name: "", role: "user", active: true };
  modalOpen.value = true;
}

function closeModal() {
  modalOpen.value = false;
}

const calculatedSmsCount = computed(() => {
  if (assignForm.value.amount > 0 && assignForm.value.costPerSms > 0) {
    return Math.floor(assignForm.value.amount / assignForm.value.costPerSms);
  }
  return assignForm.value.smsCount;
});

function openAssignModal(user: AdminUser) {
  assignUserId.value = user.id;
  assignUserLabel.value = `${user.username} (${user.name})`;
  assignError.value = "";
  assignForm.value = {
    amount: 0,
    costPerSms: user.smsCost && user.smsCost > 0 ? user.smsCost : 0.35,
    smsCount: 0,
  };
  assignModalOpen.value = true;
}

function closeAssignModal() {
  assignModalOpen.value = false;
  assignUserId.value = null;
  assignUserLabel.value = "";
  assignForm.value = { amount: 0, costPerSms: 0.35, smsCount: 0 };
}

async function assignSms() {
  const userId = assignUserId.value;
  if (!userId) return;
  const smsCount = calculatedSmsCount.value;
  if (!Number.isInteger(smsCount) || smsCount <= 0) {
    assignError.value = "Invalid SMS count. Check amount and cost per SMS.";
    return;
  }

  assignError.value = "";
  assignSubmitting.value = true;

  try {
    const res = await fetch(`/api/users/${userId}/sms-assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        count: smsCount,
        amount: assignForm.value.amount,
        costPerSms: assignForm.value.costPerSms,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      assignError.value = data.message ?? "Failed to assign SMS.";
      return;
    }

    assignModalOpen.value = false;
    assignUserId.value = null;
    assignUserLabel.value = "";
    assignForm.value = { amount: 0, costPerSms: 0.35, smsCount: 0 };
    await fetchUsers();
  } catch {
    assignError.value = "Network error. Please try again.";
  } finally {
    assignSubmitting.value = false;
  }
}

const total = computed(() => users.value.length);
const admins = computed(() => users.value.filter((u) => u.role === "admin").length);
const active = computed(() => users.value.filter((u) => u.active).length);
const tableUsers = computed(() => users.value.filter((u) => u.role !== "admin"));

const roleBadge: Record<string, "info" | "success" | "default"> = {
  admin: "info",
  user: "default",
};
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="User Management"
      description="All accounts registered in the portal"
      :action="true"
    >
      <template #action>
        <button
          @click="openModal"
          class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add User
        </button>
      </template>
    </PageHeader>

    <div class="grid grid-cols-1 gap-5 sm:grid-cols-3">
      <Card>
        <CardContent class="p-6">
          <p class="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Users</p>
          <p class="mt-2 text-3xl font-bold text-zinc-900 tabular-nums dark:text-white">{{ total }}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="p-6">
          <p class="text-sm font-medium text-zinc-500 dark:text-zinc-400">Administrators</p>
          <p class="mt-2 text-3xl font-bold text-indigo-600 tabular-nums dark:text-indigo-400">{{ admins }}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="p-6">
          <p class="text-sm font-medium text-zinc-500 dark:text-zinc-400">Active Accounts</p>
          <p class="mt-2 text-3xl font-bold text-emerald-600 tabular-nums dark:text-emerald-400">{{ active }}</p>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>All Users</CardTitle>
          <Badge variant="info">{{ tableUsers.length }} accounts</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div v-if="!loaded" class="py-12 text-center text-zinc-400">Loading users…</div>
        <div v-else-if="tableUsers.length === 0" class="py-12 text-center text-zinc-400">No users found</div>
        <Table v-else>
          <TableHeader>
            <TableRow>
              <TableHead class="w-[70px]">ID</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Name</TableHead>
              <TableHead class="w-[120px]">Role</TableHead>
              <TableHead class="w-[120px]">Status</TableHead>
              <TableHead class="w-[130px]">SMS Balance</TableHead>
              <TableHead class="w-[110px]">Cost / SMS</TableHead>
              <TableHead class="w-[190px]">Created</TableHead>
              <TableHead class="w-[150px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="u in tableUsers" :key="u.id">
              <TableCell class="font-mono text-xs text-zinc-500">#{{ u.id }}</TableCell>
              <TableCell class="font-medium text-zinc-900 dark:text-white">{{ u.username }}</TableCell>
              <TableCell class="text-zinc-500">{{ u.name }}</TableCell>
              <TableCell>
                <Badge :variant="roleBadge[u.role] ?? 'default'">{{ u.role }}</Badge>
              </TableCell>
              <TableCell>
                <Badge :variant="u.active ? 'success' : 'danger'" dot>{{ u.active ? "Active" : "Inactive" }}</Badge>
              </TableCell>
              <TableCell class="font-mono text-zinc-900 tabular-nums dark:text-white">{{ u.smsBalance ?? 0 }}</TableCell>
              <TableCell class="font-mono tabular-nums text-zinc-500">৳{{ (u.smsCost ?? 0.35).toFixed(2) }}</TableCell>
              <TableCell class="whitespace-nowrap text-zinc-400">{{ u.createdAt }}</TableCell>
              <TableCell>
                <button
                  @click="openAssignModal(u)"
                  class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  Assign SMS
                </button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <!-- Add User Modal -->
    <div v-if="modalOpen" class="fixed inset-0 z-50 overflow-y-auto" @click.self="closeModal">
      <div class="flex min-h-full items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <div class="relative w-full max-w-md rounded-2xl bg-white shadow-xl dark:bg-zinc-900">
          <div class="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
            <h3 class="text-lg font-semibold text-zinc-900 dark:text-white">Add New User</h3>
            <button @click="closeModal" class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="handleCreateUser" class="p-6 space-y-4">
            <div v-if="error" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {{ error }}
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Username</label>
              <input v-model="form.username" required autocomplete="username" placeholder="Enter username"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Password</label>
              <input v-model="form.password" type="password" required autocomplete="new-password" placeholder="Enter password"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Name</label>
              <input v-model="form.name" required autocomplete="name" placeholder="Enter full name"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Role</label>
              <select v-model="form.role" class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div class="flex items-center gap-2">
              <input v-model="form.active" type="checkbox" id="active" class="h-4 w-4 rounded border-zinc-300 text-indigo-600 accent-indigo-600" />
              <label for="active" class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Active</label>
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <button type="button" @click="closeModal" class="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                Cancel
              </button>
              <button type="submit" :disabled="submitting" class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed">
                <svg v-if="submitting" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4z" />
                </svg>
                {{ submitting ? "Creating..." : "Create User" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Assign SMS Modal -->
    <div v-if="assignModalOpen" class="fixed inset-0 z-50 overflow-y-auto" @click.self="closeAssignModal">
      <div class="flex min-h-full items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <div class="relative w-full max-w-md rounded-2xl bg-white shadow-xl dark:bg-zinc-900">
          <div class="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
            <div>
              <h3 class="text-lg font-semibold text-zinc-900 dark:text-white">Assign SMS</h3>
              <p v-if="assignUserLabel" class="text-xs text-zinc-500 dark:text-zinc-400">{{ assignUserLabel }}</p>
            </div>
            <button @click="closeAssignModal" class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="assignSms" class="p-6 space-y-4">
            <div v-if="assignError" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {{ assignError }}
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Amount (Taka)</label>
              <input
                v-model.number="assignForm.amount"
                type="number"
                step="1"
                min="0"
                placeholder="Enter amount in Taka"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Cost per SMS (Taka)</label>
              <input
                v-model.number="assignForm.costPerSms"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 0.35"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            <div class="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <p class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Calculated SMS Count</p>
              <p class="mt-1 text-2xl font-bold text-indigo-600 tabular-nums dark:text-indigo-400">
                {{ calculatedSmsCount }}
              </p>
              <p class="text-xs text-zinc-500">(Amount ÷ Cost per SMS)</p>
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <button type="button" @click="closeAssignModal" class="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                Cancel
              </button>
              <button type="submit" :disabled="assignSubmitting || calculatedSmsCount <= 0" class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                <svg v-if="assignSubmitting" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4z" />
                </svg>
                {{ assignSubmitting ? "Assigning..." : "Assign SMS" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>