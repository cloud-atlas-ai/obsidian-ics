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
                  ownerEmail: modal.ownerEmail,
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

    const sortedCalendarKeys = Object.keys(this.plugin.data.calendars).sort();
    for (let calendarKey of sortedCalendarKeys) {
      const calendar = this.plugin.data.calendars[calendarKey];
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
                    ownerEmail: modal.ownerEmail,
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
  ownerEmail: string = "";

  saved: boolean = false;
  error: boolean = false;
  private hasChanges: boolean = false;

  format: {
    checkbox: boolean,
    includeEventEndTime: boolean,
    icsName: boolean,
    summary: boolean,
    location: boolean,
    description: boolean,
    showAttendees: boolean,
    showOngoing: boolean,
    showTransparentEvents: boolean,
  } = DEFAULT_CALENDAR_FORMAT;
  calendarType: string;
  constructor(app: App, plugin: ICSPlugin, setting?: Calendar) {
    super(app);
    this.plugin = plugin;
    if (setting) {
      this.icsName = setting.icsName;
      this.icsUrl = setting.icsUrl;
      this.ownerEmail = setting.ownerEmail;
      this.format = setting.format;
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

    const settingDiv = contentEl.createDiv({ cls: 'ics-settings' });

    let nameText: TextComponent;
    const nameSetting = new Setting(settingDiv)
      .setName("Calendar Name")
      .addText((text) => {
        nameText = text;
        nameText.setValue(this.icsName).onChange(async (v) => {
          this.icsName = v;
          this.hasChanges = true;
        });
      });

    const ownerEmailSetting = new Setting(settingDiv)
      .setName('Calendar Owner Email (Optional)')
      .setDesc('Used to skip declined events')
      .addText(text => {
        text.setValue(this.ownerEmail).onChange(value => {
          this.ownerEmail = value;
          this.hasChanges = true;
        });
      });

    const calendarTypeSetting = new Setting(settingDiv)
      .setName('Calendar Type')
      .setDesc('Select the type of calendar (Remote URL or Vault Folder with ICS files, maintained manually or via automation like vdirsyncer)')
      .addDropdown(dropdown => {
        dropdown.addOption('remote', 'Remote URL');
        dropdown.addOption('vdir', 'Folder with ICS files');
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
         .setDesc(this.calendarType === 'vdir' ? 'Select the folder containing ICS files. Must be in the current Obdidian Vault and have at least one ics.' : 'Enter the URL of the calendar')
        .setName(this.calendarType === 'vdir' ? 'Vault Folder' : 'Calendar URL');
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
            this.hasChanges = true;
          });
        });
      } else {
        // If remote, add a text input
        urlSetting.addText(text => {
          text.setValue(this.icsUrl).onChange(value => {
            this.icsUrl = value;
            this.hasChanges = true
          });
        });
      }
    };

    // Call updateUrlSetting initially
    updateUrlSetting();

    new Setting(settingDiv)
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
        .setValue(this.format.checkbox)
        .onChange(value => {
          this.format.checkbox = value
          this.hasChanges = true;
        }));

    const endTimeToggle = new Setting(settingDiv)
      .setName('End time')
      .setDesc('Include the event\'s end time')
      .addToggle(toggle => toggle
        .setValue(this.format.includeEventEndTime)
        .onChange(value => {
          this.format.includeEventEndTime = value;
          this.hasChanges = true;
        }));

    const icsNameToggle = new Setting(settingDiv)
      .setName('Calendar name')
      .setDesc('Include the calendar name')
      .addToggle(toggle => toggle
        .setValue(this.format.icsName)
        .onChange(value => {
          this.format.icsName = value
          this.hasChanges = true;
        }));

    const summaryToggle = new Setting(settingDiv)
      .setName('Summary')
      .setDesc('Include the summary field')
      .addToggle(toggle => toggle
        .setValue(this.format.summary)
        .onChange(value => {
          this.format.summary = value;
          this.hasChanges = true;
        }));

    const locationToggle = new Setting(settingDiv)
      .setName('Location')
      .setDesc('Include the location field')
      .addToggle(toggle => toggle
        .setValue(this.format.location)
        .onChange(value => {
          this.format.location = value;
          this.hasChanges = true;
        }));

    const descriptionToggle = new Setting(settingDiv)
      .setName('Description')
      .setDesc('Include the description field ')
      .addToggle(toggle => toggle
        .setValue(this.format.description)
        .onChange(value => {
          this.format.description = value
          this.hasChanges = true;
        }));

    const showAttendeesToggle = new Setting(settingDiv)
      .setName('Show Attendees')
      .setDesc('Display attendees for the event')
      .addToggle(toggle => toggle
        .setValue(this.format.showAttendees)
        .onChange(value => {
          this.format.showAttendees = value;
          this.hasChanges = true;
        }));

    const showOngoingToggle = new Setting(settingDiv)
      .setName('Show Ongoing')
      .setDesc('Display multi-day events that include target date')
      .addToggle(toggle => toggle
        .setValue(this.format.showOngoing)
        .onChange(value => {
          this.format.showOngoing = value;
          this.hasChanges = true;
        }));

    const includeAvailableEventsToggle = new Setting(settingDiv)
      .setName("Include 'Available' Events")
      .setDesc("Display events marked as 'Available' (do not block time) in the calendar. These are also referred to as 'Transparent' events.")
      .addToggle(toggle => toggle
        .setValue(this.format.showTransparentEvents)
        .onChange(value => {
          this.format.showTransparentEvents = value;
          this.hasChanges = true;
        }));

    let footerEl = contentEl.createDiv();
    let footerButtons = new Setting(footerEl);
    footerButtons.addButton((b) => {
      b.setTooltip("Save")
        .setIcon("save")
        .onClick(async () => {
          await this.plugin.saveSettings();
          this.saved = true;
          this.hasChanges = false;
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

  close() {
    if (this.hasChanges) {
      const confirmDiscard = confirm('You have unsaved changes. Are you sure you want to discard them?');
      if (!confirmDiscard) {
        return; // Prevent the modal from closing
      }
      this.plugin.loadSettings();
    }
    super.close();
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
