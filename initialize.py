#!/usr/bin/env python

import os
import sys
import json
import urllib2
import zipfile
import io
import collections
import HTMLParser

Continent = collections.namedtuple( "Continent", [ "code", "name" ] )
Region = collections.namedtuple( "Region", [ "code", "name", "continent" ] )
Country = collections.namedtuple( "Country", [ "code", "name", "region" ] )
Range = collections.namedtuple( "Range", [ "low", "high", "country" ] )

def identifier( n ):
    return chr( ord( "A" ) + n / 26 ) + chr( ord( "A" ) + n % 26 )

class Initializer:
    def run( self ):
        self.download( "https://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js" )
        self.download( "https://raw.github.com/brandonaaron/jquery-mousewheel/master/jquery.mousewheel.js" )
        self.extractGeography()
        self.extractIpCountryMapping()
        self.dump()

    def extractGeography( self ):
        self.continents = list()
        self.regions = list()
        self.countries = list()
        # See http://cloford.com/resources/codes/index.htm
        with open( "geography.txt", "r" ) as geography:
            for line in geography:
                continentName, regionName, countryName, countryCode = line.strip().split( "\t" )
                if len( self.continents ) == 0 or continentName != self.continents[ -1 ].name:
                    self.continents.append( Continent( "c" + identifier( len( self.continents ) ), continentName ) )
                if len( self.regions ) == 0 or regionName != self.regions[ -1 ].name:
                    self.regions.append( Region( "r" + identifier( len( self.regions ) ), regionName, self.continents[ -1 ].code ) )
                assert all( country.code != countryCode for country in self.countries ), ( countryCode, countryName )
                assert all( country.name != countryName for country in self.countries ), ( countryCode, countryName )
                self.countries.append( Country( countryCode, countryName, self.regions[ -1 ].code ) )

    def extractIpCountryMapping( self ):
        usefullCountryCodes = set()
        archiveName = self.download( "http://geolite.maxmind.com/download/geoip/database/GeoIPCountryCSV.zip" )
        archive = zipfile.ZipFile( archiveName )

        csvFileName = ""
        for member in archive.namelist():
            if member.endswith( ".csv" ):
                if csvFileName == "":
                    csvFileName = member
                else:
                    print "The archive", archiveName, "contains several csv files (at least '" + csvFileName + "' and '" + member + "'"
                    exit( 1 )

        self.ranges = list()
        highest = 0
        for line in archive.open( csvFileName ):
            line = line.strip()[ 1:-1 ].split( '","' )
            assert len( line ) == 6, line

            low = int( line[ 2 ] )
            high = int( line[ 3 ] )
            assert highest < low <= high
            highest = high
            countryCode = line[ 4 ]
            countryName = line[ 5 ]

            usefullCountryCodes.add( countryCode )

            assert any( country.code == countryCode and country.name == countryName for country in self.countries ), ( countryName, countryCode )

            self.ranges.append( Range( low, high, countryCode ) )

        for country in self.countries:
            assert country.code in usefullCountryCodes, "Remove " + str(country) + " from geography.txt"

    def download( self, url ):
        name = os.path.join( "downloads", url.split( "/" )[ -1 ] )
        if not os.path.exists( name ):
            open( name, "wb" ).write( urllib2.urlopen( url ).read() )
        return name

    def dump( self ):
        with open( os.path.join( "data", "ip_data.js" ), "wb" ) as f:
            f.write( "ip_data = " )
            json.dump(
                {
                    "continents": self.continents,
                    "regions": self.regions,
                    "countries": self.countries,
                    "ranges": self.ranges,
                },
                f,
                separators = ( ',', ':' )
            )
            f.write( ";" )

Initializer().run()
