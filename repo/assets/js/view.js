async function loadAndApplySiteConfig()
{
    try
    {
        const r = await fetch("/api/site",
        {
            cache: "no-store"
        });
        
        if (!r.ok) return;
        
        const cfg = await r.json();
        const brandEl = document.querySelector(".brandName");
        
        if (brandEl && cfg && cfg.brandName) brandEl.textContent = String(cfg.brandName);

        const tEl = document.getElementById("introTitle");
        
        if (tEl && cfg && cfg.introTitle) tEl.textContent = String(cfg.introTitle);

        const xEl = document.getElementById("introText");
        
        if (xEl && cfg && cfg.introText) xEl.textContent = String(cfg.introText);
        
        const img = document.getElementById("introMediaImg");
        
        if (img)
        {
            const url = (cfg && cfg.introMediaUrl) ? String(cfg.introMediaUrl).trim() : "";
            const fallback = String(img.getAttribute("data-default-src") || "").trim();
            img.src = url ? url : fallback;
            
            try
            {
                img.classList.remove("u-hidden");
            }
            catch (_)
            {}
            
            img.style.display = "";
        }
        {
            const bgUrl = (cfg && cfg.bgImageUrl) ? String(cfg.bgImageUrl).trim() : "";
            const fallback = getComputedStyle(document.documentElement).getPropertyValue("--site-bg-image-default").trim();
            const chosen = bgUrl ? `url("${bgUrl}")` : (fallback || "none");
            document.documentElement.style.setProperty("--site-bg-image", chosen);
        }
        
        const fEl = document.getElementById("footerLinksArea");
        
        if (fEl)
        {
            const html = (cfg && cfg.footerLinksHtml) ? String(cfg.footerLinksHtml) : "";

            if (html && html.trim()) fEl.innerHTML = html;
            else fEl.textContent = "Footer links";
        }
    }
    catch (_)
    {}
}

window.loadAndApplySiteConfig = loadAndApplySiteConfig;

document.addEventListener("DOMContentLoaded", () =>
{
    window.loadAndApplySiteConfig && window.loadAndApplySiteConfig();
});

function _pickQrMaker(data)
{
    try
    {
        var sp = (data && data.sport ? String(data.sport) : "").trim().toLowerCase();
        
        if (!sp) sp = "badminton";
        if (sp === "tennis")
        {
            if (typeof makeQRTennis === "function") return makeQRTennis;
            if (window.PicoTagQR && typeof window.PicoTagQR.makeQRTennis === "function")
                return window.PicoTagQR.makeQRTennis;
        }
    }
    catch (e)
    {}
    
    if (typeof makeQR === "function") return makeQR;
    if (window.PicoTagQR && typeof window.PicoTagQR.makeQR === "function") return window.PicoTagQR.makeQR;
    
    return function() {};
}

function _showModal(title, body, onOk)
{
    var m = $("modal");
    
    if (!m) return;
    
    $("modalTitle").textContent = title || "";
    $("modalBody").textContent = body || "";
    document.documentElement.classList.add("view-locked");
    m.style.display = "flex";
    m.setAttribute("aria-hidden", "false");
    var done = false;

    function close()
    {
        if (done) return;
        
        done = true;
        document.documentElement.classList.remove("view-locked");
        m.style.display = "none";
        m.setAttribute("aria-hidden", "true");
        
        try
        {
            var mt = $("modalTitle");
            if (mt) mt.removeAttribute("data-i18n");
            var mb = $("modalBody");
            
            if (mb && mb.firstChild && mb.firstChild.nodeType === 1) mb.firstChild.removeAttribute("data-i18n");
            
            window.__promptI18n = null;
        }
        catch (e)
        {}

        $("modalOk").onclick = null;
        $("modalCancel").onclick = null;
        var b = $("modalBackdrop");
        
        if (b) b.onclick = null;
        
        try
        {
            window.__modalI18n = null;
        }
        catch (e)
        {}
    }
    
    $("modalCancel").onclick = function()
    {
        close();
    };
    
    $("modalBackdrop").onclick = function()
    {
        close();
    };
    
    $("modalOk").onclick = function()
    {
        close();
        try
        {
            onOk && onOk();
        }
        catch (e)
        {}
    };
}

function _showModalI18n(tKey, tVars, tFallback, bKey, bVars, bFallback, onOk)
{
    try
    {
        window.__modalI18n = {
            tKey: tKey,
            tVars: tVars || null,
            tFallback: tFallback || "",
            bKey: bKey,
            bVars: bVars || null,
            bFallback: bFallback || "",
        };
    }
    catch (e)
    {}
    
    _showModal(_tr(tKey, tVars, tFallback), _tr(bKey, bVars, bFallback), onOk);
}

function _showPromptPasswordI18n(tKey, tVars, tFallback, bKey, bVars, bFallback, onOk)
{
    try
    {
        window.__promptI18n = {
            tKey: tKey,
            tVars: tVars || null,
            tFallback: tFallback || "",
            bKey: bKey,
            bVars: bVars || null,
            bFallback: bFallback || "",
        };
    }
    catch (e)
    {}
    
    _showPromptPassword(_tr(tKey, tVars, tFallback), _tr(bKey, bVars, bFallback), onOk);

    try
    {
        var mt = $("modalTitle");
        
        if (mt)
        {
            mt.setAttribute("data-i18n", tKey);
        }
        
        var mb = $("modalBody");
        
        if (mb && mb.firstChild && mb.firstChild.nodeType === 1)
        {
            mb.firstChild.setAttribute("data-i18n", bKey);
        }
    }
    catch (e)
    {}
}

