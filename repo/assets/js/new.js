function ensureLabelFontLoaded()
{
    try
    {
        if (window.PicoTagQR && typeof window.PicoTagQR.ensureLabelFontLoaded === "function")
        {
            return window.PicoTagQR.ensureLabelFontLoaded();
        }
        if (document.fonts && document.fonts.load)
        {
            return Promise.all([
                document.fonts.load('300 45px "JetBrainsMono"'),
                document.fonts.load('300 40px "JetBrainsMono"'),
                document.fonts.load('300 36px "JetBrainsMono"'),
            ]).then(function()
            {
                return document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
            });
        }
    }
    catch (e)
    {}
    
    return Promise.resolve();
}

function _$(id)
{
    return document.getElementById(id);
}

function _showPromptPassword(title, body, onOk, opts)
{
    var m = _$("modal");
    if (!m) return;
    _$("modalTitle").setAttribute("data-i18n", "create_tag_pass_title");
    _$("modalTitle").textContent = title || __t("create_tag_pass_title", "Create Tag Password");
    var mb = _$("modalBody");
    mb.innerHTML = "";

    var p = document.createElement("div");
    p.style.whiteSpace = "pre-wrap";
    p.setAttribute("data-i18n", "create_tag_pass_body");
    p.textContent = body || __t("create_tag_pass_body", "Create password is required to create a new Tag ID.");

    var err = document.createElement("div");
    err.className = "modal-inline-err";
    err.style.display = "none";
    err.style.width = "100%";
    err.style.maxWidth = "360px";
    err.style.boxSizing = "border-box";
    err.style.margin = "10px auto 0";

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
        _$("modalOk").disabled = false;
        _$("modalOk").onclick = null;
        _$("modalCancel").onclick = null;
        var b = _$("modalBackdrop");
        if (b) b.onclick = null;
    }

    var locked = !!(opts && opts.locked);
    var cancelHref = opts && opts.cancelHref ? opts.cancelHref : null;

    _$("modalCancel").onclick = function()
    {
        if (locked)
        {
            if (cancelHref)
            {
                window.location.href = cancelHref;
            }
            return;
        }
        close();
    };
    
    var b = _$("modalBackdrop");
    
    if (b)
    {
        b.onclick = function()
        {
            if (locked)
            {
                return;
            }
            close();
        };
    }

    _$("modalOk").onclick = async function()
    {
        _$("modalOk").disabled = true;
        err.style.display = "none";
        
        try
        {
            var res = onOk ? await onOk(String(inp.value || ""), err) : true;
            if (res === false)
            {
                _$("modalOk").disabled = false;
                return;
            }
            close();
        }
        catch (e)
        {
            _$("modalOk").disabled = false;
        }
    };

    setTimeout(function()
    {
        try
        {
            inp.focus();
        }
        catch (e)
        {}
        
    }, 60);
}

async function _loadPublicConfig()
{
    try
    {
        const r = await fetch((window.api && window.api.buildUrl ? window.api.buildUrl("api/config/public") : ("/api/config/public")) + _langQS());
        return await r.json();
    }
    catch (e)
    {
        return {};
    }
}

async function _verifyCreatePass(pass)
{
    return true;
}

function __t(key, fallback)
{
    try
    {
        if (window.i18n && typeof window.i18n.t === "function")
        {
            var v = window.i18n.t(key);
            if (v && v !== key) return v;
        }
    }
    catch (e)
    {}
    
    return fallback != null ? fallback : key;
}

function __getCreatePass()
{
    try
    {
        return sessionStorage.getItem("tagid_create_pass") || "";
    }
    catch (e)
    {
        return "";
    }
}

function __setCreatePass(v)
{
    try
    {
        sessionStorage.setItem("tagid_create_pass", v || "");
    }
    catch (e)
    {}
}

