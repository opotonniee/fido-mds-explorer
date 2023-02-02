'use strict';
/* globals $, x509, mdsJson, Tabulator, LAST_MDS_UPDATE */

let id = 1;
let table;
let cert;

function type(obj) {
  return Object.prototype.toString.call(obj).match(/.* (.*)\]/)[1];
}

// CSV from http://c0ezh785.caspio.com/dp.asp?AppKey=f8df3000b085149a62d743569af3
// replace "^(.*),(.*)$"" with "  $2: $1,"
// last update: 28 June 2021
const vendors = {
  // from payload
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
  "DAB8": "DDS",
  // from CSV
  "0010": "Sharp",
  "0011": "FUJITSU CONNECTED TECHNOLOGIES LIMITED",
  "0012": "RaonSecure Co., Ltd.",
  "0013": "ETRI",
  "0014": "CrucialTec",
  "0015": "Egis Technology Inc.",
  "0016": "Sensory, Inc.",
  "0019": "GOTRUSTID Inc.",
  "001B": "Huawei Device Co., Ltd.",
  "001D": "Shenzhen National Engineering Laboratory of Digital Television  Co.,Ltd.",
  "001F": "EyeVerify, Inc.",
  "0020": "Dream Security Co., Ltd. Korea",
  "0024": "Giesecke & Devrient",
  "0027": "Secuve Co., Ltd.",
  "0028": "SGA Solutions",
  "002A": "Coolpad Group Limited",
  "002C": "KT",
  "002E": "Hancom WITH",
  "0032": "Open Security Research",
  "0033": "Tobesmart",
  "0037": "Queralt Inc.",
  "0038": "Redrock Biometrics, Inc.",
  "0039": "Lightfactor",
  "003A": "LG Uplus Corp.",
  "003B": "Austria Card",
  "003D": "IsItYou, Ltd.",
  "003F": "thinkAT",
  "0040": "Highmaru Inc.",
  "0041": "Gallagher North America Inc.",
  "0042": "SsenStone",
  "0043": "KICA Inc.",
  "0044": "NBREDS Inc",
  "0045": "HYPR",
  "0048": "IRISYS CO.,Ltd.",
  "0049": "HYUNDAI MOTOR GROUP",
  "004A": "Uni-ID Technology (Beijing) Co.,Ltd",
  "004B": "Ji Nan Sheng An Information Technology Co., Ltd",
  "004D": "China Financial Certification Authority",
  "004F": "Meizu Technology Co., Ltd.",
  "0050": "Visionlabs LLC",
  "0051": "Dayside, Inc.",
  "0052": "i-Sprint Innovations Pte Ltd",
  "0054": "IoTrust Co., Ltd",
  "0056": "PixelPin Ltd.",
  "0057": "Mobile-ID Technologies And Services Joint Stock Company",
  "0059": "AIDEEP Co., Ltd.",
  "005A": "AirCUVE",
  "005B": "Rowem Inc",
  "005C": "Penta Security Systems Inc.",
  "005D": "Octatco",
  "0062": "FUJITSU LIMITED",
  "0075": "Tangem AG",
  "0076": "Changing Information Technology Inc.",
  "0077": "UbiNtisLab Co.,Ltd.",
  "0079": "vivo Mobile Communication Co.,Ltd.",
  "0080": "CybrSecurity Corporation",
  "0081": "Honor Device Co., Ltd.",
  "0083": "Hyweb Global Technology Co. Ltd",
  "0085": "CyberLink Corp.",
  "008A": "Tendyron Corporation",
  "0261": "TWCA",
  "0262": "TD Tech Ltd",
  "0263": "Presidio Identity",
  "096E": "Feitian Technologies Co., Ltd.",
  "1111": "SK Planet",
  "2E84": "MOTOROLA mobile technology (wuhan) communications co., LTD",
  "4359": "Cypress",
  "4746": "Shenzhen Goodix Technology Co., Ltd",
  "4D48": "Safran Identity & Security",
  "4E4E": "Nok Nok Labs",
  "5143": "Qualcomm Technologies, Inc.",
  "53D5": "Samsung SDS",
  "565A": "Verizon",
  "5AFE": "Synaptics Incorporated",
  "9874": "ING",
  "AD10": "Plantronics, Inc.",
  "BD51": "OneSpan",
  "CD01": "SK Telecom",
  "D409": "Daon",
  "FACE": "FaceTec"
};
function getVendor(aaid) {
  let vendorId = aaid ? aaid.substring(0,4) : undefined;
  let vendorName = vendorId ? vendors[vendorId.toUpperCase()] : undefined;
  return vendorName ? vendorName : "??";
}