function _showPromptPassword(title, body, onOk)
{
    var m = $("modal");
    
    if (!m) return;
    
    $("modalTitle").textContent = title || "";
    var mb = $("modalBody");
    mb.innerHTML = "";

    var p = document.createElement("div");
    p.style.whiteSpace = "pre-wrap";
    p.textContent = body || "";

    var err = document.createElement("div");
    err.className = "modal-inline-err";
    err.style.display = "none";
    err.style.width = "100%";
    err.style.maxWidth = "360px";
    err.style.boxSizing = "border-box";
    err.style.margin = "10px auto 0";
    err.style.padding = "8px 10px";
    err.style.borderRadius = "10px";
    err.style.background = "rgba(220,38,38,.10)";
    err.style.border = "1px solid rgba(220,38,38,.25)";
    err.style.color = "#b91c1c";
    err.style.fontSize = "14px";

    var inp = document.createElement("input");
    inp.type = "password";
    inp.autocomplete = "current-password";
    inp.style.width = "100%";
    inp.style.maxWidth = "360px";
    inp.style.boxSizing = "border-box";
    inp.style.display = "block";
    inp.style.margin = "10px auto 0";
    inp.style.padding = "10px 12px";
    inp.style.border = "1px solid rgba(17,24,39,.2)";
    inp.style.borderRadius = "10px";

    mb.appendChild(p);
    mb.appendChild(inp);
    mb.appendChild(err);

    document.documentElement.classList.add("view-locked");

    m.style.display = "flex";
    m.setAttribute("aria-hidden", "false");

    function close()
    {
        document.documentElement.classList.remove("view-locked");
        m.style.display = "none";
        m.setAttribute("aria-hidden", "true");
        $("modalOk").disabled = false;
        $("modalOk").onclick = null;
        $("modalCancel").onclick = null;
        var b = $("modalBackdrop");
        
        if (b) b.onclick = null;
        
        document.documentElement.classList.remove("view-locked");
    }

    function setInlineError(msg)
    {
        if (!msg)
        {
            err.style.display = "none";
            err.textContent = "";
            
            return;
        }
        err.textContent = msg;
        err.style.display = "block";
    }

    $("modalCancel").onclick = function()
    {
        close();
    };

    var b = $("modalBackdrop");
    
    if (b) b.onclick = null;

    var okBtn = $("modalOk");
    var okSpinner = document.createElement("span");
    okSpinner.className = "btnSpinner";
    okSpinner.setAttribute("aria-hidden", "true");
    okSpinner.style.display = "none";
    
    try
    {
        if (okBtn) okBtn.insertBefore(okSpinner, okBtn.firstChild);
    }
    catch (e)
    {}

    function setLoading(isLoading)
    {
        if (!okBtn) return;
        if (isLoading)
        {
            okBtn.classList.add("is-loading");
            okBtn.setAttribute("aria-busy", "true");
            try
            {
                okSpinner.style.display = "inline-block";
            }
            catch (e)
            {}
        }
        else
        {
            okBtn.classList.remove("is-loading");
            okBtn.removeAttribute("aria-busy");
            try
            {
                okSpinner.style.display = "none";
            }
            catch (e)
            {}
        }
    }

    $("modalOk").onclick = async function()
    {
        setInlineError("");
        setLoading(true);
        okBtn.disabled = true;
        const v = inp.value || "";
        
        try
        {
            const ok = await (onOk ? onOk(v) : true);
            
            if (ok === false)
            {
                okBtn.disabled = false;
                setLoading(false);
                try
                {
                    inp.focus();
                }
                catch (e)
                {}
                
                return;
            }
            
            setLoading(false);
            close();
        }
        catch (e)
        {
            okBtn.disabled = false;
            setLoading(false);
            setInlineError(String(e && e.message ? e.message : e));
            
            try
            {
                inp.focus();
            }
            catch (_)
            {}
        }
    };

    inp.addEventListener("keydown", function(ev)
    {
        if (ev.key === "Enter")
        {
            ev.preventDefault();
            $("modalOk").click();
        }
    });

    setTimeout(function()
    {
        try
        {
            inp.focus();
        }
        catch (e)
        {}
    }, 60);

    m.__setInlineError = setInlineError;
    m.__getInput = function()
    {
        return inp;
    };
}

function _setupActionAccordion()
{
    try
    {
        var boxes = [$("remarkBox"), $("deleteBox")].filter(function(x)
        {
            return !!x && x.style.display !== "none";
        });
        
        if (!boxes.length) return;

        function closeBox(b)
        {
            if (!b) return;
            
            b.classList.remove("open");
            var h = b.querySelector(".collapsibleHeader");
            var body = b.querySelector(".collapsibleBody");
            
            if (h) h.setAttribute("aria-expanded", "false");
            if (body)
            {
                body.style.maxHeight = "0px";
                body.style.opacity = "0";
            }
        }

        function openBox(b)
        {
            if (!b) return;
            boxes.forEach(function(other)
            {
                if (other !== b) closeBox(other);
            });
            
            b.classList.add("open");
            var h = b.querySelector(".collapsibleHeader");
            var body = b.querySelector(".collapsibleBody");
            
            if (h) h.setAttribute("aria-expanded", "true");
            if (body)
            {
                body.style.maxHeight = "0px";

                requestAnimationFrame(function()
                {
                    try
                    {
                        body.style.opacity = "1";
                        body.style.maxHeight = body.scrollHeight + 24 + "px";
                    }
                    catch (e)
                    {}
                });
            }
        }

        boxes.forEach(function(b)
        {
            var h = b.querySelector(".collapsibleHeader");
            var body = b.querySelector(".collapsibleBody");
            
            if (body)
            {
                body.style.maxHeight = "0px";
                body.style.opacity = "0";
            }
            
            if (h)
            {
                h.onclick = function()
                {
                    if (b.classList.contains("open")) closeBox(b);
                    else openBox(b);
                };
            }
            closeBox(b);
        });
    }
    catch (e)
    {}
}

function _setDelMsg(ok, text)
{
    var el = $("delMsg");
    
    if (!el) return;
    
    el.className = "delMsg " + (ok ? "ok" : "err");
    el.textContent = text || "";
    el.style.display = "block";

    try
    {
        if (window.jQuery)
        {
            $(el).stop(true, true).hide(0).show(500);
        }
    }
    catch (e)
    {}
}

function _setRemarkMsg(ok, text)
{
    var el = $("remarkMsg");
    
    if (!el) return;
    
    el.className = "delMsg " + (ok ? "ok" : "err");
    el.textContent = text || "";
    el.style.display = "block";

    try
    {
        if (window.jQuery)
        {
            $(el).stop(true, true).hide(0).show(500);
        }
    }
    catch (e)
    {}
}

function picotagGetCookie(name)
{
    try
    {
        var m = document.cookie.match(
            new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, "\\$1") + "=([^;]*)"),
        );
        return m ? decodeURIComponent(m[1]) : "";
    }
    catch (e)
    {
        return "";
    }
}

function picotagCanStore()
{
    return picotagGetCookie("picotag_cookie_consent") === "ok";
}

const ID_RE = /^[A-Za-z]{8}$/;

function $(id)
{
    return document.getElementById(id);
}

function _shareUrl()
{
    try
    {
        var u = new URL(location.href);
        return u.toString();
    }
    catch (e)
    {
        return String(location.href || "");
    }
}
async function _copyText(s)
{
    try
    {
        await navigator.clipboard.writeText(s);
        return true;
    }
    catch (e)
    {}
    
    try
    {
        var ta = document.createElement("textarea");
        ta.value = s;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        
        return !!ok;
    }
    catch (e)
    {
        return false;
    }
}

function _wirePrint()
{
    var btn = $("printBtn");
    
    if (!btn || btn.__wired) return;
    
    btn.__wired = true;
    btn.addEventListener("click", function()
    {
        try
        {
            window.print();
        }
        catch (e)
        {}
    });
}

function _wireShare()
{
    var btn = $("shareBtn");
    
    if (!btn) return;
    
    btn.addEventListener("click", async function()
    {
        var id = window.__recordId || "";
        var url = _shareUrl();
        var title = "PicoTag" + (id ? " - " + id : "");
        var text = id ? "PicoTag - Tag ID: " + id : "PicoTag";
        
        try
        {
            if (navigator.share)
            {
                await navigator.share(
                {
                    title: title,
                    text: text,
                    url: url
                });
                return;
            }
        }
        catch (e)
        {}
        
        var ok = await _copyText(url);
        
        try
        {
            btn.classList.add("copied");
            setTimeout(function()
            {
                btn.classList.remove("copied");
            }, 900);
        }
        catch (e)
        {}
        
        if (typeof _showModal === "function")
        {
            _showModal("Share", ok ? "Link copied." : "Copy failed.", null);
            setTimeout(function()
            {
                var m = $("modal");
                var okBtn = $("modalOk");
                
                if (m && m.style.display === "flex")
                {
                    try
                    {
                        okBtn && okBtn.click();
                    }
                    catch (e)
                    {}
                }
            }, 650);
        }
    });
}

function _tr(key, vars, fallback)
{
    try
    {
        if (window.i18n && typeof i18n.t === "function") return i18n.t(key, vars || {});
    }
    catch (e)
    {}
    
    return fallback;
}

