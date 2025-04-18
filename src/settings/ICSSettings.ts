export interface ICSSettings {
    format: {
        timeFormat: string
        dataViewSyntax: boolean,
    },
    calendars: Record < string, Calendar > ;
}

export interface Calendar {
    icsUrl: string;
    icsName: string;

    /**
     * Optional field for storing the owner email of this calendar.
     * Used when checking PARTSTAT=DECLINED for that email.
     */
    ownerEmail?: string;

    calendarType: 'remote' | 'vdir';
    format: {
        checkbox: boolean;
        includeEventEndTime: boolean;
        icsName: boolean;
        summary: boolean;
        location: boolean;
        description: boolean;
        showAttendees: boolean;
        showOngoing: boolean;
        showTransparentEvents: boolean;
    }
}

export const DEFAULT_CALENDAR_FORMAT = {
    checkbox: true,
    includeEventEndTime: true,
    icsName: true,
    summary: true,
    location: true,
    description: false,
    calendarType: 'remote',
    showAttendees: false,
    showOngoing: false,
    showTransparentEvents: false
};

export const DEFAULT_SETTINGS: ICSSettings = {
    format: {
        timeFormat: "HH:mm",
        dataViewSyntax: false,
    },
    calendars: {
    }
};
