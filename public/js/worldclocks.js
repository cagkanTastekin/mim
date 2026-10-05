const clockList = document.querySelector("#world-clock-list");
const nightZone = document.querySelector("#world-night-zone");
const clockPins = document.querySelector("#world-clock-pins");
const mapWidth = 2000;
const mapHeight = 857;
const mapNorthLatitude = toRadians(85);
const mapSouthLatitude = toRadians(-55);
const robinsonCoefficients = [
	[1, 0], [0.9986, 0.062], [0.9954, 0.124], [0.99, 0.186], [0.9822, 0.248],
	[0.973, 0.31], [0.96, 0.372], [0.9427, 0.434], [0.9216, 0.4958], [0.8962, 0.5571],
	[0.8679, 0.6176], [0.835, 0.6769], [0.7986, 0.7346], [0.7597, 0.7903], [0.7186, 0.8435],
	[0.6732, 0.8936], [0.6213, 0.9394], [0.5722, 0.9761], [0.5322, 1],
];
const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const localOffsetFormatter = createOffsetFormatter(localTimeZone);
const locations = [
	{ city: "GMT", timeZone: "Etc/GMT", coordinates: [{ latitude: 51.4779, longitude: -0.0015 }] },
	{ city: "UTC", timeZone: "UTC", coordinates: [{ latitude: 51.4779, longitude: -0.0015 }] },
	{ city: "London", timeZone: "Europe/London", coordinates: [{ latitude: 51.5072, longitude: -0.1276 }] },
	{ city: "Alaska", timeZone: "America/Anchorage", coordinates: [{ latitude: 61.2181, longitude: -149.9003 }] },
	{ city: "Los Angeles", timeZone: "America/Los_Angeles", coordinates: [{ latitude: 34.0522, longitude: -118.2437 }] },
	{ city: "Atlanta", timeZone: "America/New_York", coordinates: [{ latitude: 33.749, longitude: -84.388 }] },
	{ city: "Lima", timeZone: "America/Lima", coordinates: [{ latitude: -12.0464, longitude: -77.0428 }] },
	{ city: "Sao Paulo (Hortolandia)", timeZone: "America/Sao_Paulo", coordinates: [{ latitude: -22.8583, longitude: -47.2200 }] },
	{ city: "Budapest", timeZone: "Europe/Budapest", coordinates: [{ latitude: 47.4979, longitude: 19.0402 }] },
	{ city: "Moscow", timeZone: "Europe/Moscow", coordinates: [{ latitude: 55.7558, longitude: 37.6173 }] },
	{ city: "Cairo", timeZone: "Africa/Cairo", coordinates: [{ latitude: 30.0444, longitude: 31.2357 }] },
	{ city: "Durban", timeZone: "Africa/Johannesburg", coordinates: [{ latitude: -29.8587, longitude: 31.0218 }] },
	{ city: "Johannesburg", timeZone: "Africa/Johannesburg", coordinates: [{ latitude: -26.2041, longitude: 28.0473 }] },
	{ city: "IST", timeZone: "Asia/Kolkata", coordinates: [{ latitude: 28.6139, longitude: 77.209 }] },
	{ city: "Dalian", timeZone: "Asia/Shanghai", coordinates: [{ latitude: 38.914, longitude: 121.6147 }] },
	{ city: "Sydney", timeZone: "Australia/Sydney", coordinates: [{ latitude: -33.8688, longitude: 151.2093 }] },
	{ city: "Auckland", timeZone: "Pacific/Auckland", coordinates: [{ latitude: -36.8509, longitude: 174.7645 }] },
];

function createOffsetFormatter(timeZone) {
	return new Intl.DateTimeFormat("en-US", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23",
	});
}

