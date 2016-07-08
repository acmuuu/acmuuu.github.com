// global constants
var gc_iGap = 7;
var gc_iPadding = 10;
var gc_oConverter = new Showdown.converter();

// globals
var g_bEdited = false;
var g_iTimer;
var g_oDimensions = {};
var g_sFilename = "markdown";
var g_sLastLayout = "left";

$(document).ready(function() {
    // position boxes
    Dimensions();
    $("textarea").css({
        "left":   g_oDimensions.lr.leftx,
        "top":    g_oDimensions.lr.y,
        "height": g_oDimensions.lr.height,
        "width":  g_oDimensions.lr.width
    });
    $("#output").css({
        "left":   g_oDimensions.lr.rightx,
        "top":    g_oDimensions.lr.y,
        "height": g_oDimensions.lr.height,
        "width":  g_oDimensions.lr.width
    });

    // update contents
    ConvertNow();
    $("textarea").change(Convert).keyup(Convert).mouseup(Convert);

    // resize
    $(window).resize(function() {
        Layout(g_sLastLayout);
    })

    // load iframe
    $("iframe").attr("src", "load.html");
});

function Convert() {
    clearTimeout(g_iTimer);
    g_bEdited = true;
    g_iTimer = setTimeout("ConvertNow()", 150);
}

function ConvertNow() {
    $("#output").html(gc_oConverter.makeHtml($("textarea").val()));
}

function Dimensions() {
    var iToolbarHeight = 40;
    var iHeight = $("body").height() - iToolbarHeight;
    var iWidth = $("body").width();

    var d = {};
    d.full = {
        x: gc_iGap + "px",
        y: gc_iGap + iToolbarHeight + "px",
        height: iHeight - (gc_iGap * 2) - gc_iPadding + "px",
        width: iWidth - (gc_iGap * 2) - gc_iPadding + "px"
    };

    var iHalfWidth = ((iWidth - gc_iGap) / 2);
    d.lr = {
        leftx: gc_iGap + "px",
        rightx: (iHalfWidth + gc_iGap) + "px",
        y: gc_iGap + iToolbarHeight + "px",
        height: iHeight - (gc_iGap * 2) - gc_iPadding + "px",
        width: (iHalfWidth - gc_iGap - gc_iPadding) + "px"
    };

    var iHalfHeight = ((iHeight - gc_iGap) / 2);
    d.tb = {
        topy: iToolbarHeight + gc_iGap + "px",
        bottomy: iToolbarHeight + iHalfHeight + gc_iGap + "px",
        x: gc_iGap + "px",
        height: iHalfHeight - gc_iGap - gc_iPadding + "px",
        width: iWidth - (gc_iGap * 2) - gc_iPadding + "px"
    };

    g_oDimensions = d;
}

function FileLoad(sText, sName) {
    // load text
    $("textarea").val(sText);
    ConvertNow();
    g_bEdited = false;

    // retrieve name
    var aName = sName.split(".");
    if (aName.length > 1) {
        aName = aName.slice(0, aName.length - 1);
    }
    g_sFilename = aName.join(".").split(" ").join("\ ");
}

function GetHTML() {
    return $("#output").html();
}

function Layout(sLayout) {
    Dimensions();
    switch (sLayout) {
        case "input":
            $("#output").hide();
            $("textarea").css({
                "left":   g_oDimensions.full.x,
                "top":    g_oDimensions.full.y,
                "height": g_oDimensions.full.height,
                "width":  g_oDimensions.full.width
            }).show();
            break;
        case "output":
            $("textarea").hide();
            $("#output").css({
                "left":   g_oDimensions.full.x,
                "top":    g_oDimensions.full.y,
                "height": g_oDimensions.full.height,
                "width":  g_oDimensions.full.width
            }).show();
            break;

        case "left":
            $("textarea").css({
                "left":   g_oDimensions.lr.leftx,
                "top":    g_oDimensions.lr.y,
                "height": g_oDimensions.lr.height,
                "width":  g_oDimensions.lr.width
            }).show();
            $("#output").css({
                "left":   g_oDimensions.lr.rightx,
                "top":    g_oDimensions.lr.y,
                "height": g_oDimensions.lr.height,
                "width":  g_oDimensions.lr.width
            }).show();
            break;
        case "right":
            $("textarea").css({
                "left":   g_oDimensions.lr.rightx,
                "top":    g_oDimensions.lr.y,
                "height": g_oDimensions.lr.height,
                "width":  g_oDimensions.lr.width
            }).show();
            $("#output").css({
                "left":   g_oDimensions.lr.leftx,
                "top":    g_oDimensions.lr.y,
                "height": g_oDimensions.lr.height,
                "width":  g_oDimensions.lr.width
            }).show();
            break;

        case "top":
            $("textarea").css({
                "left":   g_oDimensions.tb.x,
                "top":    g_oDimensions.tb.topy,
                "height": g_oDimensions.tb.height,
                "width":  g_oDimensions.tb.width
            }).show();
            $("#output").css({
                "left":   g_oDimensions.tb.x,
                "top":    g_oDimensions.tb.bottomy,
                "height": g_oDimensions.tb.height,
                "width":  g_oDimensions.tb.width
            }).show();
            break;
        case "bottom":
            $("textarea").css({
                "left":   g_oDimensions.tb.x,
                "top":    g_oDimensions.tb.bottomy,
                "height": g_oDimensions.tb.height,
                "width":  g_oDimensions.tb.width
            }).show();
            $("#output").css({
                "left":   g_oDimensions.tb.x,
                "top":    g_oDimensions.tb.topy,
                "height": g_oDimensions.tb.height,
                "width":  g_oDimensions.tb.width
            }).show();
            break;
    }

    g_sLastLayout = sLayout;
}

function New() {
    // confirm edits can be made
    if (g_bEdited == true) {
        g_bEdited = confirm("If you create a new file you'll lose the edits you've made. Are you sure you want to proceed?");
        g_bEdited = !g_bEdited;
    }

    // no edits? proceed
    if (g_bEdited != true) {
        g_sFilename = "markdown";
        $("textarea").val("");
        $("#output").text("");
    }
}

function Print() {
    /*
    $("#output").css({ "left": 0, "top": 0, "width": "100%" });
    window.print();
    Layout(g_sLastLayout);
    */

    o = window.open("print.html","printer","left=20,top=20,width=200,height=200,toolbar=0,resizable=0");
}

function Save(bHTML) {
    if (bHTML == true) {
        var sContent = $("#output").html();
        if (sContent.length > 0) {
            $("input[name=content]").val(sContent);
            $("input[name=name]").val(g_sFilename);
            $("input[name=type]").val("html");
        }
    } else {
        var sContent = $("textarea").val();
        if (sContent.length > 0) {
            $("input[name=content]").val(sContent);
            $("input[name=name]").val(g_sFilename);
            $("input[name=type]").val("txt");
        }
    }
    if (sContent.length > 0) {
        $("#saveform").submit();
    } else {
        alert("There is nothing to save.");
    }
}