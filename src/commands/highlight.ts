import {Command, flags} from "@oclif/command";
import {Page, Browser} from "puppeteer-core";
import {environmentVariablesFile, alert, beginScrape, downloadInstagramFile} from "../shared";
import {config} from "dotenv";
import cli from "cli-ux";

export default class Highlight extends Command {
	static description = "Command for scraping Instagram highlight files.";
	static args = [{name: "highlight", required: true}, {name: "item", required: true}];
	static flags = {headless: flags.boolean({char: "h", description: "Toggle for background scraping."}),};

	async run() {
		config({ path: environmentVariablesFile });
		const { INSTAGRAM } = process.env;
		if (INSTAGRAM! !== "true") {
			alert("You are not authenticated.", "danger");
		} else if (JSON.parse(INSTAGRAM!)) {
			try {
				const {args, flags} = this.parse(Highlight);
				if (args.highlight !== undefined && args.highlight !== null) {
					const now = Date.now();
					cli.action.start("Opening Puppeteer...");
					const {browser, page} = (await beginScrape(flags.headless))!;
					cli.action.stop();
					cli.action.start("Searching for files...");
					const URLs = await detectFiles(browser, page, args.highlight, Number(args.item));
					const userName = await page.evaluate(() => document.querySelector("div.yn6BW > a")!.innerHTML);
					cli.action.stop();
					alert(`Scrape time: ${(Date.now() - now) / 1000}s`, "info");
					if (URLs) {
						for (let i = 0; i < URLs.length; i += 1) {
							const URL = URLs[i];
							cli.action.start("Downloading...");
							if (URL.includes(".jpg")) await downloadInstagramFile(URL, userName, ".jpg", i + 1);
							if (URL.includes(".mp4")) await downloadInstagramFile(URL, userName, ".mp4", i + 1);
							cli.action.stop();
						}
					}
					await browser.close();
				} else return alert("Please provide a POST argument!", "danger");
			} catch (error) { alert(error.message, "danger"); }
		}
	}
}
export async function detectFiles(browser: Browser, page: Page, highlight: string, item: number): Promise<string[] | undefined> {
	try {
		await page.goto(`https://www.instagram.com/stories/highlights/${highlight}`, {waitUntil: "domcontentloaded"});
		const potentialErrorMessage: string = await (await (await page.$("body"))!.getProperty("textContent")).jsonValue();
		if (potentialErrorMessage.includes("Oops, an error occurred.")) {
			alert(`Failed to find highlight ${highlight}.`, "danger");
			await browser.close();
		}
		for (var i = 0; i < item - 1; i += 1) {
			await page.waitForSelector("div.coreSpriteRightChevron", {visible: true});
			await page.click("div.coreSpriteRightChevron");
		}
		var urls: string[] = [];
		await page.waitForSelector("div.qbCDp");
		const imageURL = (await page.$$eval("div.qbCDp > img", images => images.map(image => image.getAttribute("srcset"))))[0];
		if (imageURL) urls.push(imageURL.split(",")[0].split(" ")[0]);
		const videoURL = (await page.$$eval("video > source", sources => sources.map(source => source.getAttribute("src"))))[0];
		if (videoURL) urls.push(videoURL);
		return urls;
	} catch (error) { alert(error.message, "danger"); }
}