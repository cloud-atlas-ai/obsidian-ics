export interface ICSSettings {
    format: {
        timeFormat: string
    },
    calendars: Record < string, Calendar > ;
}

export interface Calendar {
    icsUrl: string;
    icsName: string;
    format: {
        includeEventEndTime: boolean;
        icsName: boolean;
        summary: boolean;
        location: boolean;
        description: boolean;
    }
}

export const DEFAULT_SETTINGS: ICSSettings = {
    format: {
        timeFormat: "HH:mm"
    },
    calendars: {
    }
};
