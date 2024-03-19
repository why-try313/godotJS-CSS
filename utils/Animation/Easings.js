const animEasing = {};
// No easing, no acceleration
animEasing["linear"] = ( t ) => t;
// Slight acceleration from zero to full speed
animEasing["easen-sine"] = ( t ) => { return -1 * Math.cos( t * ( Math.PI / 2 ) ) + 1; };
// Slight deceleration at the end
animEasing["ease-out-sine"] = ( t ) => { return Math.sin( t * ( Math.PI / 2 ) ); };
// Slight acceleration at beginning and slight deceleration at end
animEasing["ease-in-out-sine"] = ( t ) => { return -0.5 * ( Math.cos( Math.PI * t ) - 1 ); };
// Accelerating from zero velocity
animEasing["ease-in-quad"] = ( t ) => { return t * t; };
// Decelerating to zero velocity
animEasing["ease-out-quad"] = ( t ) => { return t * ( 2 - t ); };
// Acceleration until halfway, then deceleration
animEasing["ease-in-out-quad"] = ( t ) => { return t < 0.5 ? 2 * t * t : - 1 + ( 4 - 2 * t ) * t; };
// Accelerating from zero velocity
animEasing["ease-in-cubic"] = ( t ) => { return t * t * t; };
// Decelerating to zero velocity
animEasing["ease-out-cubic"] = ( t ) => { const t1 = t - 1; return t1 * t1 * t1 + 1; };
// Acceleration until halfway, then deceleration
animEasing["ease-in-out-cubic"] = ( t ) => { return t < 0.5 ? 4 * t * t * t : ( t - 1 ) * ( 2 * t - 2 ) * ( 2 * t - 2 ) + 1; };
// Accelerating from zero velocity
animEasing["ease-in-quart"] = ( t ) => { return t * t * t * t; };
// Decelerating to zero velocity
animEasing["ease-out-quart"] = ( t ) => { const t1 = t - 1; return 1 - t1 * t1 * t1 * t1; };
// Acceleration until halfway, then deceleration
animEasing["ease-in-out-quart"] = ( t ) => { const t1 = t - 1; return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * t1 * t1 * t1 * t1; };
// Accelerating from zero velocity
animEasing["ease-in-quint"] = ( t ) => { return t * t * t * t * t; };
// Decelerating to zero velocity
animEasing["ease-out-quint"] = ( t ) => { const t1 = t - 1; return 1 + t1 * t1 * t1 * t1 * t1; };
// Acceleration until halfway, then deceleration
animEasing["ease-in-out-quint"] = ( t ) => {const t1 = t - 1; return t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * t1 * t1 * t1 * t1 * t1; };
// Increasing velocity until stop
animEasing["ease-in-circ"] = ( t ) => { const scaledTime = t / 1; return -1 * ( Math.sqrt( 1 - scaledTime * t ) - 1 ); };
// Start fast, decreasing velocity until stop
animEasing["ease-out-circ"] = ( t ) => {const t1 = t - 1; return Math.sqrt( 1 - t1 * t1 ); };
// Slow movement backwards then fast snap to finish
animEasing["ease-in-back"] = ( t, magnitude = 1.70158 ) => { return t * t * ( ( magnitude + 1 ) * t - magnitude ); };
// Accelerate exponentially until finish
animEasing["ease-in-expo"] = ( t ) => { if( t === 0 ) { return 0; } return Math.pow( 2, 10 * ( t - 1 ) ); };
// Initial exponential acceleration slowing to stop
animEasing["ease-out-expo"] = ( t ) => { if( t === 1 ) { return 1; } return ( -Math.pow( 2, -10 * t ) + 1 ); };
// Exponential acceleration and deceleration
animEasing["ease-in-out-expo"] = ( t ) => {
    if( t === 0 || t === 1 ) { return t; }
    const scaledTime = t * 2;
    const scaledTime1 = scaledTime - 1;
    if( scaledTime < 1 ) { return 0.5 * Math.pow( 2, 10 * ( scaledTime1 ) ); }
    return 0.5 * ( -Math.pow( 2, -10 * scaledTime1 ) + 2 );
};



// Fast increase in velocity, fast decrease in velocity
animEasing["ease-in-out-circ"] = ( t ) => {
    const scaledTime = t * 2;
    const scaledTime1 = scaledTime - 2;

    if( scaledTime < 1 ) {
        return -0.5 * ( Math.sqrt( 1 - scaledTime * scaledTime ) - 1 );
    }

    return 0.5 * ( Math.sqrt( 1 - scaledTime1 * scaledTime1 ) + 1 );
};


