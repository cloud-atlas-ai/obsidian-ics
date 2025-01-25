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

function applyRecurrenceDateAndTimezone(originalDate: Date, currentDate: Date, tzid: string): Date {
  const momentOriginal = tz(originalDate, tzid);
  const momentCurrent = tz(currentDate, tzid);

  // Calculate the difference in hours and minutes between the original and current
  const hourOffset = momentOriginal.hour() - momentCurrent.hour();
  const minuteOffset = momentOriginal.minute() - momentCurrent.minute();

  // Adjust the current date by the offset to keep the local time constant
  return momentCurrent.add(hourOffset, 'hours').add(minuteOffset, 'minutes').toDate();
}

function isExcluded(recurrenceDate: moment.Moment, exdateArray: moment.Moment[]): boolean {
  return exdateArray.some(exDate => exDate.isSame(recurrenceDate, 'day'));
}

function processRecurrenceOverrides(event: any, sortedDaysToMatch: string[], excludedDates: moment.Moment[], matchingEvents: any[]) {
  for (const date in event.recurrences) {
    const recurrence = event.recurrences[date];
    const recurrenceMoment = moment(date).startOf('day');

    // Skip canceled overrides
    if (recurrence.status && recurrence.status.toUpperCase() === "CANCELLED") {
      console.debug(`Skipping canceled recurrence override: ${recurrence.summary} on ${date}`);
      continue;
    }

    recurrence.recurrent = true;

    // Check if this override matches the dayToMatch
    if (moment(recurrence.start).isBetween(sortedDaysToMatch.first(), sortedDaysToMatch.last(), "day", "[]")) {
      console.debug(`Adding recurring event with override: ${recurrence.summary} on ${recurrenceMoment.format('YYYY-MM-DD')}`);
      recurrence.eventType = "recurring override";
      matchingEvents.push(recurrence);
    }
  }
}

function processRecurringRules(event: any, sortedDaysToMatch: string[], excludedDates: moment.Moment[], matchingEvents: any[]) {
  const localStartOfRange = moment(sortedDaysToMatch.first()).subtract(1, 'day').startOf('day').toDate();
  const localEndOfRange = moment(sortedDaysToMatch.last()).add(1, 'day').endOf('day').toDate();

  // Get recurrence dates within the range
  const recurrenceDates = event.rrule.between(localStartOfRange, localEndOfRange, true);

  recurrenceDates.forEach(recurrenceDate => {
    const recurrenceMoment = tz(recurrenceDate, event.rrule.origOptions.tzid || 'UTC');

    // Clone the event and use the recurrence date directly if start and end times are present
    const clonedEvent = { ...event };
    clonedEvent.start = applyRecurrenceDateAndTimezone(event.start, recurrenceDate, event.rrule.origOptions.tzid);
    clonedEvent.end = applyRecurrenceDateAndTimezone(event.end, recurrenceDate, event.rrule.origOptions.tzid);

    if (isExcluded(recurrenceMoment, excludedDates)) {
      console.debug(`Skipping excluded recurrence: ${event.summary} on ${recurrenceMoment.format('YYYY-MM-DD')}`);
      return;
    }

    delete clonedEvent.rrule;
    clonedEvent.recurrent = true;

    if (moment(clonedEvent.start).isBetween(sortedDaysToMatch.first(), sortedDaysToMatch.last(), 'day', '[]')) {
      console.debug(`Adding recurring event: ${clonedEvent.summary} ${clonedEvent.start} - ${clonedEvent.end}`);
      console.debug("Excluded dates:", excludedDates.map(date => date.format('YYYY-MM-DD')));

      console.debug(clonedEvent);
      clonedEvent.eventType = "recurring";
      matchingEvents.push(clonedEvent);
    }
  });
}

function shouldIncludeOngoing(event: any, dayToMatch: string): boolean {
  return moment(dayToMatch).isBetween(moment(event.start), moment(event.end), "day");
}

export function filterMatchingEvents(icsArray: any[], daysToMatch: string[], showOngoing: boolean) {
  const sortedDaysToMatch = [...daysToMatch].sort();
  return icsArray.reduce((matchingEvents, event) => {
    // Skip canceled parent events
    if (event.status && event.status.toUpperCase() === "CANCELLED") {
      console.debug(`Skipping canceled event: ${event.summary}`);
      return matchingEvents;
    }

    // Populate excluded dates from exdates and recurrence overrides
    const excludedDates = [
      ...(event.exdate
        ? Object.keys(event.exdate).map(key => {
          const date = tz(event.exdate[key], event.exdate[key].tz || 'UTC');
          return date.startOf('day');
        })
        : []),

      // Add overridden dates from recurrences
      ...(event.recurrences
        ? Object.keys(event.recurrences).map(key => moment(key).startOf('day'))
        : [])
    ];

    // Process recurrence overrides to populate matching events and excluded dates
    if (event.recurrences) {
      processRecurrenceOverrides(event, sortedDaysToMatch, excludedDates, matchingEvents);
    }

    // Process recurring rules, skipping overridden dates
    if (event.rrule) {
      processRecurringRules(event, sortedDaysToMatch, excludedDates, matchingEvents)
    }

    // Process non-recurring events
    if (!event.recurrences && !event.rrule && moment(event.start).isBetween(sortedDaysToMatch.first(), sortedDaysToMatch.last(), "day", "[]")) {
      console.debug("Adding one-off event:", {
        summary: event.summary,
        start: event.start,
        end: event.end,
        recurrenceId: event.recurrenceid || null,
        isRecurring: !!event.rrule || !!event.recurrences,
      });
      event.eventType = "one-off";
      matchingEvents.push(event);
    }

    // Include ongoing events
    if (showOngoing && daysToMatch.some(dayToMatch => shouldIncludeOngoing(event, dayToMatch))) {
      matchingEvents.push(event);
    }

    return matchingEvents;
  }, []);
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
