import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { useAuth } from "./composables/useAuth";
import "./style.css";

const originalFetch = window.fetch.bind(window);

window.fetch = async (...args) => {
  const response = await originalFetch(...args);

  if (response.status === 401 || response.status === 403) {
    const url =
      typeof args[0] === "string"
        ? args[0]
        : args[0] instanceof Request
          ? args[0].url
          : "";

    if (url.includes("/api/") && !url.includes("/api/auth/login")) {
      useAuth().logout();
      if (router.currentRoute.value.path !== "/login") {
        router.push("/login");
      }
    }
  }

  return response;
};

createApp(App).use(router).mount("#app");
