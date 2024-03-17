const File = new godot.File();
const file_exists = (path) => File.file_exists(path);
export const log = (txt, strTab, indent) => {
	return console.log(JSON.stringify(txt, strTab, indent));
};

export const getFile = (path) => {
    if (!file_exists(path)) { throw new Error("Couldn't find "+path); }
    File.open(path, godot.File.READ);
    const text = File.get_as_text();
    File.close();
    return text;
};

export const fileExists = file_exists;

class FileWatchClass {
    #stack = {};
    #watched = [];
    #watchedLength = 0;
    #timeout = 200;
    #rootNode = null;
    constructor(timeMS = 200) {
        this.delay = timeMS;
        this.#timeout = timeMS;
        this.hook = false;
        this.timer = null;
        this._watch = this._watch.bind(this);

        this.stop = this.stop.bind(this);
        this.start = this.start.bind(this);
        this.setRoot = this.setRoot.bind(this);
        this.onChange = this.onChange.bind(this);
    }

    get files() { return this.#watched; }
    set files(value) {
        this.#stack = {};
        this.#watched = typeof value === "string" ? [ value ] : value;
        this.#watchedLength = this.#watched.length;
        this.#watched.forEach((filePath) => {
            this.#stack[ filePath ] = File.get_modified_time(filePath);
        });
        this.#setTimeout();
    }

    #setTimeout() {
        const hasWatched = this.#watchedLength > 0;
        const hasRoot = !!this.#rootNode;
        const hasHook = typeof this.hook === "function";

        if (hasWatched && hasHook && hasRoot && this.timer && this.delay > 5) {
            this.timer.paused = false;
        } else if (this.timer && !this.timer.paused) {
            this.timer.paused = true;
        }
    }

    #watch(force) {
        // No need to watch when there's nothing to do with it
        if (!this.hook && !force) return;

        let hasChange = false;
        for (var i = 0; i < this.#watchedLength; i++) {
            const file = this.#watched[ i ];
            const lastEdit = File.get_modified_time(file);
            if (lastEdit !== this.#stack[ file ]) {
                console.log(file+" changed "+this.#stack[ file ] +" - "+ lastEdit);
                this.#stack[ file ] = lastEdit;
                hasChange = true;
            }
        }

        if (hasChange && this.hook) {
            this.hook();
        }
    }

    _watch() { this.#watch(); }

    onChange(hook) {
        if (typeof hook !== "function") throw new Error("Function expected");
        this.hook = hook;
        this.#watch(true);
        this.#setTimeout();
    }

    setRoot(Node) {
        if (this.#rootNode) return;
        this.#rootNode = Node;
        const timer = new godot.Timer();
        timer.paused    = true;
        timer.one_shot  = false;
        timer.autostart = true;
        timer.wait_time = this.delay/100;
        const watch = this._watch;
        timer.connect("timeout", watch);
        this.timer = timer;
        this.#rootNode.add_child(this.timer);
        this.#setTimeout();
    }

    stop() {
        this.delay = -1;
        this.#setTimeout();
    }

    start() {
        this.delay = this.#timeout;
        this.#setTimeout();
    }
}

export const FileWatch = FileWatchClass;