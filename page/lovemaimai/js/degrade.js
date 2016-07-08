/**
 * @preserve Sets up degraded status.
 * Will be included by IE7 and earlier. Depends on base.js
 *     (mostly for visibility of the 'degraded' variable).
 * @author mking@mking.me (Matt King)
 */

/**
 * Set global degraded to true, to trigger any degraded functionality
 *    from any script included from this point on.
 */
degraded = true;

/**
 * Add a 'degrade' class to the body for CSS rules. Since it only applies
 *    to IE, it uses the IE specific DOM ready event listener to apply
 *    the class to the body tag.
 */
(function() {
    document.attachEvent("onreadystatechange", function() {
        document.getElementsByTagName('body')[0].className = 'degrade';
    });
}());