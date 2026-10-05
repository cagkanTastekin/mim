const form = document.querySelector("#irams-form");
const connectionInput = document.querySelector("#affected-connections");
const customerCountInput = document.querySelector("#affected-customers");
const impactedCustomersInput = document.querySelector("#impacted-customers");
const escalationCheckbox = document.querySelector("#customer-escalation");
const escalatedCustomersInput = document.querySelector("#escalated-customers");
const generatedWording = document.querySelector("#generated-wording");
const iramsReferenceInput = document.querySelector("#irams-reference");
const copyButton = document.querySelector("#copy-wording");
const copyStatus = document.querySelector("#copy-status");
const formError = document.querySelector("#irams-form-error");
const instanceId = new URLSearchParams(window.location.search).get("instance");
const stateStorageKey = instanceId ? `gemmim-irams-state-${instanceId}` : null;
let hasGeneratedWording = false;

function saveFormState() {
	if (!stateStorageKey) return;
	const state = {
		affectedConnections: connectionInput.value,
		affectedCustomers: customerCountInput.value,
		impactedCustomers: impactedCustomersInput.value,
		customerEscalation: escalationCheckbox.checked,
		escalatedCustomers: escalatedCustomersInput.value,
		generatedWording: generatedWording.value,
		hasGeneratedWording,
		iramsReference: iramsReferenceInput.value,
	};
	try {
		sessionStorage.setItem(stateStorageKey, JSON.stringify(state));
	} catch {
		return;
	}
}

function restoreFormState() {
	if (!stateStorageKey) return;
	let state;
	try {
		state = JSON.parse(sessionStorage.getItem(stateStorageKey));
	} catch {
		return;
	}
	if (!state) return;
	connectionInput.value = state.affectedConnections ?? "";
	customerCountInput.value = state.affectedCustomers ?? "";
	impactedCustomersInput.value = state.impactedCustomers ?? "";
	escalationCheckbox.checked = Boolean(state.customerEscalation);
	escalatedCustomersInput.value = state.escalatedCustomers ?? "";
	escalatedCustomersInput.disabled = !escalationCheckbox.checked;
	generatedWording.value = state.generatedWording ?? "";
	iramsReferenceInput.value = state.iramsReference ?? "";
	hasGeneratedWording = Boolean(state.hasGeneratedWording && generatedWording.value);
	copyButton.disabled = !hasGeneratedWording;
	formError.hidden = true;
	formError.textContent = "";
	copyStatus.textContent = "";
}

function formatCustomerList(value) {
	return value.split(/\r?\n/).map((customer) => customer.trim()).filter(Boolean).join(", ");
}

function notifyParentOfReference() {
	if (!instanceId) return;
	const targetOrigin = window.location.origin === "null" ? "*" : window.location.origin;
	window.parent.postMessage({
		type: "irams-reference",
		instanceId,
		reference: iramsReferenceInput.value.trim(),
	}, targetOrigin);
}

function copyWordingFallback(value) {
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

function generateWording() {
	const affectedConnections = connectionInput.value || "[number of connections]";
	const affectedCustomers = customerCountInput.value || "[number of customers]";
	const impactedCustomers = formatCustomerList(impactedCustomersInput.value) || "[customer list]";
	const opening = `Loss of service to ${affectedConnections} MPLS connections are affecting ${affectedCustomers} individual customers.`;
	const impact = `Potentially impacted customers: ${impactedCustomers}.`;

	const escalatedCustomers = formatCustomerList(escalatedCustomersInput.value);
	if (escalatedCustomers) {
		generatedWording.value = `${opening}\n${impact} BT Service Desk has received complaints from ${escalatedCustomers}.`;
	} else {
		generatedWording.value = `${opening}\n${impact} BT Global Escalation Management have received no alerts or escalations for these services at this time.`;
	}

	hasGeneratedWording = true;
	copyButton.disabled = false;
	copyStatus.textContent = "";
}

function clearGeneratedWording() {
	formError.hidden = true;
	formError.textContent = "";
	if (!hasGeneratedWording) return;
	generatedWording.value = "";
	hasGeneratedWording = false;
	copyButton.disabled = true;
	copyStatus.textContent = "Inputs changed. Generate the wording again.";
}

for (const input of [connectionInput, customerCountInput]) {
	input.addEventListener("input", () => {
		input.value = input.value.replace(/\D/g, "");
		clearGeneratedWording();
	});
}

form.addEventListener("input", clearGeneratedWording);
form.addEventListener("submit", (event) => {
	event.preventDefault();
	const requiredFields = [
		[connectionInput, "Affected Connections"],
		[customerCountInput, "Affected customers"],
		[impactedCustomersInput, "Customers"],
	];
	if (escalationCheckbox.checked) requiredFields.push([escalatedCustomersInput, "Customers who escalated the case"]);

	const missingFields = requiredFields.filter(([input]) => !input.value.trim());
	if (missingFields.length > 0) {
		generatedWording.value = "";
		hasGeneratedWording = false;
		copyButton.disabled = true;
		copyStatus.textContent = "";
		formError.textContent = `Please fill in: ${missingFields.map(([, label]) => label).join(", ")}.`;
		formError.hidden = false;
		missingFields[0][0].focus();
		return;
	}

	generateWording();
});
escalationCheckbox.addEventListener("change", () => {
	escalatedCustomersInput.disabled = !escalationCheckbox.checked;
	escalatedCustomersInput.value = "";
	clearGeneratedWording();
});

form.addEventListener("input", saveFormState);
form.addEventListener("change", saveFormState);
form.addEventListener("submit", saveFormState);
iramsReferenceInput.addEventListener("input", () => {
	saveFormState();
	notifyParentOfReference();
});
restoreFormState();
notifyParentOfReference();

copyButton.addEventListener("click", async () => {
	if (!hasGeneratedWording) return;
	try {
		if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(generatedWording.value);
		else copyWordingFallback(generatedWording.value);
		copyStatus.textContent = "Wording copied.";
	} catch {
		generatedWording.select();
		copyStatus.textContent = "Select and copy the wording.";
	}
});
