# SimpleDi

[![Build Status](https://api.travis-ci.com/justlep/simpledi-node.svg?branch=master)](https://travis-ci.com/justlep/simpledi-node)
![dependencies](https://david-dm.org/justlep/simpledi-node.svg)

This is a fork and complete rewrite of [SimpleDi]([https://github.com/fwdop/simpledi), 
a very simple dependency injector.

Intended for Node 10+ environments.

## Features

- Simple API
- No dependencies
- Fully tested
- Helps you find unresolved dependencies with `getResolvedDependencyCount`

## Installation

```shell
npm install simpledi-node
```

## API

### Create a SimpleDi instance
```
const SimpleDi = require('simpledi-node');
const di = new SimpleDi(); 
```

### Add dependency with factory function
#### `di.registerWithFactory(name, factoryFn, dependencies, overwrite)`
#### `di.registerWithFactoryOnce(name, factoryFn, dependencies, overwrite)`

Parameter | Type | Description
-----|------|------------
name | `string` | The name of the dependency
factoryFn | `function` | A function that gets called when `di.get(name)` is called
dependencies | `string[]` | *optional* array of dependency names. The dependencies will be resolved and passed to the `factoryFn` when `di.get(name)` is called.
overwrite | `boolean` | *optional* This allows to explicitly overwrite dependencies

### Add dependency with class constructor

#### `di.registerWithNew(name, clazz, dependencies, overwrite)`
#### `di.registerWithNewOnce(name, clazz, dependencies, overwrite)`

Parameter | Type | Description
-----|------|------------
name | `string` | The name of the dependency
clazz | `function` | A class or constructor function that gets instantiated when `di.get(name)` is called
dependencies | `string[]` | *optional* array of dependency names. The dependencies will be resolved and passed to the constructor when `di.get(name)` is called.
overwrite | `boolean` | *optional* This allows to explicitly overwrite dependencies

### Example

```javascript
const SimpleDi = require('simpledi-node');
const di = new SimpleDi();

function Engine(config) {
    this.hp = config.hp;
    this.maxSpeed = config.maxSpeed;
}

function Car(engine) {
    this.text = 'This car has ' + engine.hp + 'hp!';
}

di.registerWithNew('Engine', Engine, ['engineConfig']);
di.registerConstant('engineConfig', {
    hp: 120,
    maxSpeed: 200
});
di.registerWithNewOnce('Car', Car, ['Engine']);

let car = di.get('Car'); 

console.log(car.text); // This car has 120hp!
```


### Add constant dependency

#### `di.registerConstant(name, value, overwrite)`
Parameter | Type | Description
-----|------|------------
name | `string` | The name of the dependency
value | `mixed` | A fix value to be returned whenever `di.get(name)` is called
overwrite | `boolean` | *optional* This allows to explicitly overwrite dependencies


#### `di.registerContants(keyValueMap, keyPrefix, overwrite)`
Parameter | Type | Description
-----|------|------------
keyValueMap | `Map<string,*>` or `Object`  | An map or pojo whose (own) keys will be used to register the respective value as a constant
prefix | `string` | *optional* prefix to precede the registered keys
overwrite | `boolean` | *optional* This allows to explicitly overwrite dependencies

##### Example:

```javascript
const CC = {foo: 1, bar: 2};
di.registerConstants(CC);
di.get('foo'); // returns 1
di.registerConstants(CC, 'tmp.');
di.get('tmp.bar'); // returns 2
```

### Get a dependency
#### `di.get(name[, arg1[, arg2[, ...]]])`

Returns a previously registered dependency and resolves all dependencies.  
Throws an `Error` if the dependency is not registered. 

Name | Type | Description
-----|------|------------
name | `string` | The name of the dependency
arg1, arg2, ... | `mixed` | *optional* arguments that will be passed to the dependency's factory function or constructor _additionally to_ its dependencies   

##### Example:
```javascript
const fn = function() { return [...arguments] };
di.registerWithFactory('foo', fn, ['BAR']);
di.registerConstant('BAR', 111);
di.get('foo', 444, 555); // returns [111, 444, 555]
```

_NOTE:_ For dependencies registered via `registerWithNewOnce()` or `registerWithFactoryOnce()`, 
 additional get-arguments (`arg1`, `arg2`, ...) are allowed only in the *first* invocation of `di.get()`. 
An error is thrown otherwise.  
You can suppress this error by calling `di.setIgnoreArgsPassedToFinalValue(true)`.

##### Example for circular dependency (throws error):

```javascript
di.registerWithNew('A', class{}, ['B']);
di.registerWithNew('B', class{}, ['C']);
di.registerWithNew('C', class{}, ['A']);

di.get('A'); // throws "Circular Dependency detected: A => B => C => A"
```

### Inspecting usages of dependencies
### `di.getResolvedDependencyCount(): Map<string, number>`

Returns a `Map` of dependency names onto the number the dependency got resolved in total,
including both direct `di.get()` calls and transitive resolving.    

```javascript
// Example
console.warn(...di.getResolvedDependencyCount()); // [ 'foo', 3 ] [ 'bar', 1 ]
```

## License

[MIT](./LICENSE)
