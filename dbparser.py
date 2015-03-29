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

tree = ET.parse('./ormvmasterfile.xml')
indb = tree.getroot()

outdb = OrderedDict()
outfile = file("ormvdb.json",'w')

imgdir = 'img'

# Thanks, stackoverflow!
def warning(*objs):
    print("WARNING: ", *objs, file=sys.stderr)

def getPhoto(rec):
    rec.hasphoto = bool(rec.find("PHOTO").text)
    if not rec.hasphoto :
        print("INFO: no photo for record " + str(rec.recid))
        return None

    photo = rec.find("photo_x0020_attachments")

    if photo is None :
        print("INFO: Record " + str(rec.recid) + " has a photo listed, but no photo is present in the database.")
        return None
    else:
        if not os.path.exists(imgdir):
            os.makedirs(imgdir)
        
        #print("DEBUG: trying to decode "+str(photo.text))
        try :
            p = b64decode(photo.find("FileData").text.replace("\n","").replace("\r",""))
            ext = '.' + p[12:18:2]
            print("DEBUG: header is "+str(ext))
            p = p[20:]
            # must skip 20 bytes of MS header...
            # TODO: consume these bytes and determine appropriate file extension
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
    else :
        return t.text

def initRec(rec):
    rec.recid = int(rec.find("REC").text)

# XML is gross.
for rec in indb:

    initRec(rec)

    rec.fname = getTag(rec,"FNAME")
    rec.lname = getTag(rec,"LNAME")
    photo = getPhoto(rec)
    rec.hometown = getTag(rec,"HOME")
    rec.county = getTag(rec,"COUNTY")

    if rec.recid in outdb:
        warning("Duplicate record ID ({0}), skipping".format(rec.recid))
        continue
    else:
        outdb[rec.recid] = OrderedDict([
        ('fname',rec.fname)
        ,('lname',rec.lname) 
        ,('hasphoto',rec.hasphoto)
        ,('photo',photo)
        ,('hometown',rec.hometown)
        ,('county',rec.county)
        ])
    
print(json.dumps(outdb),file=outfile)