if (!window.__i18nChangedBound)
{
    window.__i18nChangedBound = true;
    
    document.addEventListener("i18n:changed", function()
    {
        try
        {
            var m = $("modal");
            
            if (m && m.style.display === "flex")
            {
                if (window.__promptI18n)
                {
                    var pi = window.__promptI18n;
                    
                    if (pi.tKey) $("modalTitle").textContent = _tr(pi.tKey, pi.tVars, pi.tFallback);
                    var mb = $("modalBody");
                    
                    if (mb && mb.firstChild && mb.firstChild.nodeType === 1)
                    {
                        mb.firstChild.textContent = _tr(pi.bKey, pi.bVars, pi.bFallback);
                    }
                    else
                    {
                        $("modalBody").textContent = _tr(pi.bKey, pi.bVars, pi.bFallback);
                    }
                }
                else if (window.__modalI18n)
                {
                    var mi = window.__modalI18n;
                    
                    if (mi.tKey) $("modalTitle").textContent = _tr(mi.tKey, mi.tVars, mi.tFallback);
                    if (mi.bKey) $("modalBody").textContent = _tr(mi.bKey, mi.bVars, mi.bFallback);
                }
            }
        }
        catch (e)
        {}
        
        try
        {
            var errEl = $("err");
            
            if (errEl && errEl.offsetParent !== null && window.getComputedStyle(errEl).display !== "none")
            {
                var did = "";
                
                try
                {
                    did = new URL(location.href).searchParams.get("deleted") || "";
                }
                catch (ex)
                {
                    did = "";
                }
                
                if (!did) did = window.__deletedId || "";
                if (did)
                {
                    window.__deletedId = did;
                    errEl.textContent = _tr(
                        "msg_delete_success_with_id",
                        {
                            id: did
                        },
                        "Tag ID: " + did + " deleted successfully.",
                    );
                }
            }
        }
        catch (e)
        {}
        
        try
        {
            var c = $("content");
            var e = $("emptyCard");
            var emptyVisible = false;
            
            if (e)
            {
                var es = window.getComputedStyle(e);
                emptyVisible = e.offsetParent !== null && es.display !== "none" && es.visibility !== "hidden";
            }
            
            if (!emptyVisible && c && c.offsetParent !== null && window.getComputedStyle(c).display !== "none")
            {
                if (typeof window.__renderRecord === "function")
                {
                    window.__renderRecord();
                }
            }
        }
        catch (e)
        {}
    });
}
try
{
    const qs = new URLSearchParams(location.search);
    
    if (qs.get("deleted"))
    {
        const did = qs.get("deleted");
        window.__deletedId = did;
        showErrKey("msg_deleted_success_with_id",
        {
            id: did
        });
        
        try
        {
            qs.delete("deleted");
            const nu = location.pathname + (qs.toString() ? "?" + qs.toString() : "");
            history.replaceState(null, "", nu);
        }
        catch (e)
        {}
    }
}
catch (e)
{}

function formatDateByFmt(iso, fmt)
{
    if (!iso || typeof iso !== "string") return iso || "";
    
    const m = iso.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);
    
    if (!m) return iso;
    
    const y = m[1],
        mo = m[2],
        d = m[3];
        
    switch ((fmt || "YMD").toUpperCase())
    {
        case "DMY":
            return `${d}-${mo}-${y}`;
        case "MDY":
            return `${mo}-${d}-${y}`;
        default:
            return `${y}-${mo}-${d}`;
    }
}

function _pad2(n)
{
    n = String(n == null ? "" : n);
    
    return n.length === 1 ? "0" + n : n;
}

function formatRemarkDateByFmt(ds, fmt)
{
    try
    {
        if (!ds) return "";
        
        var s = String(ds);
        var d = new Date(s);
        
        if (isNaN(d.getTime())) return s;

        var y = String(d.getFullYear());
        var mo = _pad2(d.getMonth() + 1);
        var da = _pad2(d.getDate());
        var datePart = (function()
        {
            switch ((fmt || "YMD").toUpperCase())
            {
                case "DMY":
                    return da + "-" + mo + "-" + y;
                case "MDY":
                    return mo + "-" + da + "-" + y;
                default:
                    return y + "-" + mo + "-" + da;
            }
            window.loadAndApplySiteConfig && window.loadAndApplySiteConfig();
        })();

        var hasTime = /[T\s]\d{2}:\d{2}/.test(s);
        
        if (!hasTime) return datePart;

        var hh = _pad2(d.getHours());
        var mm = _pad2(d.getMinutes());
        var ss = _pad2(d.getSeconds());
        
        return datePart + " " + hh + ":" + mm + ":" + ss;
    }
    catch (e)
    {
        return String(ds || "");
    }
}

function _langQS()
{
    try
    {
        const l = window.i18n && i18n.getLang ? i18n.getLang() : "";
        return l ? "?lang=" + encodeURIComponent(l) : "";
    }
    catch (e)
    {
        return "";
    }
}

let _errKey = null;
let _errVars = null;

function showEmpty()
{
    $("content").style.display = "none";
    const el = $("emptyCard");
    el.classList.remove("is-show");
    el.style.display = "block";

    requestAnimationFrame(() =>
    {
        el.classList.add("is-show");
    });
}

function showContent()
{
    const el = $("emptyCard");
    el.classList.remove("is-show");
    el.style.display = "none";
    $("content").style.display = "block";
}

function _setErrText(msg)
{
    const e = $("err");
    
    if (!e) return;
    
    e.style.display = "block";
    e.classList.remove("is-show");
    void e.offsetWidth;
    e.textContent = msg;
    requestAnimationFrame(() =>
    {
        e.classList.add("is-show");
    });
    
    showEmpty();
}

function showErrKey(key, vars)
{
    _errKey = key || null;
    _errVars = vars || null;
    let msg = window.i18n && typeof i18n.t === "function" ? i18n.t(_errKey, _errVars) : String(_errKey);
    
    if (_errKey === "err_invalid_id")
    {
        const badId = _errVars && (_errVars.id || _errVars.badId) ? (_errVars.id || _errVars.badId) : "";
        if (badId)
        {
            msg = (msg || "Invalid ID") + ": " + badId;
        }
    }
    _setErrText(msg || "Tag ID: " + (params && params.id ? params.id : "") + " deleted successfully.");
}

function clearErr()
{
    _errKey = null;
    _errVars = null;
    const e = $("err");
    
    if (!e) return;
    
    e.classList.remove("is-show");
    setTimeout(() =>
    {
        if (!e.classList.contains("is-show"))
        {
            e.style.display = "none";
            e.textContent = "";
        }
    }, 460);
}

document.addEventListener("i18n:changed", function()
{
    if (!_errKey) return;
    
    try
    {
        $("err").textContent = i18n.t(_errKey, _errVars);
    }
    catch (e)
    {}
});

function setParam(id)
{
    const url = new URL(location.href);
    url.searchParams.set("id", id);
    history.replaceState({}, "", url);
}

