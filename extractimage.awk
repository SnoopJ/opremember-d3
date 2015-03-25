BEGIN {COUNTER=0; OFS=""; ORS="";}

/<FileData>/{COUNTER++; sub(/<FileData>/,"");}
/<FileData>/,/\<\/FileData\>/
    { 
        if(COUNTER<HOWMANY){next} 
        sub(/<FileData>/,""); 
        sub(/\r+/,""); 
        if(!/\<\/?FileData\>/) {print}
    }
/\<\/FileData\>/{
    if(COUNTER>HOWMANY){exit}
}
