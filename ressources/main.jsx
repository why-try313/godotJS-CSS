import Lib from "../main/ClassesLib.js";
const File = new godot.File();
const CSS  = godot.load("res://addons/godotJS-CSS/main/CSS.jsx");
const ICON = godot.load("res://addons/godotJS-CSS/icons/icon16.png");

let FILES = {};
const REFRESH_SEC = 1;

let IS_EDITOR   = godot.Engine.editor_hint;
let IS_WATCHED  = false;
let LAST_UPDATE = 0;

export default class Main extends godot.EditorPlugin {


	constructor() {
	}

	_ready() {
		this.toggleWatch = this.toggleWatch.bind(this);
		this.toggleCustomType = this.toggleCustomType.bind(this);
	}

	_enter_tree() {
		this.toggleCustomType(true);
		this.toggleWatch(true);
	}

	scan() {
		let hasChanges = [];
		let hasMissing = [];
		// Should always be one as css/style.css is included
		Object.keys(FILES).forEach((file) => {
			if (!File.file_exists(file)) { hasMissing.push(file); }
			else if (File.get_modified_time(file) !== FILES[file]) { hasChanges.push(file); FILES[file] = File.get_modified_time(file); }
		});

		if (hasMissing.length > 0) {
			console.log(`Reloading after ${ hasChanges.join(', ') } removed`);
			IS_WATCHED = false;
			this.toggleWatch(true);
		} else if (hasChanges.length > 0) {
			console.log(`Reloading after ${ hasChanges.join(', ') } changes`);
			Lib.getMainCSSFile();
		}
	}

	toggleCustomType(active) {
		if (active) { this.add_custom_type("Div", "Panel", CSS, ICON); }
		else { this.remove_custom_type("Div") }
	}

	toggleWatch(active) {
		const fileSystem  = this.get_editor_interface().get_resource_filesystem();
		const isConnected = fileSystem.is_connected("sources_changed", this, "toggleWatch");
		if (!active) {
			if (isConnected) {
	    		fileSystem.disconnect("sources_changed", this, "on_sources_changed")
			}
			IS_EDITOR  = false;
			IS_WATCHED = false;
			return false;
		}

		if (!IS_EDITOR) { return false; }
		const hasStyleCss = File.file_exists("res://css/style.css");
		if (hasStyleCss) {
			if (!IS_WATCHED) {
				Lib.getMainCSSFile();
				const files = {};
				Lib.files.forEach((file) => { files[ file ] = File.get_modified_time(file); });
				FILES = files;
				IS_WATCHED = true;
			}
		} else {
			if (!isConnected) {
				fileSystem.connect("sources_changed", this, "toggleWatch");
			}
			IS_WATCHED = false;
		}
	}

	_exit_tree() {
		this.toggleWatch(false);
		this.toggleCustomType(false);
	}

	_process(delta) {
		if (!IS_WATCHED) return;
		if (LAST_UPDATE >= REFRESH_SEC) {
			this.scan();
			LAST_UPDATE = 0;
		} else {
			LAST_UPDATE = LAST_UPDATE + delta;
		}
	}

}

godot.set_script_tooled(Main, true);