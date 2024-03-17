tool
extends EditorImportPlugin
func get_importer_name():
    return "whtry.godotjscss.plugin"

func get_visible_name():
    return "CSS File"

func get_recognized_extensions():
    return ["css", "CSS"]

func get_resource_type():
    return "Script"

func get_save_extension():
    return "css"

func get_preset_count():
    return 1

func get_preset_name(i):
    return "style"

func get_import_options(i):
    return []

func get_option_visibility(option, options):
    return false

func import(source_file, save_path, options, platform_variants, gen_files):
    var file = File.new()
    if file.open(source_file, File.READ) != OK:
        return FAILED

    var filename = save_path + "." + get_save_extension()
    var res = Resource.new();
    res.resource_name = filename;
    res.resource_path = source_file;
    return ResourceSaver.save(filename, res)
