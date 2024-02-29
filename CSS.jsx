import CSStringToObject from "./CSSStringToObject.jsx";
import { MOUSE_FILTER, } from "res://addons/div/css/Utils/CSS_Utils.js";
import ShaderMat from "./CSS_material.tres";
import Shader from "./CSS_shader.gdshader";

const log = (txt, strTab, indent) => console.log(JSON.stringify(txt, strTab, indent));
const _css = `
    self {
        left: 50%;
        top: 50%;
        width: 80%;
        max-width: 500px;
        height: 200px;
        border-radius: 7px 7px;
        backdrop-filter: blur(8px);
        transform: translate(-50%, -50%) scale(1,1);
    }
    self:hover {
        transform: scale(1.05,1.05);
        backdrop-filter: blur(11px);
    }
    self:active {
        border-radius: 12px 12px;
        transform: scale(0.98, 0.98);
        backdrop-filter: blur(8px);
    }
`;

export default class CSS extends godot.Panel {
    // The name of the element on CSS to reference itself
    #selfCSSname = "self";
    // eg: self { width: 20px; } self:hover { width: 40px; }

    #initialState = {
        "margin_left":   { v: 0, p: false },
        "margin_top":    { v: 0, p: false },
        "anchor_left":   { v: 0, p: false },
        "anchor_right":  { v: 0, p: false },
        "anchor_top":    { v: 0, p: false },
        "anchor_bottom": { v: 0, p: false },