function field(label, value, kind)
{
    const k = document.createElement("div");
    k.className = "k";
    k.textContent = label;
    const v = document.createElement("div");
    v.className = "v";

    if (kind === "node" && value && typeof value === "object" && value.nodeType)
    {
        v.appendChild(value);
        return [k, v];
    }

    const txt = (value ?? "").toString();

    if (
        (kind === "media" || /photo|video/i.test(label) || label.includes("照片") || label.includes("影片")) &&
        txt.trim()
    )
    {
        const s = txt.trim();
        let ok = false;
        
        try
        {
            const u = new URL(s);
            ok = u.protocol === "http:" || u.protocol === "https:";
        }
        catch (_e)
        {
            ok = false;
        }

        if (ok)
        {
            const row = document.createElement("div");
            row.className = "linkRow";

            const a = document.createElement("a");
            a.className = "linkLike";
            a.href = s;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.textContent = s;

            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "copyBtn";
            btn.title = window.i18n ? i18n.t("copy_url_title") : "Copy URL";
            btn.setAttribute("aria-label", window.i18n ? i18n.t("copy_url_title") : "Copy URL");
            btn.innerHTML = "⧉";

            btn.addEventListener("click", async (ev) =>
            {
                ev.preventDefault();
                ev.stopPropagation();
                
                try
                {
                    await navigator.clipboard.writeText(s);
                    btn.classList.add("copied");
                    setTimeout(() => btn.classList.remove("copied"), 1200);
                }
                catch (_e)
                {
                    const ta = document.createElement("textarea");
                    ta.value = s;
                    ta.style.position = "fixed";
                    ta.style.opacity = "0";
                    document.body.appendChild(ta);
                    ta.focus();
                    ta.select();
                    
                    try
                    {
                        document.execCommand("copy");
                    }
                    catch (_e2)
                    {}
                    
                    document.body.removeChild(ta);
                    btn.classList.add("copied");
                    setTimeout(() => btn.classList.remove("copied"), 1200);
                }
            });

            row.appendChild(a);
            row.appendChild(btn);
            v.appendChild(row);
            
            return [k, v];
        }
    }

    v.textContent = txt;
    
    return [k, v];
}

