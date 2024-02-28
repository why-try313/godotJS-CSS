shader_type canvas_item;

uniform float blur_amount: hint_range(0.0, 5.0);
uniform vec4 set_color : hint_color;
uniform vec4 chroma_color : hint_color;

void fragment() {
	vec4 current_color = COLOR;
	if (length(current_color - chroma_color) < 0.01) {
		if (set_color.a < 1.0) {
			COLOR = textureLod(SCREEN_TEXTURE, SCREEN_UV, blur_amount);
			vec4 blur = vec4(COLOR.r, COLOR.g, COLOR.b, 1.0);
			COLOR.r=mix(blur.r, set_color.r,set_color.a);
			COLOR.g=mix(blur.g, set_color.g,set_color.a);
			COLOR.b=mix(blur.b, set_color.b,set_color.a);
		} else {
			COLOR=set_color;
		}
	}
}