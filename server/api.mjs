import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";
import * as XLSX from "xlsx";

const DATA_MARKERS = ["users.json", "dashboard.json"];

let cachedDataDir = null;

function resolveDataDir() {
  if (process.env.SMS_DATA_DIR) return path.resolve(process.env.SMS_DATA_DIR);
  if (cachedDataDir) return cachedDataDir;

  let dir = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    const candidate = path.join(dir, "data");
    if (DATA_MARKERS.every((file) => existsSync(path.join(candidate, file)))) {
      cachedDataDir = candidate;
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  cachedDataDir = path.join(process.cwd(), "data");
  return cachedDataDir;
}

function dataFile(file) {
  return path.join(resolveDataDir(), file);
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(dataFile(file), "utf-8"));
  } catch {
    return fallback;
  }
}

async function writeJson(file, value) {
  await writeFile(dataFile(file), JSON.stringify(value, null, 2));
}

const json = (body, status = 200, initHeaders = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...initHeaders },
  });

const notFound = (message) => json({ success: false, message }, 404);
const badRequest = (message) => json({ success: false, message }, 400);

/* ------------------------------------------------------------------ *
 * Auth
 * ------------------------------------------------------------------ */

async function getUsers() {
  const apiUrl = process.env.SMS_USERS_API;

  if (apiUrl) {
    try {
      const res = await fetch(apiUrl);
      if (res.ok) {
        const data = await res.json();
        return data.users ?? [];
      }
    } catch {
      /* fall through to the local file */
    }
  }

  const data = await readJson("users.json", { users: [] });
  return data.users ?? [];
}

const BACKEND_URL = (process.env.SMS_BACKEND_URL || "http://127.0.0.1:8000")
  .trim()
  .replace(/\/+$/, "");

function getSessionUser(request) {
  if (!request) return null;
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)sms_user=([^;]+)/);
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

function sessionUserId(session) {
  const id = parseInt(String(session?.id ?? ""), 10);
  return Number.isFinite(id) && id > 0 ? id : 0;
}

function sessionIsAdmin(session) {
  return session?.role === "admin";
}


async function authenticateViaBackend(username, password) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => null);
    if (!data) return { ok: false, offline: true };
    return { ok: res.ok && data.success === true, offline: false, data };
  } catch {
    return { ok: false, offline: true };
  }
}

async function authenticate(username, password) {
  const users = await getUsers();

  return (
    users.find(
      (u) =>
        u.username === username && u.password === password && u.active
    ) ?? null
  );
}

async function loginHandler(request) {
  const body = await request.json().catch(() => null);

  const username =
    typeof body?.username === "string" ? body.username.trim() : "";
  const password =
    typeof body?.password === "string" ? body.password : "";

  if (!username || !password) {
    return json(
      {
        success: false,
        message: "Username and password are required.",
        fields: { username: !username, password: !password },
      },
      400
    );
  }

  let sessionUser = null;

  const backend = await authenticateViaBackend(username, password);

  if (backend.offline) {
    const user = await authenticate(username, password);
    if (user) {
      sessionUser = {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      };
    }
  } else if (backend.ok && backend.data?.user) {
    sessionUser = backend.data.user;
  }

  if (!sessionUser) {
    return json(
      { success: false, message: "Invalid username or password." },
      401
    );
  }

  const response = json({ success: true, user: sessionUser });
  response.headers.append(
    "Set-Cookie",
    `sms_user=${encodeURIComponent(JSON.stringify(sessionUser))}; Path=/; Max-Age=${60 * 60 * 8}; SameSite=Lax`
  );

  return response;
}

async function usersHandler(request) {
  const method = request.method;
  if (method === "GET") {
    return usersGetHandler(request);
  }
  if (method === "POST") {
    return usersPostHandler(request);
  }
  return json({ success: false, message: "Method not allowed." }, 405);
}

async function usersGetHandler(request) {
  const session = getSessionUser(request);
  const requireAll = !session || sessionIsAdmin(session);
  const scopeUsers = (users) => {
    if (requireAll) return users;
    const id = sessionUserId(session);
    return users.filter((u) => Number(u.id) === id);
  };

  const backend = await callBackend("/api/users");
  if (!backend.offline && Array.isArray(backend.data?.users)) {
    const users = scopeUsers(backend.data.users);
    return json(
      {
        ...backend.data,
        users,
        total: users.length,
        admins: users.filter((u) => u.role === "admin").length,
        active: users.filter((u) => u.active).length,
      },
      backend.status
    );
  }

  const data = await readJson("users.json", { users: [] });
  const all = (data.users ?? []).map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    active: u.active !== false,
    createdAt: u.createdAt ?? u.created_at ?? "",
  }));
  const users = scopeUsers(all);

  return json({
    success: true,
    users,
    total: users.length,
    admins: users.filter((u) => u.role === "admin").length,
    active: users.filter((u) => u.active).length,
  });
}

