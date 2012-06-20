function Map( canvasId, size, data ) {
    function Ranges( ranges ) {
        var r = [];

        $.each( ranges, function( index, range ) {
            r.push( {
                firstIp: range[ 0 ],
                lastIp: range[ 1 ],
                countryCode: range[ 2 ],
            } );
        } );

        return r;
    }

    function Hues( countries ) {
        var hues = new Object();

        countries = Object.keys( countries );

        $.each( countries, function( index, countryCode ) {
            hues[ countryCode ] = 360 * index / countries.length;
        } );

        return hues;
    }

    function Squares( size, ranges ) {
        var squares = [];

        var numberOfSquares = size * size;
        var ipsPerSquare = 0x100000000 / numberOfSquares;

        var rangeIndex = 0;
        for( var d = 0; d < numberOfSquares; ++d ) {
            var square = new Object();

            var firstIpInSquare = d * ipsPerSquare;
            var lastIpInSquare = ( d + 1 ) * ipsPerSquare - 1;

            while( rangeIndex < ranges.length ) {
                var range = ranges[ rangeIndex ];

                if( range.firstIp > lastIpInSquare ) {
                    break;
                }

                if( square[ range.countryCode ] === undefined ) {
                    square[ range.countryCode ] = 0;
                }

                square[ range.countryCode ] += Math.min( range.lastIp, lastIpInSquare ) - Math.max( range.firstIp, firstIpInSquare ) + 1;

                if( range.lastIp > lastIpInSquare ) {
                    break;
                }

                ++rangeIndex;
            }

            squares.push( square );
        }

        return squares;
    }

    return new Object( {
        canvasId: canvasId,
        size: size,
        squares: Squares( size, Ranges( data.ranges ) ),
        hues: Hues( data.countries ),

        draw: function() {
            var canvas = document.getElementById( this.canvasId );
            var ctx = canvas.getContext( '2d' );

            for( var d in this.squares ) {
                var bestCountryCode = '';
                var bestNumberOfIps = 0;
                $.each( this.squares[ d ], function( countryCode, numberOfIps ) {
                    if( numberOfIps > bestNumberOfIps ) {
                        bestNumberOfIps = numberOfIps;
                        bestCountryCode = countryCode;
                    }
                } );

                var color;
                if( bestCountryCode == '' ) {
                    color = 'black';
                } else {
                    color = '#' + hsvToHex( this.hues[ bestCountryCode ], 1, 1 );
                }
                ctx.fillStyle =  color;

                var xy = d2xy( this.size, d );
                ctx.fillRect( xy[ 0 ] * canvas.width / this.size, xy[ 1 ] * canvas.height / this.size, canvas.width / this.size, canvas.height / this.size );
            }
        },

    } );
}
