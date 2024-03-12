import CSStringToObject from "./Utils/CSSStringToObject.jsx";
import { log, getFile, fileExists, FileWatch } from "./Utils/utils.js";

class ClassesLib {
    #rootFolder = "res://css";
    #rootFile = "res://css/style.css";
    #states = {};
    #compounds = [];
    #shortPaths = {
        // .class/#id: [ index, index, ... ]
    };
    // Trigger on reload
    #elements = {};

    constructor() {
        this.nodeInTree = null;
        this.fileWatch = new FileWatch(100);
        this.getMainCSSFile = this.getMainCSSFile.bind(this);
        this.fileWatch.onChange(this.getMainCSSFile);

        try {
            this.#getMainCSSFile();
        } catch(e) {
            console.log(e);
        }
    }

    getMainCSSFile() {
        this.#getMainCSSFile();
        Object.values(this.#elements).forEach(e => {
            e.reload();
        });
    }

    init(Node) {
        if (!this.nodeInTree) {
            this.nodeInTree = Node.get_node("/root");
            this.deferred();
        }
    }

    async deferred() {
        this.fileWatch.setRoot(this.nodeInTree);
    }

    #isSelector(obj) {
        if (typeof obj !== "object") return false;
        if (!obj.id && !obj.class) return false;
        if (!Array.isArray(obj.class) && !Array.isArray(obj.id)) return false;
        return true;
    }

    #getIndexOf(selector, source) {
        let index = -1;
        const len = source.length;
        if (!this.#isSelector(selector)) return index;
        const idSelectors    = selector.id    || [];
        const classSelectors = selector.class || [];

        for(let i = 0; i < len; i++) {
            const src = source[i].selector;
            if (!this.#isSelector(src)) continue;
            const idSrc    = src.id    || [];
            const classSrc = src.class || [];

            const sourceId      = idSrc.filter(e => idSelectors.indexOf(e) > -1).length;
            const sourceClass   = classSrc.filter(e => classSelectors.indexOf(e) > -1).length;
            const hasClassAndID = sourceId + sourceClass;
            if (hasClassAndID > 0 && classSelectors.length >= sourceClass && idSelectors.length >= sourceId) {
                index = i; break;
            }
        }

        return index;
    }

    // Replace imports by their css file
    #extractImportsOnCSSFile(file) {
        let imports = {};

        // Do not apply recursive imports, style.css should
        // be the only one to import to avoid conflicts

        if (file.indexOf("@import ") < 0) return file;
        const result = file.split("\n").map((line) => {
            if (line.indexOf("@import") < 0) return line;

            const isReallyImport = line.match(/^[\t\ ]*@import[\t\ ]+"(.*\.css)";$/);
            if (!isReallyImport) return line;

            const file = line.trim().split(/[\t\ ]*@import[\t\ ]+"/).pop().replace(/^\//, "res://").replace(/^\.\//, this.#rootFolder+"/").replace(/\";$/, '');
            const filePath = file.indexOf("res://") === 0 ? file : this.#rootFolder+"/"+file;
            if (fileExists(filePath)) {
                if (imports[filePath]) {
                    console.log(`Warning! File ${ filePath } inserted more than once`);
                }
                imports[filePath] = true;
                return getFile(filePath)+"\n";
            } else {
                console.log(`Warning: File ignored - "${ filePath }" not found.`);
                return "";
            }
        }).join('\n');

        this.fileWatch.files = [ ...Object.keys(imports), this.#rootFile ];

        return result;
    }

    #getMainCSSFile() {
        const file  = getFile(this.#rootFile);
        const fileWithImports = this.#extractImportsOnCSSFile(file);
        const rules = this.parseCSS(fileWithImports);
        if (!rules || Object.keys(rules).length === 0) throw new Error("No rules found");

        this.#states = {};
        this.#compounds = [];
        this.#shortPaths = {};

        const compounds = Object.keys(rules).map((identifier) => {
            const declaration = rules[ identifier ];
            const ID = declaration.ID;
            if (!this.#states[ ID ]) { this.#states[ ID ] = declaration.states; }
            const selectors = identifier.split(/[\ ]+/g);
            return selectors.map((path) => {
                const isValidSelector = path.match(/^([#\.]{1}[^#\.]+)+$/g);
                if (!isValidSelector) throw new Error("wrong selectors " + identifier);

                const result = { class: [], id: [], rule: ID };
                const groups = path.match(/[#\.]{1}[^#\.]+/g);
                groups.forEach((word) => {
                    const type = word[0] === "." ? "class" : "id";
                    result[ type ].push(word.replace(/^[\.#]/, ""));
                });

                if (result.id.length    === 0) { delete result.id; }
                if (result.class.length === 0) { delete result.class; }
                if (!result.id && !result.class) throw new Error('Error in parsing selectors');

                return result;
            });
        });


        const injectInShortPaths = (indexPath, pathData) => {
            if (pathData.class) {
                pathData.class.forEach((path) => {
                    if (!this.#shortPaths[ "."+path ]) { this.#shortPaths[ "."+path ] = []; }
                    this.#shortPaths[ "."+path ].push(indexPath);
                });
            }
            if (pathData.id) {
                pathData.id.forEach((path) => {
                    if (!this.#shortPaths[ "#"+path ]) { this.#shortPaths[ "#"+path ] = []; }
                    this.#shortPaths[ "#"+path ].push(indexPath);
                });
            }
        };


        compounds.map((paths) => {
            let cursor = this.#compounds;
            const indexPath = [];
            const maxPath = paths.length - 1;
            paths.forEach((path, pathIndex) => {
                let objIndex = this.#getIndexOf(path, cursor);
                if (objIndex < 0) {
                    objIndex = cursor.length;
                    const pathWithoutRule = { ...path };
                    delete pathWithoutRule.rule;
                    cursor.push({ selector: pathWithoutRule });
                }

                indexPath.push(objIndex);

                if (pathIndex < maxPath && !cursor[ objIndex ].children) {
                    cursor[ objIndex ].children = [];
                } else if ( pathIndex === maxPath ){
                    cursor[ objIndex ].rules = path.rule;
                    injectInShortPaths(indexPath, path);
                }

                cursor = cursor[ objIndex ].children;
            });
        });
    }

    parseCSS(str) {
        let rules = null;
        try {
            rules = CSStringToObject(str);
        } catch(e) { console.log("ERROR", e); }
        return rules;
    }


    #findCompound(_element, _CSSdefintiion) {
        const source = { class: [], id: [], ..._element };
        const target = { class: [], id: [], ..._CSSdefintiion };
        if (source.class.length+source.id.length === 0) return false;

        const hasClasses = source.class.filter(e => target.class.indexOf(e) > -1).length;
        const hasId      = source.id.filter(e => target.id.indexOf(e) > -1).length;
        return (hasClasses >= target.class.length && hasId >= target.id.length);
    }

    #pathResolver(elementPathFromRoot) {
        // elementPathFromRoot expects an array of each id+class from root to current element
        // each array entry being an object containing either { class }, { id } or both { class, id } 
        if (!Array.isArray(elementPathFromRoot)) throw new Error(`PathResolver expects an Array, ${ typeof elementPathFromRoot } given`);
        const areAllSelectors = elementPathFromRoot.map((p) => this.#isSelector(p)).filter(e => e === false).length === 0;
        if (!areAllSelectors) {
            const error = [
                `Element path not formed correctly, please make sure either class or ID are Arrays`,
                `\tElement path: ${ JSON.stringify(elementPathFromRoot) }`
            ];
            throw new Error(error.join('\n'));
        }


        // The main element, tree doesn't crawl if empty - Next implementation
        // will be children application but for now a kill switch if empty
        const masterSelect = elementPathFromRoot.pop();
        const trail = elementPathFromRoot;

        const rules = {};
        let hasRules = false; // rules Switch

        // Quick selection of built shortpaths that crawl this.paths to avoid having to crawl
        // all this.paths object - returns an aray of index that match this.paths trail
        const pathsDict = {};
        (masterSelect.class || []).forEach((id) => { if (this.#shortPaths["."+id]) { pathsDict[this.#shortPaths["."+id].join(",")] = true; } });
        (masterSelect.id    || []).forEach((id) => { if (this.#shortPaths["#"+id]) { pathsDict[this.#shortPaths["#"+id].join(",")] = true; } });
        const pathsIndexes = Object.keys(pathsDict).map((e) => e.split(",").map(n => parseInt(n)));

        // eg: [ [0,1,5,0], [5,2], [1,0,7], ... ]
        pathsIndexes.forEach((path) => {
            // A copy of the trail to be popped (.filter(Boolean))
            let trailCopy = [ ...trail ];
            // To identify when masterSelect should be applied
            const lastIndex = path.length - 1;

            // Top level tree
            let cursor = { children: [ ...this.#compounds ] };

            const next = (index) => {
                cursor = cursor.children[ path[index] ];
                if (index === lastIndex) { // Last should be element's selector
                    const hasCompound = this.#findCompound(masterSelect, cursor.selector);
                    if (hasCompound && cursor.rules) {
                        if (!rules[ cursor.rules ]) { rules[ cursor.rules ] = []; }
                        rules[ cursor.rules ].push(path);
                        hasRules = true;
                    }
                } else {
                    let foundCompound = false;
                    // Keep removing trail elements until
                    // they match to one of the seletors
                    // Eg: CSS[ .class1, .class2 ] from Element path[ #id1 > .class1 > #id2 > .class2 ]
                    // 1. trail = #id1 > .class1 > #id2 > .class2
                    // 2. trail = .class1 > #id2 > .class2
                    // 3. next(i++) pass
                    // 4. trail = #id2 > .class2
                    // 5. trail = .class2
                    // 6. End of loop with index === lastIndex
                    for (var i = 0; i < trail.length; i++) {
                        const hasCompound = this.#findCompound(trail[i], cursor.selector);
                        // Remove current anyway as it won't be needed if found
                        trail[i] = undefined;

                        if (hasCompound) {
                            foundCompound = hasCompound;
                            break;
                        }
                    }

                    if (foundCompound) {
                        trailCopy = trail.filter(Boolean);
                        next(index + 1);
                    };
                }
            };
            next(0);
        });

        return hasRules ? Object.keys(rules) : [];
    }

    getRules(path, object) { // Get rules from path
        this.#elements[ object.get_path() ] = object;

        const rules = this.#pathResolver(path);
        let allStyles = {};
        rules.forEach((rule) => {
            allStyles = { ...allStyles, ...this.#states[rule] };
            // /!\ needs a media merger
        });
        return allStyles;
    }
}

const Lib = new ClassesLib();
export default Lib;