(function($) {
  //
  // Code manipulators
  //

  function minify(code) {
    // very simple minification (and not overly aggressive on whitespace)
    code = code.split(/\r\n|\r|\n/g);
    var i = 0,
      len = code.length,
      noSemiColon = {},
      t,
      lastChar;

    $.each("} { ; ,".split(" "), function(i, x) {
      noSemiColon[x] = 1;
    });

    for (; i < len; i++) {
      // note: this doesn't support multi-line strings with slashes
      t = $.trim(code[i]);

      // this breaks when I put turnaries on multiple lines -- I'll leave it up
      // to the bookmarklet writers to do semi-colons properly
      // if (t) {
      //     // add semi-colon if we should
      //     if (!noSemiColon[t.charAt(t.length-1)]) {
      //         t += ';';
      //     }

      //     // prevent the inadvertently calling a function scenario
      //     if (i!=0 && t && t.substr(0, 1)=='(' && code[i-1].charAt(code[i-1].length-1)!=';') {
      //         t = ';' + t;
      //     }
      // }
      code[i] = t;
    }
    return code.join("").replace(/;$/, "");
  }

  function scriptLoader(code, path, isJQuery) {
    return (
      "" +
      "function callback(){" +
      (isJQuery ? "(function($){var jQuery=$;" : "") +
      code +
      (isJQuery ? "})(jQuery.noConflict(true))" : "") +
      "}" +
      'var s=document.createElement("script");' +
      's.src="' +
      path +
      '";' +
      "if(s.addEventListener){" +
      's.addEventListener("load",callback,false)' +
      "}else if(s.readyState){" +
      "s.onreadystatechange=callback" +
      "}" +
      "document.body.appendChild(s);"
    );
  }

  function asBookmarklet(code, jQueryPath, customPath) {
    code = minify(code);

    if (customPath) {
      code = scriptLoader(code, customPath, false);
    }

    if (jQueryPath) {
      code = scriptLoader(code, jQueryPath, true);
    }

    code = "(function(){" + code + "})()";
    return "javascript:" + encodeURIComponent(code);
  }

  //
  // Event handlers
  //

  $("#bk-custom").change(function() {
    if ($(this).prop("checked")) {
      $("#bk-custom-url").focus();
    }
  });

  $("#bk-custom-url").change(function() {
    $("#bk-custom").prop("checked", $(this).val().length > 0);
  });

  $("#bk-form").submit(function(evt) {
    evt.preventDefault();
    var $code = $("#bk-code"),
      $wrap = $("#bk-results"),
      code = $code.val(),
      jQueryPath = $("#bk-jquery").prop("checked")
        ? $("#bk-jquery").data("jquery-url")
        : "",
      customPath = $("#bk-custom").prop("checked")
        ? $("#bk-custom-url").val()
        : "",
      $result;

    if (!$.trim(code)) {
      alert(
        "Please enter some code first, so I can hand craft it as a glorious bookmarklet!"
      );
      return;
    }

    code = asBookmarklet(code, jQueryPath, customPath);

    $result = $("<div>", { class: "result" })
      .append(
        $("<p>", {
          html:
            "<em>生成完毕！</em>&nbsp; 你可以<code style='color: red;'>点击右边的按钮试运行</code>或者<code style='color: red;'>拖拽右边的按钮到书签栏之后到具体的页面点击试运行</code>： "
        })
          .append(
            $("<a/>", {
              class: "bookmarklet",
              href: code,
              text: $("#bk-name").val() || "this link"
            })
          )
          .append("<br><br>转换后的书签脚本如下：")
      )
      .append($("<textarea>", { text: code }));

    // silly animation
    $wrap
      .children()
      .stop(true, true)
      .filter(":gt(1)")
      .remove();
    $oldResult = $wrap.children().css({ position: "relative", left: 0 });

    var oldHeight = $wrap.height();
    $oldResult.hide();
    $result.appendTo($wrap);
    var newHeight = $wrap.height();
    var width = $wrap.width() + 30;
    $wrap.height(Math.max(oldHeight, newHeight));
    $oldResult.css({ position: "absolute", left: 0 }).show();
    $result.css({ position: "absolute", left: -width + "px" });

    $oldResult.add($result).animate(
      {
        left: "+=" + width
      },
      1200,
      function() {
        $oldResult.remove();
        $result.css({ position: "relative", left: 0 });
        $wrap.height("auto");
      }
    );
  });

  //
  // cornify option
  //

  function delayer(cb, delay) {
    // This creates a bunch of syntactic sugar to allow chaining of delayed actions
    // in a more linear way. The current design unfortunately doesn't properly
    // support chaining 2 different things on 1 delayer result.

    function helper(data) {
      var nextData = { ready: false };
      function execute() {
        data.cb(); // put this before timeout or in timeout?
        window.setTimeout(function() {
          nextData.ready = true;
          if (nextData.execute) {
            nextData.execute();
          }
        }, data.delay || 1000);
      }

      if (data.ready) {
        execute();
      } else {
        data.execute = execute;
      }

      return {
        delayer: function(cb, delay) {
          nextData.cb = cb;
          nextData.delay = delay;
          return helper(nextData);
        }
      };
    }
    return helper({
      cb: cb,
      delay: delay,
      ready: true
    });
  }

  $(function() {
    $("#corn-link").click(function(evt) {
      evt.preventDefault();
      var code = $("#corn-code").text(),
        script = $("#corn-script").text();

      $("#bk-code").val("");
      $("#bk-custom-url").val("");
      $("#bk-jquery").prop("checked", false);

      $("html,body").animate(
        {
          scrollTop: $("#bk-form").offset().top - 20
        },
        1000,
        function() {
          var focusDelay = 700,
            valDelay = 1800,
            clearDelay = 400;
          delayer(function() {
            // code - focus state
            $("#bk-code").addClass("focus");
          }, focusDelay)
            .delayer(function() {
              // code - set value
              $("#bk-code").val(code);
            }, valDelay)
            .delayer(function() {
              // code - clear focus
              $("#bk-code").removeClass("focus");
            }, clearDelay)
            .delayer(function() {
              // url - focus state
              $("#bk-custom-url").addClass("focus");
            }, focusDelay)
            .delayer(function() {
              // url - set value
              $("#bk-custom").prop("checked", true);
              $("#bk-custom-url").val(script);
            }, valDelay)
            .delayer(function() {
              // url - clear focus
              $("#bk-custom-url").removeClass("focus");
            }, clearDelay)
            .delayer(function() {
              // submit - focus state
              $("#bk-form")
                .find("button")
                .addClass("focus");
            }, valDelay)
            .delayer(function() {
              // submit - go and clear
              $("#bk-form")
                .submit()
                .find("button")
                .removeClass("focus");
            }, valDelay);
        }
      );
    });
  });
})(jQuery); //.noConflict(true));
