#!/bin/sh

HTML=vendors.html
CSV=vendors.csv
TMP=entries.tmp
JS=vendors.js
COOKIES=cookies.tmp

# Download URL from https://fidoalliance.org/certification/functional-certification/vendor-ids/

CASPIO_ID=$1
VENDORS_URL=https://c0ezh785.caspio.com/dp/$CASPIO_ID

wget -O $CSV ${VENDORS_URL}&downloadFormat=csv&RecordID=&PageID=2&PrevPageID=&cpipage=&download=1&rnd=1712004236605

if [ ! -f $CSV ]; then
  echo Failed to fetch vendor list
  exit 1
fi

tail -n +2 $CSV | sed -r 's/"([^"]*)","([^"]*)"/  "\2": "\1",/' > $TMP

if [ ! -f $TMP ]; then
  echo Failed to convert file
  exit 2
fi

echo '
/*
   GENERATED FILE
   from http://c0ezh785.caspio.com/
*/

// eslint-disable-next-line no-unused-vars
const vendors = {

  // extracted' > $JS

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

sed -i -e 's/\r//g' $JS

mv $JS ../js
rm -f $CSV $TMP $JS*
