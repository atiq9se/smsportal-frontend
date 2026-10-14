<script setup lang="ts">
import { reactive, ref } from "vue";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageHeader,
} from "@/components/ui";

const form = reactive({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});

const loading = ref(false);
const error = ref("");
const success = ref("");

async function handleSubmit() {
  error.value = "";
  success.value = "";

  if (form.newPassword !== form.confirmPassword) {
    error.value = "New password and confirm password do not match.";
    return;
  }

  if (form.newPassword.length < 6) {
    error.value = "New password must be at least 6 characters long.";
    return;
  }

  loading.value = true;

  try {
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      error.value = data.message ?? "Failed to change password.";
      return;
    }

    success.value = data.message ?? "Password changed successfully.";
    form.currentPassword = "";
    form.newPassword = "";
    form.confirmPassword = "";
  } catch {
    error.value = "Network error. Please try again.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Change Password"
      description="Update your account password securely"
    />

    <div class="flex justify-center">
      <Card class="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Change Your Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form class="space-y-5" @submit.prevent="handleSubmit">
            <div class="space-y-2">
              <label
                for="currentPassword"
                class="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Current Password
              </label>
              <input
                id="currentPassword"
                v-model="form.currentPassword"
                type="password"
                placeholder="Enter your current password"
                required
                autocomplete="current-password"
                class="block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-400"
              />
            </div>

            <div class="space-y-2">
              <label
                for="newPassword"
                class="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                New Password
              </label>
              <input
                id="newPassword"
                v-model="form.newPassword"
                type="password"
                placeholder="Enter new password (min. 6 characters)"
                required
                minlength="6"
                autocomplete="new-password"
                class="block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-400"
              />
            </div>

            <div class="space-y-2">
              <label
                for="confirmPassword"
                class="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                v-model="form.confirmPassword"
                type="password"
                placeholder="Re-enter new password"
                required
                autocomplete="new-password"
                class="block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-400"
              />
            </div>

            <div
              v-if="error"
              class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400"
            >
              {{ error }}
            </div>

            <div
              v-if="success"
              class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400"
            >
              {{ success }}
            </div>

            <div class="flex justify-end pt-2">
              <button
                type="submit"
                :disabled="loading"
                class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg
                  v-if="loading"
                  class="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  />
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {{ loading ? "Changing..." : "Change Password" }}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
