tool
extends ResourceFormatLoader
class_name CustomResFormatLoader

const CSSClass = preload("res://addons/godotJS-CSS/css_resource.gd")

func get_recognized_extensions() -> PoolStringArray:
	return PoolStringArray(["css"])


func get_resource_type(path: String) -> String:
	var ext = path.get_extension().to_lower()
	if ext == "css":
		return "Resource"
	
	return ""


func handles_type(typename: String) -> bool:
	return ClassDB.is_parent_class(typename, "Resource")


func load(path: String, original_path: String):
	var file := File.new()
	
	var err:int
	
	var res := CSSClass.new()
	
	err = file.open(path, File.READ)
	if err != OK:
		push_error("For some reason, loading custom resource failed with error code: %s"%err)
		# You has to return the error constant
		return err
	
	res.text = file.get_as_text()
	
	file.close()
	return res

