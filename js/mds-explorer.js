'use strict';
/* globals $, x509, mdsJson, Tabulator, LAST_MDS_UPDATE, vendors */

let table;
let cert;

function type(obj) {
  return Object.prototype.toString.call(obj).match(/.* (.*)\]/)[1];
}

function getVendor(aaid) {
  let vendorId = aaid ? aaid.substring(0,4) : undefined;
  let vendorName = vendorId ? vendors[vendorId.toUpperCase()] : undefined;
  return vendorName ? vendorName : "??";
}

function imageTag(src) {
  return src ? "<img src='" + src + "'>" : "";
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

function filterCertifs(headerValue, rowValue/*, rowData, filterParams*/) {
  let values = [];
  $.each(rowValue, function(idx, val) {
    values.push(val.status);
  });
  return isMatchingFilter(headerValue, values);
}

function filterUserVerifs(headerValue, rowValue/*, rowData, filterParams*/) {
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
    layout:"fitDataTable",
    selectable:false,
    //responsiveLayout:"collapse",
    columns:[
      {
        title: "Name",
        field: "metadataStatement.description",
        sorter: "string",
        headerFilter:true,
        formatter: function(cell/*, formatterParams, onRendered*/){
          let name = cell.getValue();
          return `<span class='clickable notranslate' translate='no' title='${name}'>${name}</a>`;
        },
        maxWidth: 350,
        cellClick: clickAuthr
      },
      {
        title: "Protocol",
        field: "metadataStatement.protocolFamily",
        sorter: "string",
        headerFilter: "list",
        headerFilterParams: {values: ["uaf", "u2f", "fido2"]}
      },
      {
        title: "Icon",
        field: "metadataStatement.icon",
        formatter: function(cell/*, formatterParams, onRendered*/){
          return imageTag(cell.getValue());
        }
      },
      {
        title: "Certification",
        field: "statusReports",
        formatter: function(cell/*, formatterParams, onRendered*/){
          let res = "", sep="";
          $.each(cell.getValue(), function(idx,value) { res += sep + value.status; sep ="<br>"; });
          return res;
        },
        headerFilter: "list",
        headerFilterParams: {
          values:["NOT_FIDO_CERTIFIED", "FIDO_CERTIFIED", "FIDO_CERTIFIED_L1", "FIDO_CERTIFIED_L2"],
        },
        headerFilterFunc: filterCertifs,
        sorter: "array"
      },
      {
        title: "User Verif.",
        field: "metadataStatement.userVerificationDetails",
        formatter: function(cell/*, formatterParams, onRendered*/){
          let res = "", sep="";
          $.each(cell.getValue(), function(il,line) { $.each(line, function(ii,value) {res += sep + value.userVerificationMethod; sep ="<br>"; }); });
          return res;
        },
        headerFilter: "list",
        headerFilterParams: {
          values:["presence_internal", "fingerprint_internal", "passcode_internal", "voiceprint_internal", "faceprint_internal", "location_internal",
            "eyeprint_internal", "pattern_internal", "handprint_internal", "passcode_external", "pattern_external", "none", "all"]
        },
        headerFilterFunc: filterUserVerifs,
        sorter: "array"
      },
      {
        title: "Attachment",
        field: "metadataStatement.attachmentHint", formatter:function(cell/*, formatterParams, onRendered*/) {
          let res = "", sep="";
          $.each(cell.getValue(), function(idx,value) { res += sep + value; sep ="<br>"; });
          return res;
        },
        headerFilter: "list",
        headerFilterParams: {
          values: ["internal", "external", "wired", "wireless", "nfc", "bluetooth", "network", "ready"]
        },
        sorter: "array"
      },
      {
        title: "Key Protection",
        field: "metadataStatement.keyProtection",
        formatter: function(cell/*, formatterParams, onRendered*/) {
          let res = "", sep="";
          $.each(cell.getValue(), function(idx,value) { res += sep + value; sep ="<br>"; });
          return res;
        },
        headerFilter: "list",
        headerFilterParams: {
          values: ["software", "hardware", "tee", "secure_element", "remote_handle" ]
        },
        sorter: "array"
      },
      {
        title: "Algorithms",
        field: "metadataStatement.authenticationAlgorithms",
        formatter: function(cell/*, formatterParams, onRendered*/) {
          let res = "", sep="";
          $.each(cell.getValue(), function(idx,value) { res += sep + value; sep ="<br>"; });
          return res;
        },
        headerFilter: true,
        sorter: "array"
      },
      {
        title:"Updated", field:"timeOfLastStatusChange", sorter:"string", width:110
      },
    ],
    footerElement: "<span>Next MDS update is planned on " + mdsJson.nextUpdate + " - " + mdsJson.legalHeader + "</span>"
  });

  window.addEventListener('popstate', (event) => {
    if ($("#authr").is(":visible")) {
      $("#mds").show();
      $("#authr").hide();
    } else if (event.state && event.state.authr) {
      showAuthr(event.state.authr);
    }
  });

  let searchedAuthr;
  if (location.search) {
    let params = new URLSearchParams(location.search);
    if (params.has("aaguid")) {
      let aaguid = params.get("aaguid");
      for (const entry of mdsJson.entries) {
        if (entry.aaguid == aaguid) {
          searchedAuthr = entry;
          break;
        }
      }
    } else if (params.has("x5c")) {
      let x5c = params.get("x5c");
      for (const entry of mdsJson.entries) {
        if (entry.metadataStatement.attestationRootCertificates.includes(x5c)) {
          searchedAuthr = entry;
          break;
        }
      }
    }
    if (searchedAuthr) {
      showAuthr(searchedAuthr);
    } else {
      alert("The authenticator your are looking for was not found");
      window.location = "."
    }
  } else {
    // refresh UI so that icons column is properly sized
    setTimeout(function() { table.redraw(true); }, 500);
  }
});
