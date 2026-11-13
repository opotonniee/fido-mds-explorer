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

  const filterFriendlyNames = function(filterValue, rowValue) {
    const friendlyNames = rowValue;
    if (!filterValue.lang && !filterValue.name) {
      return true;
    }
    return Object.entries(friendlyNames).some(([lang, name]) => {
      return matchesFilter(lang, filterValue.lang) &&
        matchesFilter(name, filterValue.name);
    });
  };

  const formatFriendlyNames = function(cell) {
    const friendlyNames = cell.getValue();
    if (!friendlyNames) return "";

    const filter = cell.getFilter('friendlyNames');
    const seen = new Set();

    return Object.entries(friendlyNames)
      .filter(([lang, name]) => {
        if (!matchesFilter(name, filter?.value.name) || !matchesFilter(lang, filter?.value.lang)) {
          return false;
        }

        const key = String(name || '').trim().toLowerCase();
        if (!key || seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      })
      .map(([lang, name]) => {
        return `<div class="friendly-name"><span class="name" title="${lang}">${name}</span></div>`;
      }).join("");
  };

  const sortFriendlyNames = function(a, b) {
    let comparison = 0;
    a = Object.values(a || {}).join(" ").toLowerCase();
    b = Object.values(b || {}).join(" ").toLowerCase();
    if (a > b) {
      comparison = 1;
    } else if (a < b) {
      comparison = -1;
    }
    return comparison;
  };

  const applyUrlFilters = function(tableInstance) {
    const params = new URLSearchParams(location.search);
    const columnFilters = [
      {
        key: "aaguid",
        field: "aaguid",
        value: params.get("aaguid")
      },
      {
        key: "name",
        field: "friendlyNames",
        value: params.has("name") ? { lang: "", name: params.get("name") } : null
      }
    ].filter((filter) => filter.value !== null && filter.value !== undefined && filter.value !== "");

    for (const filter of columnFilters) {
      const column = tableInstance.columns.find((entry) => entry.field === filter.field);
      if (!column) continue;
      tableInstance.setFilter(column.field, filter.value, column.headerFilterFunc, column.headerFilterNormalize);
      const inputSelector = filter.key === "aaguid"
        ? `input[data-field="${filter.field}"]`
        : `input[data-field="friendlyNames"][data-filter-key="name"]`;
      const input = tableInstance.container.querySelector(inputSelector);
      if (input) {
        input.value = filter.key === "aaguid" ? filter.value : filter.value.name;
      }
    }

    tableInstance.restoreFilterValues();
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.hash);
  };

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
        formatter: formatFriendlyNames,
        headerFilterFunc: filterFriendlyNames,
        sortFunc: sortFriendlyNames,
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
    applyUrlFilters(table);
  }

  e("#serial").innerText = mdsJson.no || "";

});
