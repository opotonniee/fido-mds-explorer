'use strict';
/* globals Tabulator, LAST_CMDS_UPDATE */

let table;
let mdsJson;

function filterNames(headerValue, rowValue/*, rowData, filterParams*/) {
  const searched = headerValue.toLowerCase();
  for (let v of Object.values(rowValue)) {
    if (v.toLowerCase().indexOf(searched) >= 0) {
      return true;
    }
  };
  return false
}

onReady(async () => {

  const url = "js/convenience-metadata.json";
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    mdsJson = await response.json();
  } catch (error) {
    e("#mds-error").hidden = false;
    console.error(error.message);
    return;
  }
  console.log(mdsJson);

  e("#mds-loading").hidden = true;
  if (LAST_CMDS_UPDATE) {
    e("#last-cmds-update-date").innerText = new Date(LAST_CMDS_UPDATE).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric",
    });
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

  /*
    dictionary ConvenienceDetails {
      FriendlyNames friendlyNames;
      DOMString     icon;
      DOMString     iconDark;
      DOMString     providerLogoLight;
      DOMString     providerLogoDark;
    };
  */
  // convert to table
  const mdsArray = [];
  Array.from(Object.keys(mdsJson), (e, i) => {
    if (e != "no") {
      mdsJson[e].id = e;
      mdsArray.push(mdsJson[e]);
    }
  });
  table = new Tabulator("#mds-table", {
    data: mdsArray,
    layout: "fitData",
    selectable: false,
    movableColumns: true,
    //responsiveLayout: "collapse",
    columns: [
      {
        title: "AAGUID",
        field: "id",
        sorter: "string",
        headerFilter: true,
      },
      {
        title: "Name",
        field: "friendlyNames",
        sorter: "string",
        headerFilter: true,
        headerFilterFunc: filterNames,
        formatter: function (cell/*, formatterParams, onRendered*/) {
          let res = "", sep = "", val = cell.getValue();
          for (let lang of Object.keys(val) || []) { res += sep + lang + ": " + val[lang]; sep = "<br>"; }
          return res;
        },
      },
      {
        title: "Icon (light)",
        field: "icon",
        formatter: imageFormatter,
        headerMenu: hideMenu
      },
      {
        title: "Icon (dark)",
        field: "iconDark",
        color: "#555",
        formatter: darkImageFormatter,
        headerMenu: hideMenu
      },
      {
        title: "Provider (light)",
        field: "providerLogoLight",
        formatter: imageFormatter,
        headerMenu: hideMenu
      },
      {
        title: "Provider (dark)",
        field: "providerLogoDark",
        formatter: darkImageFormatter,
        headerMenu: hideMenu
      },
    ],
    footerElement: `<span>Payload serial: ${mdsJson.no}</span>`
  });

  e("#table-size").innerText = mdsArray.length;
  table.on("dataFiltered", function (filters, rows) {
    e("#table-size").innerText = rows.length;
  });

  // refresh so that icons column is properly sized
  table.on("tableBuilt", function () {
    table.redraw(true);
  });

});
