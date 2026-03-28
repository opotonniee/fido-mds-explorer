'use strict';
/* globals e, onReady, imageFormatter, darkImageFormatter, normalizeString, matchesFilter, CustomTable, LAST_CMDS_UPDATE */

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
  new CustomTable("#cmds-table", {
    data: data,
    columns: [
      {
        title: "AAGUID",
        field: "aaguid",
        headerFilter: true,
        headerFilterNormalize: normalizeString,
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
        headerFilterNormalize: normalizeString,
        formatter: function(cell) {
          const friendlyNames = cell.getValue();
          if (!friendlyNames) return "";
          const filter = cell.getFilter('friendlyNames');
          return Object.entries(friendlyNames)
            .map(([lang, name]) => {
              if (matchesFilter(name, filter?.value.name) &&
                (matchesFilter(lang, filter?.value.lang))) {
                return `<div class="friendly-name">
                  <span class="name" title="${lang}">${name}</span>
                </div>`;
              }
              return "";
          }).join("");
        },
        headerFilterFunc: function(filterValue, rowValue) {
          // filterValue is an object like { name: "...", lang: "..." }
          const friendlyNames = rowValue;
          if (!friendlyNames || Object.keys(friendlyNames).length === 0) {
            return true;
          }

          // If no filters, show all
          if (!filterValue.lang && !filterValue.name) {
            return true;
          }

          // Check if any entry matches both filters
          return Object.entries(friendlyNames).some(([lang, name]) => {
            return matchesFilter(lang, filterValue.lang) &&
             matchesFilter(name, filterValue.name);
          });
        },
        sortFunc: function (a, b/*, aRow, bRow*/) {
          let comparison = 0;
          a = Object.values(a || {}).join(" ").toLowerCase();
          b = Object.values(b || {}).join(" ").toLowerCase();
          if (a > b) {
            comparison = 1;
          } else if (a < b) {
            comparison = -1;
          }
          return comparison;
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
