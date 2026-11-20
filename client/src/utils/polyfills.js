/**
 * Non-enumerable ECMAScript & Web API polyfills for mobile browsers
 * (iOS 15.0 - 18.x Safari/WebKit, older Android Chrome, Samsung Internet, and in-app WebViews).
 *
 * IMPORTANT: Every prototype property MUST be defined with `enumerable: false`.
 * pdfjs-dist explicitly asserts that `Object.prototype` and `Array.prototype`
 * contain zero enumerable properties and throws if any enumerable method is added.
 */

const defineNonEnumerable = (target, prop, value) => {
  if (!target || typeof target[prop] === 'function') return;
  try {
    Object.defineProperty(target, prop, {
      value,
      writable: true,
      configurable: true,
      enumerable: false,
    });
  } catch {
    // Ignore read-only environments
  }
};

// Promise.withResolvers (Safari < 17.4, Chrome < 119) — NOT bundled in pdfjs-dist v6 legacy
defineNonEnumerable(Promise, 'withResolvers', function withResolvers() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
});

// Promise.try (Safari < 18.2, Chrome < 128)
defineNonEnumerable(Promise, 'try', function promiseTry(fn, ...args) {
  return new Promise((resolve) => {
    resolve(fn(...args));
  });
});

// Object.hasOwn (Safari < 15.4, Chrome < 93)
defineNonEnumerable(Object, 'hasOwn', function hasOwn(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
});

// Array.prototype.at & String.prototype.at & TypedArray.prototype.at (Safari < 15.4, Chrome < 92)
function atPolyfill(n) {
  const len = this.length;
  let k = Math.trunc(n) || 0;
  if (k < 0) k += len;
  if (k < 0 || k >= len) return undefined;
  return this[k];
}
defineNonEnumerable(Array.prototype, 'at', atPolyfill);
defineNonEnumerable(String.prototype, 'at', atPolyfill);
const TypedArrayProto = Object.getPrototypeOf(Uint8Array.prototype);
if (TypedArrayProto && TypedArrayProto !== Object.prototype) {
  defineNonEnumerable(TypedArrayProto, 'at', atPolyfill);
}

// Array.prototype.findLast & findLastIndex (Safari < 16.0, Chrome < 97)
defineNonEnumerable(Array.prototype, 'findLast', function findLast(predicate, thisArg) {
  for (let i = this.length - 1; i >= 0; i--) {
    const val = this[i];
    if (predicate.call(thisArg, val, i, this)) {
      return val;
    }
  }
  return undefined;
});

defineNonEnumerable(Array.prototype, 'findLastIndex', function findLastIndex(predicate, thisArg) {
  for (let i = this.length - 1; i >= 0; i--) {
    if (predicate.call(thisArg, this[i], i, this)) {
      return i;
    }
  }
  return -1;
});

// Set.prototype.intersection (Safari < 17.0, Chrome < 122)
defineNonEnumerable(Set.prototype, 'intersection', function intersection(other) {
  const result = new Set();
  const otherSet = other instanceof Set ? other : new Set(other);
  for (const item of this) {
    if (otherSet.has(item)) {
      result.add(item);
    }
  }
  return result;
});

// AbortSignal.any (Safari < 17.4, Chrome < 116)
if (typeof AbortSignal !== 'undefined' && typeof AbortController !== 'undefined') {
  defineNonEnumerable(AbortSignal, 'any', function any(signals) {
    const controller = new AbortController();
    const list = Array.from(signals || []);
    for (const signal of list) {
      if (signal?.aborted) {
        controller.abort(signal.reason);
        return controller.signal;
      }
    }
    const onAbort = (evt) => {
      const target = evt?.target;
      controller.abort(target?.reason);
      for (const s of list) {
        s?.removeEventListener?.('abort', onAbort);
      }
    };
    for (const signal of list) {
      signal?.addEventListener?.('abort', onAbort, { once: true });
    }
    return controller.signal;
  });
}

// structuredClone (Safari < 15.4, Chrome < 98) — required by pdfjs LoopbackPort
if (typeof globalThis !== 'undefined' && typeof globalThis.structuredClone !== 'function') {
  const cloneValue = (value, seen) => {
    if (value === null || typeof value !== 'object') return value;
    if (seen.has(value)) return seen.get(value);

    if (value instanceof Date) return new Date(value.getTime());
    if (value instanceof RegExp) return new RegExp(value.source, value.flags);
    if (value instanceof ArrayBuffer) {
      const copy = value.slice(0);
      seen.set(value, copy);
      return copy;
    }
    if (ArrayBuffer.isView(value)) {
      const clonedBuf = cloneValue(value.buffer, seen);
      const copy =
        value instanceof DataView
          ? new DataView(clonedBuf, value.byteOffset, value.byteLength)
          : new value.constructor(clonedBuf, value.byteOffset, value.length);
      seen.set(value, copy);
      return copy;
    }
    if (value instanceof Map) {
      const copy = new Map();
      seen.set(value, copy);
      value.forEach((v, k) => copy.set(cloneValue(k, seen), cloneValue(v, seen)));
      return copy;
    }
    if (value instanceof Set) {
      const copy = new Set();
      seen.set(value, copy);
      value.forEach((v) => copy.add(cloneValue(v, seen)));
      return copy;
    }
    if (Array.isArray(value)) {
      const copy = new Array(value.length);
      seen.set(value, copy);
      for (let i = 0; i < value.length; i++) {
        if (i in value) copy[i] = cloneValue(value[i], seen);
      }
      return copy;
    }
    if (value instanceof Error) {
      const copy = new value.constructor(value.message);
      copy.name = value.name;
      if (value.stack) copy.stack = value.stack;
      seen.set(value, copy);
      return copy;
    }

    const copy = {};
    seen.set(value, copy);
    for (const key of Object.keys(value)) {
      copy[key] = cloneValue(value[key], seen);
    }
    return copy;
  };

  defineNonEnumerable(globalThis, 'structuredClone', function structuredClonePolyfill(value) {
    return cloneValue(value, new WeakMap());
  });
}
