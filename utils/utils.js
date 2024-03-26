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
