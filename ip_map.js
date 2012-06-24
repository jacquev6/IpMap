function IpCountryDataSource( data ) {
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

    function Countries( countries ) {
        var c = new Object();

        var countryCodes = Object.keys( countries );

        $.each( countryCodes, function( index, countryCode ) {
            var countryName = countries[ countryCode ];
            var hue = 360 * index / countryCodes.length;
            c[ countryCode ] = {
                code: countryCode,
                name: countryName,
                hue: hue,
            };
        } );

        return c;
    }

    return {
        resolution: 65536,
        reset: function() {
            this.rangeIndex = 0;
        },
        get: function( low, high ) {
            var countries = {};
            var bestCountryScore = 0;
            var bestCountryCode = '';

            while( this.rangeIndex < this.ranges.length ) {
                var range = this.ranges[ this.rangeIndex ];

                if( range.firstIp > high ) {
                    break;
                }

                if( countries[ range.countryCode ] === undefined ) {
                    countries[ range.countryCode ] = 0;
                }

                countries[ range.countryCode ] += Math.min( range.lastIp, high ) - Math.max( range.firstIp, low ) + 1;

                if( countries[ range.countryCode ] > bestCountryScore ) {
                    bestCountryScore = countries[ range.countryCode ];
                    bestCountryCode = range.countryCode;
                }

                if( range.lastIp > high ) {
                    break;
                }

                ++this.rangeIndex;
            }

            var color;
            if( bestCountryCode == '' ) {
                color = '#222';
            } else {
                color = '#' + hsvToHex( this.countries[ bestCountryCode ].hue, bestCountryScore / ( high - low + 1 ), 1 );
            }

            var description = '<p>Addresses ' + ipStringFromInteger( low ) + ' to ' + ipStringFromInteger( high ) + '</p><ul>';
            var sortedCountries = [];
            for( countryCode in countries ) {
                var score = countries[ countryCode ];
                sortedCountries.push( { code: countryCode, score: score } );
            }
            sortedCountries = sortedCountries.sort( function( a, b ) { return b.score - a.score; } );
            for( index in sortedCountries ) {
                description += '<li>' + this.countries[ sortedCountries[ index ].code ].name + ': ' + sortedCountries[ index ].score + ' addresses</li>';
            }
            description += '</ul>';

            return {
                color: color,
                description: description,
            };
        },

        ranges: Ranges( data.ranges ),
        countries: Countries( data.countries ),
        rangeIndex: 0,
    };
};

function IpMap( id, size, resolution ) {
    $.get( 'data.json', function( data, textStatus, jqXHR ) {
        HilbertCurve( id, size, resolution, IpCountryDataSource( data ) );
    }, 'json' );
}