async function usersPostHandler(request) {
  const body = await request.json().catch(() => null);
  const backend = await callBackend("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!backend.offline) {
    return json(backend.data, backend.status);
  }
  return json({ success: false, message: "Backend unavailable." }, 503);
}

async function userSmsAssignHandler(request, { userId }) {
  const id = parseInt(userId, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return json({ success: false, message: "Invalid user ID." }, 400);
  }

  const body = await request.json().catch(() => null);
  const count = body?.count;
  const amount = body?.amount;
  const costPerSms = body?.costPerSms;

  if (!Number.isFinite(count) || count <= 0) {
    return json({ success: false, message: "SMS count must be a positive integer." }, 400);
  }

  const backend = await callBackend(`/api/users/${id}/sms-assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ count, amount, costPerSms }),
  }, request);

  if (!backend.offline) {
    return json(backend.data, backend.status);
  }
  return json({ success: false, message: "Backend unavailable." }, 503);
}

async function userBalanceHandler(request, { userId }) {
  const id = parseInt(userId, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return json({ success: false, message: "Invalid user ID." }, 400);
  }

  const body = await request.json().catch(() => null);
  const smsBalance = body?.smsBalance;
  const balanceTaka = body?.balanceTaka;

  if (!Number.isInteger(smsBalance) || smsBalance < 0) {
    return json({ success: false, message: "SMS balance must be a non-negative integer." }, 400);
  }
  if (!Number.isFinite(balanceTaka) || balanceTaka < 0) {
    return json({ success: false, message: "Taka balance must be a non-negative number." }, 400);
  }

  const backend = await callBackend(`/api/users/${id}/balance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ smsBalance, balanceTaka }),
  }, request);

  if (!backend.offline) {
    return json(backend.data, backend.status);
  }
  return json({ success: false, message: "Backend unavailable." }, 503);
}

async function userShowHandler(request, { userId }) {
  const id = parseInt(userId, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return json({ success: false, message: "Invalid user ID." }, 400);
  }

  const backend = await callBackend(`/api/users/${id}`, undefined, request);
  if (!backend.offline) {
    return json(backend.data, backend.status);
  }
  return json({ success: false, message: "User not found." }, 404);
}

async function userConsumeHandler(request, { userId }) {
  const id = parseInt(userId, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return json({ success: false, message: "Invalid user ID." }, 400);
  }

  const body = await request.json().catch(() => null);
  const count = body?.count;

  if (!Number.isInteger(count) || count <= 0) {
    return json({ success: false, message: "SMS count must be a positive integer." }, 400);
  }

  const backend = await callBackend(`/api/users/${id}/consume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ count }),
  });

  if (!backend.offline) {
    return json(backend.data, backend.status);
  }
  return json({ success: false, message: "Backend unavailable." }, 503);
}

async function consumeUserSms(userId, count) {
  if (!Number.isFinite(count) || count <= 0) return null;
  const id = parseInt(String(userId ?? ""), 10);
  if (!Number.isFinite(id) || id <= 0) return null;

  try {
    const res = await fetch(`${BACKEND_URL}/api/users/${id}/consume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) {
      console.error(`User ${id} consume failed:`, res.status);
      return null;
    }
    return data;
  } catch (error) {
    console.error("User consume error:", error);
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * SMS settings (provider API credentials + live balance)
 * ------------------------------------------------------------------ */

async function smsSettingsGetHandler(request) {
  const backend = await callBackend("/api/sms-settings", undefined, request);
  if (!backend.offline) {
    return json(backend.data, backend.status);
  }
  return json(
    { success: false, message: "Backend unavailable.", settings: null },
    503
  );
}

async function smsSettingsPostHandler(request) {
  const body = await request.json().catch(() => null);
  const backend = await callBackend(
    "/api/sms-settings",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    },
    request
  );
  if (!backend.offline) {
    return json(backend.data, backend.status);
  }
  return json({ success: false, message: "Backend unavailable." }, 503);
}

async function smsSettingsBalanceHandler(request) {
  const backend = await callBackend(
    "/api/sms-settings/balance",
    undefined,
    request
  );
  if (!backend.offline) {
    return json(backend.data, backend.status);
  }
  return json(
    { success: false, message: "Backend unavailable.", balance: null },
    503
  );
}

function logoutHandler() {
  const response = json({ success: true });
  response.headers.append(
    "Set-Cookie",
    "sms_user=; Path=/; Max-Age=0; SameSite=Lax"
  );
  return response;
}

