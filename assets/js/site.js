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
    const faqItems = Array.from(
      document.querySelectorAll(".faq-scene-list .faq-item"),
    );
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
    const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
    const mobileViewportQuery = window.matchMedia("(max-width: 980px)");
    const wheelThreshold = 56;
    const touchThreshold = 48;
    const sceneLockMs = 680;
    const scrollSettleDelay = 140;
    let wheelDelta = 0;
    let wheelResetTimer = 0;
    let sceneLockTimer = 0;
    let scrollSettleTimer = 0;
    let resizeSnapTimer = 0;
    let sceneLocked = false;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchCurrentX = 0;
    let touchCurrentY = 0;
    let touchStartSceneIndex = 0;
    let touchBlocked = false;

    const isTouchSceneMode = () =>
      coarsePointerQuery.matches || mobileViewportQuery.matches;

    const updateFaqSceneMode = () => {
      const hasOpenFaq = faqItems.some((item) => item.open);
      body.classList.toggle("home-scene-free-scroll", hasOpenFaq);
    };

    const isFreeScrollMode = () =>
      body.classList.contains("home-scene-free-scroll");

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

    const settleToNearestScene = (behavior = "smooth") => {
      if (sceneLocked || hasTextFocus() || isFreeScrollMode()) {
        return;
      }

      const nearestIndex = getCurrentSceneIndex();
      const targetTop = getSceneTop(sections[nearestIndex]);

      if (Math.abs(window.scrollY - targetTop) < 10) {
        return;
      }

      sceneLocked = true;
      window.scrollTo({
        top: targetTop,
        behavior,
      });
      releaseSceneLock();
    };

    const moveScene = (direction) => {
      if (sceneLocked || direction === 0 || isFreeScrollMode()) {
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

    const moveSceneFromIndex = (startIndex, direction) => {
      if (sceneLocked || direction === 0 || isFreeScrollMode()) {
        return false;
      }

      const nextIndex = startIndex + direction;

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
          isFreeScrollMode() ||
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
        isFreeScrollMode() ||
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
        touchCurrentX = touchStartX;
        touchCurrentY = touchStartY;
        touchStartSceneIndex = getCurrentSceneIndex();
      },
      { passive: true },
    );

    window.addEventListener(
      "touchmove",
      (event) => {
        if (touchBlocked || sceneLocked || event.touches.length !== 1) {
          return;
        }

        touchCurrentX = event.touches[0].clientX;
        touchCurrentY = event.touches[0].clientY;

        if (!isTouchSceneMode()) {
          return;
        }

        if (isFreeScrollMode()) {
          return;
        }

        const deltaX = touchCurrentX - touchStartX;
        const deltaY = touchCurrentY - touchStartY;

        if (
          Math.abs(deltaY) > 12 &&
          Math.abs(deltaY) > Math.abs(deltaX) + 8
        ) {
          event.preventDefault();
        }
      },
      { passive: false },
    );

    window.addEventListener(
      "touchend",
      (event) => {
        if (sceneLocked || touchBlocked || event.changedTouches.length !== 1) {
          return;
        }

        if (isFreeScrollMode()) {
          return;
        }

        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;

        if (
          Math.abs(deltaY) < touchThreshold ||
          Math.abs(deltaY) <= Math.abs(deltaX)
        ) {
          if (isTouchSceneMode()) {
            window.clearTimeout(scrollSettleTimer);
            scrollSettleTimer = window.setTimeout(() => {
              settleToNearestScene();
            }, scrollSettleDelay);
          }
          return;
        }

        moveSceneFromIndex(touchStartSceneIndex, deltaY < 0 ? 1 : -1);
      },
      { passive: true },
    );

    window.addEventListener(
      "scroll",
      () => {
        if (
          !isTouchSceneMode() ||
          sceneLocked ||
          hasTextFocus() ||
          isFreeScrollMode()
        ) {
          return;
        }

        window.clearTimeout(scrollSettleTimer);
        scrollSettleTimer = window.setTimeout(() => {
          settleToNearestScene();
        }, scrollSettleDelay);
      },
      { passive: true },
    );

    window.addEventListener("resize", () => {
      window.clearTimeout(resizeSnapTimer);
      resizeSnapTimer = window.setTimeout(() => {
        if (sceneLocked || isFreeScrollMode()) {
          return;
        }

        const currentIndex = getCurrentSceneIndex();
        const targetTop = getSceneTop(sections[currentIndex]);

        if (Math.abs(window.scrollY - targetTop) < 6) {
          return;
        }

        window.scrollTo(0, targetTop);
      }, 120);
    });

    faqItems.forEach((item) => {
      item.addEventListener("toggle", () => {
        updateFaqSceneMode();
      });
    });

    updateFaqSceneMode();
  };

  initializeHomeScenes();

  // Nav dropdown
  document.querySelectorAll(".nav-dropdown-trigger").forEach((trigger) => {
    const menu = trigger.nextElementSibling;
    if (!menu) return;

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = trigger.getAttribute("aria-expanded") === "true";
      trigger.setAttribute("aria-expanded", String(!isOpen));
      menu.classList.toggle("is-open", !isOpen);
    });

    // Close dropdown when clicking a link inside it
    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        trigger.setAttribute("aria-expanded", "false");
        menu.classList.remove("is-open");
      });
    });
  });

  // Close dropdown on outside click
  document.addEventListener("click", () => {
    document.querySelectorAll(".nav-dropdown-trigger").forEach((trigger) => {
      trigger.setAttribute("aria-expanded", "false");
      const menu = trigger.nextElementSibling;
      if (menu) menu.classList.remove("is-open");
    });
  });

  // FAQ accordion — one open at a time + scroll into view
  document.querySelectorAll(".faq-grid, .faq-scene-list").forEach((group) => {
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