async function load(id)
{
    clearErr();
    
    try
    {
        if (window.i18n && typeof i18n.ready === "function")
        {
            await i18n.ready();
        }
    }
    catch (e)
    {}
    
    try
    {
        const hasI18n = window.i18n && typeof i18n.t === "function";
        
        if (!ID_RE.test(id))
        {
            showErrKey("err_invalid_id",
            {
                id: id
            });
            return;
        }
        
        let data = null;
        const res = await fetch(`${window.API_BASE}/api/r/${id}` + _langQS(),
        {
            headers:
            {
                Accept: "application/json"
            },
        });
        
        if (res.status === 404)
        {
            showErrKey("err_invalid_id",
            {
                id: id
            });
            
            return;
        }
        
        if (res.status === 403)
        {
            const ask = () =>
            {
                const hasI18nNow = window.i18n && typeof i18n.t === "function";
                const title = hasI18nNow ? i18n.t("view_protect_label") : "View protection";
                const body = hasI18nNow ?
                    i18n.t("msg_view_password_prompt") :
                    "This tag is protected. Please enter password to view.";
                _showPromptPasswordI18n(
                    "view_protect_label",
                    null,
                    "View protection",
                    "msg_view_password_prompt",
                    null,
                    "This tag is protected. Please enter password to view.",
                    async function(pw)
                    {
                        try
                        {
                            const r2 = await fetch(`${window.API_BASE}/api/r/${id}` + _langQS(),
                            {
                                method: "POST",
                                headers:
                                {
                                    "Content-Type": "application/json",
                                    Accept: "application/json"
                                },
                                body: JSON.stringify(
                                {
                                    password: pw
                                }),
                            });

                            if (r2.status === 403)
                            {
                                const msg = _tr("msg_password_incorrect", null, "Password incorrect");
                                try
                                {
                                    const mm = $("modal");
                                    if (mm && mm.__setInlineError) mm.__setInlineError(msg);
                                }
                                catch (e)
                                {}
                                
                                return false;
                            }

                            if (!r2.ok)
                            {
                                const k = r2.status === 429 ? "err_too_many_requests" : "err_fetch_failed";
                                const msg = _tr(
                                    k,
                                    k === "err_fetch_failed" ?
                                    {
                                        status: r2.status
                                    } : null,
                                    k === "err_fetch_failed" ?
                                    "Fetch failed: HTTP " + r2.status :
                                    "Too many requests. Please try again later.",
                                );
                                
                                try
                                {
                                    const mm = $("modal");
                                    if (mm && mm.__setInlineError) mm.__setInlineError(msg);
                                }
                                catch (e)
                                {}
                                
                                return false;
                            }

                            data = await r2.json();
                            window.__recordData = data;
                            window.__recordId = id;
                            renderAll();
                            
                            try
                            {
                                window.__renderRecord = renderAll;
                            }
                            catch (e)
                            {}
                            
                            return true;
                        }
                        catch (e)
                        {
                            const msg = _tr("err_fetch_failed",
                            {
                                status: 0
                            }, "Fetch failed: HTTP 0");
                            
                            try
                            {
                                const mm = $("modal");
                                if (mm && mm.__setInlineError) mm.__setInlineError(msg);
                            }
                            catch (_)
                            {}
                            
                            return false;
                        }
                    },
                );
            };

            try
            {
                showEmpty();
            }
            catch (e)
            {}
            
            if (hasI18n && i18n.ready && typeof i18n.ready.then === "function")
            {
                i18n.ready.then(ask);
            }
            else
            {
                ask();
            }
            return;
        }
        
        if (!res.ok)
        {
            if (res.status === 429)
            {
                showErrKey("err_too_many_requests");
            }
            else
            {
                showErrKey("err_fetch_failed",
                {
                    status: res.status
                });
            }
            
            return;
        }
        
        data = await res.json();
        window.__recordData = data;
        window.__recordId = id;

        function renderAll()
        {
            const hasI18n = window.i18n && typeof i18n.t === "function";
            $("content").style.display = "block";
            clearErr();
            _clearFail();
            $("emptyCard").style.display = "none";
            $("title").innerHTML =
                `<span class="title-sub title-top">${hasI18n ? i18n.t("view_title_sub") : "Stringing Info"}</span>` +
                `<span class="title-id title-bottom">${hasI18n ? i18n.t("view_title_id", { id: id }) : `
            Tag ID: $
            {
                id
            }
            `}</span>`;
            $("meta").style.display = "none";
            var ta = $("titleActions");
            
            if (ta)
            {
                ta.style.display = "flex";
            }
            
            _wireShare();
            _wirePrint();

            const kv = $("kv");
            kv.innerHTML = "";
            const isTennis = (function()
            {
                const s = String(data && data.sport ? data.sport : "")
                    .trim()
                    .toLowerCase();
                return s === "tennis";
                window.loadAndApplySiteConfig && window.loadAndApplySiteConfig();
            })();
            
            window.__viewDateFormat = data && data.date_format ? data.date_format : "YMD";
            const rows = [
                [
                    hasI18n ? i18n.t("field_sport") : "Tag Type",
                    (function()
                    {
                        var sp = (data.sport || "").trim();
                        
                        if (!sp) sp = "badminton";
                        
                        sp = sp.toLowerCase();
                        var isT = sp === "tennis";
                        
                        if (hasI18n && window.i18n && typeof i18n.t === "function")
                        {
                            return isT ? i18n.t("sport_tennis_label") : i18n.t("sport_badminton_label");
                        }
                        
                        return isT ? "Tennis" : "Badminton";
                    })(),
                ],
                [hasI18n ? i18n.t("label_owner") : "Tag name", data.owner],
                [hasI18n ? i18n.t("label_date") : "Stringing date", formatDateByFmt(data.date, data.date_format)],
                [
                    hasI18n ? i18n.t("label_tension") : "Tension setting",
                    (data.tension_setting || "") + (data.tension_unit || ""),
                ],
                !isTennis ? [hasI18n ? i18n.t("label_tension_note") : "Tension note", data.tension_note || ""] : null,
                [hasI18n ? i18n.t("label_prestretch") : "Pre-stretch", data.prestretch || ""],
                [hasI18n ? i18n.t("label_pattern") : "Pattern", data.pattern || ""],
                [hasI18n ? i18n.t("label_string_info") : "String", data.string_info || ""],
                [hasI18n ? i18n.t("label_racket_info") : "Racket model", data.racket_info || ""],
                [hasI18n ? i18n.t("label_racket_serial") : "Racket serial", data.racket_serial || ""],
                [hasI18n ? i18n.t("label_grommet") : "Grommets", data.grommet || ""],
                [hasI18n ? i18n.t("label_machine") : "Machine", data.machine || ""],
                [hasI18n ? i18n.t("label_stringer") : "Stringer", data.stringer || ""],
                [hasI18n ? i18n.t("label_fee") : "Fee", data.fee || ""],
                [hasI18n ? i18n.t("label_video") : "Photo/Video", data.video || "", "media"],
                [hasI18n ? i18n.t("label_note") : "Notes", data.note || ""],
            ];

            try
            {
                var ra = [];
                
                if (data.remarks)
                {
                    try
                    {
                        ra = JSON.parse(data.remarks);
                        window.__remarksArr = ra;
                        
                        if (!Array.isArray(ra)) ra = [];
                    }
                    catch (_e)
                    {
                        ra = [];
                    }
                }
                
                if (ra && ra.length)
                {
                    ra.sort(function(a, b)
                    {
                        var ad = a && a.date ? String(a.date) : "";
                        var bd = b && b.date ? String(b.date) : "";
                        return ad.localeCompare(bd);
                    });

                    var box = document.createElement("div");
                    box.className = "remarksList";
                    window.__remarksListEl = box;
                    
                    for (var i = 0; i < ra.length; i++)
                    {
                        var it = ra[i] ||
                        {};
                        var item = document.createElement("div");
                        item.className = "remarkItem";

                        var meta = document.createElement("div");
                        meta.className = "remarkMeta";
                        var ds = it.date != null ? String(it.date) : "";
                        var nice = formatRemarkDateByFmt(ds, data.date_format);
                        meta.textContent = nice;

                        var t = document.createElement("div");
                        t.className = "remarkText";
                        t.textContent = it.text != null ? String(it.text) : "";

                        item.appendChild(meta);
                        item.appendChild(t);
                        box.appendChild(item);
                    }

                    rows.push([hasI18n ? i18n.t("label_remarks") : "Remarks", box, "node"]);
                }
            }
            catch (_e)
            {}

            for (const [k, v, t] of rows.filter(Boolean))
            {
                const [kk, vv] = field(k, v, t);
                const row = document.createElement("div");
                row.className = "kvRow";
                row.appendChild(kk);
                row.appendChild(vv);
                kv.appendChild(row);
            }
            
            setParam(id);
            
            try
            {
                var ap = false;
                
                try
                {
                    ap = new URLSearchParams(location.search).get("autoprint") === "1";
                }
                catch (e)
                {}
                
                if (ap)
                {
                    setTimeout(function()
                    {
                        try
                        {
                            window.print();
                        }
                        catch (e)
                        {}
                    }, 700);
                }
            }
            catch (e)
            {}

            try
            {
                var pf = $("printFooter");
                
                if (pf)
                {
                    var host = "";
                    
                    try
                    {
                        host = location.host || "";
                    }
                    catch (e)
                    {}
                    
                    var origin = "";
                    
                    try
                    {
                        origin = location.origin || "";
                    }
                    catch (e)
                    {}
                    
                    if (!origin && host) origin = "https://" + host;
                    pf.textContent = "PicoTag · " + (origin ? origin : "");
                }
            }
            catch (e)
            {}

            (function()
            {
                var act = $("qrActions");
                var btn = $("showQrBtn");
                var card = $("qrCardView");
                
                if (!btn || !card) return;

                var expanded = false;

                function _formatDateForQr(ymd, fmt)
                {
                    var s = String(ymd || "").trim();
                    
                    if (!s) return "";

                    s = s.split("/").join("-").split(".").join("-").trim();
                    var p = s.split("-");
                    
                    if (p.length !== 3) return s;
                    
                    var Y = p[0],
                        M = p[1],
                        D = p[2];
                        
                    if (fmt === "DMY") return D + "-" + M + "-" + Y;
                    if (fmt === "MDY") return M + "-" + D + "-" + Y;
                    
                    return Y + "-" + M + "-" + D;
                }

                if (act) act.style.display = "flex";
                
                btn.style.display = "inline-flex";
                btn.style.display = "inline-flex";

                async function _buildQr()
                {
                    try
                    {
                        if (window.PicoTagQR && typeof PicoTagQR.ensureLabelFontLoaded === "function")
                        {
                            await PicoTagQR.ensureLabelFontLoaded();
                        }
                    }
                    catch (e)
                    {}

                    var url;
                    try
                    {
                        var u = new URL(location.origin + location.pathname);
                        u.searchParams.set("id", id);
                        url = u.toString();
                    }
                    catch (ex)
                    {
                        url = location.origin + location.pathname + "?id=" + encodeURIComponent(id);
                    }

                    var tension = (data.tension_setting || "") + (data.tension_unit || "");
                    var dateQr = _formatDateForQr(data.date || "", data.date_format || "YMD");
                    window._qrSuggestedFilename = "qr_" + id + ".png";

                    try
                    {
                        var _mk = _pickQrMaker(data);
                        _mk(url, tension, dateQr, id,
                        {
                            targetId: "qrcodeView",
                            downloadLinkId: "downloadPngLinkView",
                        });
                        
                        try
                        {
                            var _mk2 = _pickQrMaker(data);
                            _mk2(url, tension, dateQr, id,
                            {
                                targetId: "qrcodeViewBR",
                                downloadLinkId: "downloadPngLinkViewBR",
                                fontWeight: "600",
                            });
                        }
                        catch (e)
                        {}
                    }
                    catch (e)
                    {}
                }

                if (!window.__picotagBeforePrintWired)
                {
                    window.__picotagBeforePrintWired = true;
                    window.addEventListener("beforeprint", function()
                    {
                        try
                        {
                            window.__qrPrevExpanded = !!expanded;
                        }
                        catch (e)
                        {}
                        
                        try
                        {
                            card.style.display = "flex";
                        }
                        catch (e)
                        {}
                        
                        try
                        {
                            var br = $("qrCardViewBR");
                            if (br) br.style.display = "flex";
                        }
                        catch (e)
                        {}
                        
                        try
                        {
                            card.classList.add("is-open");
                        }
                        catch (e)
                        {}
                        
                        try
                        {
                            expanded = true;
                        }
                        catch (e)
                        {}
                        
                        try
                        {
                            btn.setAttribute("data-i18n", "btn_hide_qr");
                            if (window.i18n && typeof i18n.t === "function") btn.textContent = i18n.t("btn_hide_qr");
                            else btn.textContent = "隱藏 QRCODE";
                        }
                        catch (e)
                        {}
                        
                        try
                        {
                            _buildQr();
                        }
                        catch (e)
                        {}
                    });

                    window.addEventListener("afterprint", function()
                    {
                        try
                        {
                            var br = $("qrCardViewBR");
                            if (br) br.style.display = "none";
                        }
                        catch (e)
                        {}
                        
                        try
                        {
                            var prev = !!window.__qrPrevExpanded;
                            if (!prev)
                            {
                                expanded = false;
                                card.classList.remove("is-open");
                                card.style.display = "none";
                                btn.setAttribute("data-i18n", "btn_show_qr");
                                if (window.i18n && typeof i18n.t === "function")
                                    btn.textContent = i18n.t("btn_show_qr");
                                else btn.textContent = "顯示 QRCODE";
                            }
                        }
                        catch (e)
                        {}
                    });

                    window.addEventListener("afterprint", function()
                    {
                        try
                        {
                            var br = $("qrCardViewBR");
                            if (br) br.style.display = "none";
                        }
                        catch (e)
                        {}
                        
                        try
                        {
                            if (window.__qrPrevExpanded)
                            {
                                expanded = true;
                                card.style.display = "flex";
                                card.classList.add("is-open");
                                btn.setAttribute("data-i18n", "btn_hide_qr");
                                if (window.i18n && typeof i18n.t === "function")
                                    btn.textContent = i18n.t("btn_hide_qr");
                                else btn.textContent = "隱藏 QRCODE";
                            }
                            else
                            {
                                expanded = false;
                                card.classList.remove("is-open");
                                card.style.display = "none";
                                btn.setAttribute("data-i18n", "btn_show_qr");
                                if (window.i18n && typeof i18n.t === "function")
                                    btn.textContent = i18n.t("btn_show_qr");
                                else btn.textContent = "顯示 QRCODE";
                            }
                        }
                        catch (e)
                        {}
                    });
                }

                (async function()
                {
                    await _buildQr();
                    window.loadAndApplySiteConfig && window.loadAndApplySiteConfig();
                })();

                btn.onclick = async function(ev)
                {
                    ev.preventDefault();
                    ev.stopPropagation();

                    if (expanded)
                    {
                        try
                        {
                            card.classList.remove("is-open");
                        }
                        catch (e)
                        {}

                        setTimeout(function()
                        {
                            try
                            {
                                card.style.display = "none";
                            }
                            catch (e)
                            {}
                        }, 240);
                        
                        expanded = false;
                        
                        try
                        {
                            btn.setAttribute("data-i18n", "btn_show_qr");
                            if (window.i18n && typeof i18n.t === "function") btn.textContent = i18n.t("btn_show_qr");
                            else btn.textContent = "顯示QR CODE";
                        }
                        catch (e)
                        {
                            btn.textContent = "顯示QR CODE";
                        }
                        return;
                    }

                    expanded = true;
                    card.style.display = "flex";

                    try
                    {
                        card.classList.remove("is-open");
                    }
                    catch (e)
                    {}
                    
                    requestAnimationFrame(function()
                    {
                        try
                        {
                            card.classList.add("is-open");
                        }
                        catch (e)
                        {}
                    });
                    
                    try
                    {
                        btn.setAttribute("data-i18n", "btn_hide_qr");
                        
                        if (window.i18n && typeof i18n.t === "function") btn.textContent = i18n.t("btn_hide_qr");
                        else btn.textContent = "隱藏 QRCODE";
                    }
                    catch (e)
                    {
                        btn.textContent = "隱藏 QRCODE";
                    }

                    try
                    {
                        if (window.PicoTagQR && typeof PicoTagQR.ensureLabelFontLoaded === "function")
                        {
                            await PicoTagQR.ensureLabelFontLoaded();
                        }
                    }
                    catch (e)
                    {}

                    var url;
                    
                    try
                    {
                        var u = new URL(location.origin + location.pathname);
                        u.searchParams.set("id", id);
                        url = u.toString();
                    }
                    catch (ex)
                    {
                        url = location.origin + location.pathname + "?id=" + encodeURIComponent(id);
                    }

                    var tension = (data.tension_setting || "") + (data.tension_unit || "");
                    var dateQr = _formatDateForQr(data.date || "", data.date_format || "YMD");
                    window._qrSuggestedFilename = "qr_" + id + ".png";

                    try
                    {
                        _pickQrMaker(data)(url, tension, dateQr, id,
                        {
                            targetId: "qrcodeView",
                            downloadLinkId: "downloadPngLinkView",
                        });
                        
                        try
                        {
                            _pickQrMaker(data)(url, tension, dateQr, id,
                            {
                                targetId: "qrcodeViewBR",
                                downloadLinkId: "downloadPngLinkViewBR",
                                fontWeight: "600",
                            });
                        }
                        catch (e)
                        {}
                        
                        try
                        {
                            card.scrollIntoView(
                            {
                                behavior: "smooth",
                                block: "center"
                            });
                        }
                        catch (e)
                        {}
                    }
                    catch (e)
                    {}
                };
                window.loadAndApplySiteConfig && window.loadAndApplySiteConfig();
            })();
            
            (function()
            {
                var box = $("remarkBox");
                
                if (!box) return;
                if (data && data.has_delpass)
                {
                    box.style.display = "block";
                    var btn = $("remarkBtn");
                    
                    if (btn)
                    {
                        var btnSpinner = document.createElement("span");
                        btnSpinner.className = "btnSpinner";
                        btnSpinner.setAttribute("aria-hidden", "true");
                        btnSpinner.style.display = "none";
                        
                        try
                        {
                            btn.insertBefore(btnSpinner, btn.firstChild);
                        }
                        catch (e)
                        {}

                        function setRemarkLoading(isLoading)
                        {
                            if (!btn) return;
                            if (isLoading)
                            {
                                btn.classList.add("is-loading");
                                btn.setAttribute("aria-busy", "true");
                                
                                try
                                {
                                    btnSpinner.style.display = "inline-block";
                                }
                                catch (e)
                                {}
                            }
                            else
                            {
                                btn.classList.remove("is-loading");
                                btn.removeAttribute("aria-busy");
                                
                                try
                                {
                                    btnSpinner.style.display = "none";
                                }
                                catch (e)
                                {}
                            }
                        }
                        btn.onclick = async function()
                        {
                            try
                            {
                                var m = $("remarkMsg");
                                
                                if (m)
                                {
                                    m.style.display = "none";
                                    m.textContent = "";
                                }
                            }
                            catch (e)
                            {}
                            
                            var ta = $("remarkTextView");
                            var text = ta ? String(ta.value || "").trim() : "";
                            if (!text)
                            {
                                _setRemarkMsg(
                                    false,
                                    _tr("msg_fill_required", null, "Please fill all required fields."),
                                );
                                
                                if (ta) ta.focus();
                                
                                return;
                            }
                            if (text.length > 2000)
                            {
                                _setRemarkMsg(false, "Remark too long.");
                                if (ta) ta.focus();
                                
                                return;
                            }
                            var pwEl = $("remarkPassView");
                            var pw = pwEl ? String(pwEl.value || "").trim() : "";
                            
                            if (!pw)
                            {
                                _setRemarkMsg(false, _tr("msg_password_required", null, "Please enter password."));
                                
                                if (pwEl) pwEl.focus();
                                
                                return;
                            }

                            try
                            {
                                setRemarkLoading(true);
                                btn.disabled = true;
                                const res = await fetch(`${window.API_BASE}/api/remark/${id}` + _langQS(),
                                {
                                    method: "POST",
                                    headers:
                                    {
                                        "Content-Type": "application/json",
                                        Accept: "application/json"
                                    },
                                    body: JSON.stringify(
                                    {
                                        password: pw,
                                        remark: text
                                    }),
                                });
                                
                                if (res.status === 403)
                                {
                                    _setRemarkMsg(false, _tr("msg_password_incorrect", null, "Password incorrect."));
                                    btn.disabled = false;
                                    return;
                                }
                                
                                if (!res.ok)
                                {
                                    try
                                    {
                                        const out = await res.json().catch(() => null);
                                        if (window.i18n && out && out.errorKey)
                                        {
                                            if (out.errorKey === "err_field_too_long" && out.fieldLabelKey)
                                            {
                                                const fld = i18n.t(out.fieldLabelKey);
                                                _setRemarkMsg(false, i18n.t(out.errorKey,
                                                {
                                                    field: fld,
                                                    max: out.max
                                                }));
                                            }
                                            else
                                            {
                                                _setRemarkMsg(false, i18n.t(out.errorKey, out.vars || {}));
                                            }
                                        }
                                        else
                                        {
                                            _setRemarkMsg(false, _tr("msg_remark_failed", null, "Failed to save remark."));
                                        }
                                    }
                                    catch (e)
                                    {
                                        _setRemarkMsg(false, _tr("msg_remark_failed", null, "Failed to save remark."));
                                    }
                                    
                                    btn.disabled = false;
                                    
                                    return;
                                }
                                _setRemarkMsg(true, _tr("msg_remark_success", null, "Remark saved."));

                                try
                                {
                                    var nowIso = new Date().toISOString();
                                    var it = {
                                        date: nowIso,
                                        text: text
                                    };
                                    
                                    if (!window.__remarksArr || !Array.isArray(window.__remarksArr))
                                        window.__remarksArr = [];
                                    
                                    window.__remarksArr.push(it);

                                    function _mkRemarkItem(obj)
                                    {
                                        var item = document.createElement("div");
                                        item.className = "remarkItem";
                                        var meta = document.createElement("div");
                                        meta.className = "remarkMeta";
                                        var ds = obj && obj.date != null ? String(obj.date) : "";
                                        var nice = ds;
                                        
                                        try
                                        {
                                            if (ds)
                                            {
                                                var d = new Date(ds);
                                                if (!isNaN(d.getTime()))
                                                    nice = formatRemarkDateByFmt(ds, window.__viewDateFormat || "YMD");
                                            }
                                        }
                                        catch (e)
                                        {}
                                        
                                        meta.textContent = nice;
                                        var tx = document.createElement("div");
                                        tx.className = "remarkText";
                                        tx.textContent = obj && obj.text != null ? String(obj.text) : "";
                                        item.appendChild(meta);
                                        item.appendChild(tx);
                                        
                                        return item;
                                    }

                                    var list = window.__remarksListEl;
                                    
                                    if (!list)
                                    {
                                        var kv = $("kv");
                                        
                                        if (kv)
                                        {
                                            var row = document.createElement("div");
                                            row.className = "kvRow";
                                            var kk = document.createElement("div");
                                            kk.className = "k";
                                            kk.textContent = _tr("label_remarks", null, "Remarks");
                                            var vv = document.createElement("div");
                                            vv.className = "v";
                                            list = document.createElement("div");
                                            list.className = "remarksList";
                                            vv.appendChild(list);
                                            row.appendChild(kk);
                                            row.appendChild(vv);
                                            kv.appendChild(row);
                                            window.__remarksListEl = list;
                                        }
                                    }
                                    
                                    if (list)
                                    {
                                        var node = _mkRemarkItem(it);

                                        try
                                        {
                                            node.classList.add("remarkNew");
                                        }
                                        catch (e)
                                        {}
                                        
                                        try
                                        {
                                            node.style.display = "none";
                                        }
                                        catch (e)
                                        {}
                                        
                                        list.appendChild(node);

                                        try
                                        {
                                            var target = list;
                                            if (target && target.scrollIntoView)
                                                target.scrollIntoView(
                                                {
                                                    behavior: "smooth",
                                                    block: "center"
                                                });
                                        }
                                        catch (e)
                                        {}

                                        try
                                        {
                                            if (window.jQuery)
                                            {
                                                window.jQuery(node).show(500);
                                            }
                                            else
                                            {
                                                node.style.display = "";
                                                node.classList.add("remarkNewIn");
                                                setTimeout(function()
                                                {
                                                    try
                                                    {
                                                        node.classList.remove("remarkNewIn");
                                                    }
                                                    catch (e)
                                                    {}

                                                    setTimeout(function()
                                                    {
                                                        try
                                                        {
                                                            node.classList.remove("remarkNew");
                                                        }
                                                        catch (e)
                                                        {}
                                                    }, 2500);
                                                }, 30);
                                            }
                                        }
                                        catch (e)
                                        {
                                            try
                                            {
                                                node.style.display = "";
                                            }
                                            catch (e2)
                                            {}
                                        }
                                    }
                                }
                                catch (e)
                                {}

                                try
                                {
                                    if (ta) ta.disabled = true;
                                    if (pwEl) pwEl.disabled = true;
                                    btn.disabled = true;
                                }
                                catch (e)
                                {}
                            }
                            catch (e)
                            {
                                _setRemarkMsg(false, _tr("msg_remark_failed", null, "Failed to save remark."));
                                try
                                {
                                    btn.disabled = false;
                                }
                                catch (e2)
                                {}
                            }
                            finally
                            {
                                setRemarkLoading(false);
                            }
                        };
                    }
                }
                else
                {
                    box.style.display = "none";
                }
                window.loadAndApplySiteConfig && window.loadAndApplySiteConfig();
            })();

            (function()
            {
                var box = $("deleteBox");
                
                if (!box) return;
                if (data && data.has_delpass)
                {
                    box.style.display = "block";
                    var btn = $("delBtn");
                    
                    if (btn)
                    {
                        var btnSpinner = document.createElement("span");
                        btnSpinner.className = "btnSpinner";
                        btnSpinner.setAttribute("aria-hidden", "true");
                        btnSpinner.style.display = "none";
                        try
                        {
                            btn.insertBefore(btnSpinner, btn.firstChild);
                        }
                        catch (e)
                        {}

                        function setDelLoading(isLoading)
                        {
                            if (!btn) return;
                            if (isLoading)
                            {
                                btn.classList.add("is-loading");
                                btn.setAttribute("aria-busy", "true");
                                
                                try
                                {
                                    btnSpinner.style.display = "inline-block";
                                }
                                catch (e)
                                {}
                            }
                            else
                            {
                                btn.classList.remove("is-loading");
                                btn.removeAttribute("aria-busy");
                                
                                try
                                {
                                    btnSpinner.style.display = "none";
                                }
                                catch (e)
                                {}
                            }
                        }
                        btn.onclick = async function()
                        {
                            try
                            {
                                var m = $("delMsg");
                                if (m)
                                {
                                    document.documentElement.classList.remove("view-locked");
                                    m.style.display = "none";
                                    m.textContent = "";
                                }
                            }
                            catch (e)
                            {}
                            
                            var pwEl = $("delPassView");
                            var pw = pwEl ? String(pwEl.value || "").trim() : "";
                            
                            if (!pw)
                            {
                                _setDelMsg(false, _tr("msg_password_required", null, "Please enter password."));
                                if (pwEl) pwEl.focus();
                                return;
                            }
                            
                            _showModalI18n(
                                "modal_confirm_delete_title",
                                null,
                                "Confirm delete",
                                "modal_confirm_delete_body",
                                {
                                    id: id
                                },
                                "Delete Tag ID: " + id + " ?\nThis action cannot be undone.",
                                async function()
                                {
                                    try
                                    {
                                        btn.disabled = true;
                                        setDelLoading(true);
                                        
                                        const res = await fetch(`${window.API_BASE}/api/d/${id}` + _langQS(),
                                        {
                                            method: "POST",
                                            headers:
                                            {
                                                "Content-Type": "application/json",
                                                Accept: "application/json"
                                            },
                                            body: JSON.stringify(
                                            {
                                                password: pw
                                            }),
                                        });
                                        
                                        if (res.status === 403)
                                        {
                                            _setDelMsg(
                                                false,
                                                _tr("msg_password_incorrect", null, "Password incorrect."),
                                            );
                                            btn.disabled = false;
                                            return;
                                        }
                                        
                                        if (!res.ok)
                                        {
                                            _setDelMsg(
                                                false,
                                                _tr(
                                                    "msg_delete_failed",
                                                    {
                                                        status: res.status
                                                    },
                                                    "Delete failed (" + res.status + ")",
                                                ),
                                            );
                                            btn.disabled = false;
                                            
                                            return;
                                        }

                                        try
                                        {
                                            showErrKey("msg_delete_success_with_id",
                                            {
                                                id: id
                                            });
                                            
                                            try
                                            {
                                                window.__deletedId = did;
                                            }
                                            catch (e)
                                            {}
                                            
                                            const content = $("content");
                                            
                                            if (content) content.style.display = "none";
                                            
                                            const box = $("deleteBox");
                                            
                                            if (box) box.style.display = "none";
                                            
                                            const empty = $("emptyCard");
                                            
                                            if (empty)
                                            {
                                                empty.style.display = "block";
                                                empty.style.opacity = "1";
                                            }
                                            try
                                            {
                                                window.scrollTo(
                                                {
                                                    top: 0,
                                                    behavior: "smooth"
                                                });
                                            }
                                            catch (e)
                                            {}
                                        }
                                        catch (e)
                                        {}
                                    }
                                    catch (e)
                                    {
                                        _setDelMsg(
                                            false,
                                            hasI18n ? i18n.t("msg_delete_failed",
                                            {
                                                status: ""
                                            }) : "Delete failed.",
                                        );
                                    }
                                    finally
                                    {
                                        try
                                        {
                                            setDelLoading(false);
                                        }
                                        catch (e)
                                        {}
                                        try
                                        {
                                            btn.disabled = false;
                                        }
                                        catch (e)
                                        {}
                                    }
                                },
                            );
                        };
                    }
                }
                else
                {
                    box.style.display = "none";
                }
                window.loadAndApplySiteConfig && window.loadAndApplySiteConfig();
            })();
            _setupActionAccordion();
        }
        window.__renderRecord = renderAll;
        try
        {
            const sel = document.getElementById("langSelect");
            
            if (sel && !sel.__bindRender)
            {
                sel.__bindRender = true;
                sel.addEventListener("change", function()
                {
                    try
                    {
                        setTimeout(renderAll, 0);
                    }
                    catch (e)
                    {}
                });
            }
        }
        catch (e)
        {}

        renderAll();
        
        document.addEventListener("i18n:changed", function()
        {
            try
            {
                var e = $("emptyCard");
                var c = $("content");
                var emptyShown = false;
                
                if (e)
                {
                    var es = window.getComputedStyle(e);
                    emptyShown = es.display !== "none" && es.visibility !== "hidden";
                }
                
                var idp = "";
                
                try
                {
                    idp = new URL(location.href).searchParams.get("id") || "";
                }
                catch (ex)
                {
                    idp = "";
                }
                
                if (!emptyShown && idp && c && window.getComputedStyle(c).display !== "none")
                {
                    renderAll();
                }
            }
            catch (e)
            {}
        });
    }
    catch (e)
    {
        _recordFail();
        showErr(e.message || String(e));
    }
}

