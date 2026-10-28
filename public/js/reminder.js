const form = document.querySelector("#reminder-form");
const incidentNumberInput = document.querySelector("#incident-number");
const reminderStatus = document.querySelector("#reminder-status");
const instanceId = new URLSearchParams(window.location.search).get("instance");
const stateStorageKey = instanceId ? `gemmim-reminder-state-${instanceId}` : null;
const schedules = [
	{
		key: "isp",
		label: "ISP mail subject",
		subject: document.querySelector("#isp-mail-subject"),
		enabled: document.querySelector("#isp-reminder-enabled"),
		time: document.querySelector("#isp-reminder-time"),
		setButton: document.querySelector("#isp-reminder-set"),
		countdown: document.querySelector("#isp-countdown"),
		message: document.querySelector("#isp-schedule-message"),
		container: document.querySelector("#isp-schedule"),
	},
	{
		key: "customer",
		label: "Customer mail subject",
		subject: document.querySelector("#customer-mail-subject"),
		enabled: document.querySelector("#customer-reminder-enabled"),
		time: document.querySelector("#customer-reminder-time"),
		setButton: document.querySelector("#customer-reminder-set"),
		countdown: document.querySelector("#customer-countdown"),
		message: document.querySelector("#customer-schedule-message"),
		container: document.querySelector("#customer-schedule"),
	},
];
const notificationMessages = { isp: "", customer: "" };
let audioContext;

