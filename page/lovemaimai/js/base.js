/**
 * @preserve Base for helper functions and other globals.
 * @author mking@mking.me (Matt King)
 */

/**
 * Used globally to determine if functionality should be
 *    degraded for older browsers. Currently applies to IE7 and older.
 */
var degraded = false;

/**
 * Add trim function to all Strings.
 */
if(typeof String.prototype.trim !== 'function') {
  String.prototype.trim = function() {
    return this.replace(/^\s+|\s+$/g, '');
  };
}

/**
 * Wrapper function to minimize global namespace pollution.
 * @return {Object} external API to inner functions.
 */
var io = (function() {

  /**
   * Inject a script tag in to the body tag, setting it's src
   *    to the requested filename.
   */
  var injectScript = function(filename, callback) {
    var scr = document.createElement('script');
    scr.setAttribute('type', 'text/javascript');
    scr.setAttribute('src', filename);
    if (callback) {
      scr.onload = callback;
    }
    document.getElementsByTagName('body')[0].appendChild(scr);
  };

  var injectScripts = function(scripts, callback) {
    var len = scripts.length, totalLoaded = 0;
    var onsuccess = function() {
      totalLoaded++;
      if (totalLoaded == len) {
        callback();
      }
    };
    for (var i = 0; i < len; i++) {
      io.injectScript(scripts[i], onsuccess);
    }
  };

  /**
   * Shortcut to get DOM elements by ID
   * @param {String} node id of element to find
   * @return {Object} DOM element
   */
  var el = function(node) {
    return document.getElementById(node);
  };

  /**
   * Wraps an event listener function to normalize event attributes.
   * Used for IE event handling.
   * @param {Function} func event handler functino
   * @return {Function} event handler that calls original function
   *    with modified event object.
   */
  var ensureEvent = function(func) {
      return function() {
        var e = window.event;
        e.target = e.srcElement;
        e.preventDefault = function() {
          e.returnValue = false;
        };
        e.stopPropagation = function() {
          e.cancelBubble = true;
        };
        func.call(e.srcElement,e);
      };
  };

  /**
   * Cross-browser support for adding event listeners.
   * Overwrites itself based on if it's IE-style or W3C-style.
   * @param {String} evnt event name
   * @param {Object} elem DOM element to attach event to
   * @param {Function} func event callback function to apply
   * @return {null}
   */
  var listen = function(evnt, elem, func) {
    if (elem.addEventListener) {
      listen = function(evnt, elem, func) {
        elem.addEventListener(evnt,func,false);
      };
    } else if (elem.attachEvent) {
      listen = function(evnt, elem, func) {
        elem['on' + evnt] = ensureEvent(func);
      };
    }
    listen(evnt,elem,func);
  };

  /**
   * Cross-browser support for removing event listeners.
   * Overwrites itself based on if it's IE-style or W3C-style.
   * @param {String} evnt event name
   * @param {Object} elem DOM element to attach event to
   * @param {Function} func event callback function to apply
   * @return {null}
   */
  var unlisten = function(evnt, elem, func) {
    if (elem.removeEventListener) {
      unlisten = function(evnt, elem, func) {
        elem.removeEventListener(evnt,func,false);
      };
    } else if (elem.attachEvent) {
      unlisten = function(evnt, elem, func) {
        elem['on' + evnt] = null;
      };
    }
    unlisten(evnt,elem,func);
  };

  /**
   * Map a function to each item in an array
   * @param {Array} a array of items to apply function to
   * @param {Function} f function to apply
   * @return {Array} new array with items returned by function
   */
  var map = function(a,f) {
    var out = [];
    for (var i = 0, len = a.length; i < len; i++) {
      out[i] = f.call(a, a[i]);
    }
    return out;
  };

  /**
   * Public interface
   */
  return {
    el: el,
    listen: listen,
    unlisten: unlisten,
    map: map,
    injectScript: injectScript,
    injectScripts: injectScripts
  };


}());