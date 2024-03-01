import Parser from "res://addons/div/css/Utils/CSS_Parser.js"

const rex = {
    px: /^-?[0-9]+(\.[0-9]+)?px$/,
    var: /^var\(--[a-zA-Z]+\)$/,
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
    percent: (value) => {
        return value.trim().match(rex.percent) ? { v: parseFloat(value)/100, p: true } : null;
    },
    pxOrPercent: (value) => {
        if (typeof value === "number") return { v: value, p: false };

        const match = value.trim().replace(/^\./, "0.").match(rex.pxOrPercent);

        if (!match) return undefined;
        if (value.match(rex.number) || value.indexOf("px") > -1) { return { v: parseFloat(value), p: false }; }
        else if (value.indexOf("%") > -1) { return { v: parseFloat(value)/100, p: true }; }
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
            setAxis.forEach((_axis, index) => { result[ _axis ] = axis[ index > maxLen-1 ? index : maxLen-1 ]; });
        }
        return result;
    },

    percentsAxis:    (_str) => valueValidation.getAxis(_str, "percent"),
    floatAxis:       (_str) => valueValidation.getAxis(_str, "float"),
    directionsAxis:  (_str) => valueValidation.getAxis(_str, "pxOrPercent", /[\ ]{1,}/g, [ "top_left","bottom_right","top_right","bottom_left" ]),
    color: (str) => {
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
        value = vars[ value.replace(/^var\(/, "").replace(/\)$/, "").trim() ];
    }

    const {
        px, percent, pxOrPercent, color,
        percentsAxis, floatAxis, directionsAxis
    } = valueValidation;

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
            return functions.map((fnAndValue) => {
                fnAndValue[0] = [ "transform", fnAndValue[0] ].join(".");
                return fnAndValue;
            });
        }

        return null;
    },
    'background': (value) => {
        return [ [ "background-color", value ] ];
    }
};

const extractRules = (rulesArray) => {
    return rulesArray.map((rule) => {
        const declarations = {};
        const vars = {};
        rule.declarations.filter((dec) => dec.property && dec.property.slice(0,2) === "--").forEach((dec) => {
            vars[ dec.property ] = dec.value;
        });

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

    const defaultMedia = {
         max_width: [],  min_width: [],  max_height: [],  min_height: [],
        _max_width: {}, _min_width: {}, _max_height: {}, _min_height: {},
    };

    extractRules(allRules).forEach((rule) => {
        rule.selectors.map((select) => {
            return select.split(":");
        }).forEach((select) => {
            const className = select[0];
            const state = select[1] || "_default";
            if (!classes[ className ]) { classes[ className ] = { states: { _default: defaultState } }; }
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