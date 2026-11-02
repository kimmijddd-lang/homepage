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

  // 방문 분석 이벤트. head 의 GA4 태그가 gtag 를 만들어 두면 GA4 로 보내고(미리보기·로컬은 디버그 모드),
  // 태그가 없는 주소에서는 dataLayer 에만 남긴다.
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

  const readSession = (key) => {
    try {
      return JSON.parse(window.sessionStorage.getItem(key) || "null");
    } catch (_error) {
      return null;
    }
  };
  const writeSession = (key, value) => {
    try {
      if (value === null) window.sessionStorage.removeItem(key);
      else window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch (_error) { /* 저장이 막혀 있어도 상담·이동은 그대로 된다. */ }
  };

  // 버튼 위치: 가장 가까운 data-loc (hero, sticky_bar, footer_cta, header …), 없으면 머리글·바닥글·구역 id
  const locationOf = (node) => {
    const tagged = node.closest("[data-loc]");
    if (tagged) return tagged.getAttribute("data-loc");
    if (node.closest(".mobile-bar")) return "sticky_bar";
    if (node.closest("header")) return "header";
    if (node.closest("footer")) return "footer";
    const section = node.closest("section[id], [id]");
    return section ? section.id : "body";
  };

  // 링크 주소로 이벤트 이름을 정한다: 카톡 채널 → click_kakao, 전화 → click_call, 신청서 → click_form
  const eventFor = (link) => {
    const href = link.getAttribute("href") || "";
    if (href.startsWith("tel:")) return "click_call";
    let url;
    try {
      url = new URL(href, window.location.href);
    } catch (_error) {
      return link.getAttribute("data-event");
    }
    if (url.hostname === "pf.kakao.com") return "click_kakao";
    if (url.origin === window.location.origin && url.pathname.replace(/\/$/, "") === "/contact") return "click_form";
    return link.getAttribute("data-event");
  };

  const formOriginKey = "taxdy_form_origin_v1";
  const leadKey = "taxdy_lead_pending_v1";

  document.addEventListener("click", (event) => {
    const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!link) return;
    const name = eventFor(link);
    if (!name) return;
    const buttonLocation = locationOf(link);
    trackEvent(name, {
      page_path: currentPath,
      button_location: buttonLocation,
      link_url: link.getAttribute("href") || "",
    });
    if (name === "click_form") {
      writeSession(formOriginKey, { page_path: currentPath, button_location: buttonLocation, timestamp: Date.now() });
    }
  });

  // 신청서 제출: 보내는 순간 표시값만 남기고, 신청 완료 화면에서 그 표시가 있을 때 한 번만 generate_lead 를 보낸다.
  // (직접 접속·새로고침은 신청 건수로 잡지 않는다.) 문서(document)에서 받으므로 폼 확인 검사(consult-form.js)가 막은 제출은 건너뛴다.
  const leadForm = document.querySelector("form[data-lead-form]");
  if (leadForm) {
    // 미리보기 주소에서도 같은 주소의 완료 화면으로 돌아오게 한다 (운영 주소에서는 config 값과 같다).
    const next = leadForm.querySelector('input[name="_next"]');
    if (next) next.value = `${window.location.origin}/contact/thanks`;
  }
  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.hasAttribute("data-lead-form") || event.defaultPrevented) return;
    const saved = readSession(formOriginKey);
    const origin = saved && typeof saved.timestamp === "number" && Date.now() - saved.timestamp < lifetime ? saved : null;
    writeSession(leadKey, {
      timestamp: Date.now(),
      origin_path: origin?.page_path || "",
      origin_location: origin?.button_location || "",
    });
  });

  if (currentPath === "/contact/thanks") {
    const pending = readSession(leadKey);
    writeSession(leadKey, null);
    if (pending && typeof pending.timestamp === "number" && Date.now() - pending.timestamp < 60 * 60 * 1000) {
      trackEvent("generate_lead", {
        page_path: "/contact",
        button_location: "contact_form",
        origin_path: pending.origin_path || "direct",
        origin_location: pending.origin_location || "direct",
      });
    }
  }
})();
