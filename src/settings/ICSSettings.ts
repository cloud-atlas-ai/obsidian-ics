export interface ICSSettings {
    calendars: Record < string, Calendar > ;
}

export interface Calendar {
    icsUrl: string;
    icsName: string;
}

export const DEFAULT_SETTINGS: ICSSettings = {
    calendars: {
    }
};