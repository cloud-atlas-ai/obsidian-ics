import { parseIcs, filterMatchingEvents } from '../src/icalUtils';

describe('Recurring Events', () => {
  describe('Broken Examples (should be fixed)', () => {
    it('should display weekly recurring meeting with PST timezone and exclusions', () => {
      // This is a failing case from the bug report
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
DESCRIPTION:****
RRULE:FREQ=WEEKLY;UNTIL=20250813T180000Z;INTERVAL=1;BYDAY=WE;WKST=SU
EXDATE;TZID=Pacific Standard Time:20250521T110000,20250702T110000
UID:0400000****A487
SUMMARY:Team collab session
DTSTART;TZID=Pacific Standard Time:20250219T110000
DTEND;TZID=Pacific Standard Time:20250219T120000
CLASS:PUBLIC
PRIORITY:5
DTSTAMP:20250722T171723Z
TRANSP:OPAQUE
STATUS:CONFIRMED
SEQUENCE:0
LOCATION:Microsoft Teams Meeting
X-MICROSOFT-CDO-APPT-SEQUENCE:0
X-MICROSOFT-CDO-BUSYSTATUS:BUSY
X-MICROSOFT-CDO-INTENDEDSTATUS:BUSY
X-MICROSOFT-CDO-ALLDAYEVENT:FALSE
X-MICROSOFT-CDO-IMPORTANCE:1
X-MICROSOFT-CDO-INSTTYPE:1
X-MICROSOFT-DONOTFORWARDMEETING:FALSE
X-MICROSOFT-DISALLOW-COUNTER:FALSE
X-MICROSOFT-REQUESTEDATTENDANCEMODE:DEFAULT
X-MICROSOFT-ISRESPONSEREQUESTED:FALSE
END:VEVENT
END:VCALENDAR`;

      const parsedEvents = parseIcs(icsContent);
      expect(parsedEvents).toHaveLength(1);

      // Test that the event shows up on a Wednesday it should appear on
      const testDate = '2025-02-26'; // A Wednesday that should have the event
      const matchingEvents = filterMatchingEvents(parsedEvents, [testDate], false);
      
      // This should find the recurring event but currently fails due to the bug
      expect(matchingEvents).toHaveLength(1);
      expect(matchingEvents[0].summary).toBe('Team collab session');
      expect(matchingEvents[0].recurrent).toBe(true);
    });

    it('should display bi-weekly recurring meeting with EST timezone and exclusions', () => {
      // This is another failing case from the bug report
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
DESCRIPTION:***
RRULE:FREQ=WEEKLY;UNTIL=20251014T170000Z;INTERVAL=2;BYDAY=TU;WKST=SU
EXDATE;TZID=Eastern Standard Time:20250429T130000,20250513T130000
UID:040***68C
SUMMARY:Meeting 2
DTSTART;TZID=Eastern Standard Time:20250415T130000
DTEND;TZID=Eastern Standard Time:20250415T134500
CLASS:PUBLIC
PRIORITY:5
DTSTAMP:20250609T205446Z
TRANSP:OPAQUE
STATUS:CONFIRMED
SEQUENCE:3
LOCATION:Zoom
X-MICROSOFT-CDO-APPT-SEQUENCE:3
X-MICROSOFT-CDO-BUSYSTATUS:BUSY
X-MICROSOFT-CDO-INTENDEDSTATUS:BUSY
X-MICROSOFT-CDO-ALLDAYEVENT:FALSE
X-MICROSOFT-CDO-IMPORTANCE:1
X-MICROSOFT-CDO-INSTTYPE:1
X-MICROSOFT-DONOTFORWARDMEETING:FALSE
X-MICROSOFT-DISALLOW-COUNTER:FALSE
X-MICROSOFT-REQUESTEDATTENDANCEMODE:DEFAULT
X-MICROSOFT-ISRESPONSEREQUESTED:FALSE
END:VEVENT
END:VCALENDAR`;

      const parsedEvents = parseIcs(icsContent);
      expect(parsedEvents).toHaveLength(1);

      // Test that the event shows up on a Tuesday it should appear on (bi-weekly from 2025-04-15)
      const testDate = '2025-04-29'; // A Tuesday that should have the event but is excluded
      const testDate2 = '2025-05-13'; // Another Tuesday that should have the event but is excluded  
      const testDate3 = '2025-05-27'; // A Tuesday that should have the event and is not excluded

      const matchingEvents = filterMatchingEvents(parsedEvents, [testDate], false);
      const matchingEvents2 = filterMatchingEvents(parsedEvents, [testDate2], false);
      const matchingEvents3 = filterMatchingEvents(parsedEvents, [testDate3], false);
      
      // First two should be excluded, third should appear
      expect(matchingEvents).toHaveLength(0); // Excluded date
      expect(matchingEvents2).toHaveLength(0); // Excluded date
      expect(matchingEvents3).toHaveLength(1); // Should appear
      expect(matchingEvents3[0].summary).toBe('Meeting 2');
      expect(matchingEvents3[0].recurrent).toBe(true);
    });
  });

  describe('Working Examples (regression guards)', () => {
    it('should continue to display recurring event with recurrence-id override', () => {
      // This is a working example from the bug report - should continue to work
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
DESCRIPTION:***
UID:040***A10
RECURRENCE-ID;TZID=Eastern Standard Time:20250611T141500
SUMMARY:Meeting 1
DTSTART;TZID=Eastern Standard Time:20250610T163000
DTEND;TZID=Eastern Standard Time:20250610T170000
CLASS:PUBLIC
PRIORITY:5
DTSTAMP:20250609T205446Z
TRANSP:OPAQUE
STATUS:CONFIRMED
SEQUENCE:23
LOCATION:Zoom
X-MICROSOFT-CDO-APPT-SEQUENCE:23
X-MICROSOFT-CDO-BUSYSTATUS:BUSY
X-MICROSOFT-CDO-INTENDEDSTATUS:BUSY
X-MICROSOFT-CDO-ALLDAYEVENT:FALSE
X-MICROSOFT-CDO-IMPORTANCE:1
X-MICROSOFT-CDO-INSTTYPE:3
X-MICROSOFT-DONOTFORWARDMEETING:FALSE
X-MICROSOFT-DISALLOW-COUNTER:FALSE
X-MICROSOFT-REQUESTEDATTENDANCEMODE:DEFAULT
X-MICROSOFT-ISRESPONSEREQUESTED:FALSE
END:VEVENT
END:VCALENDAR`;

      const parsedEvents = parseIcs(icsContent);
      expect(parsedEvents).toHaveLength(1);

      // Test that the event shows up on the specific date
      const testDate = '2025-06-10'; // The date of the event
      const matchingEvents = filterMatchingEvents(parsedEvents, [testDate], false);
      
      // This should continue to work
      expect(matchingEvents).toHaveLength(1);
      expect(matchingEvents[0].summary).toBe('Meeting 1');
    });
  });

  describe('Timezone Handling Edge Cases', () => {
    it('should handle events across daylight saving time transitions', () => {
      // Test timezone handling during DST transition
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VTIMEZONE
TZID:US/Eastern
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
SUMMARY:DST Test Event
DTSTART;TZID=US/Eastern:20250309T140000
DTEND;TZID=US/Eastern:20250309T150000
RRULE:FREQ=WEEKLY;COUNT=4;BYDAY=SU
UID:dst-test-event
END:VEVENT
END:VCALENDAR`;

      const parsedEvents = parseIcs(icsContent);
      expect(parsedEvents).toHaveLength(1);

      // Test dates that span the DST transition (March 9, 2025 is when DST starts)
      const beforeDST = '2025-03-09'; // Before DST
      const afterDST = '2025-03-16';  // After DST

      const eventsBefore = filterMatchingEvents(parsedEvents, [beforeDST], false);
      const eventsAfter = filterMatchingEvents(parsedEvents, [afterDST], false);
      
      expect(eventsBefore).toHaveLength(1);
      expect(eventsAfter).toHaveLength(1);
      
      // Both should be at the same local time despite DST change
      expect(eventsBefore[0].summary).toBe('DST Test Event');
      expect(eventsAfter[0].summary).toBe('DST Test Event');
    });

    it('should handle events with different timezone formats', () => {
      // Test various timezone format handling
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
SUMMARY:UTC Event
DTSTART:20250301T120000Z
DTEND:20250301T130000Z
RRULE:FREQ=DAILY;COUNT=3
UID:utc-event
END:VEVENT
END:VCALENDAR`;

      const parsedEvents = parseIcs(icsContent);
      expect(parsedEvents).toHaveLength(1);

      const testDate = '2025-03-01';
      const matchingEvents = filterMatchingEvents(parsedEvents, [testDate], false);
      
      expect(matchingEvents).toHaveLength(1);
      expect(matchingEvents[0].summary).toBe('UTC Event');
      expect(matchingEvents[0].recurrent).toBe(true);
    });
  });
});
