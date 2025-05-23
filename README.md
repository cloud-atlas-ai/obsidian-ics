# Obsidian ICS Plugin

![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/cloud-atlas-ai/obsidian-ics?style=for-the-badge&sort=semver) ![Obsidian Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=%23483699&label=downloads&query=%24%5B%22ics%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json&style=for-the-badge)

This is a plugin for [Obsidian](https://obsidian.md). It adds events from calendar/ics URLs to your Daily Note on demand.

This  is designed to work with the Daily Note or [Periodic Notes](https://github.com/liamcain/obsidian-periodic-notes) plugins: specifically it gets the date to search for events during from the currently open daily note. You can use it through Dataview or Templater for more advanced / customized usage.

I highly recommend pairing this with the [Day Planner](https://github.com/ivan-lednev/obsidian-day-planner) plugin: the output format is tuned to support it and you'll get support for seeing the day and week planners.

## Installation

This plugin is in the community plugin browser in Obsidian. Search for ICS and you can install it from there.

## Setup

### Get Your Google Calendar URL
1. From [Google Calendar](https://calendar.google.com), look on the left-hand side for the "My Calendars" section.
2. Within that list, find the Calendar that you want to integrate into Obsidian.
3. Click on the Three Dots Menu (on the right of the calendar name), then click on 'Settings'.
4. Once on the Settings Page, you should find yourself on the specific calendar's "Settings for my calendars" view. On the left-hand side of the page, click the  "Integrate Calendar" button.
5. On this page, click on the "copy" button next to the "Secret Address in iCal Format". Google Calendar will give you a warning about not sharing it with anyone.

### Obsidian Plugin Setup
1. Click the "+" button to add a new calendar.
2. Choose a name for the calendar, select "Calendar Type" as "Remote URL", and then paste the Secret Address URL into the box labeled "Calendar URL".
3. Customize your format settings for the specific calendar. These tie to the Output Format for that specific calendar:  whether to include a checkbox for each scheduled item, the event end time, the calendar name, event summary, event location, event description
4. Click "Save" at the bottom of the specific Calendar's view.
5. On the main ICS page, select your time [format](https://momentjs.com/docs/#/displaying/) and whether to emit start and end times as Dataview Metadata. See the below screenshot.
6. Once you've done all of this, use the `ICS: Import events` command. If it shows nothing, check to make sure your iCal URL is the secret URL as that commonly is the issue.

![Settings Screenshot](https://github.com/cloud-atlas-ai/obsidian-ics/blob/master/docs/2023-09-03-settings.png?raw=true)

### Usage

Go to a daily note, use the `ICS: Import events` command.

For customizations not available to the formatting, use Dataview or Templater (see below). Likewise, if you want to automatically import events when you create your daily notes, you'll want to use one of those. If you have issues using Dataview or Templater, test that your calendar imports works using the `ICS: Import events` command as there's more error handling available there.

### Data view usage

You can also use a [Dataview](https://blacksmithgu.github.io/obsidian-dataview/) to add your events to your journal notes when they get created. For examples, if you use the core Templates plugin you can add the following to add events to your daily note template:

```dataviewjs
var events = await app.plugins.getPlugin('ics').getEvents(dv.current().file.name);
var mdArray = [];
events.forEach((e) => {
  mdArray.push(`${e.time} ${e.summary} ${e.location}: ${e.description}`.trim())
})
dv.list(dv.array(mdArray))
```

You can see the available fields in the [Event interface](https://github.com/cloud-atlas-ai/obsidian-ics/blob/master/src/IEvent.ts).

### Templater

Or you can use [Templater](https://github.com/SilentVoid13/Templater):

```javascript
<%*
var events = await app.plugins.getPlugin('ics').getEvents(moment(tp.file.title,'YYYY-MM-DD'));
events.sort((a,b) => a.utime - b.utime).forEach((e) => {
  tR+=`- [ ] ${e.time} ${e.summary} ${e.location? e.location : ''}\n`
})
%>
```

See [advanced Templated usage example](https://github.com/cloud-atlas-ai/obsidian-ics/discussions/74#discussion-5779931) for an example that demonstrates more features.

You can see the available fields an the [Event interface](https://github.com/cloud-atlas-ai/obsidian-ics/blob/master/src/IEvent.ts).

### Full Calendar

Or you can use [Full Calendar](https://github.com/obsidian-community/obsidian-full-calendar) to render a calendar view of your events. Here's an example of how you can use it:

```javascript
const { renderCalendar } = app.plugins.getPlugin("obsidian-full-calendar");
const thisWeek = Array.from({length: 7}).map((_, weekday) => moment().set({weekday}).format("YYYY-MM-DD"))
const icsPlugin = app.plugins.getPlugin('ics')
const events = (await icsPlugin.getEvents(...thisWeek))
    .map(event => {
	  const start = moment.unix(event.utime)
	  const [endHours, endMinutes] = event.endTime.split(":")
	  return {
	      start: start.toDate(),
	      end: start.set({hour: endHours, minute: endMinutes}).toDate(),
	      title: event.summary,
	    }
	}
)
renderCalendar(this.container, {events}).render()
```

### Using BRAT

If you want to try out beta releases, you can use the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin.

1. Install the BRAT plugin
    1. Open `Settings` -> `Community Plugins`
    2. Disable safe mode, if enabled
    3. *Browse*, and search for "BRAT"
    4. Install the latest version of **Obsidian42 - BRAT**
2. Open BRAT settings (`Settings` -> `BRAT`)
    1. Scroll to the `Beta Plugin List` section
    2. `Add Beta Plugin`
    3. Specify this repository: `cloud-atlas-ai/obsidian-ics`
3. Enable the `Amazing Marvin` plugin (`Settings` -> `Community Plugins`)

## Support

If you want to support my work, you can [buy me a coffee](https://www.buymeacoffee.com/muness)

## Contributions

- [DST fix](https://github.com/muness/obsidian-ics/pull/17) from @zakkolar
- [Readme improvements and release script cleanup](https://github.com/muness/obsidian-ics/pull/22) from @fcwheat
- [Export event getter function](https://github.com/muness/obsidian-ics/pull/33) @bvolkmer
- [Allow plugin to run on mobile](https://github.com/muness/obsidian-ics/pull/46) @TopherMan
- [Implement customizable output format for events](https://github.com/muness/obsidian-ics/pull/55) @GoBeromsu
- [Documenting Dataview usage](https://github.com/muness/obsidian-ics/issues/56#issuecomment-1746417368) @afonsoguerra
- [Vdir enhancements](https://github.com/cloud-atlas-ai/obsidian-ics/pull/131) @bpannier
- [Ensure recurrent flag is set correctly](https://github.com/cloud-atlas-ai/obsidian-ics/pull/158) for recurrence overrides @mikeh
- [Support multiple days](https://github.com/cloud-atlas-ai/obsidian-ics/pull/160) and document [Full Calendar](https://github.com/obsidian-community/obsidian-full-calendar) usage @ctrl-q

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
4. `npm run dev` will watch for changes and build the plugin to `dist/main.js`.
5. copy the `dist/main.js` (or `dist/main-debug.js` if you want the un-minified version) to your Obdisian vault plugin folder (`cp dist/main.js <vault>/.obsidian/plugins/ics/main.js`).
6. Reload the vault or use the [Hot Reload Plugin](https://github.com/pjeby/hot-reload).
