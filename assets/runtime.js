/* Eduglobal International — tiny page runtime.
   Renders the page template (holes, sc-for, sc-if, onClick) from the page's Component class. */
(function () {
  'use strict';

  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (patch) {
    var next = typeof patch === 'function' ? patch(this.state, this.props) : patch;
    this.state = Object.assign({}, this.state, next);
    if (this.__schedule) this.__schedule();
  };
  DCLogic.prototype.forceUpdate = function () { if (this.__schedule) this.__schedule(); };
  window.DCLogic = DCLogic;

  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  var ONLY_HOLE = /^\{\{\s*([^}]+?)\s*\}\}$/;

  function resolve(expr, scope) {
    expr = expr.trim();
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    if (expr === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr);
    if (/^'.*'$/.test(expr) || /^".*"$/.test(expr)) return expr.slice(1, -1);
    var parts = expr.split('.');
    var v = scope;
    for (var i = 0; i < parts.length; i++) {
      if (v == null) return undefined;
      v = v[parts[i]];
    }
    return v;
  }

  function interpolate(str, scope) {
    return str.replace(HOLE, function (_, e) {
      var v = resolve(e, scope);
      return v == null ? '' : String(v);
    });
  }

  function bindDispatcher(el, type) {
    el.__bound = el.__bound || {};
    if (el.__bound[type]) return;
    el.__bound[type] = true;
    el.addEventListener(type, function (ev) {
      var fn = el.__h && el.__h[type];
      if (typeof fn === 'function') fn(ev);
    });
  }

  function build(tpl, scope, out) {
    if (tpl.nodeType === 3) {
      out.push(document.createTextNode(interpolate(tpl.nodeValue, scope)));
      return;
    }
    if (tpl.nodeType !== 1) return;
    var tag = tpl.localName;
    var kids = tpl.content ? tpl.content.childNodes : tpl.childNodes;
    if (tag === 'sc-for') {
      var list = resolve((tpl.getAttribute('list') || '').replace(/^\{\{|\}\}$/g, ''), scope) || [];
      var as = tpl.getAttribute('as') || 'item';
      for (var i = 0; i < list.length; i++) {
        var s = Object.create(scope);
        s[as] = list[i];
        s.$index = i;
        for (var k = 0; k < kids.length; k++) build(kids[k], s, out);
      }
      return;
    }
    if (tag === 'sc-if') {
      var val = resolve((tpl.getAttribute('value') || '').replace(/^\{\{|\}\}$/g, ''), scope);
      if (val) for (var j = 0; j < kids.length; j++) build(kids[j], scope, out);
      return;
    }
    var el = tpl.namespaceURI && tpl.namespaceURI !== 'http://www.w3.org/1999/xhtml'
      ? document.createElementNS(tpl.namespaceURI, tpl.localName)
      : document.createElement(tag);
    el.__h = {};
    el.__managed = [];
    var attrs = tpl.attributes;
    for (var a = 0; a < attrs.length; a++) {
      var name = attrs[a].name, raw = attrs[a].value;
      if (name.indexOf('hint-') === 0) continue;
      var m = raw.match(ONLY_HOLE);
      if (name.slice(0, 2) === 'on') {
        var fn = m ? resolve(m[1], scope) : null;
        var type = name.slice(2).toLowerCase();
        // Like React: onChange on a text field fires on every keystroke.
        if (type === 'change' && (tag === 'textarea' || (tag === 'input' && !/^(checkbox|radio|file)$/i.test(tpl.getAttribute('type') || '')))) type = 'input';
        el.__h[type] = fn;
        bindDispatcher(el, type);
        continue;
      }
      var value = m ? resolve(m[1], scope) : interpolate(raw, scope);
      if (value === false || value == null) continue;
      el.setAttribute(name, String(value));
      el.__managed.push(name);
    }
    var childOut = [];
    for (var c = 0; c < kids.length; c++) build(kids[c], scope, childOut);
    for (var n = 0; n < childOut.length; n++) el.appendChild(childOut[n]);
    out.push(el);
  }

  function sameKind(a, b) {
    return a.nodeType === b.nodeType && a.nodeName === b.nodeName;
  }

  function patchNode(o, n) {
    if (o.nodeType === 3) {
      if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue;
      return;
    }
    var keep = {};
    for (var i = 0; i < n.__managed.length; i++) {
      var name = n.__managed[i], v = n.getAttribute(name);
      keep[name] = true;
      if (o.getAttribute(name) !== v) o.setAttribute(name, v);
      if (name === 'value' && 'value' in o && o.value !== v) o.value = v;
    }
    var prev = o.__managed || [];
    for (var j = 0; j < prev.length; j++) if (!keep[prev[j]]) o.removeAttribute(prev[j]);
    o.__managed = n.__managed;
    o.__h = n.__h;
    for (var t in n.__h) bindDispatcher(o, t);
    patchChildren(o, Array.prototype.slice.call(n.childNodes));
  }

  function patchChildren(parent, fresh) {
    var old = Array.prototype.slice.call(parent.childNodes);
    for (var i = 0; i < fresh.length; i++) {
      var o = old[i];
      if (!o) parent.appendChild(fresh[i]);
      else if (sameKind(o, fresh[i])) patchNode(o, fresh[i]);
      else parent.replaceChild(fresh[i], o);
    }
    for (var k = fresh.length; k < old.length; k++) parent.removeChild(old[k]);
  }

  window.EG = {
    mount: function (Component) {
      var tpl = document.getElementById('tpl').content;
      var app = document.getElementById('app');
      var inst = new Component({});
      var queued = false;
      function render() {
        queued = false;
        var vals = inst.renderVals ? inst.renderVals() : {};
        var out = [];
        var kids = tpl.childNodes;
        for (var i = 0; i < kids.length; i++) build(kids[i], vals, out);
        patchChildren(app, out);
      }
      inst.__schedule = function () {
        if (queued) return;
        queued = true;
        (window.requestAnimationFrame || setTimeout)(render);
      };
      render();
      if (inst.componentDidMount) inst.componentDidMount();
      if (location.hash) {
        var target = document.getElementById(location.hash.slice(1));
        if (target) target.scrollIntoView();
      }
    }
  };
})();
