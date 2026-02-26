const TEXTBOX_ID = "field-filter-textbox";
const STORAGE_KEY = "field-filter-query";
const HIDDEN_FIELDS_KEY = "field-filter-hidden-fields";
const VISIBILITY_BTN_ID = "field-filter-visibility-btn";
const DROPDOWN_ID = "field-filter-dropdown";

// --- Hidden fields storage ---

function loadHiddenFields(): Set<string> {
  try {
    const raw = localStorage.getItem(HIDDEN_FIELDS_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function saveHiddenFields(set: Set<string>) {
  localStorage.setItem(HIDDEN_FIELDS_KEY, JSON.stringify([...set]));
}

// --- Text filter matching ---

function matchesQuery(fieldName: string, query: string): boolean {
  const terms = query
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  if (terms.length === 0) return true;
  return terms.some((term) => fieldName.includes(term));
}

// --- Unified visibility ---

function applyFilters() {
  const drawer = document.querySelector(".tabbed-drawer");
  if (!drawer) return;

  const query = loadQuery();
  const hidden = loadHiddenFields();

  // First pass: build a map of field name -> visibility for labeled rows,
  // and group compound rows with their parent field by matching ID prefixes.
  const rows = drawer.querySelectorAll<HTMLElement>("tr.attribute__row");

  // Collect labeled rows and their field names + visibility
  const fieldVisibility = new Map<string, boolean>(); // fieldName -> visible
  const rowFieldName = new Map<HTMLElement, string>(); // row -> fieldName

  rows.forEach((row) => {
    // Compound rows have the label element but it's empty — skip them
    if (row.classList.contains("attribute__row--compound-attribute")) return;

    const nameEl = row.querySelector(".attribute__name--inner");
    if (nameEl) {
      const fieldName = (nameEl.textContent || "").trim();
      if (!fieldName) return;
      const lower = fieldName.toLowerCase();
      const passesText = matchesQuery(lower, query);
      const passesHidden = !hidden.has(fieldName);
      fieldVisibility.set(fieldName, passesText && passesHidden);
      rowFieldName.set(row, fieldName);
    }
  });

  // Second pass: for compound rows (no label), find their parent field
  // by matching ID prefix against labeled rows' IDs.
  rows.forEach((row) => {
    if (rowFieldName.has(row)) {
      // Already handled — labeled row
      row.style.display = fieldVisibility.get(rowFieldName.get(row)!)
        ? ""
        : "none";
      return;
    }

    // Compound row — find parent by ID prefix match
    const rowId = row.id;
    let matched = false;
    if (rowId) {
      for (const [labeledRow, fieldName] of rowFieldName) {
        if (labeledRow.id && rowId.startsWith(labeledRow.id)) {
          row.style.display = fieldVisibility.get(fieldName) ? "" : "none";
          matched = true;
          break;
        }
      }
    }
    if (!matched) {
      // Fallback: walk backwards through siblings to find nearest labeled row
      let prev = row.previousElementSibling as HTMLElement | null;
      while (prev) {
        if (rowFieldName.has(prev)) {
          const fieldName = rowFieldName.get(prev)!;
          row.style.display = fieldVisibility.get(fieldName) ? "" : "none";
          matched = true;
          break;
        }
        prev = prev.previousElementSibling as HTMLElement | null;
      }
    }
    if (!matched) {
      row.style.display = "";
    }
  });

  // Special case: description field
  const descContainer = drawer.querySelector<HTMLElement>(
    ".details__note-container"
  );
  if (descContainer) {
    const passesText = matchesQuery("description", query);
    const passesHidden = !hidden.has("Description");
    descContainer.style.display = passesText && passesHidden ? "" : "none";
  }

  updateVisibilityBtnIndicator();
}

function updateVisibilityBtnIndicator() {
  const btn = document.getElementById(
    VISIBILITY_BTN_ID
  ) as HTMLButtonElement | null;
  if (!btn) return;
  const hidden = loadHiddenFields();
  btn.style.color = hidden.size > 0 ? "#2962ff" : "#666";
}

// --- Dropdown ---

function getAllFieldNames(): string[] {
  const drawer = document.querySelector(".tabbed-drawer");
  if (!drawer) return [];

  const names: string[] = [];
  const rows = drawer.querySelectorAll<HTMLElement>("tr.attribute__row");
  rows.forEach((row) => {
    const nameEl = row.querySelector(".attribute__name--inner");
    if (nameEl) {
      const name = (nameEl.textContent || "").trim();
      if (name) names.push(name);
    }
  });

  // Add Description if the container exists
  const descContainer = drawer.querySelector(".details__note-container");
  if (descContainer && !names.includes("Description")) {
    names.push("Description");
  }

  return names;
}

function closeDropdown() {
  const existing = document.getElementById(DROPDOWN_ID);
  if (existing) existing.remove();
}

function openDropdown(anchorBtn: HTMLElement) {
  closeDropdown();

  const hidden = loadHiddenFields();
  const fields = getAllFieldNames();

  const panel = document.createElement("div");
  panel.id = DROPDOWN_ID;
  panel.style.cssText =
    "position: absolute; top: 100%; right: 0; z-index: 9999; background: #fff; border: 1px solid #ccc; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); min-width: 200px; max-height: 320px; overflow-y: auto; padding: 6px 0; margin-top: 4px;";

  // Show all link
  const showAll = document.createElement("div");
  showAll.style.cssText =
    "padding: 4px 12px 6px; font-size: 12px; color: #2962ff; cursor: pointer; border-bottom: 1px solid #eee; margin-bottom: 2px;";
  showAll.textContent = "Show all";
  showAll.addEventListener("click", () => {
    saveHiddenFields(new Set());
    applyFilters();
    // Re-check all checkboxes
    panel.querySelectorAll<HTMLInputElement>("input[type=checkbox]").forEach(
      (cb) => (cb.checked = true)
    );
  });
  panel.appendChild(showAll);

  // Field rows
  fields.forEach((name) => {
    const row = document.createElement("label");
    row.style.cssText =
      "display: flex; align-items: center; gap: 8px; padding: 4px 12px; cursor: pointer; font-size: 13px; white-space: nowrap;";
    row.addEventListener("mouseenter", () => {
      row.style.background = "#f5f5f5";
    });
    row.addEventListener("mouseleave", () => {
      row.style.background = "";
    });

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !hidden.has(name);
    cb.style.cssText = "margin: 0; cursor: pointer;";

    cb.addEventListener("change", () => {
      const current = loadHiddenFields();
      if (cb.checked) {
        current.delete(name);
      } else {
        current.add(name);
      }
      saveHiddenFields(current);
      applyFilters();
    });

    const label = document.createElement("span");
    label.textContent = name;

    row.appendChild(cb);
    row.appendChild(label);
    panel.appendChild(row);
  });

  // Position relative to button's parent wrapper
  const wrapper = anchorBtn.parentElement!;
  wrapper.style.position = "relative";
  wrapper.appendChild(panel);

  // Close on outside click
  const onOutsideClick = (e: MouseEvent) => {
    if (!panel.contains(e.target as Node) && e.target !== anchorBtn) {
      closeDropdown();
      document.removeEventListener("click", onOutsideClick, true);
    }
  };
  // Defer so the current click doesn't immediately close it
  setTimeout(() => {
    document.addEventListener("click", onOutsideClick, true);
  }, 0);
}

// --- Query persistence ---

function saveQuery(query: string) {
  localStorage.setItem(STORAGE_KEY, query);
}

function loadQuery(): string {
  return localStorage.getItem(STORAGE_KEY) || "";
}

// --- Injection ---

function injectTextbox(headerRow: HTMLElement) {
  if (document.getElementById(TEXTBOX_ID)) return;

  const container = document.createElement("div");
  container.id = TEXTBOX_ID;
  container.classList.add("drawer-nav__cell");
  container.style.cssText =
    "display: flex; align-items: center; padding-right: 8px; flex-shrink: 0; gap: 4px;";

  const wrapper = document.createElement("div");
  wrapper.style.cssText =
    "position: relative; display: flex; align-items: center;";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Filter fields...";
  input.style.cssText =
    "height: 28px; padding: 2px 24px 2px 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; width: 160px; outline: none;";

  const clearBtn = document.createElement("button");
  clearBtn.innerHTML =
    '<aha-icon icon="fa-regular fa-times"></aha-icon>';
  clearBtn.style.cssText =
    "position: absolute; right: 4px; background: none; border: none; cursor: pointer; padding: 0; color: #999; font-size: 12px; display: none; line-height: 1;";

  const updateClearBtn = () => {
    clearBtn.style.display = input.value ? "" : "none";
  };

  // Restore persisted query
  const saved = loadQuery();
  if (saved) {
    input.value = saved;
    updateClearBtn();
  }

  input.addEventListener("focus", () => {
    input.style.borderColor = "#2962ff";
  });
  input.addEventListener("blur", () => {
    input.style.borderColor = "#ccc";
  });
  input.addEventListener("input", () => {
    updateClearBtn();
    saveQuery(input.value);
    applyFilters();
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    updateClearBtn();
    saveQuery("");
    applyFilters();
    input.focus();
  });

  wrapper.appendChild(input);
  wrapper.appendChild(clearBtn);
  container.appendChild(wrapper);

  // Visibility toggle button + dropdown wrapper
  const visBtnWrapper = document.createElement("div");
  visBtnWrapper.style.cssText =
    "position: relative; display: flex; align-items: center;";

  const visBtn = document.createElement("button");
  visBtn.id = VISIBILITY_BTN_ID;
  visBtn.innerHTML =
    '<aha-icon icon="fa-regular fa-eye-slash"></aha-icon>';
  visBtn.title = "Show/hide fields permanently";
  visBtn.style.cssText =
    "height: 28px; width: 28px; background: none; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; color: #666; line-height: 1;";

  visBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const existing = document.getElementById(DROPDOWN_ID);
    if (existing) {
      closeDropdown();
    } else {
      openDropdown(visBtn);
    }
  });

  visBtnWrapper.appendChild(visBtn);
  container.appendChild(visBtnWrapper);

  headerRow.appendChild(container);

  // Apply both filters now that UI is injected
  applyFilters();
}

function removeTextbox() {
  const el = document.getElementById(TEXTBOX_ID);
  if (el) {
    // Reset all hidden rows before removing (text filter only; permanent stays)
    const drawer = document.querySelector(".tabbed-drawer");
    if (drawer) {
      drawer
        .querySelectorAll<HTMLElement>("tr.attribute__row")
        .forEach((row) => (row.style.display = ""));
      const desc = drawer.querySelector<HTMLElement>(
        ".details__note-container"
      );
      if (desc) desc.style.display = "";
    }
    closeDropdown();
    el.remove();
  }
}

function checkForDrawer() {
  const headerRow = document.getElementById("drawer-nav__row--header");
  if (headerRow) {
    injectTextbox(headerRow);
    // Re-apply filters for deferred fields that may have loaded
    applyFilters();
  } else {
    removeTextbox();
  }
}

function startObserving() {
  checkForDrawer();

  const observer = new MutationObserver(() => {
    checkForDrawer();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

aha.on("fieldFilter", ({ record }, { identifier, settings }) => {
  startObserving();
  aha.commandOutput("Field filter is now active.");
});

document.addEventListener("aha.extensions.ready", () => {
  startObserving();
});

document.addEventListener("aha.extensions.reloaded", () => {
  removeTextbox();
  startObserving();
});

startObserving();
