import ICSPlugin from "../main";
import {
	PluginSettingTab,
	Setting,
	App,
	ButtonComponent,
	Modal,
	TextComponent,
	MarkdownRenderer,
	ToggleComponent,
	TextAreaComponent,
} from "obsidian";

import {
	Calendar
} from "./ICSSettings";

export function getCalendarElement(
	icsName: string,
	icsUrl: string,
): HTMLElement {
	let calendarElement, titleEl;
	calendarElement = createDiv({
		cls: `calendar calendar-${icsName}`,
	});
	titleEl = calendarElement.createEl("summary", {
		cls: `calendar-name ${icsName}`
	});

	//get markdown
	const markdownHolder = createDiv();
	MarkdownRenderer.renderMarkdown(icsName, markdownHolder, "", null);

	const calendarTitleContent = createDiv();
	markdownHolder.children[0]?.tagName === "P" ?
	createDiv() :
	markdownHolder.children[0];

	//get children of markdown element, then remove them
	const markdownElements = Array.from(
		markdownHolder.children[0]?.childNodes || []
	);
	calendarTitleContent.innerHTML = "";
	calendarTitleContent.addClass("calendar-title-content");

	//add markdown children back
	const calendarTitleMarkdown = calendarTitleContent.createDiv(
		"calendar-title-markdown"
	);
	for (let i = 0; i < markdownElements.length; i++) {
		calendarTitleMarkdown.appendChild(markdownElements[i]);
	}
	titleEl.appendChild(calendarTitleContent || createDiv());

	return calendarElement;
}

export default class ICSSettingsTab extends PluginSettingTab {
	plugin: ICSPlugin;

	constructor(app: App, plugin: ICSPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	async display(): Promise < void > {
		let {
			containerEl
		} = this;

		containerEl.empty();
		containerEl.addClass("ics-settings")
		containerEl.createEl("h2", {
			text: "ICS Settings"
		});

		const calendarContainer = containerEl.createDiv(
			"ics-setting-calendar"
		);
		new Setting(calendarContainer)
		.setName("Add New")
		.setDesc("Add a new Calendar.")
		.addButton((button: ButtonComponent): ButtonComponent => {
			let b = button
				.setTooltip("Add Additional")
				.setButtonText("+")
				.onClick(async () => {
					let modal = new SettingsModal(this.app);

					modal.onClose = async () => {
						if (modal.saved) {
							this.plugin.addCalendar({
								icsName: modal.icsName,
								icsUrl: modal.icsUrl
							});
							this.display();
						}
					};

					modal.open();
				});

			return b;
		});

		const additional = calendarContainer.createDiv("calendar");
		for (let a in this.plugin.settings.calendars) {
			const calendar = this.plugin.settings.calendars[a];

			let setting = new Setting(additional);

			let calEl = await getCalendarElement(
				calendar.icsName,
				calendar.icsUrl
			);
			setting.infoEl.replaceWith(calEl);

			setting
				.addExtraButton((b) => {
					b.setIcon("pencil")
						.setTooltip("Edit")
						.onClick(() => {
							let modal = new SettingsModal(this.app, calendar);

							modal.onClose = async () => {
								if (modal.saved) {
									this.plugin.removeCalendar(calendar);
									this.plugin.addCalendar({
										icsName: modal.icsName,
										icsUrl: modal.icsUrl
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

		

		new Setting(calendarContainer)
		.setHeading()
		.setName("Settings");

		new Setting(calendarContainer)
		.setName("Add end tags")
		.addToggle((toggle:ToggleComponent)=>{
			toggle.setValue(this.plugin.settings.addEnd)
			toggle.onChange((value)=>{
				this.plugin.settings.addEnd = value;
				this.plugin.saveSettings();
			})
		});

		new Setting(calendarContainer)
		.setName("Ignore events")
		.addTextArea((textArea: TextAreaComponent)=>{
			textArea.setValue(this.plugin.settings.ignoreEvents.join(','))
			textArea.onChange((value)=>{
				this.plugin.settings.ignoreEvents = value.split(',').map((a)=>a.trim());
				this.plugin.saveSettings();
			});
			
		});
	}
}

class SettingsModal extends Modal {
	icsName: string = "";
	icsUrl: string = "";

	saved: boolean = false;
	error: boolean = false;
	constructor(app: App, setting ? : Calendar) {
		super(app);
		if (setting) {
			this.icsName = setting.icsName;
			this.icsUrl = setting.icsUrl;
		}
	}

	async display() {
		let {
			contentEl
		} = this;

		contentEl.empty();

		const settingDiv = contentEl.createDiv();

		let calendarPreview = await getCalendarElement(
			this.icsName,
			this.icsUrl,
		);

		contentEl.appendChild(calendarPreview);
		let nameText: TextComponent;
		const nameSetting = new Setting(settingDiv)
			.setName("Calendar Name")

			.addText((text) => {
				nameText = text;
				nameText.setValue(this.icsName).onChange((v) => {
					this.icsName = v;
				});
			});

		let urlText: TextComponent;
		const urlSetting = new Setting(settingDiv)
			.setName("Calendar URL")

			.addText((text) => {
				urlText = text;
				urlText.setValue(this.icsUrl).onChange((v) => {
					this.icsUrl = v;
				});
			});

		let footerEl = contentEl.createDiv();
		let footerButtons = new Setting(footerEl);
		footerButtons.addButton((b) => {
			b.setTooltip("Save")
				.setIcon("checkmark")
				.onClick(async () => {
					this.saved = true;
					this.close();
				});
			return b;
		});
		footerButtons.addExtraButton((b) => {
			b.setIcon("cross")
				.setTooltip("Cancel")
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

	static setValidationError(textInput: TextComponent, message ? : string) {
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
			mDiv.insertAfter(textInput.inputEl);
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