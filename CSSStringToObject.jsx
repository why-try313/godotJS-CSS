import Parser from "res://addons/div/css/Utils/CSS_Parser.js"

const rex = {
    px: /^-?[0-9]+(\.[0-9]+)?px$/,
    var: /^var\(--[a-zA-Z]+\)$/,
    number: /^-?[0-9]+(\.[0-9])?$/,
    percent: /^-?[0-9]+(\.[0-9]+)?%$/,
    pxOrPercent: /^-?[0-9]+(\.[0-9]+)?(px|%)?$/,
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

    percentsAxis: (_str) => {
        let hasErrors = false;
        const axis = _str.trim().split(",").map(e => e.trim()).map((value) => {
            if (value.match(rex.percent)) { return parseFloat(value)/100; }
            hasErrors = true; return undefined;
        }).filter(e => typeof e === "number");
        if (hasErrors) return undefined;
        if (axis.length < 1 || axis.length > 2) return undefined;
        if (axis.length === 1) return { x: axis[0], y: axis[0] };
        if (axis.length === 2) return { x: axis[0], y: axis[1] };
    },
};


const isValidCSSValue = (value, prop, vars) => {
    if (value.match(rex.var)) {
        value = vars[ value.replace(/^var\(/, "").replace(/\)$/, "").trim() ];
    }

    const { px, percent, pxOrPercent, percentsAxis } = valueValidation;

    const transforms = {
        "width":  pxOrPercent,     "height": pxOrPercent,
        "left":   pxOrPercent,     "right":  pxOrPercent,
        "top":    pxOrPercent,     "bottom": pxOrPercent,
        "max-width": pxOrPercent,  "min-width": pxOrPercent,
        "max-height": pxOrPercent, "min-height": pxOrPercent,
        "transform.translate": percentsAxis,
        "transform.scale": percentsAxis,
        // background-color
        // box-shadow      -- separator = space
        // border          -- separator = space
        // backdrop-filter -- separator = space
        // transform       -- separator = space
    };

    if (!transforms[prop]) { return false; }
    return transforms[prop](value);
};


// To avoid declarations conflicts
const conflictsDeclarations = [
    //       check if has all props     = removed prop
    { has: [ "width", "left", "right"  ], remove: [ "right" ] },
    { has: [ "height", "top", "bottom" ], remove: [ "bottom" ] },
];


// extracts values like: 'translate() scale()' into [ [functionName, value]* ];
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

const areAllowedFunctions = (extractFunctionValues, functionsAllowedArray) => {
    let hasErrors = false;
    extractFunctionValues.forEach((fnAndValue) => {
        if (functionsAllowedArray.indexOf(fnAndValue[0]) < 0) {
            hasErrors = true;
        }
    });
    return !hasErrors;
}

const turnPropIntoSubproperties = {
    "backdrop-filter": (value) => {
        const functions = extractFunction(value, " ");
        const allowed = [ "blur","brightness","contrast","drop-shadow",
        "grayscale","hue-rotate","invert","opacity","sepia","saturate" ];
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
};


const CSStringToObject = (str) => {
    const css = Parser(str);
    if (!css || !css.stylesheet || !css.stylesheet.rules) return;
    let rules = css.stylesheet.rules.filter(rule => rule.type === "rule");
    if (rules.length === 0) return;

    rules = rules.map((rule) => {
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
            console.log(errorString+", "+propertyErrors);
            conflict.remove.forEach((removeProp) => {
                delete declarations[ removeProp ];
            });
        });

        rule.declarations = declarations;

        return {
            selectors: rule.selectors,
            declarations: rule.declarations
        };
    });

    const classes = {};
    const defaultState = {
        // prop   value, percent
        width:  { v: 20, p: false },
        height: { v: 20, p: false },
        top:    { v: 0,  p: false },
        left:   { v: 0,  p: false }
    };

    rules.forEach((rule) => {
        rule.selectors.map((select) => {
            return select.split(":");
        }).forEach((select) => {
            const className = select[0];
            let state = select[1] || "_default";
            if (!classes[ className ]) { classes[ className ] = { states: { _default: defaultState } }; }
            if (!classes[ className ].states[ state ]) { classes[ className ].states[ state ] = {}; }

            classes[ className ].states[ state ] = {
                ...classes[ className ].states[ state ],
                ...rule.declarations
            };
        });
    });

    return classes;
};

export default CSStringToObject;