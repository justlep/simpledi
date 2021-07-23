
const T_FACTORY = 1;
const T_CLASS = 2;
const T_CONST = 3;

class SimpleDi {

    constructor() {
        /**
         * @type {Map<string, SimpleDiRegistryItem>}
         * @todo make this a private instance field (#registry) when dropping support for Node 10
         */
        this._registry = new Map();
        this._ignoreArgsForFinalValue = false;
    }

    /**
     * @param {?string[]} dependencies
     * @param {string} dependee
     * @return {string[]|null}
     * @throws {Error} if given `dependencies` is truthy but no string array
     * @private
     */
    _validateDependencies(dependencies, dependee) {
        if (!dependencies) {
            return null;
        }
        if (!Array.isArray(dependencies)) {
            throw new Error(`Expected dependencies for "${dependee}" to be array of string, but got: ${typeof dependencies}`);
        }
        for (const s of dependencies) {
            if (typeof s !== 'string') {
                let actualTypes = `[${dependencies.map(s => typeof s).join(', ')}]`;
                throw new Error(`Expected dependencies for "${dependee}" to be array of string, but got: ${actualTypes}`);
            }
        }
        // let prevent dependencies to change accidentally after definition
        return dependencies.length ? dependencies.slice() : null;
    }

    /**
     * @param {SimpleDiRegistryItem} regItem
     * @throws {Error}
     * @private
     */
    _handleArgsPassedToFinalValue(regItem) {
        if (!this._ignoreArgsForFinalValue) {
            throw new Error(`di.get("${regItem.name}", ...args) with non-empty args is only allowed as the first di.get() call for this ONCE-dependency. ` +
                            'You can use di.setIgnoreArgsPassedToFinalValue(true) to suppress this error.');
        }
    }

    /**
     * Enables or disables the error which is thrown when calling di.get(name, ...args) with non-empty args
     * more than once, where `name` is a dependency registered via di.registerWithClassOnce() or di.registerWithFactoryOnce().
     * @param {boolean} shouldIgnore - set `true` to disable the error
     */
    setIgnoreArgsPassedToFinalValue(shouldIgnore) {
        this._ignoreArgsForFinalValue = !!shouldIgnore;
    }

    /**
     * @param {string} name
     * @param {*} value
     * @param {number} valueType
     * @param {?string[]} [dependencies] - optional array of dependency names
     * @param {boolean} [overwrite]
     * @param {boolean} [once]
     */
    _register(name, value, valueType, dependencies, overwrite, once = false) {
        if (typeof name !== 'string') {
            throw new Error('Expected dependency name to be string, but got: ' + typeof name);
        }
        if (!overwrite && this._registry.has(name)) {
            throw new Error(`Dependency "${name}" is already registered`);
        }
        if (valueType !== T_CONST && typeof value !== 'function') {
            throw new Error(`Expected a ${valueType === T_CLASS ? 'constructor' : 'factory'} function, but got: ${typeof value}`);
        }
        this._registry.set(name, {
            name,
            value,
            valueType,
            once,
            dependencies: this._validateDependencies(dependencies, name),
            resolvedCounter: 0
        });
    }

    /**
     * @param {string} name
     * @param {*} [args]
     * @return {*}
     */
    get(name, ...args) {
        return this._resolve(name, args);
    }

