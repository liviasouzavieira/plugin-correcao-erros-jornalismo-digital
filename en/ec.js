/*
 * ================================================================
 *  Error Correction Plugin — JavaScript
 *  Global API: window.ErrorCorrection
 *
 *  This file contains only the plugin behavior.
 *  Include it via <script src="ec.js"></script> before </body>
 *  in your template. The plugin auto-inits on DOM load;
 *  to customize, call ErrorCorrection.init({ ... }).
 *
 *  Version: 1.0
 *  Origin: research project "Error correction management protocol
 *  for digital journalism" (nº PPP0014/2024 — Fapesb/CNPq).
 * ================================================================
 */

(function(global) {
  "use strict";

  // ---- Default labels (en-US). Override with init({ labels }) ----
  var defaultLabels = {
    reportButton: "Report an error",
    floatingButton: "Report an error",
    modalTitle: "Report an error",
    modalSubtitle: "Help improve this article's accuracy. Your message will be reviewed by our editors.",
    formType: "Type of error",
    formDescription: "Description",
    formDescriptionPlaceholder: "Describe what is incorrect and, if possible, cite a source.",
    formEmail: "Email (optional)",
    formEmailPlaceholder: "you@email.com",
    formSubmit: "Send report",
    formSubmitting: "Sending...",
    formClose: "Close",
    successTitle: "Report received",
    successText: "Our editors will review and follow up if more information is needed.",
    typeFactual: "Factual error",
    typeSpelling: "Spelling / typo",
    typeImprecision: "Imprecision (vague number or info)",
    typeStatement: "Error in a quote or statement",
    typeOther: "Other",
    listEmpty: "No corrections recorded for this article.",
    filterAll: "All",
    filterRecent: "Recent (24h)",
    filterFactual: "Factual",
    filterSpelling: "Spelling",
    filterImprecision: "Imprecision",
    filterStatement: "Statement",
    badgeRecent: "New"
  };

  // ---- Global configuration ----
  var config = {
    endpoint: null,
    recentWindowHours: 24,
    floatingButton: false,
    buttonPosition: "bottom-right",
    onReport: null,
    labels: {}
  };

  // Registry of corrections (from data-attributes + API)
  var registry = [];
  var previousFocus = null;

  // ---------- Utilities ----------
  function label(key) {
    return (config.labels && config.labels[key]) || defaultLabels[key] || key;
  }
  function htmlEscape(txt) {
    if (txt == null) return "";
    return String(txt)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function formatDate(isoOrString) {
    if (!isoOrString) return "";
    var d = new Date(isoOrString);
    if (isNaN(d.getTime())) return isoOrString;
    try {
      return d.toLocaleString("en-US", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit"
      });
    } catch (e) { return d.toISOString(); }
  }
  function isRecent(isoOrString) {
    if (!isoOrString) return false;
    var d = new Date(isoOrString);
    if (isNaN(d.getTime())) return false;
    var now = Date.now();
    var threshold = config.recentWindowHours * 60 * 60 * 1000;
    return (now - d.getTime()) <= threshold && (now - d.getTime()) >= 0;
  }
  function createEl(tag, classes, innerHTML) {
    var el = document.createElement(tag);
    if (classes) el.className = classes;
    if (innerHTML != null) el.innerHTML = innerHTML;
    return el;
  }

  // ---------- Inline correction transformation ----------
  function transformInline() {
    var spans = document.querySelectorAll("[data-ec-inline]:not([data-ec-ready])");
    spans.forEach(function(span) {
      span.classList.add("ec-inline");
      span.setAttribute("data-ec-ready", "true");
      span.setAttribute("tabindex", "0");
      var before = span.getAttribute("data-ec-before") || "";
      var reason = span.getAttribute("data-ec-reason") || "";
      var tooltipHTML = "";
      if (reason) tooltipHTML += "<strong>Correction.</strong> " + htmlEscape(reason);
      if (before) tooltipHTML += "<span class=\"ec-tooltip-before\">Before: " + htmlEscape(before) + "</span>";
      if (tooltipHTML) {
        span.setAttribute("aria-label", "Correction. Before: " + before + (reason ? ". Reason: " + reason : ""));
        var showTooltip = function() {
          hideAllTooltips();
          var tip = createEl("span", "ec-inline-tooltip", tooltipHTML);
          span.appendChild(tip);
        };
        span.addEventListener("mouseenter", showTooltip);
        span.addEventListener("focus", showTooltip);
        span.addEventListener("mouseleave", hideAllTooltips);
        span.addEventListener("blur", hideAllTooltips);
      }
    });
  }
  function hideAllTooltips() {
    document.querySelectorAll(".ec-inline-tooltip").forEach(function(t) { t.remove(); });
  }

  // ---------- Correction block transformation ----------
  function transformBlocks() {
    var blocks = document.querySelectorAll("[data-ec-block]:not([data-ec-ready])");
    blocks.forEach(function(block) {
      var data = readElementData(block);
      block.setAttribute("data-ec-ready", "true");
      registry.push(data);
      renderBlockIn(block, data);
    });
  }
  function readElementData(el) {
    return {
      type: el.getAttribute("data-ec-type") || "other",
      title: el.getAttribute("data-ec-title") || "",
      reason: el.getAttribute("data-ec-reason") || "",
      before: el.getAttribute("data-ec-before") || "",
      after: el.getAttribute("data-ec-after") || "",
      date: el.getAttribute("data-ec-date") || ""
    };
  }
  function typeLabel(type) {
    var map = {
      factual: "typeFactual",
      spelling: "typeSpelling",
      imprecision: "typeImprecision",
      statement: "typeStatement",
      other: "typeOther"
    };
    return label(map[type] || "typeOther");
  }
  function renderBlockIn(element, data) {
    var recent = isRecent(data.date);
    element.className = "ec-block" + (recent ? " ec-recent" : "");
    element.innerHTML = [
      '<div class="ec-block-header">',
        '<span class="ec-badge ec-type-' + htmlEscape(data.type) + '">' + htmlEscape(typeLabel(data.type)) + '</span>',
        recent ? '<span class="ec-badge ec-badge-recent">' + htmlEscape(label("badgeRecent")) + '</span>' : '',
        data.date ? '<span class="ec-block-date">' + htmlEscape(formatDate(data.date)) + '</span>' : '',
      '</div>',
      data.title ? '<div class="ec-block-title">' + htmlEscape(data.title) + '</div>' : '',
      data.reason ? '<p class="ec-block-reason">' + htmlEscape(data.reason) + '</p>' : '',
      (data.before || data.after) ? (
        '<div class="ec-diff">' +
          (data.before ? '<div class="ec-diff-before">' + htmlEscape(data.before) + '</div>' : '') +
          (data.after  ? '<div class="ec-diff-after">'  + htmlEscape(data.after)  + '</div>' : '') +
        '</div>'
      ) : ''
    ].join("");
  }

  // ---------- List/archive rendering ----------
  var currentFilter = "all";
  function transformLists() {
    var lists = document.querySelectorAll("[data-ec-list]:not([data-ec-ready])");
    lists.forEach(function(container) {
      container.setAttribute("data-ec-ready", "true");
      renderList(container);
    });
  }
  function renderList(container) {
    var title = container.getAttribute("data-ec-title") || "Corrections";
    var subtitle = container.getAttribute("data-ec-subtitle") || "";
    container.classList.add("ec-list");
    container.innerHTML = [
      '<div class="ec-list-header">',
        '<div>',
          '<h3 class="ec-list-title">' + htmlEscape(title) + '</h3>',
          subtitle ? '<p class="ec-list-subtitle">' + htmlEscape(subtitle) + '</p>' : '',
        '</div>',
        '<span class="ec-list-subtitle">' + registry.length + ' recorded</span>',
      '</div>',
      '<div class="ec-list-filters" role="tablist">',
        filterButton("all", label("filterAll")),
        filterButton("recent", label("filterRecent")),
        filterButton("factual", label("filterFactual")),
        filterButton("spelling", label("filterSpelling")),
        filterButton("imprecision", label("filterImprecision")),
        filterButton("statement", label("filterStatement")),
      '</div>',
      '<div class="ec-list-items"></div>'
    ].join("");

    // Wire up filters
    container.querySelectorAll(".ec-filter").forEach(function(btn) {
      btn.addEventListener("click", function() {
        currentFilter = btn.getAttribute("data-ec-filter-value");
        container.querySelectorAll(".ec-filter").forEach(function(b) {
          b.classList.toggle("ec-filter-active", b === btn);
        });
        renderItems(container);
      });
    });
    renderItems(container);
  }
  function filterButton(value, text) {
    var active = currentFilter === value ? " ec-filter-active" : "";
    return '<button type="button" class="ec-filter' + active + '" data-ec-filter-value="' + value + '">' + htmlEscape(text) + '</button>';
  }
  function renderItems(container) {
    var itemsWrap = container.querySelector(".ec-list-items");
    if (!itemsWrap) return;
    var filtered = registry.filter(function(c) {
      if (currentFilter === "all") return true;
      if (currentFilter === "recent") return isRecent(c.date);
      return c.type === currentFilter;
    });
    if (filtered.length === 0) {
      itemsWrap.innerHTML = '<div class="ec-list-empty">' + htmlEscape(label("listEmpty")) + '</div>';
      return;
    }
    // Most recent first
    filtered.sort(function(a, b) {
      return new Date(b.date || 0) - new Date(a.date || 0);
    });
    itemsWrap.innerHTML = "";
    filtered.forEach(function(data) {
      var item = createEl("div", "ec-list-item");
      renderBlockIn(item, data);
      itemsWrap.appendChild(item);
    });
  }

  // ---------- Report error modal ----------
  var overlay = null;

  function buildModal() {
    if (overlay) return overlay;
    overlay = createEl("div", "ec-modal-overlay");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = [
      '<div class="ec-modal">',
        '<div class="ec-modal-header">',
          '<div>',
            '<h3 class="ec-modal-title">' + htmlEscape(label("modalTitle")) + '</h3>',
            '<p class="ec-modal-subtitle">' + htmlEscape(label("modalSubtitle")) + '</p>',
          '</div>',
          '<button type="button" class="ec-modal-close" aria-label="' + htmlEscape(label("formClose")) + '">×</button>',
        '</div>',
        '<form class="ec-form" novalidate>',
          '<div class="ec-form-group">',
            '<label class="ec-form-label">' + htmlEscape(label("formType")) + '</label>',
            '<div class="ec-form-radio-group">',
              radio("type", "factual", label("typeFactual"), true),
              radio("type", "spelling", label("typeSpelling")),
              radio("type", "imprecision", label("typeImprecision")),
              radio("type", "statement", label("typeStatement")),
              radio("type", "other", label("typeOther")),
            '</div>',
          '</div>',
          '<div class="ec-form-group">',
            '<label class="ec-form-label" for="ec-description">' + htmlEscape(label("formDescription")) + '</label>',
            '<textarea id="ec-description" name="description" class="ec-form-textarea" required placeholder="' + htmlEscape(label("formDescriptionPlaceholder")) + '"></textarea>',
          '</div>',
          '<div class="ec-form-group">',
            '<label class="ec-form-label" for="ec-email">' + htmlEscape(label("formEmail")) + '</label>',
            '<input id="ec-email" name="email" type="email" class="ec-form-input" placeholder="' + htmlEscape(label("formEmailPlaceholder")) + '">',
          '</div>',
          '<button type="submit" class="ec-form-submit">' + htmlEscape(label("formSubmit")) + '</button>',
        '</form>',
      '</div>'
    ].join("");
    document.body.appendChild(overlay);

    // Events
    overlay.addEventListener("click", function(e) {
      if (e.target === overlay) closeModal();
    });
    overlay.querySelector(".ec-modal-close").addEventListener("click", closeModal);
    overlay.querySelectorAll(".ec-form-radio input").forEach(function(inp) {
      inp.addEventListener("change", updateRadioStyle);
    });
    updateRadioStyle();
    overlay.querySelector(".ec-form").addEventListener("submit", handleSubmit);
    document.addEventListener("keydown", function(e) {
      if (e.key === "Escape" && overlay.classList.contains("ec-open")) closeModal();
    });
    return overlay;
  }
  function radio(name, value, labelText, checked) {
    return (
      '<label class="ec-form-radio">' +
        '<input type="radio" name="' + name + '" value="' + value + '"' + (checked ? ' checked' : '') + '>' +
        '<span>' + htmlEscape(labelText) + '</span>' +
      '</label>'
    );
  }
  function updateRadioStyle() {
    overlay.querySelectorAll(".ec-form-radio").forEach(function(lbl) {
      var inp = lbl.querySelector("input");
      lbl.classList.toggle("ec-selected", inp && inp.checked);
    });
  }
  function openModal() {
    buildModal();
    previousFocus = document.activeElement;
    overlay.classList.add("ec-open");
    var first = overlay.querySelector(".ec-form-textarea");
    if (first) setTimeout(function() { first.focus(); }, 50);
  }
  function closeModal() {
    if (!overlay) return;
    overlay.classList.remove("ec-open");
    // Reset success state for next opening
    setTimeout(function() {
      var form = overlay.querySelector(".ec-form");
      var success = overlay.querySelector(".ec-form-success");
      if (success) {
        success.remove();
        form.style.display = "";
        form.reset();
        updateRadioStyle();
      }
    }, 300);
    if (previousFocus && previousFocus.focus) previousFocus.focus();
  }
  function handleSubmit(e) {
    e.preventDefault();
    var form = e.target;
    var submit = form.querySelector(".ec-form-submit");
    var data = {
      type: (form.querySelector("input[name=type]:checked") || {}).value || "other",
      description: form.querySelector("[name=description]").value.trim(),
      email: form.querySelector("[name=email]").value.trim(),
      url: location.href,
      sentAt: new Date().toISOString()
    };
    if (!data.description) {
      form.querySelector("[name=description]").focus();
      return;
    }
    submit.disabled = true;
    submit.textContent = label("formSubmitting");

    var promise;
    if (typeof config.onReport === "function") {
      try {
        var r = config.onReport(data);
        promise = (r && typeof r.then === "function") ? r : Promise.resolve(r);
      } catch (err) { promise = Promise.reject(err); }
    } else if (config.endpoint) {
      promise = fetch(config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
    } else {
      // No endpoint or callback: simulate success (demo mode).
      promise = Promise.resolve();
    }

    Promise.resolve(promise).then(function() {
      showSuccess(form);
    }).catch(function() {
      submit.disabled = false;
      submit.textContent = label("formSubmit");
      alert("Could not send right now. Please try again in a moment.");
    });
  }
  function showSuccess(form) {
    form.style.display = "none";
    var success = createEl("div", "ec-form-success",
      '<div class="ec-form-success-icon">✓</div>' +
      '<p class="ec-form-success-title">' + htmlEscape(label("successTitle")) + '</p>' +
      '<p class="ec-form-success-text">' + htmlEscape(label("successText")) + '</p>'
    );
    form.parentNode.appendChild(success);
    setTimeout(closeModal, 2600);
  }

  // ---------- Floating button ----------
  function mountFloatingButton() {
    if (!config.floatingButton) return;
    if (document.querySelector(".ec-button-floating")) return;
    var btn = createEl("button", "ec-report-button ec-button-floating ec-pos-" + config.buttonPosition,
      htmlEscape(label("floatingButton")));
    btn.type = "button";
    btn.addEventListener("click", openModal);
    document.body.appendChild(btn);
  }

  // ---------- Bind data-ec-open-form buttons ----------
  function bindButtons() {
    document.querySelectorAll("[data-ec-open-form]:not([data-ec-ready])").forEach(function(btn) {
      btn.setAttribute("data-ec-ready", "true");
      if (!btn.textContent.trim()) btn.textContent = label("reportButton");
      if (!btn.classList.contains("ec-report-button")) btn.classList.add("ec-report-button");
      btn.addEventListener("click", function(e) {
        e.preventDefault();
        openModal();
      });
    });
  }

  // ---------- Right of reply ----------
  function transformReplies() {
    document.querySelectorAll("[data-ec-reply]:not([data-ec-ready])").forEach(function(el) {
      el.setAttribute("data-ec-ready", "true");
      el.classList.add("ec-reply");
      var from = el.getAttribute("data-ec-from") || "";
      var ruling = el.getAttribute("data-ec-ruling") || "";
      var dateAttr = el.getAttribute("data-ec-date") || "";
      var intro = el.getAttribute("data-ec-intro") || "";
      var text = el.getAttribute("data-ec-text") || "";
      var footer = el.getAttribute("data-ec-footer") || "";
      var metaParts = [];
      if (from) metaParts.push("<strong>" + htmlEscape(from) + "</strong>");
      if (dateAttr) metaParts.push("published on <strong>" + htmlEscape(formatDate(dateAttr)) + "</strong>");
      if (ruling) metaParts.push("in compliance with: <strong>" + htmlEscape(ruling) + "</strong>");
      el.innerHTML = [
        metaParts.length ? '<div class="ec-reply-meta">' + metaParts.join(" · ") + '</div>' : '',
        intro ? '<p class="ec-reply-intro">' + htmlEscape(intro) + '</p>' : '',
        text ? '<blockquote class="ec-reply-body">' + htmlEscape(text) + '</blockquote>' : '',
        footer ? '<div class="ec-reply-footer">' + htmlEscape(footer) + '</div>' : ''
      ].join("");
    });
  }

  // ---------- Removed passage (vanishes entirely after 24h) ----------
  function transformRemoved() {
    document.querySelectorAll("[data-ec-removed]:not([data-ec-ready])").forEach(function(el) {
      el.setAttribute("data-ec-ready", "true");
      el.classList.add("ec-removed");
      var reason = el.getAttribute("data-ec-reason") || "not specified";
      var flaggedBy = el.getAttribute("data-ec-flagged-by") || "";
      var dateAttr = el.getAttribute("data-ec-date") || "";
      var explanation = el.getAttribute("data-ec-explanation") || "";
      var original = el.getAttribute("data-ec-original") || "";
      var metaParts = [];
      if (dateAttr) metaParts.push("<strong>" + htmlEscape(formatDate(dateAttr)) + "</strong>");
      metaParts.push("reason: <strong>" + htmlEscape(reason) + "</strong>");
      if (flaggedBy) metaParts.push("flagged by <strong>" + htmlEscape(flaggedBy) + "</strong>");
      el.innerHTML = [
        '<div class="ec-removed-header">',
          '<span class="ec-removed-badge">⊘ Removed passage</span>',
          '<span class="ec-removed-meta">' + metaParts.join(" · ") + '</span>',
        '</div>',
        explanation ? '<p class="ec-removed-explanation">' + htmlEscape(explanation) + '</p>' : '',
        original ? (
          '<details class="ec-removed-toggle">' +
            '<summary>View removed passage (original text)</summary>' +
            '<blockquote class="ec-removed-original">' + htmlEscape(original) + '</blockquote>' +
          '</details>'
        ) : ''
      ].join("");
    });
  }

  // ---------- New content (yellow box; marking goes after 24h, text stays) ----------
  function transformNew() {
    document.querySelectorAll("[data-ec-new]:not([data-ec-ready])").forEach(function(el) {
      el.setAttribute("data-ec-ready", "true");
      el.classList.add("ec-new");
      var dateAttr = el.getAttribute("data-ec-date") || "";
      var hours = hoursSince(dateAttr);
      var topLabel;
      if (hours == null) {
        topLabel = "New";
      } else if (hours < 1) {
        topLabel = "New · added " + Math.max(1, Math.round(hours * 60)) + "min ago";
      } else if (hours < 2) {
        topLabel = "New · added 1h ago";
      } else {
        topLabel = "New · added " + Math.round(hours) + "h ago";
      }
      el.setAttribute("data-ec-label", topLabel);
    });
  }

  // ---------- 24h rules (embedded) ----------
  function hoursSince(isoOrString) {
    if (!isoOrString) return null;
    var d = new Date(isoOrString);
    if (isNaN(d.getTime())) return null;
    return (Date.now() - d.getTime()) / 3600000;
  }

  function apply24hRules() {
    var window24 = config.recentWindowHours;

    // Removed passage: entire block goes away
    document.querySelectorAll(".ec-removed[data-ec-date]").forEach(function(el) {
      var h = hoursSince(el.getAttribute("data-ec-date"));
      if (h != null && h > window24) el.style.display = "none";
    });

    // New content: marking goes, text and bold lead-ins are stripped
    document.querySelectorAll(".ec-new[data-ec-date]").forEach(function(el) {
      var h = hoursSince(el.getAttribute("data-ec-date"));
      if (h != null && h > window24) {
        el.classList.remove("ec-new");
        el.removeAttribute("data-ec-label");
        el.querySelectorAll("p").forEach(function(p) {
          var cleaned = p.innerHTML.replace(/^\s*<strong>[^<]*:\s*<\/strong>\s*/i, '');
          if (cleaned !== p.innerHTML) {
            p.innerHTML = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
          }
        });
      }
    });
  }

  // ---------- Boot ----------
  function processPage() {
    transformInline();
    transformBlocks();
    transformReplies();
    transformRemoved();
    transformNew();
    transformLists();
    apply24hRules();
    bindButtons();
  }

  function init(options) {
    options = options || {};
    Object.keys(options).forEach(function(k) {
      if (k === "labels" && options.labels) {
        config.labels = Object.assign({}, config.labels, options.labels);
      } else {
        config[k] = options[k];
      }
    });
    mountFloatingButton();
    processPage();
  }

  // Public API
  var API = {
    init: init,
    config: config,
    defaultLabels: defaultLabels,
    register: function(corrections) {
      if (!Array.isArray(corrections)) corrections = [corrections];
      corrections.forEach(function(c) { registry.push(c); });
      // Refresh any lists already rendered
      document.querySelectorAll("[data-ec-list][data-ec-ready]").forEach(function(c) {
        renderList(c);
      });
    },
    renderList: function(container) { renderList(container); },
    openForm: openModal,
    closeForm: closeModal,
    reprocess: processPage,
    setEndpoint: function(url) { config.endpoint = url; },
    onReport: function(cb) { config.onReport = cb; }
  };
  global.ErrorCorrection = API;

  // Auto-init when the DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", processPage);
  } else {
    processPage();
  }
})(window);
