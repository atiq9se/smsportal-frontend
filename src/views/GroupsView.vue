<script setup lang="ts">
import { onMounted, ref } from "vue";
import * as XLSX from "xlsx";
import type { Contact, Group } from "@/types";

const groups = ref<Group[]>([]);
const loading = ref(true);
const modalOpen = ref(false);
const name = ref("");
const submitting = ref(false);
const editingId = ref<string | null>(null);
const editName = ref("");
const contactsModalOpen = ref(false);
const selectedGroupContacts = ref<Contact[]>([]);
const selectedGroupName = ref("");
const contactsLoading = ref(false);

function downloadContactsAsExcel() {
  const data = selectedGroupContacts.value.map((contact) => ({
    phone: contact.phone,
    name: contact.name ?? "",
    email: contact.email ?? "",
    address: contact.address ?? "",
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Contacts");
  const filename = `${selectedGroupName.value.replace(/\s+/g, "_")}_contacts.xlsx`;
  XLSX.writeFile(wb, filename);
}

async function load() {
  try {
    const res = await fetch("/api/groups");
    const data = await res.json();
    groups.value = data.groups ?? [];
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  load();
});

async function handleAdd() {
  const v = name.value.trim();
  if (!v) return;
  submitting.value = true;
  try {
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: v }),
    });
    const data = await res.json();
    if (data.success && data.group) {
      groups.value = [data.group, ...groups.value];
      name.value = "";
      modalOpen.value = false;
    }
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(group: Group) {
  if (!confirm(`Delete "${group.name}"? This cannot be undone.`)) return;
  try {
    const res = await fetch(`/api/groups?id=${group.id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      groups.value = groups.value.filter((grp) => grp.id !== group.id);
    } else {
      alert(data.message || "Failed to delete group");
    }
  } catch {
    alert("Failed to delete group");
  }
}

function handleEdit(group: Group) {
  editingId.value = group.id;
  editName.value = group.name;
}

function cancelEdit() {
  editingId.value = null;
  editName.value = "";
}

async function saveEdit(group: Group) {
  const trimmed = editName.value.trim();
  if (!trimmed || trimmed === group.name) {
    cancelEdit();
    return;
  }
  try {
    const res = await fetch("/api/groups", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: group.id, name: trimmed }),
    });
    const data = await res.json();
    if (data.success && data.group) {
      groups.value = groups.value.map((grp) =>
        grp.id === group.id ? data.group : grp
      );
    } else {
      alert(data.message || "Failed to update group");
    }
  } catch {
    alert("Failed to update group");
  }
  cancelEdit();
}

async function handleDetails(group: Group) {
  selectedGroupName.value = group.name;
  contactsLoading.value = true;
  try {
    const res = await fetch(`/api/groups/contacts/${group.id}`);
    const data = await res.json();
    selectedGroupContacts.value = data.contacts ?? [];
  } catch {
    selectedGroupContacts.value = [];
  } finally {
    contactsLoading.value = false;
    contactsModalOpen.value = true;
  }
}

function copyPhone(phone: string) {
  navigator.clipboard.writeText(phone);
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">
          Groups List
        </h1>
        <p class="mt-1 text-sm text-zinc-500">
          Organize your contacts into groups for targeted messaging
        </p>
      </div>
      <button
        class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        @click="modalOpen = true"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        New Group
      </button>
    </div>

    <div
      v-if="loading"
      class="flex items-center justify-center py-12 text-zinc-400"
    >
      Loading groups…
    </div>

    <div
      v-else-if="groups.length === 0"
      class="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900"
    >
      <svg
        class="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="1.5"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"
        />
      </svg>
      <h2 class="mt-4 text-base font-medium text-zinc-900 dark:text-white">
        No groups yet
      </h2>
      <p class="mt-1 text-sm text-zinc-500">
        Create your first group to start organizing contacts.
      </p>
      <button
        class="mx-auto mt-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        @click="modalOpen = true"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        New Group
      </button>
    </div>

    <div
      v-else
      class="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div
        v-for="g in groups"
        :key="g.id"
        class="flex items-center justify-between px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
      >
        <div class="flex items-center gap-4">
          <template v-if="editingId === g.id">
            <div class="flex items-center gap-2">
              <input
                v-model="editName"
                type="text"
                class="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                autofocus
                @keydown.enter="saveEdit(g)"
              />
              <button
                class="rounded-lg p-1.5 text-green-600 transition hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                title="Save"
                @click="saveEdit(g)"
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </button>
              <button
                class="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                title="Cancel"
                @click="cancelEdit"
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
          </template>
          <template v-else>
            <p class="text-base font-medium text-zinc-900 dark:text-white">
              {{ g.name }}
            </p>
            <span class="text-sm text-zinc-500 dark:text-zinc-400">
              {{ g.contacts }} contacts
            </span>
            <span
              class="rounded-full bg-blue-100 px-2 py-0.5 text-xs capitalize text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
            >
              {{ g.type }}
            </span>
          </template>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="flex items-center gap-1 rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            title="Details"
            @click="handleDetails(g)"
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
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span class="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Show Number
            </span>
          </button>
          <button
            class="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            title="Edit"
            @click="handleEdit(g)"
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
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            class="rounded-lg p-2 text-zinc-500 transition hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            title="Delete"
            @click="handleDelete(g)"
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- New group modal -->
    <div
      v-if="modalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div class="w-full max-w-md rounded-xl bg-white p-6 dark:bg-zinc-900">
        <h2 class="text-lg font-semibold text-zinc-900 dark:text-white">
          New Group
        </h2>
        <p class="mt-1 text-sm text-zinc-500">Enter a name for the group.</p>
        <form class="mt-4 space-y-4" @submit.prevent="handleAdd">
          <div>
            <label
              for="groupName"
              class="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Group Name
            </label>
            <input
              id="groupName"
              v-model="name"
              type="text"
              placeholder="e.g., Premium Customers"
              class="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              autofocus
            />
          </div>
          <div class="flex justify-end gap-2">
            <button
              type="button"
              class="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              @click="modalOpen = false"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="!name.trim() || submitting"
              class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            >
              {{ submitting ? "Creating…" : "Create Group" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Contacts modal -->
    <div
      v-if="contactsModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        class="max-h-[70vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white p-6 dark:bg-zinc-900"
      >
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-zinc-900 dark:text-white">
            Contacts in {{ selectedGroupName }}
          </h2>
          <button
            class="rounded-lg p-1 text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            @click="contactsModalOpen = false"
          >
            <svg
              class="h-5 w-5"
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
        <div class="mt-4 max-h-[55vh] overflow-y-auto">
          <div
            v-if="contactsLoading"
            class="flex items-center justify-center py-8 text-zinc-400"
          >
            Loading contacts…
          </div>
          <div
            v-else-if="selectedGroupContacts.length === 0"
            class="py-8 text-center text-zinc-500 dark:text-zinc-400"
          >
            <svg
              class="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"
              />
            </svg>
            <p class="mt-4">No contacts in this group</p>
          </div>
          <table v-else class="w-full text-left">
            <thead class="sticky top-0 bg-white dark:bg-zinc-900">
              <tr
                class="border-b border-zinc-200 text-xs font-semibold uppercase text-zinc-500 dark:border-zinc-700"
              >
                <th class="w-10 px-2 py-2 text-center">#</th>
                <th class="px-2 py-2">Phone Number</th>
                <th class="px-2 py-2">Name</th>
                <th class="px-2 py-2">Email</th>
                <th class="px-2 py-2">Address</th>
                <th class="w-12 px-2 py-2" />
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
              <tr
                v-for="(contact, index) in selectedGroupContacts"
                :key="index"
                class="text-sm text-zinc-900 dark:text-zinc-100"
              >
                <td class="px-2 py-2.5 text-center text-zinc-500 dark:text-zinc-400">
                  {{ index + 1 }}
                </td>
                <td class="whitespace-nowrap px-2 py-2.5 font-mono">
                  {{ contact.phone }}
                </td>
                <td class="px-2 py-2.5">{{ contact.name || "—" }}</td>
                <td class="px-2 py-2.5">{{ contact.email || "—" }}</td>
                <td class="px-2 py-2.5">{{ contact.address || "—" }}</td>
                <td class="px-2 py-2.5">
                  <button
                    class="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    title="Copy phone number"
                    @click="copyPhone(contact.phone)"
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
                        d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2h-10a2 2 0 01-2-2v-1M8 5v12"
                      />
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <button
            v-if="selectedGroupContacts.length > 0"
            class="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
            @click="downloadContactsAsExcel"
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download Excel
          </button>
          <button
            class="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            @click="contactsModalOpen = false"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
