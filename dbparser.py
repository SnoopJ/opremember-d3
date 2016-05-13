#!/usr/bin/python

# Parses ormvmasterfile.xml

from __future__ import print_function

import os
import sys
import xml.etree.ElementTree as ET
import json
# import binascii
from base64 import b64decode
from collections import OrderedDict
import re
import code

# TODO: ask dad if rec.county="BALTIMORE" is county, city, or possibly both...
# dict of regex inputs
counties = {
    1: "Allegany",
    3: "Anne Arundel",
    5: "Baltimore County",
    9: "Calvert",
    11: "Caroline",
    13: "Carroll",
    15: "Cecil",
    17: "Charles",
    19: "Dorchester",
    21: "Frederick",
    23: "Garrett",
    25: "Harford",
    27: "Howard",
    29: "Kent",
    31: "Montgomery",
    # 33: "Prince George's",
    33: "Prince",
    35: "Queen Anne",
    37: "Mary",
    39: "Somerset",
    41: "Talbot",
    43: "Washington",
    45: "Wicomico",
    47: "Worcester",
    510: "Baltimore( CITY)?$",
    # cheating here just so I can see what else breaks.
    999: "OTHER"
}

# dict of compiled regexes
ctyregs = {}
for ctyid, cty in counties.iteritems():
    ctyregs[ctyid] = re.compile(cty, re.IGNORECASE)

# DOPHOTOS = False
DOPHOTOS = True
if not DOPHOTOS:
    print("Skipping photo processing...")

tree = ET.parse('./ormvmasterfile.xml')
indb = tree.getroot()

# outdb = OrderedDict()
outdb = []

imgdir = 'img'

placesfile = file('MDppls.txt', 'r')
places = placesfile.readlines()


# Thanks, stackoverflow!
def warning(*objs):
    print("WARNING: ", *objs, file=sys.stderr)


def getPhoto(rec):
    rec.hasphoto = bool(rec.find("PHOTO").text)
    if not rec.hasphoto:
        print("INFO: no photo for record " + str(rec.recid))
        rec.photo = "1111.png"
        return None

    photo = rec.find("photo_x0020_attachments")

    if DOPHOTOS:
        if photo is None:
            print("INFO: Record " + str(rec.recid) + " has a photo listed, but no photo is present in the database.")
            return None
        else:
            if not os.path.exists(imgdir):
                os.makedirs(imgdir)

            try:
                p = b64decode(photo.find("FileData").text.replace("\n", "").replace("\r", ""))
                # TODO(?): sanity check here, not all extensions are 3 letters.
                ext = '.' + p[12:18:2]
                print("DEBUG: header is " + str(ext))
                p = p[20:]
                # MS reserves 20 bytes for...who the hell knows.
                fn = str(rec.recid) + ext
                f = file(imgdir + "/" + fn, 'wb')
                print(p, file=f)
                f.close()
                return fn
            except:
                warning("Could not decode photo for record " + str(rec.recid))
                return None
    else:
        return "1111.png"


def getTag(rec, tag):
    t = rec.find(tag)
    if t is None:
        print("INFO: Tag " + tag + " for record " + str(rec.recid) + "requested, but none found")
        return None
    else:
        return t.text


def initRec(rec):
    rec.recid = int(rec.find("REC").text)
    rec.badloc = False


def getLocation(rec):
    r = re.compile("^[^\t]+\t" + re.escape(rec.hometown.lstrip()), re.IGNORECASE)
    res = []
    for p in places:
        if r.search(p) is not None:
            res.append(p)
    return res


def parseLocation(loc, rec):
    if len(loc) > 0:
        # print("Hometown (%s) successfully recovered (%s time(s))! (recid %s)"% (rec.hometown,len(loc),rec.recid))
        info = (loc[0]).split("\t")
        lat = float(info[4])
        lon = float(info[5])
        # print("(Lat,Long) should be (%f,%f)" % (lat,lon))
        rec.latitude = lat
        rec.longitude = lon
    else:
        print("Hometown (%s) not recovered (recid %s)" % (rec.hometown, rec.recid))
        code.interact(local=dict(globals(), **locals()))


def fixRecLocation(newlocname, rec):
    rec.hometown = newlocname
    newloc = getLocation(rec)
    parseLocation(newloc, rec)

hometownswaps = {
    'MARLOWE HEIGHTS': 'MARLOW HEIGHTS',
    'LONACONNG': 'LONACONING',
    'ROSS NECK': 'CAMBRIDGE',  # there is no place called ROSS NECK, but there's a Rossneck airport in Cambridge...
    'WEST HYATTSVILLE': 'HYATTSVILLE',
    'MOUNT RANIER': 'MOUNT RAINIER',
    'WHALEYSVILLE': 'WHALEYVILLE'
}