function imageTag(src) {
  return src ? "<img src='" + src + "'/>" : "";
}

function certificate(obj) {
  let certHtml = "<li><ul>";
  try {
    obj = obj.replace(/[ \r\n]/gm, ''); // discard spaces and line breaks

    cert = new x509.X509Certificate(obj);

    let b64Cert = encodeURIComponent(btoa(obj));
    let decoderUrl = "https://gchq.github.io/CyberChef/#recipe=Parse_X.509_certificate('Base64')&input=" + b64Cert;
    let certSubject = '<a href="' + decoderUrl + '" target="blank">' + cert.subject + '</a>';

    certHtml += stringify({ "Subject": certSubject});
    certHtml += stringify({ "Issuer": cert.issuer});
    certHtml += stringify({ "Not Before": cert.notBefore});
    certHtml += stringify({ "Not After": cert.notAfter});
    certHtml += stringify({ "Serial Number": cert.serialNumber});
    certHtml += stringify({ "Public Key": {
      "Algorithm": cert.publicKey.algorithm,
      "Value": cert.publicKey.rawData,
    }});
    certHtml += stringify({ "Signature": {
      "Algorithm": cert.signatureAlgorithm,
      "Value": cert.signature,
    }});
  } catch (error) {
    certHtml += error;
  }
  certHtml += "</ul></li>";
  return certHtml;
}

function stringify(obj) {
  if (type(obj) === "Function") {
    return "<span>function</span>";
  } else if (type(obj) === "Undefined") {
    return "<span>undefined</span>";
  } else  if (type(obj) === "Null") {
    return "<span>null</span>";
  } else if (type(obj) === "Number") {
    return obj;
  } else if (type(obj) === "String") {
    return '"' + obj + '"';
  } else if (type(obj) === "Date") {
    return '"' + obj.toGMTString() + '"';
  } else if (type(obj) === "Array") {
    return '<ol>' + obj.map(function (o) { return "<li>" + stringify(o) + "</li>\n"; }).join("") + '</ol>\n';
  } else if (type(obj)  === "ArrayBuffer") {
    return [...new Uint8Array(obj)].map(x => x.toString(16).padStart(2, '0')).join('');
  } else if (type(obj) === "Object") {
    var result = [];
    Object.keys(obj).forEach(function (key) {
      let val;

      // specific decodings:

      // Icon
      if (key == "icon") {
        val = imageTag(obj[key]);

      // Certificates
      } else if (key == "attestationRootCertificates") {
        val = '<ol>' + obj[key].map(function (o) { return certificate(o); }).join("") + '</ol>\n';

      // AAID
      } else if (key == "aaid") {
        val = '"' + obj[key] + '" <span class="vendor">(' + getVendor(obj[key]) + ')</span>';

      // generic decoding
      } else {
        val = stringify(obj[key]);
      }

      if (val !== null) {
          result.push('<li><strong>' + key + '</strong>: ' + val + "</li>\n");
      }
    });
    return "<ul>" + result.join("") + "</ul>\n";
  }
}


function showAuthr(json) {
  $("#mds").hide();
  $("#authr").show();
  $("#authr-name").text(json.metadataStatement.description);
  $("#authr-json").html(stringify(json));
}

function clickAuthr(e, cell) {
  showAuthr(cell.getData());
  history.pushState({"authr": cell.getData()}, "View", "#view");
}

$("#authr-close").click(function() {
  history.back();
});

function isMatchingFilter(headerValue, values) {
  if (Array.isArray(headerValue) && headerValue.length == 1) {
    // array with single value, use it
    headerValue = headerValue[0];
  }
  return Array.isArray(headerValue) || // if multiple values (i.e. all): no filter
          (headerValue == "") || // empty: no filter
          values.includes(headerValue); // ?
}

function filterCertifs(headerValue, rowValue, rowData, filterParams) {
  let values = [];
  $.each(rowValue, function(idx, val) {
    values.push(val.status);
  });
  return isMatchingFilter(headerValue, values);
}

