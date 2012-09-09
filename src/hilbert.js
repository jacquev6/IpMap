// See http://en.wikipedia.org/wiki/Hilbert_curve, section "Applications and mapping algorithms"
//convert (x,y) to d
function xy2d( n, x, y ) {
    var d = 0;
    for( var s = n / 2; s > 0; s /= 2 ) {
        var rx = ( x & s ) > 0;
        var ry = ( y & s ) > 0;
        d += s * s * ( ( 3 * rx ) ^ ry );
        var xy = rot( s, x, y, rx, ry );
        x = xy.x;
        y = xy.y;
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
        x = xy.x;
        y = xy.y;
        x += s * rx;
        y += s * ry;
        t /= 4;
    }
    return { x: x, y: y };
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
    return { x: x, y: y };
}

function RainbowDataSource() {
    return {
        resolution: 128,
        get: function( low, high ) {
            var fraction = ( low + high ) / ( this.resolution * this.resolution * 2 );
            var color = hsvToHex( 360 * fraction, 0.5, 1 );
            return {
                color: '#' + color,
                highlight: false,
            };
        },
        reset: function() {
        },
    };
}

function HilbertCurve( canvas, size, resolution, source ) {
    var theCurve = {
        canvas: canvas,
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

        distanceToLogical: function( d ) {
            xy = d2xy( this.level, d );
            return {
                lx: xy.x - this.offset.x,
                ly: xy.y - this.offset.y,
            };
        },

        draw: function() {
            var ctx = this.canvas.get( 0 ).getContext( '2d' );

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
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
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

            ctx.beginPath();
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            for( var lx = 0; lx < this.resolution; ++lx ) {
                for( var ly = 0; ly < this.resolution; ++ly ) {
                    var square = this.squares[ lx ][ ly ];

                    if( square.highlight ) {
                        var p = this.logicalToPhysical( lx, ly );
                        ctx.arc( p.px + this.size / this.resolution / 2, p.py + this.size / this.resolution / 2, this.size / this.resolution * 0.75, 0, 2 * Math.PI );
                    }
                }
            }
            ctx.stroke()
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
                var p = this.logicalToPhysical( l.lhx, l.lhy );

                var newOffsetX = Math.round( zoom * ( this.offset.x + l.lhx ) - l.lhx );
                var newOffsetY = Math.round( zoom * ( this.offset.y + l.lhy ) - l.lhy );

                this.level = newLevel;
                this.offset.x = Math.max( 0, Math.min( newOffsetX, this.level - this.resolution ) );
                this.offset.y = Math.max( 0, Math.min( newOffsetY, this.level - this.resolution ) );

                var image = new Image();
                image.src = this.canvas.get( 0 ).toDataURL( 'image/png' );
                var ctx = this.canvas.get( 0 ).getContext( '2d' );

                // jQuery dark magic I don't understand yet...
                $.cssHooks[ 'animatedScale' ] = {
                   get: function( elem, computed, extra ) { return 1; },
                   set: function( elem, value ) { }
                };
                $.fx.step.animatedScale = function ( fx ) {
                    $.style( fx.elem, fx.prop, fx.now );
                };
                // end of dark magic

                this.canvas.css( 'animatedScale', 1 );
                this.canvas.animate(
                    {
                        'animatedScale': zoom
                    },
                    {
                        duration: 200,
                        step: ( function( curve ) { return function( scale, fx ) {
                            ctx.clearRect( 0, 0, curve.size, curve.size );
                            ctx.save();
                            ctx.translate( ( 1 - scale ) * p.px, ( 1 - scale ) * p.py );
                            ctx.scale( scale, scale );
                            ctx.drawImage( image, 0, 0 );
                            ctx.restore();
                        } } )( this ),
                        complete: ( function( curve ) { return function() { curve.recompute(); } } )( this )
                    }
                );
            }
        },

        beginScroll: function( px, py ) {
            this.scrollingOrigin = { px: px, py: py };
            this.scrollingImage = new Image();
            this.scrollingImage.src = this.canvas.get( 0 ).toDataURL( 'image/png' );
        },

        doScroll: function( px, py ) {
            var ctx = this.canvas.get( 0 ).getContext( '2d' );
            ctx.clearRect( 0, 0, this.size, this.size );
            ctx.save();
            ctx.translate( px - this.scrollingOrigin.px, py - this.scrollingOrigin.py );
            ctx.drawImage( this.scrollingImage, 0, 0 );
            ctx.restore();
        },

        endScroll: function( px, py ) {
            if( this.scrollingOrigin ) {
                var threshold = this.size / this.resolution;
                var deltaX = Math.round( ( this.scrollingOrigin.px - px ) / threshold );
                var deltaY = Math.round( ( this.scrollingOrigin.py - py ) / threshold );

                this.offset.x = Math.max( 0, Math.min( this.offset.x + deltaX, this.level - this.resolution ) );
                this.offset.y = Math.max( 0, Math.min( this.offset.y + deltaY, this.level - this.resolution ) );

                this.recompute();
                this.scrollingOrigin = undefined;
            }
        },

        mousemove: function( callback ) {
            this.canvas.mousemove( ( function( curve ) { return function( e ) {
                var px = e.pageX - this.offsetLeft;
                var py = e.pageY - this.offsetTop;

                var l = curve.physicalToLogical( px, py );
                var square = curve.squares[ l.lx ][ l.ly ];
                callback( l.lx, l.ly, square );
            }; } )( this ) );
        },

        mouseleave: function( callback ) {
            this.canvas.mouseleave( callback );
        },

        initialize: function() {
            this.canvas.attr( 'width', this.size );
            this.canvas.attr( 'height', this.size );

            this.canvas.mousewheel( ( function( curve ) { return function( e, delta ) {
                var px = e.pageX - this.offsetLeft;
                var py = e.pageY - this.offsetTop;

                if( delta > 0 ) {
                    curve.zoomIn( px, py );
                } else {
                    curve.zoomOut( px, py );
                }
            }; } )( this ) );

            var scroll = ( function( curve ) { return function( e ) {
                curve.doScroll( e.pageX, e.pageY );
            }; } )( this );

            this.canvas.mousedown( ( function( curve ) { return function( e ) {
                curve.beginScroll( e.pageX, e.pageY );
                curve.canvas.on( 'mousemove', scroll );
            }; } )( this ) );

            $( 'body' ).mouseup( ( function( curve ) { return function( e ) {
                curve.endScroll( e.pageX, e.pageY );
                curve.canvas.off( 'mousemove', scroll );
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

            var pointsByDistance = {};
            for( var lx = 0; lx < this.resolution; ++lx ) {
                this.squares[ lx ] = {};
                for( var ly = 0; ly < this.resolution; ++ly ) {
                    var distance = this.logicalToDistance( lx, ly );
                    pointsByDistance[ distance ] = { lx: lx, ly: ly };
                }
            }

            this.source.reset();
            var sortedDistances = Object.keys( pointsByDistance ).sort( function( a, b ) { return a - b; } );
            for( var distanceIndex in sortedDistances ) {
                var distance = sortedDistances[ distanceIndex ];
                var p = pointsByDistance[ distance ];
                var firstValueInSquare = distance * valuesPerSquare;
                var lastValueInSquare = firstValueInSquare + valuesPerSquare - 1;

                this.squares[ p.lx ][ p.ly ] = this.source.get( firstValueInSquare, lastValueInSquare );
                this.squares[ p.lx ][ p.ly ].distance = distance;
            }
        },
    };

    theCurve.initialize();

    return theCurve;
}
