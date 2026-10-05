const lengthInput = document.querySelector("#password-length");
const lengthOutput = document.querySelector("#password-length-output");
const uppercaseInput = document.querySelector("#include-uppercase");
const lowercaseInput = document.querySelector("#include-lowercase");
const numbersInput = document.querySelector("#include-numbers");
const symbolsInput = document.querySelector("#include-symbols");
const generateButton = document.querySelector("#generate-passwords");
const resultsList = document.querySelector("#password-results");
const statusMessage = document.querySelector("#password-generator-status");
let lastCopiedButton = null;

const characterSets = [
	{ input: uppercaseInput, characters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" },
	{ input: lowercaseInput, characters: "abcdefghijklmnopqrstuvwxyz" },
	{ input: numbersInput, characters: "0123456789" },
	{ input: symbolsInput, characters: "!@#$%^&*()-_=+[]{};:,.?/|~\\" },
];

function randomIndex(maximum) {
	const range = 0x100000000;
	const limit = range - (range % maximum);
	const randomValue = new Uint32Array(1);
	do {
		crypto.getRandomValues(randomValue);
	} while (randomValue[0] >= limit);
	return randomValue[0] % maximum;
}

function makePassword(length, enabledSets) {
	const allCharacters = enabledSets.map((set) => set.characters).join("");
	const password = enabledSets.map((set) => set.characters[randomIndex(set.characters.length)]);
	while (password.length < length) {
		password.push(allCharacters[randomIndex(allCharacters.length)]);
	}

	for (let index = password.length - 1; index > 0; index -= 1) {
		const swapIndex = randomIndex(index + 1);
		[password[index], password[swapIndex]] = [password[swapIndex], password[index]];
	}
	return password.join("");
}

function copyFallback(value) {
	const temporaryInput = document.createElement("textarea");
	temporaryInput.value = value;
	temporaryInput.setAttribute("readonly", "");
	temporaryInput.style.position = "fixed";
	temporaryInput.style.opacity = "0";
	document.body.append(temporaryInput);
	temporaryInput.select();
	const copied = document.execCommand("copy");
	temporaryInput.remove();
	if (!copied) throw new Error("Copy failed");
}

async function copyPassword(value, button) {
	try {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(value);
		} else {
			copyFallback(value);
		}
		if (lastCopiedButton && lastCopiedButton !== button) lastCopiedButton.textContent = "Copy";
		button.textContent = "Copied";
		lastCopiedButton = button;
		statusMessage.textContent = "Password copied to clipboard.";
	} catch {
		statusMessage.textContent = "Copy failed. Select the password to copy it manually.";
	}
}

function clearResults() {
	resultsList.replaceChildren();
	lastCopiedButton = null;
	statusMessage.textContent = "";
}

function renderPasswords(passwords) {
	const fragment = document.createDocumentFragment();
	for (const [index, password] of passwords.entries()) {
		const result = document.createElement("li");
		result.className = "password-result";
		const value = document.createElement("code");
		value.className = "password-result-value";
		value.textContent = password;
		const copyButton = document.createElement("button");
		copyButton.className = "password-copy-button";
		copyButton.type = "button";
		copyButton.textContent = "Copy";
		copyButton.setAttribute("aria-label", `Copy password ${index + 1}`);
		copyButton.addEventListener("click", () => copyPassword(password, copyButton));
		result.append(value, copyButton);
		fragment.append(result);
	}
	resultsList.replaceChildren(fragment);
}

lengthInput.addEventListener("input", () => {
	lengthOutput.textContent = lengthInput.value;
	clearResults();
});

for (const { input } of characterSets) {
	input.addEventListener("change", clearResults);
}

generateButton.addEventListener("click", () => {
	const enabledSets = characterSets.filter(({ input }) => input.checked);
	if (enabledSets.length === 0) {
		clearResults();
		statusMessage.textContent = "Select at least one character type.";
		return;
	}
	if (!globalThis.crypto?.getRandomValues) {
		clearResults();
		statusMessage.textContent = "Secure password generation is unavailable in this browser.";
		return;
	}

	const passwords = new Set();
	while (passwords.size < 5) {
		passwords.add(makePassword(Number(lengthInput.value), enabledSets));
	}
	renderPasswords([...passwords]);
	statusMessage.textContent = "Five passwords generated.";
});
