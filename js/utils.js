/* eslint-disable no-unused-vars */
/* globals CustomTable */
'use strict';

function type(obj) {
  return Object.prototype.toString.call(obj).match(/.* (.*)\]/)[1];
}

function imageTag(src) {
  return src ? "<img src='" + src + "'>" : "";
}

function imageFormatter(cell/*, formatterParams, onRendered*/) {
  cell.getElement().classList.add("img");
  return imageTag(cell.getValue());
}
function darkImageFormatter(cell/*, formatterParams, onRendered*/) {
  cell.getElement().classList.add("img", "dark");
  return imageTag(cell.getValue());
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

const onReady = (callback) => {
  if (document.readyState != "loading") callback();
  else document.addEventListener("DOMContentLoaded", callback);
}

// Table filtering helpers
function matchesFilter(value, filter) {
  return (!filter) || CustomTable.trimLower(value).includes(filter);
}

// Anonymous usage stats
function statEvent(name, title) {
  console.debug(`${name}${title ? ` - ${title}` : ""}`)
  if (window?.goatcounter?.count && !window.goatcounter.no_onload) {
    window.goatcounter.count({
      path: name,
      title: title,
      event: true,
    });
  }
}

