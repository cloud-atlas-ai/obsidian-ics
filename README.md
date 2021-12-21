# Obsidian ICS Plugin

This is a plugin for [Obsidian](https://obsidian.md). It adds events from google calendar ics URLs to your Daily Note on demand.

This only works with the Daily Note or [Periodic Notes](https://github.com/liamcain/obsidian-periodic-notes) plugins: specifically it gets the date to search for events during from the currently open daily note.
## Installation

Manual Installation
1. Download the latest zip file from [releases](https://github.com/muness/obsidian-ics/releases).
2. Unpack the file. It should create a `obsidian-ics` folder.
3. Place the folder in your .obsidian/plugins directory
4. Reload plugins
5. Activate the `ICS` plugin
## Usage

1. From Google Calendar, look for the calendar in the left sidebar click the vertical … menu, Settings and Sharing, Integrate calendar, Copy the Secret address in iCal format
2. Enter that URL into settings with a calendar name
3. Go to a daily note, use the `ICS: Import events` command

![Settings Screenshot](https://github.com/muness/obsidian-ics/blob/master/docs/2021-08-11-22-18-21.png?raw=true)
## Roadmap

- [ ] Support templates instead of presuming the output format
- [ ] Test with O365 and Outlook.com calendars, fix issues that I expect I'll find

## Support

If you want to support my work, you can [buy me a coffee](https://www.buymeacoffee.com/muness)

## Contributions

- [DST fix](https://github.com/muness/obsidian-ics/pull/17) from @zakkolar
