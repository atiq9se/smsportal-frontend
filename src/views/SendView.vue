<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import MultiSelect from "@/components/ui/MultiSelect.vue";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardListSkeleton,
  PageHeader,
  StatCardSkeleton,
} from "@/components/ui";
import type { Group } from "@/types";
import { useAuth } from "@/composables/useAuth";

const { basePath, user } = useAuth();

const groups = ref<Group[]>([]);
const selectedGroups = ref<string[]>([]);
const message = ref("");
const loading = ref(false);
const result = ref<{ type: "success" | "error"; text: string } | null>(null);
const groupsLoading = ref(true);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

onMounted(() => {
  fetch("/api/groups")
    .then((r) => r.json())
    .then((data) => {
      groups.value = data.groups ?? [];
      groupsLoading.value = false;
    })
    .catch(() => {
      groupsLoading.value = false;
    });
});

const totalContacts = computed(() =>
  selectedGroups.value.reduce((acc, id) => {
    const group = groups.value.find((g) => g.id === id);
    return acc + (group?.contacts || 0);
  }, 0)
);

const segmentCount = computed(() =>
  message.value.length > 0 ? Math.ceil(message.value.length / 160) : 1
);

const hasNameToken = computed(() => /\{+\s*name\s*\}+/i.test(message.value));
const previewMessage = computed(() =>
  message.value.replace(/\{+\s*name\s*\}+/gi, "Karim")
);
const nameToken = "{{name}}";

function insertNamePlaceholder() {
  const token = nameToken;
  const el = textareaRef.value;
  if (!el) {
    message.value = `${message.value}${token}`;
    return;
  }
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const next = `${el.value.slice(0, start)}${token}${el.value.slice(end)}`;
  message.value = next;
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(start + token.length, start + token.length);
  });
}

