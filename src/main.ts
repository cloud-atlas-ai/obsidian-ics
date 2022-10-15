import {
	Calendar,
	ICSSettings,
	DEFAULT_SETTINGS,
} from "./settings/ICSSettings";

import ICSSettingsTab from "./settings/ICSSettingsTab";

import { getDateFromFile } from "obsidian-daily-notes-interface";

import { Plugin, request, MarkdownView, TFile, Vault } from "obsidian";
import { parseIcs, filterMatchingEvents } from "./icalUtils";
import { CalendarComponent, VEvent } from "node-ical";
import moment, { Moment } from "moment";
import { uniqWith, isEqual } from 'lodash';

type Event = 
	(Omit<VEvent, "start" | "end"> & {
		icsName: string;
		start: Moment;
		eType: "ICS";
	}) | 
	{
		start: Moment;
		summary: string;
		eType: "ICS-END";
	} |
	{
		start: Moment;
		summary: string;
		eType: "EXISTING";
		isIsc: boolean;
		posStart: number;
		posEnd: number;
	};

function replaceRange(s, start, end, substitute) {
	return s.substring(0, start+1) + substitute + s.substring(end);
}

function insertRange(s, start, substitute) {
	return s.substring(0, start+1) + substitute + s.substring(start+1);
}

export default class ICSPlugin extends Plugin {
	settings: ICSSettings;
	//api: IcsAPI;

	// https://regex101.com/r/x6Xry1/4
	private readonly eventRegex =
	/- (\[[ x]\]) (?<time>[\d:]+) (\((?<ics>ics:.*?(\[\]\((?<id>.+?)\))?)\) )?(?<links>\[\w+\]\(.+?\) )*(?<text>.*)/gm

	async addCalendar(calendar: Calendar): Promise<void> {
		this.settings.calendars = {
			...this.settings.calendars,
			[calendar.icsName]: calendar,
		};
		await this.saveSettings();
	}

	async removeCalendar(calendar: Calendar) {
		if (this.settings.calendars[calendar.icsName]) {
			delete this.settings.calendars[calendar.icsName];
		}
		await this.saveSettings();
	}

	async getEvents(
		date: string
	): Promise<(CalendarComponent & { icsName: string })[]> {
		var events: (CalendarComponent & { icsName: string })[] = [];

		for (const calendar in this.settings.calendars) {
			const calendarSetting = this.settings.calendars[calendar];
			//console.log(calendarSetting);
			var icsArray = parseIcs(
				await request({
					url: calendarSetting.icsUrl,
				})
			);
			const todayEvents = filterMatchingEvents(icsArray, date).map((e) => {
				return { ...e, icsName: calendarSetting.icsName };
			});

			events = events.concat(todayEvents);
		}
		return events;
	}

	async onload() {
		console.log("loading ics plugin");
		await this.loadSettings();
		this.addSettingTab(new ICSSettingsTab(this.app, this));
		this.addCommand({
			id: "import_events",
			name: "import events",
			hotkeys: [
				{
					modifiers: ["Alt", "Shift"],
					key: "T",
				},
			],
			callback: async () => {
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

				

				this.insertEvents(activeView.file);
			},
		});
	}

	private async insertEvents(file:TFile) {
		
		const fileDate = getDateFromFile(file, "day").format(
			"YYYY-MM-DD"
		);

		await file.vault.read(file);

		let doc = await file.vault.read(file);

		// get the events from the calendars
		let events : Event[] = (await this.getEvents(fileDate)).map((e) => {
			const { start, end, ...rest } = e as VEvent & {
				icsName: string;
				start: Moment;
			};
			return {
				start: moment(start),
				end: moment(end),
				eType: "ICS" as const,
				...rest,
			};
		})
		.filter((e)=>{
			return !this.settings.ignoreEvents.contains(e.summary.trim());
		})
		.flatMap((value)=>{return this.settings.addEnd ? [
			value,
			{
				start: value.end,
				summary: "BREAK",
				eType: "ICS-END" as const,
			}
		] : [value]})
		;


		let existing = await this.findExistingEvents(doc, fileDate);
		let offset = 0;
		for (const event of existing) {
			if (event.eType == "EXISTING" && event.isIcs) {
				doc = replaceRange(doc,
					event.posStart + offset-1,
					event.posEnd + offset,
					""
				);
				offset -= event.posEnd - event.posStart;
			}
		}

		existing = await this.findExistingEvents(doc, fileDate);

		let allEvents: Event[] = Array.from(events).concat(existing);
		allEvents.sort((a: { start: Moment }, b: { start: Moment }) =>
			a.start.diff(b.start)
		);

		allEvents = uniqWith(allEvents, (a:Event,b:Event)=>{
			const { start:astart, ...arest } = a;
			const { start:bstart, ...brest } = b;

			return astart.isSame(bstart) && isEqual(arest,brest);
		})
		.filter((value, i, array)=>{
			if(array.length <= i+1) 
				return true;
			return array[i+1].summary != value.summary;
		});

		let insertedCount = 0;
		let insertPoint = existing[0].posStart-1;
		for (const e of allEvents) {
			console.log(e);
			if (e.eType == "EXISTING") {
				insertPoint = e.posEnd-1;
				continue;
			}
			const eventText = this.printEvent(e);

			doc = insertRange(
				doc,
				insertPoint + insertedCount,
				eventText + "\n",
			);

			insertedCount += eventText.length+1;
		}

		
		await this.app.vault.modify(file,doc);
	}

	private async findExistingEvents(doc: string, fileDate: string) {
		const existing = [];

		let match: RegExpExecArray;
		while ((match = this.eventRegex.exec(doc))) {
			existing.push({
				start: moment(match.groups.time, "HH:mm").date(moment(fileDate).date()),
				summary: match.groups.text,
				eType: "EXISTING",
				isIcs: match.groups.ics != undefined,
				posStart: match.index,
				posEnd: this.eventRegex.lastIndex + 1,
			});
		}
		return existing;
	}

	private printEvent(e: Event) {
		if (e.eType != "ICS" && e.eType != "ICS-END") return;

		let meeting = "";
		if (e["GOOGLE-CONFERENCE"] != undefined)
			meeting = `[meeting](${e["GOOGLE-CONFERENCE"]})`;

		if (e.eType == "ICS" && e.uid.contains("google")) {
			e.url = `https://calendar.google.com/calendar/u/0/r/eventedit/Njc3Z2ptZ2tic2pldjZhNnF0dTBnamZsbnIgZHBldGVyOTlAbQ`;
		}

		if(e.eType == "ICS"){
			return `- [ ] ${e.start.format("HH:mm")} (ics:: ${e.icsName}) [link](${e.url}) ${meeting} ${e.summary} ${e.location}`.trim();
		}
		else if(e.eType == "ICS-END"){
			return `- [ ] ${e.start.format("HH:mm")} (ics:: ) ${e.summary}`.trim();
		}
	}

	onunload() {
		console.log("unloading ics plugin");
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

