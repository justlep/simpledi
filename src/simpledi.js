
const TBD = Symbol();

class SimpleDi {

    /**
     * @param {typeof T} Constructor
     * @return {function(*): T}
     * @template T
     */
    static withNew(Constructor) {
        return function() {
            return new Constructor(...arguments);
        };
    }

    /**
     * @param {T} obj
     * @return {function(): T}
     * @template T
     */
    static always(obj) {
        return () => obj;
    }

    /**
     * @param {function:T} factory
     * @return {function:T}
     * @template T
     */
    static once(factory) {
        let instance = TBD;
        return function () {
            return (instance !== TBD) ? instance : (instance = factory.call({}, ...arguments));
        };
    }

    /**
     * @param {typeof T} Constructor
     * @return {function: T}
     * @template T
     */
    static withNewOnce(Constructor) {
        let instance;
        return function () {
            return instance || (instance = SimpleDi.withNew(Constructor)(...arguments));
        };
    }

    constructor() {
        /** @type {Map<string, SimpleDiRegistryEntry>} */
        this._registry = new Map();
    }

    /**
     * @param {string} name
     * @param {function} factory
     * @param {?string[]} [dependencies] - optional array of dependency names
     * @param {boolean} [overwrite]
     */
    register(name, factory, dependencies, overwrite) {
        if (overwrite !== true && this._registry.has(name)) {
            throw new Error('A dependency with this name is already registered!');
        }
        if (typeof factory !== 'function') {
            throw new Error('Factory must be a function!');
        }
        if (dependencies && (!Array.isArray(dependencies) || !dependencies.every(s => typeof s === 'string'))) {
            throw new Error('Invalid dependencies array!');
        }
        this._registry.set(name, {
            name,
            factory,
            dependencies: (dependencies && dependencies.length) ? dependencies : null,
            resolvedCounter: 0
        });
    }

    registerBulk(deps) {
        for (let dep of deps) {
            this.register(...dep);
        }
    }

    /**
     * @param {string} name
     * @param {any[]} [args]
     * @return {*}
     */
    get(name, ...args) {
        return this._resolve(name, args);
    }

    /**
     * @param {string} name
     * @param {?any[]} args
     * @param {?string[]} [dependencyChain]
     * @return {*}
     * @private
     */
    _resolve(name, args, dependencyChain) {
        const registryItem = this.getRegistryItem(name);
        if (!registryItem) {
            throw new Error('couldn\'t find module: ' + name);
        }
        registryItem.resolvedCounter++;

        let resolvedDepsAndArgs = [];

        if (registryItem.dependencies) {
            if (dependencyChain) {
                dependencyChain.push(name);
            } else {
                dependencyChain = [name];
            }
            for (let dependencyName of registryItem.dependencies) {
                if (~dependencyChain.indexOf(dependencyName)) {
                    throw new Error('Circular Dependency detected: ' + [...dependencyChain, dependencyName].join(' => '));
                }
                resolvedDepsAndArgs.push(this._resolve(dependencyName, null, dependencyChain));
            }
            dependencyChain.pop();
        }

        if (args && args.length) {
            resolvedDepsAndArgs.push(...args);
        }

        return registryItem.factory.apply({}, resolvedDepsAndArgs);
    }

    /**
     * @param {string} name
     * @return {SimpleDiRegistryEntry}
     */
    getRegistryItem(name) {
        return this._registry.get(name);
    }

    /**
     * @return {Object<string, number>} - the returned object is a copy only
     */
    getResolvedDependencyCount() {
        let map = {};
        for (let entry of this._registry.values()) {
            map[entry.name] = entry.resolvedCounter;
        }
        return map;
    }
}


module.exports = SimpleDi;

/**
 * @typedef {Object} SimpleDiRegistryEntry
 * @property {string} name
 * @property {function} factory
 * @property {string[]|null} dependencies
 * @property {number} resolvedCounter
 */
