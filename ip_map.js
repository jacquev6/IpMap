function RainbowDataSource() {
    return {
        resolution: 128,
        get: function( low, high ) {
            var fraction = ( low + high ) / ( this.resolution * this.resolution * 2 );
            var color = hsvToHex( 360 * fraction, 0.5, 1 );
            return {
                color: '#' + color,
                description: '<p>' + low + ' -> ' + high + '</p>',
            };
        }
    };
}

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
            for( countryCode in countries ) {
                var score = countries[ countryCode ];
                description += '<li>' + this.countries[ countryCode ].name + ': ' + score + ' addresses</li>';
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

function HilbertCurve( id, size, resolution, source ) {
    curve = {
        id: id,
        size: size,
        resolution: resolution,
        source: source,
        offset: { x: 0, y: 0 },
        level: resolution,

        // level in [ resolution, size / resolution / 2 ]
        // offset in [ 0, level - resolution ]
        // physical in [ 0, size - 1 ]
        // logical in [ 0, resolution - 1 ]
        // distance in [ 0, 2 ** level -1 ]

        physicalToLogical: function( px, py ) {
            if( py === undefined ) {
                py = px.py;
                px = px.px;
            }
            return {
                lx: Math.floor( this.resolution * px / this.size ),
                ly: Math.floor( this.resolution * py / this.size ),
            };
        },

        physicalToLogicalHalf: function( px, py ) {
            if( py === undefined ) {
                py = px.py;
                px = px.px;
            }
            return {
                lhx: Math.round( this.resolution * px / this.size ),
                lhy: Math.round( this.resolution * py / this.size ),
            };
        },

        logicalToPhysical: function( lx, ly ) {
            if( ly === undefined ) {
                ly = lx.ly;
                lx = lx.lx;
            }
            return {
                px: lx * this.size / this.resolution,
                py: ly * this.size / this.resolution,
            };
        },

        logicalToDistance: function( lx, ly ) {
            if( ly === undefined ) {
                ly = lx.ly;
                lx = lx.lx;
            }
            return xy2d( this.level, lx + this.offset.x, ly + this.offset.y );
        },

        draw: function() {
            var ctx = document.getElementById( this.id + '_canvas' ).getContext( '2d' );

            ctx.fillStyle = 'grey';
            ctx.fillRect( 0, 0, this.size, this.size );

            for( var lx = 0; lx < this.resolution; ++lx ) {
                for( var ly = 0; ly < this.resolution; ++ly ) {
                    var square = this.squares[ lx ][ ly ];

                    ctx.fillStyle = square.color;
                    var p = this.logicalToPhysical( lx, ly );
                    ctx.fillRect( p.px, p.py, this.size / this.resolution, this.size / this.resolution );
                }
            }

            ctx.beginPath();
            ctx.fillStyle = 'black';
            for( var lx = 0; lx < this.resolution - 1; ++lx ) {
                for( var ly = 0; ly < this.resolution; ++ly ) {
                    if( Math.abs( this.squares[ lx ][ ly ].distance - this.squares[ lx + 1 ][ ly ].distance ) > 1 ) {
                        var p1 = this.logicalToPhysical( lx + 1, ly );
                        var p2 = this.logicalToPhysical( lx + 1, ly + 1 );
                        ctx.moveTo( p1.px, p1.py );
                        ctx.lineTo( p2.px, p2.py );
                    }
                }
            }
            for( var lx = 0; lx < this.resolution; ++lx ) {
                for( var ly = 0; ly < this.resolution - 1; ++ly ) {
                    if( Math.abs( this.squares[ lx ][ ly ].distance - this.squares[ lx ][ ly + 1 ].distance ) > 1 ) {
                        var p1 = this.logicalToPhysical( lx, ly + 1 );
                        var p2 = this.logicalToPhysical( lx + 1, ly + 1 );
                        ctx.moveTo( p1.px, p1.py );
                        ctx.lineTo( p2.px, p2.py );
                    }
                }
            }
            ctx.stroke();
        },

        getDescription: function( px, py ) {
            var l = this.physicalToLogical( px, py );
            return this.squares[ l.lx ][ l.ly ].description;
        },

        zoomIn: function( px, py ) {
            this.tryZoom( px, py, 2 );
        },

        zoomOut:function( px, py ) {
            this.tryZoom( px, py, 0.5 );
        },

        tryZoom: function( px, py, zoom ) {
            var newLevel = this.level * zoom;
            if( newLevel <= this.source.resolution && newLevel >= this.resolution ) {
                var l = this.physicalToLogicalHalf( px, py );

                var newOffsetX = zoom * ( this.offset.x + l.lhx ) - l.lhx;
                var newOffsetY = zoom * ( this.offset.y + l.lhy ) - l.lhy;

                this.level = newLevel;
                this.offset.x = Math.max( 0, Math.min( newOffsetX, this.level - this.resolution ) );
                this.offset.y = Math.max( 0, Math.min( newOffsetY, this.level - this.resolution ) );

                this.recompute();
            }
        },

        initialize: function() {
            var container = $( '#' + this.id );
            container.append( '<canvas id="' + this.id + '_canvas" width="' + this.size + '" height="' + this.size + '"></canvas>' );
            container.append( '<div id="' + this.id + '_desc"></div>' );

            var canvas = $( '#' + this.id + '_canvas' );
            var description = $( '#' + this.id + '_desc' );

            canvas.mousemove( ( function( curve ) { return function( e ) {
                var px = e.pageX - this.offsetLeft;
                var py = e.pageY - this.offsetTop;
                description.html( curve.getDescription( px, py ) );
            }; } )( this ) );

            canvas.mouseleave( function( e ) {
                description.html( "" );
            } );

            canvas.mousewheel( ( function( curve ) { return function( e, delta ) {
                var px = e.pageX - this.offsetLeft;
                var py = e.pageY - this.offsetTop;

                if( delta > 0 ) {
                    curve.zoomIn( px, py );
                } else {
                    curve.zoomOut( px, py );
                }
            }; } )( this ) );

            this.recompute();
        },

        recompute: function() {
            this.recomputeSquares();
            this.draw();
        },

        recomputeSquares: function() {
            this.squares = {};

            var valuesPerSquare = this.source.resolution * this.source.resolution / ( this.level * this.level );

            var distances = {};
            for( var lx = 0; lx < this.resolution; ++lx ) {
                this.squares[ lx ] = {};
                for( var ly = 0; ly < this.resolution; ++ly ) {
                    var distance = this.logicalToDistance( lx, ly );
                    distances[ distance ] = { lx: lx, ly: ly };
                }
            }

            this.source.reset();
            var sortedDistances = Object.keys( distances ).sort( function( a, b ) { return a - b; } );
            for( distanceIndex in sortedDistances ) {
                var distance = sortedDistances[ distanceIndex ];
                var p = distances[ distance ];
                var firstValueInSquare = distance * valuesPerSquare;
                var lastValueInSquare = firstValueInSquare + valuesPerSquare - 1;

                this.squares[ p.lx ][ p.ly ] = this.source.get( firstValueInSquare, lastValueInSquare );
                this.squares[ p.lx ][ p.ly ].distance = distance;
            }
        },
    };

    curve.initialize();

    return curve;
}

function IpMap( id, size, resolution ) {
    $.get( 'data.json', function( data, textStatus, jqXHR ) {
        HilbertCurve( id, size, resolution, IpCountryDataSource( data ) );
    }, 'json' );
}