function sessionHandler(request) {
  const session = getSessionUser(request);
  if (!session) {
    return json({ success: false, user: null }, 401);
  }
  return json({ success: true, user: session });
}

async function changePasswordHandler(request) {
  const body = await request.json().catch(() => null);
  const backend = await callBackend(
    "/api/auth/change-password",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    },
    request
  );
  if (!backend.offline) {
    return json(backend.data, backend.status);
  }
  return json(
    {
      success: false,
      message: "Backend unavailable. Cannot change password right now.",
    },
    503
  );
}

/* ------------------------------------------------------------------ *
 * Dashboard
 * ------------------------------------------------------------------ */

async function getWalletBalance(request) {
  const backend = await callBackend("/api/wallet", undefined, request);
  if (
    !backend.offline &&
    backend.data &&
    typeof backend.data.balanceTaka === "number"
  ) {
    return {
      balanceTaka: backend.data.balanceTaka,
      smsRemaining: backend.data.smsRemaining ?? 0,
      smsCostTaka: backend.data.smsCostTaka ?? 0.35,
    };
  }

  const data = await readJson("dashboard.json", {});
  const stat = (data.stats ?? []).find(
    (s) => s.label === "Remaining SMS Balance"
  );
  const balanceTaka =
    Number(stat?.trend?.match(/of ([\d,.]+) total/)?.[1]?.replace(/,/g, "")) ||
    0;
  const smsRemaining =
    Number(String(stat?.value ?? "").replace(/,/g, "")) || 0;

  return { balanceTaka, smsRemaining, smsCostTaka: 0.35 };
}

async function deductWallet(count) {
  if (!Number.isFinite(count) || count <= 0) return null;

  try {
    const res = await fetch(`${BACKEND_URL}/api/wallet/deduct`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) {
      console.error("Wallet deduct failed:", res.status);
      return null;
    }
    return data;
  } catch (error) {
    console.error("Wallet deduct error:", error);
    return null;
  }
}

async function getDashboardData(request) {
  const apiUrl = process.env.SMS_DATA_API;
  let data = null;

  if (apiUrl) {
    try {
      const res = await fetch(`${apiUrl}/dashboard`);
      if (res.ok) data = await res.json();
    } catch {
      /* fall through to the local file */
    }
  }

  data = data ?? (await readJson("dashboard.json", {}));

  let recentMessages = data.recentMessages ?? [];

  try {
    const messages = await getMessages();
    if (Array.isArray(messages) && messages.length > 0) {
      recentMessages = messages.slice(0, 5).map((m) => ({
        id: m.id,
        to: m.to,
        content: m.content,
        status: m.status,
        time: m.time ?? "",
      }));
    }
  } catch {
    /* keep the file-based fallback */
  }

  return {
    stats: data.stats ?? [],
    recentMessages,
    balance: await getWalletBalance(request),
  };
}

const dashboardHandler = async (request) => json(await getDashboardData(request));

async function walletHandler(request) {
  const backend = await callBackend("/api/wallet", undefined, request);
  if (!backend.offline) {
    return json(backend.data, backend.status);
  }

  const session = getSessionUser(request);
  return json({
    balanceTaka: 0,
    smsRemaining: 0,
    smsCostTaka: 0.35,
    userId: sessionUserId(session),
  });
}

/* ------------------------------------------------------------------ *
 * Groups
 * ------------------------------------------------------------------ */

async function getGroups() {
  const apiUrl = process.env.SMS_DATA_API;

  if (apiUrl) {
    try {
      const res = await fetch(`${apiUrl}/groups`);
      if (res.ok) return (await res.json()).groups ?? [];
    } catch {
      /* fall through to the local file */
    }
  }

  const data = await readJson("groups.json", { groups: [] });
  return data.groups ?? [];
}

async function createGroup(name, userId) {
  const newGroup = {
    id: `grp-${Date.now()}`,
    name,
    userId: userId ? String(userId) : "",
    contacts: 0,
    type: "Static",
    createdAt: new Date().toISOString().split("T")[0],
    lastSent: "Never",
  };

  const parsed = await readJson("groups.json", { groups: [] });
  parsed.groups = parsed.groups ?? [];
  parsed.groups.unshift(newGroup);
  await writeJson("groups.json", parsed);

  return newGroup;
}

async function updateGroup(id, name, userId, admin) {
  const parsed = await readJson("groups.json", { groups: [] });
  const groups = parsed.groups ?? [];
  const index = groups.findIndex((g) => g.id === id);
  if (index === -1) return null;

  if (!admin && String(groups[index].userId ?? "") !== String(userId ?? "")) {
    return null;
  }

  groups[index].name = name;
  await writeJson("groups.json", parsed);
  return groups[index];
}

