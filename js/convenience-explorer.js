'use strict';
/* globals e, onReady, imageFormatter, darkImageFormatter, matchesFilter, CustomTable, LAST_CMDS_UPDATE */

let mdsJson;

onReady(async () => {

  mdsJson = await fetchJson("js/convenience-metadata.json");
  if (mdsJson) {
    console.log(mdsJson);
  } else {
    e("#mds-error").hidden = false;
  }
  e("#mds-loading").hidden = true;

  if (LAST_CMDS_UPDATE) {
    e("#last-cmds-update-date").innerText = new Date(LAST_CMDS_UPDATE).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric",
    });
    e(".last-update").hidden = false;
  }

  e("#mds").hidden = false;

  // Extract language codes with counts from mdsJson
  const langCounts = {};
  const mdsEntries = mdsJson.entries ? mdsJson.entries : mdsJson;
  Object.entries(mdsEntries)
    .filter(([key]) => key !== "no")
    .forEach(([, details]) => {
      const friendlyNames = details.friendlyNames || {};
      Object.keys(friendlyNames).forEach(lang => {
        langCounts[lang] = (langCounts[lang] || 0) + 1;
      });
    });

  // Convert to sorted array of objects with value and display
  const langOptions = Object.entries(langCounts)
    .sort((a, b) => b[0] > a[0] ? -1 : 1) // Sort by name ascending
    .map(([lang, count]) => ({
      value: lang,
      display: `${lang} (${count})`
    }));

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
  const table = new CustomTable("#cmds-table", {
    data: data,
    columns: [
      {
        title: "AAGUID",
        field: "aaguid",
        headerFilter: true,
        headerFilterNormalize: CustomTable.trimLower,
        isHidable: true
      },
      {
        title: "Name",
        field: "friendlyNames",
        sorter: true,
        headerFilter: true,
        headerFilterInputs: [
          { key: "lang", values: langOptions },
          { key: "name", placeholder: "Name" }
        ],

        headerFilterNormalize: CustomTable.trimLower,
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

  if (location.search) {
    const params = new URLSearchParams(location.search);
    const filters = {};

    if (params.has("aaguid")) {
      filters.aaguid = params.get("aaguid");
      table.container.querySelector('input[data-field="aaguid"]').value = filters.aaguid;
    }

    if (params.has("name")) {
      filters.name = params.get("name");
      table.container.querySelector('input[data-field="friendlyNames"][data-filter-key="name"]').value = filters.name;
    }

    if (Object.hasOwn(filters, "aaguid")) {
      const aaguidColumn = table.columns.find(column => column.field === "aaguid");
      table.setFilter(aaguidColumn.field, filters.aaguid, aaguidColumn.headerFilterFunc, aaguidColumn.headerFilterNormalize);
    }

    if (Object.hasOwn(filters, "name")) {
      const nameColumn = table.columns.find(column => column.field === "friendlyNames");
      table.setFilter(nameColumn.field, { lang: "", name: filters.name }, nameColumn.headerFilterFunc, nameColumn.headerFilterNormalize);
    }

    table.restoreFilterValues();
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.hash);
  }

  e("#serial").innerText = mdsJson.no || "";

});
