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

async function fetchUsers() {
  try {
    const res = await fetch("/api/users");
    const data: { users?: AdminUser[] } = await res.json();
    users.value = (data.users ?? []).filter((u) => u.role === "user");
  } catch {
    users.value = [];
  } finally {
    loaded.value = true;
  }
}

onMounted(fetchUsers);

const totalUsers = computed(() => users.value.length);
const usersWithBalance = computed(
  () => users.value.filter((u) => (u.smsBalance ?? 0) > 0).length
);
const totalBalance = computed(() =>
  users.value.reduce((sum, u) => sum + (u.smsBalance ?? 0), 0)
);
const totalTaka = computed(() =>
  users.value.reduce((sum, u) => sum + (u.balanceTaka ?? 0), 0)
);

const roleBadge: Record<string, "info" | "success" | "default"> = {
  admin: "info",
  user: "default",
};

const formatNumber = (value: number) => value.toLocaleString();
const formatTaka = (value: number) =>
  `৳ ${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="User SMS Balance"
      description="SMS credits available to each user"
    />

    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent class="p-6">
          <p class="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Users</p>
          <p class="mt-2 text-3xl font-bold text-zinc-900 tabular-nums dark:text-white">
            {{ totalUsers }}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="p-6">
          <p class="text-sm font-medium text-zinc-500 dark:text-zinc-400">Users with Balance</p>
          <p class="mt-2 text-3xl font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
            {{ usersWithBalance }}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="p-6">
          <p class="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total SMS Balance</p>
          <p class="mt-2 text-3xl font-bold text-indigo-600 tabular-nums dark:text-indigo-400">
            {{ formatNumber(totalBalance) }}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="p-6">
          <p class="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Balance (Taka)</p>
          <p class="mt-2 text-3xl font-bold text-purple-600 tabular-nums dark:text-purple-400">
            {{ formatTaka(totalTaka) }}
          </p>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>User SMS Balances</CardTitle>
          <Badge variant="info">{{ totalUsers }} accounts</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div v-if="!loaded" class="py-12 text-center text-zinc-400">Loading users…</div>
        <div v-else-if="users.length === 0" class="py-12 text-center text-zinc-400">
          No users found
        </div>
        <Table v-else>
          <TableHeader>
            <TableRow>
              <TableHead class="w-[70px]">ID</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Name</TableHead>
              <TableHead class="w-[120px]">Role</TableHead>
              <TableHead class="w-[140px]">SMS Balance</TableHead>
              <TableHead class="w-[160px]">Balance (Taka)</TableHead>
              <TableHead class="w-[120px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="u in users" :key="u.id">
              <TableCell class="font-mono text-xs text-zinc-500">#{{ u.id }}</TableCell>
              <TableCell class="font-medium text-zinc-900 dark:text-white">{{ u.username }}</TableCell>
              <TableCell class="text-zinc-500">{{ u.name }}</TableCell>
              <TableCell>
                <Badge :variant="roleBadge[u.role] ?? 'default'">{{ u.role }}</Badge>
              </TableCell>
              <TableCell>
                <span
                  class="font-mono font-semibold tabular-nums"
                  :class="
                    (u.smsBalance ?? 0) > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-zinc-400'
                  "
                >
                  {{ formatNumber(u.smsBalance ?? 0) }}
                </span>
              </TableCell>
              <TableCell>
                <span
                  class="font-mono font-semibold tabular-nums"
                  :class="
                    (u.balanceTaka ?? 0) > 0
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'text-zinc-400'
                  "
                >
                  {{ formatTaka(u.balanceTaka ?? 0) }}
                </span>
              </TableCell>
              <TableCell>
                <Badge :variant="u.active ? 'success' : 'danger'" dot>
                  {{ u.active ? "Active" : "Inactive" }}
                </Badge>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>
</template>