async function deleteGroup(id, userId, admin) {
  const parsed = await readJson("groups.json", { groups: [] });
  const groups = parsed.groups ?? [];
  const index = groups.findIndex((g) => g.id === id);
  if (index === -1) return false;

  if (!admin && String(groups[index].userId ?? "") !== String(userId ?? "")) {
    return false;
  }

  groups.splice(index, 1);
  await writeJson("groups.json", parsed);
  return true;
}

async function callBackend(path, init, request) {
  try {
    const options = { ...(init ?? {}) };
    if (request) {
      const cookie = request.headers.get("cookie");
      if (cookie) {
        options.headers = { ...(options.headers ?? {}), cookie };
      }
      const session = getSessionUser(request);
      if (session) {
        options.headers = {
          ...(options.headers ?? {}),
          "x-sms-user": JSON.stringify(session),
        };
      }
    }
    const res = await fetch(`${BACKEND_URL}${path}`, options);
    const data = await res.json().catch(() => null);
    if (data === null) return { offline: true };
    return { offline: false, status: res.status, data };
  } catch {
    return { offline: true };
  }
}

async function groupsHandler(request) {
  const url = new URL(request.url);
  const session = getSessionUser(request);
  const userId = sessionUserId(session);
  const admin = sessionIsAdmin(session);

  if (request.method === "GET") {
    const backend = await callBackend("/api/groups", undefined, request);
    if (!backend.offline) {
      return json({ groups: backend.data.groups ?? [] }, backend.status);
    }

    const all = await getGroups();
    const groups = admin
      ? all
      : all.filter((g) => String(g.userId ?? "") === String(userId));
    return json({ groups });
  }

  if (request.method === "POST") {
    const body = await request.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : "";

    if (!name) return badRequest("Group name is required.");

    const backend = await callBackend(
      "/api/groups",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      },
      request
    );
    if (!backend.offline) {
      return json(backend.data, backend.status);
    }

    const group = await createGroup(name, userId);
    return json({ success: true, group }, 201);
  }

  if (request.method === "PUT") {
    const body = await request.json().catch(() => null);
    const id = typeof body?.id === "string" ? body.id : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";

    if (!id || !name) {
      return badRequest("Group ID and name are required.");
    }

    const backend = await callBackend(
      "/api/groups",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name }),
      },
      request
    );
    if (!backend.offline) {
      return json(backend.data, backend.status);
    }

    const group = await updateGroup(id, name, userId, admin);
    if (!group) return notFound("Group not found.");

    return json({ success: true, group });
  }

  if (request.method === "DELETE") {
    const id = url.searchParams.get("id");

    if (!id) return badRequest("Group ID is required.");

    const backend = await callBackend(
      `/api/groups?id=${encodeURIComponent(id)}`,
      { method: "DELETE" },
      request
    );
    if (!backend.offline) {
      return json(backend.data, backend.status);
    }

    const success = await deleteGroup(id, userId, admin);
    if (!success) return notFound("Group not found.");

    return json({ success: true });
  }

  return json({ success: false, message: "Method not allowed." }, 405);
}

async function fetchAllContacts(request) {
  const backend = await callBackend("/api/contacts", undefined, request);
  if (!backend.offline) return backend.data.contacts ?? [];

  const parsed = await readJson("contacts.json", {});
  const all = Object.values(parsed).flat();

  const session = getSessionUser(request);
  if (!session || sessionIsAdmin(session)) return all;

  const userId = sessionUserId(session);
  return all.filter((c) => String(c.userId ?? "") === String(userId));
}

async function groupContactsHandler(request, { groupId }) {
  const backend = await callBackend(
    `/api/contacts?groupId=${encodeURIComponent(groupId)}`,
    undefined,
    request
  );
  if (!backend.offline) {
    return json({ contacts: backend.data.contacts ?? [] });
  }

  const contacts = await readJson("contacts.json", {});
  let list = contacts[groupId] ?? [];

  const session = getSessionUser(request);
  if (session && !sessionIsAdmin(session)) {
    const userId = sessionUserId(session);
    list = list.filter((c) => String(c.userId ?? "") === String(userId));
  }

  return json({ contacts: list });
}

/* ------------------------------------------------------------------ *
 * Messages
 * ------------------------------------------------------------------ */

