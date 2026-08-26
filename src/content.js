(() => {
  "use strict";

  const APP_ID = "rtvrx-app";
  const ACTIVE_CLASS = "rtvrx-active";
  const BOOTING_CLASS = "rtvrx-booting";
  const DISABLED_CLASS = "rtvrx-disabled";
  const PASSTHROUGH_CLASS = "rtvrx-passthrough";
  const DEFAULTS = {
    enabled: true,
    theme: "system",
    fontScale: 1,
    readingWidth: 720,
  };

  const NAV_ITEMS = [
    ["Headsets", "/sections/xr-headset-review-accessories/"],
    ["Games", "/sections/xr-game-review-preview-software/"],
    ["Meta Quest", "/sections/meta-quest-3-news-reviews/"],
    ["PC VR", "/sections/pc-vr-news-reviews/"],
    ["PSVR 2", "/sections/playstation-vr-psvr-2-news-reviews/"],
    ["Android XR", "/sections/android-xr-galaxy-xr-news-reviews/"],
    ["XR Industry", "/sections/ar-mr-xr-vr-industry-news/"],
    ["Design", "/sections/ar-vr-mr-xr-design-development/"],
  ];

  let settings = { ...DEFAULTS };
  let app = null;
  let scrollHandler = null;

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  function create(tag, options = {}, children = []) {
    const element = document.createElement(tag);

    for (const [key, value] of Object.entries(options)) {
      if (value == null) continue;
      if (key === "className") element.className = value;
      else if (key === "text") element.textContent = value;
      else if (key === "dataset") Object.assign(element.dataset, value);
      else if (key === "style") Object.assign(element.style, value);
      else if (key === "html") element.innerHTML = value;
      else element.setAttribute(key, value);
    }

    const normalizedChildren = Array.isArray(children) ? children : [children];
    for (const child of normalizedChildren) {
      if (child == null) continue;
      element.append(child.nodeType ? child : document.createTextNode(String(child)));
    }
    return element;
  }

  function makeLink(className, href, children, label) {
    const link = create("a", { className, href }, children);
    if (label) link.setAttribute("aria-label", label);
    return link;
  }

  function cleanText(value = "") {
    return value.replace(/\s+/g, " ").trim();
  }

  function absoluteUrl(value) {
    if (!value) return "";
    try {
      return new URL(value, location.href).href;
    } catch {
      return "";
    }
  }

  function imageFrom(container) {
    const image = $("img", container);
    const imageUrl = image?.currentSrc || image?.src || image?.dataset?.src || image?.dataset?.lazySrc;
    if (imageUrl) return absoluteUrl(imageUrl);

    const backgroundNode = $(".entry-thumb, [style*='background-image']", container);
    const background = backgroundNode?.style?.backgroundImage || getComputedStyle(backgroundNode || container).backgroundImage;
    const match = background?.match(/url\(["']?(.*?)["']?\)/i);
    return absoluteUrl(match?.[1] || "");
  }

  function categoryFor(title, explicit = "") {
    if (explicit) return cleanText(explicit).replace(/^More\s+/i, "");
    const value = title.toLowerCase();
    if (value.includes("review")) return "Reviews";
    if (value.includes("quest") || value.includes("meta ")) return "Meta Quest";
    if (value.includes("psvr") || value.includes("playstation")) return "PSVR 2";
    if (value.includes("steam") || value.includes("pc vr") || value.includes("valve")) return "PC VR";
    if (value.includes("design") || value.includes("developer") || value.includes("interface")) return "XR Design";
    if (value.includes("glasses") || value.includes("headset") || value.includes("android xr") || value.includes("pico")) return "Hardware";
    if (value.includes("game") || value.includes("shooter") || value.includes("adventure")) return "Games";
    return "XR News";
  }

  function extractPosts() {
    const candidates = $$(
      ".td-module-container, .td_module_wrap, .tdb_module_loop, .td_module_flex, .tdb_module_template"
    );
    const seen = new Set();
    const posts = [];

    for (const candidate of candidates) {
      const titleLink = $(".entry-title a, h1 a, h2 a, h3 a", candidate);
      const title = cleanText(titleLink?.textContent || titleLink?.getAttribute("title") || "");
      const href = absoluteUrl(titleLink?.href || "");
      if (!title || !href || seen.has(href) || href.includes("#respond") || href.includes("#comments")) continue;

      const block = candidate.closest(".td_block_wrap, section, article") || candidate.parentElement;
      const explicitCategory = $(".td-block-title, .tdb-title-text, .entry-category, .td-post-category", block || candidate)?.textContent;
      const dateNode = $("time, .td-post-date, .td-module-date", candidate);
      const commentText = cleanText($(".td-module-comments, [class*='comment']", candidate)?.textContent || "");
      const excerpt = cleanText($(".td-excerpt, .td-module-excerpt, .td-excerpt-content", candidate)?.textContent || "");

      seen.add(href);
      posts.push({
        title,
        href,
        image: imageFrom(candidate),
        date: cleanText(dateNode?.textContent || ""),
        datetime: dateNode?.getAttribute("datetime") || "",
        comments: Number.parseInt(commentText, 10) || 0,
        excerpt,
        category: categoryFor(title, explicitCategory || ""),
      });
    }

    return posts;
  }

  function makeBrand() {
    return makeLink("rtvrx-brand", "https://roadtovr.com/", [
      create("span", { className: "rtvrx-brand-eye", "aria-hidden": "true" }, [
        create("i"),
      ]),
      create("span", { className: "rtvrx-brand-word" }, [
        create("b", { text: "ROAD TO" }),
        create("strong", { text: "VR" }),
      ]),
      create("span", { className: "rtvrx-brand-edition", text: "HORIZON" }),
    ], "Road to VR home");
  }

  function makeHeader(isArticle = false) {
    const header = create("header", { className: "rtvrx-header" });
    const top = create("div", { className: "rtvrx-header-inner rtvrx-shell" }, [
      makeBrand(),
      create("nav", { className: "rtvrx-nav", "aria-label": "Primary" },
        NAV_ITEMS.slice(0, 5).map(([label, href]) => makeLink("", href, label))
      ),
      create("div", { className: "rtvrx-header-tools" }, [
        create("button", {
          className: "rtvrx-icon-button",
          type: "button",
          "data-action": "search",
          "aria-label": "Search Road to VR",
          text: "⌕",
        }),
        create("button", {
          className: "rtvrx-icon-button rtvrx-theme-button",
          type: "button",
          "data-action": "theme",
          "aria-label": "Change color theme",
          text: "◐",
        }),
      ]),
    ]);

    const subnav = create("nav", { className: "rtvrx-subnav rtvrx-shell", "aria-label": "Explore sections" },
      NAV_ITEMS.map(([label, href]) => makeLink("", href, label))
    );

    const search = create("form", { className: "rtvrx-search", role: "search" }, [
      create("label", { for: "rtvrx-search-input", text: "Search stories" }),
      create("input", {
        id: "rtvrx-search-input",
        name: "s",
        type: "search",
        placeholder: "Quest, SteamVR, Android XR…",
        autocomplete: "off",
      }),
      create("button", { type: "submit", text: "Search" }),
      create("button", {
        type: "button",
        className: "rtvrx-search-close",
        "data-action": "search-close",
        "aria-label": "Close search",
        text: "×",
      }),
    ]);
    search.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = cleanText($("input", search).value);
      if (query) location.href = `https://roadtovr.com/?s=${encodeURIComponent(query)}`;
    });

    header.append(top, subnav, search);
    if (isArticle) {
      header.append(create("div", { className: "rtvrx-progress", "aria-hidden": "true" }, [create("i") ]));
    }
    return header;
  }

  function storyMeta(post) {
    const parts = [];
    if (post.date) parts.push(create("time", { datetime: post.datetime || null, text: post.date }));
    if (post.comments) parts.push(create("span", { text: `${post.comments} comment${post.comments === 1 ? "" : "s"}` }));
    return create("div", { className: "rtvrx-meta" }, parts);
  }

  function makeStoryCard(post, variant = "standard", index = 0) {
    const card = create("article", {
      className: `rtvrx-card rtvrx-card-${variant} rtvrx-reveal`,
      style: { "--rtvrx-delay": `${Math.min(index * 65, 390)}ms` },
    });

    const media = makeLink("rtvrx-card-media", post.href, [], `Read ${post.title}`);
    if (post.image) media.style.backgroundImage = `url("${post.image.replaceAll('"', "%22")}")`;
    media.append(create("span", { className: "rtvrx-card-shade" }));

    const body = create("div", { className: "rtvrx-card-body" }, [
      create("span", { className: "rtvrx-kicker", text: post.category }),
      create("h2", {}, [makeLink("", post.href, post.title)]),
      post.excerpt ? create("p", { text: post.excerpt }) : null,
      storyMeta(post),
    ]);
    card.append(media, body, makeSaveButton(post));
    return card;
  }

  function makeSaveButton(post) {
    return create("button", {
      className: "rtvrx-save",
      type: "button",
      "data-action": "save",
      "data-url": post.href,
      "data-title": post.title,
      "data-image": post.image || "",
      "aria-label": `Save ${post.title}`,
      title: "Save story",
      text: "+",
    });
  }

  function makeSectionHeading(eyebrow, title, link = null) {
    return create("div", { className: "rtvrx-section-heading" }, [
      create("div", {}, [
        create("span", { text: eyebrow }),
        create("h2", { text: title }),
      ]),
      link ? makeLink("", link, "View all →") : null,
    ]);
  }

  function pageLabel() {
    if (location.search.includes("s=")) {
      return `Search results for “${new URLSearchParams(location.search).get("s") || ""}”`;
    }
    if (location.pathname.startsWith("/sections/")) {
      const title = cleanText($("h1, .tdb-title-text, .td-page-title")?.textContent || "");
      return title || "Explore the frontier";
    }
    return "The future, in focus";
  }

  function buildHome(posts) {
    const main = create("main", { className: "rtvrx-home" });
    const shell = create("div", { className: "rtvrx-shell" });
    const intro = create("section", { className: "rtvrx-home-intro rtvrx-reveal is-visible" }, [
      create("p", { text: "INDEPENDENT XR JOURNALISM · SINCE 2011" }),
      create("h1", { text: pageLabel() }),
      create("span", { text: "News, reviews, and deeply reported stories from the edge of spatial computing." }),
    ]);

    const lead = create("section", { className: "rtvrx-lead-grid", "aria-label": "Top stories" });
    if (posts[0]) lead.append(makeStoryCard(posts[0], "hero", 0));
    const side = create("div", { className: "rtvrx-lead-side" });
    posts.slice(1, 5).forEach((post, index) => side.append(makeStoryCard(post, "compact", index + 1)));
    if (side.childElementCount) lead.append(side);

    const latestPosts = posts.slice(5, 17);
    const latest = create("section", { className: "rtvrx-latest" }, [
      makeSectionHeading("Signal / 01", "Latest from the frontier", "/"),
      create("div", { className: "rtvrx-latest-list" },
        latestPosts.map((post, index) => makeStoryCard(post, "row", index))
      ),
    ]);

    const featurePosts = posts.slice(17, 24);
    const features = featurePosts.length ? create("section", { className: "rtvrx-features" }, [
      makeSectionHeading("Deep reads / 02", "Stories worth your time", "/sections/headliner/"),
      create("div", { className: "rtvrx-feature-track" },
        featurePosts.map((post, index) => makeStoryCard(post, "feature", index))
      ),
    ]) : null;

    const manifesto = create("aside", { className: "rtvrx-manifesto rtvrx-reveal" }, [
      create("span", { text: "ROAD TO VR" }),
      create("p", { text: "Reality is expanding. Keep your eyes on the horizon." }),
      makeLink("", "/vr-newsletter-daily-roundup/", "Get the daily roundup →"),
    ]);

    shell.append(intro, lead, latest, features, manifesto);
    main.append(shell);
    return main;
  }

  function cleanArticleClone(source) {
    const clone = source.cloneNode(true);
    const removals = [
      "script", "style", "noscript", "form", ".adsbygoogle", ".td-a-rec", ".td-post-sharing",
      ".sharedaddy", ".jp-relatedposts", ".code-block", "[id*='google_ads']", "[class*='ad-container']",
      "[class*='advertisement']", "span[id^='more-']",
    ];
    $$(removals.join(","), clone).forEach((node) => node.remove());

    $$('*', clone).forEach((node) => {
      node.removeAttribute("style");
      node.removeAttribute("width");
      node.removeAttribute("height");
      node.removeAttribute("onclick");
      if (node.tagName === "IMG") {
        if (!node.getAttribute("src")) {
          node.setAttribute("src", node.dataset.src || node.dataset.lazySrc || "");
        }
        node.setAttribute("loading", "lazy");
        node.setAttribute("decoding", "async");
      }
      if (node.tagName === "A") {
        const href = absoluteUrl(node.getAttribute("href") || "");
        if (href) node.setAttribute("href", href);
        if (href && new URL(href).origin !== location.origin) {
          node.setAttribute("target", "_blank");
          node.setAttribute("rel", "noopener noreferrer");
        }
      }
    });
    return clone;
  }

  function articleData() {
    const contentSource = $(".tdb_single_content .tdb-block-inner") || $(".tdb_single_content") || $(".td-post-content") || $(".entry-content");
    if (!contentSource) return null;

    const title = cleanText($(".tdb-title-text, h1.entry-title, article h1")?.textContent || document.title.split("|")[0]);
    const authorNode = $(".tdb-author-name, [rel='author'], .author a");
    const dateNode = $("article time, .tdb_single_date time, time.entry-date");
    const categoryNode = $(".tdb-entry-category a, .td-post-category a, .entry-category a, article [rel='category tag']");
    const heroImage = $(".tdb_single_featured_image img, article .entry-thumb, .td-post-featured-image img");
    const clone = cleanArticleClone(contentSource);
    const text = cleanText(clone.textContent || "");
    const description = $("meta[name='description']")?.content || cleanText($("p", clone)?.textContent || "");

    return {
      title,
      author: cleanText(authorNode?.textContent || "Road to VR"),
      authorHref: absoluteUrl(authorNode?.href || ""),
      date: cleanText(dateNode?.textContent || ""),
      datetime: dateNode?.getAttribute("datetime") || "",
      category: cleanText(categoryNode?.textContent || categoryFor(title)),
      categoryHref: absoluteUrl(categoryNode?.href || "/"),
      image: absoluteUrl(heroImage?.currentSrc || heroImage?.src || heroImage?.dataset?.src || ""),
      caption: cleanText($(".tdb_single_featured_image figcaption, .wp-caption-text")?.textContent || heroImage?.alt || ""),
      description,
      content: clone,
      minutes: Math.max(1, Math.round(text.split(/\s+/).length / 220)),
    };
  }

  function makeArticle(data, relatedPosts) {
    const main = create("main", { className: "rtvrx-article" });
    const header = create("header", { className: "rtvrx-article-hero rtvrx-shell" }, [
      makeLink("rtvrx-kicker", data.categoryHref || "/", data.category),
      create("h1", { text: data.title }),
      create("p", { className: "rtvrx-dek", text: data.description }),
      create("div", { className: "rtvrx-byline" }, [
        create("span", { text: "By " }),
        data.authorHref ? makeLink("", data.authorHref, data.author) : create("strong", { text: data.author }),
        data.date ? create("time", { datetime: data.datetime || null, text: data.date }) : null,
        create("span", { text: `${data.minutes} min read` }),
      ]),
    ]);

    const figure = data.image ? create("figure", { className: "rtvrx-article-image rtvrx-reveal" }, [
      create("img", { src: data.image, alt: data.caption || "", fetchpriority: "high" }),
      data.caption ? create("figcaption", { text: data.caption }) : null,
    ]) : null;

    data.content.className = "rtvrx-article-content";
    const articlePost = {
      title: data.title,
      href: location.href,
      image: data.image,
    };
    const tools = create("aside", { className: "rtvrx-article-tools", "aria-label": "Reading tools" }, [
      makeSaveButton(articlePost),
      create("button", { type: "button", "data-action": "font-down", "aria-label": "Decrease text size", text: "A−" }),
      create("button", { type: "button", "data-action": "font-up", "aria-label": "Increase text size", text: "A+" }),
      create("button", { type: "button", "data-action": "top", "aria-label": "Back to top", text: "↑" }),
    ]);

    const body = create("div", { className: "rtvrx-article-layout rtvrx-shell" }, [
      tools,
      data.content,
      create("aside", { className: "rtvrx-article-aside" }, [
        create("span", { text: "Reading mode" }),
        create("p", { text: "A quieter, more comfortable view of the original Road to VR story." }),
      ]),
    ]);

    const related = relatedPosts.length ? create("section", { className: "rtvrx-related rtvrx-shell" }, [
      makeSectionHeading("Keep exploring", "More from Road to VR"),
      create("div", { className: "rtvrx-related-grid" },
        relatedPosts.slice(0, 3).map((post, index) => makeStoryCard(post, "feature", index))
      ),
    ]) : null;

    main.append(header, figure, body, related);
    return main;
  }

  function makeFooter() {
    return create("footer", { className: "rtvrx-footer" }, [
      create("div", { className: "rtvrx-footer-inner rtvrx-shell" }, [
        makeBrand(),
        create("p", { text: "An independent presentation layer for Road to VR. All editorial content belongs to its original publisher." }),
        create("div", {}, [
          makeLink("", "https://roadtovr.com/about-road-to-vr/", "About"),
          makeLink("", "https://roadtovr.com/contact/", "Contact"),
          makeLink("", "https://roadtovr.com/feed/", "RSS"),
        ]),
      ]),
    ]);
  }

  async function updateSavedButtons() {
    if (!app) return;
    const { savedStories = [] } = await chrome.storage.local.get({ savedStories: [] });
    const savedUrls = new Set(savedStories.map((story) => story.url));
    $$(".rtvrx-save", app).forEach((button) => {
      const isSaved = savedUrls.has(button.dataset.url);
      button.classList.toggle("is-saved", isSaved);
      button.textContent = isSaved ? "✓" : "+";
      button.title = isSaved ? "Remove from saved stories" : "Save story";
      button.setAttribute("aria-pressed", String(isSaved));
    });
  }

  async function toggleSaved(button) {
    const stored = await chrome.storage.local.get({ savedStories: [] });
    const stories = stored.savedStories;
    const index = stories.findIndex((story) => story.url === button.dataset.url);
    if (index >= 0) stories.splice(index, 1);
    else stories.unshift({
      url: button.dataset.url,
      title: button.dataset.title,
      image: button.dataset.image,
      savedAt: new Date().toISOString(),
    });
    await chrome.storage.local.set({ savedStories: stories.slice(0, 100) });
    await updateSavedButtons();
  }

  function cycleTheme() {
    const order = ["system", "light", "dark"];
    const next = order[(order.indexOf(settings.theme) + 1) % order.length];
    chrome.storage.sync.set({ theme: next });
  }

  function handleAction(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;

    if (action === "theme") cycleTheme();
    if (action === "save") toggleSaved(button);
    if (action === "search" || action === "search-close") {
      const form = $(".rtvrx-search", app);
      const willOpen = action === "search" && !form.classList.contains("is-open");
      form.classList.toggle("is-open", willOpen);
      button.setAttribute("aria-expanded", String(willOpen));
      if (willOpen) $("input", form).focus();
    }
    if (action === "font-down" || action === "font-up") {
      const delta = action === "font-up" ? 0.05 : -0.05;
      const fontScale = Math.min(1.25, Math.max(0.85, Number((settings.fontScale + delta).toFixed(2))));
      chrome.storage.sync.set({ fontScale });
    }
    if (action === "top") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function applySettings() {
    if (!app) return;
    app.dataset.theme = settings.theme;
    app.style.setProperty("--rtvrx-font-scale", String(settings.fontScale));
    app.style.setProperty("--rtvrx-reading-width", `${settings.readingWidth}px`);
    const themeLabel = settings.theme === "system" ? "system theme" : `${settings.theme} theme`;
    $(".rtvrx-theme-button", app)?.setAttribute("title", `Using ${themeLabel}`);
  }

  function observeReveals() {
    const reveals = $$(".rtvrx-reveal", app);
    if (!("IntersectionObserver" in window)) {
      reveals.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.08, rootMargin: "0px 0px -4%" });
    reveals.forEach((element) => observer.observe(element));
  }

  function monitorProgress() {
    const bar = $(".rtvrx-progress i", app);
    if (!bar) return;
    scrollHandler = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.transform = `scaleX(${progress})`;
    };
    window.addEventListener("scroll", scrollHandler, { passive: true });
    scrollHandler();
  }

  function teardown() {
    if (scrollHandler) window.removeEventListener("scroll", scrollHandler);
    scrollHandler = null;
    app?.remove();
    app = null;
    document.documentElement.classList.add(DISABLED_CLASS);
    document.documentElement.classList.remove(ACTIVE_CLASS, BOOTING_CLASS, PASSTHROUGH_CLASS);
  }

  function enterBooting() {
    document.documentElement.classList.add(BOOTING_CLASS);
    document.documentElement.classList.remove(DISABLED_CLASS, PASSTHROUGH_CLASS);
  }

  function revealOriginal() {
    document.documentElement.classList.add(PASSTHROUGH_CLASS);
    document.documentElement.classList.remove(ACTIVE_CLASS, BOOTING_CLASS, DISABLED_CLASS);
  }

  function waitForBody() {
    if (document.body) return Promise.resolve();
    return new Promise((resolve) => {
      document.addEventListener("DOMContentLoaded", resolve, { once: true });
    });
  }

  async function build() {
    if (app || !settings.enabled) return false;
    await waitForBody();
    if (!document.body) {
      revealOriginal();
      return false;
    }

    const isArticle = document.body.classList.contains("single-post") || Boolean($(".tdb_single_content, .td-post-content"));
    const posts = extractPosts();
    const data = isArticle ? articleData() : null;

    if (isArticle && !data) {
      revealOriginal();
      return false;
    }
    if (!isArticle && posts.length === 0) {
      revealOriginal();
      return false;
    }

    app = create("div", { id: APP_ID });
    app.addEventListener("click", handleAction);
    app.append(makeHeader(isArticle));
    app.append(isArticle ? makeArticle(data, posts) : buildHome(posts));
    app.append(makeFooter());

    document.body.prepend(app);
    document.documentElement.classList.add(ACTIVE_CLASS);
    document.documentElement.classList.remove(BOOTING_CLASS, DISABLED_CLASS, PASSTHROUGH_CLASS);
    applySettings();
    observeReveals();
    monitorProgress();
    updateSavedButtons();
    return true;
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    for (const key of Object.keys(DEFAULTS)) {
      if (changes[key]) settings[key] = changes[key].newValue;
    }
    if (!settings.enabled) teardown();
    else if (!app) {
      enterBooting();
      build().catch(revealOriginal);
    }
    else applySettings();
  });

  chrome.storage.sync.get(DEFAULTS).then((stored) => {
    settings = { ...DEFAULTS, ...stored };
    if (!settings.enabled) {
      teardown();
      return;
    }
    enterBooting();
    return build();
  }).catch(revealOriginal);
})();
