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

function adjustDateToOriginalTimezone(originalDate: Date, currentDate: Date, tzid: string): Date {
	const momentOriginal = tz(originalDate, tzid);
	const momentCurrent = tz(currentDate, tzid);

	// Calculate the difference in hours and minutes between the original and current
	const hourOffset = momentOriginal.hour() - momentCurrent.hour();
	const minuteOffset = momentOriginal.minute() - momentCurrent.minute();

	// Adjust the current date by the offset to keep the local time constant
	return momentCurrent.add(hourOffset, 'hours').add(minuteOffset, 'minutes').toDate();
}

export function filterMatchingEvents(icsArray: any[], dayToMatch: string) {
  const localStartOfDay = moment(dayToMatch).startOf('day');
  const localEndOfDay = moment(dayToMatch).endOf('day');

	return icsArray.reduce((matchingEvents, event) => {
		var hasRecurrenceOverride = false
		if (event.recurrences !== undefined) {
			for (let date in event.recurrences) {
				if (moment(date).isSame(dayToMatch, "day")) {
					hasRecurrenceOverride = true;
				}
        const recurrence = event.recurrences[date];
        if (moment(recurrence.start).isSame(dayToMatch, "day")) {
          matchingEvents.push(recurrence);
          hasRecurrenceOverride = true;
        }
			}
		}
		if (typeof event.rrule !== 'undefined' && !hasRecurrenceOverride) {

      // Per the rrule docs: Whether or not you use the `TZID` param, make sure to only use JS `Date` objects that are represented in UTC to avoid unexpected timezone offsets being applied
      const utcStartOfDay = moment(dayToMatch).utc().startOf('day').toDate();
      const utcEndOfDay = moment(dayToMatch).utc().endOf('day').toDate();

			event.rrule.between(localStartOfDay.toDate(), localEndOfDay.toDate()).forEach(date => {

        // now the date is in the local timezone, so we need to apply the offset to get it back to UTC
        const offset = moment(date).utcOffset();
        date = moment(date).subtract(offset, 'minutes').toDate();


				// We need to clone the event and override the date
				const clonedEvent = { ...event };

				console.debug('Found a recurring event to clone: ', event.summary, ' on ', date, 'at ', event.start.toString());

				// But timezones...
				if (event.rrule != undefined && event.rrule.origOptions.tzid) {
					const tzid = event.rrule.origOptions.tzid;
					console.debug("Event rrule.origOptions.tzid:", tzid);
					// Adjust the cloned event start and end times to the original event timezone
					clonedEvent.start = adjustDateToOriginalTimezone(event.start, date, tzid);
					clonedEvent.end = adjustDateToOriginalTimezone(event.end, date, tzid);
				} else {
					// If there is no timezone information, assume the event time should not change
					clonedEvent.start = new Date(date);
					clonedEvent.end = new Date(date.getTime() + (event.end.getTime() - event.start.getTime()));
				}

				// Remove rrule property from clonedEvent
				delete clonedEvent.rrule;

				console.debug("Cloned event:", {
					...clonedEvent,
					start: clonedEvent.start.toString(),
					end: clonedEvent.end.toString()
				});

				matchingEvents.push(clonedEvent);
			});
		} else if (!hasRecurrenceOverride) {
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
