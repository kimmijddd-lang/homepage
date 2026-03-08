(() => {
  const body = document.body;
  const navToggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");

  if (navToggle && nav) {
    navToggle.addEventListener("click", () => {
      const expanded = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!expanded));
      nav.classList.toggle("is-open", !expanded);
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  const currentPath = window.location.pathname.replace(/\/$/, "") || "/";
  document.querySelectorAll("[data-nav] a[href]").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("http")) {
      return;
    }
    const normalized = href.replace(/\/$/, "") || "/";
    if (normalized === currentPath) {
      link.setAttribute("aria-current", "page");
    }
  });

  document.querySelectorAll("[data-current-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });

  const storageKey = "taxdy_utm";
  const params = new URLSearchParams(window.location.search);
  const baseUtm = { utm_source: "", utm_medium: "", utm_campaign: "" };
  let stored = baseUtm;

  try {
    stored = {
      ...baseUtm,
      ...JSON.parse(window.localStorage.getItem(storageKey) || "{}"),
    };
  } catch (_error) {
    stored = baseUtm;
  }

  Object.keys(baseUtm).forEach((key) => {
    const value = params.get(key);
    if (value) {
      stored[key] = value;
    }
  });

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(stored));
  } catch (_error) {
    // Ignore storage failures.
  }

  Object.entries(stored).forEach(([key, value]) => {
    document.querySelectorAll(`input[name="${key}"]`).forEach((input) => {
      input.value = value;
    });
  });

  document.querySelectorAll('input[name="source_page"]').forEach((input) => {
    input.value = currentPath;
  });

  const trackEvent = (eventName, payload = {}) => {
    if (!eventName) {
      return;
    }
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, payload);
      return;
    }
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: eventName, ...payload });
  };

  document.querySelectorAll("[data-event]").forEach((node) => {
    node.addEventListener("click", () => {
      trackEvent(node.getAttribute("data-event"), {
        page_path: currentPath,
        link_url: node.getAttribute("href") || "",
      });
    });
  });

  document.querySelectorAll("form[data-track-submit]").forEach((form) => {
    form.addEventListener("submit", () => {
      trackEvent(form.getAttribute("data-track-submit"), {
        page_path: currentPath,
        form_name: form.getAttribute("name") || "contact_form",
      });
    });
  });
})();
