let  mdsJson;
let id = 1;
let table;

function type(obj) { 
  return Object.prototype.toString.call(obj).match(/.* (.*)\]/)[1] 
}
function certificate(obj) {
  let cert = decodeCert(obj)
  return "<li>" + stringify(cert) + "</li>\n"
}
function stringify(obj) { 
  if (type(obj) === "Function") { 
    return "<span>function</span>" 
  } else if (type(obj) === "Undefined") { 
    return "<span>undefined</span>" 
  } else  if (type(obj) === "Null") {
      return "<span>null</span>" 
  } else if (type(obj) === "Number") { 
    return obj
  } else if (type(obj) === "String") { 
    return '"' + obj + '"' 
  } else if (type(obj) === "Array") { 
    return '<ol>' + obj.map(function (o) { return "<li>" + stringify(o) + "</li>\n"}).join("") + '</ol>\n' 
  } else if (type(obj) === "Object") {
    var result = [];
    Object.keys(obj).forEach(function (key) { 
      let val;
      // specific decodings

      if (key == "icon") {
        val = "<img src='" + obj[key] + "'/>"
      
      } else if (key == "attestationRootCertificates") {
        val = '<ol>' + obj[key].map(function (o) { return certificate(o)}).join("") + '</ol>\n'

      // generic decoding
      } else {
        val = stringify(obj[key])
      }
      if (val !== null) { 
          result.push('<li><strong>' + key + '</strong>: ' + val + "</li>\n")
      }
    })
    return "<ul>" + result.join("") + "</ul>\n" 
  } 
}

function showAuthr(e, cell) {
  $("#mds").hide();
  $("#authr").show();
  $("#authr-json").html(stringify(cell.getData()));
  history.pushState({}, "View", "#view")
}
function closeAuthr(e) {
  $("#mds").show();
  $("#authr").hide();
}

$("#authr-close").click(closeAuthr);

function corsUrl(url) {
  return "https://wtracks-cors-proxy.herokuapp.com/" + url;
}
let cors = location.hash == "#cors";

function isMatchingFilter(headerValue, values) {
  if (Array.isArray(headerValue) && headerValue.length == 1) {
    // array with single value, use it
    headerValue = headerValue[0]
  };
  return Array.isArray(headerValue) // if multiple values (i.e. all): no filter
          || (headerValue == "") // empty: no filter
          || values.includes(headerValue); // ?
}

function filterCertifs(headerValue, rowValue, rowData, filterParams) {
  let values = [];
  $.each(rowValue, function(idx, val) {
    values.push(val.status);
  })
  return isMatchingFilter(headerValue, values);
}

function filterUserVerifs(headerValue, rowValue, rowData, filterParams) {
  let values = [];
  $.each(rowValue, function(idx1, val1) {
    $.each(val1, function(idx2, val2) {
      values.push(val2.userVerificationMethod);
    })
  })
  return isMatchingFilter(headerValue, values);
}

$(function() {

  let mdsUrl = "https://mds.fidoalliance.org/";
  $.get( cors ? mdsUrl : corsUrl(mdsUrl), function( mdsJwt ) {
    $("#mds-loading").hide();
    processMdsJwt(mdsJwt);
  });

  function processMdsJwt(mdsJwt) {
    // extract payload
    mdsJwt = mdsJwt.substring(mdsJwt.indexOf('.')+1, mdsJwt.lastIndexOf(".")) + "====";
    // size must be modulo 4
    let trim =  mdsJwt.length % 4;
    mdsJwt = mdsJwt.substring(0, mdsJwt.length- trim);
    // decode base64
    mdsJwt = base64js.toByteArray(mdsJwt);
    let mdsJson = JSON.parse(String.fromCharCode.apply(String, mdsJwt));
    
    // show JSON in console
    console.log(mdsJson);

    // build authenticators table
    table = new Tabulator("#mds-table", {
      data: mdsJson.entries,
      layout:"fitDataFill",
      //responsiveLayout:"collapse",
      columns:[
        {
          title: "#", 
          formatter: function(cell, formatterParams, onRendered){ return id++; }
        },
        {
          title: "Name", 
          field: "metadataStatement.description", 
          sorter: "string", headerFilter:true, 
          cellClick: showAuthr
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
          formatter: "image"
        },
        {
          title: "Certification", 
          field: "statusReports",
          formatter: function(cell, formatterParams, onRendered){
            let res = "", sep="";
            $.each(cell.getValue(), function(idx,value) {res += sep + value.status; sep ="<br>"});
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
            $.each(cell.getValue(), function(il,line) { $.each(line, function(ii,value) {res += sep + value.userVerificationMethod; sep ="<br>"}) });
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
            $.each(cell.getValue(), function(idx,value) {res += sep + value; sep ="<br>"});
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
            $.each(cell.getValue(), function(idx,value) {res += sep + value; sep ="<br>"});
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
      footerElement: "<span>" + mdsJson.legalHeader + "</span>"
    });
    setTimeout(function() {id = 1; table.redraw(true)}, 100);
  }

  $(window).on('popstate', function() {
    if ($("#authr").is(":visible")) {
      closeAuthr();
    } 
  });

});
