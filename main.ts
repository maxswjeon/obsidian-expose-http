// biome-ignore lint/style/useNodejsImportProtocol: esbuild does not support node: protocol
import { createServer, type Server } from "http";

import {
	type App,
	createApp,
	createRouter,
	defineEventHandler,
	type Router,
	setResponseHeaders,
	setResponseStatus,
	toNodeListener,
} from "h3";
import { Plugin } from "obsidian";

// Remember to rename these classes and interfaces!

interface ExposeHttpPluginSettings {
	port: number;
}

const DEFAULT_SETTINGS: ExposeHttpPluginSettings = {
	port: 3000,
};

export default class ExposeHttpPlugin extends Plugin {
	settings: ExposeHttpPluginSettings;
	httpServer?: Server = undefined;
	server?: App = undefined;
	router?: Router = undefined;

	async onload() {
		await this.loadSettings();

		this.server = createApp();
		this.router = createRouter();

		this.server.use(this.router);
		this.router.get(
			"/**",
			defineEventHandler(async (event) => {
				const pathname = event.context.params?._ || "";
				const data = await fetch(`app://obsidian.md/${pathname}`);
				setResponseStatus(event, data.status, data.statusText);
				setResponseHeaders(
					event,
					Object.entries(data.headers).reduce<Record<string, string>>(
						(acc, [key, value]) => {
							acc[key] = value;
							return acc;
						},
						{},
					),
				);
				return data.text();
			}),
		);

		this.httpServer = createServer(toNodeListener(this.server)).listen(
			this.settings.port,
		);
	}

	onunload() {
		this.httpServer?.close();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
