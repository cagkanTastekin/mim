const sourceTimeInput = document.querySelector("#source-time");
const sourceZoneSelect = document.querySelector("#source-zone");
const sourceTimeStatus = document.querySelector("#source-time-status");
const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "your local timezone";
const sourceZoneOption = [...sourceZoneSelect.options].find(({ value }) => value === localTimeZone);
if (sourceZoneOption) {
	sourceZoneOption.textContent += " (device timezone)";
	sourceZoneSelect.value = localTimeZone;
} else if (localTimeZone !== "your local timezone") {
	const localOption = document.createElement("option");
	localOption.value = localTimeZone;
	localOption.textContent = `Device timezone (${localTimeZone.replace(/_/g, " ")})`;
	sourceZoneSelect.prepend(localOption);
	sourceZoneSelect.value = localTimeZone;
}

const timeFormatters = [...document.querySelectorAll(".time-converter-result")].map((result) => ({
	result,
	time: result.querySelector(".time-converter-time"),
	date: result.querySelector(".time-converter-date"),
	zone: result.querySelector(".time-converter-zone"),
	timeFormatter: new Intl.DateTimeFormat("en", {
		timeZone: result.dataset.timeZone,
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}),
	dateFormatter: new Intl.DateTimeFormat("en", {
		timeZone: result.dataset.timeZone,
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
	}),
	zoneFormatter: new Intl.DateTimeFormat("en", {
		timeZone: result.dataset.timeZone,
		timeZoneName: "short",
	}),
}));

function toInputValueInZone(date, timeZone) {
	const pad = (value) => String(value).padStart(2, "0");
	const parts = getZonedParts(date, timeZone);
	return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

function getZonedParts(date, timeZone) {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23",
	}).formatToParts(date);
	return Object.fromEntries(parts.map(({ type, value }) => [type, Number(value)]));
}

function getZoneOffsetMinutes(date, timeZone) {
	const parts = getZonedParts(date, timeZone);
	const zoneTimeAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
	return (zoneTimeAsUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000;
}

function getInputTimeParts(value) {
	const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
	if (!match) return null;
	const [, year, month, day, hour, minute] = match.map(Number);
	return { year, month, day, hour, minute, second: 0 };
}

function sameWallTime(actual, expected) {
	return ["year", "month", "day", "hour", "minute", "second"]
		.every((part) => actual[part] === expected[part]);
}

function resolveInputTime(value, timeZone) {
	const parts = getInputTimeParts(value);
	if (!parts) return { date: null, ambiguous: false };

	const wallTimeAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
	const offsets = new Set();
	for (let hours = -36; hours <= 36; hours += 12) {
		offsets.add(getZoneOffsetMinutes(new Date(wallTimeAsUtc + hours * 60 * 60 * 1000), timeZone));
	}

	const candidates = [...offsets]
		.map((offset) => new Date(wallTimeAsUtc - offset * 60 * 1000))
		.filter((date) => sameWallTime(getZonedParts(date, timeZone), parts))
		.sort((left, right) => left - right);
	return { date: candidates[0] ?? null, ambiguous: candidates.length > 1 };
}

function updateConvertedTimes() {
	const timeZone = sourceZoneSelect.value;
	const { date, ambiguous } = resolveInputTime(sourceTimeInput.value, timeZone);
	if (!date) {
		for (const formatter of timeFormatters) {
			formatter.time.textContent = "";
			formatter.time.removeAttribute("datetime");
			formatter.date.textContent = "";
			formatter.zone.textContent = "";
		}
		sourceTimeStatus.textContent = `That time does not exist in ${sourceZoneSelect.selectedOptions[0].textContent}; clocks may move forward at that time.`;
		return;
	}

	for (const formatter of timeFormatters) {
		formatter.time.dateTime = date.toISOString();
		formatter.time.textContent = formatter.timeFormatter.format(date);
		formatter.date.textContent = formatter.dateFormatter.format(date);
		formatter.zone.textContent = formatter.zoneFormatter.formatToParts(date)
			.find(({ type }) => type === "timeZoneName")?.value ?? "";
	}
	sourceTimeStatus.textContent = ambiguous
		? `This time occurs twice in ${sourceZoneSelect.selectedOptions[0].textContent}; using the earlier occurrence.`
		: `Input timezone: ${sourceZoneSelect.selectedOptions[0].textContent}`;
}

sourceTimeInput.value = toInputValueInZone(new Date(), sourceZoneSelect.value);
sourceTimeInput.addEventListener("input", updateConvertedTimes);
sourceZoneSelect.addEventListener("change", updateConvertedTimes);
updateConvertedTimes();
