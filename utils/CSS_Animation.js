import animEasing from "./CSS_Animation_Easings.js";
import classes from "./CSS_Animation_Classes.js";

class Animation {
    constructor(from, to, target, duration, prop, method = "Apply", easingName = "linear") {
        this.value  = new classes[ method ](from, to);
        this.target = target;
        this.duration = duration;
        this.prop   = prop;
        this.it     = 0;
        this.easing = animEasing[ easingName ];
        if (!this.easing) throw new Error(`Cannot find easing "${ easingName }"`);

        const current  = this.target[ this.prop ] || 0;
        this.ended     = !this.value.isValid() || (duration <= 0);

        let percent = (current-from)/(to-from);
        if (percent < 0) { percent = 0; }
        else if (percent > 1) { percent = 1; }
        this.enlapsed = percent*this.duration;
    }

    play(delta) {
        if (this.ended) return false;
        if (this.it > 1000) { console.error("overflow"); return false; }
        this.it = this.it + 1;

        this.enlapsed += delta;
        let perc = this.enlapsed/this.duration;

        let ended = false;
        if (perc < 0)  { perc = 0; }
        else if (perc >= 1) { perc = 1; ended = true; }

        this.target[ this.prop ] = this.value.getValue(this.easing(perc));
        this.ended = ended;
        return !this.ended;
    }
}

export default Animation;