    /**
     * @param {string} name
     * @param {?*[]} args
     * @param {?string[]} [dependencyChain]
     * @return {*}
     * @private
     */
    _resolve(name, args, dependencyChain) {
        const regItem = this._registry.get(name);
        if (!regItem) {
            throw new Error(`Unknown dependency: ${name}`);
        }
        regItem.resolvedCounter++;

        const hasArgs = args && args.length;

        if (regItem.valueType === T_CONST) {
            if (hasArgs) {
                this._handleArgsPassedToFinalValue(regItem);
            }
            return regItem.value;
        }

        let {dependencies, valueType, value: factoryOrClass} = regItem,
            resolvedDepsPlusArgs = [],
            resolvedValue;

        if (dependencies) {
            (dependencyChain || (dependencyChain = [])).push(name);

            for (let depName of dependencies) {
                if (~dependencyChain.indexOf(depName)) {
                    throw new Error('Circular Dependency detected: ' + [...dependencyChain, depName].join(' => '));
                }
                resolvedDepsPlusArgs.push(this._resolve(depName, null, dependencyChain));
            }
            dependencyChain.pop();
        }

        if (hasArgs) {
            resolvedDepsPlusArgs.push(...args);
        }
        if (valueType === T_FACTORY) {
            resolvedValue = factoryOrClass.apply({}, resolvedDepsPlusArgs);
        } else {
            resolvedValue = new factoryOrClass(...resolvedDepsPlusArgs);
        }
        if (regItem.once) {
            regItem.value = resolvedValue;
            regItem.valueType = T_CONST;
        }
        return resolvedValue;
    }

    /**
     * @return {Object<string, number>} - the returned object is a copy only
     */
    getResolvedDependencyCount() {
        let map = {};
        for (const regItem of this._registry.values()) {
            map[regItem.name] = regItem.resolvedCounter;
        }
        return map;
    }

    // ---------------------- short-hand methods for `register` ------------------------

    /**
     * @param {string} key
     * @param {*} value
     * @param {boolean} [overwrite]
     */
    registerConstant(key, value, overwrite) {
        this._register(key, value, T_CONST, null, overwrite);
    }

    /**
     * @param {Map<string,*>|Object.<string,*>} keyValueMap - a map or pojo containing the key/value pairs to add
     * @param {String} [keyPrefix] - optional prefix to put before the keys
     * @param {boolean} [overwrite]
     */
    registerConstants(keyValueMap, keyPrefix, overwrite) {
        if (keyPrefix && typeof keyPrefix !== 'string') {
            throw new Error('Prefix must be nullish or string');
        }
        keyPrefix = keyPrefix || '';
        for (const [key, value] of keyValueMap instanceof Map ? keyValueMap.entries() : Object.entries(keyValueMap)) {
            this._register(typeof key === 'string' ? (keyPrefix + key) : key, value, T_CONST, null, overwrite);
        }
    }

    /**
     * @param {string} key
     * @param {Function} clazz
     * @param {*[]} [dependencies]
     * @param {boolean} [overwrite]
     */
    registerWithNew(key, clazz, dependencies, overwrite) {
        this._register(key, clazz, T_CLASS, dependencies, overwrite);
    }

    /**
     * @param {string} key
     * @param {Function} clazz
     * @param {*[]} [dependencies]
     * @param {boolean} [overwrite]
     */
    registerWithNewOnce(key, clazz, dependencies, overwrite) {
        this._register(key, clazz, T_CLASS, dependencies, overwrite, true);
    }

    /**
     * @param {string} key
     * @param {Function} factoryFn
     * @param {*[]} [dependencies]
     * @param {boolean} [overwrite]
     */
    registerWithFactory(key, factoryFn, dependencies, overwrite) {
        this._register(key, factoryFn, T_FACTORY, dependencies, overwrite);
    }

    /**
     * @param {string} key
     * @param {Function} factoryFn
     * @param {*[]} [dependencies]
     * @param {boolean} [overwrite]
     */
    registerWithFactoryOnce(key, factoryFn, dependencies, overwrite) {
        this._register(key, factoryFn, T_FACTORY, dependencies, overwrite, true);
    }
}

module.exports = SimpleDi;

/**
 * @typedef {Object} SimpleDiRegistryItem
 * @property {string} name
 * @property {*} value - the value passed to register*(), or (in case of once-items) the resolved value
 * @property {number} valueType - either of {@link T_CONST}, {@link T_CLASS} or {@link T_FACTORY}
 * @property {boolean} once
 * @property {string[]|null} dependencies
 * @property {number} resolvedCounter
 */
