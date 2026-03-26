'use strict';
/* globals x509, mdsJson, CustomTable, LAST_MDS_UPDATE, vendors */

let table;
let cert;

function getVendor(aaid) {
  let vendorId = aaid ? aaid.substring(0,4) : undefined;
  let vendorName = vendorId ? vendors[vendorId.toUpperCase()] : undefined;
  return vendorName ? vendorName : "??";
}

const cpy = typeof navigator.clipboard?.writeText === "function" ?
  "<span title='Copy to clipboard' class='cpy'>📋</span>" : "";

// ---

function certificate(obj) {
  let certHtml = "<ul>";
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
  certHtml += "</ul>";
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
    return cpy + " <span class='buffer'>" + [...new Uint8Array(obj)].map(x => x.toString(16).padStart(2, '0')).join('') + "</span>";
  } else if (type(obj) === "Object") {
    var result = [];
    Object.keys(obj).forEach(function (key) {
      let val;

      // specific decodings:

      // Icon
      if (["icon", "iconDark", "providerLogoLight", "providerLogoDark"].includes(key)) {
        val = imageTag(obj[key]);

      // Certificates
      } else if (key == "attestationRootCertificates") {
        val = '<ol>' + obj[key].map(function (o) { return "<li>" + certificate(o) + "</li>"; }).join("") + '</ol>\n';
      } else if ((key == "certificate") || (key == "batchCertificate")) {
        val = certificate(obj[key]) + '\n';

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
  e("#mds").hidden = true;
  e("#authr").hidden = false;
  e("#authr-name").innerText = json.metadataStatement.description;
  e("#authr-json").innerHTML = stringify(json);
  for (let item of document.querySelectorAll(".cpy")) {
    item.addEventListener("click",(event) => {
      const COPIED = "Copied to clipboard...";
      let elt = event.target.parentNode.querySelector(".buffer");
      let v = elt.textContent;
      if (v != COPIED) {
        elt.textContent = COPIED;
        navigator.clipboard.writeText(v);
        setTimeout(() => {
          elt.textContent = v;
        }, 2000);
      }
    });
  }
}

function clickAuthr(e, cell) {
  showAuthr(cell.getData());
  history.pushState({"authr": cell.getData()}, "View", "#view");
}

e("#authr-close").addEventListener("click", function() {
  if (history.length > 1) {
    history.back();
  } else {
    document.location.href = location.protocol + "//" + location.host + location.pathname;
  }
});

function isMatchingFilter(headerValue, values, exact = false) {
  if (headerValue == "") {
    return true; // if empty: no filter
  }
  // Case-insensitive substring matching
  const lowerHeaderValue = String(headerValue).toLowerCase();
  return values.some(v => {
    const lowerV = String(v).toLowerCase();
    if (exact) {
      return lowerV == lowerHeaderValue;
    } else {
      return lowerV.includes(lowerHeaderValue);
    }
  });
}

function filterCertifs(headerValue, rowValue/*, rowData, filterParams*/) {
  let values = [];
  for (let val of rowValue) {
    values.push(val.status);
  }
  return isMatchingFilter(headerValue, values, true);
}

function filterIds(headerValue, rowValue/*, rowData, filterParams*/) {
  let res = true; // default to true if no protocol family matches
  if (rowValue.protocolFamily == "fido2") {
    res = isMatchingFilter(headerValue, [rowValue.aaguid]);
  } else if (rowValue.protocolFamily == "uaf") {
    res = isMatchingFilter(headerValue, [rowValue.aaid]);
  } else if (rowValue.protocolFamily == "u2f") {
    res = isMatchingFilter(headerValue, rowValue.attestationCertificateKeyIdentifiers);
  }
 return res;
}

function filterUserVerifs(headerValue, rowValue/*, rowData, filterParams*/) {
  let values = [];
  for (let val1 of rowValue) {
    for (let val2 of val1) {
      values.push(val2.userVerificationMethod);
    }
  }
  return isMatchingFilter(headerValue, values, true);
}

onReady(() => {

  console.log(mdsJson);

  e("#mds-loading").hidden = true;
  if (LAST_MDS_UPDATE) {
    e("#last-update-date").innerText = new Date(LAST_MDS_UPDATE).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric",
    });
    e(".last-update").hidden = false;
  }
  e("#mds").hidden = false;

  // Fill filtering drop downs with entries's values
  let statuses = [],
    protocols = [],
    uvs = [],
    attachments = [], 
    transports = [], 
    kprots = [], 
    algos = [];
  for (let e of mdsJson.entries) {
    for (let s of e.statusReports) {
      if (s.status && !statuses.includes(s.status)) {
        statuses.push(s.status);
      }
    }
    if (!protocols.includes(e.metadataStatement.protocolFamily)) {
      protocols.push(e.metadataStatement.protocolFamily);
    }
    for (let uv of e.metadataStatement.userVerificationDetails || []) {
      for (let uvd of uv || []) {
        if (uvd?.userVerificationMethod && !uvs.includes(uvd.userVerificationMethod)) {
          uvs.push(uvd.userVerificationMethod);
        }
      }
    }
    for (let a of e?.metadataStatement?.attachmentHint || []) {
      if (!attachments.includes(a)) {
        attachments.push(a);
      }
    }
    for (let t of e?.metadataStatement?.authenticatorGetInfo?.transports || []) {
      if (!transports.includes(t)) {
        transports.push(t);
      }
    }
    for (let kp of e?.metadataStatement?.keyProtection || []) {
      if (!kprots.includes(kp)) {
        kprots.push(kp);
      }
    }
    for (let alg of e?.metadataStatement?.authenticationAlgorithms || []) {
      if (!algos.includes(alg)) {
        algos.push(alg);
      }
    }
  }
  for (let a of [ statuses, protocols, uvs, attachments, transports, kprots, algos ]) a.sort();

  table = new CustomTable("#mds-table", {
    data: mdsJson.entries,
    columns: [
      {
        title: "Name",
        field: "metadataStatement.description",
        sorter: true,
        headerFilter: true,
        formatter: function(cell/*, formatterParams, onRendered*/) {
          let name = cell.getValue();
          return `<span class='clickable notranslate' translate='no' title='${name}'>${name}</a>`;
        },
        cellClick: clickAuthr
      },
      {
        title: "Protocol",
        field: "metadataStatement.protocolFamily",
        sorter: true,
        headerFilter: "list",
        headerFilterParams: { values: protocols },
        isHidable: true
      },
      {
        title: "Icon",
        field: "metadataStatement.icon",
        formatter: imageFormatter,
        isHidable: true
      },
      {
        title: "Certification",
        field: "statusReports",
        formatter: function(cell/*, formatterParams, onRendered*/){
          let res = "", sep="";
          for (let value of cell.getValue() || []) { res += sep + value.status; sep ="<br>"; }
          return res;
        },
        headerFilter: "list",
        headerFilterParams: { values: statuses },
        headerFilterFunc: filterCertifs,
        isHidable: true
      },
      {
        title: "ID",
        field: "metadataStatement",
        headerFilter: true,
        tooltip: function(e, cell){
          let
            item = cell.getValue(),
            map = {
              fido2: "aaguid",
              u2f: "attestationCertificateKeyIdentifiers",
              uaf: "aaid"
            },
            field = map[item.protocolFamily];
          return field ? field : "?";
        },
        formatter: function(cell/*, formatterParams, onRendered*/){
          let
            item = cell.getValue(),
            sep ="",
            res = "?";
          if (item.protocolFamily == "fido2") {
            res = item.aaguid;
          } else if (item.protocolFamily == "uaf") {
            res = item.aaid;
          } else if (item.protocolFamily == "u2f") {
            res = "";
            for (let value of item.attestationCertificateKeyIdentifiers) {
              res += sep + value; sep ="<br>";
            }
          }
          return res;
        },
        headerFilterFunc: filterIds,
        isHidable: true
      },
      {
        title: "User Verif.",
        field: "metadataStatement.userVerificationDetails",
        formatter: function(cell/*, formatterParams, onRendered*/){
          let res = "", sep="";
          for (let line of cell.getValue() || []) {
            for (let value of line) {
              res += sep + value.userVerificationMethod; sep ="<br>";
            }
          }
          return res;
        },
        headerFilter: "list",
        headerFilterParams: { values: uvs },
        headerFilterFunc: filterUserVerifs,
        visible: false,
        isHidable: true
      },

      {
        title: "Attachment",
        field: "metadataStatement.attachmentHint",
        formatter: function(cell/*, formatterParams, onRendered*/) {
          let res = "", sep="";
          for (let value of cell.getValue() || []) { res += sep + value; sep ="<br>"; }
          return res;
        },
        headerFilter: "list",
        headerFilterParams: { values: attachments },
        visible: false,
        isHidable: true
      },

      {
        title: "Transports",
        field: "metadataStatement.authenticatorGetInfo.transports",
        formatter: function(cell/*, formatterParams, onRendered*/) {
          let res = "", sep="";
          for (let value of cell.getValue() || []) { res += sep + value; sep ="<br>"; }
          return res;
        },
        headerFilter: "list",
        headerFilterParams: { values: transports },
        visible: false,
        isHidable: true
      },

      {
        title: "Key Protection",
        field: "metadataStatement.keyProtection",
        formatter: function(cell/*, formatterParams, onRendered*/) {
          let res = "", sep="";
          for (let value of cell.getValue() || []) { res += sep + value; sep ="<br>"; }
          return res;
        },
        headerFilter: "list",
        headerFilterParams: { values: kprots },
        visible: false,
        isHidable: true
      },
      {
        title: "Algorithms",
        field: "metadataStatement.authenticationAlgorithms",
        formatter: function(cell/*, formatterParams, onRendered*/) {
          let res = "", sep="";
          for (let value of cell.getValue() || []) { res += sep + value; sep ="<br>"; }
          return res;
        },
        headerFilter: "list",
        headerFilterParams: { values: algos },
        visible: false,
        isHidable: true
      },

      {
        title: "Updated",
        field: "timeOfLastStatusChange",
        sorter: true
      }
    ],
    onUpdate: function () {
      e("#table-size").innerText = document.querySelectorAll("#mds-table tbody tr:not([hidden])").length;
    }
  });

  e(".table-footer").innerHTML = `<span>Payload serial: ${mdsJson.no} - Next update planned on ${mdsJson.nextUpdate} - ${mdsJson.legalHeader}</span>`;

  window.addEventListener('popstate', (event) => {
    if (e("#authr").checkVisibility()) {
      e("#mds").hidden = false;
      e("#authr").hidden = true;
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

    let hidableColumns = {};
    let allColumns = table.getColumns();

    // Populate hidable columns (columns that are hidden by default)
    for (let c of allColumns) {
      if (c.getDefinition()["visible"] === false) {
        let title = c.getDefinition().title;
        hidableColumns[title] = c;
        e("#shown-columns").append(newE("option", { value: title }, "+ " + title));
      }
    }

    e("#shown-columns").addEventListener("change", () => {
      let selectElement = e("#shown-columns");
      let selected = selectElement.value;
      
      if (selected == "few") {
        // Hide hidable columns
        for (let title in hidableColumns) {
          hidableColumns[title].hide();
        }
      } else if (selected == "all") {
        // Show all columns
        for (let c of allColumns) {
          c.show();
        }
      } else {
        // Show selected columns
        if (hidableColumns[selected]) {
          hidableColumns[selected].show();
          // the new column may change row height
        }
      }
    });
  }
});
