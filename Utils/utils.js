const File = new godot.File();

export const log = (txt, strTab, indent) => {
	return console.log(JSON.stringify(txt, strTab, indent));
};

export const getFile = (path) => {
    if (!File.file_exists(path)) { throw new Error("Couldn't find "+path); }
    File.open(path, godot.File.READ);
    const text = File.get_as_text();
    File.close();
    return text;
};