async function ensureCreatePassGate()
{
    try
    {
        const cfg = await _loadPublicConfig();
        const rawNeed = cfg ? cfg.createPassRequired : false;
        const need = rawNeed === true || rawNeed === 1 || rawNeed === "1" || rawNeed === "true";
        if (!need) return true;

        try
        {
            const probe = await fetch(window.API_BASE + "/api/tagid/check" + _langQS(),
            {
                method: "POST",
                headers:
                {
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify(
                {
                    create_password: ""
                }),
            });
            if (probe.ok)
            {
                return true;
            }
        }
        catch (e)
        {}

        try
        {
            var g = document.getElementById("genBtn");
            if (g) g.disabled = true;
        }
        catch (e)
        {}
        
        try
        {
            var s = document.getElementById("saveBtn");
            if (s) s.disabled = true;
        }
        catch (e)
        {}

        const saved = __getCreatePass();
        
        if (saved && (await _verifyCreatePass(saved)))
        {
            try
            {
                var g2 = document.getElementById("genBtn");
                if (g2) g2.disabled = false;
            }
            catch (e)
            {}
            
            try
            {
                var s2 = document.getElementById("saveBtn");
                if (s2) s2.disabled = false;
            }
            catch (e)
            {}
            
            return true;
        }

        _showPromptPassword(
            __t("create_tag_pass_title", "Create Tag Password"),
            __t("create_tag_pass_body", "Create password is required to create a new Tag ID."),
            async function(pass, errEl)
            {
                const ok = await _verifyCreatePass(pass);
                
                if (!ok)
                {
                    if (errEl)
                    {
                        errEl.textContent = __t("msg_password_incorrect", "Password incorrect.");
                        errEl.style.display = "block";
                    }
                    return false;
                }
                
                __setCreatePass(pass);
                
                try
                {
                    var g3 = document.getElementById("genBtn");
                    if (g3) g3.disabled = false;
                }
                catch (e)
                {}
                
                try
                {
                    var s3 = document.getElementById("saveBtn");
                    if (s3) s3.disabled = false;
                }
                catch (e)
                {}
                
                return true;
            },
            {
                locked: true,
                cancelHref: "../index.html"
            },
        );

        return false;
    }
    catch (e)
    {
        return true;
    }
}

setTimeout(function()
{
    ensureCreatePassGate();
}, 0);

function _syncBtnsLater()
{
    try
    {
        requestAnimationFrame(() =>
        {
            requestAnimationFrame(() =>
            {
                syncActionBtnWidth();
            });
        });
    }
    catch (e)
    {
        _setLoadingOverlay(false);
        try
        {
            _syncBtnsLater();
        }
        catch (e2)
        {}
    }
}

function syncActionBtnWidth()
{
    try
    {
        const d = document.getElementById("downloadPngLink");
        const c = document.getElementById("copyBtn");
        const o = document.getElementById("openUrlBtn");
        const s = document.getElementById("shareBtnNew");
        const p = document.getElementById("printTagBtn");
        
        if (!d || !c) return;
        
        const dw = d.getBoundingClientRect().width;
        
        if (dw > 0)
        {
            c.style.width = Math.ceil(dw) + "px";
            if (o) o.style.width = Math.ceil(dw) + "px";
            if (s) s.style.width = Math.ceil(dw) + "px";
            if (p) p.style.width = Math.ceil(dw) + "px";
        }
    }
    catch (e)
    {}
}

if (!picotagCanStore())
{
    try
    {
        localStorage.removeItem("picotag_new_form");
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

function setDefaultDate()
{
    const el = document.getElementById("date");
    if (el && !el.value)
    {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        el.value = `${yyyy}-${mm}-${dd}`;
    }
}

setDefaultDate();

function stripEnglishFieldNumbers()
{
    try
    {
        if (!(window.i18n && typeof i18n.getLang === "function")) return;
        if (i18n.getLang() !== "en") return;
        
        document.querySelectorAll("#formGrid label[data-i18n]").forEach(
            function(el)
            {
                var t = (el.textContent || "").replace(/^\s*\d+\.\s*/, "");
                if (t !== el.textContent) el.textContent = t;
            },
            {
                locked: true,
                cancelHref: "../index.html"
            },
        );
    }
    catch (e)
    {}
}

stripEnglishFieldNumbers();
document.addEventListener("i18n:changed", stripEnglishFieldNumbers);

function attachClearButtons()
{
    const inputs = Array.from(
        document.querySelectorAll('#formGrid input[type="text"],#formGrid input[type="password"]'),
    ).filter((el) => el && el.id !== "tension");
    
    for (const input of inputs)
    {
        if (
            !input ||
            (input.parentElement &&
                input.parentElement.classList &&
                input.parentElement.classList.contains("input-with-clear"))
        )
        {
            continue;
        }
        const wrap = document.createElement("div");
        wrap.className = "input-with-clear";
        input.parentNode.insertBefore(wrap, input);
        wrap.appendChild(input);

        if (input.id === "delpass")
        {
            try
            {
                const vp = input.parentNode ? input.parentNode.querySelector(".vp-check") : null;
                if (vp)
                {
                    wrap.appendChild(vp);
                }
            }
            catch (e)
            {}
        }

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "clear-btn";
        btn.setAttribute("aria-label", "Clear");
        btn.textContent = "✕";
        btn.addEventListener("click", () =>
        {
            input.value = "";

            input.dispatchEvent(new Event("input",
            {
                bubbles: true
            }));
            
            input.dispatchEvent(new Event("change",
            {
                bubbles: true
            }));
            input.focus();
        });
        wrap.appendChild(btn);
    }
}

attachClearButtons();
setupViewProtectToggle();

(function()
{
    const dp = document.getElementById("delpass");
    const vp = document.getElementById("viewProtect");

    function sync()
    {
        if (!vp) return;
        const has = !!(dp && (dp.value || "").trim());
        if (!has)
        {
            vp.checked = false;
            vp.disabled = true;
        }
        else
        {
            vp.disabled = false;
        }
    }
    
    if (dp && vp)
    {
        dp.addEventListener("input", sync);
        dp.addEventListener("change", sync);
        sync();
    }
})();

const FORM_COOKIE_KEY = "picotag_new_form";
const FORM_COOKIE_DAYS = 365;

const CONSENT_COOKIE_KEY = "picotag_cookie_consent";

function _getConsent()
{
    return _getCookie(CONSENT_COOKIE_KEY) || "";
}

function _canStore()
{
    return _getConsent() === "ok";
}

function _delCookie(name)
{
    try
    {
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax";
    }
    catch (e)
    {}
}

function _getCookie(name)
{
    try
    {
        const parts = document.cookie.split(";").map((v) => v.trim());
        for (const p of parts)
        {
            if (p.startsWith(name + "=")) return decodeURIComponent(p.substring((name + "=").length));
        }
    }
    catch (e)
    {}
    
    return "";
}

function _setCookie(name, value, days)
{
    const maxAge = days * 24 * 60 * 60;
    const v = encodeURIComponent(String(value));
    document.cookie = `${name}=${v}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
}

const COOKIE_EXCLUDE_IDS = new Set(["date", "tension", "racket_serial", "video", "note", "delpass", "viewProtect"]);

function loadFormCookie()
{
    if (!_canStore())
    {
        _delCookie(FORM_COOKIE_KEY);
        return;
    }
    
    const raw = _getCookie(FORM_COOKIE_KEY);
    if (!raw) return;
    let data = null;
    
    try
    {
        data = JSON.parse(decodeURIComponent(raw));
    }
    catch (e)
    {
        return;
    }
    
    if (!data || typeof data !== "object") return;

    Object.keys(data).forEach((k) =>
    {
        if (COOKIE_EXCLUDE_IDS.has(k)) return;
        if (k === "unit")
        {
            const v = data[k];
            const r = document.querySelector(`input[name="unit"][value="${CSS.escape(String(v))}"]`);
            if (r) r.checked = true;
            return;
        }

        if (k === "dateFormat")
        {
            const v = data[k];
            const r = document.querySelector(`input[name="dateFormat"][value="${CSS.escape(String(v))}"]`);
            if (r) r.checked = true;
            return;
        }

        if (k === "sport")
        {
            const v = data[k];
            const r = document.querySelector(`input[name="sport"][value="${CSS.escape(String(v))}"]`);
            if (r) r.checked = true;
            return;
        }
        const el = document.getElementById(k);
        if (!el) return;

        if (COOKIE_EXCLUDE_IDS.has(el.id)) return;

        if (el.type === "radio") return;
        el.value = data[k] ?? "";
    });
}

function saveFormCookie()
{
    if (!_canStore())
    {
        _delCookie(FORM_COOKIE_KEY);
        return;
    }
    
    const grid = document.getElementById("formGrid");
    
    if (!grid) return;
    
    const data = {};
    const els = grid.querySelectorAll("input, select, textarea");
    
    els.forEach((el) =>
    {
        const id = el.id || "";
        const name = el.getAttribute("name") || "";

        if (id && COOKIE_EXCLUDE_IDS.has(id)) return;
        if (name === "unit")
        {
            return;
        }

        if (el.type === "radio") return;

        if (id)
        {
            data[id] = el.value ?? "";
        }
    });

    const u = document.querySelector('input[name="unit"]:checked');
    if (u) data["unit"] = u.value;

    const df = document.querySelector('input[name="dateFormat"]:checked');
    if (df) data["dateFormat"] = df.value;

    const sp = document.querySelector('input[name="sport"]:checked');
    if (sp) data["sport"] = sp.value;

    try
    {
        _setCookie(FORM_COOKIE_KEY, encodeURIComponent(JSON.stringify(data)), FORM_COOKIE_DAYS);
    }
    catch (e)
    {}
}

function bindCookiePersistence()
{
    const grid = document.getElementById("formGrid");
    
    if (!grid) return;
    
    const els = grid.querySelectorAll("input, select, textarea");
    
    els.forEach((el) =>
    {
        const id = el.id || "";
        const name = el.getAttribute("name") || "";

        if (id && COOKIE_EXCLUDE_IDS.has(id)) return;
        if (el.type === "radio")
        {
            if (name === "unit" || name === "dateFormat" || name === "sport")
            {
                el.addEventListener("change", function()
                {
                    if (_canStore()) saveFormCookie();
                });
            }
            return;
        }
        el.addEventListener("input", function()
        {
            if (_canStore()) saveFormCookie();
        });
        el.addEventListener("change", function()
        {
            if (_canStore()) saveFormCookie();
        });
    });
}

loadFormCookie();

try
{
    applySportUI();
}
catch (e)
{}

try
{
    applySportUI();
}
catch (e)
{}

try
{
    const dp = document.getElementById("delpass");
    if (dp) dp.value = "";
}
catch (e)
{}

bindCookiePersistence();
window.saveFormCookie = saveFormCookie;

function $(id)
{
    return document.getElementById(id);
}

function renderQrLabel(url, tensionText, dateText, idText)
{
    var sportEl = document.querySelector('input[name="sport"]:checked');
    var sport = sportEl ? sportEl.value : "";
    if (sport === "tennis" && window.PicoTagQR && typeof window.PicoTagQR.makeQRTennis === "function")
    {
        window.PicoTagQR.makeQRTennis(url, tensionText, dateText, idText);
    }
    else
    {
        window.PicoTagQR && typeof window.PicoTagQR.makeQR === "function" ?
            window.PicoTagQR.makeQR(url, tensionText, dateText, idText) :
            typeof window.makeQR === "function" ?
            window.makeQR(url, tensionText, dateText, idText) :
            null;
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

function isValidHttpUrl(str)
{
    try
    {
        const u = new URL(str);
        return u.protocol === "http:" || u.protocol === "https:";
    }
    catch (e)
    {
        return false;
    }
}

function isValidTension(v)
{
    const s = (v ?? "").trim();

    if (!/^(?:\d{1,2})(?:\.\d)?$/.test(s)) return false;
    
    const n = Number(s);
    
    if (!Number.isFinite(n)) return false;
    if (n < 0 || n >= 99) return false;
    
    return true;
}

function updateRequiredStyle(el)
{
    if (!el) return;
    
    const v = (el.value ?? "").trim();
    
    if (v)
    {
        el.classList.remove("requiredInput");
    }
    else
    {
        el.classList.add("requiredInput");
    }
}

function bindRequiredLive(el)
{
    if (!el) return;
    const handler = () => updateRequiredStyle(el);
    el.addEventListener("input", handler);
    el.addEventListener("change", handler);
    el.addEventListener("blur", handler);
    handler();
}

function unit()
{
    return document.querySelector("input[name='unit']:checked").value;
}

function sport()
{
    const r = document.querySelector("input[name='sport']:checked");
    return r ? r.value : "";
}

function _animShowHide(el, show, ms)
{
    try
    {
        if (!el) return;
        ms = typeof ms === "number" && ms >= 0 ? ms : 500;
        if (el._anim)
        {
            try
            {
                el._anim.cancel();
            }
            catch (e)
            {}
        }
        
        if (show)
        {
            el.style.removeProperty("display");
            const prevDisplay = getComputedStyle(el).display;
            
            if (prevDisplay === "none") el.style.display = "block";
            
            el.style.overflow = "hidden";
            const h = el.scrollHeight;
            el.style.height = "0px";
            el.style.opacity = "0";
            void el.offsetHeight;
            el._anim = el.animate(
                [
                {
                    height: "0px",
                    opacity: 0
                },
                {
                    height: h + "px",
                    opacity: 1
                }, ],
                {
                    duration: ms,
                    easing: "ease"
                },
            );
            
            el._anim.onfinish = () =>
            {
                el.style.removeProperty("height");
                el.style.removeProperty("overflow");
                el.style.removeProperty("opacity");
                el._anim = null;
            };
            
            el._anim.oncancel = () =>
            {
                el._anim = null;
            };
        }
        else
        {
            const prevDisplay = getComputedStyle(el).display;
            
            if (prevDisplay === "none") return;
            
            el.style.overflow = "hidden";
            const h = el.getBoundingClientRect().height || el.scrollHeight;
            el.style.height = h + "px";
            el.style.opacity = "1";
            void el.offsetHeight;
            
            el._anim = el.animate(
                [
                {
                    height: h + "px",
                    opacity: 1
                },
                {
                    height: "0px",
                    opacity: 0
                }, ],
                {
                    duration: ms,
                    easing: "ease"
                },
            );
            
            el._anim.onfinish = () =>
            {
                el.style.display = "none";
                el.style.removeProperty("height");
                el.style.removeProperty("overflow");
                el.style.removeProperty("opacity");
                el._anim = null;
            };
            
            el._anim.oncancel = () =>
            {
                el._anim = null;
            };
        }
    }
    catch (e)
    {}
}

var __lastTagType = "";

function applySportUI()
{
    const sp = sport();
    if (sp !== __lastTagType)
    {
        __lastTagType = sp;
        try
        {
            window._kvRacketCtl && window._kvRacketCtl.reload();
        }
        catch (e)
        {}
        
        try
        {
            window._kvPatternCtl && window._kvPatternCtl.reload();
        }
        catch (e)
        {}
        
        try
        {
            window._kvStringCtl && window._kvStringCtl.reload();
        }
        catch (e)
        {}
    }
    const tensionEl = $("tension");
    const tensionSettingRow = document.getElementById("tensionSettingRow");
    const tensionNoteRow = document.getElementById("tensionNoteRow");

    if (!sp)
    {
        if (tensionSettingRow) _animShowHide(tensionSettingRow, false, 0);
        if (tensionNoteRow) _animShowHide(tensionNoteRow, false, 0);
        return;
    }
    else
    {
        if (tensionSettingRow) _animShowHide(tensionSettingRow, true, 0);
    }

    if (tensionEl)
    {
        if (sp === "tennis")
        {
            tensionEl.type = "text";
            tensionEl.removeAttribute("min");
            tensionEl.removeAttribute("max");
            tensionEl.removeAttribute("step");
            tensionEl.setAttribute("inputmode", "text");
            tensionEl.placeholder = "e.g. M/C";
        }
        else
        {
            tensionEl.type = "number";
            tensionEl.setAttribute("inputmode", "decimal");
            tensionEl.setAttribute("step", "0.5");
            tensionEl.setAttribute("min", "5");
            tensionEl.setAttribute("max", "90");
            tensionEl.placeholder = "";
        }
    }
    
    if (tensionNoteRow)
    {
        _animShowHide(tensionNoteRow, sp !== "tennis", 500);
    }
}

function dateFormat()
{
    const r = document.querySelector("input[name='dateFormat']:checked");
    return r ? r.value : "YMD";
}

function formatDateForQr(ymd, fmt)
{
    const s = (ymd || "").trim();
    
    if (!s) return "";
    
    const parts = s.split("-");
    
    if (parts.length !== 3) return s;
    
    const [Y, M, D] = parts;
    
    if (fmt === "DMY") return `${D}-${M}-${Y}`;
    if (fmt === "MDY") return `${M}-${D}-${Y}`;
    
    return `${Y}-${M}-${D}`;
}

function syncDatePickerDisplay()
{
    const d = $("date");
    const disp = $("dateDisplay");
    
    if (!d || !disp) return;

    const fmt = dateFormat();
    const v = (d.value || "").trim();

    if (v)
    {
        disp.textContent = formatDateForQr(v, fmt);
        disp.style.color = "var(--text)";
    }
    else
    {
        disp.textContent = fmt === "DMY" ? "DD-MM-YYYY" : fmt === "MDY" ? "MM-DD-YYYY" : "YYYY-MM-DD";
        disp.style.color = "var(--muted)";
    }
}

bindRequiredLive($("date"));
bindRequiredLive($("tension"));

try
{
    syncDatePickerDisplay();
    const d = $("date");
    
    if (d)
    {
        d.addEventListener("change", syncDatePickerDisplay);
        d.addEventListener("input", syncDatePickerDisplay);
    }
}
catch (e)
{}

try
{
    document.querySelectorAll("input[name='sport']").forEach((r) =>
    {
        r.addEventListener("change", () =>
        {
            applySportUI();

            try
            {
                $("qrCenter").textContent = ($("tension").value.trim() || "") + unit();
            }
            catch (e)
            {}
        });
    });
}
catch (e)
{}

(function()
{
    const d = $("date");
    if (!d || typeof d.showPicker !== "function") return;

    const open = function(e)
    {
        try
        {
            if (e && typeof e.preventDefault === "function") e.preventDefault();
            if (e && typeof e.stopPropagation === "function") e.stopPropagation();
            d.showPicker();
        }
        catch (err)
        {}
    };
    
    d.addEventListener("pointerdown", open,
    {
        passive: false
    });
    
    d.addEventListener("mousedown", open,
    {
        passive: false
    });

    d.addEventListener("click", function()
    {
        try
        {
            d.showPicker();
        }
        catch (err)
        {}
    });
})();

let _statusTimer = null;

function _hideStatus(el)
{
    if (!el) return;
    el.classList.remove("show");

    setTimeout(() =>
    {
        el.style.display = "none";
    }, 260);
}

function setStatus(ok, msg)
{
    const okEl = $("statusOk");
    const errEl = $("statusErr");

    okEl.textContent = "";
    errEl.textContent = "";
    okEl.style.display = "none";
    errEl.style.display = "none";
    okEl.classList.remove("show");
    errEl.classList.remove("show");

    const el = ok ? okEl : errEl;
    el.textContent = msg;
    el.style.display = "block";
    requestAnimationFrame(() => el.classList.add("show"));

    clearTimeout(_statusTimer);
    _statusTimer = setTimeout(() => _hideStatus(el), 3000);
}

function _nextFrame()
{
    return new Promise((r) => requestAnimationFrame(() => r()));
}

async function waitForQrReadyAndStatus()
{
    await _nextFrame();
    await _nextFrame();
    const start = Date.now();
    const timeoutMs = 8000;
    
    while (true)
    {
        const canvas = document.querySelector("#qrcode canvas");
        const ok = canvas && canvas.offsetWidth > 0 && canvas.offsetHeight > 0;
        
        if (ok) return;
        if (Date.now() - start > timeoutMs) return;
        
        await _nextFrame();
    }
}

function scrollToQrAfterSuccess()
{
    const target = document.getElementById("qrArea") || document.getElementById("qrcode");
    const okEl = document.getElementById("statusOk");
    
    if (!target) return;

    let tries = 0;
    const maxTries = 80;
    const timer = setInterval(() =>
    {
        tries++;
        const statusShown = !!(okEl && okEl.style.display !== "none" && okEl.classList.contains("show"));
        const qrEl =
            document.querySelector("#qrcode canvas, #qrcode img, #qrcode svg") ||
            target.querySelector("canvas, img, svg");
        const qrReady = !!(qrEl && qrEl.offsetWidth > 0 && qrEl.offsetHeight > 0);

        if (statusShown && qrReady)
        {
            clearInterval(timer);

            setTimeout(() =>
            {
                try
                {
                    target.scrollIntoView(
                    {
                        behavior: "smooth",
                        block: "start"
                    });
                    setTimeout(() =>
                    {
                        try
                        {
                            const tb = document.querySelector(".topbar");
                            if (tb)
                            {
                                const h = tb.getBoundingClientRect().height || 0;
                                window.scrollBy(
                                {
                                    top: -(h + 12),
                                    left: 0,
                                    behavior: "smooth"
                                });
                            }
                        }
                        catch (e)
                        {}
                    }, 250);
                }
                catch (e)
                {}
            }, 1000);
        }
        
        if (tries >= maxTries) clearInterval(timer);
    }, 100);
}

function scrollAfterGenerate()
{
    const isMobile = window.matchMedia && window.matchMedia("(max-width: 700px)").matches;
    
    try
    {
        if (isMobile)
        {
            window.scrollTo(
            {
                top: document.documentElement.scrollHeight,
                left: 0,
                behavior: "smooth"
            });
        }
        else
        {
            window.scrollTo(
            {
                top: 0,
                left: 0,
                behavior: "smooth"
            });
        }
    }
    catch (e)
    {
        if (isMobile)
        {
            window.scrollTo(0, document.documentElement.scrollHeight);
        }
        else
        {
            window.scrollTo(0, 0);
        }
    }
}

function lockFormAfterSave()
{
    const grid = document.getElementById("formGrid");
    
    if (!grid) return;
    
    const els = grid.querySelectorAll("input, select, textarea, button");
    
    els.forEach((el) =>
    {
        if (el.id === "saveBtn") return;

        if (el.classList && (el.classList.contains("clearBtn") || el.classList.contains("clear-btn")))
        {
            el.disabled = true;
            return;
        }
        
        if (el.type === "button" || el.tagName === "BUTTON") return;
        el.disabled = true;
    });

    const radios = grid.querySelectorAll('input[type="radio"]');
    radios.forEach((r) => (r.disabled = true));

    grid.classList.add("locked");
}

function _setLoadingOverlay(show, text)
{
    try
    {
        var ov = document.getElementById("loadingOverlay");
        
        if (!ov) return;
        
        var t = document.getElementById("loadingOverlayText");
        
        if (t)
        {
            t.textContent =
                typeof text === "string" && text.trim() ?
                text :
                window.i18n ?
                i18n.t("msg_loading", "Loading…") :
                "Loading…";
        }
        
        if (show)
        {
            ov.style.display = "flex";
            ov.setAttribute("aria-hidden", "false");
        }
        else
        {
            ov.style.display = "none";
            ov.setAttribute("aria-hidden", "true");
        }
    }
    catch (e)
    {}
}

async function save()
{
    let _savedOk = false;

    const dateEl = $("date");
    const tensionEl = $("tension");
    const missing = [];
    const sportEl = document.querySelector('input[name="sport"]:checked');
    
    if (!sportEl)
    {
        missing.push(window.i18n ? i18n.t("field_sport") : "Sport");
        
        try
        {
            document.getElementById("sportRow").scrollIntoView(
            {
                block: "center"
            });
        }
        catch (e)
        {}
    }
    
    if (!dateEl.value)
    {
        missing.push(window.i18n ? i18n.t("label_date") : "Stringing date");
        dateEl.focus();
    }
    else if (!tensionEl.value.trim())
    {
        missing.push(window.i18n ? i18n.t("label_tension") : "Tension setting");
        tensionEl.focus();
    }
    
    if (missing.length)
    {
        const sep = window.i18n && i18n.getLang && i18n.getLang() === "zh-TW" ? "、" : ", ";
        setStatus(
            false,
            window.i18n ?
            i18n.t("msg_fill_required",
            {
                fields: missing.join(sep)
            }) :
            "Please fill required fields: " + missing.join(sep),
        );
        return;
    }
    
    $("saveBtn").disabled = true;
    _setLoadingOverlay(true, window.i18n ? i18n.t("msg_generating", "Generating…") : "Generating…");
    
    try
    {
        const dateIso = $("date").value;
        const dateFmt = (document.querySelector('input[name="dateFormat"]:checked') || {}).value || "YMD";

        try
        {
            const cfg = await _loadPublicConfig();
            const rawNeed = cfg ? cfg.createPassRequired : false;
            const need = rawNeed === true || rawNeed === 1 || rawNeed === "1" || rawNeed === "true";

            if (need)
            {
                try
                {
                    const probe = await fetch(window.API_BASE + "/api/tagid/check" + _langQS(),
                    {
                        method: "POST",
                        headers:
                        {
                            "Content-Type": "application/json",
                            Accept: "application/json"
                        },
                        body: JSON.stringify(
                        {
                            create_password: ""
                        }),
                    });
                    
                    if (probe.ok)
                    {
                        __setCreatePass("");
                    }
                }
                catch (e)
                {}
            }

            if (need && !(await _verifyCreatePass("")) && !__getCreatePass().trim())
            {
                _showPromptPassword(
                    __t("create_tag_pass_title", "Create Tag Password"),
                    __t("create_tag_pass_body", "Create password is required to create a new Tag ID."),
                    async function(pass, errEl)
                    {
                        const ok = await _verifyCreatePass(pass);
                        
                        if (!ok)
                        {
                            if (errEl)
                            {
                                errEl.textContent = __t("msg_password_incorrect", "Password incorrect.");
                                errEl.style.display = "block";
                            }
                            return false;
                        }
                        
                        __setCreatePass(pass);
                        
                        try
                        {
                            document.getElementById("saveBtn").click();
                        }
                        catch (e)
                        {}
                        
                        return true;
                    },
                );
                
                return;
            }
        }
        catch (e)
        {}
        
        const payload = {
            owner: $("owner").value.trim(),
            date: dateIso,
            date_format: dateFmt,
            sport: sport(),
            tension_setting: $("tension").value.trim(),
            tension_unit: unit(),
            tension_note: $("tension_note").value.trim(),
            pattern: $("pattern").value.trim(),
            prestretch: $("prestretch").value.trim(),
            racket_info: $("racket_info").value.trim(),
            racket_serial: $("racket_serial").value.trim(),
            string_info: $("string_info").value.trim(),
            grommet: $("grommet").value.trim(),
            machine: $("machine").value.trim(),
            stringer: $("stringer").value.trim(),
            fee: $("fee").value.trim(),
            video: $("video").value.trim(),
            note: $("note").value.trim(),
            delpass: $("delpass") ? $("delpass").value.trim() : "",
        };

        payload.create_password = __getCreatePass();

        const S = window.api && api.sanitize ? api.sanitize : null;

        function normText(id, maxLen)
        {
            const el = $(id);
            
            if (!el) return "";
            
            const v = S ?
                S.normalizeText(el.value, maxLen) :
                String(el.value || "")
                .trim()
                .slice(0, maxLen);
            el.value = v;
            
            return v;
        }

        function normMultiline(id, maxLen)
        {
            const el = $(id);
            
            if (!el) return "";
            
            const v = S ?
                S.normalizeMultiline(el.value, maxLen) :
                String(el.value || "")
                .trim()
                .slice(0, maxLen);
            el.value = v;
            return v;
        }

        function normUrl(id, maxLen)
        {
            const el = $(id);
            
            if (!el) return "";
            
            const raw = String(el.value || "").trim();
            
            if (!raw)
            {
                el.value = "";
                return "";
            }
            
            const v = S ? S.normalizeHttpUrl(raw, maxLen) : raw.slice(0, maxLen);
            
            if (!v)
            {
                throw new Error(window.i18n ? i18n.t("err_invalid_url") : "Invalid URL. Please use http/https.");
            }
            
            el.value = v;
            
            return v;
        }

        payload.owner = normText("owner", 40);
        payload.tension_setting = normText("tension", 10);

        if (sport() !== "tennis")
        {
            (function()
            {
                const el = $("tension");
                
                if (!el) return;
                
                let raw = String(el.value || "").trim();
                
                if (raw.includes(",")) raw = raw.replace(",", ".");

                const re1 = /^\d+(?:\.\d)?$/;
                
                if (!re1.test(raw))
                {
                    setStatus(
                        false,
                        window.i18n ?
                        i18n.t("msg_invalid_tension") :
                        "Invalid tension. Use 5~90 with at most 1 decimal (e.g. 25 or 25.5).",
                    );
                    
                    el.focus();
                    $("saveBtn").disabled = false;
                    
                    throw new Error("__VALIDATION__");
                }
                const num = Number(raw);
                if (!Number.isFinite(num) || num < 5 || num > 90)
                {
                    setStatus(
                        false,
                        window.i18n ?
                        i18n.t("msg_invalid_tension") :
                        "Invalid tension. Use 5~90 with at most 1 decimal (e.g. 25 or 25.5).",
                    );
                    
                    el.focus();
                    $("saveBtn").disabled = false;
                    
                    throw new Error("__VALIDATION__");
                }

                el.value = raw;
                payload.tension_setting = raw;
            })();
        }

        payload.tension_note = sport() === "tennis" ? "" : normText("tension_note", 60);
        payload.pattern = normText("pattern", 40);
        payload.prestretch = normText("prestretch", 20);
        payload.racket_info = normText("racket_info", 60);
        payload.racket_serial = normText("racket_serial", 40);

        if (payload.racket_serial)
        {
            const rawSerial = String(payload.racket_serial).trim();
            const reSerial = /^[A-Za-z0-9]{6,16}$/;
            
            if (!reSerial.test(rawSerial))
            {
                setStatus(
                    false,
                    window.i18n ?
                    i18n.t("msg_invalid_serial") :
                    "Invalid racket serial. Use 6~16 letters/numbers only.",
                );
                
                const el = $("racket_serial");
                
                if (el) el.focus();
                
                $("saveBtn").disabled = false;
                
                throw new Error("__VALIDATION__");
            }
            const n = rawSerial.length;
            const mid = Math.floor((n - 1) / 2);
            const masked = rawSerial.slice(0, mid) + "**" + rawSerial.slice(mid + 2);
            payload.racket_serial = masked;
        }
        
        payload.string_info = normText("string_info", 60);
        payload.grommet = normText("grommet", 40);
        payload.machine = normText("machine", 40);
        payload.stringer = normText("stringer", 40);
        payload.fee = normText("fee", 20);
        payload.video = $("video") ? (String($("video").value || "").trim() ? normUrl("video", 300) : "") : "";
        payload.note = normMultiline("note", 500);
        payload.delpass = normText("delpass", 12);
        let viewProtect = false;
        
        try
        {
            viewProtect = !!($("viewProtect") && $("viewProtect").checked);
        }
        catch (e)
        {}
        
        if (viewProtect && !payload.delpass)
        {
            setStatus(
                false,
                window.i18n ?
                i18n.t("msg_viewprotect_need_password") :
                "Please set a delete/view password to enable view protection.",
            );
            
            const el = $("delpass");
            
            if (el) el.focus();
            
            $("saveBtn").disabled = false;
            
            throw new Error("__VALIDATION__");
        }
        
        if (payload.delpass)
        {
            const rawPass = String(payload.delpass).trim();
            const rePass = /^[A-Za-z0-9]{4,12}$/;
            
            if (!rePass.test(rawPass))
            {
                setStatus(
                    false,
                    window.i18n ?
                    i18n.t("msg_invalid_delpass") :
                    "Invalid delete/view password. Use 4~12 letters/numbers only.",
                );
                
                const el = $("delpass");
                
                if (el) el.focus();
                
                $("saveBtn").disabled = false;
                
                throw new Error("__VALIDATION__");
            }
            payload.delpass = rawPass;
            payload.view_protect = viewProtect;
        }
        else
        {
            payload.delpass = "";
            payload.view_protect = false;
        }

        if (sport() !== "tennis")
        {
            if (S)
            {
                const tn = S.parseNumber(payload.tension_setting);
                
                if (!S.validateRange(tn, 1, 80))
                {
                    throw new Error(
                        window.i18n ?
                        i18n.t("err_invalid_tension") :
                        "Invalid tension. Please enter a number between 1 and 80.",
                    );
                }

                payload.tension_setting = (Math.round(tn * 10) / 10).toString();
                $("tension").value = payload.tension_setting;
            }
            else
            {
                const tn = Number(payload.tension_setting);
                if (!Number.isFinite(tn) || tn < 1 || tn > 80) throw new Error("Invalid tension.");
            }
        }

        if (!payload.date) throw new Error(window.i18n ? i18n.t("msg_select_date") : "Please select a stringing date");
        
        if (!payload.tension_setting)
            throw new Error(window.i18n ? i18n.t("msg_enter_tension") : "Please enter tension setting");
        
        if (sport() !== "tennis")
        {
            if (!isValidTension(payload.tension_setting))
                throw new Error(window.i18n ? i18n.t("msg_invalid_tension") : "Please enter a valid tension value");
        }
        
        if (payload.video && !isValidHttpUrl(payload.video))
            throw new Error(window.i18n ? i18n.t("msg_invalid_url") : "Invalid URL format");

        const res = await fetch(window.API_BASE + "/api/new" + _langQS(),
        {
            method: "POST",
            credentials: "include",
            headers:
            {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify(payload),
        });
        
        const out = await res.json().catch(() => null);
        
        if (!res.ok)
        {
            try
            {
                if (window.i18n && out && out.errorKey)
                {
                    if (out.errorKey === "err_field_too_long" && out.fieldLabelKey)
                    {
                        const fld = i18n.t(out.fieldLabelKey);
                        
                        throw new Error(i18n.t(out.errorKey,
                        {
                            field: fld,
                            max: out.max
                        }));
                    }
                    throw new Error(i18n.t(out.errorKey, out.vars || {}));
                }
            }
            catch (e)
            {
                throw e;
            }
            throw new Error(out?.error || "儲存失敗 HTTP " + res.status);
        }

        _setLoadingOverlay(false);

        const id = out.id;
        const url = `${location.origin}/?id=${id}`;

        $("copyBtn").style.display = "inline-flex";
        
        try
        {
            $("openUrlBtn").style.display = "inline-flex";
        }
        catch (e)
        {}
        
        try
        {
            $("shareBtnNew").style.display = "inline-flex";
        }
        catch (e)
        {}
        
        try
        {
            $("printTagBtn").style.display = "inline-flex";
        }
        catch (e)
        {}
        
        _syncBtnsLater();
        
        $("copyBtn").onclick = async () =>
        {
            await navigator.clipboard.writeText(url);
            $("copyBtn").textContent = window.i18n ? i18n.t("btn_copied") : "Copied";
            setTimeout(() =>
            {
                $("copyBtn").textContent = window.i18n ? i18n.t("btn_copy") : "Copy URL";
            }, 1200);
        };
        
        try
        {
            $("openUrlBtn").onclick = () =>
            {
                try
                {
                    window.open(url, "_blank", "noopener");
                }
                catch (e)
                {
                    window.open(url, "_blank");
                }
            };

            try
            {
                $("printTagBtn").onclick = () =>
                {
                    var printUrl = url;
                    try
                    {
                        var u = new URL(url);
                        u.searchParams.set("autoprint", "1");
                        printUrl = u.toString();
                    }
                    catch (e)
                    {
                        printUrl = url + (url.indexOf("?") >= 0 ? "&" : "?") + "autoprint=1";
                    }
                    try
                    {
                        window.open(printUrl, "_blank", "noopener");
                    }
                    catch (e)
                    {
                        window.open(printUrl, "_blank");
                    }
                };
            }
            catch (e)
            {}
        }
        catch (e)
        {}
        
        try
        {
            $("shareBtnNew").onclick = async () =>
            {
                var title = "PicoTag - " + id;
                var text = "PicoTag - Tag ID: " + id;
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
                
                try
                {
                    await navigator.clipboard.writeText(url);
                }
                catch (e)
                {}
                
                try
                {
                    $("shareBtnNew").classList.add("copied");
                    setTimeout(() =>
                    {
                        $("shareBtnNew").classList.remove("copied");
                    }, 900);
                }
                catch (e)
                {}
            };
        }
        catch (e)
        {}
        
        $("bigUrl").textContent = url;
        $("savedId").textContent = `ID: ${id}`;
        window._lastSavedId = id;
        $("qrCenter").textContent = (payload.tension_setting || "") + payload.tension_unit;
        $("qrArea").style.display = "grid";
        window._qrSuggestedFilename = `qr_${id}.png`;
        
        await ensureLabelFontLoaded();
        renderQrLabel(
            url,
            (payload.tension_setting || "") + payload.tension_unit,
            formatDateForQr($("date").value, dateFormat()),
            id,
        );

        _savedOk = true;
        document.getElementById("disclaimerBox").style.display = "none";
        $("saveBtn").disabled = true;
        lockFormAfterSave();
        setStatus(true, window.i18n ? i18n.t("msg_save_success") : "Saved successfully");
        scrollAfterGenerate();
    }
    catch (e)
    {
        try
        {
            if (e && e.message === "__VALIDATION__")
            {
                return;
            }
            
            if (e && typeof e.message === "string" && e.message.trim())
            {
                setStatus(false, e.message);
                return;
            }
            
            setStatus(false, window.i18n ? i18n.t("msg_save_failed") : "Save failed");
        }
        catch (_)
        {}
    }
    finally
    {
        _setLoadingOverlay(false);
        try
        {
            $("saveBtn").disabled = false;
        }
        catch (_)
        {}
    }
}

function setupViewProtectToggle()
{
    try
    {
        const dp = document.getElementById("delpass");
        const vp = document.getElementById("viewProtect");
        
        if (!dp || !vp) return;

        function sync()
        {
            const has = (dp.value || "").trim().length > 0;
            const lbl = vp.closest(".vp-check");
            
            if (!has)
            {
                vp.checked = false;
                vp.disabled = true;
                if (lbl) lbl.classList.add("is-disabled");
            }
            else
            {
                vp.disabled = false;
                if (lbl) lbl.classList.remove("is-disabled");
            }
        }
        dp.addEventListener("input", sync);
        dp.addEventListener("change", sync);

        sync();
    }
    catch (e)
    {}
}

$("saveBtn").addEventListener("click", save);
$("tension").addEventListener("input", () =>
{
    if ($("qrArea").style.display === "grid")
    {
        $("qrCenter").textContent = ($("tension").value.trim() || "") + unit();
        ensureLabelFontLoaded().then(() =>
        {
            renderQrLabel(
                $("bigUrl").textContent,
                ($("tension").value.trim() || "") + unit(),
                formatDateForQr($("date").value, dateFormat()),
                window._lastSavedId || "",
            );
        });
    }
});

$("date").addEventListener("change", () =>
{
    if ($("qrArea").style.display === "grid")
    {
        $("qrCenter").textContent = ($("tension").value.trim() || "") + unit();
        ensureLabelFontLoaded().then(() =>
        {
            renderQrLabel(
                $("bigUrl").textContent,
                ($("tension").value.trim() || "") + unit(),
                formatDateForQr($("date").value, dateFormat()),
                window._lastSavedId || "",
            );
        });
    }
});

document.querySelectorAll("input[name='unit']").forEach((r) =>
    r.addEventListener("change", () =>
    {
        if ($("qrArea").style.display === "grid")
        {
            $("qrCenter").textContent = ($("tension").value.trim() || "") + unit();
            
            ensureLabelFontLoaded().then(() =>
            {
                renderQrLabel(
                    $("bigUrl").textContent,
                    ($("tension").value.trim() || "") + unit(),
                    formatDateForQr($("date").value, dateFormat()),
                    window._lastSavedId || "",
                );
            });
        }
        saveFormCookie();
    }),
);

document.querySelectorAll("input[name='dateFormat']").forEach((r) =>
    r.addEventListener("change", () =>
    {
        try
        {
            syncDatePickerDisplay();
        }
        catch (e)
        {}
        
        if ($("qrArea").style.display === "grid")
        {
            $("qrCenter").textContent = ($("tension").value.trim() || "") + unit();
            ensureLabelFontLoaded().then(() =>
            {
                renderQrLabel(
                    $("bigUrl").textContent,
                    ($("tension").value.trim() || "") + unit(),
                    formatDateForQr($("date").value, dateFormat()),
                    window._lastSavedId || "",
                );
            });
        }
        saveFormCookie();
    }),
);

function bindKvSuggest(inputId, kvKey)
{

    var HIDE_EMPTY_DROPDOWN =
        inputId === "racket_info" ||
        inputId === "pattern" ||
        inputId === "string_info" ||
        inputId === "machine" ||
        inputId === "stringer";

    var _kvGetter =
        typeof kvKey === "function" ?
        kvKey :
        function()
        {
            return kvKey;
        };
        
    var input = document.getElementById(inputId);
    if (!input) return;

    var LOADED = false;
    var LOADING = false;
    var LIST = null;

    var box = document.createElement("div");
    box.className = "suggestBox suggestBoxFloating";
    document.body.appendChild(box);
    box.style.display = "none";

    function positionBox()
    {
        try
        {
            var r = input.getBoundingClientRect();
            box.style.position = "absolute";
            box.style.left = window.scrollX + r.left + "px";
            box.style.top = window.scrollY + r.bottom + 6 + "px";
            box.style.width = r.width + "px";
        }
        catch (e)
        {}
    }

    function esc(s)
    {
        return String(s || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function highlight(t, q)
    {
        var tl = t.toLowerCase(),
            ql = q.toLowerCase();
        var i = tl.indexOf(ql);
        if (i < 0) return esc(t);
        return (
            esc(t.slice(0, i)) +
            '<mark class="match">' +
            esc(t.slice(i, i + q.length)) +
            "</mark>" +
            esc(t.slice(i + q.length))
        );
    }

    function hide()
    {
        box.style.display = "none";
        box.innerHTML = "";
    }

    function show(q)
    {
        if (!LIST)
        {
            hide();
            return;
        }
        
        var q2 = q.trim();
        
        if (!q2)
        {
            hide();
            return;
        }
        
        var ql = q2.toLowerCase();
        var m = [];
        
        for (var i = 0; i < LIST.length; i++)
        {
            var k = LIST[i];
            var p = k.toLowerCase().indexOf(ql);
            if (p >= 0) m.push(
            {
                k: k,
                p: p
            });
        }
        
        if (!m.length)
        {
            if (HIDE_EMPTY_DROPDOWN)
            {
                hide();
                return;
            }
            box.innerHTML = '<div class="suggestEmpty">no matches</div>';
            positionBox();
            box.style.display = "block";
            return;
        }
        
        m.sort(function(a, b)
        {
            return a.p - b.p || a.k.localeCompare(b.k);
        });
        
        var html = "";
        
        for (var j = 0; j < Math.min(12, m.length); j++)
        {
            html += '<div class="suggestItem" data-v="' + esc(m[j].k) + '">' + highlight(m[j].k, q2) + "</div>";
        }
        
        box.innerHTML = html;
        positionBox();
        box.style.display = "block";
    }

    async function ensure()
    {
        if (LOADED || LOADING) return;
        LOADING = true;
        
        try
        {
            var curKey = String(_kvGetter() || "").trim();
            
            if (!curKey)
            {
                LIST = [];
            }
            else
            {
                if (curKey !== (ensure._lastKey || ""))
                {
                    LIST = null;
                    LOADED = false;
                    ensure._lastKey = curKey;
                }
                var obj = await window.api.fetchJSON("api/r/" + curKey);
            }
            
            LIST = Object.keys(obj || {}).sort(function(a, b)
            {
                return a.localeCompare(b);
            });
        }
        catch (e)
        {
            LIST = [];
        }
        
        LOADED = true;
        LOADING = false;
    }

    var timer = null;
    input.addEventListener("input", function()
    {
        if (timer) clearTimeout(timer);
        
        timer = setTimeout(function()
        {
            var v = input.value || "";
            
            if (!v)
            {
                hide();
                return;
            }
            
            if (!LOADED)
            {
                ensure().then(function()
                {
                    show(input.value || "");
                });
            }
            else show(input.value || "");
            
        }, 120);
    });

    input.addEventListener("focus", function()
    {
        var v = input.value || "";
        
        if (!v) return;
        if (!LOADED)
        {
            ensure().then(function()
            {
                show(input.value || "");
            });
        }
        else show(input.value || "");
    });

    input.addEventListener("blur", function()
    {
        setTimeout(hide, 160);
    });

    box.addEventListener("mousedown", function(ev)
    {
        var t = ev.target;
        
        while (t && t !== box && !t.classList.contains("suggestItem")) t = t.parentNode;
        
        if (t && t.classList.contains("suggestItem"))
        {
            ev.preventDefault();
            input.value = t.getAttribute("data-v") || t.textContent || "";
            
            hide();
            
            try
            {
                input.blur();
            }
            catch (e)
            {}
        }
    });

    window.addEventListener("resize", function()
    {
        if (box.style.display === "block") positionBox();
    });
    
    window.addEventListener(
        "scroll",
        function()
        {
            if (box.style.display === "block") positionBox();
        },
        true,
    );

    return {
        reload: function()
        {
            LOADED = false;
            LOADING = false;
            LIST = null;
            ensure._lastKey = "";
        },
        setKey: function(fn)
        {
            if (typeof fn === "function")
            {
                _kvGetter = fn;
            }
            this.reload();
        },
    };
}

function _tagTypeIsTennis()
{
    try
    {
        var el = document.querySelector("input[name=\'sport\']:checked");
        var v = el ? String(el.value || "").trim() : "";
        
        return v === "tennis";
    }
    catch (e)
    {
        return false;
    }
}

window._kvRacketCtl = bindKvSuggest("racket_info", function()
{
    return _tagTypeIsTennis() ? "_RACKET_T" : "_RACKET";
});

window._kvPatternCtl = bindKvSuggest("pattern", function()
{
    return _tagTypeIsTennis() ? "_PATTERN_T" : "_PATTERN";
});

window._kvStringCtl = bindKvSuggest("string_info", function()
{
    return _tagTypeIsTennis() ? "_STRING_T" : "_STRING";
});

bindKvSuggest("machine", "_MACHINE");
bindKvSuggest("stringer", "_STRINGER");
