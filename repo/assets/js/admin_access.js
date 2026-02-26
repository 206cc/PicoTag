(function()
{
    try
    {
        document.documentElement.style.visibility = "visible";
    }
    catch (e)
    {}
    const $ = (id) => document.getElementById(id);

    const state = {
        rendered: false,
        widgetId: null
    };

    function t(key, fallback)
    {
        try
        {
            if (window.i18n && typeof window.i18n.t === "function")
            {
                const v = window.i18n.t(key);
                if (v && v !== key) return v;
            }
        }
        catch (e)
        {}
        return fallback || key;
    }

    function setMsg(text, kind)
    {
        const el = $("msg");
        if (!el) return;
        el.textContent = text || "";
        el.className = "msg" + (kind ? " " + kind : "");
    }

    function waitForTurnstile(timeoutMs = 8000)
    {
        return new Promise((resolve, reject) =>
        {
            const t0 = Date.now();
            (function tick()
            {
                if (window.turnstile && typeof window.turnstile.render === "function") return resolve();
                if (Date.now() - t0 > timeoutMs) return reject(new Error("turnstile not ready"));
                setTimeout(tick, 50);
            })();
        });
    }

    async function initTurnstile()
    {
        const el = document.querySelector(".cf-turnstile");
        if (!el) return;

        let cfg = null;
        try
        {
            const r = await fetch("/api/config/public",
            {
                method: "GET",
                cache: "no-store"
            });
            cfg = await r.json();
        }
        catch (e)
        {}

        const key = cfg && cfg.turnstileSiteKey ? String(cfg.turnstileSiteKey).trim() : "";
        if (!key) return;

        if (state.rendered) return;
        state.rendered = true;

        el.dataset.sitekey = key;
        try
        {
            el.innerHTML = "";
        }
        catch (e)
        {}

        try
        {
            await waitForTurnstile();
            try
            {
                state.widgetId = window.turnstile.render(el);
            }
            catch (e)
            {}
        }
        catch (e)
        {
            state.rendered = false;
        }
    }

    function getTurnstileToken()
    {
        const el = document.querySelector('[name="cf-turnstile-response"]');
        return el ? String(el.value || "").trim() : "";
    }

    function resetTurnstile()
    {
        try
        {
            if (window.turnstile)
            {
                if (state.widgetId != null) window.turnstile.reset(state.widgetId);
                else window.turnstile.reset();
            }
        }
        catch (e)
        {}
    }

    function safeReturnTarget(raw)
    {
        if (!raw) return "/admin/system.html";
        let s = String(raw);

        try
        {
            s = decodeURIComponent(s);
        }
        catch (e)
        {}

        if (s.includes("://") || s.startsWith("//") || s.includes("\\") || s.includes("\0"))
            return "/admin/system.html";

        if (s.startsWith("/admin/")) return s;

        return "/admin/system.html";
    }

    async function doLogin()
    {
        const pw = String(($("pw") && $("pw").value) || "").trim();
        const ts = getTurnstileToken();

        if (!ts)
        {
            setMsg(t("admin_access_err_turnstile", "Please complete the Turnstile challenge."), "err");
            return;
        }
        if (!pw)
        {
            setMsg(t("admin_access_err_password", "Please enter the admin password."), "err");
            return;
        }

        setMsg(t("admin_access_verifying", "Verifying..."), "busy");

        try
        {
            const res = await fetch("/api/admin/login",
            {
                method: "POST",
                headers:
                {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify(
                {
                    password: pw,
                    turnstile: ts
                }),
            });

            if (res.ok)
            {
                setMsg(t("admin_access_signed_in", "Signed in. Redirecting..."), "ok");
                const url = new URL(location.href);
                const r = url.searchParams.get("r") || "";
                const target = safeReturnTarget(r);

                location.replace(target);
                return;
            }

            let msg = t("admin_access_failed", "Verification failed.");
            try
            {
                const j = await res.json();
                if (j)
                {
                    if (j.errorKey) msg = t(String(j.errorKey), j.error || msg);
                    else if (j.error) msg = String(j.error);
                }
            }
            catch (e)
            {}
            
            setMsg(msg, "err");
            resetTurnstile();
        }
        catch (e)
        {
            setMsg(t("admin_access_connection_failed", "Connection failed. Please try again later."), "err");
            resetTurnstile();
        }
    }

    function wire()
    {
        const btn = $("btn");
        const pw = $("pw");
        if (btn)
        {
            btn.addEventListener("click", (e) =>
            {
                e.preventDefault();
                doLogin();
            });
        }
        if (pw)
        {
            pw.addEventListener("keydown", (e) =>
            {
                if (e.key === "Enter")
                {
                    e.preventDefault();
                    doLogin();
                }
            });
        }
    }

    async function boot()
    {
        try
        {
            const me = await fetch("/api/admin/me",
            {
                method: "GET",
                credentials: "include"
            });
            if (me.ok)
            {
                location.replace("system.html");
                return;
            }
        }
        catch (e)
        {}

        wire();
        await initTurnstile();
    }

    document.addEventListener("DOMContentLoaded", () =>
    {
        boot();
    });
})();
