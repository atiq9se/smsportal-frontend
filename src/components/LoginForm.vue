<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";
import type { SessionUser } from "@/types";

const router = useRouter();
const { login, basePath } = useAuth();

const devLogin = import.meta.env.DEV;
const username = ref(
  import.meta.env.VITE_LOGIN_USERNAME ?? (devLogin ? "admin" : "")
);
const password = ref(
  import.meta.env.VITE_LOGIN_PASSWORD ?? (devLogin ? "admin123" : "")
);
const showPassword = ref(false);
const remember = ref(false);
const error = ref("");
const loading = ref(false);

async function handleSubmit() {
  error.value = "";
  loading.value = true;

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.value,
        password: password.value,
        remember: remember.value,
      }),
    });

    const data: { message?: string; success?: boolean; user?: SessionUser } =
      await res.json();

    if (!res.ok || !data.success) {
      error.value = data.message ?? "Login failed. Please try again.";
      return;
    }

    if (data.user) {
      login(data.user);
    }
    router.push(basePath.value);
  } catch {
    error.value = "Network error. Please check your connection.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="w-full max-w-md">
    <div
      class="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div
        class="bg-gradient-to-br from-blue-600 to-indigo-700 px-8 pb-10 pt-8 text-white"
      >
        <div
          class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur"
        >
          <svg
            class="h-8 w-8"
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
        <h1 class="mt-5 text-center text-2xl font-bold tracking-tight">
          SMS Portal
        </h1>
        <p class="mt-1 text-center text-sm text-blue-100">
          Sign in to your account to continue
        </p>
      </div>

      <form class="space-y-5 px-8 py-8" @submit.prevent="handleSubmit">
        <div
          v-if="error"
          role="alert"
          class="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          <svg
            class="mt-0.5 h-5 w-5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
            />
          </svg>
          <span>{{ error }}</span>
        </div>

        <div>
          <label
            for="username"
            class="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Username
          </label>
          <div class="relative">
            <span
              class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400"
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
                  d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z"
                />
              </svg>
            </span>
            <input
              id="username"
              v-model="username"
              name="username"
              type="text"
              autocomplete="username"
              required
              placeholder="Enter your username"
              class="w-full rounded-lg border border-zinc-300 bg-white py-2.5 pl-10 pr-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
        </div>

        <div>
          <label
            for="password"
            class="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Password
          </label>
          <div class="relative">
            <span
              class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400"
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
                  d="M15 9V6a3 3 0 0 0-6 0v3m-2 0h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z"
                />
              </svg>
            </span>
            <input
              id="password"
              v-model="password"
              name="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              required
              placeholder="Enter your password"
              class="w-full rounded-lg border border-zinc-300 bg-white py-2.5 pl-10 pr-11 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
              @click="showPassword = !showPassword"
            >
              <svg
                v-if="showPassword"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 12c-2.5 3.5-5.5 5.5-9 5.5S5.5 15.5 3 12c2.5-3.5 5.5-5.5 9-5.5S18.5 8.5 21 12z"
                />
              </svg>
              <svg
                v-else
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M3 3l18 18M10.5 5.2A9.8 9.8 0 0 1 12 5c3.5 0 6.5 2 9 7-.8 1.2-1.7 2.3-2.7 3.2m-3.1 2A9.7 9.7 0 0 1 12 19c-3.5 0-6.5-2-9-7 .8-1.2 1.7-2.3 2.7-3.2M9.9 9.9a3 3 0 0 0 4.2 4.2"
                />
              </svg>
            </button>
          </div>
        </div>

        <div class="flex items-center justify-between text-sm">
          <label
            class="flex cursor-pointer items-center gap-2 text-zinc-600 dark:text-zinc-400"
          >
            <input
              v-model="remember"
              type="checkbox"
              class="h-4 w-4 rounded border-zinc-300 text-blue-600 accent-blue-600"
            />
            Remember me
          </label>
          <a
            href="#"
            class="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Forgot password?
          </a>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg v-if="loading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
              d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4z"
            />
          </svg>
          {{ loading ? "Signing in..." : "Sign In" }}
        </button>

        <p class="text-center text-xs text-zinc-400">
          Demo: <span class="font-medium text-zinc-500">admin</span> /
          <span class="font-medium text-zinc-500">admin123</span>
        </p>
      </form>
    </div>
  </div>
</template>
