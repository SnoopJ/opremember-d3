#!/bin/bash

TOTALRECORDS=514

if [ ! -d IMAGES ]; then
  mkdir IMAGES
fi

for i in `seq 1 $TOTALRECORDS`;
do 
awk -v HOWMANY=$i -f extractimage.awk ormvmasterfile.xml | base64 -d - | dd bs=1 skip=20 of=IMAGES/$i.jpg
done

