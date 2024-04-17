import { INITIAL_STATE, MOUSE_FILTER, INHERITED_PROPS, GDCursors }  from "../utils/CSS_Constants.js";
import Lib       from "./ClassesLib.js";
import Animation from "../utils/Animation/index.js";
import Shader    from "../ressources/CSS_shader.gdshader";
import ShaderMat from "../ressources/CSS_material.tres";
import FontClass from '../utils/CSS_Font.js';

let applyValuesKeys = null;
const ROOT_FONT_SIZE = 16;
const mods = {
    Apply   : (value) => value,
    Vector2 : (value) => new godot.Vector2(value.x, value.y),
    Color   : (value) => new godot.Color(...value),
};

const MODIFIERS = [// Sourcs        Method   Props to be applied
    [ null,       mods.Apply,   [ 
                                  "margin_left", "margin_right", "margin_top", "margin_bottom",
                                  "anchor_left", "anchor_right", "anchor_top", "anchor_bottom",
                                  "mouse_default_cursor_shape", "rect_clip_content"
    ]],
    [ null,       mods.Vector2, [ "rect_scale", "rect_pivot_offset" ] ],
    [ null,       mods.Color,   [ "modulate" ] ],
    [ "material", mods.Apply,   [ "blur_amount" ]], // has filter
    [ "material", mods.Color,   [ "set_color" ] ], // has filter
    [ "style",    mods.Apply,   [
                                  "shadow_size",
                                  "corner_radius_top_left", "corner_radius_top_right", "corner_radius_bottom_left", "corner_radius_bottom_right",
                                  "border_width_left", "border_width_right", "border_width_top", "border_width_bottom"
    ]],
    [ "style",    mods.Color,   [ "border_color", "shadow_color", "bg_color" ] ],
    [ "style",    mods.Vector2, [ "shadow_offset" ] ],
    [ "font",     mods.Apply,   [ "size", "name" ] ],
    [ "font",     mods.Color,   [ "color" ] ],
];

export default class CSS extends godot.Panel {
    // The name of the element on CSS to reference itself
    #selfCSSname = "self";
    // eg: self { width: 20px; } self:hover { width: 40px; }

    #currentStateName = "init";
    #initialState = INITIAL_STATE;
    #states       = {};
    #parent       = null;
    // #currentState = {};
    #mouseEvent   = { hover: false, focus: false, active: false };
    #style        = null;
    #theme        = null;
    #material     = null;

    #font           = {};

    #id          = "";
    #classes     = [];
    #classString = "";
    #ready       = false;
    #inline_css  = "";
    #isReload    = false;
    #firstStateLoaded = false; // Trigger to avoid animation on first CSS render
    #callStack = {};

