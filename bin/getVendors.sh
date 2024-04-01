#!/bin/sh

HTML=vendors.html
TMP=entries.tmp
JS=vendors.js

wget -O $HTML "https://c0ezh785.caspio.com/dp.asp?AppKey=f8df3000b085149a62d743569af3"

if [ ! -f $HTML ]; then
  echo Failed to fetch vendor list
  exit 1
fi

grep '<table ' vendors.html | sed -e 's/<script.*$//g' | sed -e 's/^<div [^>]*><div [^>]*>//' | sed -e "s/action=[^ ]*//" | sed -e 's/&[a-z]*;//g' | xpath -q -e "//table[@data-cb-name='cbTable']/tr" | tail -n +2 | sed -e 's/^.*<td.*cbResultSetCalculatedField">//' | sed -e "s/<\/td><td[^>]*>/@@@/"  | sed -e 's/<\/td>.*$//' | sed -r 's/([^@]*)@@@([^@]*)/  \"\2\": \"\1\",/' > $TMP


if [ ! -f $TMP ]; then
  echo Failed to convert file
  exit 2
fi

echo '
/*
   GENERATED FILE
   from http://c0ezh785.caspio.com/dp.asp?AppKey=f8df3000b085149a62d743569af3
*/

// eslint-disable-next-line no-unused-vars
const vendors = {
' > $JS

 cat $TMP >> $JS

echo '
  // manual
  "0017": "LGE",
  "001E": "BTWorks",
  "0022": "Movenda",
  "0030": "Thales",
  "0031": "ATsolutions",
  "0063": "VTC SmartTech",
  "0064": "SecuGen",
  "0066": "Capy",
  "006F": "Hanko",
  "1EA8": "Excelsecu",
  "DAB8": "DDS"
};' >> $JS

rm $HTML $TMP
mv $JS ../js