async function getMessages() {
  const apiUrl = process.env.SMS_DATA_API;

  if (apiUrl) {
    try {
      const res = await fetch(`${apiUrl}/messages`);
      if (res.ok) return ((await res.json()).messages ?? []);
    } catch {
      /* fall through to the local file */
    }
  }

  const backend = await callBackend("/api/messages");
  if (!backend.offline && Array.isArray(backend.data?.messages)) {
    return backend.data.messages;
  }

  const data = await readJson("messages.json", { messages: [] });
  return data.messages ?? [];
}

async function messagesHandler(request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const q = searchParams.get("q");
  let userId = searchParams.get("userId");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

  const session = getSessionUser(request);
  if (session && !sessionIsAdmin(session)) {
    userId = String(sessionUserId(session));
  }

  const messages = await getMessages();
  let filtered = messages;

  let senderScoped = messages;
  if (userId) {
    senderScoped = senderScoped.filter((m) => String(m.userId ?? "") === String(userId));
    filtered = senderScoped;
  }

  if (status) filtered = filtered.filter((m) => m.status === status);
  if (type) filtered = filtered.filter((m) => m.type === type);

  if (dateFrom || dateTo) {
    filtered = filtered.filter((m) => {
      if (dateFrom && m.date < dateFrom) return false;
      if (dateTo && m.date > dateTo) return false;
      return true;
    });
  }

  if (q) {
    const query = q.toLowerCase();
    filtered = filtered.filter(
      (m) =>
        m.id.toLowerCase().includes(query) ||
        m.content.toLowerCase().includes(query) ||
        m.to.includes(query) ||
        (m.contact ?? "").toLowerCase().includes(query)
    );
  }

  const totalFiltered = filtered.length;
  const totalPages = Math.ceil(totalFiltered / pageSize);
  const start = (page - 1) * pageSize;
  const paginated = filtered.slice(start, start + pageSize);

  return json({
    messages: paginated,
    total: filtered.length,
    totalFiltered,
    page,
    pageSize,
    totalPages,
    summary: {
      total: senderScoped.length,
      delivered: senderScoped.filter((m) => m.status === "Delivered").length,
      pending: senderScoped.filter((m) => m.status === "Pending").length,
      failed: senderScoped.filter((m) => m.status === "Failed").length,
    },
    filters: {
      status: status ?? "",
      type: type ?? "",
      dateFrom: dateFrom ?? "",
      dateTo: dateTo ?? "",
      q: q ?? "",
      userId: userId ?? "",
    },
  });
}

/* ------------------------------------------------------------------ *
 * Contacts import
 * ------------------------------------------------------------------ */

const FIELD_KEYS = {
  phone: ["phonenumber", "phone", "mobilenumber", "mobile", "number"],
  name: ["name", "fullname"],
  email: ["email", "emailaddress"],
  address: ["address"],
};

function normalizeKey(key) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function pickField(row, aliases) {
  for (const [key, value] of Object.entries(row)) {
    if (aliases.includes(normalizeKey(key))) {
      const v = String(value ?? "").trim();
      if (v.length > 0) return v;
    }
  }
  return "";
}

function toContacts(records) {
  return records
    .map((r) => ({
      phone: pickField(r, FIELD_KEYS.phone),
      name: pickField(r, FIELD_KEYS.name) || undefined,
      email: pickField(r, FIELD_KEYS.email) || undefined,
      address: pickField(r, FIELD_KEYS.address) || undefined,
    }))
    .filter((c) => c.phone.length > 0);
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] ?? "";
    });
    return obj;
  });
}

