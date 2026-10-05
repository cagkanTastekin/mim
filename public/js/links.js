const gemmim = [
	{ title: "Google", link: "https://www.google.com", details: "The world's most popular search engine." },
    { title: "GitHub", link: "https://www.github.com", details: "The world's most popular code repository." },
    { title: "Stack Overflow", link: "https://stackoverflow.com", details: "A question and answer site for programmers." },
];
const hr = [
	{ title: "Google", link: "https://www.google.com", details: "The world's most popular search engine." },
    { title: "GitHub", link: "https://www.github.com", details: "The world's most popular code repository." },
    { title: "Stack Overflow", link: "https://stackoverflow.com", details: "A question and answer site for programmers." },
];
const extensions = [
	{ title: "Google", link: "https://www.google.com", details: "The world's most popular search engine." },
    { title: "GitHub", link: "https://www.github.com", details: "The world's most popular code repository." },
    { title: "Stack Overflow", link: "https://stackoverflow.com", details: "A question and answer site for programmers." },
];

const linkGroups = [
	{ title: "GEM/MIM", entries: gemmim },
	{ title: "HR", entries: hr },
	{ title: "Extensions", entries: extensions },
];
const searchInput = document.querySelector("#links-search");
const clearSearchButton = document.querySelector("#links-search-clear");
const linksGroups = document.querySelector("#links-groups");
const linkCount = document.querySelector("#links-count");
const emptyState = document.querySelector("#links-empty");

function renderLinks(query = "") {
	const normalizedQuery = query.trim().toLowerCase();
	const groups = linkGroups.map(({ title, entries }, groupIndex) => {
		const availableEntries = entries
			.map((entry, index) => ({ ...entry, index }))
			.filter(({ title, link, details }) => title.trim() || link.trim() || details.trim());
		const matchingEntries = availableEntries.filter(({ title: entryTitle }) => (
			!normalizedQuery || entryTitle.toLowerCase().includes(normalizedQuery)
		));
		return { title, groupIndex, entries: matchingEntries, availableCount: availableEntries.length };
	});
	const matchingGroups = groups.filter(({ entries }) => entries.length > 0);
	const totalAvailable = groups.reduce((total, group) => total + group.availableCount, 0);
	const totalMatches = matchingGroups.reduce((total, group) => total + group.entries.length, 0);
	const fragment = document.createDocumentFragment();

	for (const group of matchingGroups) {
		const section = document.createElement("section");
		section.className = "links-group";
		const heading = document.createElement("h2");
		heading.className = "links-group-title";
		const headingText = document.createElement("span");
		headingText.textContent = group.title;
		const groupId = `links-group-${group.groupIndex}`;
		const groupToggle = document.createElement("button");
		groupToggle.className = "links-group-toggle";
		groupToggle.type = "button";
		const expanded = Boolean(normalizedQuery);
		groupToggle.setAttribute("aria-expanded", String(expanded));
		groupToggle.setAttribute("aria-controls", groupId);
		groupToggle.setAttribute("aria-label", `${expanded ? "Collapse" : "Expand"} ${group.title} links`);
		groupToggle.title = `${expanded ? "Collapse" : "Expand"} ${group.title} links`;
		groupToggle.textContent = expanded ? "▴" : "▾";
		heading.append(headingText, groupToggle);
		const tableWrap = document.createElement("div");
		tableWrap.className = "links-table-wrap";
		tableWrap.id = groupId;
		tableWrap.hidden = !expanded;
		groupToggle.addEventListener("click", () => {
			const isExpanded = groupToggle.getAttribute("aria-expanded") === "true";
			tableWrap.hidden = isExpanded;
			groupToggle.setAttribute("aria-expanded", String(!isExpanded));
			groupToggle.setAttribute("aria-label", `${isExpanded ? "Expand" : "Collapse"} ${group.title} links`);
			groupToggle.title = `${isExpanded ? "Expand" : "Collapse"} ${group.title} links`;
			groupToggle.textContent = isExpanded ? "▾" : "▴";
		});
		const table = document.createElement("table");
		table.className = "links-table";
		table.setAttribute("aria-label", `${group.title} links`);
		const tableHead = document.createElement("thead");
		const headerRow = document.createElement("tr");
		for (const label of ["Title", "Details", "Open"]) {
			const headerCell = document.createElement("th");
			headerCell.scope = "col";
			headerCell.textContent = label;
			headerRow.append(headerCell);
		}
		tableHead.append(headerRow);
		const tableBody = document.createElement("tbody");

		for (const { title, link, details, index } of group.entries) {
			const row = document.createElement("tr");
			const titleCell = document.createElement("td");
			titleCell.className = "links-title-cell";
			titleCell.textContent = title;

			const detailsCell = document.createElement("td");
			const detailsId = `link-details-${group.groupIndex}-${index}`;
			const detailsButton = document.createElement("button");
			detailsButton.className = "links-toggle";
			detailsButton.type = "button";
			detailsButton.setAttribute("aria-expanded", "false");
			detailsButton.setAttribute("aria-controls", detailsId);
			detailsButton.setAttribute("aria-label", `Show details for ${title}`);
			detailsButton.title = "Show details";
			detailsButton.textContent = "▾";
			detailsCell.append(detailsButton);

			const actionCell = document.createElement("td");
			const linkButton = document.createElement("a");
			linkButton.className = "links-open-button";
			linkButton.href = link;
			linkButton.target = "_blank";
			linkButton.rel = "noopener noreferrer";
			linkButton.textContent = "Go To page";
			actionCell.append(linkButton);
			row.append(titleCell, detailsCell, actionCell);

			const detailsRow = document.createElement("tr");
			detailsRow.className = "links-details-row";
			detailsRow.id = detailsId;
			detailsRow.hidden = true;
			const detailsContentCell = document.createElement("td");
			detailsContentCell.colSpan = 3;
			const detailsContent = document.createElement("p");
			detailsContent.className = "links-details-content";
			detailsContent.textContent = details;
			detailsContentCell.append(detailsContent);
			detailsRow.append(detailsContentCell);

			detailsButton.addEventListener("click", () => {
				const isExpanded = detailsButton.getAttribute("aria-expanded") === "true";
				detailsRow.hidden = isExpanded;
				detailsButton.setAttribute("aria-expanded", String(!isExpanded));
				detailsButton.setAttribute("aria-label", `${isExpanded ? "Show" : "Hide"} details for ${title}`);
				detailsButton.title = `${isExpanded ? "Show" : "Hide"} details`;
				detailsButton.textContent = isExpanded ? "▾" : "▴";
			});

			tableBody.append(row, detailsRow);
		}

		table.append(tableHead, tableBody);
		tableWrap.append(table);
		section.append(heading, tableWrap);
		fragment.append(section);
	}

	linksGroups.replaceChildren(fragment);
	linkCount.textContent = `${totalMatches} ${totalMatches === 1 ? "link" : "links"}`;
	emptyState.textContent = totalAvailable === 0 ? "No useful links have been added yet." : "No links match your search.";
	emptyState.hidden = totalMatches !== 0;
}

searchInput.addEventListener("input", () => {
	renderLinks(searchInput.value);
	clearSearchButton.hidden = searchInput.value.length === 0;
});
clearSearchButton.addEventListener("click", () => {
	searchInput.value = "";
	searchInput.dispatchEvent(new Event("input", { bubbles: true }));
	searchInput.focus();
});
renderLinks();
