import animEasing from "./Easings.js";
import classes from "./Classes.js";

class Animation {
    constructor(from, to, target, duration, prop, method = "Apply", easingName = "linear", source = "default") {
        this.value  = new classes[ method ](from, to);
        this.target = target;
        this.duration = duration;
        this.prop   = prop;
        this.it     = 0;
        this.easing = animEasing[ easingName ];
        if (!this.easing) throw new Error(`Cannot find easing "${ easingName }"`);
        this.applyMethod = {
            "default": (perc) => {
                this.target[ this.prop ] = this.value.getValue(this.easing(perc));
            },
            "material": (perc) => {
                this.target.set_shader_param(this.prop, this.value.getValue(this.easing(perc)));

            },
        }[ source === "material" ? "material" : "default" ];
        const current = source === "material" ? this.target.get_shader_param(this.prop) : this.target[ this.prop ];

        this.ended    = !this.value.isValid() || (duration <= 0);
        this.enlapsed = this.value.getPercent(from, to, current || 0)*this.duration;
        if (this.enlapsed > 1) { this.enlapsed = 1; }
        else if (this.enlapsed < 0) { this.enlapsed = 0; }
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

        this.applyMethod(perc);
        this.ended = ended;
        return !this.ended;
    }
}

export default Animation;