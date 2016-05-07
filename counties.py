#!/usr/bin/python

from __future__ import print_function
import json
f = file('md.json','r')
md = json.load(f)
a = {}

for c in md['features']:
    props = c['properties']
    name = props['GEODESC']
    ctyid = props['CNTY00']
    a[ctyid]=name

of = file('counties.txt','w')

for c in sorted(a.items()):
    print("%s,%s"%(str(c[0]),str(c[1])),file=of)

of.close()
    
