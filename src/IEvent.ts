import { Calendar } from "./settings/ICSSettings";

export interface IEvent {
	utime: string; // Unix timestamp representing the event start time
	time: string; // Human-readable representation of the event start time
	endTime: string; // Human-readable representation of the event end time
	created: string; // Human-readable representation of the creation timestamp of the event
	sequence: number; // The revision sequence number of the calendar component within a sequence of revisions.
	lastModified: string; // Human-readable representation of when the event was last revised
	icsName: string; // Name of the calendar the event is associated with
	summary: string; // Summary or title of the event
	description: string; // Detailed description of the event
	format: Calendar["format"]; // Format preference for the event
	location: string; // Physical location where the event takes place, if applicable
	callUrl: string; // URL for joining online meetings/calls associated with the event
	callType: string; // Type of online meeting (e.g., Zoom, Skype, etc.)
	organizer: IOrganizer; // Email of the organizer of the event
  attendees: IAttendee[]; // Array of attendees
}

export interface IAttendee {
  email: string;
  name: string;
  role: string;
  status: string; // Participation status (accepted, declined, etc.)
  type: string; // Participant type (individual, group, resource, room, etc.)
}

export interface IOrganizer {
  email: string;
  name: string;
}
