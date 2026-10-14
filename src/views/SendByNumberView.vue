<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";
import {
  Badge,
  Card,
  CardContent,
  CardTitle,
} from "@/components/ui";
import { useAuth } from "@/composables/useAuth";

const { basePath, user } = useAuth();

const numbers = ref("");
const message = ref("");
const loading = ref(false);
const error = ref("");
const success = ref("");

const segmentCount = computed(() =>
  message.value.length > 0 ? Math.ceil(message.value.length / 160) : 1
);

const numberCount = computed(
  () =>
    numbers.value
      .split("\n")
      .map((n) => n.trim())
      .filter((n) => n.length > 0).length
);

async function handleSubmit() {
  error.value = "";
  success.value = "";

  const numberList = numbers.value
    .split("\n")
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  if (numberList.length === 0) {
    error.value = "Please enter at least one mobile number";
    return;
  }

  if (!message.value.trim()) {
    error.value = "Please enter a message";
    return;
  }

  loading.value = true;

  try {
    const res = await fetch("/api/send-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        numbers: numberList,
        message: message.value.trim(),
        userId: user.value?.id,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || data.message || "Failed to send SMS");
    }

    const sentCount = typeof data.sent === "number" ? data.sent : numberList.length;
    success.value = `SMS sent to ${sentCount} number(s)`;
    numbers.value = "";
    message.value = "";
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Something went wrong";
  } finally {
    loading.value = false;
  }
}

function handleClear() {
  numbers.value = "";
  message.value = "";
  error.value = "";
  success.value = "";
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-4">
      <div
        class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25"
      >
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </div>
      <div>
        <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">
          Send SMS By Number
        </h1>
        <p class="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Send messages directly to specific mobile numbers
        </p>
      </div>
    </div>

    <form class="space-y-6" @submit.prevent="handleSubmit">
      <div class="grid gap-6 lg:grid-cols-2">
        <Card
          padding="none"
          class="group flex flex-col overflow-hidden border-zinc-200/80 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-300/80 hover:shadow-xl hover:shadow-blue-500/10 lg:h-full dark:border-zinc-800 dark:hover:border-blue-800/70 dark:hover:shadow-blue-950/20"
        >
          <div class="flex items-start gap-3 border-b border-zinc-100 p-5 dark:border-zinc-800">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 transition-colors duration-300 group-hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:ring-blue-900/50">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <CardTitle class="text-base font-semibold text-zinc-900 dark:text-white">
                  Phone Numbers
                </CardTitle>
                <Badge variant="info" class="shrink-0">
                  {{ numberCount }}
                </Badge>
              </div>
              <p class="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                One number per line, with country code
              </p>
            </div>
          </div>
          <CardContent class="flex flex-1 flex-col p-5">
            <textarea
              id="numbers"
              v-model="numbers"
              rows="8"
              placeholder="+8801XXXXXXXXX&#10;+8801XXXXXXXXX&#10;+8801XXXXXXXXX"
              class="flex-1 w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50/60 px-4 py-3 font-mono text-sm leading-relaxed text-zinc-900 placeholder-zinc-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:bg-zinc-800"
              aria-describedby="numbers-hint"
            />
            <p id="numbers-hint" class="mt-2 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <svg class="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Include country code (e.g., +8801XXXXXXXXX)
            </p>
          </CardContent>
        </Card>

        <Card
          padding="none"
          class="group flex flex-col overflow-hidden border-zinc-200/80 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300/80 hover:shadow-xl hover:shadow-emerald-500/10 lg:h-full dark:border-zinc-800 dark:hover:border-emerald-800/70 dark:hover:shadow-emerald-950/20"
        >
          <div class="flex items-start gap-3 border-b border-zinc-100 p-5 dark:border-zinc-800">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 transition-colors duration-300 group-hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-900/50">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <CardTitle class="text-base font-semibold text-zinc-900 dark:text-white">
                  Write Message
                </CardTitle>
                <div class="flex shrink-0 items-center gap-1.5">
                  <Badge variant="outline" class="font-mono">
                    {{ message.length }}/1600
                  </Badge>
                  <Badge variant="default">
                    {{ segmentCount }} seg{{ segmentCount > 1 ? "s" : "" }}
                  </Badge>
                </div>
              </div>
              <p class="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                Compose your SMS content
              </p>
            </div>
          </div>
          <CardContent class="flex flex-1 flex-col p-5">
            <textarea
              id="message"
              v-model="message"
              rows="8"
              placeholder="Type your message here..."
              class="flex-1 w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50/60 px-4 py-3 text-sm leading-relaxed text-zinc-900 placeholder-zinc-400 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:bg-zinc-800"
              maxlength="1600"
            />
            <div class="mt-3 flex items-center gap-2">
              <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div
                  class="h-full rounded-full transition-all duration-300"
                  :class="
                    message.length > 1440
                      ? 'bg-red-500'
                      : message.length > 1200
                        ? 'bg-amber-500'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  "
                  :style="{ width: (message.length / 1600) * 100 + '%' }"
                />
              </div>
              <span class="shrink-0 text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                {{ message.length }}/1600
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div
        v-if="error"
        role="alert"
        class="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
      >
        <span class="flex-shrink-0">❌</span>
        <span>{{ error }}</span>
      </div>

      <div
        v-if="success"
        role="alert"
        class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
      >
        <span class="flex items-center gap-3">
          <span class="flex-shrink-0">✅</span>
          {{ success }}
        </span>
        <RouterLink
          :to="`${basePath}/reports`"
          class="font-semibold text-emerald-700 underline hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
        >
          View in SMS History
        </RouterLink>
      </div>

      <div
        class="flex flex-col items-stretch gap-4 rounded-2xl border border-zinc-200/70 bg-gradient-to-r from-white to-zinc-50/80 p-5 shadow-sm dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-900/50 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
          <div
            class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
            :class="
              numberCount > 0 && message.trim()
                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500'
            "
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path
                v-if="numberCount > 0 && message.trim()"
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
              <path
                v-else
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <template v-if="numberCount > 0 && message.trim()">
              <span class="font-semibold text-zinc-800 dark:text-zinc-200">
                Ready to send
              </span>
              <p class="text-xs">
                {{ numberCount }} number{{ numberCount > 1 ? "s" : "" }} · {{ (numberCount * segmentCount).toLocaleString() }} SMS
              </p>
            </template>
            <template v-else>
              <span class="font-medium text-zinc-600 dark:text-zinc-300">
                {{ numberCount === 0 ? "Add phone numbers" : "Write a message" }}
              </span>
              <p class="text-xs">to enable sending</p>
            </template>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-6 py-3 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 sm:w-auto"
            @click="handleClear"
          >
            Clear
          </button>
          <button
            type="submit"
            :disabled="loading"
            class="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-blue-600/40 disabled:cursor-not-allowed disabled:from-zinc-300 disabled:to-zinc-400 disabled:shadow-none sm:w-auto dark:disabled:from-zinc-700 dark:disabled:to-zinc-800"
          >
            <template v-if="loading">
              <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Sending…
            </template>
            <template v-else>
              <svg class="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Send SMS
            </template>
          </button>
        </div>
      </div>
    </form>
  </div>
</template>
