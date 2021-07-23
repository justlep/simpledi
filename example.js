const SimpleDi = require('.');
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


// ------------------------------------------------------------

const fn = function() { return [...arguments]; };
di.registerWithFactory('foo', fn, ['BAR']);
di.registerConstant('BAR', 111);

console.log( di.get('foo', 444, 555) ); // returns [111, 444, 555]


// ------------------------------------------------------------

/**
 * @param {HelloService} helloService
 * @constructor
 */
function FooService(helloService) {
    this.helloService = helloService;
}

/**
 * @param {HelloService} helloService
 * @constructor
 */
function BarService(helloService) {
    this.helloService = helloService;
}

class HelloService {
    sayHello() {
        console.log('hello');
    }
}

di.registerWithNewOnce('fooService', FooService, ['helloService']);
di.registerWithNewOnce('barService', BarService, ['helloService']);
di.registerWithNewOnce('helloService', HelloService);

/** @type {FooService} */
let fooService = di.get('fooService'),
    fooService2 = di.get('fooService');

console.log(fooService === fooService2); // true

/** @type {BarService} */
const barService = di.get('barService');

console.log(fooService !== barService); // true
console.log(fooService.helloService === barService.helloService); // true


