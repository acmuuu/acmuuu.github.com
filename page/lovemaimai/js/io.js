/**
 * @preserve Homepage experience animation functionality.
 * This file includes all functionality to render the countdown
 * clock, and ball physics. Depends on box2d libraries and base.js.
 *
 * Vendor provided code. Compressed file for the live site,
 * /events/io/2011/static/js/iobadge.js, can be created by compiling
 * this raw script at http://closure-compiler.appspot.com/ using the
 * default, "simple," optimization setting.
 *
 * @author mking@mking.me (Matt King)
 */

if (!window.requestAnimationFrame) {
  /**
   * Utilize new requestAnimationFrame functionality if available.
   * Will check for all variations of the functions in the browser
   *    and then fallback to setTimeout.
   */
  window.requestAnimationFrame = (function() {
    return window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      function(callback, element) {
        window.setTimeout(callback, 1000 / 60);
      };
  })();
}

/**
 * Anonymous wrapper function, setting up state and firing off draw loop.
 */

(function() {

  /**
   * Class Countdown
   * Represents a Countdown, mainly for holding references to Box2d
   *     world information.
   * @param {Object} opts Settings for countdown.
   * @param {Object} opts.gravity Object with x and y values for world gravity.
   * @param {Object} opts.surface Object with settings for all surfaces
   *     created in the world.
   *     friction: float
   *     restitution: float
   *     density: float.
   * @param {Object} opts.dots Object with settings for all dots
   *     created in the world.
   *     friction: float
   *     restitution: float
   *     density: float
   *     highVelocity: int
   *     lowVelocity: int.
   * @constructor
   */
  function Countdown(opts) {
    this.opts = opts;
    this.bounds = opts.bounds;
    this.gravity = new b2Vec2(opts.gravity.x, opts.gravity.y);
    this.surface = opts.surface;
    this.dots = opts.dots;
    this.surfaces = {};
    this.iterations = 1;
    this.timeStep = 1 / 20;
    this.opts.types = {};
    for (var i = 0; i < this.opts.colors.length; i++) {
      var color = this.opts.colors[i];
      if (color && !this.opts.types[color]) {
        this.opts.types[color] = genDot(color,
                                        this.opts.dotType,
                                        this.opts.ctx);
      }
    }
    this.opts.types['c9c9c9'] = genDot('c9c9c9',
                                       this.opts.dotType,
                                       this.opts.ctx);
    this.opts.types['d9d9d9'] = genDot('d9d9d9',
                                       this.opts.dotType,
                                       this.opts.ctx);
    this.opts.types['b6b4b5'] = genDot('b6b4b5',
                                       this.opts.dotType + ' separator',
                                       this.opts.ctx);

    this.createWorld();
  }

  /**
   * Box2d: Create a box2d world.
   * @return {b2World} new world.
   */
  Countdown.prototype.createWorld = function() {
    var worldAABB = new b2AABB();
    worldAABB.minVertex.Set(-2000, -2000);
    worldAABB.maxVertex.Set(2000, 2000);
    var doSleep = true;
    this.world = new b2World(worldAABB, this.gravity, doSleep);
    this.createGround((window.innerHeight ||
                       document.documentElement.clientHeight) - 255);
    return this.world;
  };

  /**
   * Box2d: Creates a ground shape. Depends on global ground variable.
   * Destroys global ground variable if called.
   * @param {number} bottom Bottom position of the ground.
   */
  Countdown.prototype.createGround = function(bottom) {
    if (this.ground) {
      this.world.DestroyBody(this.ground);
      this.ground = null;
    }
    var groundSd = new b2BoxDef();
    groundSd.extents.Set(2000, 50);
    groundSd.friction = 0;
    groundSd.restitution = 0.9;
    var groundBd = new b2BodyDef();
    groundBd.AddShape(groundSd);
    groundBd.position.Set(0, bottom);
    this.ground = this.world.CreateBody(groundBd);
  };

  /**
   * Box2d: Creates a box surface to bounce off of.
   * Appends to world passed in.
   * @param {String} id identifier to refer to surface on destroy.
   * @param {number} x Box's target X position.
   * @param {number} y Box's target Y position.
   * @param {number} w Box's target width.
   * @param {number} h Box's target height.
   * @param {boolean} fixed Whether or not Box is a fixed object.
   * @return {b2BodyDef} box2d body shape.
   */
  Countdown.prototype.createSurface = function(id, x, y, w, h, fixed) {
    if (typeof(fixed) == 'undefined') {
      fixed = true;
    }
    var boxSd = new b2BoxDef();
    if (!fixed) {
      boxSd.density = this.surface.density;
    }
    boxSd.restitution = this.surface.restitution;
    boxSd.friction = this.surface.friction;
    boxSd.extents.Set(w, h);
    var boxBd = new b2BodyDef();
    boxBd.AddShape(boxSd);
    boxBd.position.Set(x, y);
    if (this.surfaces[id]) {
      this.world.DestroyBody(this.surfaces[id]);
    }
    this.surfaces[id] = this.world.CreateBody(boxBd);
    return this.surfaces[id];
  };


  /**
   * Box2d: Creates a ball shape.
   * Appends to this.world.
   * @param {number} x Dot's X position.
   * @param {number} y Dot's Y position.
   * @param {number} vel The linear velocity of the ball.
   * @return {b2BodyDef} box2d body shape.
   */
  Countdown.prototype.createDot = function(x, y, vel) {
    var dotSd = new b2CircleDef();
    dotSd.density = this.dots.density;
    dotSd.radius = 7;
    dotSd.restitution = this.dots.restitution;
    dotSd.friction = this.dots.friction;
    var dotBd = new b2BodyDef();
    dotBd.AddShape(dotSd);
    dotBd.position.Set(x, y);
    dotBd.linearVelocity.Set(Math.random() * vel - (vel / 2),
                             Math.random() * vel - (vel / 2));
    return this.world.CreateBody(dotBd);
  };

  /**
   * Box2d: Destroys a ball shape.
   * @param {b2BodyDef} dot Ball shape to destroy.
   */
  Countdown.prototype.destroyDot = function(dot) {
    this.world.DestroyBody(dot);
  };

  /**
   * Box2d: Adjust the gravity of the current world.
   * @param {int} x Target X position.
   * @param {int} y Target Y position.
   */
  Countdown.prototype.adjustGravity = function(x, y) {
    this.world.m_gravity = new b2Vec2(x, y);
  };

  /**
   * Box2d: Unload world and destroy all surfaces.
   */
  Countdown.prototype.unload = function() {
    for (k in this.surfaces) {
      this.world.DestroyBody(this.surfaces[k]);
    }
    this.world.DestroyBody(this.ground);
    this.world = null;
  };

  /**
   * Box2d: Step the world an iteration.
   */
  Countdown.prototype.step = function() {
    this.world.Step(this.timeStep, this.iterations);
  };

  /**
   * Update world based on new dimensions.
   */
  Countdown.prototype.updateBounds = function(bounds) {
    this.createGround((windowDimensions[1] - 255));
    this.bounds = bounds;
  };

  /**
   * Class Digit
   * Represents a single digit on the countdown clock.
   * Generates an array of dots based on opts.matrix, and saves them for
   * drawing.
   * @param {Object} opts Settings for digit.
   * @param {number} opts.x Digit X Position.
   * @param {number} opts.y Digit Y Position.
   * @param {Object} opts.ctx A DOM node this will be appended to.
   * @param {Array.<number>} opts.matrix A multi-dimensional array representing
   *     state of the digit.
   * @param {String} opts.blankColor The hex color value of a "blank" dot.
   * @param {String} opts.activeColor The hex colorvalue of an "active" dot.
   * @constructor
   */
  function Digit(opts) {
    this.x = opts.x;
    this.y = opts.y;
    this.ctx = opts.ctx;
    this.matrix = opts.matrix;
    this.num = opts.num;
    this.blankColor = opts.blankColor || '#d9d9d9';
    this.activeColor = opts.activeColor;
    this.dots = [];

    for (var i = 0; i < this.matrix.length; i++) {
      for (var j = 0; j < this.matrix[i].length; j++) {
        this.dots.push(new Dot({
          x: this.x + 19 * j,
          y: this.y + 19 * i,
          ctx: this.ctx,
          fillStyle: (this.matrix[i][j] == 1 ?
                      this.activeColor :
                      this.blankColor),
          willDraw: (this.matrix[i][j] != 2),
          isActive: this.matrix[i][j] == 1,
          digit: this,
          spawned: new Date().getTime()
        }));
      }
    }
  }

  /**
   * Routine to place digit and dots on the countdown clock.
   * Will run through all the associated dots and update their positions
   *     based on the state of the digit:
   *     - default: digit lives on the clock.
   *     - removed: digit has been popped off the clock.
   * Reaps all dots that are considered out of bounds, and once all dots
   * are reaped, marks itself as 'done' to be removed from the digit list.
   */
  Digit.prototype.draw = function() {
    if (this.dots.length === 0) {
      totalDotCount -= this.removedDotCount;
      this.done = true;
      return;
    }
    for (var j = 0; j < this.dots.length; j++) {
      if (this.removed) {
        // only draw dots that are colored ('active')
        if (!noBounce && (this.dots[j].isActive && !degraded)) {
          if (!this.dots[j].ball2d) {
            this.dots[j].ball2d = countdown.createDot(this.dots[j].x,
                                                      this.dots[j].y,
                                                      this.velocity);
            this.dots[j].d.style.zIndex = 99;
          }
          this.dots[j].x = this.dots[j].ball2d.m_position0.x;
          this.dots[j].y = this.dots[j].ball2d.m_position0.y;
          /**
           * Stop drawing and remove from list when considered done.
           */
          if (this.dots[j].y < -350 ||
              this.dots[j].x < (countdown.bounds[0] * -1) - 20 ||
              this.dots[j].x > windowDimensions[0] ||
              totalDotCount > dotThreshold ||
              this.forceRemove) {
            countdown.destroyDot(this.dots[j].ball2d);
            this.ctx.removeChild(this.dots[j].d);
            this.dots.splice(j, 1);
            totalDotCount--;
            this.removedDotCount--;
          } else {
            this.dots[j].draw();
          }
        } else {
          /**
           * Remove dots we don't want to draw after removed,
           * because they are placeholder dots.
           */
          this.ctx.removeChild(this.dots[j].d);
          this.dots.splice(j, 1);
        }
      } else {
        this.dots[j].draw();
      }
    }
    if (this.removed && !this.removedDotCount) {
      totalDotCount += this.dots.length;
      this.removedDotCount = this.dots.length;
    }
  };

  /**
   * Routine to remove all dots that are not considered 'active'.
   * Marks itself as 'removed' by setting this.removed to true.
   * Figures out the digit that replaced it by looking at the numberMatrices
   *     array, then removes dots that are in the same position.
   * Dots that do not exist in the same position on the successor are marked
   *     to be thrown around.
   */
  Digit.prototype.remove = function() {
    var successor = numberMatrices[this.num - 1] ||
        numberMatrices[numberMatrices.length - 1];
    var current = numberMatrices[this.num];
    if (successor) {
      if (this.num !== 0 || this.num === 1) {
        var s = 0;
        for (var i = 0; i < successor.length; i++) {
          for (var j = 0; j < successor[i].length; j++) {
            if (current[i][j] == successor[i][j]) {
              if (this.dots[s]) {
                this.ctx.removeChild(this.dots[s].d);
                this.dots.splice(s, 1);
                s--;
              }
            }
            s++;
          }
        }
      }
    }
    /**
     * Higher velocity if the number is zero.
     */
    if (this.num === 0) {
      this.velocity = countdown.dots.highVelocity;
    } else {
      this.velocity = countdown.dots.lowVelocity;
    }
    this.removed = true;
  };


  /**
   * Class Dot
   * Represents a Dot on a Digit.
   * @param {Object} opts Settings for digit.
   * @param {number} opts.x Dot X position.
   * @param {number} opts.y Dot Y Position.
   * @param {Object} opts.ctx A DOM node this will be appended to.
   * @param {String} opts.fillStyle the hex color value of the dot.
   * @param {Boolean} opts.willDraw Whether or not to append itself
   *     to this.ctx.
   * @param {Boolean} opts.isActive Being active means that the dot
   *     has a color.
   * @param {Digit} opts.digit The parent Digit of the Dot.
   * @constructor
   */
  function Dot(opts) {
    this.x = opts.x;
    this.y = opts.y;
    this.ctx = opts.ctx;
    this.fillStyle = opts.fillStyle;
    this.willDraw = opts.willDraw;
    this.isActive = opts.isActive;
    this.digit = opts.digit;
  }

  /**
   * Routine to render dots with onto this.ctx.
   * Will create a new img DOM node and set the src based on this.fillStyle,
   *     then it will append it to this.ctx.
   * Finally, it sets the x/y of the dot.
   */
  Dot.prototype.draw = function() {
    if (this.willDraw) {
      if (!this.d) {
        var t = countdown.opts.types;
        this.d = t[this.fillStyle].cloneNode(false);
        this.ctx.appendChild(this.d);
      }
      this.d.style.left = this.x + 'px';
      this.d.style.top = this.y + 'px';
    }
  };

  /**
   * End prototype definitions.
   */

  var isChrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1 ||
    navigator.userAgent.toLowerCase().indexOf('safari') > -1;
  var drawInterval;
  var noBounce = false;
  var fooled = false;
  var stopDrawing = false;

  /**
   * Reference to the countdown DOM node we are working in.
   */
  var ctx = io.el('countdown');

  /**
   * Global counter for total dots active on the ctx.
   */
  var totalDotCount = 0;

  /**
   * Max number of dots before we start reaping.
   */
  var dotThreshold = 150;

  /**
   * Represents state of a Digit row, all dots filled in.
   */
  var fullRow = [1, 1, 1, 1];

  /**
   * Represents state of a Digit row, only right dot filled in.
   */
  var rightFill = [0, 0, 0, 1];

  /**
   * Represents state of a Digit row, only left dot filled in.
   */
  var leftFill = [1, 0, 0, 0];

  /**
   * Represents state of a Digit row, ends filled in.
   */
  var endsFill = [1, 0, 0, 1];


  /**
   * Represents complete digit states for 0-9.
   */
  var numberMatrices = [
    [
      fullRow,
      endsFill,
      endsFill,
      endsFill,
      endsFill,
      endsFill,
      fullRow
    ],
    [
      rightFill,
      rightFill,
      rightFill,
      rightFill,
      rightFill,
      rightFill,
      rightFill
    ],
    [
      fullRow,
      rightFill,
      rightFill,
      fullRow,
      leftFill,
      leftFill,
      fullRow
    ],
    [
      fullRow,
      rightFill,
      rightFill,
      fullRow,
      rightFill,
      rightFill,
      fullRow
    ],
    [
      endsFill,
      endsFill,
      endsFill,
      fullRow,
      rightFill,
      rightFill,
      rightFill
    ],
    [
      fullRow,
      leftFill,
      leftFill,
      fullRow,
      rightFill,
      rightFill,
      fullRow
    ],
    [
      fullRow,
      leftFill,
      leftFill,
      fullRow,
      endsFill,
      endsFill,
      fullRow
    ],
    [
      fullRow,
      rightFill,
      rightFill,
      rightFill,
      rightFill,
      rightFill,
      rightFill
      ],
    [
      fullRow,
      endsFill,
      endsFill,
      fullRow,
      endsFill,
      endsFill,
      fullRow
    ],
    [
      fullRow,
      endsFill,
      endsFill,
      fullRow,
      rightFill,
      rightFill,
      fullRow
    ]
  ];

  /**
   * Represents state of a separator (two dots between Digit sets).
   */
  var separator = [
    [2, 2],
    [2, 2],
    [1, 2],
    [2, 2],
    [1, 2],
    [2, 2],
    [2, 2]
  ];

  /**
   * Returns a random number between two numbers.
   * @param {number} min Lowest number.
   * @param {number} max Highest number.
   * @return {number} Random number.
   */
  function getRandom(min, max) {
    var randomNum = Math.random() * (max - min);
    return Math.round(randomNum) + min;
  }

  /**
   * Returns the top and left offset of a DOM node.
   * @param {Object} obj DOM node.
   * @return {Array.<number>} left and top values of obj.
   */
  function getPos(obj) {
    var curleft = 0, curtop = 0;
    do {
      curleft += obj.offsetLeft;
      curtop += obj.offsetTop;
    } while ((obj = obj.offsetParent));
    return [curleft, curtop];
  }

  /**
   * Get window dimensions to save for later so we don't
   *     have to query it all the time.
   * @return {Array.<number>} width and height of window.
   */
  function getWindowDimensions() {
    return [
      (window.innerWidth || document.documentElement.clientWidth),
      (window.innerHeight || document.documentElement.clientHeight)
    ];
  }

  /**
   * Creates a new Image node and appends it to the ctx,
   * which will be cloned around as needed to generate more digits.
   *
   * @param {String} color hex value of dot.
   * @param {String} className class to assign to image.
   * @param {Object} ctx DOM node to append to.
   * @return {Object} Image that was generated.
   */
  function genDot(color, className, ctx) {
    var h = new Image();
    h.className = className;
    h.src = './img/' + className.replace(/\s.*?$/, '') + '-' + color +
        '.png';
    ctx.appendChild(h);
    return h;
  }

  /**
   * Pad a number with leading zeroes.
   * @param {number} num Number to pad.
   * @param {places} places Number of places to pad to.
   * @return {String} padding number as a string value.
   */
  function padNum(num, places) {
    if (num < 100 && places == 3) {
      num = '0' + num;
    }
    if (num < 10) {
      num = '0' + num;
    }
    return num.toString();
  }

  /**
   * Gets the current date, figures out how many days, hours,
   *    minutes and seconds until global countdownTo variable.
   * @return {Array.<String>} array of all digits plus separators.
   */
  function getDigits() {
    var now = new Date().getTime();
    var dateDiff = Math.floor((countdownTo - now) / 1000);
    /**
     * Don't return anything if we're past the countdownTo date.
     */
    if (dateDiff < 0) {
      return [];
    } else {
      var days = padNum(Math.floor(dateDiff / 86400), 3);
      var timeRemaining = Math.floor(dateDiff % 86400);
      var hours = padNum(Math.floor(timeRemaining / 3600), 2);
      var minutes = padNum(Math.floor((timeRemaining % 3600) / 60), 2);
      var seconds = padNum(((timeRemaining % 3600) % 60) % 60, 2);
      var values = [days, hours, minutes, seconds].join('').split('');
      values.splice(3, 0, ':');
      values.splice(6, 0, ':');
      values.splice(9, 0, ':');
      return values;
    }
  }

  /**
   * Routine that is run in a loop to draw Digits and Dots.
   */
  function draw() {

    /**
     * Get digit array as of this cycle in the loop.
     */
    var digits = getDigits();

    /**
     * Set the virtual cursor to zero. Gets incremented as Digits and Dots
     *     are draw on ctx.
     */
    var cursorX = 0, cursorY = 0;

    /**
     * Reset current digit list to an empty array.
     * Each digit will be appended to this array.
     */
    currentDigits = [];

    /**
     * Loop through all digits and generate Digit objects as needed.
     */
    for (var i = 0; i < digits.length; i++) {

      /**
       * Check oldDigits to see if this Digit exists. If so, reuse it.
       */
      if (oldDigits.length > 0 && digits[i] == oldDigits[i].num) {

        currentDigits.push(oldDigits[i]);

        /**
         * Increment the cursor based on the Digit value.
         * Separator (':') gets it's X incremented by 2 widths of Dot,
         *     otherwise it does the default 5 widths
         *     (the full width of a Digit).
         */
        if (digits[i] == ':') {
          cursorX += (2 * 18);
        } else {
          cursorX += (5 * 19) - 1;
        }

      } else {

        /**
         * Separator (':') gets different constructor values.
         */
        if (digits[i] == ':') {
          currentDigits.push(
            new Digit({
              ctx: ctx,
              x: cursorX,
              y: 14,
              num: digits[i],
              matrix: separator,
              activeColor: 'b6b4b5'
            }));
          cursorX += (2 * 18);
        } else {
          /**
           * Add a new Digit to the currentDigits array.
           */
          currentDigits.push(
            new Digit({
              ctx: ctx,
              x: cursorX,
              y: 14,
              num: parseInt(digits[i], 0),
              matrix: numberMatrices[parseInt(digits[i], 0)],
              activeColor: countdown.opts.colors[i],
              blankColor: (i < 4 || i > 9) ?
                          'c9c9c9' :
                          'd9d9d9',
              successor: oldDigits.length ? oldDigits[i] : null
            }));
          cursorX += (5 * 19) - 1;

        }
        /**
         * Run the draw routine on the Digit, rendering itself
         *    on the ctx.
         */
        currentDigits[i].draw();

        /**
         * If a Digit exist on oldDigits in this position,
         *     it's ready to be 'discarded', meaning start the
         *     Dot animation. Append it to the discardedDigits
         *     array to be looped through again.
         */
        if (oldDigits.length) {
          var old = oldDigits[i];
          discardedDigits.push(old);
        }
      }
    }

    /**
     * Box2d: step the world an iteration
     */
    countdown.step();

    /**
     * Loop through all the discarded digits, and draw. If marked as done,
     *    reap the Digit to remove it from play.
     */
    for (var j = 0; j < discardedDigits.length; j++) {
      if (discardedDigits[j].done) {
        discardedDigits.splice(j, 1);
      } else {
        /**
         * Call the remove method to reap dots not going to bounce around.
         */
        if (!discardedDigits[j].removed) {
          discardedDigits[j].remove();
        }
        discardedDigits[j].draw();
      }
    }

    /**
     * If digits is empty, immediately remove discardedDigits
     * then start the finale.
     */
    if (digits.length === 0) {
      for (var i = 0; i < discardedDigits.length; i++) {
        discardedDigits[i].forceRemove = true;
        discardedDigits[i].draw();
        discardedDigits.splice(i, 1);
      }
      stopDrawing = true;
      finale();
    }

    /**
     * Assign the currentDigits to oldDigits so the next iteration can
     * compare the current set to the previous one.
     */
    oldDigits = currentDigits;
    if (!stopDrawing) {
      requestAnimationFrame(draw);
    }
  }

  /**
   * Inject the countdown finale scripts, called after the countdown
   * reaches the end.
   */
  var finale = function() {
    if (isChrome) {
      io.injectScripts(['js/Three.js',
                        'js/Tween.js',
                        'js/countdown-entities.js'],
                       function() {
                         io.el('wrapper').style.background =  'none';
                         io.el('canvas-content').innerHTML = '';
                         io.injectScript('js/countdown-finale.js');
                       });
    }
  };

  /**
   * Nullify references to Digits and Box2d objects, run onunload
   */
  var cleanup = function() {
    oldDigits = null;
    currentDigits = null;
    discardedDigits = null;
    countdown.unload();
    countdown = null;
  };

  /**
   * Get the date we're counting down to.
   */
//  var countdownTo = new Date().getTime() + 2000;
  var countdownTo = new Date().getTime() + 0;

  /**
   * Buckets for the Digits.
   */
  var currentDigits, oldDigits = [], discardedDigits = [];

  /**
   * Object to old references to surfaces, so we can destroy and recreate.
   */
  var surfaces = {};

  /**
   * Reference to hold window dimensions without having to ask window for them
   *     all the time.
   */
  var windowDimensions = getWindowDimensions();

  /**
   * Start out draggable state as not activated.
   */
  var activated;

  /**
   * Resize ground and refetch countdownBounds when window is resized.
   */
  io.listen('resize', window, function() {
    windowDimensions = getWindowDimensions();
    countdown.updateBounds(getPos(ctx));
  });

  /**
   * Add listener to cleanup when the user leaves.
   */
  io.listen('unload', window, cleanup);

  /**
   * Create a list of countdown configurations.
   */
  var countdownConfigs = [];

  /**
   * Default Countdown.
   */
  countdownConfigs.push({
    gravity: { x: 0, y: 400 },
    colors: ['265897', '265897', '265897', '',
             '13acfa', '13acfa', '',
             'c0000b', 'c0000b', '',
             '009a49', '009a49'],
    dotType: 'ball',
    surface: {
      density: 1.0,
      restitution: 1.0,
      friction: 0
    },
    dots: {
      density: 0.3,
      restitution: 0.5,
      friction: 0.1,
      highVelocity: 1000,
      lowVelocity: 300
    },
    bounds: getPos(ctx),
    condition: function() {
      return true;
    },
    ctx: ctx
  });

  /**
   * Run through all of the countdown configurations and test
   *    to see if we want to show them. The first configuration that returns
   *    true by calling the condition function gets picked to display.
   */
  var countdown;
  for (var i = 0; i < countdownConfigs.length; i++) {
    if (countdownConfigs[i].condition.call() === true) {
      countdown = new Countdown(countdownConfigs[i]);
      if (countdownConfigs[i].behavior) {
        countdownConfigs[i].behavior.call();
      }
      break;
    }
  }

  /**
   * Loop!
   */
  document.getElementsByTagName('body')[0].scrollTop = 0;

  draw();

}());
