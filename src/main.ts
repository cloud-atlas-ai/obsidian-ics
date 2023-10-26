import {
	Editor, moment,
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
import { parseIcs, filterMatchingEvents, extractMeetingInfo } from './icalUtils';
import { IEvent } from './IEvent';

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

	async getEvents(date: string) : Promise<IEvent[]> {
		let events: IEvent[] = [];
		let errorMessages: string[] = []; // To store error messages
	
		for (const calendar in this.data.calendars) {
			const calendarSetting = this.data.calendars[calendar];
			let icsArray: any[] = [];
	
			// Exception handling for downloading
			try {
				icsArray = parseIcs(await request({
					url: calendarSetting.icsUrl
				}));
			} catch (error) {
				console.error(`Error retrieving calendar ${calendarSetting.icsName} with ICS URL ${calendarSetting.icsUrl}: ${error}`);
				errorMessages.push(`Error retrieving calendar "${calendarSetting.icsName}"`);
			}

			var dateEvents;
	
			// Exception handling for parsing and filtering
			try {
				dateEvents = filterMatchingEvents(icsArray, date);
	
			} catch (filterError) {
				console.error(`Error filtering events for calendar ${calendarSetting.icsName}: ${filterError}`);
				errorMessages.push(`Error filtering events in calendar "${calendarSetting.icsName}"`);
			}

			try {
				dateEvents.forEach((e) => {
					const { callUrl, callType } = extractMeetingInfo(e);
	
					let event: IEvent = {
						utime: moment(e.start).format('X'),
						time: moment(e.start).format(this.data.format.timeFormat),
						endTime: moment(e.end).format(this.data.format.timeFormat),
						icsName: calendarSetting.icsName,
						summary: e.summary,
						description: e.description,
						format: calendarSetting.format,
						location: e.location? e.location : null,
						callUrl: callUrl,
						callType: callType
					};
					events.push(event);
				});
			} catch (parseError) {
				console.error(`Error parsing events for calendar ${calendarSetting.icsName}: ${parseError}`);
				errorMessages.push(`Error parsing events in calendar "${calendarSetting.icsName}"`);
			}
		}
	
		// Notify the user if any errors were encountered
		if (errorMessages.length > 0) {
			const message = `Encountered ${errorMessages.length} error(s) while processing calendars: ${errorMessages.join(', ')}. See console for details.`;
			new Notice(message);
		}
	
		return events;
	}	

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new ICSSettingsTab(this.app, this));
		this.addCommand({
			id: "import_events",
			name: "import events",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const fileDate = getDateFromFile(view.file, "day").format("YYYY-MM-DD");
				var events: any[] = await this.getEvents(fileDate);

				const mdArray = events.sort((a,b) => a.utime - b.utime).map(e => {
					const callLinkOrlocation = e.callType ? `[${e.callType}](${e.callUrl})` : e.location;
					return [
						`- ${e.format?.checkbox ? '[ ]' : ''}`,
						`${e.time}`,
						e.format?.includeEventEndTime ? `- ${e.endTime}` : null,
						e.format?.icsName ? e.icsName : null,
						e.format?.summary ? e.summary : null,
						e.format?.location ? callLinkOrlocation : null,
						e.format?.description && e.description ? `\n\t- ${e.description}` : null,
					].filter(Boolean).join(' ')
				});
				editor.replaceRange(mdArray.join("\n"), editor.getCursor());
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


