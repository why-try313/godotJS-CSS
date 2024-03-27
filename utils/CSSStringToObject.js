import Parser from "./CSS_Parser.js";
import Colors from "./CSS_Colors.js";
import { CSSCursors, defaultMedia } from "./CSS_Constants.js";
import animEasing           from "./Animation/Easings.js";
import TransitionsConverter from "./Animation/TransitionsConverter.js";

const rex = {
    px: /^-?[0-9]+(\.[0-9]+)?px$/,
    var: /var\(--[a-zA-Z]+\)/g,
    float: /^-?[0-9]+(\.[0-9]+)?$/,
    number: /^-?[0-9]+(\.[0-9])?$/,
    percent: /^-?[0-9]+(\.[0-9]+)?%$/,
    pxOrPercent: /^-?[0-9]+(\.[0-9]+)?(px|%)?$/,

    hex: /^\#[0-9a-f]{3,8}/i,
    rgb: /^rgb\([\ ]*[0-9]{1,3},[\ ]*[0-9]{1,3},[\ ]*[0-9]{1,3}[\ ]*\)$/i,
    rgba: /^rgba\([\ ]*[0-9]{1,3},[\ ]*[0-9]{1,3},[\ ]*[0-9]{1,3}[\ ]*,[\ ]*[0-1](\.[0-9]+)?[\ ]*\)$/i,
};

const valueValidation = {
    px: (value) => {
        return value.trim().match(rex.px) ? { v: parseFloat(value), p: false } : null;
    },
    float: (value) => {
        return value.trim().match(rex.float) ? { v: parseFloat(value), p: false } : null;
    },
    percent: (value) => {
        return value.trim().match(rex.percent) ? { v: parseFloat(value)/100, p: true } : null;
    },
    pxOrPercent: (value) => {
        if (typeof value === "number") return { v: value, p: false };

        const match = value.trim().replace(/^\./, "0.").match(rex.pxOrPercent);

        if (!match) return undefined;
        let res = undefined;
        if (value.indexOf("%") > -1) { res = { v: parseFloat(value)/100, p: true }; }
        else if (value.match(rex.number) || value.indexOf("px") > -1) { res = { v: parseFloat(value), p: false }; }
        return res;
    },

    getAxis(_str, type, separator = ",", setAxis = ["x", "y"]) {
        let hasErrors = false;
        const splitValues = _str.trim().split(separator).map(e => e.trim());
        const axis = splitValues.map((value) => {
            if (value.match(rex[ type ])) {
                const result = parseFloat(value)/(type === "percent" ? 100 : 1);
                if (type === "pxOrPercent") {
                    return { v: result, p: value.indexOf('%') > -1 };
                }
                return result;
            }
            hasErrors = true; return undefined;
        }).filter(e => {
            return (typeof e === "number") || (typeof e === "object" && typeof e.v === "number");
        });

        if (hasErrors) return undefined;
        if (axis.length < 1 || axis.length > setAxis.length) return undefined;
        const maxLen = axis.length;
        const result = {};
        if (maxLen === 2 && setAxis.length === 4) {
            [ setAxis.slice(0, 2), setAxis.slice(2, 4) ].forEach((group, index) => { group.forEach((_axis) => { result[ _axis ] = axis[ index ]; }); });
        } else {
            setAxis.forEach((_axis, index) => { result[ _axis ] = axis[ index > (maxLen-1) ? maxLen-1 : index ]; });
        }
        return result;
    },

    pxAxis:          (_str) => valueValidation.getAxis(_str, "px"),
    percentsAxis:    (_str) => valueValidation.getAxis(_str, "percent"),
    floatAxis:       (_str) => valueValidation.getAxis(_str, "float"),
    directionsAxis:  (_str) => valueValidation.getAxis(_str, "pxOrPercent", /[\ ]{1,}/g, [ "top_left","bottom_right","top_right","bottom_left" ]),
    color: (str) => {
        if (Colors[str]) { return Colors[str]; }
        const isHex  = str.trim().match(rex.hex);
        const isRGB  = str.trim().match(rex.rgb);
        const isRGBA = str.trim().match(rex.rgba);

        let res = undefined;
        let hasValuesOverOneOrLessZero = false;
        if (isHex) {
            let color = str.replace("#", "");
            if (color.length === 3) { color = color.split("").map(c => c+c).join(""); }
            if (color.length === 6) { color = color+"FF";/* alpha */ }
            if (color.length === 8) { res = color.split(/([a-f0-9]{2})/i).filter(Boolean).map(c => parseInt(c, 16)/255); }
        } else if (isRGB) {
            res = [ ...str.match(/\(([^\)]+)\)/)[1].split(",").map(c => parseInt(c)/255), 1 /* alpha */ ];
        } else if (isRGBA) {
            res = str.match(/\(([^\)]+)\)/)[1].split(",").map((c, i) => { return ( i !== 3 ? parseInt : parseFloat )(c) / (i !== 3 ? 255 : 1); });
        }

        if (res) { res.forEach((num) => { if (num < 0 || num > 1) { hasValuesOverOneOrLessZero = true; } }); }
        if (hasValuesOverOneOrLessZero) { res = undefined; }
        return res;
    },
    calc: (calcstr) => {
        const isCalc = calcstr.match(/^calc\((.*)\);?$/);
        if (!isCalc || !isCalc[1]) throw new Error(`calc expression failed`);
        const str = isCalc[1]
            .replaceAll(/-?[0-9]+(\.[0-9]+)?px/g, (x) => parseFloat(x))
            .replaceAll(/-?[0-9]+(\.[0-9]+)?%/g, (x) => "$%"+(parseFloat(x)/100)+"$")
            .split("$").filter(s => s.length > 0);
        const isSafe = !!str.join("").match(/^[0-9\.\(\)\/\+\-\*\%\ ]+$/);
        if (!isSafe) throw new Error(`Expression "${ calcstr }" contains unallowed characters`);
        return str;
    }
};


