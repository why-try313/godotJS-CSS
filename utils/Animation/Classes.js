class Apply {
    constructor(from, to) {
        this.from  = from;
        this.value = from;
        this.diff  = to - this.from;
    } getValue (percent) {
        return this.from + (this.diff*percent);
    } isValid() {
        return this.diff !== 0;
    } getPercent(from, to, current) {
        let percent = (current-from)/(to-from);
        if (percent < 0) { percent = 0; }
        else if (percent > 1) { percent = 1; }
        return percent;
    }
};


class Vector2 {
    constructor(from, to) {
        this.from  = from;
        this.value = new godot.Vector2();
        this.diff  = {
            x: to.x - from.x,
            y: to.y - from.y
        };
    } getValue (percent) {
        this.value.x = this.from.x + (this.diff.x*percent);
        this.value.y = this.from.y + (this.diff.y*percent);
        return this.value;
    } isValid() {
        return (Math.abs(this.diff.x)+Math.abs(this.diff.y)) !== 0;
    } getPercent(from, to, current) {
        const c = current.x + current.y;
        const f = from.x + from.y;
        const t = to.x + to.y;
        return (c-f)/(t-f);
    }
};


class Color {
    constructor(from, to) {
        this.from  = from;
        this.value = new godot.Color();
        this.diff  = [
            to[0]-from[0],
            to[1]-from[1],
            to[2]-from[2],
            to[3]-from[3]
        ];
    } getValue (percent) {
        this.value.r = this.from[0] + (this.diff[0]*percent);
        this.value.g = this.from[1] + (this.diff[1]*percent);
        this.value.b = this.from[2] + (this.diff[2]*percent);
        this.value.a = this.from[3] + (this.diff[3]*percent);
        return this.value;
    } isValid() {
        return (Math.abs(this.diff[0])+Math.abs(this.diff[1])+Math.abs(this.diff[2])+Math.abs(this.diff[3])) !== 0;
    } getPercent(from, to, current) {
        let val = undefined;
        if (from[3] !== to[3]) { val = (current.a-from[3])/(to[3]-from[3]); }
        else if (from[0] !== to[0]) { val = (current.r-from[0])/(to[0]-from[0]); }
        else if (from[1] !== to[1]) { val = (current.g-from[1])/(to[1]-from[1]); }
        else if (from[2] !== to[2]) { val = (current.b-from[2])/(to[2]-from[2]); }
        if (val > 1) { val = 1 } else if (val < 0){ val = 0; }

        return val === undefined ? 0 : val;
    }
};

const classes = { Apply, Vector2, Color };
export default classes;