function formatLocalDateTime(date) {
	const pad = (value) => String(value).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function updateMinimumTime(schedule) {
	const nextMinute = new Date(Math.ceil(Date.now() / 60000) * 60000);
	schedule.time.min = formatLocalDateTime(nextMinute);
}

function saveFormState() {
	if (!stateStorageKey) return;
	const state = {
		incidentNumber: incidentNumberInput.value,
		ispReference: document.querySelector("#isp-reference").value,
		ispMailSubject: document.querySelector("#isp-mail-subject").value,
		customerMailSubject: document.querySelector("#customer-mail-subject").value,
		schedules: Object.fromEntries(schedules.map((schedule) => [
			schedule.key,
			{
				enabled: schedule.enabled.checked,
				time: schedule.time.value,
				active: schedule.active,
				notified: Boolean(notificationMessages[schedule.key]),
			},
		])),
	};
	try {
		sessionStorage.setItem(stateStorageKey, JSON.stringify(state));
	} catch (error) {
		console.error("Could not save reminder details for this tab.", error);
	}
}

function renderCountdown(schedule) {
	if (!schedule.active) {
		schedule.countdown.textContent = notificationMessages[schedule.key] ? "00:00" : "--:--";
		return;
	}
	const dueTime = new Date(schedule.time.value).getTime();
	const remainingMinutes = Math.max(0, Math.ceil((dueTime - Date.now()) / 60000));
	const hours = Math.floor(remainingMinutes / 60);
	const minutes = remainingMinutes % 60;
	schedule.countdown.textContent = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function setScheduleMessage(schedule, message) {
	schedule.message.textContent = message;
}

function notifyParentOfIncident() {
	if (!instanceId) return;
	window.parent.postMessage({
		type: "reminder-incident",
		instanceId,
		incidentNumber: incidentNumberInput.value.trim(),
	}, "*");
}

function renderStatus() {
	reminderStatus.textContent = Object.values(notificationMessages).filter(Boolean).join(" ");
	if (!instanceId) return;
	window.parent.postMessage({
		type: "reminder-due-state",
		instanceId,
		isDue: Object.values(notificationMessages).some(Boolean),
	}, "*");
}

async function playAlertSound() {
	try {
		const AudioContextConstructor = window.AudioContext;
		if (!AudioContextConstructor) throw new Error("Audio is not supported by this browser.");
		audioContext ||= new AudioContextConstructor();
		if (audioContext.state === "suspended") await audioContext.resume();

		const oscillator = audioContext.createOscillator();
		const gain = audioContext.createGain();
		oscillator.type = "sine";
		oscillator.frequency.value = 880;
		oscillator.connect(gain);
		gain.connect(audioContext.destination);
		const start = audioContext.currentTime;
		for (const offset of [0, 0.42, 0.84]) {
			gain.gain.setValueAtTime(0.0001, start + offset);
			gain.gain.exponentialRampToValueAtTime(0.18, start + offset + 0.035);
			gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.3);
		}
		oscillator.start(start);
		oscillator.stop(start + 1.2);
	} catch (error) {
		reminderStatus.textContent += " Sound could not play; check browser audio settings.";
		console.error("Could not play reminder alert sound.", error);
	}
}

function checkScheduledReminders() {
	const now = Date.now();
	for (const schedule of schedules) {
		if (!schedule.enabled.checked || !schedule.active || !schedule.time.value || notificationMessages[schedule.key]) {
			renderCountdown(schedule);
			continue;
		}
		const dueTime = new Date(schedule.time.value).getTime();
		if (!Number.isFinite(dueTime) || now < dueTime) {
			renderCountdown(schedule);
			continue;
		}
		notificationMessages[schedule.key] = `${schedule.label}: next action time reached.`;
		schedule.active = false;
		schedule.countdown.textContent = "00:00";
		saveFormState();
		renderStatus();
		playAlertSound();
	}
}

function configureSchedule(schedule, savedSchedule) {
	const subjectIsPresent = Boolean(schedule.subject.value.trim());
	schedule.enabled.checked = subjectIsPresent && Boolean(savedSchedule?.enabled);
	schedule.enabled.disabled = !subjectIsPresent;
	schedule.time.value = typeof savedSchedule?.time === "string" ? savedSchedule.time : "";
	schedule.active = Boolean(savedSchedule?.active && schedule.enabled.checked && schedule.time.value);
	schedule.time.disabled = !schedule.enabled.checked;
	schedule.container.hidden = !schedule.enabled.checked;
	updateMinimumTime(schedule);
	if (savedSchedule?.notified && schedule.enabled.checked && schedule.time.value) {
		notificationMessages[schedule.key] = `${schedule.label}: next action time reached.`;
	}

	function validateFutureTime(showError = true) {
		updateMinimumTime(schedule);
		const dueTime = schedule.time.value ? new Date(schedule.time.value).getTime() : NaN;
		if (Number.isFinite(dueTime) && dueTime > Date.now()) {
			setScheduleMessage(schedule, "");
			schedule.time.setCustomValidity("");
			return true;
		}

		if (showError) {
			const message = schedule.time.value ? "Choose a future date and time." : "Choose a date and time.";
			schedule.time.setCustomValidity(message);
			schedule.time.reportValidity();
		}
		schedule.time.setCustomValidity("");
		setScheduleMessage(schedule, schedule.time.value
			? "Past times are not allowed. Choose a future date and time."
			: "Choose a date and time.");
		return false;
	}

	schedule.setButton.addEventListener("click", () => {
		if (!schedule.enabled.checked || !schedule.subject.value.trim()) return;
		if (!validateFutureTime()) {
			schedule.active = false;
			schedule.countdown.textContent = "--:--";
			saveFormState();
			renderStatus();
			return;
		}
		schedule.active = true;
		notificationMessages[schedule.key] = "";
		setScheduleMessage(schedule, "");
		void prepareAudio();
		saveFormState();
		renderStatus();
		checkScheduledReminders();
	});

	schedule.subject.addEventListener("input", () => {
		const hasSubject = Boolean(schedule.subject.value.trim());
		schedule.enabled.disabled = !hasSubject;
		if (!hasSubject) {
			schedule.enabled.checked = false;
			schedule.time.value = "";
			schedule.active = false;
			schedule.time.disabled = true;
			schedule.container.hidden = true;
			schedule.countdown.textContent = "--:--";
			setScheduleMessage(schedule, "");
			notificationMessages[schedule.key] = "";
			renderStatus();
		}
		saveFormState();
	});

	schedule.enabled.addEventListener("change", () => {
		schedule.container.hidden = !schedule.enabled.checked;
		schedule.time.disabled = !schedule.enabled.checked;
		notificationMessages[schedule.key] = "";
		setScheduleMessage(schedule, "");
		schedule.active = false;
		schedule.countdown.textContent = "--:--";
		if (schedule.enabled.checked) void prepareAudio();
		saveFormState();
		renderStatus();
		checkScheduledReminders();
	});
	schedule.time.addEventListener("focus", () => updateMinimumTime(schedule));
	schedule.time.addEventListener("input", () => {
		schedule.active = false;
		schedule.countdown.textContent = "--:--";
		notificationMessages[schedule.key] = "";
		validateFutureTime(false);
		saveFormState();
		renderStatus();
	});
	schedule.time.addEventListener("change", () => {
		schedule.active = false;
		schedule.countdown.textContent = "--:--";
		validateFutureTime(false);
		saveFormState();
		renderStatus();
	});
}

async function prepareAudio() {
	try {
		if (!window.AudioContext) return;
		audioContext ||= new window.AudioContext();
		if (audioContext.state === "suspended") await audioContext.resume();
	} catch (error) {
		console.error("Could not prepare reminder alert sound.", error);
	}
}

function restoreFormState() {
	if (!stateStorageKey) return {};
	try {
		const state = JSON.parse(sessionStorage.getItem(stateStorageKey) || "{}");
		return state && typeof state === "object" ? state : {};
	} catch (error) {
		console.error("Could not restore reminder details for this tab.", error);
		return {};
	}
}

const savedState = restoreFormState();
document.querySelector("#isp-reference").value = typeof savedState.ispReference === "string" ? savedState.ispReference : "";
document.querySelector("#isp-mail-subject").value = typeof savedState.ispMailSubject === "string" ? savedState.ispMailSubject : "";
document.querySelector("#customer-mail-subject").value = typeof savedState.customerMailSubject === "string" ? savedState.customerMailSubject : "";
incidentNumberInput.value = typeof savedState.incidentNumber === "string" ? savedState.incidentNumber : "";
schedules.forEach((schedule) => configureSchedule(schedule, savedState.schedules?.[schedule.key]));
notifyParentOfIncident();
renderStatus();
checkScheduledReminders();
window.setInterval(checkScheduledReminders, 1000);

form.addEventListener("input", (event) => {
	if (event.target === incidentNumberInput) notifyParentOfIncident();
	saveFormState();
});