const FAIL_KEY = "picotag_view_fail";

function consentAccepted()
{
    try
    {
        return (
            (picotagCanStore() ?
                localStorage.getItem :
                function()
                {
                    return null;
                })("picotag_cookie_consent") === "ok"
        );
    }
    catch (e)
    {
        return false;
    }
}

function _now()
{
    return Date.now();
}

function _getFail()
{
    try
    {
        return JSON.parse(
            (picotagCanStore() ?
                localStorage.getItem :
                function()
                {
                    return null;
                })(FAIL_KEY) || "{}",
        );
    }
    catch (_e)
    {
        return {};
    }
}

function _setFail(obj)
{
    try
    {
        if (consentAccepted())
            (picotagCanStore() ? localStorage.setItem : function() {})(FAIL_KEY, JSON.stringify(obj || {}));
    }
    catch (_e)
    {}
}

function _recordFail()
{
    const o = _getFail();
    const t = _now();

    if (!o.ts || t - o.ts > 10 * 60 * 1000)
    {
        o.count = 0;
        o.ts = t;
    }
    
    o.count = (o.count || 0) + 1;
    o.ts = t;

    if (o.count >= 12)
    {
        o.cooldownUntil = t + 30 * 1000;
    }
    
    _setFail(o);
}

function _clearFail()
{
    _setFail({});
}

