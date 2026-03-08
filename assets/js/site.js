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

  const initializeHomeScenes = () => {
    if (body.dataset.page !== "home") {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const sections = Array.from(
      document.querySelectorAll(".hero, main > .section"),
    );

    if (sections.length < 2) {
      return;
    }

    const header = document.querySelector(".site-header");
    const blockedSelector = [
      "input",
      "textarea",
      "select",
      "button",
      "summary",
      "[contenteditable='true']",
      "form",
      "details",
    ].join(",");
    const wheelThreshold = 56;
    const touchThreshold = 72;
    const sceneLockMs = 760;
    let wheelDelta = 0;
    let wheelResetTimer = 0;
    let sceneLockTimer = 0;
    let sceneLocked = false;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchBlocked = false;

    const getHeaderOffset = () => {
      if (!(header instanceof HTMLElement)) {
        return 0;
      }
      return header.offsetHeight;
    };

    const isBlockedTarget = (target) => {
      if (!(target instanceof Element)) {
        return false;
      }
      return Boolean(target.closest(blockedSelector));
    };

    const hasTextFocus = () => {
      const active = document.activeElement;
      if (!(active instanceof Element)) {
        return false;
      }
      return active.matches("input, textarea, select, [contenteditable='true']");
    };

    const getSceneTop = (section) => {
      const headerOffset = getHeaderOffset();
      return Math.max(section.offsetTop - headerOffset, 0);
    };

    const getCurrentSceneIndex = () => {
      const currentTop = window.scrollY;
      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;

      sections.forEach((section, index) => {
        const distance = Math.abs(getSceneTop(section) - currentTop);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });

      return nearestIndex;
    };

    const releaseSceneLock = () => {
      window.clearTimeout(sceneLockTimer);
      sceneLockTimer = window.setTimeout(() => {
        sceneLocked = false;
      }, sceneLockMs);
    };

    const scrollToScene = (index) => {
      const nextIndex = Math.max(0, Math.min(index, sections.length - 1));
      const targetTop = getSceneTop(sections[nextIndex]);

      if (Math.abs(window.scrollY - targetTop) < 8) {
        return;
      }

      sceneLocked = true;
      window.scrollTo({
        top: targetTop,
        behavior: "smooth",
      });
      releaseSceneLock();
    };

    const moveScene = (direction) => {
      if (sceneLocked || direction === 0) {
        return false;
      }

      const currentIndex = getCurrentSceneIndex();
      const nextIndex = currentIndex + direction;

      if (nextIndex < 0 || nextIndex >= sections.length) {
        return false;
      }

      scrollToScene(nextIndex);
      return true;
    };

    window.addEventListener(
      "wheel",
      (event) => {
        if (
          event.ctrlKey ||
          hasTextFocus() ||
          isBlockedTarget(event.target) ||
          Math.abs(event.deltaY) <= Math.abs(event.deltaX)
        ) {
          return;
        }

        wheelDelta += event.deltaY;
        window.clearTimeout(wheelResetTimer);
        wheelResetTimer = window.setTimeout(() => {
          wheelDelta = 0;
        }, 160);

        if (Math.abs(wheelDelta) < wheelThreshold) {
          return;
        }

        const direction = wheelDelta > 0 ? 1 : -1;
        wheelDelta = 0;
        if (moveScene(direction)) {
          event.preventDefault();
        }
      },
      { passive: false },
    );

    window.addEventListener("keydown", (event) => {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        hasTextFocus() ||
        isBlockedTarget(event.target)
      ) {
        return;
      }

      let direction = 0;

      if (
        event.key === "ArrowDown" ||
        event.key === "PageDown" ||
        event.key === " "
      ) {
        direction = 1;
      }

      if (event.key === "ArrowUp" || event.key === "PageUp") {
        direction = -1;
      }

      if (direction === 0) {
        return;
      }

      if (!moveScene(direction)) {
        return;
      }

      event.preventDefault();
    });

    window.addEventListener(
      "touchstart",
      (event) => {
        if (event.touches.length !== 1) {
          touchBlocked = true;
          return;
        }

        touchBlocked = isBlockedTarget(event.target);
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
      },
      { passive: true },
    );

    window.addEventListener(
      "touchend",
      (event) => {
        if (sceneLocked || touchBlocked || event.changedTouches.length !== 1) {
          return;
        }

        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;

        if (
          Math.abs(deltaY) < touchThreshold ||
          Math.abs(deltaY) <= Math.abs(deltaX)
        ) {
          return;
        }

        moveScene(deltaY < 0 ? 1 : -1);
      },
      { passive: true },
    );
  };

  initializeHomeScenes();

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
