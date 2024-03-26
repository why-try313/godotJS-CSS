const File = new godot.File();

// Manage .css files and reload on changes
// Provides a liveReload to all elements in the tree
// this should not be loaded at all on production or event in-game launched by the editor

export default class CSSFilesWatcher extends godot.EditorPlugin {
	#files = {};
	#active = false;
	#lastUpdate = 0;
	#limitSeconds = 1;

	constructor() {
		this.filesystem = this.get_editor_interface().get_resource_filesystem();
		this.isEditor   = godot.Engine.editor_hint;
		console.log("init");
	}

	_init() {
		console.log("init");
	}
	init()  { this.#init(); }
	#init() {
		const hasMainCSS  = File.file_exists("res://css/style.css");
		const isConnected = this.filesystem.is_connected("sources_changed", this, "init");

		if (this.isEditor && hasMainCSS) {
			this.#files = {};
			const files = Lib.parseCSS();
			files.forEach((file) => { this.#files[ file ] = File.get_modified_time(file); });
			this.#active = files.length > 0;
			if (this.#active) { this.lastUpdate = this.#limitSeconds; }
			if (isConnected) { this.filesystem.disconnect("sources_changed", this, "init"); }
		} else {
			this.#active = false;
			if (this.isEditor && !isConnected) {
				this.filesystem.connect("sources_changed", this, "init");
			}
		}
	}

	#reload() {
		Lib.reload();
	}

	_process(delta) {
		console.log("process");
		if (this.#active) return;
		if (this.#lastUpdate >= this.#limitSeconds) {
			this.#lastUpdate = delta;
			this.#scan();
		} else {
			this.#lastUpdate = this.#lastUpdate + delta;
		}
	}

	#scan() {
		let hasChanges = false;
		let hasMissingFiles = false;

		Object.keys(this.#files).forEach((file) => {
			const exists = File.file_exists(file);
			if (exists) {
				const timestamp = File.get_modified_time(file);
				if (timestamp !== this.#files[ file ]) {
					this.#files[ file ] = timestamp;
					hasChanges = true;
				}
			} else {
				hasMissingFiles = true;
				hasChanges = true;
			}
		});

		if (hasMissingFiles) { this.#init(); }
		if (hasChanges) { this.#reload(); }
	}
}