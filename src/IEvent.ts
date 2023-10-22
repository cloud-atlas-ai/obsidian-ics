import { Calendar } from "./settings/ICSSettings";

export interface IEvent {
	utime: string; // Unix timestamp representing the event start time
	time: string; // Human-readable representation of the event start time
	endTime: string; // Human-readable representation of the event end time
	icsName: string; // Name of the calendar the event is associated with
	summary: string; // Summary or title of the event
	description: string; // Detailed description of the event
	format: Calendar["format"]; // Format preference for the event
	location: string; // Physical location where the event takes place, if applicable
	callUrl: string; // URL for joining online meetings/calls associated with the event
	callType: string; // Type of online meeting (e.g., Zoom, Skype, etc.)
}
