tool
extends EditorPlugin
var css_import_plugin
# var delt = 0

func _enter_tree():
    add_custom_type("Div", "Panel", load("res://addons/godotJS-CSS/main/CSS.jsx"), preload("../icons/icon16.png"))
    # css_import_plugin = preload("./css-importer.gd").new()
    # add_import_plugin(css_import_plugin)

func _exit_tree():
    # remove_import_plugin(css_import_plugin)
    remove_custom_type("Div")
