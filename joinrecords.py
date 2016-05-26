#!/usr/bin/python


from __future__ import print_function

import os, sys, glob
import json
from collections import OrderedDict
import re

recs = []
for f in glob.glob("json/[0-9]*.json"):
    print(f)
    with open(f, 'r') as infile:
        rec = json.loads(infile.read())
        recs.append(rec)

with open('json/flatdb.json', 'w') as outfile:
    json.dump(recs, outfile)
