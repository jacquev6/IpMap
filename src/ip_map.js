function IpCountryDataSource( data ) {
    function Continents( continentsData ) {
        var continentsList = [];
        var continentsByCode = {};

        $.each( continentsData, function( index, continent ) {
            var code = continent[ 0 ];
            var name = continent[ 1 ];

            var continent = {
                code: code,
                name: name,
                regions: [],
            };

            continentsList.push( continent );
            continentsByCode[ code ] = continent;
        } );

        return {
            list: continentsList,
            byCode: continentsByCode,
        };
    }

    function Regions( regionsData, continentsByCode ) {
        var regionsList = [];
        var regionsByCode = {};

        $.each( regionsData, function( index, region ) {
            var code = region[ 0 ];
            var name = region[ 1 ];
            var continent = continentsByCode[ region[ 2 ] ];

            var region = {
                code: code,
                name: name,
                continent: continent,
                countries: [],
            };

            continent.regions.push( region );
            regionsList.push( region );
            regionsByCode[ code ] = region;
        } );

        return {
            list: regionsList,
            byCode: regionsByCode,
        };
    }

    function Countries( countriesData, regionsByCode ) {
        var countriesList = [];
        var countriesByCode = {};

        $.each( countriesData, function( index, country ) {
            var code = country[ 0 ];
            var name = country[ 1 ];
            var region = regionsByCode[ country[ 2 ] ];

            var country = {
                code: code,
                name: name,
                region: region,
            };

            region.countries.push( country );
            countriesList.push( country );
            countriesByCode[ code ] = country;
        } );

        return {
            list: countriesList,
            byCode: countriesByCode,
        }
    }

    function Geographies( data ) {
        var continents = Continents( data.continents );
        var regions = Regions( data.regions, continents.byCode );
        var countries = Countries( data.countries, regions.byCode );

        computeHues( continents.list );

        return {
            continents: continents.list,
            regions: regions.list,
            countries: countries.list,
            countriesByCode: countries.byCode,
        };
    }

    function computeHues( continents ) {
        function HueRange( min, max, index, length ) {
            return {
                min: min + ( max - min ) * ( index + 0.0 ) / length,
                center: min + ( max - min ) * ( index + 0.5 ) / length,
                max: min + ( max - min ) * ( index + 1.0 ) / length,
            };
        }

        $.each( continents, function( continentIndex, continent ) {
            continent.hue = HueRange( 0, 360, continentIndex, continents.length );
            $.each( continent.regions, function( regionIndex, region ) {
                region.hue = HueRange( continent.hue.min, continent.hue.max, regionIndex, continent.regions.length );
                $.each( region.countries, function( countryIndex, country ) {
                    country.hue = HueRange( region.hue.min, region.hue.max, countryIndex, region.countries.length );
                } );
            } );
        } );
    }

    function Ranges( rangesData, countriesByCode ) {
        var ranges = [];

        $.each( rangesData, function( index, range ) {
            var low = range[ 0 ];
            var high = range[ 1 ];
            var country = countriesByCode[ range[ 2 ] ];

            var range = {
                low: low,
                high: high,
                country: country,
            };

            ranges.push( range );
        } );

        return ranges;
    }

    var geographies = Geographies( data );
    var ranges = Ranges( data.ranges, geographies.countriesByCode );

    return {
        resolution: 65536,
        reset: function() {
            this.rangeIndex = 0;
        },
        ipToLocate: -1,
        get: function( low, high ) {
            var scores = this.computeScores( low, high );

            var color;
            if( scores.length == 0 ) {
                color = '#222';
            } else {
                color = '#' + hsvToHex( scores[ 0 ].geography.hue.center, scores[ 0 ].score / ( high - low + 1 ), 1 );
            }

            return {
                highlight: this.ipToLocate >= low && this.ipToLocate <= high,
                color: color,
                low: low,
                high: high,
                scores: scores,
            };
        },
        computeScores: function( low, high ) {
            var scoreAndGeographies = {};

            while( this.rangeIndex < this.ranges.length ) {
                var range = this.ranges[ this.rangeIndex ];

                var geography = this.getGeography( range.country );

                if( range.low > high ) {
                    break;
                }

                var addresses = Math.min( range.high, high ) - Math.max( range.low, low ) + 1;
                if( addresses > 0 ) {
                    if( scoreAndGeographies[ geography.code ] === undefined ) {
                        scoreAndGeographies[ geography.code ] = { score: 0, geography: geography };
                    }

                    scoreAndGeographies[ geography.code ].score += addresses;
                }

                if( range.high > high ) {
                    break;
                }

                ++this.rangeIndex;
            }

            var scores = [];
            $.each( scoreAndGeographies, function( code, scoreAndGeography ) {
                scores.push( scoreAndGeography );
            } );

            return scores.sort( function( a, b ) { return b.score - a.score; } );
        },

        activateContinents: function() {
            this.getGeography = function( country ) { return country.region.continent; };
        },

        activateRegions: function() {
            this.getGeography = function( country ) { return country.region; };
        },

        activateCountries: function() {
            this.getGeography = function( country ) { return country; };
        },

        locate: function( ipToLocate ) {
            this.ipToLocate = ipToLocate;
        },

        continents: geographies.continents,
        regions: geographies.regions,
        countries: geographies.countries,
        ranges: ranges,
    };
};

