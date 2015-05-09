#!/usr/bin/python

# Parses ormvmasterfile.xml

from __future__ import print_function

import os
import sys
import xml.etree.ElementTree as ET
import json
#import binascii
from base64 import b64decode
from collections import OrderedDict
import re

DOPHOTOS = False
if not DOPHOTOS:
    print("Skipping photo processing...")

tree = ET.parse('./ormvmasterfile.xml')
indb = tree.getroot()

outdb = OrderedDict()

imgdir = 'img'

placesfile = file('placenames.txt','r')
places = placesfile.readlines()

# Thanks, stackoverflow!
def warning(*objs):
    print("WARNING: ", *objs, file=sys.stderr)

def getPhoto(rec):
    rec.hasphoto = bool(rec.find("PHOTO").text)
    if not rec.hasphoto :
        print("INFO: no photo for record " + str(rec.recid))
        return None

    photo = rec.find("photo_x0020_attachments")

    if DOPHOTOS :
        if photo is None :
            print("INFO: Record " + str(rec.recid) + " has a photo listed, but no photo is present in the database.")
            return None
        else:
            if not os.path.exists(imgdir):
                os.makedirs(imgdir)
            
            try :
                p = b64decode(photo.find("FileData").text.replace("\n","").replace("\r",""))
                # TODO(?): sanity check here, not all extensions are 3 letters...
                ext = '.' + p[12:18:2]
                print("DEBUG: header is "+str(ext))
                p = p[20:]
                # MS reserves 20 bytes for...who the hell knows.
                fn = str(rec.recid)+ext
                f = file(imgdir+"/"+fn,'wb')
                print(p,file=f)
                f.close()
                return fn
            except :
                warning("Could not decode photo for record " + str(rec.recid))
                return None


def getTag(rec,tag):
    t  = rec.find(tag)
    if t is None:
        print("INFO: Tag " + tag + " for record " + str(rec.recid)+ "requested, but none found")
	return None
    else :
        return t.text

def initRec(rec):
    rec.recid = int(rec.find("REC").text)

def getLocation(name):
    r = re.compile("^[^\t]+\t"+re.escape(name.lstrip()),re.IGNORECASE)
    res = []
    for p in places:
	    if r.search(p) is not None:
		    res.append(p)
    return res

# XML is gross.
for rec in indb:
    initRec(rec)

    if rec.recid in outdb:
        warning("Duplicate record ID ({0}), skipping".format(rec.recid))
        continue

    rec.fname = getTag(rec,"FNAME")
    rec.lname = getTag(rec,"LNAME")
    photo = getPhoto(rec)
    rec.county = getTag(rec,"COUNTY")
    
    rec.hometown = getTag(rec,"HOME")
    rec.latitude = -77
    rec.longitude = 39
    if rec.hometown is not None:
        loc = getLocation(rec.hometown)
        if len(loc) > 0:
            print("Hometown (%s) successfully recovered (%s time(s))! (recid %s)"% (rec.hometown,len(loc),rec.recid))
            info = (loc[0]).split("\t")
            lat = float(info[4])
            lng = float(info[5])
            print("(Lat,Long) should be (%f,%f)" % (lat,lng))
            rec.latitude = lat
            rec.longitude = lng
        else:
            print("Hometown (%s) not recovered (recid %s)"% (rec.hometown,rec.recid))
	
    outfile = file('json/'+str(rec.recid)+".json",'w')
    outrec = OrderedDict( [
        ('recid',rec.recid)
        ,('fname',rec.fname)
        ,('lname',rec.lname) 
        ,('hasphoto',rec.hasphoto)
        ,('photo',photo)
        ,('hometown',rec.hometown)
	,('latitude',rec.latitude)
	,('longitude',rec.longitude)
        ,('county',rec.county) ] )
    outdb[rec.recid] = outrec
    print(json.dumps(outrec), file=outfile)
    outfile.close()
    
#print(json.dumps(outdb),file=outfile)
#print("]",file=outfile)
