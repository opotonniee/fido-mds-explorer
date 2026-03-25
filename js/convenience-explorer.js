'use strict';
/* globals CustomTable, LAST_CMDS_UPDATE */

let table;
let mdsJson;

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

  // Convert mdsJson to array format for CustomTable
  const data = Object.entries(mdsJson)
    .filter(([key]) => key !== "no")
    .map(([aaguid, details]) => ({
      aaguid,
      friendlyNames: details.friendlyNames || {},
      icon: details.icon,
      iconDark: details.iconDark,
      providerLogoLight: details.providerLogoLight,
      providerLogoDark: details.providerLogoDark
    }));

  // Create table using CustomTable
  table = new CustomTable("#cmds-table", {
    data: data,
    columns: [
      {
        title: "AAGUID",
        field: "aaguid",
        headerFilter: true,
        isHidable: true
      },
      {
        title: "Name",
        field: "friendlyNames",
        sorter: true,
        headerFilter: true,
        headerFilterInputs: [
          { key: "lang", placeholder: "Language" },
          { key: "name", placeholder: "Name" }
        ],
        formatter: function(cell) {
          const friendlyNames = cell.getValue();
          if (!friendlyNames) return "";
          return Object.entries(friendlyNames)
            .map(([lang, name]) => `<div class="friendly-name"><span class="lang">${lang}</span>: <span class="name">${name}</span></div>`)
            .join("");
        },
        headerFilterFunc: function(filterValue, rowValue) {
          // filterValue is an object like { name: "...", lang: "..." }
          const friendlyNames = rowValue;
          if (!friendlyNames || Object.keys(friendlyNames).length === 0) {
            return true;
          }
          
          const langFilter = filterValue.lang ? String(filterValue.lang).toLowerCase() : "";
          const nameFilter = filterValue.name ? String(filterValue.name).toLowerCase() : "";
          
          // If no filters, show all
          if (!langFilter && !nameFilter) {
            return true;
          }
          
          // Check if any entry matches both filters
          return Object.entries(friendlyNames).some(([lang, name]) => {
            const langMatch = !langFilter || lang.toLowerCase().includes(langFilter);
            const nameMatch = !nameFilter || name.toLowerCase().includes(nameFilter);
            return langMatch && nameMatch;
          });
        },
        isHidable: true
      },
      {
        title: "Icon",
        field: "icon",
        formatter: imageFormatter,
        isHidable: true
      },
      {
        title: "Icon",
        field: "iconDark",
        formatter: darkImageFormatter,
        isHidable: true
      },
      {
        title: "Provider",
        field: "providerLogoLight",
        formatter: imageFormatter,
        isHidable: true
      },
      {
        title: "Provider",
        field: "providerLogoDark",
        formatter: darkImageFormatter,
        isHidable: true
      }
    ],
    onUpdate: function () {
      e("#table-size").innerText = document.querySelectorAll("#cmds-table tbody tr:not([hidden])").length;
    }
  });
  e(".table-footer").innerHTML = `<span>Payload serial: ${mdsJson.no}</span>`;

});
