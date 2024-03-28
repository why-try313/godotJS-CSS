tool
extends EditorImportPlugin

const CSSClass = preload("res://addons/godotJS-CSS/css_resource.gd")

func get_importer_name():
    return "whtry.godotjscss.plugin"

func get_visible_name():
    return "CSS File"

func get_recognized_extensions():
    return ["css"]

func get_save_extension():
    return "css"

func get_resource_type():
    return "Resource"

func get_preset_count():
    return 1

func get_preset_name(i):
    return "CSS Stylesheet"

func get_import_options(i):
    return []

func get_option_visibility(option, options):
    return true

func import(source_file, save_path, options, platform_variants, gen_files):
    var file = File.new()
    var res := CSSClass.new()

    if file.open(source_file, File.READ) != OK:
        push_error("For some reason, loading custom resource failed")
        return FAILED

    res.text = file.get_as_text()
    file.close()
    # Fill the Mesh with data read in "file", left as an exercise to the reader

    var filename = save_path + "." + get_save_extension()
    var resource = ResourceSaver.save(filename, res, 1)
    return resource
