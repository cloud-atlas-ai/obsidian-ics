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
  DEFAULT_CALENDAR_FORMAT,
  FieldExtractionPattern,
  DEFAULT_FIELD_EXTRACTION_PATTERNS
} from "./ICSSettings";
// eslint-disable-next-line @typescript-eslint/no-require-imports
import moment = require("moment");

export function getCalendarElement(
  icsName: string): HTMLElement {

  const calendarElement = createDiv({
    cls: `calendar calendar-${icsName}`,
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const titleEl = calendarElement.createEl("summary", {
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

  private displayFieldExtractionPatterns(containerEl: HTMLElement) {
    const patternsContainer = containerEl.createDiv("field-extraction-patterns");

    // Ensure patterns exist, use defaults if not
    if (!this.plugin.data.fieldExtraction?.patterns) {
      if (!this.plugin.data.fieldExtraction) {
        this.plugin.data.fieldExtraction = {
          enabled: true,
          patterns: DEFAULT_FIELD_EXTRACTION_PATTERNS
        };
      } else {
        this.plugin.data.fieldExtraction.patterns = DEFAULT_FIELD_EXTRACTION_PATTERNS;
      }
    }

    const patterns = this.plugin.data.fieldExtraction.patterns;

    // Add field section management
    new Setting(patternsContainer)
      .setName("Add new")
      .setDesc("Add a new field section")
      .addButton((button: ButtonComponent): ButtonComponent => {
        const b = button
          .setTooltip("Add Additional")
          .setButtonText("+")
          .onClick(async () => {
            const modal = new FieldSectionModal(this.app, this.plugin);
            modal.onClose = async () => {
              if (modal.saved) {
                // Refresh display to show new section
                this.display();
              }
            };
            modal.open();
          });

        return b;
      });

    // Group patterns by field name and display them as manageable sections
    const sortedPatterns = [...patterns].sort((a, b) => a.priority - b.priority);
    const groupedPatterns = new Map<string, FieldExtractionPattern[]>();

    // Group patterns by extracted field name
    sortedPatterns.forEach(pattern => {
      const fieldName = pattern.extractedFieldName;
      if (!groupedPatterns.has(fieldName)) {
        groupedPatterns.set(fieldName, []);
      }
      groupedPatterns.get(fieldName)!.push(pattern);
    });

    // Display each field section
    for (const [fieldName, fieldPatterns] of groupedPatterns) {
      // Field section header with management buttons
      const fieldHeader = new Setting(patternsContainer)
        .setName(`${fieldName} (${fieldPatterns.length} pattern${fieldPatterns.length === 1 ? '' : 's'})`)
        .setClass('field-section-header')
        .addExtraButton((b) => {
          b.setIcon("plus")
            .setTooltip("Add Pattern to this Field")
            .onClick(async () => {
              const modal = new FieldExtractionPatternModal(this.app, this.plugin, undefined, fieldName);
              modal.onClose = async () => {
                if (modal.saved) {
                  patterns.push(modal.pattern);
                  await this.plugin.saveSettings();
                  this.display();
                }
              };
              modal.open();
            });
        })
        .addExtraButton((b) => {
          b.setIcon("pencil")
            .setTooltip("Edit Field Name")
            .onClick(async () => {
              const modal = new FieldSectionModal(this.app, this.plugin, fieldName);
              modal.onClose = async () => {
                if (modal.saved && modal.fieldName !== fieldName) {
                  // Update all patterns in this field to use the new field name
                  fieldPatterns.forEach(pattern => {
                    pattern.extractedFieldName = modal.fieldName;
                  });
                  await this.plugin.saveSettings();
                  this.display();
                }
              };
              modal.open();
            });
        })
        .addExtraButton((b) => {
          b.setIcon("trash")
            .setTooltip("Delete Field Section")
            .onClick(async () => {
              const confirmed = confirm(`Are you sure you want to delete the "${fieldName}" field section? This will remove all ${fieldPatterns.length} pattern(s) in this section.`);
              if (confirmed) {
                // Remove all patterns in this field section
                fieldPatterns.forEach(pattern => {
                  const patternIndex = patterns.findIndex(p => p === pattern);
                  if (patternIndex !== -1) {
                    patterns.splice(patternIndex, 1);
                  }
                });
                await this.plugin.saveSettings();
                this.display();
              }
            });
        });

      // Display patterns in this field section
      fieldPatterns.forEach((pattern, fieldIndex) => {
        const globalIndex = sortedPatterns.findIndex(p => p === pattern);
        const setting = new Setting(patternsContainer);

        setting.setName(pattern.name)
          .setDesc(`${pattern.matchType === 'regex' ? 'Regex' : 'Contains'}: ${pattern.pattern} (Priority: ${pattern.priority})`)
          .addExtraButton((b) => {
            b.setIcon("chevron-up")
              .setTooltip("Move Up (Higher Priority)")
              .setDisabled(globalIndex === 0)
              .onClick(async () => {
                if (globalIndex > 0) {
                  // Swap priorities with the previous pattern in global order
                  const prevPattern = sortedPatterns[globalIndex - 1];
                  const currentPriority = pattern.priority;
                  pattern.priority = prevPattern.priority;
                  prevPattern.priority = currentPriority;
                  await this.plugin.saveSettings();
                  this.display();
                }
              });
          })
          .addExtraButton((b) => {
            b.setIcon("chevron-down")
              .setTooltip("Move Down (Lower Priority)")
              .setDisabled(globalIndex === sortedPatterns.length - 1)
              .onClick(async () => {
                if (globalIndex < sortedPatterns.length - 1) {
                  // Swap priorities with the next pattern in global order
                  const nextPattern = sortedPatterns[globalIndex + 1];
                  const currentPriority = pattern.priority;
                  pattern.priority = nextPattern.priority;
                  nextPattern.priority = currentPriority;
                  await this.plugin.saveSettings();
                  this.display();
                }
              });
          })
          .addExtraButton((b) => {
            b.setIcon("pencil")
              .setTooltip("Edit")
              .onClick(() => {
                const modal = new FieldExtractionPatternModal(this.app, this.plugin, pattern);
                modal.onClose = async () => {
                  if (modal.saved) {
                    const originalIndex = patterns.findIndex(p => p === pattern);
                    if (originalIndex !== -1) {
                      patterns[originalIndex] = modal.pattern;
                      await this.plugin.saveSettings();
                      this.display();
                    }
                  }
                };
                modal.open();
              });
          })
          .addExtraButton((b) => {
            b.setIcon("trash")
              .setTooltip("Delete")
              .onClick(async () => {
                const patternIndex = patterns.findIndex(p => p === pattern);
                if (patternIndex !== -1) {
                  patterns.splice(patternIndex, 1);
                  await this.plugin.saveSettings();
                  this.display();
                }
              });
          });
      });
    }
  }

  private displayFieldExtractionReset(containerEl: HTMLElement) {
    // Reset to defaults button - positioned outside patterns to show it affects all patterns
    new Setting(containerEl)
      .setName("Reset to Defaults")
      .setDesc("Reset all field extraction patterns to default video call providers")
      .addButton((button: ButtonComponent): ButtonComponent => {
        return button
          .setButtonText("Reset All")
          .setWarning()
          .onClick(async () => {
            const confirmed = confirm("Are you sure you want to reset all field extraction patterns to defaults? This will delete all your custom patterns and cannot be undone.");
            if (confirmed) {
              this.plugin.data.fieldExtraction.patterns = [...DEFAULT_FIELD_EXTRACTION_PATTERNS];
              await this.plugin.saveSettings();
              this.display();
            }
          });
      });
  }

  private dataViewSyntaxDescription(): DocumentFragment {
    const descEl = document.createDocumentFragment();
    descEl.appendText('Enable this option if you use the DataView plugin to query event start and end times.');
    return descEl;
  }

  display(): void {
    const {
      containerEl
    } = this;

    containerEl.empty();

    // Calendars Section
    this.displayCalendarsSection(containerEl);

    // Output Format Section
    this.displayFormatSection(containerEl);

    // Field Extraction Section
    this.displayFieldExtractionSection(containerEl);

    // Sponsor link - Thank you!
    const divSponsor = containerEl.createDiv();
    divSponsor.innerHTML = `<br/><hr/>A scratch my own itch project by <a href="https://muness.com/" target='_blank'>muness</a>.<br/>
			<a href='https://www.buymeacoffee.com/muness' target='_blank'><img height="36" src='https://cdn.buymeacoffee.com/uploads/profile_pictures/default/79D6B5/MC.png' border='0' alt='Buy Me a Book' /></a>
		`
  }


  private displayCalendarsSection(containerEl: HTMLElement): void {
    // Section heading
    new Setting(containerEl)
      .setHeading()
      .setName("Calendars");

    const calendarContainer = containerEl.createDiv(
      "ics-setting-calendar"
    );

    new Setting(calendarContainer)
      .setName("Add new")
      .setDesc("Add a new calendar")
      .addButton((button: ButtonComponent): ButtonComponent => {
        const b = button
          .setTooltip("Add Additional")
          .setButtonText("+")
          .onClick(async () => {
            const modal = new SettingsModal(this.app, this.plugin);

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
    for (const calendarKey of sortedCalendarKeys) {
      const calendar = this.plugin.data.calendars[calendarKey];
      const setting = new Setting(additional);

      const calEl = getCalendarElement(
        calendar.icsName);
      setting.infoEl.replaceWith(calEl);

      setting
        .addExtraButton((b) => {
          b.setIcon("pencil")
            .setTooltip("Edit")
            .onClick(() => {
              const modal = new SettingsModal(this.app, this.plugin, calendar);

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
  }

  private displayFormatSection(containerEl: HTMLElement): void {
    // Section heading
    new Setting(containerEl)
      .setHeading()
      .setName("Output Format");

    let timeFormat: TextComponent;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const dataViewSyntaxSetting = new Setting(containerEl)
      .setName('DataView Metadata syntax for start and end times')
      .setDesc(this.dataViewSyntaxDescription())
      .addToggle(toggle => toggle
        .setValue(this.plugin.data.format.dataViewSyntax || false)
        .onChange(async (v) => {
          this.plugin.data.format.dataViewSyntax = v;
          await this.plugin.saveSettings();
        }));
  }

  private displayFieldExtractionSection(containerEl: HTMLElement): void {
    // Section heading
    new Setting(containerEl)
      .setHeading()
      .setName("Field Extraction");

    // Enable/disable toggle
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fieldExtractionEnabledSetting = new Setting(containerEl)
      .setName('Enable Field Extraction')
      .setDesc('Extract custom fields from calendar events using patterns')
      .addToggle(toggle => toggle
        .setValue(this.plugin.data.fieldExtraction?.enabled ?? true)
        .onChange(async (v) => {
          if (!this.plugin.data.fieldExtraction) {
            this.plugin.data.fieldExtraction = {
              enabled: v,
              patterns: DEFAULT_FIELD_EXTRACTION_PATTERNS
            };
          } else {
            this.plugin.data.fieldExtraction.enabled = v;
          }
          await this.plugin.saveSettings();
          this.display(); // Refresh to show/hide patterns section
        }));

    // Only show patterns section and related UI if enabled
    if (this.plugin.data.fieldExtraction?.enabled !== false) {
      // Add Templater example button
      new Setting(containerEl)
        .setName("Templater Example")
        .setDesc("Show example code for using extracted fields with Templater")
        .addButton((button: ButtonComponent): ButtonComponent => {
          return button
            .setButtonText("Show Example")
            .setIcon("code")
            .onClick(() => {
              const modal = new TemplaterExampleModal(this.app, this.plugin);
              modal.open();
            });
        });

      // Add some whitespace below the usage area
      containerEl.createDiv().style.marginBottom = '20px';

      this.displayFieldExtractionPatterns(containerEl);

      // Add visual separation and reset button
      containerEl.createDiv().style.marginTop = '20px';
      this.displayFieldExtractionReset(containerEl);
    }
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
    const {
      contentEl
    } = this;

    contentEl.empty();

    const settingDiv = contentEl.createDiv({ cls: 'ics-settings' });

    let nameText: TextComponent;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const nameSetting = new Setting(settingDiv)
      .setName("Calendar Name")
      .addText((text) => {
        nameText = text;
        nameText.setValue(this.icsName).onChange(async (v) => {
          this.icsName = v;
          this.hasChanges = true;
        });
      });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const ownerEmailSetting = new Setting(settingDiv)
      .setName('Calendar Owner Email (Optional)')
      .setDesc('Used to skip declined events')
      .addText(text => {
        text.setValue(this.ownerEmail).onChange(value => {
          this.ownerEmail = value;
          this.hasChanges = true;
        });
      });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

      const urlSetting = new Setting(urlSettingDiv)
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
    for (const f in DEFAULT_CALENDAR_FORMAT) {
      if (this.format[f] == undefined) {
        this.format[f] = DEFAULT_CALENDAR_FORMAT[f];
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const checkboxToggle = new Setting(settingDiv)
      .setName('Checkbox')
      .setDesc('Use a checkbox for each event (will be a bullet otherwise)')
      .addToggle(toggle => toggle
        .setValue(this.format.checkbox)
        .onChange(value => {
          this.format.checkbox = value
          this.hasChanges = true;
        }));

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const endTimeToggle = new Setting(settingDiv)
      .setName('End time')
      .setDesc('Include the event\'s end time')
      .addToggle(toggle => toggle
        .setValue(this.format.includeEventEndTime)
        .onChange(value => {
          this.format.includeEventEndTime = value;
          this.hasChanges = true;
        }));

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const icsNameToggle = new Setting(settingDiv)
      .setName('Calendar name')
      .setDesc('Include the calendar name')
      .addToggle(toggle => toggle
        .setValue(this.format.icsName)
        .onChange(value => {
          this.format.icsName = value
          this.hasChanges = true;
        }));

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const summaryToggle = new Setting(settingDiv)
      .setName('Summary')
      .setDesc('Include the summary field')
      .addToggle(toggle => toggle
        .setValue(this.format.summary)
        .onChange(value => {
          this.format.summary = value;
          this.hasChanges = true;
        }));

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const locationToggle = new Setting(settingDiv)
      .setName('Location')
      .setDesc('Include the location field')
      .addToggle(toggle => toggle
        .setValue(this.format.location)
        .onChange(value => {
          this.format.location = value;
          this.hasChanges = true;
        }));

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const descriptionToggle = new Setting(settingDiv)
      .setName('Description')
      .setDesc('Include the description field ')
      .addToggle(toggle => toggle
        .setValue(this.format.description)
        .onChange(value => {
          this.format.description = value
          this.hasChanges = true;
        }));

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const showAttendeesToggle = new Setting(settingDiv)
      .setName('Show Attendees')
      .setDesc('Display attendees for the event')
      .addToggle(toggle => toggle
        .setValue(this.format.showAttendees)
        .onChange(value => {
          this.format.showAttendees = value;
          this.hasChanges = true;
        }));

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const showOngoingToggle = new Setting(settingDiv)
      .setName('Show Ongoing')
      .setDesc('Display multi-day events that include target date')
      .addToggle(toggle => toggle
        .setValue(this.format.showOngoing)
        .onChange(value => {
          this.format.showOngoing = value;
          this.hasChanges = true;
        }));

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const includeAvailableEventsToggle = new Setting(settingDiv)
      .setName("Include 'Available' Events")
      .setDesc("Display events marked as 'Available' (do not block time) in the calendar. These are also referred to as 'Transparent' events.")
      .addToggle(toggle => toggle
        .setValue(this.format.showTransparentEvents)
        .onChange(value => {
          this.format.showTransparentEvents = value;
          this.hasChanges = true;
        }));

    const footerEl = contentEl.createDiv();
    const footerButtons = new Setting(footerEl);
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

class FieldExtractionPatternModal extends Modal {
  plugin: ICSPlugin;
  pattern: FieldExtractionPattern;
  saved: boolean = false;
  private hasChanges: boolean = false;

  constructor(app: App, plugin: ICSPlugin, pattern?: FieldExtractionPattern, defaultFieldName?: string) {
    super(app);
    this.plugin = plugin;

    if (pattern) {
      // Editing existing pattern
      this.pattern = { ...pattern };
    } else {
      // Creating new pattern
      const maxPriority = Math.max(...(this.plugin.data.fieldExtraction?.patterns.map(p => p.priority) || [0]));
      this.pattern = {
        name: "",
        pattern: "",
        matchType: "contains",
        priority: maxPriority + 1,
        extractedFieldName: defaultFieldName || "Video Call URLs"
      };
    }
  }

  display() {
    const { contentEl } = this;
    contentEl.empty();

    const settingDiv = contentEl.createDiv({ cls: 'video-call-pattern-settings' });

    // Add Esc key handling to close modal
    contentEl.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    });

    // Pattern name
    let nameText: TextComponent;
    new Setting(settingDiv)
      .setName("Pattern Name")
      .setDesc("Descriptive name for this pattern")
      .addText((text) => {
        nameText = text;
        nameText.setValue(this.pattern.name).onChange((v) => {
          this.pattern.name = v;
          this.hasChanges = true;
        });
      });


    // Match type
    new Setting(settingDiv)
      .setName("Match Type")
      .setDesc("How to match the pattern")
      .addDropdown(dropdown => {
        dropdown.addOption('contains', 'Contains');
        dropdown.addOption('regex', 'Regular Expression');
        dropdown.setValue(this.pattern.matchType)
          .onChange(value => {
            this.pattern.matchType = value as 'regex' | 'contains';
            this.hasChanges = true;
          });
      });

    // Pattern
    let patternText: TextComponent;
    new Setting(settingDiv)
      .setName("Pattern")
      .setDesc("The text or regex pattern to match in event location/description")
      .addText((text) => {
        patternText = text;
        patternText.setValue(this.pattern.pattern).onChange((v) => {
          this.pattern.pattern = v;
          this.hasChanges = true;
          this.validatePattern(patternText);
        });
      });

    // Priority
    let priorityText: TextComponent;
    new Setting(settingDiv)
      .setName("Priority")
      .setDesc("Lower numbers have higher priority (checked first)")
      .addText((text) => {
        priorityText = text;
        priorityText.setValue(this.pattern.priority.toString()).onChange((v) => {
          const priority = parseInt(v);
          if (!isNaN(priority)) {
            this.pattern.priority = priority;
            this.hasChanges = true;
          }
        });
        priorityText.inputEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (this.validateForm()) {
              this.saved = true;
              this.hasChanges = false;
              this.close();
            }
          }
        });
      });

    // Footer buttons
    const footerEl = contentEl.createDiv();
    const footerButtons = new Setting(footerEl);
    footerButtons.addButton((b) => {
      b.setTooltip("Save")
        .setIcon("save")
        .onClick(async () => {
          if (this.validateForm()) {
            this.saved = true;
            this.hasChanges = false;
            this.close();
          }
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

  private validatePattern(textInput: TextComponent): boolean {
    if (this.pattern.matchType === 'regex') {
      try {
        new RegExp(this.pattern.pattern);
        SettingsModal.removeValidationError(textInput);
        return true;
      } catch {
        SettingsModal.setValidationError(textInput, "Invalid regular expression");
        return false;
      }
    }
    SettingsModal.removeValidationError(textInput);
    return true;
  }

  private validateForm(): boolean {
    if (!this.pattern.name.trim()) {
      return false;
    }
    if (!this.pattern.pattern.trim()) {
      return false;
    }
    if (this.pattern.matchType === 'regex') {
      try {
        new RegExp(this.pattern.pattern);
      } catch {
        return false;
      }
    }
    return true;
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
    }
    super.close();
  }
}

class FieldSectionModal extends Modal {
  plugin: ICSPlugin;
  fieldName: string = "";
  saved: boolean = false;
  private hasChanges: boolean = false;
  private isEditing: boolean = false;
  private originalFieldName: string = "";

  constructor(app: App, plugin: ICSPlugin, existingFieldName?: string) {
    super(app);
    this.plugin = plugin;

    if (existingFieldName) {
      this.isEditing = true;
      this.fieldName = existingFieldName;
      this.originalFieldName = existingFieldName;
    }
  }

  display() {
    const { contentEl } = this;
    contentEl.empty();

    // Add Esc key handling to close modal
    contentEl.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    });

    // Modal title at the top
    const titleEl = contentEl.createEl('h3', { cls: 'modal-title' });
    titleEl.textContent = this.isEditing ? 'Edit Field Section' : 'Create Field Section';

    const settingDiv = contentEl.createDiv({ cls: 'field-section-settings' });

    // Field name input
    let fieldNameText: TextComponent;
    new Setting(settingDiv)
      .setName("Field Name")
      .setDesc(this.isEditing
        ? `Rename this field section. All patterns will be updated to use the new name.`
        : "Name for the field section (e.g., 'Phone Numbers', 'Meeting IDs', 'Video Call URLs').")
      .addText((text) => {
        fieldNameText = text;
        fieldNameText.setValue(this.fieldName).onChange((v) => {
          this.fieldName = v;
          this.hasChanges = true;
        });
      });

    // Add backward compatibility tip
    const tipEl = settingDiv.createDiv('field-name-tip');
    tipEl.innerHTML = `
      <p><strong>💡 Backward Compatibility Tip:</strong> The field name "Video Call URLs" automatically populates the legacy <code>callUrl</code> and <code>callType</code> properties for existing templates.</p>
      <p>For new templates, use <code>event.extractedFields["Field Names"]</code> to access any field's extracted data.</p>
    `;

    // Footer buttons
    const footerEl = contentEl.createDiv();
    const footerButtons = new Setting(footerEl);
    footerButtons.addButton((b) => {
      const buttonText = this.isEditing ? "Save Changes" : "Create Section";
      const buttonIcon = this.isEditing ? "check" : "plus";

      b.setTooltip(buttonText)
        .setIcon(buttonIcon)
        .onClick(async () => {
          if (this.validateForm()) {
            if (this.isEditing) {
              // Just save - the calling code will handle updating patterns
              this.saved = true;
              this.hasChanges = false;
              this.close();
            } else {
              // Create a default pattern for this field section
              const maxPriority = Math.max(...(this.plugin.data.fieldExtraction?.patterns.map(p => p.priority) || [0]));
              const defaultPattern: FieldExtractionPattern = {
                name: `${this.fieldName} Pattern`,
                pattern: "",
                matchType: "contains",
                priority: maxPriority + 1,
                extractedFieldName: this.fieldName
              };

              this.plugin.data.fieldExtraction.patterns.push(defaultPattern);
              await this.plugin.saveSettings();

              this.saved = true;
              this.hasChanges = false;
              this.close();
            }
          }
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

  private validateForm(): boolean {
    if (!this.fieldName.trim()) {
      return false;
    }
    return true;
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
    }
    super.close();
  }
}

class TemplaterExampleModal extends Modal {
  plugin: ICSPlugin;

  constructor(app: App, plugin: ICSPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    this.display();
  }

  display() {
    const { contentEl } = this;
    contentEl.empty();

    // Modal title
    const titleEl = contentEl.createEl('h3', { cls: 'modal-title' });
    titleEl.textContent = 'Templater Example';

    const settingDiv = contentEl.createDiv({ cls: 'field-section-settings' });

    // Get unique field names from patterns
    const patterns = this.plugin.data.fieldExtraction?.patterns || [];
    const fieldNames = [...new Set(patterns.map(p => p.extractedFieldName))].filter(Boolean);

    // Generate dynamic Templater code based on user's configured fields
    const extractedFieldsCode = fieldNames.length > 0
      ? fieldNames.map(fieldName => `    const ${this.camelCase(fieldName)} = event.extractedFields["${fieldName}"] || [];`).join('\n')
      : '    // No custom fields configured yet - add field sections to see them here';

    const fieldDisplayCode = fieldNames.length > 0
      ? fieldNames.map(fieldName => {
          const camelCased = this.camelCase(fieldName);
          return `    if (${camelCased}.length > 0) {
        tR += \`    - ${fieldName}:: \${${camelCased}.join(", ")}\\n\`;
    }`;
        }).join('\n')
      : '    // Field display code will appear here when you add field sections';

    const templaterCode = `<%*
const events = await app.plugins.getPlugin('ics').getEvents(moment(tp.file.title,"YYYY-MM-DD"));
events.sort((a, b) => a.utime - b.utime).forEach((event) => {
    const { time, endTime, summary, icsName, callUrl, callType, location, attendees, description } = event;

    // Extract custom fields
${extractedFieldsCode}

    // Format attendees
    const attendeeList = attendees ? attendees.map(attendee => \`[\${attendee.name}](mailto:\${attendee.email})\`).join(", ") : '';

    // Main event line
    tR += \`- [ ] \${time}-\${endTime} **\${summary}** \${icsName}\\n\`;

    // Add extracted fields as indented metadata
${fieldDisplayCode}

    // Add attendees if present
    if (attendeeList) {
        tR += \`    - Attendees:: \${attendeeList}\\n\`;
    }
});
%>`;

    // Description
    new Setting(settingDiv)
      .setName("How to use with Templater")
      .setDesc(`This example shows how to use extracted fields in your Templater templates. ${fieldNames.length > 0 ? `Based on your current field sections: ${fieldNames.join(', ')}` : 'Add field sections to see them reflected in the code below.'}`);

    // Code display area
    const codeContainer = settingDiv.createDiv('compatibility-note');
    const codeEl = codeContainer.createEl('pre');
    codeEl.style.whiteSpace = 'pre-wrap';
    codeEl.style.fontFamily = 'var(--font-monospace)';
    codeEl.style.fontSize = '0.9em';
    codeEl.style.maxHeight = '400px';
    codeEl.style.overflow = 'auto';
    codeEl.textContent = templaterCode;

    // Copy button
    new Setting(settingDiv)
      .addButton((button: ButtonComponent): ButtonComponent => {
        return button
          .setButtonText("Copy to Clipboard")
          .setIcon("copy")
          .onClick(async () => {
            await navigator.clipboard.writeText(templaterCode);
            button.setButtonText("Copied!");
            setTimeout(() => {
              button.setButtonText("Copy to Clipboard");
            }, 2000);
          });
      });

    // Usage note
    const usageNote = settingDiv.createDiv('field-name-tip');
    usageNote.innerHTML = `
      <p><strong>💡 Usage:</strong> Copy this code into your Templater template file. It will automatically use any field sections you've configured.</p>
    `;

    // Close button
    new Setting(settingDiv)
      .addButton((button: ButtonComponent): ButtonComponent => {
        return button
          .setButtonText("Close")
          .onClick(() => this.close());
      });
  }

  private camelCase(str: string): string {
    return str
      .replace(/\s+/g, '') // Remove spaces
      .replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
      .replace(/^./, c => c.toLowerCase()); // Make first letter lowercase
  }
}
