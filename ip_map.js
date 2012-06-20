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

    function Square( x, y, countries ) {
        return {
            x: x,
            y: y,
            countries: countries,
            mostRepresentedCountry: ( function() {
                var bestCountryCode = '';
                var bestNumberOfIps = 0;

                $.each( countries, function( countryCode, numberOfIps ) {
                    if( numberOfIps > bestNumberOfIps ) {
                        bestNumberOfIps = numberOfIps;
                        bestCountryCode = countryCode;
                    }
                } );

                return bestCountryCode;
            } )( countries ),
        };
    }

    function Squares( size, ranges ) {
        var squares = [];

        var numberOfSquares = size * size;
        var ipsPerSquare = 0x100000000 / numberOfSquares;

        var rangeIndex = 0;
        for( var d = 0; d < numberOfSquares; ++d ) {
            var countries = new Object();

            var firstIpInSquare = d * ipsPerSquare;
            var lastIpInSquare = ( d + 1 ) * ipsPerSquare - 1;

            while( rangeIndex < ranges.length ) {
                var range = ranges[ rangeIndex ];

                if( range.firstIp > lastIpInSquare ) {
                    break;
                }

                if( countries[ range.countryCode ] === undefined ) {
                    countries[ range.countryCode ] = 0;
                }

                countries[ range.countryCode ] += Math.min( range.lastIp, lastIpInSquare ) - Math.max( range.firstIp, firstIpInSquare ) + 1;

                if( range.lastIp > lastIpInSquare ) {
                    break;
                }

                ++rangeIndex;
            }

            var xy = d2xy( size, d );
            squares.push( Square( xy[ 0 ], xy[ 1 ], countries ) );
        }

        return squares;
    }

    return {
        canvasId: canvasId,
        size: size,
        squares: Squares( size, Ranges( data.ranges ) ),
        hues: Hues( data.countries ),

        draw: function() {
            var canvas = document.getElementById( this.canvasId );
            var ctx = canvas.getContext( '2d' );

            for( var d in this.squares ) {
                var square = this.squares[ d ];

                bestCountryCode = square.mostRepresentedCountry;

                var color;
                if( bestCountryCode == '' ) {
                    color = 'black';
                } else {
                    color = '#' + hsvToHex( this.hues[ bestCountryCode ], 1, 1 );
                }
                ctx.fillStyle =  color;

                ctx.fillRect( square.x * canvas.width / this.size, square.y * canvas.height / this.size, canvas.width / this.size, canvas.height / this.size );
            }
        },
    };
}
