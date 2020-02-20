(function(d, w, undefined) {
  // supports checks
  var supports = {
    querySelectorAll: !!d.querySelectorAll,
    canvas: (function() {
      var elem = d.createElement("canvas");
      return !!(elem.getContext && elem.getContext("2d"));
    })(),
    classList: (function() {
      var elem = d.createElement("div");
      return !!elem.classList;
    })()
  };

  // search nav
  d.getElementById("nav-toggle").onclick = function() {
    var elt = d.body,
      r = /(^|\s+)show-nav(\s+|$)/;
    if (r.test(elt.className)) {
      elt.className = elt.className.replace(r, "");
    } else {
      elt.className += (elt.className ? " " : "") + "show-nav";
    }
  };

  // gifs
  if (supports.querySelectorAll && supports.canvas && supports.classList) {
    var elts = d.querySelectorAll(".post img.hide-gif");
    var i = elts.length;
    var elt, p;
    while (i > 0) {
      i--;
      elt = elts[i];
      p = elt.parentNode;
      p.classList.add("wrap-hide-gif");
      _asCanvas(elt, _insertCanvas);
    }
  } else {
    try {
      var s = d.createElement("style");
      s.innerHTML = ".hide-gif { visibility: visible; }";
      d.getElementsByTagName("head")[0].appendChild(s);
    } catch (e) {}
  }

  function _insertCanvas(img, canvas) {
    _drawTriangle(canvas);

    var wrap = d.createElement("span");
    wrap.className = "wrap-canvas";
    wrap.appendChild(canvas);
    img.parentNode.appendChild(wrap);

    img.parentNode.addEventListener(
      "click",
      function() {
        this.classList.toggle("show-still");
      },
      false
    );

    img.classList.add("processed");
  }

  function _asCanvas(img, cb) {
    var imgObj = new Image();
    imgObj.src = img.src;
    imgObj.onload = function() {
      var c = d.createElement("canvas");
      c.width = this.width;
      c.height = this.height;
      var ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      cb(img, c);
    };
  }

  function _drawTriangle(canvas) {
    var w = canvas.width;
    var h = canvas.height;
    var dim = 20;
    dim = Math.min(dim, w / 2 - 10, h / 2 - 10);

    var ctx = canvas.getContext("2d");
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, .85)";
    ctx.beginPath();
    ctx.moveTo(w / 2 - dim * 0.7, h / 2 - dim);
    ctx.lineTo(w / 2 - dim * 0.7, h / 2 + dim);
    ctx.lineTo(w / 2 + dim, h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
})(document, this);
