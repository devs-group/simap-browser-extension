(() => {
  const NOTE_STORAGE_KEY = "simapProjectNotes";
  const CARD_SELECTOR = "article.MuiPaper-root[id]";
  const NOTE_CONTAINER_CLASS = "simap-notes-extension-container";
  const SUPPORTED_LANGUAGES = new Set(["de", "en", "fr", "it"]);
  const DEFAULT_STATUS = "not-applied";
  const STATUS_OPTIONS = [
    { value: "not-applied", color: "#6b7280" },
    { value: "applied", color: "#2563eb" },
    { value: "won", color: "#16a34a" },
    { value: "rejected", color: "#dc2626" },
  ];
  const STATUS_CLASS_PREFIX = "simap-card-status-";
  const STATUS_VALUES = new Set(STATUS_OPTIONS.map((option) => option.value));
  const CARD_STATUS_CLASSES = STATUS_OPTIONS.map(
    (option) => `${STATUS_CLASS_PREFIX}${option.value}`
  );

  const LOCALIZED_COPY = {
    de: {
      heading: "Meine Notizen",
      placeholder: "Notiz für dieses Projekt hinterlegen…",
      statusSaving: "Speichere…",
      statusSaved: "Gespeichert",
      statusDeleted: "Gelöscht",
      statusGroupLabel: "Status",
      statusLabels: {
        "not-applied": "Nicht beworben",
        applied: "Angebot eingereicht",
        won: "Gewonnen",
        rejected: "Abgelehnt",
      },
    },
    en: {
      heading: "My Notes",
      placeholder: "Add a note for this project…",
      statusSaving: "Saving…",
      statusSaved: "Saved",
      statusDeleted: "Deleted",
      statusGroupLabel: "Status",
      statusLabels: {
        "not-applied": "Not applied",
        applied: "Proposal submitted",
        won: "Won",
        rejected: "Rejected",
      },
    },
    fr: {
      heading: "Mes notes",
      placeholder: "Ajouter une note pour ce projet…",
      statusSaving: "Enregistrement…",
      statusSaved: "Enregistré",
      statusDeleted: "Supprimé",
      statusGroupLabel: "Statut",
      statusLabels: {
        "not-applied": "Pas postulé",
        applied: "Offre soumise",
        won: "Gagné",
        rejected: "Refusé",
      },
    },
    it: {
      heading: "Le mie note",
      placeholder: "Aggiungi una nota per questo progetto…",
      statusSaving: "Salvataggio…",
      statusSaved: "Salvato",
      statusDeleted: "Eliminato",
      statusGroupLabel: "Stato",
      statusLabels: {
        "not-applied": "Non candidati",
        applied: "Offerta inviata",
        won: "Vinto",
        rejected: "Respinto",
      },
    },
  };

  const determineLanguage = () => {
    const segments = window.location.pathname.split("/").filter(Boolean);
    const candidate = segments[0];
    return candidate && SUPPORTED_LANGUAGES.has(candidate) ? candidate : null;
  };

  const isSupportedPage = (lang) => {
    if (!lang) {
      return false;
    }

    const currentPath = window.location.pathname;
    if (currentPath === `/${lang}` || currentPath === `/${lang}/`) {
      return true;
    }

    return currentPath.startsWith(`/${lang}/vendor/project-manager`);
  };

  let currentPathname = window.location.pathname;
  let activeLanguage = determineLanguage();

  if (!isSupportedPage(activeLanguage)) {
    // Bail out early if we are not on a page that should display notes.
    return;
  }

  let copy = LOCALIZED_COPY[activeLanguage ?? "de"];

  const setLanguage = (lang) => {
    const fallback = SUPPORTED_LANGUAGES.has(lang) ? lang : "de";
    activeLanguage = fallback;
    copy = LOCALIZED_COPY[fallback];
  };

  setLanguage(activeLanguage ?? "de");

  const normalizeRecord = (value) => {
    if (typeof value === "string") {
      return { note: value, status: DEFAULT_STATUS };
    }

    if (value && typeof value === "object") {
      const note = typeof value.note === "string" ? value.note : "";
      const status = STATUS_VALUES.has(value.status)
        ? value.status
        : DEFAULT_STATUS;
      return { note, status };
    }

    return { note: "", status: DEFAULT_STATUS };
  };

  const normalizeStoredNotes = (rawNotes) => {
    const normalized = {};

    if (!rawNotes || typeof rawNotes !== "object") {
      return normalized;
    }

    for (const [key, value] of Object.entries(rawNotes)) {
      const record = normalizeRecord(value);
      if (record.note || record.status !== DEFAULT_STATUS) {
        normalized[key] = record;
      }
    }

    return normalized;
  };

  const applyStatusToCard = (card, status) => {
    CARD_STATUS_CLASSES.forEach((className) => card.classList.remove(className));
    const targetClass = `${STATUS_CLASS_PREFIX}${status}`;
    card.classList.add(targetClass);
  };

  const teardownUi = () => {
    document
      .querySelectorAll(`.${NOTE_CONTAINER_CLASS}`)
      .forEach((wrapper) => {
        const card = wrapper.closest(CARD_SELECTOR);
        if (card) {
          delete card.dataset.simapNotesReady;
        }
        wrapper.remove();
      });

    document.querySelectorAll(CARD_SELECTOR).forEach((card) => {
      delete card.dataset.simapNotesReady;
      CARD_STATUS_CLASSES.forEach((className) => card.classList.remove(className));
    });
  };

  const loadStoredNotes = () => {
    try {
      const raw = localStorage.getItem(NOTE_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return normalizeStoredNotes(parsed);
    } catch (error) {
      console.warn("[SIMAP Notes] Failed to read stored notes:", error);
      return {};
    }
  };

  const persistNotes = (notes) => {
    try {
      localStorage.setItem(NOTE_STORAGE_KEY, JSON.stringify(notes));
    } catch (error) {
      console.warn("[SIMAP Notes] Failed to persist notes:", error);
    }
  };

  const saveRecord = (projectId, record, notesStore) => {
    if (!record.note && record.status === DEFAULT_STATUS) {
      delete notesStore[projectId];
    } else {
      notesStore[projectId] = record;
    }

    persistNotes(notesStore);
  };

  const debounced = (fn, delay = 300) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  const notes = loadStoredNotes();

  const injectNoteBox = (card) => {
    if (card.dataset.simapNotesReady === "true") {
      return;
    }

    const projectId = card.id;
    if (!projectId) {
      return;
    }

    const record = { ...(notes[projectId] ?? { note: "", status: DEFAULT_STATUS }) };
    applyStatusToCard(card, record.status);

    const wrapper = document.createElement("section");
    wrapper.className = NOTE_CONTAINER_CLASS;

    const heading = document.createElement("header");
    heading.textContent = copy.heading;

    const statusGroup = document.createElement("div");
    statusGroup.className = "simap-status-group";

    const statusHeading = document.createElement("p");
    statusHeading.className = "simap-status-group-label";
    statusHeading.textContent = copy.statusGroupLabel;
    statusGroup.appendChild(statusHeading);

    const statusOptionsContainer = document.createElement("div");
    statusOptionsContainer.className = "simap-status-options";

    STATUS_OPTIONS.forEach((option) => {
      const statusLabel = document.createElement("label");
      statusLabel.className = `simap-status-option simap-status-${option.value}`;

      const input = document.createElement("input");
      input.type = "radio";
      input.name = `simap-status-${projectId}`;
      input.value = option.value;
      input.checked = record.status === option.value;

      const labelText = document.createElement("span");
      labelText.className = "simap-status-text";
      labelText.textContent = copy.statusLabels[option.value];

      input.addEventListener("change", () => {
        if (!input.checked) {
          return;
        }

        record.status = option.value;
        saveRecord(projectId, record, notes);
        applyStatusToCard(card, record.status);
      });

      statusLabel.appendChild(input);
      statusLabel.appendChild(labelText);
      statusOptionsContainer.appendChild(statusLabel);
    });

    statusGroup.appendChild(statusOptionsContainer);

    const textarea = document.createElement("textarea");
    textarea.placeholder = copy.placeholder;
    textarea.value = record.note;

    const handleSave = debounced((value) => {
      const trimmed = value.trim();
      record.note = trimmed;

      saveRecord(projectId, record, notes);
      applyStatusToCard(card, record.status);
    });

    textarea.addEventListener("input", (event) => {
      handleSave(event.target.value);
    });

    wrapper.appendChild(heading);
    wrapper.appendChild(statusGroup);
    wrapper.appendChild(textarea);

    card.appendChild(wrapper);
    card.dataset.simapNotesReady = "true";
  };

  const scanForCards = () => {
    document.querySelectorAll(CARD_SELECTOR).forEach(injectNoteBox);
  };

  const observer = new MutationObserver((mutations) => {
    ensureLanguageSync();
    let shouldRescan = false;

    for (const mutation of mutations) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        shouldRescan = true;
        break;
      }
    }

    if (shouldRescan) {
      scanForCards();
    }
  });

  let isObserving = false;

  const startObserver = () => {
    if (isObserving) {
      return;
    }
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    isObserving = true;
  };

  const stopObserver = () => {
    if (!isObserving) {
      return;
    }
    observer.disconnect();
    isObserving = false;
  };

  const reinitializeForLanguage = (language) => {
    stopObserver();
    teardownUi();

    if (!isSupportedPage(language)) {
      activeLanguage = language ?? null;
      currentPathname = window.location.pathname;
      return;
    }

    currentPathname = window.location.pathname;
    setLanguage(language ?? "de");
    scanForCards();
    startObserver();
  };

  const handleRouteChange = () => {
    const newPath = window.location.pathname;
    const newLanguage = determineLanguage();

    if (newPath === currentPathname && newLanguage === activeLanguage) {
      return;
    }

    reinitializeForLanguage(newLanguage);
  };

  const ensureLanguageSync = () => {
    const latestLanguage = determineLanguage();
    if (latestLanguage !== activeLanguage) {
      reinitializeForLanguage(latestLanguage);
    }
  };

  const installRouteListeners = () => {
    if (window.__simapNotesHistoryPatched) {
      window.addEventListener("simap-notes-route-change", handleRouteChange);
      return;
    }

    window.__simapNotesHistoryPatched = true;

    const notifyRouteChange = () => {
      window.dispatchEvent(new Event("simap-notes-route-change"));
    };

    ["pushState", "replaceState"].forEach((method) => {
      const original = history[method];
      history[method] = function (...args) {
        const result = original.apply(this, args);
        notifyRouteChange();
        return result;
      };
    });

    window.addEventListener("popstate", notifyRouteChange);
    window.addEventListener("simap-notes-route-change", handleRouteChange);
  };

  const boot = () => {
    installRouteListeners();
    scanForCards();
    startObserver();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