function getUtcOffsetMinutes(date, formatter) {
	const parts = Object.fromEntries(formatter.formatToParts(date).map(({ type, value }) => [type, value]));
	const localTimeAsUtc = Date.UTC(
		Number(parts.year),
		Number(parts.month) - 1,
		Number(parts.day),
		Number(parts.hour),
		Number(parts.minute),
		Number(parts.second),
	);
	return (localTimeAsUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000;
}

function formatTimeDifference(offsetDifference) {
	if (offsetDifference === 0) return "Same time as you";
	const totalMinutes = Math.abs(offsetDifference);
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	const duration = [
		hours > 0 ? `${hours} ${hours === 1 ? "hour" : "hours"}` : "",
		minutes > 0 ? `${minutes} minutes` : "",
	].filter(Boolean).join(" ");
	return `${duration} ${offsetDifference > 0 ? "ahead of you" : "behind you"}`;
}

function selectLocation(location, selectedRow) {
	clockPins.replaceChildren();
	for (const row of clockList.querySelectorAll(".world-clock-row")) {
		const isSelected = row === selectedRow;
		row.setAttribute("aria-pressed", String(isSelected));
	}

	for (const { latitude, longitude } of location.coordinates) {
		const position = mapCoordinates(toRadians(longitude), toRadians(latitude));
		const marker = document.createElementNS("http://www.w3.org/2000/svg", "g");
		marker.classList.add("world-clock-pin");
		const halo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
		halo.classList.add("world-clock-pin-halo");
		halo.setAttribute("cx", position.x.toFixed(1));
		halo.setAttribute("cy", position.y.toFixed(1));
		halo.setAttribute("r", "10");
		const center = document.createElementNS("http://www.w3.org/2000/svg", "circle");
		center.classList.add("world-clock-pin-center");
		center.setAttribute("cx", position.x.toFixed(1));
		center.setAttribute("cy", position.y.toFixed(1));
		center.setAttribute("r", "4");
		marker.append(halo, center);
		clockPins.append(marker);
	}
}

const clocks = locations.map((location, index) => {
	const { city, timeZone } = location;
	const row = document.createElement("article");
	row.className = "world-clock-row";
	row.setAttribute("role", "button");
	row.setAttribute("tabindex", "0");
	row.setAttribute("aria-pressed", "false");
	row.setAttribute("aria-label", `Show ${city} on map`);
	row.addEventListener("click", () => selectLocation(location, row));
	row.addEventListener("keydown", (event) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			selectLocation(location, row);
		}
	});
	const place = document.createElement("div");
	place.className = "world-clock-place";
	const cityName = document.createElement("h2");
	cityName.className = "world-clock-city";
	cityName.textContent = city;
	const zoneName = document.createElement("span");
	zoneName.className = "world-clock-zone";
	place.append(cityName, zoneName);
	const time = document.createElement("time");
	time.className = "world-clock-time";
	const date = document.createElement("span");
	date.className = "world-clock-date";
	const difference = document.createElement("span");
	difference.className = "world-clock-difference";
	row.append(place, time, date, difference);
	clockList.append(row);
	return {
		timeZone,
		zoneName,
		time,
		date,
		difference,
		offsetFormatter: createOffsetFormatter(timeZone),
		timeFormatter: new Intl.DateTimeFormat("en", {
			timeZone,
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hourCycle: "h23",
		}),
		dateFormatter: new Intl.DateTimeFormat("en", {
			timeZone,
			weekday: "short",
			month: "short",
			day: "numeric",
		}),
		zoneFormatter: new Intl.DateTimeFormat("en", { timeZone, timeZoneName: "short" }),
	};
});

function toRadians(degrees) {
	return degrees * Math.PI / 180;
}

function normalizeDegrees(degrees) {
	return ((degrees % 360) + 360) % 360;
}

function getRobinsonCoefficients(latitude) {
	const absoluteLatitude = Math.min(Math.abs(latitude), 90);
	const index = Math.min(Math.floor(absoluteLatitude / 5), robinsonCoefficients.length - 2);
	const fraction = absoluteLatitude / 5 - index;
	const [lowerX, lowerY] = robinsonCoefficients[index];
	const [upperX, upperY] = robinsonCoefficients[index + 1];
	return {
		x: lowerX + (upperX - lowerX) * fraction,
		y: Math.sign(latitude) * (lowerY + (upperY - lowerY) * fraction),
	};
}

