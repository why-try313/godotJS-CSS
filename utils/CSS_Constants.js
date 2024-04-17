import _INITIAL_STATE   from "./Constants/initialState.js";
import _defaultMedia    from "./Constants/defaultMedia.js";
import _MOUSE_FILTER    from "./Constants/mouseFilter.js";
import _CSSCursors      from "./Constants/cursorsCSS.js";
import _GDCursors       from "./Constants/cursorsGD.js";
import _INHERITED_PROPS from "./Constants/inheritedPropsFromDefault.js";

export const INITIAL_STATE   = _INITIAL_STATE;
export const defaultMedia    = _defaultMedia;
export const MOUSE_FILTER    = _MOUSE_FILTER;
export const CSSCursors      = _CSSCursors;
export const GDCursors       = _GDCursors;
export const INHERITED_PROPS = __INHERITED_PROPS;

const cursors = {};
Object.keys(CSSCursors).forEach((cursor) => { GDCursors[cursor]; });
export const Cursors = cursors;