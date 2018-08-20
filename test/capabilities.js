function getCaps(os, osVersion, browser, rest){
	return Object.assign(
		{
			'os': os,
			'os_version': osVersion,
			'browserName': browser,
			'browserstack.local': 'true',
			'browserstack.selenium_version': '3.5.2',
			'browserstack.console': "verbose",
			'browserstack.user': "rawldgill1",
			'browserstack.key': "JF3ayQNznkCgBpKuV2pP"
		}, rest || {}
	);
}

const caps = [
	{
		name: "chrome",
		caps: {
			browserName: "chrome"
		}
	},
	{
		name: "firefox",
		caps: {
			browserName: "firefox"
		}
	}
];

["7", "8.1", "10"].forEach(version =>{
	["Firefox", "IE", "Edge", "Chrome"].forEach(browser =>{
		(browser !== "Edge" || version == "10") && caps.push({
			name: (browser + "-win-" + version).toLowerCase(),
			caps: getCaps('Windows', version, browser)
		})
	})
});

["Sierra", "High Sierra"].forEach(version =>{
	["Firefox", "Chrome", "Safari"].forEach(browser =>{
		caps.push({
			name: (browser + "-osx-" + version.replace(/\s/g, "-")).toLowerCase().replace(" "),
			caps: getCaps('OS X', version, browser)
		})
	})
});

caps.presets = {
	local: ["chrome", "firefox"],
	osx: ["safari-osx-high-sierra"],
	win7: ["firefox-win-7", "ie-win-7", "edge-win-7", "chrome-win-7"],
	"win8.1": ["firefox-win-8.1", "ie-win-8.1", "edge-win-8.1", "chrome-win-8.1"],
	win10: ["firefox-win-10", "ie-win-10", "edge-win-10", "chrome-win-10"],
	sierra: ["firefox-osx-sierra", "safari-osx-sierra", "chrome-osx-sierra"],
	highSierra: ["firefox-osx-high-sierra", "safari-osx-high-sierra", "chrome-osx-high-sierra"],
	chrome: ["chrome-osx-high-sierra", "chrome-osx-sierra", "chrome-win-7", "chrome-win-8.1", "chrome-win-10"],
	firefox: ["firefox-osx-high-sierra", "firefox-osx-sierra", "firefox-win-7", "firefox-win-8.1", "firefox-win-10"],
	safari: ["safari-osx-high-sierra", "safari-osx-sierra"],
	ie: ["ie-win-7", "ie-win-8.1", "ie-win-10"],
	edge: ["edge-win-10"],
	all: [
		"chrome-osx-high-sierra", "chrome-osx-sierra", "chrome-win-7", "chrome-win-8.1", "chrome-win-10",
		"firefox-osx-high-sierra", "firefox-osx-sierra", "firefox-win-7", "firefox-win-8.1", "firefox-win-10",
		"safari-osx-high-sierra", "safari-osx-sierra",
		"ie-win-7", "ie-win-8.1", "ie-win-10",
		"edge-win-10"
	]
};

module.exports = caps;