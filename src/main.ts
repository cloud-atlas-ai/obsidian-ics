import {
	MarkdownView, Notice
} from 'obsidian';

import {
	Calendar,
	ICSSettings,
	DEFAULT_SETTINGS,
} from "./settings/ICSSettings";

import ICSSettingsTab from "./settings/ICSSettingsTab";

import {
	getDateFromFile
} from "obsidian-daily-notes-interface";

import {
	Plugin,
	request
} from 'obsidian';
import { parseIcs, filterMatchingEvents } from './icalUtils';

export default class ICSPlugin extends Plugin {
	data: ICSSettings;

	async addCalendar(calendar: Calendar): Promise<void> {
		this.data.calendars = {
			...this.data.calendars,
			[calendar.icsName]: calendar
		};
		await this.saveSettings();
	}

	async removeCalendar(calendar: Calendar) {
		if (this.data.calendars[calendar.icsName]) {
			delete this.data.calendars[calendar.icsName];
		}
		await this.saveSettings();
	}

	async getEvents(date: string) {
		var events: any[] = [];

		for (const calendar in this.data.calendars) {
			const calendarSetting = this.data.calendars[calendar];
			var icsArray: any[] = [];

			try {
				var icsArray = parseIcs(await request({
					url: calendarSetting.icsUrl
				}));

			} catch (error) {
				console.error('error retrieving calendar ' + calendarSetting.icsName + ' with ics URL ' + calendarSetting.icsUrl + ' : ' + error);
				new Notice(`Error retrieving calendar with name "${calendarSetting.icsName}". See console for details.`);
			}

			const dateEvents = filterMatchingEvents(icsArray, date);

			dateEvents.forEach((e) => {
				let event = {
					'time': window.moment(e.start).format("HH:mm"),
					'icsName': calendarSetting.icsName,
					'summary': e.summary,
					'description': e.description
				}

				if (e.location) {
					event['location'] = e.location;
				}

				events.push(event);
			});

		}
		return events;
	}

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new ICSSettingsTab(this.app, this));
		this.addCommand({
			id: "import_events",
			name: "import events",
			callback: async () => {
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				const fileDate = getDateFromFile(activeView.file, "day").format("YYYY-MM-DD");
				var events: any[] = await this.getEvents(fileDate);
				var mdArray: string[] = [];

				events.forEach((e) => {
					mdArray.push((`- [ ] ${e.time} ${e.icsName} ${e.summary} ${(e.location ? e.location : '')}`).trim());
				});
				activeView.editor.replaceRange(mdArray.sort().join("\n"), activeView.editor.getCursor());
			}
		});
	}

	onunload() {
		return;
	}

	async loadSettings() {
		this.data = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.data);
	}
}


