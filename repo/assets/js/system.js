(function()
{
    function tr(key, fallback)
    {
        try
        {
            var v = window.i18n && typeof window.i18n.t === "function" ? (window.i18n.t(key) || "") : "";
            
            return (v && String(v).trim() !== "") ? v : (fallback || "");
        }
        catch (e)
        {
            return fallback || "";
        }
    }

    function setText(id, val)
    {
        var el = document.getElementById(id);
        
        if (!el) return;
        
        el.textContent = val === undefined || val === null || val === "" ? "—" : String(val);
    }

    function pick(obj, keys)
    {
        if (!obj) return "";
        
        for (var i = 0; i < keys.length; i++)
        {
            var k = keys[i];
            
            if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== "") return String(obj[k]).trim();
        }
        
        return "";
    }

    function langDisplay(code)
    {
        var c = String(code || "").trim();
        
        if (!c) return "";

        var supported = {
            da: true,
            de: true,
            en: true,
            fil: true,
            fr: true,
            hi: true,
            id: true,
            ja: true,
            ko: true,
            ms: true,
            ta: true,
            th: true,
            vi: true,
            "zh-cn": true,
            "zh-tw": true,
        };

        var lc = c.toLowerCase();

        if (lc === "zh-hant" || lc.indexOf("zh-hant-") === 0 || lc === "zh") lc = "zh-tw";
        if (lc === "zh-hans" || lc.indexOf("zh-hans-") === 0) lc = "zh-cn";
        if (lc === "zh-tw") lc = "zh-tw";
        if (lc === "zh-cn") lc = "zh-cn";
        if (!supported[lc]) return c + " (unknown)";

        var name = "";
        try
        {
            if (lc === "zh-tw") name = "Traditional Chinese";
            
            else if (lc === "zh-cn") name = "Simplified Chinese";
            else if (typeof Intl !== "undefined" && Intl.DisplayNames)
            {
                var dn = new Intl.DisplayNames(["en"],
                {
                    type: "language"
                });
                name = dn.of(c) || "";
                if (name && String(name).toLowerCase() === c.toLowerCase()) name = "";
            }
        }
        catch (_)
        {}
        
        if (!name)
        {
            var m = {
                en: "English",
                ja: "Japanese",
                ko: "Korean",
                fr: "French",
                de: "German",
                da: "Danish",
                vi: "Vietnamese",
                th: "Thai",
                id: "Indonesian",
                ms: "Malay",
                fil: "Filipino",
                hi: "Hindi",
                ta: "Tamil",
                "zh-TW": "Traditional Chinese",
                "zh-CN": "Simplified Chinese",
            };
            name = m[c] || "";
        }
        return name ? c + " (" + name + ")" : c + " (unknown)";
    }

    function maskKey(k)
    {
        if (!k) return "—";
        
        var s = String(k);
        
        if (s.length <= 8) return s;
        
        var head = s.slice(0, 6);
        var tail = s.slice(-4);
        var midLen = Math.max(2, s.length - (head.length + tail.length));
        var stars = "*".repeat(Math.min(12, midLen));
        
        return head + stars + tail;
    }
    
    async function loadVersion()
    {
        try
        {
            var res = await fetch("../assets/version.json",
            {
                cache: "no-store"
            });
            
            if (!res.ok) throw new Error("version.json " + res.status);
            
            var v = await res.json();
            setText("appVersion", v.version);
            setText("buildTime", v.buildTime);
        }
        catch (e)
        {}
    }

    async function loadPublicConfig()
    {
        try
        {
            var res = await fetch("/api/config/public",
            {
                cache: "no-store"
            });
            
            if (!res.ok) throw new Error("config/public " + res.status);
            
            var cfg = await res.json();
            var base = pick(cfg, ["defaultApiBase", "apiBase", "API_BASE", "default_api_base"]);
            var lang = pick(cfg, ["defaultLang", "DEFAULT_LANG", "lang", "LANG", "default_lang"]);
            var origin = pick(cfg, [
                "appOrigin",
                "APP_ORIGIN",
                "origin",
                "APP_ORIGIN_URL",
                "app_origin",
                "app_origin_url",
            ]);
            
            if (origin) setText("appOrigin", origin);
            
            setText("defaultApiBase", base ? base : "(same-origin)");
            
            if (lang) setText("defaultLang", langDisplay(lang));
        }
        catch (e)
        {}
    }
    async function loadSystem()
    {
        try
        {
            var res = await fetch("../api/admin/system-info",
            {
                cache: "no-store"
            });
            
            if (!res.ok) throw new Error("system-info " + res.status);
            
            var data = await res.json();
            
            if (data.kvCounts)
            {
                function fillKv(listId)
                {
                    var rows = document.querySelectorAll("#" + listId + " .sysRow");
                    
                    rows.forEach(function(r)
                    {
                        var k = r.querySelector(".sysKey");
                        var v = r.querySelector(".sysVal .mono");
                        if (!k || !v) return;
                        var name = k.textContent.trim();
                        if (data.kvCounts[name] !== undefined) v.textContent = String(data.kvCounts[name]);
                    });
                }
                fillKv("kvListOther");
                fillKv("kvListBadminton");
                fillKv("kvListTennis");
            }

            if (Array.isArray(data.d1Tables))
            {
                var wrap = document.getElementById("d1Tables");
                
                if (wrap)
                {
                    wrap.innerHTML = "";
                    data.d1Tables.forEach(function(t)
                    {
                        var row = document.createElement("div");
                        row.className = "sysRow";
                        row.innerHTML =
                            '<div class="sysKey"></div><div class="sysVal"><span class="mono"></span></div>';
                        row.querySelector(".sysKey").textContent = t.name || "—";
                        row.querySelector(".mono").textContent =
                            t.rows === undefined || t.rows === null ? "—" : String(t.rows);
                        wrap.appendChild(row);
                    });
                }
            }

            (function()
            {
                var area = document.getElementById("initDbArea");
                var btn = document.getElementById("btnInitDb");
                
                if (!area || !btn) return;
                
                var hasRecords = false;
                
                if (Array.isArray(data && data.d1Tables))
                {
                    hasRecords = data.d1Tables.some(function(x)
                    {
                        return String(x && x.name || "").toLowerCase() === "records" && (x.exists === undefined || x.exists === true);
                    });
                }
                
                area.style.display = hasRecords ? "none" : "";
                
                if (hasRecords) return;

                btn.onclick = async function()
                {
                    btn.disabled = true;
                    var old = btn.textContent;
                    btn.textContent = tr("admin_system_init_db_creating", "Creating...");
                    try
                    {
                        var r = await fetch("/api/admin/d1/init",
                        {
                            method: "POST",
                            credentials: "include"
                        });
                        
                        var ct = (r.headers.get("Content-Type") || "").toLowerCase();
                        var j = ct.includes("application/json") ? await r.json().catch(function()
                        {
                            return null;
                        }) : null;
                        
                        if (!r.ok) throw new Error((j && j.error) ? j.error : ("HTTP " + r.status));

                        await loadSystem();
                    }
                    catch (e)
                    {
                        alert(e && e.message ? e.message : "Init failed");
                    }
                    finally
                    {
                        btn.disabled = false;
                        btn.textContent = old || tr("admin_system_init_db_btn", "Initialize Database");
                    }
                };
            })();

            if (data)
            {
                if (data.appOrigin || data.APP_ORIGIN || data.origin || data.app_origin)
                    setText("appOrigin", data.appOrigin || data.APP_ORIGIN || data.origin || data.app_origin);
                
                if (data.defaultApiBase || data.apiBase || data.API_BASE)
                    setText("defaultApiBase", data.defaultApiBase || data.apiBase || data.API_BASE);
                
                if (data.defaultLang || data.DEFAULT_LANG)
                    setText("defaultLang", langDisplay(data.defaultLang || data.DEFAULT_LANG));
            }
            setText("turnstileSiteKey", maskKey(data.turnstileSiteKey));
        }
        catch (e)
        {}
    }

    function setMsg(id, text)
    {
        var el = document.getElementById(id);
        
        if (!el) return;
        
        el.textContent = text || "";
    }

    function _hideStatus(el)
    {
        try
        {
            if (!el) return;
            
            el.classList.remove("show");
            
            setTimeout(function()
            {
                el.style.display = "none";
            }, 220);
        }
        catch (_)
        {}
    }

    function setStatus(ok, msg)
    {
        var okEl = document.getElementById("statusOk");
        var errEl = document.getElementById("statusErr");
        
        if (!okEl || !errEl) return false;
        
        okEl.classList.remove("show");
        errEl.classList.remove("show");
        var el = ok ? okEl : errEl;
        el.textContent = String(msg || "");
        el.style.display = "block";
        
        requestAnimationFrame(function()
        {
            el.classList.add("show");
        });
        
        clearTimeout(setStatus._tm);
        
        setStatus._tm = setTimeout(function()
        {
            _hideStatus(el);
        }, 1800);
        return true;
    }

    function toast(msg, ok)
    {
        setStatus(!!ok, msg);
    }

    var currentRateLimitVal = 0;

    function buildRateLimitRadios(val)
    {
        var wrap = document.getElementById("rlOptions");
        
        if (!wrap) return;
        
        var tNoLimit = tr("admin_system_no_limit", "No limit");
        var tMin = tr("admin_system_min", "min");
        var opts = [
        {
            v: 0,
            t: "0 (" + tNoLimit + ")"
        },
        {
            v: 10,
            t: "10/" + tMin
        },
        {
            v: 30,
            t: "30/" + tMin
        },
        {
            v: 60,
            t: "60/" + tMin
        }, ];
        
        wrap.innerHTML = "";
        opts.forEach(function(o)
        {
            var id = "rl_" + o.v;
            var lab = document.createElement("label");
            var inp = document.createElement("input");
            inp.type = "radio";
            inp.name = "publicGetRateLimit";
            inp.value = String(o.v);
            inp.id = id;
            inp.checked = String(val) === String(o.v);
            lab.appendChild(inp);
            var span = document.createElement("span");
            span.textContent = o.t;
            lab.appendChild(span);
            wrap.appendChild(lab);
        });
    }

    function getSelectedRateLimit()
    {
        var el = document.querySelector('input[name="publicGetRateLimit"]:checked');
        
        if (!el) return 0;
        
        var v = parseInt(el.value, 10);
        return Number.isFinite(v) ? v : 0;
    }

    async function loadSecurity()
    {
        try
        {
            var res = await fetch("../api/admin/security",
            {
                cache: "no-store",
                credentials: "include"
            });
            
            if (!res.ok) throw new Error("security " + res.status);
            
            var data = await res.json();
            var v = parseInt(data && data.publicGetRateLimit, 10);
            
            if (!Number.isFinite(v)) v = 10;
            
            currentRateLimitVal = v;
            buildRateLimitRadios(v);
        }
        catch (e)
        {
            currentRateLimitVal = 10;
            buildRateLimitRadios(10);
        }
    }

    function wireSecuritySave()
    {
        var btn = document.getElementById("btnSaveSecurity");
        
        if (!btn) return;
        
        btn.onclick = async function()
        {
            btn.disabled = true;
            setLoading(true, window.i18n && typeof window.i18n.t === "function" ? (window.i18n.t("admin_site_saving") || window.i18n.t("msg_loading") || "") : "");
            
            try
            {
                var v = getSelectedRateLimit();
                var r = await fetch("/api/admin/security",
                {
                    method: "POST",
                    credentials: "include",
                    headers:
                    {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(
                    {
                        publicGetRateLimit: v
                    }),
                });
                
                var ct = (r.headers.get("Content-Type") || "").toLowerCase();
                var j = ct.includes("application/json") ? await r.json().catch(function()
                {
                    return null;
                }) : null;
                
                if (!r.ok) throw new Error((j && j.error) ? j.error : ("HTTP " + r.status));
                
                toast(tr("admin_site_saved", "Saved."), true);
                
                await loadSecurity();
            }
            catch (e)
            {
                toast(e && e.message ? e.message : tr("msg_save_failed", "Save failed"), false);
            }
            finally
            {
                btn.disabled = false;
                setLoading(false);
            }
        };
    }

    function setLoading(on, text)
    {
        var ov = document.getElementById("loadingOverlay");
        
        if (ov)
        {
            ov.classList.toggle("isOpen", !!on);
            ov.setAttribute("aria-hidden", on ? "false" : "true");
        }
        
        var lt = document.getElementById("loadingText");
        
        if (lt)
        {
            var msg = String(text || "");
            
            if (!msg) msg = window.i18n && typeof window.i18n.t === "function" ? window.i18n.t("msg_loading") || "" : "";
            
            lt.textContent = msg || "Loading";
        }
    }

    function finalizeEnvDisplays()
    {
        try
        {
            var el = document.getElementById("appOrigin");
            if (el && (el.textContent === "—" || el.textContent === "-" || el.textContent.trim() === ""))
            {
                el.textContent = window.location.origin;
            }
        }
        catch (_)
        {}
    }

    function setLicenseLink()
    {
        try
        {
            var a = document.getElementById("licenseLink");
            
            if (!a) return;
            
            var url = (window.location && window.location.origin ? window.location.origin : "") + "/LICENSE.txt";
            
            if (!url || url === "/LICENSE.txt") return;
            
            a.href = url;
            a.textContent = url;
            a.target = "_blank";
            a.rel = "noopener";
        }
        catch (_)
        {}
    }

    document.addEventListener("DOMContentLoaded", async function()
    {
        try
        {
            if (window.__ADMIN_GUARD__ && !(await window.__ADMIN_GUARD__)) return;
        }
        catch (_)
        {}

        setLicenseLink();

        wireSecuritySave();

        document.addEventListener("i18n:changed", function()
        {
            try
            {
                var v = currentRateLimitVal;
                var el = document.querySelector('input[name="publicGetRateLimit"]:checked');
                if (el)
                {
                    var pv = parseInt(el.value, 10);
                    if (Number.isFinite(pv)) v = pv;
                }
                buildRateLimitRadios(v);
            }
            catch (e)
            {}
        });

        setLoading(true);
        
        await Promise.allSettled([loadVersion(), loadPublicConfig(), loadSystem(), loadSecurity()]);
        
        setLoading(false);
        setTimeout(finalizeEnvDisplays, 200);
    });
})();
