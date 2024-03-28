const File = new godot.File();
const file_exists = (path) => File.file_exists(path);
export const log = (txt, strTab, indent) => {
	return console.log("log:"+JSON.stringify(txt, strTab, indent));
};

export const getFile = (path) => {
    const exists = godot.ResourceLoader.exists(path);
    if (!exists) { throw new Error("Couldn't find "+path); }
    const file = godot.load(path);
    return file.get("text");
};

export const fileExists = file_exists;
