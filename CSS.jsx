import CSStringToObject from "./CSSStringToObject.jsx";
import { MOUSE_FILTER, } from "res://addons/div/css/Utils/CSS_Utils.js";
import ShaderMat from "./CSS_material.tres";
import Shader from "./CSS_shader.gdshader";

const _css = `
    element {
        /* --border: 80px; */
        width: 500px;
        height: 140px;
        left: 50%;
        top: 50%;
        transform: translate(-50%,-50%);
    }
    element:hover { height: 200px; }
    element:active { height: 250px; }
`;

export default class CSS extends godot.Panel {

    constructor() {
        super();
        this.currentState = {
            left: 0,   right: 0,
            top: 0,    bottom: 0,
            width: 20, height: 20,
        };
        this.states = {};
        this.parent = null;
        this.currentStateName = "init";
        this.mouseEvent = { hover: false, focus: false, active: false };

        const style = new godot.StyleBoxFlat();
        this.style = style.duplicate();
        this.style.bg_color = new godot.Color(0,1,0,0);
        this.set('custom_styles/panel', this.style);

        this.material = ShaderMat;
        this.material.shader = Shader;
    }

    _onInit() {
        this.mouse_filter = MOUSE_FILTER.PASS; // Pass
        const testState = {
            border: { top: 4, bottom: 4, left: 4, right: 4, color: [1,1,1,0.5] },
            boxShadow: { x: 0, y: 4, size: 8, color: [ 0.0, 0.0, 0.0, 0.2 ] },
            backgroundColor: [ 0.956863, 0.658824, 0.392157, 0.25098 ],
            "transform.translate": { x: 0, y: 0 },
            "backdrop-filter.blur": 5,
        };
        this.material.set("shader_param/blur_amount", testState[ "backdrop-filter.blur" ]/2);
        this.material.set("shader_param/set_color", new godot.Color(...testState.backgroundColor));
        [ "top_left", "top_right", "bottom_right", "bottom_left" ].forEach((param) => {
            this.style[ "corner_radius_" + param ] = 20;
        });

        [ "left", "right", "top", "bottom" ].forEach((param) => {
            this.style[ "border_width_" + param ] = testState.border[ param ];
        });
        this.style["border_color"] = new godot.Color(...testState.border.color);
        this.style.shadow_color = new godot.Color(...testState.boxShadow.color);
        this.style.shadow_size = testState.boxShadow.size;
        this.style.shadow_offset = new godot.Vector2(testState.boxShadow.x, testState.boxShadow.y);
    }

    _ready() {
        this._onInit();
        this.loadCSS = this.loadCSS.bind(this);
        this.reloadState = this.reloadState.bind(this);
        this.call_deferred("loadCSS");
        if (this.get_parent() && this.get_parent().has_signal("resized") && !this.get_parent().css) {
            this.get_parent().connect("resized", this, "reloadState");
        }
        // hover
        this.connect("mouse_entered", this, "onHover", [true ]);
        this.connect("mouse_exited",  this, "onHover", [false]);
        // Keypad hover
        this.connect("focus_entered", this, "onFocus", [true ]);
        this.connect("focus_exited",  this, "onFocus", [false]);

        // mouse clicks, mousedown AND mouseup
        this.connect("gui_input", this, "onClick");
    }

    onHover(val) {
        this.mouseEvent.hover = val;
        this.setState();
    }

    onFocus(val) {
        this.mouseEvent.focus = val;
        this.setState();
    }

    onClick(event) {
        const mouseAction = event.__class__ === "InputEventMouseButton" && event.button_index === 1;
        if (mouseAction) {
            this.mouseEvent.active = event.pressed;
            this.setState();
        }
    }


    setState(_state = "_default") {
        let state = _state;
        if (this.mouseEvent.hover && this.states["hover"])   { state = "hover"; }
        if (this.mouseEvent.focus && this.states["focus"])   { state = "focus"; }
        if (this.mouseEvent.focus && this.states["hover"])   { state = "hover"; }
        if (this.mouseEvent.active && this.states["active"]) { state = "active"; }
        if (this.currentStateName === state) return;
        if (!this.states[ state ]) return;
        this.setNextStateValues(this.states[ state ], state);
    }

    reloadState() {
        if (this.currentStateName !== "init" && this.states[ this.currentStateName ]) {
            this.setNextStateValues(this.states[ this.currentStateName ], this.currentStateName);
        }
    }


    setNextStateValues(_nextState, name) {
        const cs = { ...this.currentState };
        const parent = this.parent;
        const p_x = parent.rect_size.x;
        const p_y = parent.rect_size.y;
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
            left:         () => { cs.margin_left   = Val('left'); },
            top:          () => { cs.margin_top    = Val('top'); },
            width:        () => { const val = Val("width");  cs.margin_right  = cs.margin_left + val; cs.width = val; },
            right:        () => { const val = Val("right");  cs.width  = p_x-(cs.margin_left + val); cs.margin_right = cs.margin_left+cs.width; },
            height:       () => { const val = Val("height"); cs.margin_bottom = cs.margin_top + val; cs.height = val; },
            bottom:       () => { const val = Val("bottom"); cs.height = p_y-(cs.margin_top + val); cs.margin_bottom = cs.margin_top+cs.height; },
            "max-width":  () => { const val = Val("max-width"); if (cs.width > val) { cs.width = val; cs.right = cs.margin_left+cs.width; } },
            "min-width":  () => { const val = Val("min-width"); if (cs.width < val) { cs.width = val; cs.right = cs.margin_left+cs.width; } },
            "max-height": () => { const val = Val("max-height"); if (cs.height > val) { cs.height = val; cs.margin_bottom = cs.margin_top+cs.height; } },
            "min-height": () => { const val = Val("min-height"); if (cs.height < val) { cs.height = val; cs.margin_bottom = cs.margin_top+cs.height; } },
            "translate.transform": () => {
                const val = nextState.translate;
                cs.anchor_left = cs.anchor_right  = (cs.width*val.x) /p_x;
                cs.anchor_top  = cs.anchor_bottom = (cs.height*val.y)/p_y;
            },
        }

        Object.keys(applyValues).forEach((prop) => {
            if (nextState[ prop ]) { applyValues[prop](); }
        });

        this.applyCurrentState(cs, name);
    }


    applyCurrentState(nextState, name) {
        [
            "margin_left", "margin_right", "margin_top", "margin_bottom",
            "anchor_left", "anchor_right", "anchor_top", "anchor_bottom",
        ].forEach((prop) => {
            const nextProp = nextState[prop] || 0;
            // Don't redraw same props - Applies to animation diff
            if (this[ prop ] !== nextProp) {
                this[ prop ] = nextProp;
            }
        });

        this.currentState  = nextState;
        this.currentStateName  = name;
    }


    loadCSS() {
        this.parent = this.get_parent();
        const rules = CSStringToObject(_css);
        if (!rules.element || !rules.element.states._default) return;
        this.states = rules.element.states;

        // Props that will change depending on height or size
        const inheritFromDefault = [ "transform.translate" ];
        const otherStates = Object.keys(this.states).filter(e => e !== "_default");
        if (this.states._default && otherStates.length > 0) {
            inheritFromDefault.forEach((prop) => {
                if (this.states._default[prop]) {
                    otherStates.forEach((state) => {
                        this.states[ state ][ prop ] = this.states._default[prop];
                    });
                }
            });
        }
        this.setState();
    }

}

godot.set_script_tooled(CSS, true);