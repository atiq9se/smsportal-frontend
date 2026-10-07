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
      <PageHeader title="Send SMS" description="Select groups and compose your message" />

      <form class="space-y-6" @submit.prevent="handleSend">
        <div class="grid gap-6 lg:grid-cols-2">
          <Card class="lg:h-full">
            <CardHeader>
              <CardDescription
                class="text-xl font-bold text-zinc-900 dark:text-white"
              >
                Select One or More Groups to Send SMS
              </CardDescription>
            </CardHeader>
            <CardContent class="h-full space-y-4">
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
                <Badge variant="info">
                  {{ totalContacts.toLocaleString() }} contacts
                </Badge>
                <Badge variant="default">
                  {{ segmentCount }} segment{{ segmentCount > 1 ? "s" : "" }}
                </Badge>
              </div>

              <div
                v-if="groups.length === 0"
                class="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-center dark:border-zinc-700 dark:bg-zinc-800"
              >
                <p class="text-sm text-zinc-500 dark:text-zinc-400">
                  No groups found.
                  <RouterLink to="/dashboard/groups" class="text-blue-600 hover:underline">
                    Create a group first
                  </RouterLink>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card class="lg:h-full">
            <CardHeader class="flex flex-row items-start justify-between">
              <div>
                <CardTitle class="text-lg font-bold text-zinc-900 dark:text-white">
                  Write Message
                </CardTitle>
              </div>
              <div class="flex items-center gap-3 text-right">
                <Badge variant="outline">{{ message.length }}/1600 characters</Badge>
                <Badge variant="default">
                  {{ segmentCount }} segment{{ segmentCount > 1 ? "s" : "" }}
                </Badge>
              </div>
            </CardHeader>
            <CardContent class="flex h-full flex-col space-y-4">
              <textarea
                id="message"
                ref="textareaRef"
                v-model="message"
                placeholder="Type your message here... e.g. Dear {{name}}, welcome!"
                rows="8"
                :disabled="selectedGroups.length === 0"
                class="flex-1 w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                maxlength="1600"
                aria-describedby="message-hint"
              />
              <div
                class="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400"
              >
                <span id="message-hint">
                  {{
                    selectedGroups.length === 0
                      ? "Select a group first to enable messaging"
                      : `Estimated: ${totalContacts} recipients × ${segmentCount} segment${
                          segmentCount > 1 ? "s" : ""
                        } = ${(totalContacts * segmentCount).toLocaleString()} SMS`
                  }}
                </span>
                <button
                  type="button"
                  class="rounded-md border border-zinc-200 px-2 py-1 font-mono text-xs text-blue-600 transition-colors hover:bg-blue-50 disabled:opacity-50 dark:border-zinc-700 dark:text-blue-400 dark:hover:bg-zinc-800"
                  title="Insert the contact's name placeholder"
                  :disabled="selectedGroups.length === 0"
                  @click="insertNamePlaceholder"
                >
                  + {{ nameToken }}
                </button>
              </div>
              <p class="text-xs text-zinc-500 dark:text-zinc-400">
                Use
                <code class="rounded bg-zinc-100 px-1 font-mono dark:bg-zinc-800">{{
                  nameToken
                }}</code>
                to personalize each message — it is replaced with the contact's
                name per phone number.
              </p>
              <div
                v-if="hasNameToken"
                class="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                <span class="font-semibold text-zinc-900 dark:text-white">
                  Preview:
                </span>
                {{ previewMessage }}
              </div>
            </CardContent>
          </Card>
        </div>

        <div
          v-if="result"
          role="alert"
          class="flex items-center gap-3 rounded-lg border p-4 text-sm"
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

        <div class="flex justify-end border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <button
            type="submit"
            class="flex w-full min-w-[160px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
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
            <template v-else>Send SMS</template>
          </button>
        </div>
      </form>
    </template>
  </div>
</template>
