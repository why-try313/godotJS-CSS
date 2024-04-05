# Godot JavaScript CSS integration

CSS support integration for Godot JavaScript<br/>
**Note:** Will not work with classic Godot, you'll need [Godot JavaScript version](https://github.com/Geequlim/ECMAScript)

<img src="https://i.imgur.com/EAs5xVO.png"/><br/><br/>

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
- [x] Custom `Div` element to set class/ID/inline-style
- [x] CSS file parsing - Only on `style.css` as entry point, use `@import` to split files
- [x] Inline CSS with Div property
- [x] Hot reload on editor ~~and in-game~~ - enabled only on editor, a toggle for in-game is planned
- [x] `:root` variables
- [x] Direct inheritance: classes tree is applied only identifiers **without** pseudo-classes like `hover` or `focus` - see `Next Features`
- [x] Properties:
  - **Geometry:** width, height, top, left, bottom, right
  - **Limits:** max-width, max-height, min-width, min-height
  - **Transforms:** scale, translate, origin
  - **Filters:** backdrop-filter
  - **Border:** width, color, radius
  - **Misc:** background-color, opacity, cursor, box-shadow
  - **Animations:** transition of all properties + font-size and color
- [x] Values:
  - **Units:** `px`, `%`, `em`, `rem`, `vw`, `vh`, `vmin`, `vmax` to match [CSS Relative Lengths](https://www.w3schools.com/cssref/css_units.php) - (`ex` and `ch` ignored)
  - **Functions:** `calc` (`%` on width, left refers to parent width, height and top to parent height)
  - **Mixins:** `calc` can be mixed with `var()`, `%` or/and `px`
- [x] Fonts:
  - **Import:** `@font-face`, requires `res://` path for `url` and `font-family`
  - **Properties:** `color`, `font-size` and `font-family`

<br>

## Next Features
- [ ] A custom `CSS` element to apply to root to be able to insert other files than `style.css`
- [ ] Code readability and performance optimizations
- [x] Dropped: <s>`blur`, not only on background but on content as well</s> - next pass issue won't allow this
- [x] Dropped: <s>`ex` and `ch` units</s> - DynamicFont properties won't allow this
- [ ] Inheritance for pseudo classes: `.myClass:hover .myOtherClass` doesn't work for now but it's planned
- [ ] Calculus Functions: `min`, `max` (completing `var` and `calc`) to match [CSS Functions](https://www.w3schools.com/cssref/css_functions.php) 

<br>

## Limitations
- No flow: All objects act as `absolute/fixed` and expects top/left positionning, `inline` and `flex` flow is ignored for now, will be planned if the feature becomes essential
- For now, only `css/style.css` is acepted as entry point, will be fixed in future
- Only one `backdrop-filter` allowed as **next-pass shaders** are not integrated
- backrgound-gradients, related to **next-pass shaders** problem, use gradient as child instead
