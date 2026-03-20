'use strict';
/* globals Tabulator, LAST_CMDS_UPDATE */

let table;
let mdsJson;

function updateCount() {
  e("#table-size").innerText = document.querySelectorAll("#cmds-table tbody tr:not([hidden])").length - 1;
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
  const table = e("#cmds-table tbody");
  let even = true;

  function applyFilter() {
    const filterName = e("#filterName").value.toLowerCase();
    const filterLang = e("#filterLang").value.toLowerCase();
    let header = true;
    table.querySelectorAll("tr").forEach(tr => {
      if (header) {
        header = false;
        return;
      }
      const friendlyNames = tr.children[1].querySelectorAll("div.friendly-name");
      let nameMatched = false;
      let langMatched = false;
      friendlyNames.forEach(div => {
        const lang = div.querySelector(".lang").innerText.toLowerCase();
        div.hidden = filterLang && !lang.includes(filterLang);
        langMatched |= lang.includes(filterLang);
        if (!div.hidden) {
          const name = div.querySelector(".name").innerText.toLowerCase();
          nameMatched |= name.includes(filterName);
        }
      });
      tr.hidden = filterName && !nameMatched || filterLang && !langMatched;
    });
    updateCount();
  }
  e("#filterName").addEventListener("input", applyFilter);
  e("#filterLang").addEventListener("input", applyFilter);
  e("#clear-filter").addEventListener("click", (evt) => {
    evt.preventDefault();
    e("#filterName").value = "";
    e("#filterLang").value = "";
    applyFilter();
  });

  function formatFriendlyNames(friendlyNames) {
    if (!friendlyNames) {
      return "";
    }
    return Object.entries(friendlyNames).map(([lang, name]) => `<div class="friendly-name"><span class="lang">${lang}</span>: <span class="name">${name}</span></div>`).join("");
  }

  Array.from(Object.keys(mdsJson), (e, i) => {
    if (e != "no") {
      table.appendChild(newE("tr", { class: even ? "even" : "" }, `
        <td>${e}</td>
        <td>${formatFriendlyNames(mdsJson[e].friendlyNames)}</td>
        <td class="img">${imageTag(mdsJson[e].icon)}</td>
        <td class="img dark">${imageTag(mdsJson[e].iconDark)}</td>
        <td class="img">${imageTag(mdsJson[e].providerLogoLight)}</td>
        <td class="img dark">${imageTag(mdsJson[e].providerLogoDark)}</td>
      </tr>`));
      even = !even;
    }
  });
  
  e("#footer").innerHTML = `<span>Payload serial: ${mdsJson.no}</span>`;
  e("#table-size").innerText = document.querySelectorAll("#cmds-table tbody tr").length - 1;
  updateCount();
});
