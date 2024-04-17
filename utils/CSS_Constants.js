export const INITIAL_STATE = {
    "margin_left":   0, "margin_right":  20,
    "margin_top":    0, "margin_bottom": 20,

    "width":  20,
    "height": 20,
    "overflow": "visible",
    "transform.scale":     { x: 1, y: 1 },
    "transform.translate": { x: 0, y: 0 },
    "transform-origin":    { x: 0.5, y: 0.5 },
    "cursor": "default",
    "opacity": { v: 1, p: false },
    "box-shadow.size": { v: 0, p: false },
    style: {},
    material: {},
    media: null,
};

// Injected to STATE whenever a valid media is declared in the CSS
export const defaultMedia = {
     max_width: [],  min_width: [],  max_height: [],  min_height: [],
    _max_width: {}, _min_width: {}, _max_height: {}, _min_height: {},
};

export const MOUSE_FILTER = {
    STOP: 0,
    PASS: 1,
    IGNORE: 2,
};


export const CSSCursors = {
    "auto": "arrow",
    "default": "arrow",
    // "none": "",
    // "context-menu": "",
    // "vertical-text": "",
    // "copy": "",
    // "all-scroll": "move",
    "help": "help",
    "alias": "help",
    "pointer": "pointing hand",
    "progress": "busy",
    "wait": "wait",
    "cell": "cross",
    "crosshair": "cross",
    "text": "ibeam",
    "move": "drag",
    "no-drop": "forbidden",
    "not-allowed": "forbidden",
    "n-resize":    "vertical resize", // v
    "s-resize":    "vertical resize", // v
    "ns-resize":   "vertical resize", // v
    "row-resize":  "vertical resize", // v
    "col-resize":  "horizontal resize", // <>
    "e-resize":    "horizontal resize", // <>
    "w-resize":    "horizontal resize", // <>
    "ew-resize":   "horizontal resize", // <>
    "nw-resize":   "main diagonal resize", // <A
    "se-resize":   "main diagonal resize", // v>
    "nwse-resize": "main diagonal resize", // diag top-left - bottom right
    "resize":   "main diagonal resize",
    "ne-resize":   "secondary diagonal resize", // A>
    "sw-resize":   "secondary diagonal resize", // <v
    "nesw-resize": "secondary diagonal resize", // diag bottom-left - top right
};



export const GDCursors = {
    "arrow": 0,         // godot.CURSOR_ARROW,
    "ibeam": 1,         // godot.CURSOR_IBEAM,
    "pointing hand": 2, // godot.CURSOR_POINTING_HAND,
    "cross": 3,         // godot.CURSOR_CROSS,
    "wait": 4,          // godot.CURSOR_WAIT,
    "busy": 5,          // godot.CURSOR_BUSY,
    "drag": 6,          // godot.CURSOR_DRAG,
    "can drop": 7,      // godot.CURSOR_CAN_DROP,
    "forbidden": 8,     // godot.CURSOR_FORBIDDEN,
    "vertical resize": 9, // godot.CURSOR_VSIZE,
    "horizontal resize": 10, // godot.CURSOR_HSIZE,
    "main diagonal resize": 11, // godot.CURSOR_BDIAGSIZE,
    "secondary diagonal resize": 12, // godot.CURSOR_FDIAGSIZE,
    "move": 13,         // godot.CURSOR_MOVE,
    "vertical split": 14, // godot.CURSOR_VSPLIT,
    "horizontal split": 15, // godot.CURSOR_HSPLIT,
    "help": 16,         // godot.CURSOR_HELP,
};

const cursors = {};
Object.keys(CSSCursors).forEach((cursor) => { GDCursors[cursor]; });
export const Cursors = cursors;