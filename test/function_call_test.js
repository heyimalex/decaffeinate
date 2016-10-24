import check from './support/check.js';

describe('function calls', () => {
  it('inserts commas after arguments if they are not there', () => {
    check(`
      a(
        1
        2
      )
    `, `
      a(
        1,
        2
      );
    `);
  });

  it('does not insert commas in single-line calls', () => {
    check(`a(1, 2)`, `a(1, 2);`);
  });

  it('inserts commas only for arguments that end a line', () => {
    check(`
      a(
        1, 2
        3, 4)
    `, `
      a(
        1, 2,
        3, 4);
    `);
  });

  it('inserts commas immediately after the element if followed by a comment', () => {
    check(`
      a(
        1 # hi
        2
      )
    `, `
      a(
        1, // hi
        2
      );
    `);
  });

  it('inserts commas on the same line when the property value is an interpolated string', () => {
    check(`
      a
        b: "#{c}"
        d: e
    `, `
      a({
        b: \`\${c}\`,
        d: e
      });
    `);
  });

  it('works when the first argument is parenthesized', () => {
    check(`
      f (1+1),2+2
    `, `
      f((1+1),2+2);
    `);
  });

  it('works when the last argument is parenthesized', () => {
    check(`
      f 1+1,(2+2)
    `, `
      f(1+1,(2+2));
    `);
  });

  it('works with `new` when the first argument is parenthesized', () => {
    check(`
      a= new c ([b()])
    `, `
      let a= new c(([b()]));
    `);
  });

  it('places parentheses in calls with multi-line function arguments after the closing brace', () => {
    check(`
      promise.then ->
        a()
        b # c
      d
    `, `
      promise.then(function() {
        a();
        return b;
      }); // c
      d;
    `);
  });

  it('places parentheses in calls with single line that short hand into fat arrow function', () => {
    check(`
      promise.then (a)->
        b
      c
    `, `
      promise.then(a=> b);
      c;
    `);
  });

  it.skip('preserves comments in functions that will become arrow functions', () => {
    check(`
      promise.then (a) ->
        b # c
      d
    `, `
      promise.then(a =>
        b // c
      );
      d;
    `);
  });

  it('replaces the space between the callee and the first argument for first arg on same line', () => {
    check(`a 1, 2`, `a(1, 2);`);
  });

  it('does not add anything if there are already parens', () => {
    check(`a()`, `a();`);
    check(`a(1, 2)`, `a(1, 2);`);
  });

  it('does not add them when present and the callee is surrounded by parentheses', () => {
    check(`(a)()`, `(a)();`);
  });

  it.skip('works with a multi-line callee', () => {
    // FIXME: This doesn't work because FunctionApplicationPatcher thinks it is
    // an implicit call (i.e. no parens), since the token after the function is
    // a newline and not a CALL_START (i.e. ')'). We should switch to coffee-lex
    // tokens and skip past any NEWLINE, COMMENT, or HERECOMMENT tokens.
    check(`
      (->
        1
      )()
    `, `
      (function() {
        return 1;
      )();
    `);
  });

  it('works with a callee enclosed in parentheses and including a comment', () => {
    check(`
      (
        # HEY
        foo
      ) 0
    `, `
      (
        // HEY
        foo
      )(0);
    `);
  });

  it('adds parens for nested function calls', () => {
    check(`a   b  c d     e`, `a(b(c(d(e))));`);
  });

  it('adds parens for a new expression with args', () => {
    check(`new Foo 1`, `new Foo(1);`);
  });

  it('adds parens after the properties of a member expression', () => {
    check(`a.b c`, `a.b(c);`);
  });

  it('adds parens after the brackets on a computed member expression', () => {
    check(`a b[c]`, `a(b[c]);`);
  });

  it.skip('adds parens without messing up multi-line calls', () => {
    check(`
      a
        b: c
    `, `
      a({
        b: c
      });
    `);
  });

  it.skip('adds parens to multi-line calls with the right indentation', () => {
    check(`
      ->
        a
          b: c
    `, `
      (function() {
        return a({
          b: c
        });
      });
    `);
  });

  it('converts rest params in function calls', () => {
    check(`(a,b...)->b[0]`, `(a,...b)=> b[0];`);
  });

  it('works when the entire span of arguments is replaced', () => {
    check(`
      a yes
    `, `
      a(true);
    `);
  });

  it('works with a call that returns a function that is immediately called', () => {
    check(`
      a()()
    `, `
      a()();
    `);
  });

  it('deletes trailing comma after the last argument', () => {
    check(`
      x(1,)
    `, `
      x(1);
    `);
  });

  it('places the closing braces for a multi-line function argument', () => {
    check(`
      a(() ->
        0)
    `, `
      a(() => 0);
    `);
  });

  it('keeps commas immediately after function applications', () => {
    check(`
      a(b(c), d)
    `, `
      a(b(c), d);
    `);
  });

  it('puts the close-paren in a nice place for implicit calls on objects', () => {
    check(`
      a {
      }
    `, `
      a({
      });
    `);
  });

  it('handles implicit calls nested in another function call', () => {
    check(`
      a(
        b {
        }
      )
    `, `
      a(
        b({
        })
      );
    `);
  });

  it('handles implicit calls across OUTDENT tokens', () => {
    check(`
      a {
        b: ->
          return c d,
            if e
              f
      }
      g
    `, `
      a({
        b() {
          return c(d,
            e ?
              f : undefined
          );
        }
      });
      g;
    `);
  });

  it('handles a multi-line callback as the second arg within a function body (#412)', () => {
    check(`
      _authenticate: (authKey, cb) ->
        @_getSession authKey, (err, {person, user, authKey, org} = {}) ->
            return cb null, {person, authKey, user, org}
    `, `
      ({
        _authenticate(authKey, cb) {
          return this._getSession(authKey, (err, {person, user, authKey, org} = {}) => cb(null, {person, authKey, user, org}));
        }
      });
    `);
  });

  it('handles a multi-line callback ending in an object as the second arg (#410)', () => {
    check(`
      @server.on 'sioDisconnect', =>
        @_statuses = {}
    `, `
      this.server.on('sioDisconnect', () => {
        return this._statuses = {};
      });
    `);
  });

  it('handles a multi-line explicit return callback as the second arg (#405)', () => {
    check(`
      Teacher.hasClass classId, () ->
        return cb null, {}
    `, `
      Teacher.hasClass(classId, () => cb(null, {}));
    `);
  });

  it('handles unit test style multi-line callbacks (#379)', () => {
    check(`
      it "should foo", ->
        expect( bar ).to.eql [1]
    `, `
      it("should foo", () => expect( bar ).to.eql([1]));
    `);
  });

  it('handles nested multi-line callbacks with inconsistent spacing (#370)', () => {
    check(`
      define [
      ], () ->
      
        somefunc 'something', ['something', (ContactService) ->
      
        ]
    `, `
      define([
      ], () =>
      
        somefunc('something', ['something', function(ContactService) {}
      
        ]));
    `);
  });

  it('handles a multi-line callback within a map call (#276)', () => {
    check(`
      (a) ->
        (a not in b.map(a, (e) -> 
          e)
        )
    `, `
      a =>
        !__in__(a, b.map(a, e => e))
      ;
      function __in__(needle, haystack) {
        return haystack.indexOf(needle) >= 0;
      }
    `);
  });

  it('handles soaked implicit function calls', () => {
    check(`
      a? b
    `, `
      __guardFunc__(a, f => f(b));
      function __guardFunc__(func, transform) {
        return typeof func === 'function' ? transform(func) : undefined;
      }
    `);
  });

  it.skip('handles soaked implicit new expressions', () => {
    check(`
      new A? b
    `, `
      __guardFunc__(A, f => new f(b));
      function __guardFunc__(func, transform) {
        return typeof func === 'function' ? transform(func) : undefined;
      }
    `);
  });
});
