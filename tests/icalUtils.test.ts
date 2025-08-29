import { parseIcs, filterMatchingEvents, extractMeetingInfo } from '../src/icalUtils';
import { moment } from 'obsidian';

describe('icalUtils', () => {
  describe('parseIcs', () => {
    it('should parse basic ICS content', () => {
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
SUMMARY:Test Event
DTSTART:20250301T120000Z
DTEND:20250301T130000Z
UID:test-event
END:VEVENT
END:VCALENDAR`;

      const events = parseIcs(icsContent);
      expect(events).toHaveLength(1);
      expect(events[0].summary).toBe('Test Event');
    });

    it('should parse multiple events', () => {
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
SUMMARY:Event 1
DTSTART:20250301T120000Z
DTEND:20250301T130000Z
UID:event-1
END:VEVENT
BEGIN:VEVENT
SUMMARY:Event 2
DTSTART:20250302T120000Z
DTEND:20250302T130000Z
UID:event-2
END:VEVENT
END:VCALENDAR`;

      const events = parseIcs(icsContent);
      expect(events).toHaveLength(2);
      expect(events[0].summary).toBe('Event 1');
      expect(events[1].summary).toBe('Event 2');
    });
  });

  describe('filterMatchingEvents', () => {
    it('should filter non-recurring events by date', () => {
      const events = [{
        summary: 'Test Event',
        start: new Date('2025-03-01T12:00:00Z'),
        end: new Date('2025-03-01T13:00:00Z'),
        uid: 'test-event'
      }];

      const matching = filterMatchingEvents(events, ['2025-03-01'], false);
      expect(matching).toHaveLength(1);
      expect(matching[0].summary).toBe('Test Event');

      const notMatching = filterMatchingEvents(events, ['2025-03-02'], false);
      expect(notMatching).toHaveLength(0);
    });

    it('should handle ongoing events when showOngoing is true', () => {
      const events = [{
        summary: 'Multi-day Event',
        start: new Date('2025-03-01T12:00:00Z'),
        end: new Date('2025-03-03T13:00:00Z'),
        uid: 'multi-day-event'
      }];

      // Should not match without showOngoing
      const withoutOngoing = filterMatchingEvents(events, ['2025-03-02'], false);
      expect(withoutOngoing).toHaveLength(0);

      // Should match with showOngoing
      const withOngoing = filterMatchingEvents(events, ['2025-03-02'], true);
      expect(withOngoing).toHaveLength(1);
      expect(withOngoing[0].summary).toBe('Multi-day Event');
    });

    it('should skip cancelled events', () => {
      const events = [{
        summary: 'Cancelled Event',
        start: new Date('2025-03-01T12:00:00Z'),
        end: new Date('2025-03-01T13:00:00Z'),
        status: 'CANCELLED',
        uid: 'cancelled-event'
      }];

      const matching = filterMatchingEvents(events, ['2025-03-01'], false);
      expect(matching).toHaveLength(0);
    });
  });

  describe('extractMeetingInfo', () => {
    it('should extract Google Meet conference data', () => {
      const event = {
        'GOOGLE-CONFERENCE': 'https://meet.google.com/abc-defg-hij'
      };

      const { callUrl, callType } = extractMeetingInfo(event);
      expect(callUrl).toBe('https://meet.google.com/abc-defg-hij');
      expect(callType).toBe('Google Meet');
    });

    it('should extract Zoom links from location', () => {
      const event = {
        location: 'https://zoom.us/j/123456789'
      };

      const { callUrl, callType } = extractMeetingInfo(event);
      expect(callUrl).toBe('https://zoom.us/j/123456789');
      expect(callType).toBe('Zoom');
    });

    it('should extract Skype links from description', () => {
      const event = {
        description: 'Join the meeting: https://join.skype.com/abc123def'
      };

      const { callUrl, callType } = extractMeetingInfo(event);
      expect(callUrl).toBe('https://join.skype.com/abc123def');
      expect(callType).toBe('Skype');
    });

    it('should extract Teams links from description', () => {
      const event = {
        description: 'Microsoft Teams meeting: https://teams.microsoft.com/l/meetup-join/abc123def'
      };

      const { callUrl, callType } = extractMeetingInfo(event);
      expect(callUrl).toBe('https://teams.microsoft.com/l/meetup-join/abc123def');
      expect(callType).toBe('Microsoft Teams');
    });

    it('should return null values when no meeting info found', () => {
      const event = {
        summary: 'Regular meeting'
      };

      const { callUrl, callType } = extractMeetingInfo(event);
      expect(callUrl).toBeNull();
      expect(callType).toBeNull();
    });
  });

  describe('Timezone and Recurrence Integration', () => {
    it('should handle complex recurring patterns with timezones', () => {
      // This test specifically targets the logic that was changed in the problematic commit
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VTIMEZONE
TZID:America/New_York
BEGIN:STANDARD
DTSTART:20071104T020000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
TZNAME:EST
TZOFFSETFROM:-0400
TZOFFSETTO:-0500
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:20070311T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
TZNAME:EDT
TZOFFSETFROM:-0500
TZOFFSETTO:-0400
END:DAYLIGHT
END:VTIMEZONE
BEGIN:VEVENT
SUMMARY:Timezone Test
DTSTART;TZID=America/New_York:20250301T090000
DTEND;TZID=America/New_York:20250301T100000
RRULE:FREQ=WEEKLY;COUNT=10;BYDAY=SA
EXDATE;TZID=America/New_York:20250315T090000
UID:timezone-test
END:VEVENT
END:VCALENDAR`;

      const events = parseIcs(icsContent);
      expect(events).toHaveLength(1);

      // Test multiple dates to ensure recurring logic works correctly
      const testDates = [
        '2025-03-01', // Original event
        '2025-03-08', // First recurrence
        '2025-03-15', // Excluded date
        '2025-03-22'  // Should appear
      ];

      const results = testDates.map(date => filterMatchingEvents(events, [date], false));
      
      expect(results[0]).toHaveLength(1); // Original
      expect(results[1]).toHaveLength(1); // First recurrence
      expect(results[2]).toHaveLength(0); // Excluded
      expect(results[3]).toHaveLength(1); // Should appear
    });
  });


});
