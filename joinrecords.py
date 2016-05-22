#!/usr/bin/python


from __future__ import print_function

import os, sys, glob
import json
from collections import OrderedDict
import re

recsbycounty = {}
for f in glob.glob("json/[0-9]*.json"):
    print(f)
    with open(f, 'r') as infile:
        rec = json.loads(infile.read())
        recid = rec['recid']
        countyid = rec['countyid']
        if countyid not in recsbycounty.keys():
            recsbycounty[countyid] = {'countyid': countyid, 'casualties': []}
        recsbycounty[countyid]['casualties'].append(rec)

with open('json/bycounty.json', 'w') as outfile:
    json.dump([v for k, v in recsbycounty.items()], outfile)
