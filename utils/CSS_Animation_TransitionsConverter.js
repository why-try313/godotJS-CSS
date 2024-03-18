export default {
	width: [ "margin_left", "margin_right", "anchor_left", "anchor_right" ],
	height: [ "margin_top", "margin_bottom", "anchor_top", "anchor_bottom" ],
	top: [ "anchor_top", "anchor_bottom" ], left: [ "anchor_left", "anchor_right" ],
	right: [ "margin_right" ], bottom: [ "margin_bottom" ],
	background: [ "material.set_color", "style.bg_color" ],
	"background-color": [ "material.set_color", "style.bg_color" ],
	"box-shadow": [ "style.shadow_size", "style.shadow_color", "style.shadow_offset" ],
	"transform": [ "rect_scale", "anchor_left", "anchor_right", "anchor_top", "anchor_bottom" ],
};