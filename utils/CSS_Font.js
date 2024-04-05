import Lib from "../main/ClassesLib.js";
export default class FontClass {
    #font = null;
    constructor(ref, defaultSize = 16) {
        this.ref = ref;
        this._size = defaultSize;
        this._name  = null;
    }

    get size() {
        return this._size;
    } set size(value) {
        this._size = value;
        if (!this.#font) {
            this.#font = this.ref.get_theme_default_font();
            if (!this.#font) return;
            this.ref.theme.set_default_font(font);
        }
        this.#font.size = parseInt(value);
    }

    get name() {
        return this._name;
    } set name(value) {
        if (value !== this._name && Lib.fonts[ value ]) {
            this._name = value;
            this.#font = Lib.fonts[ value ].duplicate();
            this.ref.theme.set_default_font(this.#font);
        }
    }

    get color() {
        const color = (this.ref.currentState && this.ref.currentState.font) ? this.ref.currentState.font.color : [ 1, 1, 1, 1];
        return new godot.Color(...color);
    } set color(value) {
        if (!this.ref.theme) return;
        this.ref.theme.set_color("font_color", "RichTextLabel", value);
        this.ref.theme.set_color("font_color", "Label", value);
    }
}