// Fast snap to backwards point then slow resolve to finish
animEasing["ease-out-back"] = ( t,  magnitude = 1.70158 ) => {
    const scaledTime = ( t / 1 ) - 1;
    return ( scaledTime * scaledTime * ( ( magnitude + 1 ) * scaledTime + magnitude ) ) + 1;
};

// Slow movement backwards, fast snap to past finish, slow resolve to finish
animEasing["ease-in-elastic"] = ( t,  magnitude = 1.70158 ) => {
    const scaledTime = t * 2;
    const scaledTime2 = scaledTime - 2;

    const s = magnitude * 1.525;

    if( scaledTime < 1) {
        return 0.5 * scaledTime * scaledTime * ( ( ( s + 1 ) * scaledTime ) - s );
    }

    return 0.5 * ( scaledTime2 * scaledTime2 * ( ( s + 1 ) * scaledTime2 + s ) + 2 );

};
// Bounces slowly then quickly to finish
animEasing["ease-in-elastic"] = ( t,  magnitude = 0.7 ) => {
    if( t === 0 || t === 1 ) { return t; }

    const scaledTime = t / 1;
    const scaledTime1 = scaledTime - 1;

    const p = 1 - magnitude;
    const s = p / ( 2 * Math.PI ) * Math.asin( 1 );

    return -( Math.pow( 2, 10 * scaledTime1 ) * Math.sin( ( scaledTime1 - s ) * ( 2 * Math.PI ) / p ) );

};

// Fast acceleration, bounces to zero
animEasing["ease-out-elastic"] = ( t,  magnitude = 0.7 ) => {
    if( t === 0 || t === 1 ) { return t; }

    const p = 1 - magnitude;
    const scaledTime = t * 2;

    const s = p / ( 2 * Math.PI ) * Math.asin( 1 );
    return ( Math.pow( 2, -10 * scaledTime ) * Math.sin( ( scaledTime - s ) * ( 2 * Math.PI ) / p ) ) + 1;

};

// Slow start and end, two bounces sandwich a fast motion
animEasing["ease-in-out-elastic"] = ( t,  magnitude = 0.65 ) => {
    if( t === 0 || t === 1 ) { return t; }

    const p = 1 - magnitude;
    const scaledTime = t * 2;
    const scaledTime1 = scaledTime - 1;

    const s = p / ( 2 * Math.PI ) * Math.asin( 1 );

    if( scaledTime < 1 ) {
        return -0.5 * ( Math.pow( 2, 10 * scaledTime1 ) * Math.sin( ( scaledTime1 - s ) * ( 2 * Math.PI ) / p ) );
    }

    return ( Math.pow( 2, -10 * scaledTime1 ) * Math.sin( ( scaledTime1 - s ) * ( 2 * Math.PI ) / p ) * 0.5 ) + 1;

};

// Bounce to completion
animEasing["ease-out-bounce"] = ( t ) => {
    const scaledTime = t / 1;

    if( scaledTime < ( 1 / 2.75 ) ) {
        return 7.5625 * scaledTime * scaledTime;
    } else if( scaledTime < ( 2 / 2.75 ) ) {
        const scaledTime2 = scaledTime - ( 1.5 / 2.75 );
        return ( 7.5625 * scaledTime2 * scaledTime2 ) + 0.75;
    } else if( scaledTime < ( 2.5 / 2.75 ) ) {
        const scaledTime2 = scaledTime - ( 2.25 / 2.75 );
        return ( 7.5625 * scaledTime2 * scaledTime2 ) + 0.9375;
    } else {
        const scaledTime2 = scaledTime - ( 2.625 / 2.75 );
        return ( 7.5625 * scaledTime2 * scaledTime2 ) + 0.984375;
    }

};

// Bounce increasing in velocity until completion
animEasing["ease-in-bounce"] = ( t ) => { return 1 - animEasing["ease-out-bounce"]( 1 - t ); };

// Bounce in and bounce out
animEasing["ease-in-out-bounce"] = ( t ) => {
    if( t < 0.5 ) { return animEasing["ease-in-bounce"]( t * 2 ) * 0.5; }
    return ( animEasing["ease-out-bounce"]( ( t * 2 ) - 1 ) * 0.5 ) + 0.5;
};

export default animEasing;