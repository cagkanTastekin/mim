const minimizedDock = document.querySelector("#minimized-dialog-dock");
const themeToggle = document.querySelector("#theme-toggle");
const preservedOnClose = new WeakSet();
const minimizedPopups = new Map();
const iramsTemplate = document.querySelector("#irams-dialog-template");
const iramsOpenButton = document.querySelector("[data-open-irams]");
const iramsInstances = new Set();
const maxIramsInstances = 10;
const iramsStorageKey = "gemmim-active-irams";
const savedIramsInstances = (() => {
	try {
		const saved = JSON.parse(sessionStorage.getItem(iramsStorageKey) || "[]");
		return Array.isArray(saved)
			? saved.filter(({ instanceNumber }) => Number.isInteger(instanceNumber) && instanceNumber > 0).slice(0, maxIramsInstances)
			: [];
	} catch {
		return [];
	}
})();
let nextIramsInstance = 1;
let nextIramsDisplayNumber = 1;
let nextIramsStateId = 1;
const popups = [
	{ id: "alphabet-dialog", title: "Phonetic Alphabet", open: "[data-open-alphabet]", close: "#dialog-close", frame: "#alphabet-frame" },
	{ id: "phonecodes-dialog", title: "Phone Codes", open: "[data-open-phonecodes]", close: "#phonecodes-dialog-close", frame: "#phonecodes-frame" },
	{ id: "links-dialog", title: "Useful Links", open: "[data-open-links]", close: "#links-dialog-close", frame: "#links-frame" },
	{ id: "passwordgenerator-dialog", title: "Password Generator", open: "[data-open-passwordgenerator]", close: "#passwordgenerator-dialog-close", frame: "#passwordgenerator-frame" },
	{ id: "worldclocks-dialog", title: "World Clocks", open: "[data-open-worldclocks]", close: "#worldclocks-dialog-close", frame: "#worldclocks-frame" },
	{ id: "timeconverter-dialog", title: "Time Converter", open: "[data-open-timeconverter]", close: "#timeconverter-dialog-close", frame: "#timeconverter-frame" },
].map((popup) => ({
	...popup,
	dialog: document.querySelector(`#${popup.id}`),
	frame: document.querySelector(popup.frame),
}));

function setTheme(isDark) {
	const theme = isDark ? "dark" : "light";
	document.documentElement.dataset.theme = theme;
	document.querySelector('meta[name="theme-color"]').content = isDark ? "#252927" : "#f5f5ef";
	themeToggle.setAttribute("aria-checked", String(isDark));
	themeToggle.title = `Switch to ${isDark ? "light" : "dark"} mode`;
	syncPopupThemes(theme);
	try {
		localStorage.setItem("gemmim-theme", theme);
	} catch {}
}

function syncPopupTheme(frame, theme = document.documentElement.dataset.theme) {
	frame.contentWindow?.postMessage({ type: "gemmim-theme", theme }, "*");
}

function syncPopupThemes(theme) {
	document.querySelectorAll(".alphabet-frame").forEach((frame) => syncPopupTheme(frame, theme));
}

themeToggle.addEventListener("click", () => {
	setTheme(themeToggle.getAttribute("aria-checked") !== "true");
});
setTheme(document.documentElement.dataset.theme === "dark");

function updateDockVisibility() {
	minimizedDock.hidden = minimizedPopups.size === 0;
}

function persistIramsInstances() {
	try {
		sessionStorage.setItem(iramsStorageKey, JSON.stringify([...iramsInstances].map((popup) => ({
			instanceNumber: popup.instanceNumber,
			stateId: popup.stateId,
			minimized: minimizedPopups.has(popup.dialog),
		}))));
	} catch {
		return;
	}
}

function clearIramsFormState(stateId) {
	try {
		sessionStorage.removeItem(`gemmim-irams-state-${stateId}`);
	} catch {
		return;
	}
}

function restorePopup(popup) {
	minimizedPopups.get(popup.dialog)?.remove();
	minimizedPopups.delete(popup.dialog);
	updateDockVisibility();
	popup.dialog.showModal();
	syncPopupTheme(popup.frame);
	const toolbar = popup.dialog.querySelector(".dialog-toolbar");
	toolbar.tabIndex = -1;
	toolbar.focus({ preventScroll: true });
	if (popup.isIrams) persistIramsInstances();
}

function minimizePopup(popup) {
	if (popup.isIrams && !popup.frameLoaded) {
		popup.pendingMinimize = true;
		return;
	}
	if (popup.isIrams) {
		try {
			const reference = popup.frame.contentDocument.querySelector("#irams-reference")?.value;
			if (reference !== undefined) setIramsReference(popup, reference);
		} catch {}
	}
	const dockItem = document.createElement("div");
	dockItem.className = "minimized-popup";
	const restoreButton = document.createElement("button");
	restoreButton.className = "minimized-popup-restore";
	restoreButton.type = "button";
	restoreButton.textContent = popup.title;
	restoreButton.setAttribute("aria-label", `Restore ${popup.title}`);
	restoreButton.addEventListener("click", () => restorePopup(popup));
	const dismissButton = document.createElement("button");
	dismissButton.className = "minimized-popup-dismiss";
	dismissButton.type = "button";
	dismissButton.textContent = "×";
	dismissButton.title = `Close ${popup.title}`;
	dismissButton.setAttribute("aria-label", `Close ${popup.title}`);
	dismissButton.addEventListener("click", () => {
		dockItem.remove();
		minimizedPopups.delete(popup.dialog);
		if (popup.onDismiss) popup.onDismiss();
		else popup.frame.src = popup.frame.src;
		updateDockVisibility();
	});
	dockItem.append(restoreButton, dismissButton);
	minimizedPopups.set(popup.dialog, dockItem);
	preservedOnClose.add(popup.dialog);
	popup.dialog.close();
	minimizedDock.append(dockItem);
	updateDockVisibility();
	if (popup.isIrams) persistIramsInstances();
}

