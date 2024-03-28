tool
extends ResourceFormatSaver
class_name CustomResFormatSaver

const CSSClass = preload("res://addons/godotJS-CSS/css_resource.gd")


func get_recognized_extensions(resource: Resource) -> PoolStringArray:
	return PoolStringArray(["css"])


func recognize(resource: Resource) -> bool:
	resource = resource as CSSClass
	
	if resource:
		return true
	
	return false

func save(path: String, resource: Resource, flags: int) -> int:
	var err:int
	var file:File = File.new()
	err = file.open(path, File.WRITE)
	
	if err != OK:
		printerr('Can\'t write file: "%s"! code: %d.' % [path, err])
		return err
	
	file.store_string(resource.get("text"))
	file.close()
	return OK