async function handleSend() {
  if (selectedGroups.value.length === 0 || !message.value.trim()) return;
  loading.value = true;
  result.value = null;

  try {
    const res = await fetch("/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupIds: selectedGroups.value,
        message: message.value.trim(),
        userId: user.value?.id,
      }),
    });
    const data = await res.json();
    if (data.success) {
      result.value = {
        type: "success",
        text: `SMS sent to ${data.sent} contacts (${segmentCount.value} segment${
          segmentCount.value > 1 ? "s" : ""
        }).`,
      };
      message.value = "";
    } else {
      result.value = { type: "error", text: data.message ?? "Failed to send." };
    }
  } catch {
    result.value = { type: "error", text: "Network error." };
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <template v-if="groupsLoading">
      <PageHeader title="Send SMS" description="Select groups and compose your message" />
      <div class="grid gap-6 md:grid-cols-2">
        <Card><StatCardSkeleton /></Card>
        <Card><CardListSkeleton :items="3" /></Card>
      </div>
    </template>

    <template v-else>
      <PageHeader
        title="Send SMS"
        description="Select recipient groups and compose your campaign message"
      />

      <form class="space-y-6" @submit.prevent="handleSend">
        <div class="grid gap-6 lg:grid-cols-2">
          <Card padding="none" class="flex h-full flex-col overflow-hidden">
            <div class="border-b border-zinc-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 px-6 py-4 dark:border-zinc-800 dark:from-blue-950/30 dark:to-indigo-950/20">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <CardTitle class="text-lg font-bold text-zinc-900 dark:text-white">
                    Select Groups
                  </CardTitle>
                  <p class="text-xs text-zinc-500 dark:text-zinc-400">
                    Choose one or more recipient groups
                  </p>
                </div>
              </div>
            </div>
            <CardContent class="flex flex-1 flex-col space-y-4 p-6">
              <MultiSelect
                v-model="selectedGroups"
                :options="
                  groups.map((g) => ({
                    value: g.id,
                    label: `${g.name} (${g.contacts.toLocaleString()} contacts)`,
                  }))
                "
                placeholder="Select one or more groups..."
                :disabled="groups.length === 0"
              />

              <div
                v-if="selectedGroups.length > 0"
                class="flex flex-wrap items-center gap-2"
              >
                <Badge variant="outline" class="gap-1.5">
                  <span class="h-2 w-2 rounded-full bg-blue-500" />
                  {{ selectedGroups.length }} group{{
                    selectedGroups.length > 1 ? "s" : ""
                  }}
                  selected
                </Badge>
                <Badge variant="info" class="gap-1.5">
                  <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {{ totalContacts.toLocaleString() }} contacts
                </Badge>
                <Badge variant="default" class="gap-1.5">
                  <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {{ segmentCount }} segment{{ segmentCount > 1 ? "s" : "" }}
                </Badge>
              </div>

              <div
                v-if="selectedGroups.length > 0"
                class="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50"
              >
                <div class="flex items-center justify-between text-sm">
                  <span class="text-zinc-500 dark:text-zinc-400">Estimated delivery</span>
                  <span class="font-semibold text-zinc-900 dark:text-white">
                    {{ (totalContacts * segmentCount).toLocaleString() }} SMS
                  </span>
                </div>
                <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                  <div
                    class="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                    :style="{ width: Math.min((totalContacts * segmentCount) / 100, 100) + '%' }"
                  />
                </div>
              </div>

              <div
                v-if="groups.length === 0"
                class="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center dark:border-zinc-600 dark:bg-zinc-800/50"
              >
                <span class="text-3xl" role="img" aria-hidden="true">👥</span>
                <p class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  No groups found.
                </p>
                <RouterLink
                  :to="`${basePath}/groups`"
                  class="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  Create a group first
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </RouterLink>
              </div>
            </CardContent>
          </Card>

          <Card padding="none" class="flex h-full flex-col overflow-hidden">
            <div class="border-b border-zinc-100 bg-gradient-to-r from-emerald-50/80 to-teal-50/50 px-6 py-4 dark:border-zinc-800 dark:from-emerald-950/30 dark:to-teal-950/20">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <div>
                    <CardTitle class="text-lg font-bold text-zinc-900 dark:text-white">
                      Write Message
                    </CardTitle>
                    <p class="text-xs text-zinc-500 dark:text-zinc-400">
                      Compose your SMS content
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <Badge variant="outline" class="font-mono">
                    {{ message.length }}/1600
                  </Badge>
                  <Badge variant="default">
                    {{ segmentCount }} seg{{ segmentCount > 1 ? "s" : "" }}
                  </Badge>
                </div>
              </div>
            </div>
            <CardContent class="flex flex-1 flex-col space-y-3 p-6">
              <textarea
                id="message"
                ref="textareaRef"
                v-model="message"
                placeholder="Type your message here... e.g. Dear {{name}}, welcome!"
                rows="8"
                :disabled="selectedGroups.length === 0"
                class="flex-1 w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-relaxed text-zinc-900 placeholder-zinc-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
                maxlength="1600"
                aria-describedby="message-hint"
              />

              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="h-1.5 w-32 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
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
                  <span class="text-xs text-zinc-400 dark:text-zinc-500">
                    {{ message.length }}/1600
                  </span>
                </div>
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 font-mono text-xs font-medium text-blue-600 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-blue-400 dark:hover:bg-zinc-700"
                  title="Insert the contact's name placeholder"
                  :disabled="selectedGroups.length === 0"
                  @click="insertNamePlaceholder"
                >
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {{ nameToken }}
                </button>
              </div>

              <p
                v-if="selectedGroups.length > 0"
                id="message-hint"
                class="text-xs text-zinc-500 dark:text-zinc-400"
              >
                Use
                <code class="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-blue-600 dark:bg-zinc-800 dark:text-blue-400">{{
                  nameToken
                }}</code>
                to personalize each message — replaced with the contact's name.
              </p>
              <p
                v-else
                id="message-hint"
                class="text-xs text-zinc-400 dark:text-zinc-500"
              >
                Select a group first to enable messaging
              </p>

              <div
                v-if="message.trim()"
                class="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40"
              >
                <div
                  class="mb-2 flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400"
                >
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Preview
                </div>
                <p
                  class="whitespace-pre-wrap break-words rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                >
                  {{ previewMessage }}
                </p>
                <div
                  class="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-zinc-400 dark:text-zinc-500"
                >
                  <span v-if="hasNameToken">{{ nameToken }} → replaced with contact name</span>
                  <span v-else>Same message to every recipient</span>
                  <span>{{ segmentCount }} SMS segment{{ segmentCount > 1 ? "s" : "" }}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div
          v-if="result"
          role="alert"
          class="flex items-center gap-3 rounded-xl border p-4 text-sm shadow-sm"
          :class="
            result.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300'
          "
        >
          <span class="flex-shrink-0">
            {{ result.type === "success" ? "✅" : "❌" }}
          </span>
          <span>{{ result.text }}</span>
        </div>

        <div
          class="flex flex-col items-stretch gap-4 rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="text-sm text-zinc-500 dark:text-zinc-400">
            <template v-if="selectedGroups.length > 0 && message.trim()">
              <span class="font-medium text-zinc-700 dark:text-zinc-300">
                Ready to send
              </span>
              — {{ totalContacts.toLocaleString() }} recipient{{ totalContacts > 1 ? "s" : "" }},
              {{ (totalContacts * segmentCount).toLocaleString() }} SMS
            </template>
            <template v-else>
              {{ selectedGroups.length === 0 ? "Select a group" : "Write a message" }}
              to enable sending
            </template>
          </div>
          <button
            type="submit"
            class="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-blue-600/40 disabled:cursor-not-allowed disabled:from-zinc-300 disabled:to-zinc-400 disabled:shadow-none sm:w-auto dark:disabled:from-zinc-700 dark:disabled:to-zinc-800"
            :disabled="
              selectedGroups.length === 0 || !message.trim() || loading
            "
          >
            <template v-if="loading">
              <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                  fill="none"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
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
      </form>
    </template>
  </div>
</template>