function getSubsolarPosition(date) {
	const julianDate = date.getTime() / 86400000 + 2440587.5;
	const century = (julianDate - 2451545) / 36525;
	const meanLongitude = normalizeDegrees(280.46646 + century * (36000.76983 + 0.0003032 * century));
	const meanAnomaly = toRadians(normalizeDegrees(357.52911 + century * (35999.05029 - 0.0001537 * century)));
	const equationOfCenter = (1.914602 - century * (0.004817 + 0.000014 * century)) * Math.sin(meanAnomaly)
		+ (0.019993 - 0.000101 * century) * Math.sin(2 * meanAnomaly)
		+ 0.000289 * Math.sin(3 * meanAnomaly);
	const omega = toRadians(125.04 - 1934.136 * century);
	const apparentLongitude = toRadians(meanLongitude + equationOfCenter - 0.00569 - 0.00478 * Math.sin(omega));
	const meanObliquity = 23 + (26 + (21.448 - century * (46.815 + century * (0.00059 - century * 0.001813))) / 60) / 60;
	const obliquity = toRadians(meanObliquity + 0.00256 * Math.cos(omega));
	const rightAscension = Math.atan2(Math.cos(obliquity) * Math.sin(apparentLongitude), Math.cos(apparentLongitude));
	const declination = Math.asin(Math.sin(obliquity) * Math.sin(apparentLongitude));
	const siderealDegrees = 280.46061837 + 360.98564736629 * (julianDate - 2451545)
		+ 0.000387933 * century ** 2 - century ** 3 / 38710000;
	const longitude = ((rightAscension - toRadians(normalizeDegrees(siderealDegrees)) + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
	return { longitude, declination };
}

function mapCoordinates(longitude, latitude) {
	const { x: longitudeScale, y: projectedLatitude } = getRobinsonCoefficients(latitude * 180 / Math.PI);
	const northY = getRobinsonCoefficients(mapNorthLatitude * 180 / Math.PI).y;
	const southY = getRobinsonCoefficients(mapSouthLatitude * 180 / Math.PI).y;
	return {
		x: mapWidth / 2 + longitude / Math.PI * longitudeScale * mapWidth / 2,
		y: (northY - projectedLatitude) / (northY - southY) * mapHeight,
	};
}

function getNightZonePath(longitude, declination) {
	const pathSegments = [];
	const latitudeStep = toRadians(0.5);
	for (let south = mapSouthLatitude; south < mapNorthLatitude; south += latitudeStep) {
		const north = Math.min(south + latitudeStep, mapNorthLatitude);
		const latitude = (south + north) / 2;
		const threshold = -Math.tan(latitude) * Math.tan(declination);
		if (threshold <= -1) continue;

		let intervals;
		if (threshold >= 1) {
			intervals = [[-Math.PI, Math.PI]];
		} else {
			const halfWidth = Math.acos(threshold);
			const start = longitude + halfWidth;
			const end = longitude + 2 * Math.PI - halfWidth;
			intervals = [-2 * Math.PI, 0, 2 * Math.PI]
				.map((shift) => [Math.max(-Math.PI, start + shift), Math.min(Math.PI, end + shift)])
				.filter(([west, east]) => east > west);
		}

		const top = mapCoordinates(0, north).y;
		const bottom = mapCoordinates(0, south).y;
		for (const [west, east] of intervals) {
			const left = mapCoordinates(west, latitude).x;
			const right = mapCoordinates(east, latitude).x;
			pathSegments.push(`M${left.toFixed(1)},${top.toFixed(1)}H${right.toFixed(1)}V${bottom.toFixed(1)}H${left.toFixed(1)}Z`);
		}
	}
	return pathSegments.join("");
}

function updateNightZone(date = new Date()) {
	const { longitude, declination } = getSubsolarPosition(date);
	nightZone.setAttribute("d", getNightZonePath(longitude, declination));
}

function updateClocks() {
	const now = new Date();
	const localOffset = getUtcOffsetMinutes(now, localOffsetFormatter);
	for (const clock of clocks) {
		clock.time.dateTime = now.toISOString();
		clock.time.textContent = clock.timeFormatter.format(now);
		clock.date.textContent = clock.dateFormatter.format(now);
		clock.zoneName.textContent = clock.zoneFormatter.formatToParts(now)
			.find(({ type }) => type === "timeZoneName")?.value ?? clock.timeZone;
		const offsetDifference = getUtcOffsetMinutes(now, clock.offsetFormatter) - localOffset;
		clock.difference.textContent = formatTimeDifference(offsetDifference);
	}
}

updateClocks();
updateNightZone();
setInterval(updateClocks, 1000);
setInterval(updateNightZone, 60000);
