(function()
{
    function ready(fn)
    {
        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
        else fn();
    }

    function guessPath()
    {
        var p = location.pathname || "/";
        
        if (p.indexOf("/new/") !== -1 || p.indexOf("/admin/") !== -1) return "../assets/version.json";
        
        return "assets/version.json";
    }

    function isAdmin()
    {
        return (location.pathname || "").indexOf("/admin/") !== -1;
    }

    function formatBuild(bt)
    {
        bt = String(bt || "");

        if (bt.length >= 16 && bt.indexOf("T") !== -1)
        {
            var d = bt.slice(0, 10);
            var t = bt.slice(11, 16);
            if (/\d{4}-\d{2}-\d{2}/.test(d) && /\d{2}:\d{2}/.test(t)) return d + " " + t;
        }

        try
        {
            var dt = new Date(bt);
            
            if (!isNaN(dt.getTime()))
            {
                var y = dt.getFullYear();
                var m = String(dt.getMonth() + 1).padStart(2, "0");
                var da = String(dt.getDate()).padStart(2, "0");
                var hh = String(dt.getHours()).padStart(2, "0");
                var mm = String(dt.getMinutes()).padStart(2, "0");
                return y + "-" + m + "-" + da + " " + hh + ":" + mm;
            }
        }
        catch (e)
        {}
        
        return "";
    }
    async function run()
    {
        var nodes = document.querySelectorAll("[data-version-badge]");
        
        if (!nodes || !nodes.length) return;
        
        try
        {
            var res = await fetch(guessPath(),
            {
                cache: "no-store"
            });
            
            if (!res.ok) throw new Error("bad_status");
            
            var data = await res.json();
            var v = data && data.version ? String(data.version) : "";
            
            if (!v) return;

            var text = v;
            
            if (isAdmin())
            {
                var bt = formatBuild(data && data.buildTime);
                if (bt) text = v + " · Build: " + bt;
            }

            for (var i = 0; i < nodes.length; i++)
            {
                nodes[i].textContent = text;
            }
        }
        catch (e)
        {}
    }
    ready(run);
})();
