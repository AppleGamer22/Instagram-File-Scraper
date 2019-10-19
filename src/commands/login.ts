import {Browser} from "puppeteer-core";
import { Command, flags } from "@oclif/command";
import {config} from "dotenv";
import cli from "cli-ux";
import {writeEnviornmentVariables, beginScrape, environmentVariablesFile, userAgent, alert} from "../shared";

export default class LogIn extends Command {
	static description = "Command for supported social network log-in.";
	static flags = {
		// vsco: flags.boolean({char: "v", description: "Toggle for VSCO log-in."}),
		instagram: flags.boolean({char: "i", description: "Toggle for Instagram log-in."})
	};

	async run() {
		config({path: environmentVariablesFile});
		try {
			const username: string = await cli.prompt("username");
			const password: string = await cli.prompt("password", {type: "hide"});
			cli.action.start("Opening browser");
			const {browser, page} = (await beginScrape(false))!;
			cli.action.stop();
			const {flags} = this.parse(LogIn);
			if (flags.instagram) return await this.instagramSignIn(browser, username, password);
			// if (flags.vsco) return await this.vscoSignIn(browser, username, password);
		} catch (error) { alert(error.message, "danger"); }
	}

	async instagramSignIn(browser: Browser, username: string, password: string) {
		try {
			if (process.env.INSTAGRAM! === "true") {
				await browser.close();
				return alert("You are already logged-in.", "success");
			}
			cli.action.start("Signing in to your Instagram account");
			const page = (await browser.pages())[0];
			await page.setUserAgent(userAgent());
			await page.goto("https://www.instagram.com/accounts/login/");
			await page.waitForSelector(`input[name="username"]`);
			await page.type(`input[name="username"]`, username);
			await page.type(`input[name="password"]`, password);
			await page.click(`button[type="submit"]`);
			await page.waitForResponse("https://www.instagram.com/");
			var environmentFileData: string;
			const {VSCO} = process.env;
			if (VSCO !== undefined) {
				environmentFileData = `INSTAGRAM=${true}\nVSCO=${VSCO}`;
				writeEnviornmentVariables(environmentFileData);
				cli.action.stop();
				await browser.close();
			} else if (VSCO === undefined) {
				environmentFileData = `INSTAGRAM=${true}\nVSCO=${false}`;
				writeEnviornmentVariables(environmentFileData);
				cli.action.stop();
				await browser.close();
			}
		} catch (error) {
			alert(error.message, "danger");
			cli.action.stop();
			await browser.close();
		}
	}
	async vscoSignIn(browser: Browser, username: string, password: string) {
		try {
			if (process.env.VSCO! === "true") {
				await browser.close();
				return alert("You are already loged-in.", "success");
			}
		cli.action.start("Signing in to your VSCO account");
			const page = (await browser.pages())[0];
			page.on("framenavigated", async frame => {
				if (frame.url() === "https://vsco.co/") {
					var environmentFileData: string;
					const {INSTAGRAM} = process.env;
					if (INSTAGRAM !== undefined) {
						environmentFileData = `VSCO=${true}\nINSTAGRAM=${INSTAGRAM}`;
						writeEnviornmentVariables(environmentFileData);
						cli.action.stop();
						await browser.close();
					} else if (INSTAGRAM === undefined) {
						environmentFileData = `VSCO=${true}\nINSTAGRAM=${false}`;
						writeEnviornmentVariables(environmentFileData);
						cli.action.stop();
						await browser.close();
					}
				}
			});
			await page.setUserAgent(userAgent());
			await page.goto("https://vsco.co/user/login");
			await page.waitForSelector("input#login");
			await page.type("input#login", username);
			await page.type("input#password", password);
			await page.click("button#loginButton");
		} catch (error) { alert(error.message, "danger"); }
	}
}