let  mdsJson;
let id = 1;

function showAuthr(e, cell) {
  // name: e.target.textContent

  $("#mds").hide();
  $("#authr").show();
  var jsonPretty = JSON.stringify(cell.getData(), null, '\t');
  $("#raw-json").text(jsonPretty);
}

$("#authr-close").click(function(){
  $("#mds").show();
  $("#authr").hide();
});

function corsUrl(url) {
  return "https://wtracks-cors-proxy.herokuapp.com/" + url;
}
let cors = location.hash == "#cors";

function filterCertif(headerValue, rowValue, rowData, filterParams) {
  if (Array.isArray(headerValue) && headerValue.length == 1) {
    headerValue = headerValue[0]
  };
  if (Array.isArray(headerValue) || (headerValue == "")) return true;
  let matches = false;
  $.each(rowValue, function(idx, val) {
    if (val.status == headerValue) {
      matches = true;
    }
  })
  return matches;
}

function filterUV(headerValue, rowValue, rowData, filterParams) {
  if (Array.isArray(headerValue) && headerValue.length == 1) {
    headerValue = headerValue[0]
  };
  if (Array.isArray(headerValue) || (headerValue == "")) return true;
  let matches = false;
  $.each(rowValue, function(idx1, val1) {
    $.each(val1, function(idx2, val2) {
      if (val2.userVerificationMethod == headerValue) {
        matches = true;
      }
    })
  })
  return matches;
}

$( function() {

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
    var table = new Tabulator("#mds-table", {
      data: mdsJson.entries,
      columns:[
        {
          title:"#", formatter:function(cell, formatterParams, onRendered){ return id++; }
        },
        {
          title:"Name", field:"metadataStatement.description", sorter:"string", headerFilter:true, cellClick: showAuthr
        },
        {
          title:"Protocol", field:"metadataStatement.protocolFamily", sorter:"string", headerFilter:"select", 
          headerFilterParams:{values:["","uaf", "u2f", "fido2"]}
        },
        {
          title:"Icon", field:"metadataStatement.icon", formatter:"image", witdh:150
        },
        {
          title:"Certification", field:"statusReports", formatter:function(cell, formatterParams, onRendered){
            let res = "", sep="";
            $.each(cell.getValue(), function(idx,value) {res += sep + value.status; sep ="<br>"});
            return res;
          }, headerFilter:"select", headerFilterParams:{values:["","NOT_FIDO_CERTIFIED", "FIDO_CERTIFIED", "FIDO_CERTIFIED_L1", "FIDO_CERTIFIED_L2"]},
          headerFilterFunc:filterCertif
        },
        {
          title:"User Verif.", field:"metadataStatement.userVerificationDetails", formatter:function(cell, formatterParams, onRendered){
            let res = "", sep="";
            $.each(cell.getValue(), function(il,line) { $.each(line, function(ii,value) {res += sep + value.userVerificationMethod; sep ="<br>"}) });
            return res;
          }, headerFilter:"select", headerFilterParams:{values:[
            "", "presence_internal", "fingerprint_internal", "passcode_internal", "voiceprint_internal", "faceprint_internal", "location_internal",
            "eyeprint_internal", "pattern_internal", "handprint_internal", "passcode_external", "pattern_external", "none", "all" ]},
            headerFilterFunc:filterUV
        },
        {
          title:"Attachment", field:"metadataStatement.attachmentHint", formatter:function(cell, formatterParams, onRendered){
            let res = "", sep="";
            $.each(cell.getValue(), function(idx,value) {res += sep + value; sep ="<br>"});
            return res;
          },  headerFilter:"select", headerFilterParams:{values:["", "internal", "external", "wired", "wireless", "nfc", "bluetooth", "network", "ready"]}
        },
        {
          title:"Key Protection", field:"metadataStatement.keyProtection", formatter:function(cell, formatterParams, onRendered){
            let res = "", sep="";
            $.each(cell.getValue(), function(idx,value) {res += sep + value; sep ="<br>"});
            return res;
          },  headerFilter:"select", headerFilterParams:{values:["", "software", "hardware", "tee", "secure_element", "remote_handle" ]}
        },
        {
          title:"Updated", field:"timeOfLastStatusChange", sorter:"string", width:110
        },
    ]
    });
  } 
});