    constructor() {
        super();
        this.compound = {};
        this.classList = {
            contains: (cls)      => this.#classes.indexOf(cls) > -1, 
            add:      (newcls)   => { this.#classes = Array.from(new Set([ ...this.#classes, newcls ])); this.#buildClasses(); }, 
            remove:   (newcls)   => { this.#classes = this.#classes.filter(cls => cls !== newcls); this.#buildClasses(); },
            toggle:   (cls)      => { this.classList[ this.classList.contains(cls) ? "remove" : "add" ](cls); },
            replace:  (old, add) => { this.#classes = Array.from(new Set(this.#classes.map(cls => cls === old ? add : cls))); this.#buildClasses(); },
        };
        this.currentState = {};
        const style = new godot.StyleBoxFlat();
        this.#style = style.duplicate();
        this.#style.anti_aliasing_size = 0.25;
        this.set('custom_styles/panel', this.#style);

        this.#material = ShaderMat.duplicate();
        this.#material.shader = Shader.duplicate();
        this.#material.set("shader_param/set_color", new godot.Color(...testState.backgroundColor));

        this.reload = this.reload.bind(this);
        this.defer  = this.defer.bind(this);
        this.afterReady = this.afterReady.bind(this);
        this.hasFilter = false;

        this.animations = [];
        this.hasAnimation = false;
        this.buildClasses();
    }

    // get id() { return this.#id; } set id(value) { this.#id = value; this.#buildClasses(); }
    // get className() { return this.#classes.join(' '); } set className(value) { this.#classes = value.split(/[\ ]+/g); this.#buildClasses(); }
    #buildClasses() {
        // Get all classes and ID from repository to merge to the current element
        // current element is merge last as inline/editor declarations have priority to crush old ones
        const compound = {};
        this.#classes = this.#classString.split(/[\ ,]+/).map((e) => e.trim().replace(/^\./, "")).filter(c => c && c.length > 0);
        if (this.#id && this.#id.length > 0) { compound.id = [ this.#id.replace(/^#/, "") ]; }
        if (this.#classes && this.#classes.length > 0) { compound.class = this.#classes.filter(c => c && c.length > 0); }
        this.compound = compound;
        this.#loadCSS();
    }


    get 'inline_CSS/text' () { return this.#inline_css; }
    set 'inline_CSS/text' (value) { this.#inline_css = value; if (this.#ready) { this.#loadCSS(); } }

    get _ID() { return this.#id || ""; } set _ID(value) { this.#id = value; this.#buildClasses(); }
    get _class() { return this.#classString || ""; } set _class(value) { this.#classString = value; this.#buildClasses(); }

    #onInit() {
        if (this.get_parent() && this.get_parent().has_signal("resized") && !this.get_parent().css) {
            this.get_parent().connect("resized", () => { this.#reloadState(); });
        }

        this.get_tree().root.connect("size_changed", () => {
            this.defer("#reloadState", this.#reloadState); // console.log("resized");
        });

        this.connect("tree_entered", () => { this.reload(); });

        // hover
        this.connect("mouse_entered", () => { this.#mouseEvent.hover = true;  this.defer("#setState", this.#setState); });
        this.connect("mouse_exited",  () => { this.#mouseEvent.hover = false; this.defer("#setState", this.#setState); });
        // Keypad hover
        this.connect("focus_entered", () => { this.#mouseEvent.focus = true;  this.defer("#setState", this.#setState); });
        this.connect("focus_exited",  () => { this.#mouseEvent.focus = false; this.defer("#setState", this.#setState); });

        // mouse clicks, mousedown AND mouseup
        this.connect("gui_input", (event) => {
            if (event.get_class() !== "InputEventMouseButton" || event.button_index !== 1) return;
            this.#mouseEvent.active = event.pressed;
            this.defer("#setState", this.#setState);
        });
    }


    defer(fnName, fn) {
        if (fnName) { this.#callStack[ fnName ] = fn; this.call_deferred("defer"); }
        else if (!fnName && Object.keys(this.#callStack).length > 0) {
            Object.keys(this.#callStack).forEach((fnName) => {
                const func = this.#callStack[fnName];
                if (typeof func === "function") { func.bind(this)(); }
            });
            this.#callStack = {};
        }
    }


    _ready() {
        this.#isReload = true; // Force first render
        this.#onInit();
        this.call_deferred("afterReady");
    }


    afterReady() {
        const resetChildrenAnchors = () => {
            // Set pass on each children to avoid losing
            // hover/active/focus on children mouse events
            const passFilter = MOUSE_FILTER.PASS;
            this.mouse_filter = passFilter;
            this.rect_clip_content = true;
            const walker = (element) => {
                const children = element.get_children();
                if (!children || children.length === 0) return;
                children.forEach((child) => {
                    child.mouse_filter = passFilter;
                    if (!children.compound) {
                        const anchorSum = children.anchor_left + children.anchor_top + children.anchor_right + children.anchor_bottom;
                        if (anchorSum  === 0) {
                            ["anchor_left, anchor_top"].forEach((prop)     => { children[prop] = 0; });
                            ["anchor_right, anchor_bottom"].forEach((prop) => { children[prop] = 1; });
                        }
                    }
                    walker(child);
                });
            };
            walker(this);
        };

        const getNearest2Dparent = () => {
            // Set in deferred to give it time to draw
            // otherwise parent.rect_size{ x, y } = 0
            let parent = null;
            const root = this.get_tree().edited_scene_root;
            let cursor = this.get_parent();
            while(cursor) {
                if (cursor.rect_size) { parent = cursor; cursor = null; }
                else if (cursor === root) { cursor = null; }
                else { cursor = cursor.has_method("get_parent") ? cursor.get_parent() : null; }
            }
            return parent;
        };

        Lib.init(this);
        resetChildrenAnchors();
        this.#font   = new FontClass(this, ROOT_FONT_SIZE);
        this.theme   = null;
        this.#parent = getNearest2Dparent() || this.get_parent();
        this.#ready  = true;
        this.#loadCSS();
    }


    reload() { this.#isReload = true; this.#buildClasses(); }
    #loadCSS() {
        if (!this.#ready) return;
        this.states = {};
        this.currentState = JSON.parse(JSON.stringify({ ...this.#initialState }));
        this.#currentStateName = "init";
        const declared = this.#getDeclaredCSSRules();
        const inline = this.#getInlineCSSRules();

        const rules = {};
        const statesNames = Array.from(new Set([...Object.keys(declared), ...Object.keys(inline)]));
        let hasFilter = false;

        statesNames.forEach((stateName) => {
            const declaredRules = declared[stateName] || {};
            const inlineRules   = inline[stateName]   || {};
            if (!hasFilter) {
                hasFilter = !!declaredRules["backdrop-filter.blur"] || !!inlineRules["backdrop-filter.blur"];
            }

            rules[ stateName ] = {
                ...declaredRules,
                ...inlineRules,
            };
        });
        this.#states = rules;
        const customMergers = [ // Merge objects with [ target ] priority 
            "transition"
        ];
        const otherStates = Object.keys(this.#states).filter(e => e !== "_default");
        if (this.#states._default) {
            this.#states._default = { ...this.currentState, ...this.#states._default };
            INHERITED_PROPS.forEach((prop) => {
                if (this.#states._default[prop]) {
                    otherStates.forEach((state) => {
                        if (typeof this.#states[ state ][ prop ] === "undefined") {
                            this.#states[ state ][ prop ] = this.#states._default[prop];
                        }
                    });
                }
            });

            customMergers.forEach((prop) => {
                if (this.#states._default[prop]) {
                    otherStates.forEach((state) => {
                        this.#states[ state ][ prop ] = { ...this.#states._default[prop], ...(this.#states[ state ][ prop ] || {}) };
                    });
                }
            });
        }

        this.hasFilter = hasFilter;
        this.material = hasFilter ? this.#material : null;
        if (hasFilter) {
            this.#style.bg_color = new godot.Color(0,1,0,0);
        }

        this.#setState();
    }


    #getDeclaredCSSRules() {
        if (this.compound && (this.compound.class || this.compound.id)) {
            let path = [];
            let current = this;
            while(current && current.get_parent) {
                if (current.compound) {
                    path.push(current.compound);
                }
                current = current.get_parent();
            }
            return Lib.getRules(path.reverse(), this) || {};
        }
        return {};
    }

    #getInlineCSSRules() {
        if (!this.#inline_css || this.#inline_css.length === 0) return {};
        const name  = this.#selfCSSname;
        const rules = Lib.parseCSS(this.#inline_css);
        if (rules && rules.compounds && rules.compounds[ name ] && rules.compounds[ name ].states && rules.compounds[ name ].states._default) {
            return rules.compounds[ name ].states;
        }
        return {};
    }

    #getState() {
        let state = "_default";
        if (this.#mouseEvent.hover  && this.#states["hover"])  { state = "hover";  }
        if (this.#mouseEvent.focus  && this.#states["focus"])  { state = "focus";  }
        if (this.#mouseEvent.focus  && this.#states["hover"])  { state = "hover";  }
        if (this.#mouseEvent.active && this.#states["active"]) { state = "active"; }
        return state;
    }

    #setState() {
        const state = this.#getState();
        if (!this.#ready) return;
        if (this.#currentStateName === state) return;
        if (!this.#states[ state ]) return;

        this.#setNextStateValues(this.#states[ state ], state);
    }

    #reloadState() {
        if (this.#currentStateName !== "init" && this.#states[ this.#currentStateName ]) {
            this.#isReload = true;
            this.#setNextStateValues(this.#states[ this.#currentStateName ], this.#currentStateName);
        }
    }


    #setNextStateValues(_nextState, name) {
        let nextState = JSON.parse(JSON.stringify(_nextState));
        const cs = JSON.parse(JSON.stringify(this.currentState));
        const parentRect = this.#parent.rect_size ? this.#parent.rect_size : this.get_viewport_rect().size;
        const p_x = parentRect.x;
        const p_y = parentRect.y;
        const v_val = {
            w: p_x * 0.01,
            h: p_y * 0.01,
            min: (p_x > p_y ? p_y : p_x) * 0.01,
            max: (p_x > p_y ? p_x : p_y) * 0.01
        };
        // Will be inherited from node tree
        const fontSize = nextState["font-size"] ? nextState["font-size"].v : (this.get_theme_default_font() || { size: ROOT_FONT_SIZE }).size;

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

        const Calc = (cssArray, prop) => {
            if (!Array.isArray(cssArray)) return 0;
            const parentValue = parentPercent[prop] ? parentPercent[prop](1) : 0;
            const str = cssArray.map((s) => s[0] === "%" ? s.replace("%", parentValue+"*") : s).join("");
            return eval(str); // string has been sanitized by the parser
        };

        const Unit = {
            "%": (val, prop, v) =>  parentPercent[prop] ? parentPercent[prop](val/100) : 0,
            "em": (val, prop) => fontSize * val,
            // "ex": (val, prop) => {},
            // "ch": (val, prop) => {},
            "px": (val) => val,
            "rem": (val) => val * ROOT_FONT_SIZE,
            "vw": (val) => val * v_val.w,
            "vh": (val) => val * v_val.h,
            "vmin": (val) => val * v_val.min,
            "vmax": (val) => val * v_val.max,
        };

        const Val = (prop, sub) => {
            const val = sub ? nextState[prop][sub] : nextState[prop];
            if (val.calc) { return Calc(val.calc, sub || prop); }
            if (typeof val === "number") return val;
            if (val.p) return parentPercent[prop] ? parentPercent[prop](val.v) : val.v;
            if (val.u) return Unit[val.u](val.v, prop, val);
            return val.v;
        };

        const applyValues = {
        //  this    <----- p stands for prop, aka this (see arrow to left)
            "left":       (p) => { const val = Val(p)/p_x; cs.anchor_right = cs.anchor_left = val; },
            "top":        (p) => { const val = Val(p)/p_y; cs.anchor_top = cs.anchor_bottom = val; },
            "width":      (p) => { const val = Val(p); cs.margin_left = 0; cs.margin_right + val; cs.width = val; },
            "height":     (p) => { const val = Val(p); cs.margin_top = 0; cs.margin_bottom + val; cs.height = val; },
            "max-width":  (p) => { const val = Val(p); if (cs.width  > val) { cs.margin_right = val; cs.width  = val; } },
            "min-width":  (p) => { const val = Val(p); if (cs.width  < val) { cs.margin_right = val; cs.width  = val; } },
            "max-height": (p) => { const val = Val(p); if (cs.height > val) { cs.margin_bottom = val; cs.height = val; } },
            "min-height": (p) => { const val = Val(p); if (cs.height < val) { cs.margin_bottom = val; cs.height = val; } },
            "right":      (p) => {
                const val = Val(p);
                if (nextState.left) { cs.width = p_x - (Val("left")+val); cs.margin_right = cs.width; }
                else if (nextState.width) { cs.anchor_right = cs.anchor_left = (p_x-(val+cs.width))/p_x; }
                cs.margin_right = cs.width;
            },
            "bottom":     (p) => {
                const val = Val(p);
                if (nextState.top) { cs.height = p_y - (Val("top")+val); cs.margin_bottom = cs.height; }
                else if (nextState.height) { cs.anchor_top = cs.anchor_bottom = (p_y-(val+cs.height))/p_y; }
                cs.margin_bottom = cs.height;
            },


            "opacity":              (p) => { cs.modulate = [ 1.0, 1.0, 1.0, Val(p) ]; },
            "cursor":               (p) => { cs.mouse_default_cursor_shape = GDCursors[ nextState[p] ]; },
            "background-color":     (p) => { if (this.hasFilter) { cs.material["set_color"] = nextState[p] } else { cs.style["bg_color"] = nextState[p]; } },
            "border-radius":        (p) => { Object.keys(nextState[p]).forEach((key) => { cs.style[ "corner_radius_"+key ] = nextState[p][key].v; }); },
            "border-width":         (p) => { [ "left", "right", "top", "bottom" ].forEach((param) => { cs.style[ "border_width_" + param ] = nextState[ p ].v; }); },
            "border-color":         (p) => { cs.style.border_color = nextState[ p ]; },

            "transform.scale":      (p) => { cs.rect_scale = nextState[p]; },
            "transform.translate":  (p) => { const val = nextState[p]; cs.margin_left = cs.width*val.x; cs.margin_right = cs.width*(1+val.x); cs.margin_top = cs.height*val.y; cs.margin_bottom = cs.height*(1+val.y); },
            "transform-origin":     (p) => { const val = nextState[p]; cs.rect_pivot_offset = { x: Math.round(cs.width*val.x), y: Math.round(cs.height*val.y) }; },
            "backdrop-filter.blur": (p) => { cs.material[ "blur_amount" ] = parseFloat(Val(p) ? Val(p)/2 : 0); },
            "box-shadow.size":      (p) => { cs.style.shadow_size   = Val(p); },
            "box-shadow.color":     (p) => { cs.style.shadow_color  = nextState[p]; },
            "box-shadow.offset":    (p) => { cs.style.shadow_offset = nextState[p]; },
            "color":                (p) => { if (!cs.font) { cs.font = {}; } cs.font.color = nextState[p]; },
            "font-size":            (p) => { if (!cs.font) { cs.font = {}; } cs.font.size  = Val(p); },
            "font-family":          (p) => { if (!cs.font) { cs.font = {}; } cs.font.name  = nextState[p]; },
            "overflow":             (p) => { const val = nextState[p]; cs.rect_clip_content = val === "hidden"; },
        };

        if (!applyValuesKeys) { applyValuesKeys = Object.keys(applyValues); }

        if (nextState.display !== "none" && !(nextState.opacity && nextState.opacity.v === 0)) {
            this.visible = true;
            applyValuesKeys.forEach((prop) => {
                if (nextState[ prop ]) { applyValues[prop](prop); }
            });
            cs.transition = nextState.transition || {};
            this.#applyCurrentState(cs, name);
        } else {
            this.visible = false;
        }
    }


    #applyCurrentState(nextState, name) {
        if (!this.#theme && nextState.font) {
            this.#theme = new godot.Theme();
            this.theme = this.#theme;
        }

        const current  = this.currentState;
        const methods  = {
            // State objects reflect this private values
            // eg; nextState.style.prop = this.#style.prop
            material: this.material,
            style: this.#style,
            font: this.#font,
        };


        const animates = this.#firstStateLoaded ? nextState.transition : {};
        this.hasAnimation = false;
        this.animations = [];

        MODIFIERS.forEach((def) => {
            const sourceName = def[0];  const method     = def[1];
            const allProps   = def[2];  const methodName = method.name;

            const source  = sourceName ? nextState[ sourceName ] : nextState;
            const kurrent = sourceName ? current[ sourceName ]   : current;
            const applyTo = sourceName ? methods[ sourceName ]   : this;

            allProps.forEach((prop) => {
                if (!source || typeof source[prop] === "undefined") return;
                const nextValue = source[ prop ];
                const path = sourceName ? sourceName+"."+prop : prop;
                // isReload -> force reload even is values are the same
                if (this.#isReload || (typeof kurrent[ prop ] === "undefined" || kurrent[ prop ] !== nextValue)) {
                    if (!godot.Engine.editor_hint && !this.#isReload  && this.#firstStateLoaded && animates[ path ]) {
                        this.hasAnimation = true;
                        const anim = new Animation(kurrent[ prop ] || 0, nextValue, applyTo, animates[ path ].time, prop, methodName, animates[ path ].easing, sourceName);
                        this.animations.push(anim);
                    } else {
                        const val = method(nextValue);
                        if (sourceName === "material") { applyTo.set_shader_param(prop, val); }
                        else { applyTo[ prop ] = val; }
                    }
                }
            });
        });

        this.#isReload = false;
        this.#firstStateLoaded = true;
        this.currentState = nextState;
        this.#currentStateName  = name;
    }

    _exit_tree() {
        this.material = null;
        this.#material.shader = null;
        this.#material = null;
    }

    _process(delta) {
        if (this.hasAnimation) {
            this.animations = this.animations.map(anim => { anim.play(delta); return anim; }).filter(anim => !anim.ended);
            this.hasAnimation = this.animations.length > 0;
        }
    }

}

godot.set_script_tooled(CSS, true);
godot.register_property(CSS, "_ID",  { type: String, hint: godot.PROPERTY_HINT_PLACEHOLDER_TEXT, hint_string: "Element ID, accpets only one", default: "" });
godot.register_property(CSS, "_class",  { type: String, hint: godot.PROPERTY_HINT_PLACEHOLDER_TEXT, hint_string: ".class1 .class2", default: "" });
godot.register_property(CSS, "inline_CSS/text",  { type: String, hint: godot.PROPERTY_HINT_MULTILINE_TEXT, default: "" });