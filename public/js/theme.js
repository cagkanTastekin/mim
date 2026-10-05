(() => {
	const isPopupFrame = window.parent !== window;
	document.documentElement.dataset.context = isPopupFrame ? "popup" : "index";
	let theme = "light";
	try {
		if (localStorage.getItem("gemmim-theme") === "dark") theme = "dark";
	} catch {}

	function applyTheme(nextTheme) {
		const isDark = nextTheme === "dark";
		document.documentElement.dataset.theme = isDark ? "dark" : "light";
		const themeColor = document.querySelector('meta[name="theme-color"]');
		if (themeColor) themeColor.content = isDark
			? (isPopupFrame ? "#343a37" : "#252927")
			: "#f5f5ef";
	}

	applyTheme(theme);
	window.addEventListener("storage", (event) => {
		if (event.key === "gemmim-theme") applyTheme(event.newValue);
	});
	window.addEventListener("message", (event) => {
		if (event.source !== window.parent || event.data?.type !== "gemmim-theme") return;
		if (event.data.theme === "light" || event.data.theme === "dark") applyTheme(event.data.theme);
	});
})();