function filterUserVerifs(headerValue, rowValue, rowData, filterParams) {
  let values = [];
  $.each(rowValue, function(idx1, val1) {
    $.each(val1, function(idx2, val2) {
      values.push(val2.userVerificationMethod);
    });
  });
  return isMatchingFilter(headerValue, values);
}

$(function() {

  console.log(mdsJson);

  $("#mds-loading").hide();
  if (LAST_MDS_UPDATE) {
    $("#last-update-date").text(LAST_MDS_UPDATE);
    $(".last-update").show();
  }
  $("#mds").show();
  // build authenticators table
  table = new Tabulator("#mds-table", {
    data: mdsJson.entries,
    layout:"fitDataFill",
    selectable:false,
    //responsiveLayout:"collapse",
    columns:[
      {
        title: "Name",
        field: "metadataStatement.description",
        sorter: "string",
        headerFilter:true,
        formatter: function(cell, formatterParams, onRendered){
          let name = cell.getValue();
          return `<span class='clickable notranslate' translate='no'>${name}</a>`;
        },
        cellClick: clickAuthr
      },
      {
        title: "Protocol",
        field: "metadataStatement.protocolFamily",
        sorter: "string",
        headerFilter: "select",
        headerFilterParams: {values:["","uaf", "u2f", "fido2"]}
      },
      {
        title: "Icon",
        field: "metadataStatement.icon",
        formatter: function(cell, formatterParams, onRendered){
          return imageTag(cell.getValue());
        }
      },
      {
        title: "Certification",
        field: "statusReports",
        formatter: function(cell, formatterParams, onRendered){
          let res = "", sep="";
          $.each(cell.getValue(), function(idx,value) { res += sep + value.status; sep ="<br>"; });
          return res;
        },
        headerFilter: "select",
        headerFilterParams: {values:["","NOT_FIDO_CERTIFIED", "FIDO_CERTIFIED", "FIDO_CERTIFIED_L1", "FIDO_CERTIFIED_L2"]},
        headerFilterFunc: filterCertifs
      },
      {
        title: "User Verif.",
        field: "metadataStatement.userVerificationDetails",
        formatter: function(cell, formatterParams, onRendered){
          let res = "", sep="";
          $.each(cell.getValue(), function(il,line) { $.each(line, function(ii,value) {res += sep + value.userVerificationMethod; sep ="<br>"; }); });
          return res;
        },
        headerFilter: "select",
        headerFilterParams: {
          values:["", "presence_internal", "fingerprint_internal", "passcode_internal", "voiceprint_internal", "faceprint_internal", "location_internal",
            "eyeprint_internal", "pattern_internal", "handprint_internal", "passcode_external", "pattern_external", "none", "all"]
        },
        headerFilterFunc: filterUserVerifs
      },
      {
        title: "Attachment",
        field: "metadataStatement.attachmentHint", formatter:function(cell, formatterParams, onRendered){
          let res = "", sep="";
          $.each(cell.getValue(), function(idx,value) { res += sep + value; sep ="<br>"; });
          return res;
        },
        headerFilter: "select",
        headerFilterParams: {
          values: ["", "internal", "external", "wired", "wireless", "nfc", "bluetooth", "network", "ready"]
        }
      },
      {
        title: "Key Protection",
        field: "metadataStatement.keyProtection",
        formatter: function(cell, formatterParams, onRendered){
          let res = "", sep="";
          $.each(cell.getValue(), function(idx,value) { res += sep + value; sep ="<br>"; });
          return res;
        },
        headerFilter: "select",
        headerFilterParams: {
          values: ["", "software", "hardware", "tee", "secure_element", "remote_handle" ]
        }
      },
      {
        title:"Updated", field:"timeOfLastStatusChange", sorter:"string", width:110
      },
    ],
    footerElement: "<span>Next MDS update is planned on " + mdsJson.nextUpdate + " - " + mdsJson.legalHeader + "</span>"
  });

  setTimeout(function() { id = 1; table.redraw(true); }, 500);


  window.addEventListener('popstate', (event) => {
    if ($("#authr").is(":visible")) {
      $("#mds").show();
      $("#authr").hide();
    } else if (event.state && event.state.authr) {
      showAuthr(event.state.authr);
    }
  });

});
