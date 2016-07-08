(function($){
    $.fn.lazyload = function(options){
        var opts = $.extend($.fn.lazyload.defaults, options);
        var elements = this;

        $(window).bind('scroll', function(e){
            loadAboveTheFoldImages(elements, opts);
        });

        loadAboveTheFoldImages(elements, opts);

        return this;
    };
    
    $.fn.lazyload.defaults = {threshold: 0};

    function aboveTheFold(element, options){
        var fold = $(window).height() + $(window).scrollTop();
        return fold >= $(element).offset().top - (options['threshold']);
    };

    function loadOriginalImage(element){
        $(element).attr('src', $(element).attr('original-src')).removeAttr('original-src');
    };

    function loadAboveTheFoldImages(elements, options){
        elements.each(function(){
            if (aboveTheFold(this, options) && ($(this).attr('original-src'))){
                loadOriginalImage(this);
            }
        });
    };
})(jQuery);