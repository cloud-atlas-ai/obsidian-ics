import ICSPlugin from "../main";
import {
  PluginSettingTab,
  Setting,
  App,
  ButtonComponent,
  Modal,
  TextComponent,
  DropdownComponent,
} from "obsidian";

import {
  Calendar,
  DEFAULT_CALENDAR_FORMAT
} from "./ICSSettings";
import moment = require("moment");

export function getCalendarElement(
  icsName: string): HTMLElement {
  let calendarElement, titleEl;

  calendarElement = createDiv({
    cls: `calendar calendar-${icsName}`,
  });
  titleEl = calendarElement.createEl("summary", {
    cls: `calendar-name ${icsName}`,
    text: icsName
  });

  return calendarElement;
}

export default class ICSSettingsTab extends PluginSettingTab {
  plugin: ICSPlugin;
  timeFormatExample = document.createElement('b');

  constructor(app: App, plugin: ICSPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  // use this same format to create a description for the dataViewSyntax setting
  private timeFormattingDescription(): DocumentFragment {
    this.updateTimeFormatExample();

    const descEl = document.createDocumentFragment();
    descEl.appendText('Time format for events. HH:mm is 00:15. hh:mma is 12:15am.');
    descEl.appendText(' For more syntax, refer to ');
    descEl.appendChild(this.getMomentDocsLink());
    descEl.appendText('.');

    descEl.appendChild(document.createElement('p'));
    descEl.appendText('Your current time format syntax looks like this: ');
    descEl.appendChild(this.timeFormatExample);
    descEl.appendText('.');
    return descEl;
  }

  private getMomentDocsLink(): HTMLAnchorElement {
    const a = document.createElement('a');
    a.href = 'https://momentjs.com/docs/#/displaying/format/';
    a.text = 'format reference';
    a.target = '_blank';
    return a;
  }

  private updateTimeFormatExample() {
    this.timeFormatExample.innerText = moment(new Date()).format(this.plugin.data.format.timeFormat);
  }

  private dataViewSyntaxDescription(): DocumentFragment {
    const descEl = document.createDocumentFragment();
    descEl.appendText('Enable this option if you use the DataView plugin to query event start and end times.');
    return descEl;
  }

  display(): void {
    let {
      containerEl
    } = this;

    containerEl.empty();

    const calendarContainer = containerEl.createDiv(
      "ics-setting-calendar"
    );

    const calnedarSetting = new Setting(calendarContainer)
      .setHeading().setName("Calendars");

    new Setting(calendarContainer)
      .setName("Add new")
      .setDesc("Add a new calendar")
      .addButton((button: ButtonComponent): ButtonComponent => {
        let b = button
          .setTooltip("Add Additional")
          .setButtonText("+")
          .onClick(async () => {
            let modal = new SettingsModal(this.app, this.plugin);

            modal.onClose = async () => {
              if (modal.saved) {
                this.plugin.addCalendar({
                  icsName: modal.icsName,
                  icsUrl: modal.icsUrl,
                  format: modal.format,
                  calendarType: modal.calendarType as 'remote' | 'vdir',
                });
                this.display();
              }
            };

            modal.open();
          });

        return b;
      });

    const additional = calendarContainer.createDiv("calendar");
    for (let a in this.plugin.data.calendars) {
      const calendar = this.plugin.data.calendars[a];

      let setting = new Setting(additional);

      let calEl = getCalendarElement(
        calendar.icsName);
      setting.infoEl.replaceWith(calEl);

      setting
        .addExtraButton((b) => {
          b.setIcon("pencil")
            .setTooltip("Edit")
            .onClick(() => {
              let modal = new SettingsModal(this.app, this.plugin, calendar);

              modal.onClose = async () => {
                if (modal.saved) {
                  this.plugin.removeCalendar(calendar);
                  this.plugin.addCalendar({
                    icsName: modal.icsName,
                    icsUrl: modal.icsUrl,
                    format: modal.format,
                    calendarType: modal.calendarType as 'remote' | 'vdir',
                  });
                  this.display();
                }
              };

              modal.open();
            });
        })
        .addExtraButton((b) => {
          b.setIcon("trash")
            .setTooltip("Delete")
            .onClick(() => {
              this.plugin.removeCalendar(calendar);
              this.display();
            });
        });
    }

    const formatSetting = new Setting(containerEl)
      .setHeading().setName("Output Format");


    let timeFormat: TextComponent;
    const timeFormatSetting = new Setting(containerEl)
      .setName("Time format")
      .setDesc(this.timeFormattingDescription())
      .addText((text) => {
        timeFormat = text;
        timeFormat.setValue(this.plugin.data.format.timeFormat).onChange(async (v) => {
          this.plugin.data.format.timeFormat = v;
          this.updateTimeFormatExample();
          await this.plugin.saveSettings();
        });
      });

    const dataViewSyntaxSetting = new Setting(containerEl)
      .setName('DataView Metadata syntax for start and end times')
      .setDesc(this.dataViewSyntaxDescription())
      .addToggle(toggle => toggle
        .setValue(this.plugin.data.format.dataViewSyntax || false)
        .onChange(async (v) => {
          this.plugin.data.format.dataViewSyntax = v;
          await this.plugin.saveSettings();
        }));

    // Sponsor link - Thank you!
    const divSponsor = containerEl.createDiv();
    divSponsor.innerHTML = `<br/><hr/>A scratch my own itch project by <a href="https://muness.com/" target='_blank'>muness</a>.<br/>
			<a href='https://www.buymeacoffee.com/muness' target='_blank'><img height="36" src='https://cdn.buymeacoffee.com/uploads/profile_pictures/default/79D6B5/MC.png' border='0' alt='Buy Me a Book' /></a>
		`
  }

}




class SettingsModal extends Modal {
  plugin: ICSPlugin;
  icsName: string = "";
  icsUrl: string = "";
  urlSetting: Setting;
  urlText: TextComponent;
  urlDropdown: DropdownComponent;