async function contactsImportHandler(request) {
  const contentType = request.headers.get("content-type") ?? "";
  let groupId;
  let contacts = [];

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    groupId = formData.get("groupId");
    const file = formData.get("file");

    if (!groupId || !file) {
      return badRequest("Group and file are required.");
    }

    const arrayBuffer = await file.arrayBuffer();

    if (file.name.endsWith(".csv")) {
      contacts = toContacts(parseCsv(Buffer.from(arrayBuffer).toString("utf-8")));
    } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      const workbook = XLSX.read(Buffer.from(arrayBuffer), { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) return badRequest("The Excel file has no sheets.");

      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        defval: "",
      });
      contacts = toContacts(rows);
    } else {
      return badRequest("Only CSV and Excel files are supported.");
    }
  } else if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null);
    groupId = body?.groupId;
    const phones = body?.phones;
    const contactList = body?.contacts;

    if (!groupId || (!Array.isArray(phones) && !Array.isArray(contactList))) {
      return badRequest("groupId and phones/contacts array are required.");
    }

    if (Array.isArray(contactList)) {
      contacts = contactList
        .map((c) => ({
          phone: String(c?.phone ?? "").trim(),
          name: c?.name ?? "",
          email: c?.email ?? "",
          address: c?.address ?? "",
        }))
        .filter((c) => c.phone.length > 0);
    } else {
      contacts = phones
        .map((p) => String(p).trim())
        .filter((p) => p.length > 0)
        .map((phone) => ({ phone }));
    }
  } else {
    return badRequest("Unsupported content type.");
  }

  const backend = await callBackend(
    "/api/contacts/import",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, contacts }),
    },
    request
  );
  if (!backend.offline) {
    return json(backend.data, backend.status);
  }

  const session = getSessionUser(request);
  const userId = sessionUserId(session);
  const existing = await readJson("contacts.json", {});
  const list = existing[groupId] ?? [];

  const seen = new Set(list.map((e) => e.phone));
  const duplicates = [];
  let imported = 0;

  for (const c of contacts) {
    if (!c.phone) continue;
    if (seen.has(c.phone)) {
      if (!duplicates.includes(c.phone)) duplicates.push(c.phone);
      continue;
    }
    list.push({ ...c, groupId, userId: userId ? String(userId) : "" });
    seen.add(c.phone);
    imported++;
  }
  existing[groupId] = list;

  await writeJson("contacts.json", existing);

  if (imported > 0) {
    const groupsData = await readJson("groups.json", { groups: [] });
    const groupIndex = (groupsData.groups ?? []).findIndex((g) => g.id === groupId);
    if (groupIndex !== -1) {
      groupsData.groups[groupIndex].contacts = list.length;
      await writeJson("groups.json", groupsData);
    }
  }

  return json({ success: true, imported, duplicates });
}

/* ------------------------------------------------------------------ *
 * Contacts create (single)
 * ------------------------------------------------------------------ */

async function contactsCreateHandler(request) {
  const body = await request.json().catch(() => null);
  const { groupId, phone, name, email, address } = body ?? {};

  if (!groupId) return badRequest("groupId is required.");
  if (!phone || typeof phone !== "string" || phone.trim().length === 0) {
    return badRequest("Phone number is required.");
  }

  const backend = await callBackend(
    "/api/contacts",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, phone: phone.trim(), name: name?.trim() ?? "", email: email?.trim() ?? "", address: address?.trim() ?? "" }),
    },
    request
  );
  if (!backend.offline) {
    return json(backend.data, backend.status);
  }

  const session = getSessionUser(request);
  const userId = sessionUserId(session);
  const existing = await readJson("contacts.json", {});
  const list = existing[groupId] ?? [];

  const seen = new Set(list.map((e) => e.phone));
  const normalizedPhone = phone.trim();

  if (seen.has(normalizedPhone)) {
    return json({ success: false, message: "Contact with this phone number already exists in the group." }, 409);
  }

  const newContact = {
    phone: normalizedPhone,
    name: name?.trim() ?? "",
    email: email?.trim() ?? "",
    address: address?.trim() ?? "",
    groupId,
    userId: userId ? String(userId) : "",
    createdAt: new Date().toISOString(),
  };

  list.push(newContact);
  existing[groupId] = list;
  await writeJson("contacts.json", existing);

  const groupsData = await readJson("groups.json", { groups: [] });
  const groupIndex = (groupsData.groups ?? []).findIndex((g) => g.id === groupId);
  if (groupIndex !== -1) {
    groupsData.groups[groupIndex].contacts = (groupsData.groups[groupIndex].contacts ?? 0) + 1;
    await writeJson("groups.json", groupsData);
  }

  return json({ success: true, contact: newContact }, 201);
}

/* ------------------------------------------------------------------ *
 * Sending SMS
 * ------------------------------------------------------------------ */

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDateTime(d) {
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
  const hours = d.getHours();
  const h12 = hours % 12 || 12;
  const ampm = hours < 12 ? "AM" : "PM";
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const time = `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ${h12}:${minutes} ${ampm}`;
  return { date, time };
}

function renderMessage(template, name) {
  return template.replace(/\{+\s*name\s*\}+/gi, name ?? "");
}

