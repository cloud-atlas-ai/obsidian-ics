import {
	App,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting
} from 'obsidian';

const ical = require('ical');

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		console.log('loading ical plugin');

		await this.loadSettings();

		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {
		console.log('unloading ical plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let {
			containerEl
		} = this;

		containerEl.empty();

		containerEl.createEl('h2', {
			text: 'Settings for my awesome plugin.'
		});

		new Setting(containerEl)
			.setName('iCal #1')
			.setDesc('iCal URL')
			.addText(text => text
				.setPlaceholder('Enter your URL')
				.setValue('')
				.onChange(async (value) => {
					console.log('ical: ' + value);

					//Because of CORS you can't fetch the site directly
					var corsed = `https://api.allorigins.win/get?url=${encodeURIComponent(value)}`;

					var responseJson = await fetch(corsed)
						.then((response) => {
							return response.text();
						});

					
					var icalText = JSON.parse(responseJson).contents;

					var data = ical.parseICS(icalText);

					for (let k in data) {
						if (data.hasOwnProperty(k)) {
							var ev = data[k];
							if (data[k].type == 'VEVENT') {
								console.log(`${ev.summary} is in ${ev.location} on ${ev.start}`);
							}
						}
					}

					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();

				}));
	}
}