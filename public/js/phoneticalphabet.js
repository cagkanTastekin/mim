const spellingInput = document.querySelector("#spelling-input");
const clearSpellingButton = document.querySelector("#spelling-input-clear");
const spellingOutput = document.querySelector("#spelling-output");
const spellingStatus = document.querySelector("#spelling-status");
const alphabet = new Map();
const data = {
	letters: [
		{ symbol: "A", word: "Alfa" },
		{ symbol: "B", word: "Bravo" },
		{ symbol: "C", word: "Charlie" },
		{ symbol: "D", word: "Delta" },
		{ symbol: "E", word: "Echo" },
		{ symbol: "F", word: "Foxtrot" },
		{ symbol: "G", word: "Golf" },
		{ symbol: "H", word: "Hotel" },
		{ symbol: "I", word: "India" },
		{ symbol: "J", word: "Juliett" },
		{ symbol: "K", word: "Kilo" },
		{ symbol: "L", word: "Lima" },
		{ symbol: "M", word: "Mike" },
		{ symbol: "N", word: "November" },
		{ symbol: "O", word: "Oscar" },
		{ symbol: "P", word: "Papa" },
		{ symbol: "Q", word: "Quebec" },
		{ symbol: "R", word: "Romeo" },
		{ symbol: "S", word: "Sierra" },
		{ symbol: "T", word: "Tango" },
		{ symbol: "U", word: "Uniform" },
		{ symbol: "V", word: "Victor" },
		{ symbol: "W", word: "Whiskey" },
		{ symbol: "X", word: "X-ray" },
		{ symbol: "Y", word: "Yankee" },
		{ symbol: "Z", word: "Zulu" },
	],
	numbers: [
		{ symbol: "0", word: "Zero" },
		{ symbol: "1", word: "One" },
		{ symbol: "2", word: "Two" },
		{ symbol: "3", word: "Three" },
		{ symbol: "4", word: "Four" },
		{ symbol: "5", word: "Five" },
		{ symbol: "6", word: "Six" },
		{ symbol: "7", word: "Seven" },
		{ symbol: "8", word: "Eight" },
		{ symbol: "9", word: "Nine" },
	],
	symbols: [
		{ symbol: "!", word: "Exclamation mark" },
		{ symbol: "@", word: "At sign" },
		{ symbol: "#", word: "Number sign" },
		{ symbol: "$", word: "Dollar sign" },
		{ symbol: "%", word: "Percent sign" },
		{ symbol: "^", word: "Caret" },
		{ symbol: "&", word: "Ampersand" },
		{ symbol: "*", word: "Asterisk" },
		{ symbol: "(", word: "Open parenthesis" },
		{ symbol: ")", word: "Close parenthesis" },
		{ symbol: "-", word: "Hyphen" },
		{ symbol: "_", word: "Underscore" },
		{ symbol: "=", word: "Equals sign" },
		{ symbol: "+", word: "Plus sign" },
		{ symbol: "[", word: "Open bracket" },
		{ symbol: "]", word: "Close bracket" },
		{ symbol: "{", word: "Open brace" },
		{ symbol: "}", word: "Close brace" },
		{ symbol: ";", word: "Semicolon" },
		{ symbol: ":", word: "Colon" },
		{ symbol: ",", word: "Comma" },
		{ symbol: ".", word: "Dot" },
		{ symbol: "?", word: "Question mark" },
		{ symbol: "/", word: "Forward slash" },
		{ symbol: "|", word: "Vertical bar" },
		{ symbol: "~", word: "Tilde" },
	],
};

function renderReference(entries, list) {
	list.replaceChildren();
	for (const entry of entries) {
		alphabet.set(entry.symbol.toLowerCase(), entry);
		const item = document.createElement("li");
		item.className = "pronunciation-item";
		for (const [className, value] of [
			["pronunciation-symbol", entry.symbol],
			["pronunciation-word", entry.word],
		]) {
			const part = document.createElement("span");
			part.className = className;
			part.textContent = value;
			item.append(part);
		}
		list.append(item);
	}
}

renderReference(data.letters, document.querySelector("#letter-list"));
renderReference(data.numbers, document.querySelector("#number-list"));
renderReference(data.symbols, document.querySelector("#symbol-list"));

spellingInput.addEventListener("input", () => {
	clearSpellingButton.hidden = spellingInput.value.length === 0;
	const words = spellingInput.value.trim().split(/\s+/).filter(Boolean);
	spellingOutput.replaceChildren();

	if (words.length === 0) {
		spellingStatus.textContent = "Your phonetic spelling will appear here.";
		return;
	}

	let convertedCount = 0;
	for (const word of words) {
		const wordGroup = document.createElement("div");
		wordGroup.className = "spelling-word";
		wordGroup.setAttribute("role", "list");
		wordGroup.setAttribute("aria-label", `Phonetic spelling of ${word}`);

		for (const character of word) {
			const key = character.toLowerCase();
			const entry = alphabet.get(key);
			const item = document.createElement("div");
			item.className = entry ? "spelling-item" : "spelling-item spelling-item-unsupported";
			item.setAttribute("role", "listitem");

			const letter = document.createElement("span");
			letter.className = "spelling-character";
			letter.textContent = character.toUpperCase();
			item.append(letter);

			const detail = document.createElement("span");
			detail.className = "spelling-detail";
			detail.textContent = entry ? entry.word : "No codeword";
			item.append(detail);
			wordGroup.append(item);

			if (entry) convertedCount += 1;
		}

		spellingOutput.append(wordGroup);
	}

	spellingStatus.textContent = `${convertedCount} ${convertedCount === 1 ? "character" : "characters"} converted`;
});

clearSpellingButton.addEventListener("click", () => {
	spellingInput.value = "";
	spellingInput.dispatchEvent(new Event("input", { bubbles: true }));
	spellingInput.focus();
});