// extracts values like: 'transform: translate(val) scale(val)' into [ [functionName, value], * ];
const extractFunction = (str, separator) => {
    const rex = new RegExp("[a-z-]+\\\([^\)]+\\\)[\ ]*"+separator+"[\ ]*", "ig");
    const fns = (str+separator).match(rex);
    if (!fns) return null;
    return fns.map((declaration) => {
        const decAndVal = declaration.split("(");
        decAndVal[1] = decAndVal[1].trim().replace(/\)$/, "");
        return decAndVal;
    });
};

// Checks if extractFunction values function is in allowed array
const areAllowedFunctions = (extractFunctionValues, functionsAllowedArray) => {
    let hasErrors = false;
    extractFunctionValues.forEach((fnAndValue) => {
        if (functionsAllowedArray.indexOf(fnAndValue[0]) < 0) {
            hasErrors = true;
        }
    });
    return !hasErrors;
};



// To avoid declarations conflicts
const conflictsDeclarations = [
    //       check if has all props     = removed prop
    { has: [ "width", "left", "right"  ], remove: [ "right" ] },
    { has: [ "height", "top", "bottom" ], remove: [ "bottom" ] },
];


const isValidCSSValue = (value, prop, vars) => {
    if (value.match(rex.var)) {
        value = value.replaceAll(rex.var, (newVal) => {
            const name = newVal.replace(/^var\(/, "").replace(/\)$/, "").trim();
            return typeof vars[ name ] !== "undefined" ? vars[ name ] : newVal;
        });
    }

    const acceptsCalc = [
        "width",  "left", "right",  "max-width",  "min-width",
        "height", "top",  "bottom", "max-height", "min-height"
    ];

    const {
        px, pxOrPercent, color, float, calc,
        percentsAxis, pxAxis, floatAxis, directionsAxis
    } = valueValidation;
    if (value.indexOf("calc(") === 0) {
        if (acceptsCalc.indexOf(prop) < 0) {
            console.log(`property "${ prop }" doesn't accept calc functions`);
            return 0;
        }
        try {
            const res = calc(value);
            return { calc: res };
        } catch(error) {
            console.log(error);
            return 0;
        }
    }

    const transforms = {
        "width":  pxOrPercent,     "height": pxOrPercent,
        "left":   pxOrPercent,     "right":  pxOrPercent,
        "top":    pxOrPercent,     "bottom": pxOrPercent,
        "max-width": pxOrPercent,  "min-width": pxOrPercent,
        "max-height": pxOrPercent, "min-height": pxOrPercent,
        // transform       -- separator = space
        "transform.translate": percentsAxis,
        "transform.scale": floatAxis,
        "transform-origin": percentsAxis,
        // backdrop-filter -- separator = space
        "backdrop-filter.blur": px,
        "border-radius": directionsAxis,
        // "background": color, §§ turnPropIntoSubproperties=>background
        "background-color": color,
        "border-size": px,
        "border-color": color,
        "opacity": float,
        "cursor": (str) => CSSCursors[str.trim()],
        "display": (str) => [ "block", "inline-block", "inline", "none" ].indexOf(str.trim() > -1) ? str.trim() : null,
        "box-shadow.size": px,
        "box-shadow.color": color,
        "box-shadow.offset": pxAxis,
        "transition": (str) => {
            const props = str.split(/,[\ ]+/g);
            const value = {};
            props.forEach((prop) => {
                const valAndSec = prop.split(/[\ ]+/);
                const propToAnimate = valAndSec[0];
                const duration = valAndSec[1];
                const easing = valAndSec[2] || "linear";
                const propsToAnimate = TransitionsConverter[propToAnimate];
                if (propsToAnimate && duration && duration.trim().match(/^[0-9]{0,}\.?[0-9]+s$/) && animEasing[easing]) {
                    propsToAnimate.forEach((animProp) => {
                        value[ animProp ] = { time: parseFloat(duration.replace(/^\./, '0.').replace(/s$/, "")), easing };
                    });
                }
            });
            return Object.keys(value).length > 0 ? value : undefined;
        },
        // background-color
        // box-shadow      -- separator = space
        // border          -- separator = space
    };

    if (!transforms[prop]) { return false; }
    return transforms[prop](value);
};