def doRecs(db, idx=-1):
    # for rec in indb:
    while idx < len(db) - 1:
        idx += 1
        rec = db[idx]
        initRec(rec)
        print("Processing recid %i (idx %i)" % (rec.recid, idx))

        if rec.recid in outdb:
            warning("Duplicate record ID ({0}), skipping".format(rec.recid))
            continue

        rec.fname = getTag(rec, "FNAME")
        rec.lname = getTag(rec, "LNAME")
        rec.photo = getPhoto(rec)
        rec.county = getTag(rec, "COUNTY")

        rec.casdate = getTag(rec, "CASDATE")

        if rec.casdate is not None and rec.casdate.strip().isdigit():
            print("casdate is %s" % rec.casdate)
            t = datetime.strptime(rec.casdate.strip(), "%Y%m%d")
            rec.casdate = (t - datetime(1970, 1, 1)).total_seconds() * 1000  # convert to time since epoch
        else:
            rec.casdate = None

        recconfirmed = False
        for ctyid, r in ctyregs.iteritems():
            # print("Searching for county resolution of \"%s\", trying against \"%s\""%(rec.county,counties[ctyid]))
            if r.search(rec.county) is not None:
                if recconfirmed:
                    print("Tried to confirm twice!")
                    raise SystemExit
                rec.countyid = ctyid
                print("Confirmed countyid %s" % ctyid)
                recconfirmed = True
        if not recconfirmed:
            print("Could not confirm!")
            raise SystemExit

        rec.hometown = getTag(rec, "HOME")
        if rec.hometown is None:
            rec.hometown = '?'
            rec.badloc = True
        if rec.hometown.strip() in hometownswaps.keys():
            print("Correcting hometown from %s to %s", rec.hometown, hometownswaps[rec.hometown.strip()])
            rec.hometown = hometownswaps[rec.hometown.strip()]
        rec.longitude = -78.6122
        rec.latitude = 39.2904
        # TODO: resolve county name with county id, then check against county
        #   that SHOULD resolve duplicate false positives...
        # 10th field in place names file is 3-digit county id
        if rec.hometown is not None:
            # print("Trying to resolve hometown: %s" % rec.hometown )
            loc = getLocation(rec)
            if len(loc) > 0:
                parseLocation(loc, rec)
            else:
                print("Hometown (%s) not recovered (recid %s)" % (rec.hometown, rec.recid))
                rec.badloc = True
                # uncomment to interactively poke around with what went wrong
                # code.interact(local=dict(globals(), **locals()))

            # print("Testing %i results against county name %s" % (len(loc),rec.county))
            for l in loc:
                info = l.split("\t")
                lat = rec.latitude
                lon = rec.longitude
                # print("raw candidate %s" % info)
                if info[11] is '':
                    print("Hometown candidate %s doesn't have a countyid, skipping..." % info[1])
                    continue
                if int(info[11]) == rec.countyid:
                    llat = float((l.split("\t"))[4])
                    llon = float((l.split("\t"))[5])
                    dist = pow(pow(llat - lat, 2) + pow(llon - lon, 2), 0.5)
                    if dist > 1:  # mark the location as suspect if candidates are "too far" apart
                        # print("Dist is larger than 1 for rec %i! \a\a"%rec.recid)
                        rec.badloc = True
                    print("Distance from loc[0] lat/long is %f" % dist)
                    print("Hometown candidate %s is in county %s" % (info[1], info[11]))

        with file('json/' + str(rec.recid) + ".json", 'w') as outfile:
            outrec = OrderedDict([
                ('recid', rec.recid),
                ('fname', rec.fname),
                ('lname', rec.lname),
                ('hasphoto', rec.hasphoto),
                ('photo', rec.photo),
                ('hometown', rec.hometown),
                ('latitude', rec.latitude),
                ('longitude', rec.longitude),
                ('county', rec.county),
                ('countyid', rec.countyid),
                ('badloc', rec.badloc)
            ])
            outdb.append(outrec)
            json.dump(outrec, outfile)
            # print(json.dumps(outrec), file=outfile)

doRecs(indb)
# TODO: shit don't work yo
# outfile = file("ormvdb.json.long",'w')
# print(json.dumps(outdb).replace("},","},\n"),file=outfile)
# outfile.close()

print("All done!\a\a\a")
