<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { PageHeader } from "@/components/ui";
import type { Group } from "@/types";
import { useAuth } from "@/composables/useAuth";

const route = useRoute();
const router = useRouter();
const { basePath } = useAuth();

const groups = ref<Group[]>([]);
const loading = ref(false);
const message = ref<{ type: "success" | "error"; text: string } | null>(null);
const manualLoading = ref(false);
const groupId = ref(route.query.groupId as string || "");

const manualContact = ref({
  phone: "",
  name: "",
  email: "",
  address: "",
});

onMounted(() => {
  fetch("/api/groups")
    .then((r) => r.json())
    .then((data) => {
      groups.value = data.groups ?? [];
    })
    .catch(() => {});
});

function dismissMessage() {
  message.value = null;
}

async function handleManualSubmit() {
  console.log('handleManualSubmit called', { groupId: groupId.value, phone: manualContact.value.phone });
  if (!groupId.value || !manualContact.value.phone.trim()) {
    console.log('Validation failed - missing group or phone');
    return;
  }
  manualLoading.value = true;
  message.value = null;

  try {
    const payload = {
      groupId: groupId.value,
      phone: manualContact.value.phone.trim(),
      name: manualContact.value.name.trim() || undefined,
      email: manualContact.value.email.trim() || undefined,
      address: manualContact.value.address.trim() || undefined,
    };
    console.log('Sending payload:', payload);
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    console.log('API response:', data);
    if (data.success) {
      message.value = {
        type: "success",
        text: `Contact added successfully.`,
      };
      manualContact.value = { phone: "", name: "", email: "", address: "" };
    } else {
      message.value = { type: "error", text: data.message ?? "Failed to add contact." };
    }
  } catch (err) {
    console.error('Fetch error:', err);
    message.value = { type: "error", text: "Network error." };
  } finally {
    manualLoading.value = false;
  }
}

function goBack() {
  router.push(`${basePath.value}/contacts`);
}
</script>

<template>
  <div class="space-y-6 max-w-2xl mx-auto">
    <PageHeader
      title="Add Single Contact"
      description="Add a single contact to a group"
    >
      <template #action>
        <button
          @click="goBack"
          class="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Contacts
        </button>
      </template>
    </PageHeader>

    <div
      v-if="message"
      class="flex items-start gap-3 rounded-xl border p-4 text-sm"
      :class="
        message.type === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
          : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300'
      "
      role="alert"
    >
      <span
        class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
        :class="
          message.type === 'success'
            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400'
            : 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
        "
      >
        <svg
          v-if="message.type === 'success'"
          class="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <svg
          v-else
          class="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 9v4m0 4h.01M4.93 4.93l14.14 14.14"
          />
        </svg>
      </span>
      <p class="flex-1 break-words">{{ message.text }}</p>
      <button
        type="button"
        class="shrink-0 rounded p-0.5 opacity-60 transition hover:opacity-100"
        aria-label="Dismiss"
        @click="dismissMessage"
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
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>

    <div
      class="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div class="border-b border-zinc-100 px-6 py-5 dark:border-zinc-800">
        <p class="mt-1 text-sm font-bold text-zinc-500">
          Fill in the contact details below
        </p>
      </div>

      <div class="space-y-6 p-6">
        <div v-if="groups.length === 0" class="text-center py-8 text-zinc-500">
          No groups found. Create a group first.
        </div>

        <div v-else>
          <div>
            <label
              for="groupSelect"
              class="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Select Group <span class="text-red-500">*</span>
            </label>
            <select
              id="groupSelect"
              v-model="groupId"
              class="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              required
            >
              <option value="">Choose a group…</option>
              <option v-for="g in groups" :key="g.id" :value="g.id">
                {{ g.name }} ({{ g.contacts }} contacts)
              </option>
            </select>
          </div>

          <form @submit.prevent="handleManualSubmit" class="space-y-4 mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
            <div>
              <label for="manualPhone" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Phone Number <span class="text-red-500">*</span>
              </label>
              <input
                id="manualPhone"
                v-model="manualContact.phone"
                type="tel"
                required
                class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="e.g., +8801712345678"
              />
            </div>
            <div>
              <label for="manualName" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Name
              </label>
              <input
                id="manualName"
                v-model="manualContact.name"
                type="text"
                class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="Contact name"
              />
            </div>
            <div>
              <label for="manualEmail" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Email
              </label>
              <input
                id="manualEmail"
                v-model="manualContact.email"
                type="email"
                class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="contact@example.com"
              />
            </div>
            <div>
              <label for="manualAddress" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Address
              </label>
              <textarea
                id="manualAddress"
                v-model="manualContact.address"
                rows="2"
                class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="Contact address"
              ></textarea>
            </div>
            <div class="flex gap-3 pt-2">
              <button
                type="submit"
                :disabled="!groupId || !manualContact.phone.trim() || manualLoading"
                class="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg v-if="manualLoading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                {{ manualLoading ? "Adding…" : "Add Contact" }}
              </button>
              <button
                type="button"
                @click="goBack"
                class="flex-1 flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>