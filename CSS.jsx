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
        backdrop-filter: blur(12px);
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
    @media screen and (max-width: 600px) {
        self { backdrop-filter: blur(0px); width: 200px; }
    }
`;

let applyValuesKeys = null;

export default class CSS extends godot.Panel {
    // The name of the element on CSS to reference itself
    #selfCSSname = "self";
    // eg: self { width: 20px; } self:hover { width: 40px; }

    #initialState = {
        "margin_left":   { v: 0, p: false }, "margin_right":  { v: 20, p: false },
        "margin_top":    { v: 0, p: false }, "margin_bottom": { v: 20, p: false },
        "anchor_left":   { v: 0, p: false }, "anchor_right":  { v: 0,  p: false },
        "anchor_top":    { v: 0, p: false }, "anchor_bottom": { v: 0,  p: false },

        "transform.scale":     { x: 1, y: 1 },
        "transform.translate": { x: 0, y: 0 },
        "transform-origin":    { x: 0.5, y: 0.5 },
        style: {},
        material: {},
        media: null, /* {
s            // _max and _min key for quick size comparaison
            max_width: [], min_width: [], max_height: [], min_height: [],
            // actual declarations
            _max_width: {}, _min_width: {}, _max_height: {}, _min_height: {},
        } */
    };
    #states = {};
    #parent = null;
    #currentState = {};
    #currentStateName = "init";
    #mouseEvent = { hover: false, focus: false, active: false };
    #style = null;
    /*!*\ #material = null; // Somehow not working if it's private (??) */

    #minSecDelay = 0.1;
    #pendingRender = false;
    #timeLastRender = 0;

    #id = "";
    #classes = [];
    #ready = false;

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

        const style = new godot.StyleBoxFlat();
        this.#style = style.duplicate();
        this.#style.bg_color = new godot.Color(0,1,0,0);
        this.set('custom_styles/panel', this.#style);

        this.material = ShaderMat.duplicate();
        this.material.shader = Shader.duplicate();
        this.material.set("shader_param/set_color", new godot.Color(...testState.backgroundColor));
    }

    // get id() { return this.#id; } set id(value) { this.#id = value; this.#buildClasses(); }
    // get className() { return this.#classes.join(' '); } set className(value) { this.#classes = value.split(/[\ ]+/g); this.#buildClasses(); }
    #buildClasses() {
        // Get all classes and ID from repository to merge to the current element
        // current element is merge last as inline/editor declarations have priority to crush old ones
    }


    #onInit() {
        this.#currentState = JSON.parse(JSON.stringify({ ...this.#initialState }));

        const testState = {
            border: { top: 4, bottom: 4, left: 4, right: 4, color: [1,1,1,0.5] },
            boxShadow: { x: 0, y: 4, size: 8, color: [ 0.0, 0.0, 0.0, 0.2 ] },
            backgroundColor: [ 0.956863, 0.658824, 0.392157, 0.25098 ],
            "transform.translate": { x: 0, y: 0 },
        };

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
            this.get_parent().connect("resized", () => { this.#pendingRender = true; });
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
        // Set pass on each children to avoid losing
        // hover/active/focus on children mouse events
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
        this.#ready = true;
        this.#setState();
    }


    #setState(_state = "_default") {
        if (!this.#ready) return;
        let state = _state;
        if (this.#mouseEvent.hover  && this.#states["hover"])  { state = "hover";  }
        if (this.#mouseEvent.focus  && this.#states["focus"])  { state = "focus";  }
        if (this.#mouseEvent.focus  && this.#states["hover"])  { state = "hover";  }
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
        let nextState = JSON.parse(JSON.stringify(_nextState));
        const cs = JSON.parse(JSON.stringify(this.#currentState));
        const parent = this.#parent;
        const p_x = parent.rect_size.x;
        const p_y = parent.rect_size.y;

        // Media Queries
        if (nextState.media) {
            const max_width  = nextState.media.max_width.filter(size  => size > p_x);
            const min_width  = nextState.media.min_width.filter(size  => size < p_x);
            const max_height = nextState.media.max_height.filter(size => size > p_y);
            const min_height = nextState.media.min_height.filter(size => size < p_y);
            if (max_width.length > 0)  { max_width.forEach((size)  => { nextState = { ...nextState, ...nextState.media._max_width[size]  }; }); }
            if (min_width.length > 0)  { min_width.forEach((size)  => { nextState = { ...nextState, ...nextState.media._min_width[size]  }; }); }
            if (max_height.length > 0) { max_height.forEach((size) => { nextState = { ...nextState, ...nextState.media._max_height[size] }; }); }
            if (min_height.length > 0) { min_height.forEach((size) => { nextState = { ...nextState, ...nextState.media._min_height[size] }; }); }
        }

        const parentX = (value) => { return value * p_x; };
        const parentY = (value) => { return value * p_y; };

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

            "border-radius":        (p) => { Object.keys(nextState[p]).forEach((key) => { cs.style[ "corner_radius_"+key ] = nextState[p][key].v; }); },

            "transform.scale":      (p) => { cs.rect_scale = nextState[p]; },
            "transform.translate":  (p) => { const val = nextState[p]; cs.anchor_left = cs.anchor_right  = (cs.width*val.x) /p_x; cs.anchor_top  = cs.anchor_bottom = (cs.height*val.y)/p_y; },
            "transform-origin":     (p) => { const val = nextState[p]; cs.rect_pivot_offset = { x: Math.round(cs.width*val.x), y: Math.round(cs.height*val.y) }; },
            "backdrop-filter.blur": (p) => { cs.material[ "blur_amount" ] = parseFloat(Val(p) ? Val(p)/2 : 0); },
        };

        if (!applyValuesKeys) { applyValuesKeys = Object.keys(applyValues); }

        applyValuesKeys.forEach((prop) => {
            if (nextState[ prop ]) { applyValues[prop](prop); }
        });

        this.#applyCurrentState(cs, name);
    }


    #applyCurrentState(nextState, name) {
        const current=  this.#currentState;
        const methods = {
            // State objects reflect this private values
            // eg; nextState.style.prop = this.#style.prop
            material: this.material,
            style: this.#style
        };

        [// Sourcs        Props to be applied
            [ null,       [ "margin_left", "margin_right", "margin_top", "margin_bottom", "anchor_left", "anchor_right", "anchor_top", "anchor_bottom" ]],
            [ "material", [ "blur_amount" ]],
            [ "style",    [ "corner_radius_top_left", "corner_radius_top_right", "corner_radius_bottom_left", "corner_radius_bottom_right", ]],
        ].forEach((def) => {
            const sourceName = def[0];
            const allProps   = def[1];

            const source  = sourceName ? nextState[ sourceName ] : nextState;
            const kurrent = sourceName ? current[ sourceName ]   : current;
            const applyTo = sourceName ? methods[ sourceName ]   : this;

            allProps.forEach((prop) => {
                if (typeof source[prop] === "undefined") return;
                const nextValue = source[ prop ] || 0;
                // Don't redraw same props - Applies to animation diff
                if (typeof kurrent[ prop ] === "undefined" || kurrent[ prop ] !== nextValue) {
                    if (sourceName === "material") {
                        // applyTo.set(prop, nextValue);
                        applyTo.set_shader_param(prop, nextValue);
                    }
                    else { applyTo[ prop ] = nextValue; }
                }
            });
        });

        [// Source  Axis        Axis for type    Props to be applied
            [ null, ['x', 'y'], godot.Vector2, [ "rect_scale", "rect_pivot_offset" ] ],
        ].forEach((def) => {
            const sourceName = def[0];  const axes       = def[1];
            const format     = def[2];  const allProps   = def[3];

            const source  = sourceName ? nextState[ sourceName ] : nextState;
            const kurrent = sourceName ? current[ sourceName ]   : current;
            const applyTo = sourceName ? methods[ sourceName ]   : this;

            allProps.forEach((prop) => {
                if (typeof source[prop] === "undefined") return;
                const nextValue = source[ prop ];
                if (typeof kurrent[ prop ] === "undefined" || kurrent[ prop ] !== nextValue) {
                    applyTo[ prop ] = new format(...axes.map((axis) => nextValue[axis]));
                }
            });
        });

        this.#currentState  = nextState;
        this.#currentStateName  = name;
    }

    _process(delta) {
        if (this.#timeLastRender < this.#minSecDelay+1) {
            this.#timeLastRender = this.#timeLastRender + delta;
        }
        // Soft reload on window resize as the user shouldn't change the window
        // size for fun, yet the window shouldn't re-run calculation every pixel resized 
        // Reducing this is up to you but is not recommended as they delay won't be applied
        // it transitions, as long as the size stays the same the style is applied only once
        if (this.#pendingRender && this.#timeLastRender > this.#minSecDelay) {
            this.#reloadState();
            this.#timeLastRender = 0;
            this.#pendingRender = false;
        }
    }

}

godot.set_script_tooled(CSS, true);