        "margin_right":  { v: 20, p: false },
        "margin_bottom": { v: 20, p: false },
        "transform.scale": { x: 1, y: 1 },
        "transform.translate": { x: 0, y: 0 },
        "transform-origin": { x: 0.5, y: 0.5 },
        material: {}, style: {},
    };
    #states = {};
    #parent = null;
    #currentState = {};
    #currentStateName = "init";
    #mouseEvent = { hover: false, focus: false, active: false };
    #style = null;
    #material = null;

    #id = "";
    #classes = [];

    constructor() {
        super();
        // this.classes = []; // To inherit 
        this.classList = {
            contains: (cls)      => this.#classes.indexOf(cls) > -1, 
            add:      (newcls)   => { this.#classes = Array.from(new Set([ ...this.#classes, newcls ])); this.#buildClasses(); }, 
            remove:   (newcls)   => { this.#classes = this.#classes.filter(cls => cls !== newcls); this.#buildClasses(); },
            toggle:   (cls)      => { this.classList[ this.classList.contains(cls) ? "remove" : "add" ](cls); },
            replace:  (old, add) => { this.#classes = Array.from(new Set(this.#classes.map(cls => cls === old ? add : cls))); this.#buildClasses(); },
        };
    }

    // get id() { return this.#id; } set id(value) { this.#id = value; this.#buildClasses(); }
    // get className() { return this.#classes.join(' '); } set className(value) { this.#classes = value.split(/[\ ]+/g); this.#buildClasses(); }
    #buildClasses() {
        // Get all classes and ID from repository to merge to the current element
        // current element is merge last as inline/editor declarations have priority to crush old ones
    }


    #onInit() {
        this.#currentState = { ...this.#initialState };

        const style = new godot.StyleBoxFlat();
        this.#style = style.duplicate();
        this.#style.bg_color = new godot.Color(0,1,0,0);
        this.set('custom_styles/panel', this.#style);

        this.#material = ShaderMat.duplicate();
        this.#material.shader = Shader.duplicate();

        const testState = {
            border: { top: 4, bottom: 4, left: 4, right: 4, color: [1,1,1,0.5] },
            boxShadow: { x: 0, y: 4, size: 8, color: [ 0.0, 0.0, 0.0, 0.2 ] },
            backgroundColor: [ 0.956863, 0.658824, 0.392157, 0.25098 ],
            "transform.translate": { x: 0, y: 0 },
            "backdrop-filter.blur": 5,
        };
        // this.#material.set("shader_param/blur_amount", testState[ "backdrop-filter.blur" ]/2);
        this.#material.set("shader_param/set_color", new godot.Color(...testState.backgroundColor));
        [ "top_left", "top_right", "bottom_right", "bottom_left" ].forEach((param) => {
            this.#style[ "corner_radius_" + param ] = 20;
        });

        [ "left", "right", "top", "bottom" ].forEach((param) => {
            this.#style[ "border_width_" + param ] = testState.border[ param ];
        });
        this.#style["border_color"] = new godot.Color(...testState.border.color);
        this.#style.shadow_color = new godot.Color(...testState.boxShadow.color);
        this.#style.shadow_size = testState.boxShadow.size;
        this.#style.shadow_offset = new godot.Vector2(testState.boxShadow.x, testState.boxShadow.y);
    }

    _ready() {
        this.#onInit();
        this.afterReady = this.afterReady.bind(this);
        if (this.get_parent() && this.get_parent().has_signal("resized") && !this.get_parent().css) {
            this.get_parent().connect("resized", () => { this.#reloadState(); });
        }

        // hover
        this.connect("mouse_entered", () => { this.#mouseEvent.hover = true;  this.#setState(); });
        this.connect("mouse_exited",  () => { this.#mouseEvent.hover = false; this.#setState(); });
        // Keypad hover
        this.connect("focus_entered", () => { this.#mouseEvent.focus = true;  this.#setState(); });
        this.connect("focus_exited",  () => { this.#mouseEvent.focus = false; this.#setState(); });

        // mouse clicks, mousedown AND mouseup
        this.connect("gui_input", (event) => {
            if (event.__class__ !== "InputEventMouseButton" || event.button_index !== 1) return;
            this.#mouseEvent.active = event.pressed; this.#setState();
        });

        this.call_deferred("afterReady");
    }


    afterReady() {
        // Set pass on each children
        const passFilter = MOUSE_FILTER.PASS;
        this.mouse_filter = passFilter;

        const walker = (element) => {
            const children = element.get_children();
            if (!children || children.length === 0) return;
            children.forEach((child) => {
                child.mouse_filter = passFilter;
                walker(child);
            });
        };
        walker(this);
        // Set in deferred to give it time to draw
        // otherwise parent.rect_size{ x, y } = 0
        this.#parent = this.get_parent();
        this.#loadCSS();
    }


    #loadCSS() {
        const rules = CSStringToObject(_css);
        const name  = this.#selfCSSname;
        if (!rules || !rules[ name ] || !rules[ name ].states._default) return;

        this.#states = rules[ name ].states;
        const inheritFromDefault = [ "transform.translate" ];
        const otherStates = Object.keys(this.#states).filter(e => e !== "_default");
        if (this.#states._default) {
            this.#states._default = { ...this.#initialState, ...this.#states._default };
            inheritFromDefault.forEach((prop) => {
                if (this.#states._default[prop]) {
                    otherStates.forEach((state) => {
                        this.#states[ state ][ prop ] = this.#states._default[prop];
                    });
                }
            });
        }
        // log(this.#states._default, null, 4);
        this.#setState();
    }


    #setState(_state = "_default") {
        let state = _state;
        if (this.#mouseEvent.hover && this.#states["hover"])   { state = "hover"; }
        if (this.#mouseEvent.focus && this.#states["focus"])   { state = "focus"; }
        if (this.#mouseEvent.focus && this.#states["hover"])   { state = "hover"; }
        if (this.#mouseEvent.active && this.#states["active"]) { state = "active"; }
        if (this.#currentStateName === state) return;
        if (!this.#states[ state ]) return;
        this.#setNextStateValues(this.#states[ state ], state);
    }

    #reloadState() {
        if (this.#currentStateName !== "init" && this.#states[ this.#currentStateName ]) {
            this.#setNextStateValues(this.#states[ this.#currentStateName ], this.#currentStateName);
        }
    }


    #setNextStateValues(_nextState, name) {
        const cs = JSON.parse(JSON.stringify({ ...this.#currentState, ...{} }));
        const parent = this.#parent;
        const p_x = parent.rect_size.x;
        const p_y = parent.rect_size.y;

        const center_x = p_x/2;
        const center_y = p_x/2;

        const nextState = { ..._nextState };
        const parentX = (value) => { return value * p_x; };
        const parentY = (value) => { return value * p_y; };
        const elementX = (value) => { return value * cs.width; };
        const elementY = (value) => { return value * cs.height; };
        const parentPercent = {
            width:        parentX, "max-width":  parentX, "min-width":  parentX,
            left:         parentX, right:        parentX,
            height:       parentY, "max-height": parentY, "min-height": parentY,
            top:          parentY, bottom:       parentY,
        };

        const Val = (prop, sub) => {
            const val = sub ? nextState[prop][sub] : nextState[prop];
            if (val.p) return parentPercent[prop](val.v);
            return val.v;
        };

        const applyValues = {
        //  this    <----- p stands for prop, aka this (see arrow to left)
            "left":       (p) => { cs.margin_left   = Val(p); },
            "top":        (p) => { cs.margin_top    = Val(p); },
            "width":      (p) => { const val = Val(p); cs.margin_right  = cs.margin_left + val; cs.width = val; },
            "right":      (p) => { const val = Val(p); cs.width  = p_x-(cs.margin_left + val); cs.margin_right = cs.margin_left+cs.width; },
            "height":     (p) => { const val = Val(p); cs.margin_bottom = cs.margin_top + val; cs.height = val; },
            "bottom":     (p) => { const val = Val(p); cs.height = p_y-(cs.margin_top + val); cs.margin_bottom = cs.margin_top+cs.height; },
            "max-width":  (p) => { const val = Val(p); if (cs.width > val)  { cs.margin_right = cs.margin_left + val; cs.width = val; } },
            "min-width":  (p) => { const val = Val(p); if (cs.width < val)  { cs.margin_right = cs.margin_left + val; cs.width = val; } },
            "max-height": (p) => { const val = Val(p); if (cs.height > val) { cs.margin_bottom = cs.margin_top + val; cs.height = val; } },
            "min-height": (p) => { const val = Val(p); if (cs.height < val) { cs.margin_bottom = cs.margin_top + val; cs.height = val; } },
            "transform.translate": (p) => {
                const val = nextState[p];
                cs.anchor_left = cs.anchor_right  = (cs.width*val.x) /p_x;
                cs.anchor_top  = cs.anchor_bottom = (cs.height*val.y)/p_y;
            },
            "transform.scale": (p) => { cs.rect_scale = nextState[p]; },
            "transform-origin": (p) => {
                const val = nextState[p];
                cs.rect_pivot_offset = { x: Math.round(cs.width*val.x), y: Math.round(cs.height*val.y) };
            },
            "backdrop-filter.blur": (p) => { cs.material[ "shader_param/blur_amount" ] = parseFloat(Val(p)/2); },
            "border-radius": (p) => { Object.keys(nextState[p]).forEach((key) => { cs.style[ "corner_radius_"+key ] = nextState[p][key].v; }); },
        };

        Object.keys(applyValues).forEach((prop) => {
            if (nextState[ prop ]) { applyValues[prop](prop); }
        });

        this.#applyCurrentState(cs, name);
    }


    #applyCurrentState(nextState, name) {
        const current=  this.#currentState;
        const sources = { material: this.#material, style: this.#style };
        [ // Values
            [ null,       [ "margin_left", "margin_right", "margin_top", "margin_bottom", "anchor_left", "anchor_right", "anchor_top", "anchor_bottom" ]],
            [ "material", [ "shader_param/blur_amount" ]],
            [ "style",    [ "corner_radius_top_left", "corner_radius_top_right", "corner_radius_bottom_left", "corner_radius_bottom_right", ]],
        ].forEach((def) => {
            const sourceName = def[0];
            const allProps   = def[1];

            const source  = sourceName ? nextState[ sourceName ] : nextState;
            const applyTo = sourceName ? sources[ sourceName ]   : this;
            const kurrent = sourceName ? current[ sourceName ]   : current;

            allProps.forEach((prop) => {
                if (typeof source[prop] === "undefined") return;
                const nextValue = source[ prop ] || 0;
                // Don't redraw same props - Applies to animation diff
                if (!kurrent[ prop ] || kurrent[ prop ] !== nextValue) {
                    if (sourceName === "material") { applyTo.set(prop, nextValue); }
                    else { applyTo[ prop ] = nextValue; }
                }
            });
        });

        [ // Axis x, y
            "rect_scale",
            "rect_pivot_offset",
        ].forEach((prop) => {
            if (typeof nextState[prop] === "undefined") return;
            const nextValue = nextState[prop] || { x: 0, y: 0 };
            if (!current[ prop ] || current[ prop ].x !== nextValue.x || current[ prop ].y !== nextValue.y) {
                this[ prop ] = new godot.Vector2(nextValue.x, nextValue.y);
            }
        });
        // this.#material.set("shader_param/blur_amount", 4);
        this.#currentState  = nextState;
        this.#currentStateName  = name;
    }

}

godot.set_script_tooled(CSS, true);