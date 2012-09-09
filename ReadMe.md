This is a browsable map showing geographic locations of to IPv4 addresses. It was inspired by [xkcd 195, Map of the Internet](http://xkcd.com/195/).
You can try it on [vincent-jacques.net](http://vincent-jacques.net/IpMap/)

Details
=======

Hilbert curves are described on [Wikipedia](http://en.wikipedia.org/wiki/Hilbert_curve).

Each square on the curve has a hue giving the marority location of its IP addresses, and a saturation giving the part of this location in this square.

GeoIp data is from [MaxMind](http://www.maxmind.com/app/geolite), and country/region/continent mapping is from [cloford.com](http://cloford.com/resources/codes/index.htm).

Hack
====

It's pure HTML5, so you can launch it locally: clone the [Github repository](https://github.com/jacquev6/IpMap), run the `initialize.py` Python script to download data and dependencies, and open index.html.

The HTML part is minimal, and the javascript part is fairly decoupled: the `HilbertCurve` function is reusable (it accepts any `DataSource`), and the `IpMap` function is built from `HilbertCurve` and a `IpCountryDataSource`.
