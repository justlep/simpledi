
const SimpleDi = require('../src/simpledi');

describe('SimpleDi', function () {
    let di;
    beforeEach(function () {
        di = new SimpleDi();
    });

    it('registers and gets a simple object', function () {
        let obj = {foo: true};
        di.register('foo', function () {
            return obj;
        });

        expect(di.get('foo')).toBe(obj);
    });

    it('passes an additional argument to a constructor', function () {
        let barObj = {bar: true};
        di.register('Foo', SimpleDi.withNew(function Foo(bar) {
            expect(bar).toBe(barObj);
        }));

        di.get('Foo', barObj);
    });

    it('passes an additional argument to a constructor when a dependency is defined', function () {
        let barObj = {bar: true};
        let obj = {foo: true};
        di.register('foo', function () {
            return obj;
        });
        di.register('Foo', SimpleDi.withNew(function Foo(foo, bar) {
            expect(bar).toBe(barObj);
        }), ['foo']);

        di.get('Foo', barObj);
    });

    it('passes additional arguments to a constructor when a dependency is defined', function () {
        let barObj = {bar: true};
        let obj = {foo: true};
        di.register('foo', function () {
            return obj;
        });
        di.register('Foo', SimpleDi.withNew(function Foo(foo, bar1, bar2) {
            expect(bar2).toBe(barObj);
        }), ['foo']);

        di.get('Foo', barObj, barObj);
    });

    it('throws when register implicitly overwrites a dependency', function () {
        let obj = {foo: true};
        di.register('foo', SimpleDi.always(obj));

        expect(function () {
            di.register('foo', SimpleDi.always(obj));
        }).toThrow();
    });

    it('does not throw when register explicitly overwrites a dependency', function () {
        let obj = {foo: true};
        di.register('foo', SimpleDi.always(obj));

        expect(function () {
            di.register('foo', SimpleDi.always(obj), [], true);
        }).not.toThrow();
    });

    it('registers and gets a constructor using the helper factory', function () {
        function Foo() {
        }

        di.register('Foo', SimpleDi.withNew(Foo));

        expect(di.get('Foo') instanceof Foo).toBe(true);
    });

    it('resolves a dependency', function () {
        function Foo(bar) {
            this.bar = bar;
        }

        function Bar() {

        }

        di.register('Foo', SimpleDi.withNew(Foo), ['Bar']);
        di.register('Bar', SimpleDi.withNew(Bar));

        expect(di.get('Foo').bar instanceof Bar).toBe(true);
    });

    it('throws when trying to resolve a direct circular dependency', function () {
        function Foo(/*bar */) {
        }

        function Bar(/*foo */) {
        }

        di.register('Foo', SimpleDi.withNew(Foo), ['Bar']);
        di.register('Bar', SimpleDi.withNew(Bar), ['Foo']);

        try {
            di.get('Foo');
        } catch (e) {
            expect(e.toString()).toEqual('Error: Circular Dependency detected: Foo => Bar => Foo');
        }
    });

    it('throws when trying to resolve a circular dependency', function () {
        function Foo(/*bar */) {
        }

        function Bar(/*foo */) {
        }

        di.register('Foo', SimpleDi.withNew(Foo), ['Bar']);
        di.register('Bar', SimpleDi.withNew(Bar), ['Baz']);
        di.register('Baz', SimpleDi.withNew(Bar), ['Foo']);

        try {
            di.get('Foo');
        } catch (e) {
            expect(e.toString()).toEqual('Error: Circular Dependency detected: Foo => Bar => Baz => Foo');
        }
    });

    it('throws when trying to resolve a dependency that is the same module that was requested', function () {
        function Foo(/*bar */) {
        }

        di.register('Foo', SimpleDi.withNew(Foo), ['Foo']);

        try {
            di.get('Foo');
        } catch (e) {
            expect(e.toString()).toEqual('Error: Circular Dependency detected: Foo => Foo');
        }
    });

    it('resolves multiple dependencies', function () {
        function Foo(bar, baz) {
            this.bar = bar;
            this.baz = baz;
        }

        function Bar() {
            this.bar = true;
        }

        function Baz() {
            this.baz = true;
        }

        di.register('Foo', SimpleDi.withNew(Foo), ['Bar', 'Baz']);
        di.register('Bar', SimpleDi.withNew(Bar));
        di.register('Baz', SimpleDi.withNew(Baz));

        expect(di.get('Foo').baz instanceof Baz).toBe(true);
    });

    it('provides a static identity function that returns always the same object', function () {
        let dep = {
            foo: true
        };

        di.register('foo', SimpleDi.always(dep));

        expect(di.get('foo')).toBe(dep);
    });

    it('registers multiple dependencies at once with registerBulk', function () {
        function Foo(bar, baz) {
            this.bar = bar;
            this.baz = baz;
        }

        function Bar() {
            this.bar = true;
        }

        function Baz() {
            this.baz = true;
        }

        di.registerBulk([
            ['Foo', SimpleDi.withNew(Foo), ['Bar', 'Baz']],
            ['Bar', SimpleDi.withNew(Bar)],
            ['Baz', SimpleDi.withNew(Baz)]
        ]);

        expect(di.get('Foo').baz instanceof Baz).toBe(true);
    });

    it('counts how often dependencies where resolved', function () {
        let obj = {foo: true};
        di.register('foo', function () {
            return obj;
        });

        di.get('foo');
        expect(di.getResolvedDependencyCount().foo).toBe(1);
    });

    it('counts how often dependencies where resolved with deep dependencies', function () {
        let obj = {foo: true};
        di.register('foo', function () {
            return obj;
        });

        di.register('bar', function () {
            return obj;
        }, ['foo']);

        di.get('bar');
        di.get('foo');
        expect(di.getResolvedDependencyCount()).toEqual({foo: 2, bar: 1});
    });

    describe('SimpleDi.withNewOnce', function () {
        it('initializes a constructor with new once and then always returns the instance', function () {
            function Foo() {
                this.foo = true;
            }

            di.register('Foo', SimpleDi.withNewOnce(Foo));

            let foo1 = di.get('Foo');
            let foo2 = di.get('Foo');

            expect(foo1).toBe(foo2);
        });

        it('returns always the same instance and resolves dependencies', function () {
            function Foo(bar) {
                this.foo = true;
                this.bar = bar;
            }

            let bar = {
                bar: true
            };

            di.register('Foo', SimpleDi.withNewOnce(Foo), ['bar']);
            di.register('bar', SimpleDi.always(bar));

            let foo = di.get('Foo');

            expect(foo.bar).toBe(bar);
        });
    });

    describe('SimpleDi.once', function () {
        it('calls a factory once and then always returns the instance', function () {
            function create() {
                return {};
            }

            di.register('create', SimpleDi.once(create));

            let foo1 = di.get('create');
            let foo2 = di.get('create');

            expect(foo1).toBe(foo2);
        });

        it('returns always the same instance and resolves dependencies', function () {
            function create(bar) {
                return {
                    bar: bar
                };
            }

            let bar = {
                bar: true
            };

            di.register('create', SimpleDi.once(create), ['bar']);
            di.register('bar', SimpleDi.always(bar));

            let foo = di.get('create');

            expect(foo.bar).toBe(bar);
        });
    });

    it('resolves multiple dependencies with complex trees', function() {
        class Foo {
            constructor(bar, baz, more) {
                this.bar = bar;
                this.baz = baz;
                this.more = more;
            }
        }
        class Bar {}
        class Baz {}

        di.register('Foo', SimpleDi.withNew(Foo), ['Bar', 'Baz']);
        di.register('Bar', SimpleDi.withNew(Bar), []);
        di.register('Baz', SimpleDi.withNew(Baz), ['Bar']);
        let foo;
        expect(() => foo = di.get('Foo', 'huhu')).not.toThrow();
        expect(foo).toBeInstanceOf(Foo);
        expect(foo.bar).toBeInstanceOf(Bar);
        expect(foo.baz).toBeInstanceOf(Baz);
        expect(foo.more).toBe('huhu');
    });

    it('throws when registering with an invalid factory function', function () {
        const ERROR_MSG = 'Factory must be a function!';
        expect(() => di.register('Foo', 'huhu')).toThrowError(ERROR_MSG);
        expect(() => di.register('Foo', null)).toThrowError(ERROR_MSG);
        expect(() => di.register('Foo', [])).toThrowError(ERROR_MSG);
        expect(() => di.register('Foo', 123)).toThrowError(ERROR_MSG);
    });

    it('throws when registering with an invalid dependencies array', function () {
        class Foo {}
        const ERROR_MSG = 'Invalid dependencies array!';
        expect(() => di.register('Foo', SimpleDi.withNew(Foo), 'bad array')).toThrowError(ERROR_MSG);
        expect(() => di.register('Foo', SimpleDi.withNew(Foo), [666, 777])).toThrowError(ERROR_MSG);
        expect(() => di.register('Foo', SimpleDi.withNew(Foo), ['subdep', 666])).toThrowError(ERROR_MSG);
        expect(() => di.register('Foo', SimpleDi.withNew(Foo), 666)).toThrowError(ERROR_MSG);
        expect(() => di.register('Foo', SimpleDi.withNew(Foo), () => null)).toThrowError(ERROR_MSG);

        expect(() => di.register('Foo', SimpleDi.withNew(Foo), ['subdep', 'subdep2'])).not.toThrow();
        expect(() => di.register('Foo2', SimpleDi.withNew(Foo), [])).not.toThrow();
    });
});