function nextMessageNumber(messages) {
  let max = 0;
  for (const m of messages) {
    const n = parseInt(String(m.id).replace(/[^0-9]/g, ""), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return max + 1;
}

async function saveSentMessages(outgoing, userId) {
  const { date, time } = formatDateTime(new Date());

  const shaped = outgoing.map((o) => ({
    to: o.to,
    contact: o.contact ?? "",
    content: o.content,
    type: o.type ?? "Transactional",
    status: o.status ?? "Delivered",
    date,
    time,
    userId: userId ? String(userId) : "",
  }));

  const backend = await callBackend("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: shaped }),
  });

  if (
    !backend.offline &&
    backend.status >= 200 &&
    backend.status < 300 &&
    Array.isArray(backend.data?.messages)
  ) {
    return backend.data.messages;
  }

  const data = await readJson("messages.json", { messages: [] });
  const messages = Array.isArray(data.messages) ? data.messages : [];

  let next = nextMessageNumber(messages);
  const newMessages = shaped.map((o) => ({
    id: `#SMS-${next++}`,
    ...o,
  }));

  data.messages = [...newMessages, ...messages];
  await writeJson("messages.json", data);

  return newMessages;
}

function digitsOnly(phone) {
  return phone.replace(/[^0-9]/g, "");
}

async function loadNameByPhone(request) {
  const map = new Map();
  const contacts = await fetchAllContacts(request);

  for (const contact of contacts) {
    const key = digitsOnly(contact.phone);
    if (key && contact.name && !map.has(key)) {
      map.set(key, contact.name);
    }
  }

  return map;
}

async function sendViaBackend(recipients, userId, type) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/sms/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: userId != null && userId !== "" ? String(userId) : undefined,
        type,
        recipients,
      }),
    });
    const data = await res.json().catch(() => null);
    if (data === null) return { offline: true };
    return { offline: false, status: res.status, data };
  } catch {
    return { offline: true };
  }
}

async function sendSmsHandler(request) {
  try {
    const body = await request.json().catch(() => null);
    const { numbers, message, type } = body ?? {};
    const session = getSessionUser(request);
    const userId = body?.userId ?? (session ? sessionUserId(session) : undefined);
    const finalType =
      typeof type === "string" && type.trim() ? type.trim() : "Transactional";

    if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
      return json({ error: "No valid numbers provided" }, 400);
    }

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return json({ error: "Message is required" }, 400);
    }

    const nameByPhone = await loadNameByPhone(request);

    const recipients = numbers
      .map((number) => {
        const name = nameByPhone.get(digitsOnly(number));
        return {
          to: String(number),
          contact: name ?? "",
          content: renderMessage(message.trim(), name),
          type: finalType,
        };
      })
      .filter((r) => r.to.trim().length > 0 && r.content.trim().length > 0);

    if (recipients.length === 0) {
      return json({ error: "No valid numbers provided" }, 400);
    }

    const backend = await sendViaBackend(recipients, userId, finalType);
    if (!backend.offline) {
      return json(backend.data, backend.status);
    }

    const results = recipients.map((r) => ({ ...r, success: true }));

    await saveSentMessages(
      results.map((r) => ({
        to: r.to,
        contact: r.contact ?? "",
        content: r.content,
        type: r.type,
        status: "Delivered",
      })),
      userId
    );

    const successCount = results.filter((r) => r.success).length;

    await consumeUserSms(userId, successCount);

    return json({
      success: true,
      sent: successCount,
      failed: results.length - successCount,
      results,
    });
  } catch (error) {
    console.error("Send SMS error:", error);
    return json({ error: "Internal server error" }, 500);
  }
}

async function sendToGroupsHandler(request) {
  const body = await request.json().catch(() => null);
  const groupIds = body?.groupIds;
  const message = body?.message;
  const session = getSessionUser(request);
  const userId = body?.userId ?? (session ? sessionUserId(session) : undefined);
  const type =
    typeof body?.type === "string" && body.type.trim()
      ? body.type.trim()
      : "Transactional";

  if (
    !groupIds ||
    !Array.isArray(groupIds) ||
    groupIds.length === 0 ||
    typeof message !== "string" ||
    !message.trim()
  ) {
    return badRequest("groupIds (array) and message are required.");
  }

  const allContacts = await fetchAllContacts(request);
  const wanted = new Set(groupIds);
  const contacts = allContacts.filter((c) => wanted.has(c.groupId));

  if (contacts.length === 0) {
    return badRequest("No contacts in selected groups.");
  }

  const recipients = contacts.map((contact) => ({
    to: contact.phone,
    contact: contact.name ?? "",
    content: renderMessage(message, contact.name),
    type,
  }));

  const backend = await sendViaBackend(recipients, userId, type);
  if (!backend.offline) {
    return json(backend.data, backend.status);
  }

  const saved = await saveSentMessages(recipients, userId);

  const delivered = saved.filter((m) => m.status === "Delivered").length;
  await consumeUserSms(userId, delivered);

  return json({ success: true, sent: saved.length });
}

/* ------------------------------------------------------------------ *
 * Router
 * ------------------------------------------------------------------ */

