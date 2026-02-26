(function()
{
    var KEY = "picotag_cookie_consent";
    var banner = document.getElementById("cookieBanner");
    if (!banner) return;

    function setCookie(name, value, days)
    {
        try
        {
            var d = new Date();
            d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
            document.cookie =
                name + "=" + encodeURIComponent(value) + "; expires=" + d.toUTCString() + "; path=/; SameSite=Lax";
        }
        catch (e)
        {}
    }

    function getCookie(name)
    {
        try
        {
            var m = document.cookie.match(
                new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()\[\]\\/\+^])/g, "\$1") + "=([^;]*)"),
            );
            return m ? decodeURIComponent(m[1]) : "";
        }
        catch (e)
        {
            return "";
        }
    }

    function delCookie(name)
    {
        try
        {
            document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax";
            document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
        }
        catch (e)
        {}
    }

    function clearSiteStorage()
    {
        try
        {
            for (var i = localStorage.length - 1; i >= 0; i--)
            {
                var k = localStorage.key(i);
                if (!k) continue;
                if (k.indexOf("picotag_") === 0 && k.indexOf("cookie_consent") < 0)
                {
                    localStorage.removeItem(k);
                }
            }
        }
        catch (e)
        {}
        
        delCookie("picotag_lang");
        delCookie("picotag_new_form");
    }

    try
    {
        banner.style.display = "none";
    }
    catch (e)
    {}
    
    var v = getCookie(KEY);
    
    if (!v)
    {
        try
        {
            v = localStorage.getItem(KEY) || "";
        }
        catch (e)
        {
            v = "";
        }
    }

    if (v === "ok" || v === "rejected")
    {
        banner.remove();
        return;
    }

    try
    {
        banner.classList.add("show");
        banner.style.display = "flex";
        requestAnimationFrame(function()
        {
            banner.classList.add("in");
        });
    }
    catch (e)
    {}

    function hide()
    {
        banner.classList.add("hide");
        setTimeout(function()
        {
            if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
        }, 220);
    }

    var a = document.getElementById("cookieAccept");
    var r = document.getElementById("cookieReject");
    var c = document.getElementById("cookieCancel");

    if (a)
    {
        a.addEventListener("click", function()
        {
            setCookie(KEY, "ok", 365);
            try
            {
                localStorage.setItem(KEY, "ok");
            }
            catch (e)
            {}
            
            try
            {
                if (window.saveFormCookie) window.saveFormCookie();
            }
            catch (e)
            {}
            
            hide();
        });
    }

    if (r)
    {
        r.addEventListener("click", function()
        {
            setCookie(KEY, "rejected", 365);
            try
            {
                localStorage.setItem(KEY, "rejected");
            }
            catch (e)
            {}
            
            clearSiteStorage();
            hide();
        });
    }

    if (c)
    {
        c.addEventListener("click", function()
        {
            setCookie(KEY, "cancel", 30);
            try
            {
                localStorage.setItem(KEY, "cancel");
            }
            catch (e)
            {}
            
            clearSiteStorage();
            hide();
        });
    }
})();

(function()
{
    var el = document.getElementById("date");
    if (!el) return;

    function openPicker()
    {
        try
        {
            if (typeof el.showPicker === "function") el.showPicker();
        }
        catch (e)
        {}
    }
    
    el.addEventListener("click", openPicker);
})();
