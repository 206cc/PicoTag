(function()
{
    window.API_BASE = window.PICOTAG_API_BASE || "";

    function alertApiBaseErrorOnce()
    {
        if (window.__PICOTAG_API_BASE_ALERTED) return;
        window.__PICOTAG_API_BASE_ALERTED = true;
        alert("API_BASE Error");
    }

    async function initApiBase()
    {
        if (window.API_BASE && String(window.API_BASE).trim()) return;

        try
        {
            const resp = await fetch("/api/config/public",
            {
                cache: "no-store"
            });
            if (!resp.ok) throw new Error("config fetch failed");
            const cfg = await resp.json();

            const base = String((cfg && cfg.defaultApiBase) || "").trim();

            if (!base)
            {
                window.API_BASE = "";
                return;
            }

            try
            {
                const u = new URL(base, location.origin);
                if (u.origin !== location.origin)
                {
                    window.API_BASE = "";
                    return;
                }

                window.API_BASE = u.origin;
                return;
            }
            catch (e)
            {

                window.API_BASE = "";
                return;
            }
        }
        catch (e)
        {
            window.API_BASE = "";
            alertApiBaseErrorOnce();
        }
    }

    window.apiReady = initApiBase();

    window.api = window.api || {};

    window.api.buildUrl = function(path)
    {
        const baseRaw = String(window.API_BASE || "").trim();

        const p = String(path || "").replace(/^\/+/, "");
        if (!baseRaw) return "/" + p;

        const base = baseRaw.replace(/\/+$/, "");
        return base + "/" + p;
    };

    function shouldIncludeCredentials(path)
    {
        const p = String(path || "").replace(/^\/+/, "");
        return p.startsWith("api/admin/") || p === "api/admin";
    }

    window.api.fetchJSON = async function(path, opts)
    {
        try
        {
            if (window.apiReady)
            {
                await window.apiReady;
            }
        }
        catch (e)
        {}
        
        const url = window.api.buildUrl(path);
        const defaultCreds = shouldIncludeCredentials(path) ? "include" : "omit";
        const resp = await fetch(url, Object.assign(
        {
            method: "GET",
            credentials: defaultCreds
        }, opts || {}));
        if (!resp.ok)
        {
            let text = "";
            try
            {
                text = await resp.text();
            }
            catch (e)
            {}
            
            const err = new Error("HTTP " + resp.status + " " + resp.statusText);
            err.status = resp.status;
            err.body = text;
            throw err;
        }
        return await resp.json();
    };

})();
