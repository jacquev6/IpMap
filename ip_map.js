function Map( canvasId, size, data, descriptionId ) {
    function ipStringFromInteger( ip ) {
        return (
            ( ( ip >> 24 ) & 0xFF )
            + '.' + ( ( ip >> 16 ) & 0xFF )
            + '.' + ( ( ip >> 8 ) & 0xFF )
            + '.' + ( ip & 0xFF )
        );
    }

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

    function Country( code, name, hue ) {
        return {
            code: code,
            name: name,
            hue: hue,
        };
    }

    function Countries( countries ) {
        var c = new Object();

        var countryCodes = Object.keys( countries );

        $.each( countryCodes, function( index, countryCode ) {
            var countryName = countries[ countryCode ];
            var hue = 360 * index / countryCodes.length;
            c[ countryCode ] = Country( countryCode, countryName, hue );
        } );

        return c;
    }

    function Square( x, y, firstIp, lastIp, countries ) {
        return {
            x: x,
            y: y,
            firstIp: firstIp,
            lastIp: lastIp,
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

            getDescription: function( allCountries ) {
                // Sort countries by descending number of addresses
                var sortedCountries = [];
                for( var countryCode in this.countries ) {
                    sortedCountries.push( [ countryCode, this.countries[ countryCode ] ] );
                }
                sortedCountries.sort( function(a, b) { return b[1] - a[1] } );

                var countries = "";
                for( var index in sortedCountries ) {
                    var countryCode = sortedCountries[ index ][ 0 ];
                    countries += '<li>' + allCountries[ countryCode ].name + ': ' + this.countries[ countryCode ] + ' addresses</li>';
                }

                return (
                    '<p>IP addresses:' + ipStringFromInteger( this.firstIp ) + ' to ' + ipStringFromInteger( this.lastIp ) + '</p>'
                    + '<p>Countries:</p>'
                    + countries
                );
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
            squares.push( Square( xy[ 0 ], xy[ 1 ], firstIpInSquare, lastIpInSquare, countries ) );
        }

        return squares;
    }

    var map = {
        canvas: document.getElementById( canvasId ),
        size: size,
        squares: Squares( size, Ranges( data.ranges ) ),
        countries: Countries( data.countries ),

        draw: function() {
            var ctx = this.canvas.getContext( '2d' );

            for( var d in this.squares ) {
                var square = this.squares[ d ];

                bestCountryCode = square.mostRepresentedCountry;

                var color;
                if( bestCountryCode == '' ) {
                    color = 'black';
                } else {
                    color = '#' + hsvToHex( this.countries[ bestCountryCode ].hue, 1, 1 );
                }
                ctx.fillStyle =  color;

                ctx.fillRect( square.x * this.canvas.width / this.size, square.y * this.canvas.height / this.size, this.canvas.width / this.size, this.canvas.height / this.size );
            }
        },

        getDescription: function( x, y ) {
            x = Math.floor( this.size * x / this.canvas.width );
            y = Math.floor( this.size * y / this.canvas.height );
            var d = xy2d( this.size, x, y );
            return this.squares[ d ].getDescription( this.countries );
        },

        zoomIn: function( x, y ) {
            x = Math.floor( this.size * x / this.canvas.width );
            y = Math.floor( this.size * y / this.canvas.height );

            console.log( "Zoom in", x, y );
        },

        zoomOut:function( x, y ) {
            x = Math.floor( this.size * x / this.canvas.width );
            y = Math.floor( this.size * y / this.canvas.height );

            console.log( "Zoom out", x, y );
        },
    };

    var canvas = $( '#' + canvasId );
    canvas.mousemove( function( e ) {
        var x = e.pageX - this.offsetLeft;
        var y = e.pageY - this.offsetTop;
        $( '#' + descriptionId ).html( map.getDescription( x, y ) );
    } );

    canvas.mouseleave( function( e ) {
        $( '#' + descriptionId ).html( "" );
    } );

    canvas.mousewheel( function( e, delta ) {
        var x = e.pageX - this.offsetLeft;
        var y = e.pageY - this.offsetTop;

        if( delta > 0 ) {
            map.zoomIn( x, y );
        } else {
            map.zoomOut( x, y );
        }
    } );

    return map;
}
