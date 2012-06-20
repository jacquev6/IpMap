// See http://en.wikipedia.org/wiki/Hilbert_curve, section "Applications and mapping algorithms"
//convert (x,y) to d
function xy2d( n, x, y ) {
    var d = 0;
    for( var s = n / 2; s > 0; s /= 2 ) {
        var rx = ( x & s ) > 0;
        var ry = ( y & s ) > 0;
        d += s * s * ( ( 3 * rx ) ^ ry );
        var xy = rot( s, x, y, rx, ry );
        x = xy[ 0 ];
        y = xy[ 1 ];
    }
    return d;
}

//convert d to (x,y)
function d2xy( n, d ) {
    var t = d;
    var x = 0;
    var y = 0;
    for( var s = 1; s < n; s *= 2 ) {
        var rx = 1 & ( t / 2 );
        var ry = 1 & ( t ^ rx );
        var xy = rot( s, x, y, rx, ry );
        x = xy[ 0 ];
        y = xy[ 1 ];
        x += s * rx;
        y += s * ry;
        t /= 4;
    }
    return [ x, y ]
}

//rotate/flip a quadrant appropriately
function rot( n, x, y, rx, ry ) {
    if( ry == 0 ) {
        if( rx == 1 ) {
            x = n - 1 - x;
            y = n - 1 - y;
        }
        var t = x;
        x = y;
        y = t;
    }
    return [ x, y ]
}
