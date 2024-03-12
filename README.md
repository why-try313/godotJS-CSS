# Godot JavaScript CSS integration

CSS support integration for Godot JavaScript<br/>
**Note:** Will not work with classic Godot

### Supported Godot versions:
- Godot JavaScript 3.x
- <s>Godot JS 4.x</s> (too unstable for now)

<br>

### Intallation:
1. git-clone this repo into your `res://addons/` folder (should be named `godotJS-CSS`)
2. Enable the addon

<br>

### How to use it:
1. Create a `res://css/style.css` file
2. Create a Div element and set its ID/class
3. Write CSS in `res://css/style.css` (you can use `@import` to split files)
4. The hot-reload feature will display changes (in-editor and in-game)<br/>
**Note**: If changes are not applied reload the project, `missing css/style.css file` bug will be fixed

<br/>
<hr/>
<br/>

## Current Features
- [ ] Custom `Div` element to set class/ID/inline-style
- [ ] CSS file parsing - Only on `style.css` as entry point, use `@import` to split files
- [ ] Inline CSS with Div property
- [ ] Hot reload on editor and in-game - will be toggable for in-game in the future and disabled by default
- [ ] Properties:
  - **Geometry:** width, height, top, left, bottom, right
  - **Limits:** max-width, max-height, min-width, min-height
  - **Transforms:** scale, translate, origin
  - **Filters:** backdrop-filter
  - **Border:** width, color, radius
  - **Misc:** background-color, opacity, cursor, box-shadow

<br>

## Next Features
- [ ] `transition` animations
- [ ] `:root` variables
- [ ] `calc` values
- [ ] `blur`, not only on background but on content as well
- [ ] CSS detection on file creation - to avoid reloading the project on first `style.css` creation
- [ ] A custom `CSS` element to apply to root to be able to insert other files than `style.css`
- [ ] Some minor bug fixes

<br>

## Limitations
- For now, only `css/style.css` is acepted as entry point, will be fixed in future
- Only one `backdrop-filter` allowed as **next-pass shaders** are not integrated
- backrgound-gradients, related to **next-pass shaders** problem, use gradient as child instead
