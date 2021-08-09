import ICS from "main";
import { App, PluginSettingTab, Setting } from "obsidian"

export default class ICSSettingsTab extends PluginSettingTab {
	plugin: ICS

	constructor(app: App, plugin: ICS) {
		super(app, plugin)
		this.plugin = plugin
	}

	display() {
		let { containerEl } = this;

		containerEl.empty();
		containerEl.createEl('h2', { text: 'Settings for ICS' });
		new Setting(containerEl)
			.setName('.ics file URL')
			.setDesc('URL to ics')
			.addText((text) => {
				text
					.setPlaceholder('URL')
					.setValue(this.plugin.settings.icsUrl)
					.onChange(async (value) => {
						this.plugin.settings.icsUrl = value
						await this.plugin.saveSettings();
					})
			});
	}
}