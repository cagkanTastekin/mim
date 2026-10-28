(() => {
	const isPopupFrame = window.parent !== window;
	document.documentElement.dataset.context = isPopupFrame ? "popup" : "index";
	document.documentElement.dataset.theme = "dark";
	const themeColor = document.querySelector('meta[name="theme-color"]');
	if (themeColor) themeColor.content = isPopupFrame ? "#343a37" : "#252927";
})();