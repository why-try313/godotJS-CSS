class Apply {
    constructor(from, to) {
        this.from  = from;
        this.value = from;
        this.diff  = to - this.from;
    } getValue (percent) {
        return this.from + (this.diff*percent);
    } isValid() {
        return this.diff !== 0;
    }
};


class Vector2 {
    constructor(from, to) {
        this.from  = from;
        this.value = from;
        this.diff  = {
            x: to.x - from.x,
            y: to.y - from.y
        };
    } getValue (percent) {
        value.x = this.from.x + (this.diff.x*percent);
        value.y = this.from.y + (this.diff.y*percent);
        return value;
    } isValid() {
        return (Math.abs(this.diff.x)+Math.abs(this.diff.y)) !== 0;
    }
};


class Color {
    constructor(from, to) {
        this.from  = from;
        this.value = from;
        this.diff  = [
            to[0]-from[0],
            to[1]-from[1],
            to[2]-from[2],
            to[3]-from[3]
        ];
    } getValue (percent) {
        value[0] = this.from[0] + (this.diff[0]*percent);
        value[1] = this.from[1] + (this.diff[1]*percent);
        value[2] = this.from[2] + (this.diff[2]*percent);
        value[3] = this.from[3] + (this.diff[3]*percent);
        return value;
    } isValid() {
        return (Math.abs(this.diff[0])+Math.abs(this.diff[1])+Math.abs(this.diff[2])+Math.abs(this.diff[3])) !== 0;
    }
};

const classes = { Apply, Vector2, Color };
export default classes;