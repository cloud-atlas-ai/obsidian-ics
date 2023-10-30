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
	const localTimeZone = tz.zone(tz.guess());

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
				var offset = (event.start.getTimezoneOffset() - date.getTimezoneOffset()); // default to orig timezone offset
				if (event.rrule != undefined && event.rrule.origOptions.tzid) {
					const eventTimeZone = tz.zone(event.rrule.origOptions.tzid);
					offset = localTimeZone.utcOffset(date) - eventTimeZone.utcOffset(date);
				}

				// correct start and end times
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
