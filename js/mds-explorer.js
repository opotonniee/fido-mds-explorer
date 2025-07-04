'use strict';
/* globals x509, mdsJson, Tabulator, LAST_MDS_UPDATE, vendors */

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

// --- DOM/JS helper

function e(selector) {
  return document.querySelector(selector);
}

function newE(tag, attributes, html) {
  let el = document.createElement(tag);
  for (let a in attributes) {
    el.setAttribute(a, attributes[a]);
  }
  el.innerHTML = html;
  return el;
}

const ready = (callback) => {
  if (document.readyState != "loading") callback();
  else document.addEventListener("DOMContentLoaded", callback);
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
  for (let val of rowValue) {
    values.push(val.status);
  }
  return isMatchingFilter(headerValue, values);
}

function filterIds(headerValue, rowValue/*, rowData, filterParams*/) {
  let res;
  if (rowValue.protocolFamily == "fido2") {
    res = isMatchingFilter(headerValue, rowValue.aaguid);
  } else if (rowValue.protocolFamily == "uaf") {
    res = isMatchingFilter(headerValue, rowValue.aaid);
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
  return isMatchingFilter(headerValue, values);
}

ready(() => {

  console.log(mdsJson);

  e("#mds-loading").hidden = true;
  if (LAST_MDS_UPDATE) {
    e("#last-update-date").innerText = LAST_MDS_UPDATE;
    e(".last-update").hidden = false;
  }
  e("#mds").hidden = false;
  // build authenticators table
  let hideMenu = [
    {
      label: "Hide Column",
      action: function (e, column) {
        column.hide();
      }
    }
  ];

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

  table = new Tabulator("#mds-table", {
    data: mdsJson.entries,
    layout: "fitData",
    selectable: false,
    movableColumns: true,
    //responsiveLayout: "collapse",
    columns: [
      {
        title: "Name",
        field: "metadataStatement.description",
        sorter: "string",
        headerFilter: true,
        formatter: function(cell/*, formatterParams, onRendered*/) {
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
        headerFilterParams: { values: protocols },
        headerMenu: hideMenu
      },
      {
        title: "Icon",
        field: "metadataStatement.icon",
        formatter: function(cell/*, formatterParams, onRendered*/){
          return imageTag(cell.getValue());
        },
        headerMenu: hideMenu
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
        sorter: "array",
        headerFilterFunc: filterCertifs,
        headerMenu: hideMenu
      },
      {
        title: "ID (see popup)",
        field: "metadataStatement",
        sorter: "string",
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
        headerMenu: hideMenu
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
        headerMenu: hideMenu,
        visible: false,
        sorter: "array"
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
        headerMenu: hideMenu,
        visible: false,
        sorter: "array"
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
        headerMenu: hideMenu,
        visible: false,
        sorter: "array"
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
        headerMenu: hideMenu,
        visible: false,
        sorter: "array"
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
        headerMenu: hideMenu,
        visible: false,
        sorter: "array"
      },
      {
        title: "Updated",
        field: "timeOfLastStatusChange",
        headerMenu: hideMenu,
        sorter: "string"
      }
    ],
    footerElement: `<span>Payload serial: ${mdsJson.no} - Next update planned on ${mdsJson.nextUpdate} - ${mdsJson.legalHeader}</span>`
  });

  e("#table-size").innerText = mdsJson.entries.length;
  table.on("dataFiltered", function (filters, rows) {
    e("#table-size").innerText = rows.length;
  });

  function showColumnsSelector(show) {
    e("#shown-columns").disabled = !show;
  }

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
    // refresh so that icons column is properly sized
    table.on("tableBuilt", function() {
      table.redraw(true);

      let hidableColumns = [];

      for (let c of table.getColumns()) {
        if (c.getDefinition()["visible"] === false) {
          let title = c.getDefinition().title;
          hidableColumns[title] = c;
          e("#shown-columns").append(newE("option", { value: title }, "+ " + title));
        }
      }

      e("#shown-columns").addEventListener("change", () => {
        let selected = e("#shown-columns").selectedOptions[0].value;
        if (selected == "few") {
          showColumnsSelector(false);
          // Hide hidable columns
          setTimeout(() => {
            for (let c in hidableColumns) {
              hidableColumns[c].hide();
            }
            table.redraw();
            showColumnsSelector(true);
          }, 10);
        } else if (selected == "all") {
          // Show all columns
          showColumnsSelector(false);
          setTimeout(() => {
            for (let c of table.getColumns()) {
              c.show();
            }
            table.redraw();
            showColumnsSelector(true);
          }, 10);
        } else {
          // Show selected columns
          hidableColumns[selected].show();
          // the new column may change row height
          table.redraw();
        }
      });

    });
  }
});
