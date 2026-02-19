'use strict';

function type(obj) {
  return Object.prototype.toString.call(obj).match(/.* (.*)\]/)[1];
}

function imageTag(src) {
  return src ? "<img src='" + src + "'>" : "";
}

function imageFormatter(cell/*, formatterParams, onRendered*/) {
  return imageTag(cell.getValue());
}
function darkImageFormatter(cell/*, formatterParams, onRendered*/) {
  cell.getElement().classList.add("dark");
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

const ready = (callback) => {
  if (document.readyState != "loading") callback();
  else document.addEventListener("DOMContentLoaded", callback);
}

const cpy = typeof navigator.clipboard?.writeText === "function" ?
  "<span title='Copy to clipboard' class='cpy'>📋</span>" : "";
