const ical = require('node-ical');
import { tz } from 'moment-timezone';
import { moment } from "obsidian";

export function extractMeetingInfo(e: any): { callUrl: string, callType: string } {

	// Check for Google Meet conference data
	if (e["GOOGLE-CONFERENCE"]) {
		return { callUrl: e["GOOGLE-CONFERENCE"], callType: 'Google Meet' };
	}
	// Check if the location contains a Zoom link
	if (e.location && e.location.includes('zoom.us')) {
		return { callUrl: e.location, callType: 'Zoom' };
	}
	if (e.description) {
		const skypeMatch = e.description.match(/https:\/\/join.skype.com\/[a-zA-Z0-9]+/);
		if (skypeMatch) {
			return { callUrl: skypeMatch[0], callType: 'Skype' };
		}

		const teamsMatch = e.description.match(/(https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^>]+)/);
		if (teamsMatch) {
			return { callUrl: teamsMatch[0], callType: 'Microsoft Teams' };
		}
	}
	return { callUrl: null, callType: null };
}

export function filterMatchingEvents(icsArray: any[], dayToMatch: string) {
	const localTimezone = tz.guess();

	return icsArray.reduce((matchingEvents, event) => {
		if (event.recurrences !== undefined) {
			for (let date in event.recurrences) {
				const recurrence = event.recurrences[date];
				if (moment(recurrence.start).isSame(dayToMatch, "day")) {
					matchingEvents.push(recurrence);
				}
			}
		}
		if (typeof event.rrule !== 'undefined') {
			event.rrule.between(moment(dayToMatch).startOf('day').toDate(), moment(dayToMatch).endOf('day').toDate()).forEach(date => {
				// We need to clone the event and override the date

				const clonedEvent = { ...event };

				// But timezones...
				var offset = 0;
				if (event.rrule != undefined && event.rrule.origOptions.tzid) {
					const eventTimeZone = tz.zone(event.rrule.origOptions.tzid);
					const localTimeZone = tz.zone(tz.guess());
					offset = localTimeZone.utcOffset(date) - eventTimeZone.utcOffset(date);
				}

				clonedEvent.start = moment(date).add(offset, 'minutes');
				clonedEvent.end = moment(clonedEvent.start).add(moment(event.end).diff(moment(event.start)), 'ms');

				// Remove rrule property from clonedEvent
				delete clonedEvent.rrule;

				matchingEvents.push(clonedEvent);
			});
		} else {
			if (moment(event.start).isSame(dayToMatch, "day")) {
				matchingEvents.push(event);
			}
		}
		return matchingEvents;
	}, []);;
}

function applyTzOffset(origEvent: any, start: any, date: any) {
	if (origEvent.rrule != undefined && origEvent.rrule.origOptions.tzid) {
		// tzid present on the rrule
		const eventTimeZone = tz.zone(origEvent.rrule.origOptions.tzid);
		const localTimeZone = tz.zone(tz.guess());
		const offset = localTimeZone.utcOffset(date) - eventTimeZone.utcOffset(date);
		return moment(date).add(offset, 'minutes');
	} else {
		// tzid not present on rrule (calculate offset from original start)
		return moment(new Date(date.setHours(date.getHours() - ((start.getTimezoneOffset() - date.getTimezoneOffset()) / 60))));
	}
}

function cloneRecurringEvent(origEvent: any, event: any, date: any, duration: any) {
	let startDate = applyTzOffset(origEvent, event, date);
	let endDate = moment(Number.parseInt(moment(startDate).format('x'), 10) + duration, 'x');

	return {
		description: event.description,
		summary: `${event.summary} (recurring)`,
		start: startDate.toDate(),
		end: endDate.toDate(),
		location: event.location,
	};
}

export function parseIcs(ics: string) {
	var data = ical.parseICS(ics);
	var vevents = [];

	for (let i in data) {
		if (data[i].type != "VEVENT")
			continue;
		vevents.push(data[i]);
	}
	return vevents;
}
