const Pattern = require('../lib/Pattern');
const assert = require('assert');

describe('Pattern', () => {
  var p;

  context('from string', () => {
    before(() => {
      p = new Pattern('^foo(.+)$');
    });

    it('should return matched object if matched', () => {
      const matched = p.match({ text: 'foobar' });
      assert.equal(matched[1], 'bar');
    });

    it('should returns null if not matched', () => {
      assert.equal(p.match({ text: 'bar' }), null);
    });
  });

  context('from RegExp object', () => {
    before(() => {
      p = new Pattern(/^foo(.+)$/);
    });

    it('should return matched object if matched', () => {
      const matched = p.match({ text: 'foobar' });
      assert.equal(matched[1], 'bar');
    });

    it('should returns null if not matched', () => {
      assert.equal(p.match({ text: 'bar' }), null);
    });
  });

  context('from function object', () => {
    before(() => {
      p = new Pattern((msg) => msg.text.length === 6 ? 'cool' : null);
    });

    it('should return truthy if matched', () => {
      assert( p.match({ text: 'foobar' }) );
    });

    it('should returns falsy if not matched', () => {
      assert( ! p.match({ text: 'bar' }));
    });
  });

  context('from Array', () => {
    it('should return first matched pattern result', () => {
      p = new Pattern(['ababa', /^foo(.+)$/, () => true]);
      const matched = p.match({ text: 'foobar' });
      assert.equal(matched[1], 'bar');
    });
  });

  context('from other object', () => {
    it('should always returns null', () => {
      p = new Pattern({});
      assert.equal(p.match({ text: 'foobar' }), null);
    });
  });
});
