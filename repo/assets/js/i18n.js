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

function picotagGetConsent()
{
    return picotagGetCookie("picotag_cookie_consent");
}

function picotagCanStore()
{
    return picotagGetConsent() === "ok";
}

(function()
{
    const SUPPORTED_LANGS = [
        "da",
        "de",
        "en",
        "fil",
        "fr",
        "hi",
        "id",
        "ja",
        "ko",
        "ms",
        "ta",
        "th",
        "vi",
        "zh-CN",
        "zh-TW",
    ];
    
    const _SUPPORTED_LC = (function()
    {
        const s = new Set();
        for (let i = 0; i < SUPPORTED_LANGS.length; i++) s.add(String(SUPPORTED_LANGS[i]).toLowerCase());
        return s;
    })();

    function normalizeLang(code)
    {
        const c = String(code || "").trim();
        if (!c) return "";
        const lc = c.toLowerCase();

        if (lc === "zh-tw" || lc === "zh-hant" || lc.startsWith("zh-hant-")) return "zh-TW";
        if (lc === "zh-cn" || lc === "zh-hans" || lc.startsWith("zh-hans-")) return "zh-CN";

        if (lc === "zh") return "zh-TW";

        return lc;
    }

    function isSupportedLang(code)
    {
        const n = normalizeLang(code);
        if (!n) return false;
        return _SUPPORTED_LC.has(String(n).toLowerCase());
    }

    const FALLBACK_EN = {
        msg_loading: "Loading…",
        msg_generating: "Generating…",
        field_delpass: "Delete/View/Remarks password",

        field_sport: "Tag Type",
        btn_share: "Share",
        btn_print: "Print",
        sport_badminton_label: "Badminton",
        sport_tennis_label: "Tennis",
        optional_badge: "Optional",
        ph_delpass: "4-12 letters/numbers",
        msg_invalid_delpass: "Invalid delete/view password. Use 4~12 letters/numbers only.",
        view_delete_title: "Delete Tag",
        view_delete_hint: "If you set a delete password when creating this tag, you can delete it here.",
        btn_delete_tag: "Delete",
        btn_cancel: "Cancel",
        btn_confirm: "Confirm",
        modal_confirm_delete_title: "Confirm delete",
        modal_confirm_delete_body: "Delete Tag ID: {id} ?\nThis action cannot be undone.",
        msg_password_required: "Please enter password.",
        msg_password_incorrect: "Password incorrect.",
        create_tag_pass_title: "Create Tag Password",
        create_tag_pass_body: "Create password is required to create a new Tag ID.",
        msg_delete_success: "Deleted successfully.",
        msg_delete_failed: "Delete failed ({status}).",
        msg_delete_success_home: "Deleted successfully. Please create a new tag or search another one.",
        lang_label: "Language",
        lang_en: "English",
        lang_zh_hant: "繁體中文",
        view_page_title: "PicoTag · View",
        admin_page_title: "PicoTag · New Tag",
        view_h1: "Stringing Info",
        footer_title: "PicoTag - Stringing Info",
        footer_open_source: "Open-source project:",
        default_owner: "Racket",
        ph_no_personal: "No personal info.",
        ph_no_personal_nickname: "Use a nickname. Do not enter personal info.",
        view_doc_title: "{{owner}} · Stringing Info",
        view_tag_record_title: "Tag ID: {id} · Stringing Info",
        view_title_id: "Tag ID: {id}",
        view_title_sub: "Stringing Info",
        label_owner: "Tag name",
        label_date: "Stringing date",
        label_tension: "Tension setting",
        label_tension_note: "Tension note",
        label_pattern: "Pattern",
        label_prestretch: "Pre-stretch",
        label_racket_info: "Racket model",
        label_racket_serial: "Racket serial",
        label_string_info: "String",
        label_grommet: "Grommets",
        label_machine: "Machine",
        label_stringer: "Stringer",
        label_fee: "Fee",
        label_video: "Photo/Video",
        label_note: "Notes",
        label_sport: "Sport",
        label_date_format: "Date format",
        label_delpass: "Delete password",
        copy_url_title: "Copy URL",
        btn_copied: "Copied",
        admin_new_h1: "PicoTag - New Stringing Record",
        required_badge: "Required",
        field_owner: "Tag name",
        field_date: "Stringing date",
        field_tension: "Tension setting",
        field_tension_note: "Tension note",
        field_prestretch: "Pre-stretch",
        field_pattern: "Pattern",
        field_string_info: "String",
        field_racket_info: "Racket model",
        field_racket_serial: "Racket serial",
        field_grommet: "Grommets",
        field_machine: "Machine",
        field_stringer: "Stringer",
        field_fee: "Fee",
        field_video: "Photo/Video",
        field_note: "Notes",
        datefmt_ymd: "YYYY-MM-DD",
        datefmt_dmy: "DD-MM-YYYY",
        datefmt_mdy: "MM-DD-YYYY",
        ph_tension_note: "e.g. M(V):25 / C(H):27-25",
        ph_prestretch: "e.g. 10% | M(V):0% / C(H):10%",
        ph_grommet: "No change | Replace all | Replace single/shared holes",
        ph_video: "e.g. https://youtu.be/...",
        btn_save: "Generate Tag ID & QR Code",
        btn_copy: "Copy URL",
        btn_open_tag: "Open Tag",
        btn_share_link: "Share Link",
        btn_print_tag: "Print Tag",
        btn_download_qr: "Download QR Code Label",
        btn_show_qr: "Show QR Code",
        btn_hide_qr: "Hide QR Code",
        disc_title: "Notes / Disclaimer",
        disc_1: "This page is for creating and sharing PicoTag stringing info. Please verify the content yourself.",
        disc_2: "The share link is a public URL. Do not include personal data (real name, phone, email, address, social accounts). Use an alias/code if needed.",
        disc_3: "Please avoid uploading or linking content that may contain personal data (faces, phone numbers, chat screenshots, receipts, shipping labels, license plates).",
        disc_4: "Photo/video links are provided by users. Please ensure the source is safe before opening.",
        disc_5: "Data persistence is not guaranteed. Please back up important information yourself.",
        disc_6: "Labels/QR codes generated here are for identification/query only and do not imply warranty or liability.",
        disc_7: 'If you are not sure how to fill in professional fields, you can fill in only "Tension" and describe the rest in "Notes".',
        disc_8: "If you want any content removed, please contact the site owner with the Tag ID / link.",

        disc_terms: 'Please make sure you’ve read the <a href="https://github.com/206cc/PicoTag/blob/main/NOTICE.md" target="_blank" rel="noopener">Terms &amp; Data Notice</a> before creating a Tag ID.',
        disc_9: "This site may remove or anonymize content that appears to include personal data.",
        saved_badge: "Saved",
        unsaved_changes: "Unsaved changes",
        unsaved_changes_hint: "You have unsaved changes. Click Save to apply.",
        share_link: "Share link",
        err_missing_id: "Invalid ID",
        err_invalid_id: "Invalid ID",
        err_not_found: "Invalid ID",
        err_fetch_failed: "Fetch failed: HTTP {status}",
        err_too_many_requests: "Too many requests. Please try again later.",
        msg_fill_required: "Please fill required fields: {fields}",
        msg_select_date: "Please select a stringing date",
        msg_enter_tension: "Please enter tension setting",
        msg_invalid_tension: "Please enter a valid tension value",
        msg_invalid_serial: "Invalid racket serial. Use 6~16 letters/numbers only.",
        msg_invalid_url: "Invalid URL format",
        msg_save_failed_http: "Save failed HTTP {status}",
        msg_save_success: "Saved successfully",
        btn_clear: "Clear",
        view_empty_title: "Search Stringing Info",
        view_empty_hint: "Enter your 8‑character Tag ID below to view the stringing record.",
        view_id_label: "Tag ID",
        btn_open_record: "Open",
        btn_go_new: "Create a New Tag",
        view_intro_html: '<div class="intro-wrap"><div class="intro-block"><div class="intro-title">For stringers</div><div class="intro-text">Create a PicoTag QR Code tag and stick it on the racket butt so players can look up the stringing info.</div></div><div class="intro-divider"></div><div class="intro-block"><div class="intro-title">For racket owners</div><div class="intro-text">Record your setup and feel changes. View and share anytime — and share with your stringer when needed.</div></div></div>',
        new_usage_html: '<div class="intro-wrap"><div class="intro-block"><div class="intro-title">How stringers use it</div><div class="intro-text">Print the QR label and stick it on the racket. If you have a label printer, download the image and print it on ~18mm tape. Otherwise, tap “Print Tag” to print on a normal printer, then cut out the bottom-right QR code and attach it. Badminton: butt cap. Tennis: inside the throat. Scan to see the stringing info.</div></div><div class="intro-divider"></div><div class="intro-block"><div class="intro-title">How racket owners use it</div><div class="intro-text">Tap “Share Link” to send details to your stringer when needed. Tap “Print Tag” to attach a label to your racket. Use “Remarks” to track setup and feel changes over time.</div></div></div>',
        cookie_title: "Cookie notice",
        cookie_text: "We use cookies (and similar storage) for essential site functionality and convenience features like remembering preferences and pre-filling forms. No data is used for advertising purposes.",
        cookie_accept: "Accept",
        cookie_reject: "Reject",

        cookie_cancel: "Cancel",
        err_invalid_url: "Invalid URL. Please use http/https.",
        err_field_too_long: "“{field}” is too long (max {max} characters).",
        err_field_invalid_chars: "“{field}” contains invalid characters.",
        msg_delete_success_with_id: "Tag ID: {id} deleted successfully.",
        msg_delete_success_toast: "Deleted successfully.",
        view_protect_label: "View protection",
        msg_viewprotect_need_password: "Please set a delete/view password to enable view protection.",
        msg_view_password_prompt: "This tag is protected. Please enter password to view.",

        disc_title: "Notes / Disclaimer",
        nd_1: "This page shows stringing info shared by users/stringers. Content may be inaccurate and is not guaranteed.",
        nd_2: "Photo/Video links are user-provided and may lead to third-party sites. Open only if you trust the source.",
        nd_3: "The info and labels/QR code are for identification/reference only and do not imply warranty or liability.",
        nd_4: "To remove this Tag, use the Delete Password set when the Tag was created. If you don’t have the password, please provide the Tag ID/link and contact the site owner for assistance.",
        nd_5: "Data persistence is not guaranteed. Please back up important information yourself.",

        nd_terms: 'Please read the <a href="https://github.com/206cc/PicoTag/blob/main/NOTICE.md" target="_blank" rel="noopener">Terms &amp; Data Notice</a> for data handling and responsibility.',
        msg_deleted_success_with_id: "Tag ID: {id} deleted successfully.",
        admin_records_db_total: "Database total: {n} records",

        label_remarks: "Remarks",
        view_remark_title: "Add Remark",
        ph_remark: "Write your remark here...",
        view_remark_hint: "Remarks are notes you add later. Each remark is saved with a timestamp and appended to the record. If you set a remark password when creating this tag, you can add remarks here.",
        btn_submit_remark: "Submit Remark",
        msg_remark_success: "Remark saved.",
        msg_remark_failed: "Failed to save remark.",
    };
    
    const I18N_BASE = "/i18n/";
    const VERSION = "v1";

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
    
    const COOKIE_KEY = "picotag_lang";

    function hasLangOption(sel, lang)
    {
        if (!sel) return true;
        const v = String(lang || "");
        try
        {
            for (let i = 0; i < sel.options.length; i++)
            {
                if (String(sel.options[i].value) === v) return true;
            }
        }
        catch (e)
        {}
        
        return false;
    }

    async function fetchPublicConfig()
    {
        const urls = ["/api/config/public"];
        try
        {
            if (window.api && typeof window.api.buildUrl === "function")
            {
                urls.push(window.api.buildUrl("api/config/public"));
            }
        }
        catch (e)
        {}

        for (const u of urls)
        {
            try
            {
                const res = await fetch(u,
                {
                    method: "GET",
                    cache: "no-store"
                });
                if (!res.ok) continue;
                const data = await res.json().catch(() => null);
                if (data) return data;
            }
            catch (e)
            {}
        }
        
        return null;
    }

    async function resolveInitialLang(sel)
    {
        let lang = "";
        try
        {
            if (!String(location.pathname || "").startsWith("/admin/"))
            {
                lang = String(getCookie(COOKIE_KEY) || "").trim();
            }
        }
        catch (e)
        {
            lang = "";
        }
        if (lang)
        {
            lang = normalizeLang(lang);
            if (!isSupportedLang(lang)) lang = "en";
            if (!hasLangOption(sel, lang)) lang = "en";
            return lang;
        }

        let envLang = "";
        try
        {
            const cfg = await fetchPublicConfig();
            if (cfg && cfg.defaultLang != null) envLang = String(cfg.defaultLang || "").trim();
        }
        catch (e)
        {}
        
        if (!envLang) envLang = "en";
        
        envLang = normalizeLang(envLang);
        
        if (!isSupportedLang(envLang)) envLang = "en";
        if (!hasLangOption(sel, envLang)) envLang = "en";
        
        return envLang;
    }

    function getCookie(name)
    {
        const m = document.cookie.match(
            new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, "\\$1") + "=([^;]*)"),
        );
        return m ? decodeURIComponent(m[1]) : "";
    }

    function setCookie(name, value, days)
    {
        const maxAge = days ? "; max-age=" + days * 86400 : "";
        document.cookie = name + "=" + encodeURIComponent(value) + maxAge + "; path=/; samesite=lax";
    }

    let currentLang = "en";
    let dict = Object.assign({}, FALLBACK_EN);

    function tpl(str, vars)
    {
        return String(str).replace(/\{(\w+)\}/g, function(_, k)
        {
            return vars && vars[k] != null ? String(vars[k]) : "";
        });
    }

    function t(key, vars)
    {
        const val = dict && dict[key] != null ? dict[key] : FALLBACK_EN[key] != null ? FALLBACK_EN[key] : key;
        return tpl(val, vars);
    }

    function applyDom()
    {
        document.documentElement.setAttribute("lang", currentLang);
        const titleEl = document.querySelector("title[data-i18n]");
        if (titleEl) titleEl.textContent = t(titleEl.getAttribute("data-i18n"));
        document.querySelectorAll("[data-i18n]").forEach(function(el)
        {
            const k = el.getAttribute("data-i18n");
            if (el.tagName.toLowerCase() === "title") return;
            el.textContent = t(k);
        });
        document.querySelectorAll("[data-i18n-html]").forEach(function(el)
        {
            el.innerHTML = t(el.getAttribute("data-i18n-html"));
        });
        document.querySelectorAll("[data-i18n-placeholder]").forEach(function(el)
        {
            el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
        });
        document.querySelectorAll("[data-i18n-aria]").forEach(function(el)
        {
            el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
        });
    }

    async function loadI18n(lang)
    {
        const cacheKey = "picotag_i18n_" + lang + "_" + VERSION;
        
        try
        {
            const cached = consentAccepted() ?
                (picotagCanStore() ?
                    localStorage.getItem :
                    function()
                    {
                        return null;
                    })(cacheKey) :
                null;
            if (cached)
            {
                const parsed = JSON.parse(cached);
                dict = Object.assign({}, FALLBACK_EN, parsed);
                applyDom();
            }
        }
        catch (e)
        {}
        
        try
        {
            const bases = [
                I18N_BASE,
                new URL("i18n/", location.href).pathname,
                new URL("../i18n/", location.href).pathname,
            ];

            let data = null;
            for (const base of bases)
            {
                try
                {
                    const res = await fetch(base + encodeURIComponent(lang) + ".json?ver=" + VERSION,
                    {
                        cache: "no-store",
                    });
                    if (!res.ok) continue;
                    data = await res.json().catch(() => null);
                    if (data) break;
                }
                catch (e)
                {}
            }

            if (data)
            {
                dict = Object.assign({}, FALLBACK_EN, data);
                if (consentAccepted())
                {
                    try
                    {
                        (picotagCanStore() ? localStorage.setItem : function() {})(cacheKey, JSON.stringify(data));
                    }
                    catch (e)
                    {}
                }
                applyDom();
            }
            return !!data;
        }
        catch (e)
        {}
        
        return false;
    }

    async function setLang(lang, persist)
    {
        if (persist === undefined) persist = true;

        const isAdmin = String(location.pathname || "").startsWith("/admin/");

        const prevLang = currentLang;

        currentLang = normalizeLang(lang || "en") || "en";
        if (!isSupportedLang(currentLang)) currentLang = "en";

        dict = Object.assign({}, FALLBACK_EN);
        applyDom();

        if (persist && !isAdmin) setCookie(COOKIE_KEY, currentLang, 3650);

        const ok = await loadI18n(currentLang);
        if (!ok && currentLang !== "en")
        {
            currentLang = "en";
            dict = Object.assign({}, FALLBACK_EN);
            applyDom();
            await loadI18n("en");
        }

        try
        {
            document.dispatchEvent(new CustomEvent("i18n:changed",
            {
                detail:
                {
                    lang: currentLang
                }
            }));
        }
        catch (e)
        {}
    }
    let _readyResolve;
    const ready = new Promise(function(res)
    {
        _readyResolve = res;
    });

    window.i18n = {
        t: t,
        setLang: setLang,
        getLang: function()
        {
            return currentLang;
        },
        ready: ready,
    };

    async function initI18n()
    {
        const sel = document.getElementById("langSelect");
        const initial = await resolveInitialLang(sel);
        
        if (sel)
        {
            sel.value = initial;
            sel.addEventListener("change", function()
            {
                setLang(sel.value, true);
            });
        }
        
        await setLang(initial, false);
        
        try
        {
            _readyResolve && _readyResolve();
        }
        catch (e)
        {}
    }

    document.addEventListener("DOMContentLoaded", function()
    {
        initI18n();
    });
})();
