export default {
	width: [ "margin_left", "margin_right" ],
	height: [ "margin_top", "margin_bottom" ],
	top: [ "anchor_top", "anchor_bottom" ],
	left: [ "anchor_left", "anchor_right" ],
	right: [ "margin_right" ],
	bottom: [ "margin_bottom" ],
	"min-width": [ "margin_left", "margin_right"  ],
	"min-height": [ "margin_top", "margin_bottom" ],
	"max-width": [ "margin_left", "margin_right"  ],
	"max-height": [ "margin_top", "margin_bottom" ],
	"background": [ "material.set_color", "style.bg_color" ],
	"background-color": [ "material.set_color", "style.bg_color" ],
	"box-shadow": [ "style.shadow_size", "style.shadow_color", "style.shadow_offset" ],
	"transform": [ "rect_scale", "margin_left", "margin_right", "margin_top", "margin_bottom" ],
	"backdrop-filter": [ "material.blur_amount" ],
	"border-radius": [ "corner_radius_top_left", "corner_radius_bottom_right", "corner_radius_top_right", "corner_radius_bottom_left" ],
	"border": [ "border_width_left", "border_width_right", "border_width_top", "border_width_bottom", "style.border_color", ],
	"border-size": [ "border_width_left", "border_width_right", "border_width_top", "border_width_bottom", ],
	"border-color": [ "style.border_color" ],
};