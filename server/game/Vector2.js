export class Vector2 {
  constructor(x = 0, z = 0) {
    this.x = x;
    this.z = z;
  }

  clone() {
    return new Vector2(this.x, this.z);
  }

  add(vector) {
    return new Vector2(this.x + vector.x, this.z + vector.z);
  }

  scale(factor) {
    return new Vector2(this.x * factor, this.z * factor);
  }

  distanceTo(vector) {
    return Math.hypot(this.x - vector.x, this.z - vector.z);
  }

  static fromHeading(heading) {
    return new Vector2(Math.sin(heading), Math.cos(heading));
  }
}