const turnPropIntoSubproperties = {
    "backdrop-filter": (value) => {
        const functions = extractFunction(value, " ");
        const allowed = [
            "blur","brightness","contrast","drop-shadow",
            "grayscale","hue-rotate","invert","opacity","sepia","saturate"
        ];
        if (functions && functions.length > 0 && areAllowedFunctions(functions, allowed)) {
            return functions.map((fnAndValue) => {
                fnAndValue[0] = [ "backdrop-filter", fnAndValue[0] ].join(".");
                return fnAndValue;
            });
        }

        return null;
    },
    "transform": (value) => {
        const functions = extractFunction(value, " ");
        const allowed = [ "translate", "rotate", "scale" ];
        const isAllowed = areAllowedFunctions(functions, allowed);
        // propX and propY are disable as it would result on a lot of more code
        if (functions && functions.length > 0 && isAllowed) {
            const fns = functions.map((fnAndValue) => {
                fnAndValue[0] = [ "transform", fnAndValue[0] ].join(".");
                return fnAndValue;
            });
            return fns;
        }

        return null;
    },
    'background': (value) => {
        return [ [ "background-color", value ] ];
    },
    'border': (str) => {
        if (str.trim() === "none") { return [[ "border-size", "0px" ], [ "border-color", "rgba(0,0,0,0)" ]] }

        const two_args = str.trim().split(/[\ ]+/);
        if (two_args.length === 3 && two_args[1] === "solid") {
            return [
                [ "border-size", two_args[0] ],
                [ "border-color", two_args[2] ]
            ];
        }
        return [];
    },
    "box-shadow": (value) => {
        const arr = value.split(/[\ ]+/);
        if (arr.length < 3 || arr.length > 4) return undefined;
        return [
            [ "box-shadow.offset", arr[0]+", "+arr[1] ],
            [ "box-shadow.size", arr[2] ],
            [ "box-shadow.color", arr[3] || "#000000" ],
        ];
    }
};

