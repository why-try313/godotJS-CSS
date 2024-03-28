tool
extends Resource
class_name CSSResource

# Source: https://github.com/AnidemDex/Godot-CustomResource/tree/main

export(String, MULTILINE) var text = "" setget set_text

func set_text(value:String) -> void:
	text = value
	emit_changed()
