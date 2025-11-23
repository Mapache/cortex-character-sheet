export class HSV {
  constructor(h, s, v) {
    this.h = h
    this.s = s
    this.v = v
  }

  toRGB() {
    let h = this.h
    let s = this.s
    let v = this.v

    let r, g, b
    let i = Math.floor(h * 6)
    let f = h * 6 - i
    let p = v * (1 - s)
    let q = v * (1 - f * s)
    let t = v * (1 - (1 - f) * s)

    switch (i % 6) {
      case 0: r = v, g = t, b = p; break
      case 1: r = q, g = v, b = p; break
      case 2: r = p, g = v, b = t; break
      case 3: r = p, g = q, b = v; break
      case 4: r = t, g = p, b = v; break
      case 5: r = v, g = p, b = q; break
    }

    return new RGB(
      Math.round(r * 255),
      Math.round(g * 255),
      Math.round(b * 255)
    )
  }
}

export class RGB {
  constructor(r, g, b) {
    this.r = r
    this.g = g
    this.b = b
  }

  toHSV() {
    let r = this.r / 255
    let g = this.g / 255
    let b = this.b / 255

    let max = Math.max(r, g, b)
    let min = Math.min(r, g, b)
    let h, s, v = max

    let d = max - min
    s = max === 0 ? 0 : d / max

    if (max === min) {
      h = 0 // achromatic
    } else {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break
        case g: h = (b - r) / d + 2; break
        case b: h = (r - g) / d + 4; break
      }
      h /= 6
    }

    return new HSV(h, s, v)
  }

  static fromHex(hex) {
    // Remove the '#' if present
    hex = hex.startsWith('#') ? hex.slice(1) : hex

    // Ensure it's a 6-digit hex code (e.g., if input was #F00, it becomes F00000)
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
    }

    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)

    return new RGB(r, g, b)
  }

  toHex() {
    // Converts a single color component to a two-digit hex string
    function componentToHex(c) {
      const hex = c.toString(16)
      return hex.length === 1 ? "0" + hex : hex
    }
    return "#" + componentToHex(this.r) + componentToHex(this.g) + componentToHex(this.b)
  }
}