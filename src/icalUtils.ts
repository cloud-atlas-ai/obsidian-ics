const ical = require('node-ical');
const moment = require('moment');

export function filterMatchingEvents(icsArray: any[], dayToMatch: string) {
	var matchingEvents = [];
	matchingEvents = findRecurringEvents(icsArray, dayToMatch);

	// find non-recurring events on the day
	icsArray.map((e) => {
		if (moment(e.start).isSame(dayToMatch, "day")) {
			matchingEvents.push(e);
		}
	});

	return matchingEvents;
}
function findRecurringEvents(icsArray: any[], dayToMatch: string) {
	var matchingRecurringEvents: any[] = [];

	const rangeStart = moment(dayToMatch);
	const rangeEnd = moment(dayToMatch).add(1439, 'minutes');
	for (const k in icsArray) {
		const event = icsArray[k];
		const title = event.summary;

		// When dealing with calendar recurrences, you need a range of dates to query against,
		// because otherwise you can get an infinite number of calendar events.
		let startDate = moment(event.start);
		let endDate = moment(event.end);

		// Calculate the duration of the event for use with recurring events.
		const duration = Number.parseInt(endDate.format('x'), 10) - Number.parseInt(startDate.format('x'), 10);

		if (typeof event.rrule !== 'undefined') {
			// Complicated case - if an RRULE exists, handle multiple recurrences of the event.
			// For recurring events, get the set of event start dates that fall within the range
			// of dates we're looking for.
			var dates = event.rrule.between(rangeStart.toDate(), rangeEnd.toDate(), true, () => {
				return true;
			});

			// Loop through the set of date entries to see which recurrences should be included.
			for (const i in dates) {
				const date = dates[i];
				let curEvent = event;
				let includeRecurrence = true;
				let curDuration = duration;

				let startDate = moment(date);

				// Use just the date of the recurrence to look up overrides and exceptions (i.e. chop off time information)
				const dateLookupKey = date.toISOString().slice(0, 10);

        let overriden = '';
				// For each date that we're checking, it's possible that there is a recurrence override for that one day.
				if (curEvent.recurrences !== undefined && curEvent.recurrences[dateLookupKey] !== undefined) {
					// We found an override, so for this recurrence, use a potentially different title, start date, and duration.
					curEvent = curEvent.recurrences[dateLookupKey];
					startDate = moment(curEvent.start);
					curDuration = Number.parseInt(moment(curEvent.end).format('x'), 10) - Number.parseInt(startDate.format('x'), 10);
          overriden = 'overridden ';
				} else if (curEvent.exdate !== undefined && curEvent.exdate[dateLookupKey] !== undefined) {
					// If there's no recurrence override, check for an exception date.  Exception dates represent exceptions to the rule.
					// This date is an exception date, which means we should skip it in the recurrence pattern.
					includeRecurrence = false;
				}

				if (startDate.isSame(curEvent.start) && endDate.isSame(curEvent.end)) {
					includeRecurrence = false;
				}

				if (includeRecurrence === true) {

          if (event.rrule.origOptions.tzid) {
            // tzid present on the rrule
						const eventTimeZone = moment.tz.zone(event.rrule.origOptions.tzid);
						const localTimeZone = moment.tz.zone(moment.tz.guess());
            const offset = localTimeZone.utcOffset(date) - eventTimeZone.utcOffset(date);
            startDate = moment(date).add(offset, 'minutes').toDate();
					} else {
							// tzid not present on rrule (calculate offset from original start)
							startDate = new Date(date.setHours(date.getHours() - ((event.start.getTimezoneOffset() - date.getTimezoneOffset()) / 60)));
					}
				  // Set the the end date from the regular event or the recurrence override.
					let endDate = moment(Number.parseInt(moment(startDate).format('x'), 10) + curDuration, 'x');

					matchingRecurringEvents.push(cloneRecurringEvent(curEvent, moment(startDate), endDate));
				}
			}
		}
	}
	return matchingRecurringEvents;

	function cloneRecurringEvent(curEvent: any, startDate: any, endDate: any) {
		return {
			description: curEvent.description,
			summary: `${curEvent.summary} (recurring)`,
			start: startDate.toDate(),
			end: endDate.toDate(),
			location: curEvent.location,
		};
	}
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
