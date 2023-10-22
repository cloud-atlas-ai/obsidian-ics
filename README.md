# Obsidian ICS Plugin

This is a plugin for [Obsidian](https://obsidian.md). It adds events from google calendar ics URLs to your Daily Note on demand.

This only works with the Daily Note or [Periodic Notes](https://github.com/liamcain/obsidian-periodic-notes) plugins: specifically it gets the date to search for events during from the currently open daily note.

I highly recommend pairing this with the [Day Planner](https://github.com/ivan-lednev/obsidian-day-planner) plugin: the output format is tuned to support it and you'll get support for seeing the day and week planners.

## Installation

This plugin is in the community plugin browser in Obsidian. Search for ICS and you can install it from there.

## Setup

1. From Google Calendar, look for the calendar in the left sidebar click the vertical … menu, Settings and Sharing, Integrate calendar, Copy the Secret address in iCal format
2. Enter that URL into settings with a calendar name
3. Customize your format settings. Some are per calendar, others are for all calendars.
   - Per calendar settings: Whether to include a checkbox, the event end time, the calendar name, event summary, event location, event description
   - General output settings: Time [format](https://momentjs.com/docs/#/displaying/).

![Settings Screenshot](https://github.com/muness/obsidian-ics/blob/master/docs/2023-09-03-settings.png?raw=true)

### Usage

Go to a daily note, use the `ICS: Import events` command. For customizations not available to the formatting, use Dataview or Templater (see below).

### Data view usage

You can also use a [Dataview](https://blacksmithgu.github.io/obsidian-dataview/) to add your events to your journal notes when they get created. For examples, if you use the core Templates plugin you can add the following to add events to your daily note template:

```javascript
```dataviewjs
var events = await app.plugins.getPlugin('ics').getEvents("{{date:YYYY-MM-DD}}");
var mdArray = [];
events.forEach((e) => {
  mdArray.push(`${e.time} ${e.summary} ${e.location}: ${e.description}`.trim())
})
dv.list(dv.array(mdArray))```
```

You can see the available fields in the [Event interface](https://github.com/muness/obsidian-ics/blob/master/src/IEvent.ts).

### Templater

Or you can use [Templater](https://github.com/SilentVoid13/Templater):

```javascript
<%*
var events = await app.plugins.getPlugin('ics').getEvents(tp.file.title);
var mdArray = [];
events.sort((a,b) => a.utime - b.utime).forEach((e) => {
  tR+=`- [ ] ${e.time} ${e.summary} ${e.location? e.location : ''}\n`
})
%>
```

You can see the available fields in the [Event interface](https://github.com/muness/obsidian-ics/blob/master/src/IEvent.ts).

## Support

If you want to support my work, you can [buy me a coffee](https://www.buymeacoffee.com/muness)

## Contributions

- [DST fix](https://github.com/muness/obsidian-ics/pull/17) from @zakkolar
- [Readme improvements and release script cleanup](https://github.com/muness/obsidian-ics/pull/22) from @fcwheat
- [Export event getter function](https://github.com/muness/obsidian-ics/pull/33) @bvolkmer
- [Allow plugin to run on mobile](https://github.com/muness/obsidian-ics/pull/46) @TopherMan
- [Implement customizable output format for events](https://github.com/muness/obsidian-ics/pull/55) @GoBeromsu
- [Documenting Dataview usage](https://github.com/muness/obsidian-ics/issues/56#issuecomment-1746417368) @afonsoguerra

## Manual Installation

If for some reason you want to install the plugin manually:

1. Download the `obsidian-ics-[version].zip` release file from [releases](https://github.com/muness/obsidian-ics/releases).
2. Unpack the file. It should create a `obsidian-ics` folder.
3. Place the folder in your .obsidian/plugins directory
4. Activate the `ICS` plugin

## Local Development

1. To develop Obsidian plugins you need NodeJS and npm installed. Do that first.
2. `npm install`
3. Make the changes you want...
4. `npm run build` will build the plugin to `dist/main.js`
5. copy the `dist/main/js` to your Obdisian vault plugin folder (`cp dist/main.js <vault>/.obsidian/plugins/ics/`).
6. Reload the vault or use the [Hot Reload Plugin](https://github.com/pjeby/hot-reload).