  saved: boolean = false;
  error: boolean = false;
  format: {
    checkbox: boolean,
    includeEventEndTime: boolean,
    icsName: boolean,
    summary: boolean,
    location: boolean,
    description: boolean,
    showAttendees: boolean,
    showOngoing: boolean
  } = DEFAULT_CALENDAR_FORMAT;
  calendarType: string;
  constructor(app: App, plugin: ICSPlugin, setting?: Calendar) {
    super(app);
    this.plugin = plugin;
    if (setting) {
      this.icsName = setting.icsName;
      this.icsUrl = setting.icsUrl;
      this.format = setting.format || this.format // if format is undefined, use default
      this.calendarType = setting.calendarType || 'remote';
    }
  }


  listIcsDirectories(): string[] {
    const icsFiles = this.app.vault.getFiles().filter(f => f.extension === "ics");
    const directories = new Set(icsFiles.map(f => f.parent.path));
    return Array.from(directories);
  }

  display() {
    let {
      contentEl
    } = this;

    contentEl.empty();

    const settingDiv = contentEl.createDiv();
    settingDiv.addClass('ics-settings');

    let nameText: TextComponent;
    const nameSetting = new Setting(settingDiv)
      .setName("Calendar Name")
      .addText((text) => {
        nameText = text;
        nameText.setValue(this.icsName).onChange(async (v) => {
          this.icsName = v;
        });
      });

    const calendarTypeSetting = new Setting(settingDiv)
      .setName('Calendar Type')
      .setDesc('Select the type of calendar (Remote URL or vdir)')
      .addDropdown(dropdown => {
        dropdown.addOption('remote', 'Remote URL');
        dropdown.addOption('vdir', 'vdir');
        dropdown.setValue(this.calendarType)
          .onChange(value => {
            this.calendarType = value as 'remote' | 'vdir';
            updateUrlSetting();
          });
      });

    const urlSettingDiv = settingDiv.createDiv({ cls: 'url-setting-container' });

    // Function to update URL setting
    const updateUrlSetting = () => {
      // First, remove the existing URL setting if it exists
      settingDiv.querySelectorAll('.url-setting').forEach(el => el.remove());

      let urlSetting = new Setting(urlSettingDiv)
        .setName(this.calendarType === 'vdir' ? 'Directory' : 'Calendar URL');
      urlSetting.settingEl.addClass('url-setting');

      if (this.calendarType === 'vdir') {
        // If vdir, add a dropdown
        urlSetting.addDropdown(dropdown => {
          const directories = this.listIcsDirectories();
          directories.forEach(dir => {
            dropdown.addOption(dir, dir);
          });
          dropdown.setValue(this.icsUrl).onChange(value => {
            this.icsUrl = value;
          });
        });
      } else {
        // If remote, add a text input
        urlSetting.addText(text => {
          text.setValue(this.icsUrl).onChange(value => {
            this.icsUrl = value;
          });
        });
      }
    };

    // Call updateUrlSetting initially
    updateUrlSetting();

    const formatSetting = new Setting(settingDiv)
      .setHeading().setName("Output Format");

    // set each of the calendar format settings to the default if it's undefined
    for (let f in DEFAULT_CALENDAR_FORMAT) {
      if (this.format[f] == undefined) {
        this.format[f] = DEFAULT_CALENDAR_FORMAT[f];
      }
    }

    const checkboxToggle = new Setting(settingDiv)
      .setName('Checkbox')
      .setDesc('Use a checkbox for each event (will be a bullet otherwise)')
      .addToggle(toggle => toggle
        .setValue(this.format.checkbox || DEFAULT_CALENDAR_FORMAT.checkbox)
        .onChange(value => this.format.checkbox = value));

    const endTimeToggle = new Setting(settingDiv)
      .setName('End time')
      .setDesc('Include the event\'s end time')
      .addToggle(toggle => toggle
        .setValue(this.format.includeEventEndTime || DEFAULT_CALENDAR_FORMAT.includeEventEndTime)
        .onChange(value => this.format.includeEventEndTime = value));

    const icsNameToggle = new Setting(settingDiv)
      .setName('Calendar name')
      .setDesc('Include the calendar name')
      .addToggle(toggle => toggle
        .setValue(this.format.icsName || DEFAULT_CALENDAR_FORMAT.icsName)
        .onChange(value => this.format.icsName = value));

    const summaryToggle = new Setting(settingDiv)
      .setName('Summary')
      .setDesc('Include the summary field')
      .addToggle(toggle => toggle
        .setValue(this.format.summary || DEFAULT_CALENDAR_FORMAT.summary)
        .onChange(value => {
          this.format.summary = value;
        }));

    const locationToggle = new Setting(settingDiv)
      .setName('Location')
      .setDesc('Include the location field')
      .addToggle(toggle => toggle
        .setValue(this.format.location || DEFAULT_CALENDAR_FORMAT.location)
        .onChange(value => {
          this.format.location = value;
        }));

    const descriptionToggle = new Setting(settingDiv)
      .setName('Description')
      .setDesc('Include the description field ')
      .addToggle(toggle => toggle
        .setValue(this.format.description || DEFAULT_CALENDAR_FORMAT.description)
        .onChange(value => this.format.description = value));

    const showAttendeesToggle = new Setting(settingDiv)
      .setName('Show Attendees')
      .setDesc('Display attendees for the event')
      .addToggle(toggle => toggle
        .setValue(this.format.showAttendees || DEFAULT_CALENDAR_FORMAT.showAttendees)
        .onChange(value => {
          this.format.showAttendees = value;
        }));

    const showOngoingToggle = new Setting(settingDiv)
      .setName('Show Ongoing')
      .setDesc('Display multi-day events that include target date')
      .addToggle(toggle => toggle
        .setValue(this.format.showOngoing || DEFAULT_CALENDAR_FORMAT.showOngoing)
        .onChange(value => {
          this.format.showOngoing = value;
        }));

    let footerEl = contentEl.createDiv();
    let footerButtons = new Setting(footerEl);
    footerButtons.addButton((b) => {
      b.setTooltip("Save")
        .setIcon("checkmark")
        .onClick(async () => {
          this.saved = true;
          await this.plugin.saveSettings();
          this.close();
        });
      return b;
    });
    footerButtons.addExtraButton((b) => {
      b.setTooltip("Cancel")
        .setIcon("cross")
        .onClick(() => {
          this.saved = false;
          this.close();
        });
      return b;
    });
  }
  onOpen() {
    this.display();
  }

  static setValidationError(textInput: TextComponent, message?: string) {
    textInput.inputEl.addClass("is-invalid");
    if (message) {
      textInput.inputEl.parentElement.addClasses([
        "has-invalid-message",
        "unset-align-items"
      ]);
      textInput.inputEl.parentElement.parentElement.addClass(
        ".unset-align-items"
      );
      let mDiv = textInput.inputEl.parentElement.querySelector(
        ".invalid-feedback"
      ) as HTMLDivElement;

      if (!mDiv) {
        mDiv = createDiv({
          cls: "invalid-feedback"
        });
      }
      mDiv.innerText = message;
      mDiv.insertAfter(textInput.inputEl, null);
    }
  }
  static removeValidationError(textInput: TextComponent) {
    textInput.inputEl.removeClass("is-invalid");
    textInput.inputEl.parentElement.removeClasses([
      "has-invalid-message",
      "unset-align-items"
    ]);
    textInput.inputEl.parentElement.parentElement.removeClass(
      ".unset-align-items"
    );

    if (textInput.inputEl.parentElement.children[1]) {
      textInput.inputEl.parentElement.removeChild(
        textInput.inputEl.parentElement.children[1]
      );
    }
  }
}
