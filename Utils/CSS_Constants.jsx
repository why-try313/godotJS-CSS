export const INITIAL_STATE = {
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
        // _max and _min key for quick size comparaison
        max_width: [], min_width: [], max_height: [], min_height: [],
        // actual declarations
        _max_width: {}, _min_width: {}, _max_height: {}, _min_height: {},
    } */
};