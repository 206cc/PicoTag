(function()
{
    function qp(obj)
    {
        const s = new URLSearchParams();
        for (const k in obj)
        {
            if (obj[k] != null) s.set(k, obj[k]);
        }
        const t = s.toString();
        return t ? "?" + t : "";
    }

    function hideNow()
    {
        try
        {
            document.documentElement.style.visibility = "hidden";
        }
        catch (e)
        {}
    }

    function showNow()
    {
        try
        {
            document.documentElement.style.visibility = "visible";
        }
        catch (e)
        {}
    }

    async function check()
    {
        try
        {
            const res = await fetch("/api/admin/me",
            {
                method: "GET",
                credentials: "include"
            });
            if (res.ok) return true;
        }
        catch (e)
        {}
        
        return false;
    }

    function redirectToLogin()
    {
        const here = location.pathname + location.search + location.hash;
        location.replace("access.html" + qp(
        {
            r: here
        }));
    }
    
    hideNow();

    window.__ADMIN_GUARD__ = (async () =>
    {
        const ok = await check();
        if (!ok)
        {
            redirectToLogin();
            return false;
        }
        showNow();
        return true;
    })();
})();