const extractRules = (rulesArray) => {
    let rootVars = {};
    return rulesArray.map((rule) => {
        const declarations = {};
        const vars = { ...rootVars };
        rule.declarations.filter((dec) => dec.property && dec.property.slice(0,2) === "--").forEach((dec) => {
            vars[ dec.property ] = dec.value;
        });

        const isRootSelector = (rule.selectors || []).filter(e => e === ":root").length > 0;
        if (isRootSelector) {
            rootVars = vars;
            return undefined;
        }

        const tmpDeclaration = {}; // created for turnPropIntoSubproperties
        rule.declarations.forEach((declaration) => {
            if (declaration.value && declaration.property) {
                tmpDeclaration[ declaration.property ] = declaration.value;
            }
        });


        Object.keys(turnPropIntoSubproperties).forEach((key) => {
            if (tmpDeclaration[ key ]) {
                const translates = turnPropIntoSubproperties[key](tmpDeclaration[ key ]);
                if (translates) {
                    translates.forEach((translation) => {
                        tmpDeclaration[ translation[0] ] = translation[1];
                    });
                } else {
                    /* error on declaration */
                }
                delete tmpDeclaration[ key ];
            }
        });


        Object.keys(tmpDeclaration).forEach((property) => {
            const value = tmpDeclaration[ property ];
            if (value) {
                const isValidValue = isValidCSSValue(value, property, vars);
                if (isValidValue) { declarations[ property ] = isValidValue; }
            }
        });

        conflictsDeclarations.forEach((conflict) => {
            let hasConflict = true;
            conflict.has.forEach((prop) => {
                if(!declarations[ prop ]) {
                    hasConflict = false;
                }
            });

            if (!hasConflict) return;
            const errorString    = `Conflict with ${ conflict.has.join(',') }`;
            const propertyErrors = `ignoring ${ conflict.remove.join(', ') } propert${ conflict.remove.length > 1 ? "ies" : "y" }`;
            conflict.remove.forEach((removeProp) => {
                delete declarations[ removeProp ];
            });
        });

        rule.declarations = declarations;

        return {
            selectors: rule.selectors,
            declarations: rule.declarations
        };
    }).filter(Boolean);
};

const CSStringToObject = (str) => {
    const css = Parser(str);
    if (!css || !css.stylesheet || !css.stylesheet.rules) return;

    const allRules  = css.stylesheet.rules.filter(rule => rule.type === "rule" && rule.declarations && rule.declarations.length > 0);
    const allMedias = css.stylesheet.rules.filter(rule => rule.type === "media" && rule.rules && rule.rules.length > 0);
    if (allRules.length === 0) return;

    const classes = {};
    const defaultState = {
        material: {},
        style: {},
        media: null,
    };

    let ID_pre = "ID_";
    let ID_idx = 0;

    extractRules(allRules).forEach((rule) => {
        rule.selectors.map((select) => {
            return select.split(":");
        }).forEach((select) => {
            const className = select[0];
            const state = select[1] || "_default";
            if (!classes[ className ]) { ID_idx++; classes[ className ] = { ID: ID_pre+ID_idx, states: { _default: defaultState } }; }
            if (!classes[ className ].states[ state ]) { classes[ className ].states[ state ] = defaultState; }


            classes[ className ].states[ state ] = {
                ...classes[ className ].states[ state ],
                ...rule.declarations
            };
        });
    });

    // media max-width X only applies if screen is LESS than X
    // media min-width X only applies if screen is MORE than X
    allMedias.map((media) => {
        const hasLimit = media.media && media.media.match(/[a-z]+[\ ]+and[\ ]+\((min|max)-(width|height)[\ ]*:[\ ]*([0-9]+px);?\)$/);
        if (hasLimit && hasLimit[1] && hasLimit[2] && hasLimit[3]) {
            if (!media.rules || media.rules.length === 0) return;
            const limitType  = hasLimit[1]; // min | max
            const limitAxis  = hasLimit[2]; // width | height
            const limitValue = parseFloat(hasLimit[3]); // size px

            extractRules(media.rules).forEach((rule) => {
                rule.selectors.map((select) => {
                    return select.split(":");
                }).forEach((select) => {
                    const className = select[0];
                    const state = select[1] || "_default";
                    if (classes[ className ] && classes[ className ].states[ state ]) {
                        let media = classes[ className ].states[ state ].media;
                        if (!media) {
                            classes[ className ].states[ state ].media = JSON.parse(JSON.stringify(defaultMedia));
                            media = classes[ className ].states[ state ].media
                        }
                        const type          = limitType+'_'+limitAxis;
                        const currentValues = media[ type ] || [];
                        const values        = Array.from(new Set([ ...currentValues, limitValue ]));
                        const currentState  = media[ "_"+type ][ limitValue ] || {};
                        media[ type ] = values;
                        media[ "_"+type ][ limitValue ] = { ...currentState, ...rule.declarations };
                    }
                });
            });
        }
    });


    return classes;
};

export default CSStringToObject;