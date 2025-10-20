const bits = 8
const width = 1<<bits
const mask = width - 1

export class ARC4 {
  // Requires a key in the form of an array of at most {width} integers each in the range [0, {width}).
  constructor(key) {
    let t, keylen = key.length, i = this.i = 0, j = this.j = 0, s = this.S = []

    // The empty key [] is treated as [0].
    if (!keylen) { key = [keylen++] }

    // Set up S using the standard key scheduling algorithm.
    while (i < width) {
      s[i] = i++
    }
    for (i = 0; i < width; i++) {
      s[i] = s[j = mask & (j + key[i % keylen] + (t = s[i]))]
      s[j] = t
    }

    // For robust unpredictability as per RC4-drop[256],
    // automatically discard an initial batch of values.
    // See https://en.wikipedia.org/wiki/Fluhrer,_Mantin_and_Shamir_attack
    this.g(width)
  }

  // Seeds a new generator with an integer seed, converted to a key array.
  static seed(seed) {
    seed = Math.abs(seed)
    let key = []
    while (seed > 0 && key.length < width) {
      key.push(seed & mask)
      seed = seed >> bits
    }
    return new ARC4(key)
  }

  // Returns a pseudorandom integer that concatenates the next {count} outputs from ARC4.
  // The return value is an integer in the range [0, {width ** count}).
  g(count) {
    // Using local variables instead of instance members substantially improves performance.
    let t, r = 0, i = this.i, j = this.j, s = this.S
    while (count--) {
      t = s[i = mask & (i + 1)]
      r = r * width + s[mask & ((s[i] = s[j = mask & (j + t)]) + (s[j] = t))]
    }
    this.i = i
    this.j = j
    return r
  }

  // Returns a uniformly-chosen random double in [0, 1) that contains randomness
  // in every bit of the mantissa of the IEEE 754 value.
  double() {
    const chunks = 6, // at least six RC4 outputs for each double
      digits = 52,    // there are 52 significant digits in a double
      significance = 2 ** digits,
      overflow = significance * 2

    let n = this.g(chunks),            // Start with a numerator n < 2 ** 48
      d = width ** chunks,             //   and denominator d = 2 ** 48.
      x = 0                            //   and no 'extra last byte'.
    while (n < significance) {         // Fill up all significant digits by
      n = (n + x) * width              //   shifting numerator and
      d *= width                       //   denominator and generating a
      x = this.g(1)                    //   new least-significant-byte.
    }
    while (n >= overflow) {            // To avoid rounding up, before adding
      n /= 2                           //   last byte, shift everything
      d /= 2                           //   right using integer math until
      x >>>= 1                         //   we have exactly the desired bits.
    }
    return (n + x) / d                 // Form the number within [0, 1).
  }

  // Returns a uniformly-chosen random integer in the range [0, n).
  // n cannot exceed 2**32.
  int(n) {
    const count = 4
    const randomMax = width ** count
    let x
    do {
      x = this.g(count)
    } while (x >= (randomMax - randomMax % n))
    return x % n
  }

  // Returns a uniformly-chosen random integer in the range [1, n].
  // n cannot exceed 2**32.
  die(n) {
    return this.int(n) + 1
  }
}