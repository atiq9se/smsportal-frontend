<script setup lang="ts">
import { ref } from "vue";
import { RouterLink } from "vue-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";

const numbers = ref("");
const message = ref("");
const loading = ref(false);
const error = ref("");
const success = ref("");

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
      body: JSON.stringify({ numbers: numberList, message: message.value.trim() }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to send SMS");
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
    <div>
      <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">
        Send SMS By Number
      </h1>
      <p class="mt-1 text-sm text-zinc-500">
        Enter mobile numbers (one per line) and send SMS directly
      </p>
    </div>

    <form class="space-y-6" @submit.prevent="handleSubmit">
      <div class="grid gap-6 lg:grid-cols-2">
        <Card class="lg:h-full">
          <CardHeader>
            <CardTitle class="text-lg font-bold text-zinc-900 dark:text-white">
              Phone Numbers
            </CardTitle>
            <CardDescription>
              Enter one number per line with country code
            </CardDescription>
          </CardHeader>
          <CardContent class="h-full">
            <textarea
              id="numbers"
              v-model="numbers"
              rows="8"
              placeholder="+8801XXXXXXXXX&#10;+8801XXXXXXXXX&#10;+8801XXXXXXXXX"
              class="flex-1 w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
              aria-describedby="numbers-hint"
            />
            <p id="numbers-hint" class="mt-1.5 text-xs text-zinc-500">
              Enter one number per line. Include country code (e.g., +8801XXXXXXXXX)
            </p>
          </CardContent>
        </Card>

        <Card class="lg:h-full">
          <CardHeader>
            <CardTitle class="text-lg font-bold text-zinc-900 dark:text-white">
              Write Message
            </CardTitle>
          </CardHeader>
          <CardContent class="flex h-full flex-col p-6">
            <textarea
              id="message"
              v-model="message"
              rows="8"
              placeholder="Type your message here..."
              class="flex-1 w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
              maxlength="160"
            />
            <p class="mt-1.5 text-right text-xs text-zinc-500">
              {{ message.length }}/160 characters
            </p>
          </CardContent>
        </Card>
      </div>

      <div
        v-if="error"
        class="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950 dark:text-red-400"
      >
        {{ error }}
      </div>

      <div
        v-if="success"
        class="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
      >
        <span>{{ success }}</span>
        <RouterLink
          to="/dashboard/reports"
          class="font-semibold text-emerald-700 underline hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
        >
          View in SMS History
        </RouterLink>
      </div>

      <div class="flex justify-center gap-4">
        <button
          type="submit"
          :disabled="loading"
          class="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ loading ? "Sending..." : "Send SMS" }}
        </button>
        <button
          type="button"
          class="rounded-lg border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          @click="handleClear"
        >
          Clear
        </button>
      </div>
    </form>
  </div>
</template>
