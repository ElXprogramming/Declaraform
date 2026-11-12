/**
 * Polyfills for older Safari, WebKit, and iOS devices (e.g. iPhone 13 on iOS 15.x - 18.1).
 * Ensures full backward compatibility for modern ECMAScript APIs required by pdfjs-dist.
 */

// Polyfill Promise.withResolvers (Safari < 17.4)
if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function () {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// Polyfill Promise.try (Safari < 18.2)
if (typeof Promise.try !== 'function') {
  Promise.try = function (fn, ...args) {
    return new Promise((resolve) => {
      resolve(fn(...args));
    });
  };
}

// Polyfill Object.hasOwn (Safari < 15.4)
if (typeof Object.hasOwn !== 'function') {
  Object.hasOwn = function (obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  };
}

// Polyfill Set.prototype.intersection (Safari < 17.0)
if (typeof Set.prototype.intersection !== 'function') {
  Set.prototype.intersection = function (other) {
    const result = new Set();
    const otherSet = other instanceof Set ? other : new Set(other);
    for (const item of this) {
      if (otherSet.has(item)) {
        result.add(item);
      }
    }
    return result;
  };
}

// Polyfill Array.prototype.at (Safari < 15.4)
if (!Array.prototype.at) {
  Array.prototype.at = function (n) {
    n = Math.trunc(n) || 0;
    if (n < 0) n += this.length;
    if (n < 0 || n >= this.length) return undefined;
    return this[n];
  };
}

// Polyfill Array.prototype.findLast (Safari < 16.0)
if (!Array.prototype.findLast) {
  Array.prototype.findLast = function (predicate, thisArg) {
    for (let i = this.length - 1; i >= 0; i--) {
      if (predicate.call(thisArg, this[i], i, this)) {
        return this[i];
      }
    }
    return undefined;
  };
}
