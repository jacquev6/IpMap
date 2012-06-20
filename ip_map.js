function Map( canvasId, size, data, descriptionId ) {
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

            getDescription: function() {
                return '<p>' + this.mostRepresentedCountry + '</p>';
            },
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

    var map = {
        canvas: document.getElementById( canvasId ),
        size: size,
        squares: Squares( size, Ranges( data.ranges ) ),
        hues: Hues( data.countries ),

        draw: function() {
            var ctx = this.canvas.getContext( '2d' );

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

                ctx.fillRect( square.x * this.canvas.width / this.size, square.y * this.canvas.height / this.size, this.canvas.width / this.size, this.canvas.height / this.size );
            }
        },

        getDescription: function( x, y ) {
            x = Math.floor( this.size * x / this.canvas.width );
            y = Math.floor( this.size * y / this.canvas.height );
            var d = xy2d( this.size, x, y );
            return this.squares[ d ].getDescription();
        }
    };

    $( '#' + canvasId ).mousemove( function( e ) {
        var x = e.pageX - this.offsetLeft;
        var y = e.pageY - this.offsetTop;
        $( '#' + descriptionId ).html( map.getDescription( x, y ) );
    } );

    $( '#' + canvasId ).mouseleave( function( e ) {
        $( '#' + descriptionId ).html( "" );
    } );

    return map;
}
