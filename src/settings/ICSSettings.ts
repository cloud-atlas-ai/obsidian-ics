export interface ICSSettings {
    calendars: Record < string, Calendar > ;
}

export interface Calendar {
    icsUrl: string;
    icsName: string;
    format: {
        icsName: boolean;
        summary: boolean;
        description: boolean;
    }
}

export const DEFAULT_SETTINGS: ICSSettings = {
    calendars: {
    }
};