function IpMap( id, size, resolution ) {
    function ipStringFromInteger( ip ) {
        return (
            ( ( ip >> 24 ) & 0xFF )
            + '.' + ( ( ip >> 16 ) & 0xFF )
            + '.' + ( ( ip >> 8 ) & 0xFF )
            + '.' + ( ip & 0xFF )
        );
    }

    function ipIntegerFromString( ip ) {
        parts = ip.split( '.' );
        return parseInt( parts[ 0 ] ) * 0x01000000 + parseInt( parts[ 1 ] ) * 0x00010000 + parseInt( parts[ 2 ] ) * 0x00000100 + parseInt( parts[ 3 ] ) * 0x00000001;
    }

    var parent = $( '#' + id );

    parent.css( "min-height", size + 20 + 'px' );
    parent.css( "padding", '10px' );
    parent.append(
        '<canvas></canvas>'
        + '<p>Display: '
        + '<input type="radio" name="display" value="continents" checked="checked" />Continents&nbsp;'
        + '<input type="radio" name="display" value="regions" />Regions&nbsp;'
        + '<input type="radio" name="display" value="countries" />Countries'
        + '</p>'
        + '<p><input type="checkbox" name="locate_ip" /> Locate an address: <input name="ip_to_locate" value="127.0.0.1" /></p>'
        + '<div class="desc"></div>'
    );

    var canvas = $( 'canvas', parent );
    canvas.css( 'margin', '10px' );
    canvas.css( 'margin-right', '50px' );
    canvas.css( 'float', 'left' );

    var description = $( '.desc', parent );

    var source = IpCountryDataSource( ip_data );
    source.activateContinents();
    var curve = HilbertCurve( canvas, size, resolution, source );

    $( 'input[name="display"]', parent ).change( function() {
        var display = $( 'input[name="display"]:checked', parent ).val();
        if( display == 'countries' ) {
            source.activateCountries();
        } else if( display == 'regions' ) {
            source.activateRegions();
        } else {
            source.activateContinents();
        }
        curve.recompute();
    } );

    function locateIp() {
        if( $( 'input[name="locate_ip"]', parent ).is( ':checked' ) ) {
            source.locate( ipIntegerFromString( $( 'input[name="ip_to_locate"]', parent ).val() ) );
        } else {
            source.locate( -1 );
        }
        curve.recompute();
    }
    $( 'input[name="locate_ip"]', parent ).change( locateIp );
    $( 'input[name="ip_to_locate"]', parent ).change( locateIp );

    curve.mousemove( function( x, y, square ) {
        var numberOfAddresses = square.high - square.low + 1;
        var desc = '<p>' + numberOfAddresses + ' addresses from ' + ipStringFromInteger( square.low ) + ' to ' + ipStringFromInteger( square.high ) + ':</p><ul>';
        var otherGeographies = 0;
        $.each( square.scores, function( index, scoreAndGeography ) {
            if( index < 16 ) {
                var color = '#' + hsvToHex( scoreAndGeography.geography.hue.center, 1, 1 );
                desc += '<li style="margin-top: 4px; margin-bottom: 4px">';
                desc += '<span style="white-space: nowrap; border: 2px solid ' + color + '"><span style="background-color: ' + color + '">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>&nbsp;' + scoreAndGeography.geography.name + '&nbsp;</span>';
                desc += ': ' + scoreAndGeography.score + ' addresses (' + Math.round( 10000 * scoreAndGeography.score / numberOfAddresses ) / 100 + '%)';
                desc += '</li>';
            } else {
                otherGeographies += scoreAndGeography.score;
            }
        } );
        if( otherGeographies > 0 ) {
            desc += '<li>Others: ' + otherGeographies + ' addresses</li>';
        }
        desc += '</ul>';

        description.html( desc );
    } );

    curve.mouseleave( function() {
        description.html( "" );
    } );
}
