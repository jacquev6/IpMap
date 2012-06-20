#!/usr/bin/env python

# See http://cloford.com/resources/codes/index.htm for the country -> continent mapping

import sys
import json
import urllib2
import zipfile
import io

# See http://www.maxmind.com/app/geolite for the ip -> country mapping
archiveName = "http://geolite.maxmind.com/download/geoip/database/GeoIPCountryCSV.zip"

archive = zipfile.ZipFile( io.BytesIO( urllib2.urlopen( archiveName ).read() ) )

csvFileName = ""
for member in archive.namelist():
    if member.endswith( ".csv" ):
        if csvFileName == "":
            csvFileName = member
        else:
            print "The archive", archiveName, "contains several csv files (at least '" + csvFileName + "' and '" + member + "'"
            exit( 1 )

countries = dict()
ranges = list()
highest = -1
for line in archive.open( csvFileName ):
    line = line.strip()[ 1:-1 ].split( '","' )
    assert len( line ) == 6, line

    low = int( line[ 2 ] )
    high = int( line[ 3 ] )
    assert highest < low <= high
    highest = high
    countryCode = line[ 4 ]
    countryName = line[ 5 ]

    if countryCode in countries:
        assert countries[ countryCode ] == countryName
    else:
        countries[ countryCode ] = countryName

    ranges.append( [
        low,
        high,
        countryCode,
    ] )

json.dump(
    {
        "ranges": ranges,
        "countries": countries,
    },
    open( "data.json", "wb" ),
    separators = ( ',', ':' )
)
