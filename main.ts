import { FileView, TFile, View, MarkdownView } from 'obsidian';
import { ICSSettings, DEFAULT_SETTINGS } from "src/settings/ICSSettings"
import ICSSettingsTab from "src/settings/ICSSettingsTab"
import { getDateFromFile } from "obsidian-daily-notes-interface";

import {
	App,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	request
} from 'obsidian';

const ical = require('ical');
const moment = require('moment');
const tz = require("timezone/loaded");

export default class ICS extends Plugin {
	settings: ICSSettings;

	async onload() {
		console.log('loading ics plugin');
		await this.loadSettings();
		this.addSettingTab(new ICSSettingsTab(this.app, this))
		this.addCommand({
			id: "import_events",
			name: "import events",
			hotkeys: [
				{
					modifiers: ["Alt", "Shift"],
					key: 'T',
				},
			],
			callback: async () => {
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				const fileDate = getDateFromFile(activeView.file, "day").format("YYYY-MM-DD");

				var icsArray = parseIcs(await request({url: this.settings.icsUrl}));
				var todayEvents = icsArray.filter((e,i) => (moment(e.start).isSame(fileDate, "day") ));
				console.log(todayEvents);

				var mdArray: string[] = [];
				
				todayEvents.forEach((e) => {
					mdArray.push(`- [ ] ${moment(e.start).format("HH:mm")} ${e.summary} ${e.location}`);
				});

				console.log(mdArray);

				activeView.editor.replaceRange(mdArray.sort().join("\n"), activeView.editor.getCursor());
			}
		})
	}

	onunload() {
		console.log('unloading ics plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

function parseIcs(ics: string) {
	var data = ical.parseICS(ics);
	var vevents = [];

	for (let i in data) {
		if (data[i].type != "VEVENT") continue;
		vevents.push(data[i]);
		if (data[i]["recurrences"] != undefined) {
			for (let ii in data[i]["recurrences"]) {
				vevents.push(data[i]["recurrences"][ii]);
			}
		}
	}
	return vevents;
}