for (const popup of popups) {
	popup.frame.addEventListener("load", () => syncPopupTheme(popup.frame));
	document.querySelector(popup.open).addEventListener("click", () => restorePopup(popup));
	document.querySelector(popup.close).addEventListener("click", () => popup.dialog.close());
	document.querySelector(`[data-minimize="${popup.id}"]`).addEventListener("click", () => minimizePopup(popup));
	popup.dialog.addEventListener("close", () => {
		if (preservedOnClose.has(popup.dialog)) {
			preservedOnClose.delete(popup.dialog);
			return;
		}
		if (popup.onClose) popup.onClose();
		else popup.frame.src = popup.frame.src;
	});
}

function updateIramsButton() {
	const isAtLimit = iramsInstances.size >= maxIramsInstances;
	iramsOpenButton.disabled = isAtLimit;
	iramsOpenButton.title = isAtLimit ? "Close an IRAMS popup to open another" : "";
}

function createIramsStateId() {
	if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
	const stateId = `${Date.now().toString(36)}-${nextIramsStateId}`;
	nextIramsStateId += 1;
	return stateId;
}

function setIramsReference(popup, reference) {
	popup.title = reference.trim() || `IRAMS Wording ${popup.displayNumber}`;
	popup.dialog.setAttribute("aria-label", popup.title);
	const dockItem = minimizedPopups.get(popup.dialog);
	if (!dockItem) return;
	const restoreButton = dockItem.querySelector(".minimized-popup-restore");
	const dismissButton = dockItem.querySelector(".minimized-popup-dismiss");
	restoreButton.textContent = popup.title;
	restoreButton.setAttribute("aria-label", `Restore ${popup.title}`);
	dismissButton.title = `Close ${popup.title}`;
	dismissButton.setAttribute("aria-label", `Close ${popup.title}`);
}

window.addEventListener("message", (event) => {
	if (event.origin !== window.location.origin || event.data?.type !== "irams-reference") return;
	const popup = [...iramsInstances].find(({ frame, stateId }) => (
		frame.contentWindow === event.source && stateId === event.data.instanceId
	));
	if (!popup || typeof event.data.reference !== "string") return;
	setIramsReference(popup, event.data.reference);
});

function removeIramsPopup(popup) {
	iramsInstances.delete(popup);
	clearIramsFormState(popup.stateId);
	popup.dialog.remove();
	persistIramsInstances();
	updateIramsButton();
}

function createIramsPopup(instanceNumber, shouldMinimize = false, displayNumber = nextIramsDisplayNumber, stateId = createIramsStateId()) {
	nextIramsInstance = Math.max(nextIramsInstance, instanceNumber + 1);
	nextIramsDisplayNumber = Math.max(nextIramsDisplayNumber, displayNumber + 1);
	const dialog = iramsTemplate.content.firstElementChild.cloneNode(true);
	dialog.id = `irams-dialog-${instanceNumber}`;
	dialog.setAttribute("aria-label", `IRAMS Wording ${displayNumber}`);
	const frame = dialog.querySelector("iframe");
	const popup = {
		dialog,
		frame,
		instanceNumber,
		displayNumber,
		stateId,
		isIrams: true,
		title: `IRAMS Wording ${displayNumber}`,
		onClose: () => removeIramsPopup(popup),
		onDismiss: () => removeIramsPopup(popup),
	};
	frame.addEventListener("load", () => {
		popup.frameLoaded = true;
		syncPopupTheme(frame);
		try {
			const reference = frame.contentDocument.querySelector("#irams-reference")?.value;
			if (reference !== undefined) setIramsReference(popup, reference);
		} catch {}
		if (popup.pendingMinimize) minimizePopup(popup);
	}, { once: true });
	iramsInstances.add(popup);
	frame.src = `public/html/iramswording.html?instance=${encodeURIComponent(stateId)}`;
	document.body.append(dialog);
	persistIramsInstances();
	updateIramsButton();

	dialog.querySelector("[data-close-irams]").addEventListener("click", () => dialog.close());
	dialog.querySelector("[data-minimize-irams]").addEventListener("click", () => minimizePopup(popup));
	dialog.addEventListener("close", () => {
		if (preservedOnClose.has(dialog)) {
			preservedOnClose.delete(dialog);
			return;
		}
		popup.onClose();
	});

	if (shouldMinimize) {
		dialog.showModal();
		minimizePopup(popup);
	} else {
		restorePopup(popup);
	}
}

function openIramsPopup() {
	if (iramsInstances.size >= maxIramsInstances) return;
	createIramsPopup(nextIramsInstance, false, nextIramsDisplayNumber);
}

iramsOpenButton.addEventListener("click", openIramsPopup);

savedIramsInstances.forEach((saved, index) => {
	createIramsPopup(saved.instanceNumber, saved.minimized, index + 1, saved.stateId || String(saved.instanceNumber));
});
