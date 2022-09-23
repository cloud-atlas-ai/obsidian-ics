import { MarkdownView } from 'obsidian';

import { Calendar, ICSSettings, DEFAULT_SETTINGS } from "./settings/ICSSettings";

import ICSSettingsTab from "./settings/ICSSettingsTab";

import { getDateFromFile } from "obsidian-daily-notes-interface";

import { Plugin, request} from 'obsidian';
import { parseIcs, filterMatchingEvents } from './icalUtils';
import { CalendarComponent, VEvent } from 'node-ical';
import { Moment } from 'moment';
import moment from 'moment';
import { off } from 'process';


type Event = 
(Omit<VEvent, "start"|"end"> & {icsName:string, start: Moment, eType:"ICS"}) |
{
	start: Moment,
	summary: string,
	eType: "EXISTING",
	isIsc: boolean,
	posStart: number,
	posEnd: number,
}

export default class ICSPlugin extends Plugin {
	data: ICSSettings;

	private readonly eventRegex = /- (\[[ x]\]) (?<time>[\d:]+) (\[\w+\])?(\(.*? \| (?<ics>ics:.*?)\) )?(?<links>\[\w+\]\(.+?\) )*(?<text>.*)/gm;

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

  async getEvents(date: string): Promise<(CalendarComponent & {icsName:string})[]> {
    var events: (CalendarComponent & {icsName:string})[] = [];

    for (const calendar in this.data.calendars) {
      const calendarSetting = this.data.calendars[calendar];
      //console.log(calendarSetting);
      var icsArray = parseIcs(await request({
        url: calendarSetting.icsUrl
      }));
      const todayEvents = 
	  filterMatchingEvents(icsArray, date)
	  .map((e)=>{
		return {...e, icsName: calendarSetting.icsName}
	  });
      
	  events = events.concat(todayEvents);
    }
    return events;
  }

	async onload() {
		console.log('loading ics plugin');
		await this.loadSettings();
		this.addSettingTab(new ICSSettingsTab(this.app, this));
		this.addCommand({
			id: "import_events",
			name: "import events",
			hotkeys: [{
				modifiers: ["Alt", "Shift"],
				key: 'T',
			}, ],
			callback: async () => {
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				const fileDate = getDateFromFile(activeView.file, "day").format("YYYY-MM-DD");
				var events = (await this.getEvents(fileDate)).map((e)=>{
					const {start, end,...rest} = e as (VEvent & {icsName:string, start: Moment});

					return {
						start: moment(start),
						end: moment(end),
						eType: "ICS",
						...rest,
					};
				})
				
				debugger;
				//const doc = activeView.editor.getValue();

				let existing = this.findExisitngEvents(activeView, fileDate);
				let offset = 0;
				for (const event of existing) {
					if(event.eType == "EXISTING" && event.isIcs){
						activeView.editor.replaceRange('', activeView.editor.offsetToPos(event.posStart + offset), activeView.editor.offsetToPos(event.posEnd + offset));
						offset -= event.posEnd - event.posStart
					}
				}

				existing = this.findExisitngEvents(activeView, fileDate);

				let allEvents : Event[]  = Array.from(events).concat(existing) as Event[];
				allEvents = allEvents.sort((a:{start:Moment},b:{start:Moment})=>a.start.diff(b.start));



				//debugger;
				let insertedCount = 0;
				let insertPoint = existing[0].posStart
				for (const e of allEvents) {
					console.log(e);
					if(e.eType == "EXISTING"){
						insertPoint = e.posEnd;
						continue;
					}
					const eventText = this.printEvent(e);
					activeView.editor.replaceRange(eventText+"\n", activeView.editor.offsetToPos(insertPoint + insertedCount));

					insertedCount += eventText.length+1;
				}


				var mdArray: string [] = [];
				events.forEach((e) => {
					mdArray.push(`- [ ] ${e.start} [](${e.url} | ics:${e.uid}) ${e.summary} ${e.location}`.trim())
					mdArray.push(`- [ ] ${e.end} BREAK`.trim())
				});
				mdArray = mdArray.unique();


				//activeView.editor.replaceRange(mdArray.sort().join("\n"), activeView.editor.getCursor());
			}
		});
	}

	private findExisitngEvents(activeView:MarkdownView, fileDate: string) {
		const existing = [];

		const doc = activeView.editor.getValue();

		let match: RegExpExecArray;
		while (match = this.eventRegex.exec(doc)) {
			//debugger;
			existing.push(
				{
					start: moment(match.groups.time, 'HH:mm').date(moment(fileDate).date()),
					summary: match.groups.text,
					eType: "EXISTING",
					isIcs: match.groups.ics != undefined,
					posStart: match.index,
					posEnd: this.eventRegex.lastIndex + 1,
				}
			);
		}
		return existing;
	}

	printEvent(e:Event){
		if(e.eType != "ICS")
		return;
		let meeting = '';
		if(e["GOOGLE-CONFERENCE"] != undefined)
			meeting = `[meeting](${e["GOOGLE-CONFERENCE"]})`;

		if(e.uid.contains("google")){
			e.url = `https://calendar.google.com/calendar/u/0/r/eventedit/Njc3Z2ptZ2tic2pldjZhNnF0dTBnamZsbnIgZHBldGVyOTlAbQ`
		}
		
		return `- [ ] ${e.start.format("HH:mm")} [link](${e.url} | ics:${e.uid}) ${meeting} ${e.summary} ${e.location}`.trim();
	}

	onunload() {
		console.log('unloading ics plugin');
	}

	async loadSettings() {
		this.data = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.data);
	}
}


