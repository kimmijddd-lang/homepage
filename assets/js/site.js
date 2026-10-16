(() => {
  const body = document.body;
  const navToggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");

  if (navToggle && nav) {
    const isNavOpen = () => navToggle.getAttribute("aria-expanded") === "true";
    const setNavOpen = (open) => {
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
      nav.classList.toggle("is-open", open);
      body.classList.toggle("nav-open", open);
    };

    // 메뉴 바깥(어둡게 덮인 부분 포함)을 누르면 닫는다.
    document.addEventListener("click", (event) => {
      if (isNavOpen() && !nav.contains(event.target) && !navToggle.contains(event.target)) {
        setNavOpen(false);
      }
    });

    // PC 폭으로 바뀌면 열린 상태를 정리한다.
    window.matchMedia("(min-width: 821px)").addEventListener("change", (event) => {
      if (event.matches) setNavOpen(false);
    });

    navToggle.addEventListener("click", () => {
      setNavOpen(!isNavOpen());
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setNavOpen(false));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isNavOpen()) {
        setNavOpen(false);
        navToggle.focus();
      }
    });
  }

  const currentPath = window.location.pathname.replace(/\/$/, "") || "/";

  // 예전에 공유한 /#consult, /#inquiry 링크는 상담 신청 페이지로 안내한다.
  // 해시는 서버가 읽을 수 없어 브라우저에서 처리하고, UTM 등 쿼리는 그대로 넘긴다.
  const legacyAnchor = window.location.hash.replace("#", "");
  if (
    currentPath === "/" &&
    (legacyAnchor === "consult" || legacyAnchor === "inquiry") &&
    !document.getElementById(legacyAnchor)
  ) {
    window.location.replace(`/contact${window.location.search}`);
    return;
  }

  document.querySelectorAll("[data-nav] a[href]").forEach((link) => {
    const href = link.getAttribute("href");
    if (
      !href ||
      href.startsWith("http") ||
      href.includes("#") ||
      link.classList.contains("button")
    ) {
      return;
    }
    const normalized = href.replace(/\/$/, "") || "/";
    const inSection = normalized !== "/" && currentPath.startsWith(`${normalized}/`);
    if (normalized === currentPath || inSection) {
      link.setAttribute("aria-current", "page");
    }
  });

  const syncViewportMetrics = () => {
    const header = document.querySelector(".site-header");
    const viewportHeight = Math.round(
      window.visualViewport?.height || window.innerHeight,
    );

    document.documentElement.style.setProperty(
      "--app-viewport-height",
      `${viewportHeight}px`,
    );

    if (header instanceof HTMLElement) {
      document.documentElement.style.setProperty(
        "--site-header-height",
        `${header.offsetHeight}px`,
      );
    }
  };

  syncViewportMetrics();
  window.addEventListener("resize", syncViewportMetrics, { passive: true });
  window.addEventListener("orientationchange", syncViewportMetrics);
  window.visualViewport?.addEventListener("resize", syncViewportMetrics);
  window.visualViewport?.addEventListener("scroll", syncViewportMetrics);

  // FAQ accordion — one open at a time + scroll into view
  document.querySelectorAll(".faq-grid").forEach((group) => {
    const items = Array.from(group.querySelectorAll(".faq-item"));
    items.forEach((item) => {
      item.addEventListener("toggle", () => {
        if (!item.open) return;
        items.forEach((other) => {
          if (other !== item && other.open) other.open = false;
        });
        requestAnimationFrame(() => {
          const summary = item.querySelector("summary");
          if (summary) {
            summary.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        });
      });
    });
  });

  // Carry only campaign labels across this visit; never store form contents.
  const storageKey = "taxdy_visit_source_v2";
  const params = new URLSearchParams(window.location.search);
  const baseUtm = { utm_source: "", utm_medium: "", utm_campaign: "", utm_content: "" };
  const now = Date.now();
  const lifetime = 30 * 60 * 1000;
  const cleanLabel = (value) => typeof value === "string" && /^[a-zA-Z0-9_.-]{1,80}$/.test(value) ? value : "";
  let stored = { ...baseUtm };
  let timestamp = now;
  try {
    const previous = JSON.parse(window.sessionStorage.getItem(storageKey) || "null");
    if (previous && typeof previous.timestamp === "number" && now >= previous.timestamp && now - previous.timestamp < lifetime) {
      Object.keys(baseUtm).forEach((key) => { stored[key] = cleanLabel(previous.labels?.[key]); });
      timestamp = previous.timestamp;
    }
    window.localStorage.removeItem("taxdy_utm");
  } catch (_error) { /* Storage restrictions do not prevent consultation. */ }
  if (Object.keys(baseUtm).some((key) => params.has(key))) {
    // A new campaign starts fresh rather than mixing with the previous one.
    stored = { ...baseUtm };
    timestamp = now;
    Object.keys(baseUtm).forEach((key) => { stored[key] = cleanLabel(params.get(key)); });
  }
  try { window.sessionStorage.setItem(storageKey, JSON.stringify({ timestamp, labels: stored })); } catch (_error) {}
  Object.entries(stored).forEach(([key, value]) => {
    document.querySelectorAll(`input[name="${key}"]`).forEach((input) => { input.value = value; });
  });
  document.querySelectorAll('input[name="source_page"]').forEach((input) => { input.value = currentPath; });

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
