export interface CallUrlPattern {
    name: string;
    pattern: string;
    matchType: 'regex' | 'contains';
    enabled: boolean;
    priority: number;
}

export interface ICSSettings {
    format: {
        timeFormat: string
        dataViewSyntax: boolean,
    },
    calendars: Record < string, Calendar > ;
    videoCallExtraction: {
        enabled: boolean;
        patterns: CallUrlPattern[];
    };
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

export const DEFAULT_VIDEO_CALL_PATTERNS: CallUrlPattern[] = [
    {
        name: "Google Meet",
        pattern: "GOOGLE-CONFERENCE",
        matchType: "contains",
        enabled: true,
        priority: 1
    },
    {
        name: "Zoom",
        pattern: "zoom.us",
        matchType: "contains",
        enabled: true,
        priority: 2
    },
    {
        name: "Skype",
        pattern: "https:\\/\\/join\\.skype\\.com\\/[a-zA-Z0-9]+",
        matchType: "regex",
        enabled: true,
        priority: 3
    },
    {
        name: "Microsoft Teams",
        pattern: "https:\\/\\/teams\\.microsoft\\.com\\/l\\/meetup-join\\/[^>]+",
        matchType: "regex",
        enabled: true,
        priority: 4
    }
];

export const DEFAULT_SETTINGS: ICSSettings = {
    format: {
        timeFormat: "HH:mm",
        dataViewSyntax: false,
    },
    calendars: {
    },
    videoCallExtraction: {
        enabled: true,
        patterns: DEFAULT_VIDEO_CALL_PATTERNS
    }
};
