// A simple script to use as a silly example with https://mrcoles.com/bookmarklet
// and https://github.com/mrcoles/bookmarklet
// Author: Peter Coles - mrcoles.com
// License: MIT

(function() {
  var ASSET = "https://mrcoles.com/media/img/sea-serpent-cutout.png";
  var WIDTH = 212;
  var HEIGHT = 104;
  var VERT_DIRECTIONS = ["up", "down"];
  var HORI_DIRECTIONS = ["left", "right"];
  var SCROLL_AMOUNTS = [6, 8, 11, 15];
  var SCROLL_DELAYS = [60, 85, 100, 130];

  function _assign(obj, attrs) {
    for (var key in attrs) {
      obj[key] = attrs[key];
    }
  }

  function _choice(options) {
    return options[parseInt(Math.random() * options.length)];
  }

  function add() {
    var outerMarquee = document.createElement("marquee");
    _assign(outerMarquee, {
      direction: _choice(VERT_DIRECTIONS),
      behavior: "alternate",
      scrollAmount: _choice(SCROLL_AMOUNTS),
      scrollDelay: _choice(SCROLL_DELAYS)
    });
    _assign(outerMarquee.style, {
      position: "fixed",
      width: "100%",
      height: "100%",
      top: 0,
      left: 0,
      zIndex: 999999,
      pointerEvents: "none"
    });

    var innerMarquee = document.createElement("marquee");
    _assign(innerMarquee, {
      behavior: "alternate",
      direction: _choice(HORI_DIRECTIONS),
      scrollAmount: _choice(SCROLL_AMOUNTS),
      scrollDelay: _choice(SCROLL_DELAYS)
    });
    _assign(innerMarquee.style, { width: "100%" });
    outerMarquee.appendChild(innerMarquee);

    var img = document.createElement("img");
    img.src = ASSET;
    innerMarquee.appendChild(img);

    var body = document.body;
    if (body) {
      body.appendChild(outerMarquee);
    }
  }

  var original = window.SeaDragon;

  var self = (window.SeaDragon = {
    add: add,
    noConflict: function() {
      window.SeaDragon = original;
      return self;
    }
  });
})();
