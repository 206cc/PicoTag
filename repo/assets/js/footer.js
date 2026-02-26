(function()
{
    function syncFooterPad()
    {
        var f = document.querySelector("footer");
        if (!f) return;
        var h = Math.ceil(f.getBoundingClientRect().height || f.offsetHeight || 0);
        document.documentElement.style.setProperty("--footerH", h + "px");
    }
    
    var t = null;

    function onResize()
    {
        if (t) clearTimeout(t);
        t = setTimeout(syncFooterPad, 60);
    }
    
    window.addEventListener("load", syncFooterPad,
    {
        once: true
    });
    
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    syncFooterPad();
})();