function _inCooldown()
{
    const o = _getFail();
    const t = _now();
    
    return o.cooldownUntil && t < o.cooldownUntil ? o.cooldownUntil - t : 0;
}

function _cooldownMsg(ms)
{
    const s = Math.ceil(ms / 1000);
    
    return window.i18n && i18n.t ?
        i18n.t("err_rate_limited",
        {
            sec: s
        }) :
        "Too many failed attempts. Try again in " + s + "s.";
}

function wireInput()
{
    const inp = $("idInput");
    const btn = $("openBtn");
    
    if (!inp || !btn) return;

    function go()
    {
        const raw = (inp.value || "").trim();
        
        if (!raw)
        {
            clearErr();
            showEmpty();
            return;
        }
        
        const id = raw;
        load(id);
    }
    
    let _t = null;
    
    btn.addEventListener("click", function()
    {
        clearTimeout(_t);
        _t = setTimeout(go, 250);
    });
    
    inp.addEventListener("keydown", function(ev)
    {
        if (ev.key === "Enter")
        {
            ev.preventDefault();
            go();
        }
    });
}

wireInput();

(function autoLoad()
{
    (function()
    {
        const qs = new URLSearchParams(location.search);
        if (qs.get("deleted") === "1")
        {
            try
            {
                const hasI18n = window.i18n && typeof i18n.t === "function";
                $("hint").style.display = "block";
                showEmpty();
                setErr(hasI18n ? i18n.t("msg_delete_success_home") : "Deleted successfully.");
            }
            catch (e)
            {}
        }
        window.loadAndApplySiteConfig && window.loadAndApplySiteConfig();
    })();

    const id = new URLSearchParams(location.search).get("id") || "";
    
    if (id.trim())
    {
        load(id.trim());
    }
    else
    {
        $("hint").style.display = "block";
        clearErr();
        showEmpty();
    }
    
    window.loadAndApplySiteConfig && window.loadAndApplySiteConfig();
})();
