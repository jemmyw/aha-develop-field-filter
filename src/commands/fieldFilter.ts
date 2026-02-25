const TEXTBOX_ID = "field-filter-textbox";
const STORAGE_KEY = "field-filter-query";

function matchesQuery(fieldName: string, query: string): boolean {
  const terms = query
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  if (terms.length === 0) return true;
  return terms.some((term) => fieldName.includes(term));
}

function filterFields(query: string) {
  const drawer = document.querySelector(".tabbed-drawer");
  if (!drawer) return;

  const rows = drawer.querySelectorAll<HTMLElement>("tr.attribute__row");

  rows.forEach((row) => {
    const nameEl = row.querySelector(".attribute__name--inner");
    if (!nameEl) return;

    const fieldName = (nameEl.textContent || "").toLowerCase();
    row.style.display = matchesQuery(fieldName, query) ? "" : "none";
  });

  // Special case: description field
  const descContainer = drawer.querySelector<HTMLElement>(
    ".details__note-container"
  );
  if (descContainer) {
    descContainer.style.display = matchesQuery("description", query)
      ? ""
      : "none";
  }
}

function saveQuery(query: string) {
  localStorage.setItem(STORAGE_KEY, query);
}

function loadQuery(): string {
  return localStorage.getItem(STORAGE_KEY) || "";
}

function injectTextbox(headerRow: HTMLElement) {
  if (document.getElementById(TEXTBOX_ID)) return;

  const container = document.createElement("div");
  container.id = TEXTBOX_ID;
  container.classList.add("drawer-nav__cell");
  container.style.cssText =
    "display: flex; align-items: center; padding-right: 8px; flex-shrink: 0;";

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
    filterFields(saved);
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
    filterFields(input.value);
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    updateClearBtn();
    saveQuery("");
    filterFields("");
    input.focus();
  });

  wrapper.appendChild(input);
  wrapper.appendChild(clearBtn);
  container.appendChild(wrapper);
  headerRow.appendChild(container);
}

function removeTextbox() {
  const el = document.getElementById(TEXTBOX_ID);
  if (el) {
    // Reset all hidden rows before removing
    filterFields("");
    el.remove();
  }
}

function checkForDrawer() {
  const headerRow = document.getElementById("drawer-nav__row--header");
  if (headerRow) {
    injectTextbox(headerRow);
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