async function route(request) {
  const { pathname } = new URL(request.url);

  if (pathname === "/api/auth/login" && request.method === "POST") {
    return loginHandler(request);
  }

  if (pathname === "/api/auth/logout" && request.method === "POST") {
    return logoutHandler();
  }

  if (pathname === "/api/auth/session" && request.method === "GET") {
    return sessionHandler(request);
  }

  if (pathname === "/api/auth/change-password" && request.method === "POST") {
    return changePasswordHandler(request);
  }

  if (pathname === "/api/users" && (request.method === "GET" || request.method === "POST")) {
    return usersHandler(request);
  }

  const userShow = pathname.match(/^\/api\/users\/(\d+)$/);
  if (userShow && request.method === "GET") {
    return userShowHandler(request, { userId: userShow[1] });
  }

  const userSmsAssign = pathname.match(/^\/api\/users\/(\d+)\/sms-assign$/);
  if (userSmsAssign && request.method === "POST") {
    return userSmsAssignHandler(request, { userId: userSmsAssign[1] });
  }

  const userBalance = pathname.match(/^\/api\/users\/(\d+)\/balance$/);
  if (userBalance && request.method === "POST") {
    return userBalanceHandler(request, { userId: userBalance[1] });
  }

  const userConsume = pathname.match(/^\/api\/users\/(\d+)\/consume$/);
  if (userConsume && request.method === "POST") {
    return userConsumeHandler(request, { userId: userConsume[1] });
  }

  if (pathname === "/api/sms-settings" && (request.method === "GET" || request.method === "POST")) {
    return request.method === "GET"
      ? smsSettingsGetHandler(request)
      : smsSettingsPostHandler(request);
  }

  if (pathname === "/api/sms-settings/balance" && request.method === "GET") {
    return smsSettingsBalanceHandler(request);
  }

  if (pathname === "/api/dashboard" && request.method === "GET") {
    return dashboardHandler(request);
  }

  if (pathname === "/api/wallet" && request.method === "GET") {
    return walletHandler(request);
  }

  if (pathname === "/api/groups") {
    return groupsHandler(request);
  }

  const groupContacts = pathname.match(/^\/api\/groups\/contacts\/([^/]+)$/);
  if (groupContacts && request.method === "GET") {
    return groupContactsHandler(request, {
      groupId: decodeURIComponent(groupContacts[1]),
    });
  }

  if (pathname === "/api/messages" && request.method === "GET") {
    return messagesHandler(request);
  }

  if (pathname === "/api/contacts/import" && request.method === "POST") {
    return contactsImportHandler(request);
  }

  if (pathname === "/api/contacts" && request.method === "POST") {
    return contactsCreateHandler(request);
  }

  if (pathname === "/api/send-sms" && request.method === "POST") {
    return sendSmsHandler(request);
  }

  if (pathname === "/api/sms/send" && request.method === "POST") {
    return sendToGroupsHandler(request);
  }

  if (pathname.startsWith("/api/")) {
    return notFound("Endpoint not found.");
  }

  return null;
}

function headersFromNode(nodeHeaders) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(nodeHeaders)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, String(item));
    } else {
      headers.set(key, String(value));
    }
  }
  return headers;
}

function toWebRequest(nodeRequest) {
  const url = `http://${nodeRequest.headers.host ?? "localhost"}${nodeRequest.url ?? "/"}`;
  const method = nodeRequest.method ?? "GET";
  const headers = headersFromNode(nodeRequest.headers);

  const init = { method, headers };
  if (method !== "GET" && method !== "HEAD") {
    init.body = Readable.toWeb(nodeRequest);
    init.duplex = "half";
  }

  return new Request(url, init);
}

async function sendWebResponse(response, nodeResponse) {
  const buffer = Buffer.from(await response.arrayBuffer());

  response.headers.forEach((value, key) => {
    if (key === "set-cookie") return;
    nodeResponse.setHeader(key, value);
  });

  const cookies = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [];
  if (cookies.length > 0) nodeResponse.setHeader("set-cookie", cookies);

  nodeResponse.statusCode = response.status;
  nodeResponse.end(buffer);
}

/**
 * Handles an incoming Node request when it targets the /api namespace.
 * Resolves to `true` when the request was answered.
 */
export async function handleApi(nodeRequest, nodeResponse) {
  const url = nodeRequest.url ?? "/";
  if (!url.startsWith("/api")) return false;

  try {
    const request = toWebRequest(nodeRequest);
    const response = (await route(request)) ?? notFound("Endpoint not found.");
    await sendWebResponse(response, nodeResponse);
  } catch (error) {
    console.error("API error:", error);
    if (!nodeResponse.headersSent) {
      nodeResponse.statusCode = 500;
      nodeResponse.setHeader("Content-Type", "application/json");
    }
    nodeResponse.end(JSON.stringify({ error: "Internal server error" }));
  }

  return true;
}
