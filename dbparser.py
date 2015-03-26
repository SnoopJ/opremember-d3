#!/usr/bin/python

# Parses ormvmasterfile.xml

import xml.etree.ElementTree as ET
import json

tree = ET.parse('./ormvmasterfile.xml')
indb = tree.getroot()

outdb = dict() 

outdb[1] = "butt"

for rec in indb:

    recid = int(rec.find("REC").text)
    fname = rec.find("FNAME").text
    lname = rec.find("LNAME").text

    att = rec.find("photo_x0020_attachments")

    '''
    print "Record number " +\
    rec.find("REC").text +\
    ": " + rec.find("LNAME").text +\
    ", " + rec.find("FNAME").text +\
    " ~~ Has photo based on <PHOTO> tag: " + ("yes" if int(rec.find("PHOTO").text)>0 else "no")+\
    " ~~ Has photo based on <FileData> tag: " + ("yes" if (att is not None and att.find("FileData") is not None) else "no")
    '''

    if recid in outdb:
        print("WARNING: Duplicate record ID ({0}), skipping".format(recid))
        continue
    else:
        outdb[recid] = { 'fname':fname, 'lname':lname }
    
print json.dumps(outdb)
