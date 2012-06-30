// See http://snipplr.com/view/14590/
function hsvToRgb( h, s, v ) {
    var r, g, b;
    var i;
    var f, p, q, t;
     
    // Make sure our arguments stay in-range
    h = Math.max( 0, Math.min( 360, h ) );
    s = Math.max( 0, Math.min( 1, s ) );
    v = Math.max( 0, Math.min( 1, v ) );

    if(s == 0) {
        r = g = b = v;
    } else {
        h /= 60;
        i = Math.floor( h );
        f = h - i;
        p = v * ( 1 - s);
        q = v * ( 1 - s * f );
        t = v * ( 1 - s * ( 1 - f ) );

        switch( i ) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q;
        }
    }

    return [ Math.round( r * 255 ), Math.round( g * 255 ), Math.round( b * 255 ) ];
}

// See http://www.javascripter.net/faq/rgbtohex.htm
function rgbToHex( r, g, b ) {
    return toHex( r ) + toHex( g ) + toHex( b );
}

function toHex( n ) {
 n = Math.max( 0, Math.min( n, 255 ) );
 return '0123456789ABCDEF'.charAt( ( n - n % 16 ) / 16 )
      + '0123456789ABCDEF'.charAt( n % 16 );
}

function hsvToHex( h, s, v ) {
    rgb = hsvToRgb( h, s, v );
    return rgbToHex( rgb[ 0 ], rgb[ 1 ], rgb[ 2 ] );
}
