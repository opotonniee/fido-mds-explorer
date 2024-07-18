#!/bin/sh

HTML=vendors.html
CSV=vendors.csv
TMP=entries.tmp
JS=vendors.js
COOKIES=cookies.tmp

CASPIO_ID=$1
VENDORS_URL=https://c0ezh785.caspio.com/dp/$CASPIO_ID
UENC_VENDORS_URL=$(printf %s "$VENDORS_URL" | jq -sRr @uri)

wget -O $HTML --save-cookies $COOKIES "${VENDORS_URL}"
if [ ! -f $HTML ]; then
  echo Failed to fetch vendor list
  exit 1
fi

APP_SESSION=$(grep appSession vendors.html | sed -r 's/^.*"appSession":"([^"]+)".*$/\1/' | tail -n 1)

wget --post-data "downloadFormat=csv&AjaxActionHostName=https://c0ezh785.caspio.com&cbAjaxReferrer=${UENC_VENDORS_URL}&cbParamList=" -O $CSV --load-cookies $COOKIES "${VENDORS_URL}?appSession=${APP_SESSION}&RecordID=&PageID=2&PrevPageID=&cpipage=&download=1&rnd=1712004236605"

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
rm -f $HTML $CSV $TMP $COOKIES $JS*
