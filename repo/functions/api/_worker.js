function _len(s)
{
    return s == null ? 0 : String(s).length;
}

function _tooLongResp(labelKey, max)
{
    return {
        errorKey: "err_field_too_long",
        fieldLabelKey: labelKey,
        max: max
    };
}

function _checkMax(v, max, labelKey)
{
    if (v == null) return null;
    
    const s = String(v);
    
    if (s.length > max) return _tooLongResp(labelKey, max);
    
    return null;
}

function _hasDisallowedCtl(s, {allowNewlines = false, allowTabs = false} = {})
{
    if (s == null) return false;
    
    const str = String(s);

    for (let i = 0; i < str.length; i++)
    {
        const c = str.charCodeAt(i);
        if (c === 0x09)
        {
            if (allowTabs) continue;
            return true;
        }
        
        if (c === 0x0a || c === 0x0d)
        {
            if (allowNewlines) continue;
            return true;
        }
        
        if ((c >= 0x00 && c <= 0x1f) || c === 0x7f) return true;
    }
    return false;
}

function _badCharsResp(labelKey)
{
    return {
        errorKey: "err_field_invalid_chars",
        fieldLabelKey: labelKey
    };
}

function _escapeHtmlText(s)
{
    return String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function _sanitizeFooterLinksHtml(input, {maxLen = 2048} = {})
{
    const raw = String(input || "");
    
    if (!raw) return "";
    if (raw.length > maxLen) return raw.slice(0, maxLen);

    const isSafeHref = (href) =>
    {
        const h = String(href || "").trim();
        
        if (!h) return false;
        if (/^(javascript|data|vbscript):/i.test(h)) return false;
        if (/^https?:\/\//i.test(h)) return true;
        if (/^mailto:/i.test(h)) return true;
        if (/^\//.test(h)) return true;
        if (/^#/.test(h)) return true;
        if (/^\.\//.test(h) || /^\.\.\//.test(h)) return true;
        
        return false;
    };

    const allowedTags = new Set(["a", "b", "strong", "i", "em", "u", "br", "p", "span", "ul", "ol", "li"]);
    const selfClosing = new Set(["br"]);

    let out = "";
    const reTag = /<\/?\s*([a-zA-Z0-9]+)([^>]*)>/g;
    let last = 0;
    let m;
    
    while ((m = reTag.exec(raw)) !== null)
    {
        const tagStart = m.index;
        const tagEnd = reTag.lastIndex;
        const tagName = String(m[1] || "").toLowerCase();
        const attrsRaw = String(m[2] || "");
        const full = m[0];

        if (tagStart > last) out += _escapeHtmlText(raw.slice(last, tagStart));

        const isClose = /^<\//.test(full);
        
        if (!allowedTags.has(tagName))
        {
            last = tagEnd;
            continue;
        }

        if (tagName === "a")
        {
            if (isClose)
            {
                out += "</a>";
            }
            else
            {

                let href = "";
                let target = "";
                const hrefM = attrsRaw.match(/\bhref\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+)/i);
                
                if (hrefM)
                {
                    href = hrefM[1] || "";
                    href = href.replace(/^['"]|['"]$/g, "").trim();
                    if (!isSafeHref(href)) href = "";
                }
                
                const tgtM = attrsRaw.match(/\btarget\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+)/i);
                
                if (tgtM)
                {
                    target = (tgtM[1] || "").replace(/^['"]|['"]$/g, "").trim();
                    if (target !== "_blank") target = "";
                }

                if (href)
                {
                    out += `<a href="${_escapeHtmlText(href)}"`;
                }
                else
                {
                    out += "<a";
                }
                
                if (target)
                {
                    out += ` target="_blank" rel="noopener noreferrer"`;
                }
                out += ">";
            }
        }
        else if (tagName === "span")
        {
            out += isClose ? "</span>" : "<span>";
        }
        else if (tagName === "p")
        {
            out += isClose ? "</p>" : "<p>";
        }
        else if (tagName === "ul")
        {
            out += isClose ? "</ul>" : "<ul>";
        }
        else if (tagName === "ol")
        {
            out += isClose ? "</ol>" : "<ol>";
        }
        else if (tagName === "li")
        {
            out += isClose ? "</li>" : "<li>";
        }
        else if (selfClosing.has(tagName))
        {
            out += "<br>";
        }
        else
        {
            out += isClose ? `</${tagName}>` : `<${tagName}>`;
        }

        last = tagEnd;
    }
    if (last < raw.length) out += _escapeHtmlText(raw.slice(last));

    return out.slice(0, maxLen);
}

export default
{
    async fetch(request, env, ctx)
    {
        const t0 = Date.now();
        const url = new URL(request.url);
        const path = url.pathname;
        const kvOk = !!(env.KV && typeof env.KV.get === "function" && typeof env.KV.put === "function");
        const APP_ORIGIN_RAW = env.APP_ORIGIN;
        const TURNSTILE_SITEKEY = env.TURNSTILE_SITEKEY;

        function normalizeOrigin(v)
        {
            let s = String(v || "").trim();
            
            if (!s) return "";
            
            const lower = s.toLowerCase();
            
            if (!(lower.startsWith("http://") || lower.startsWith("https://")))
            {
                s = "https://" + s.replace(/^\/+/, "");
            }
            
            try
            {
                const u = new URL(s);
                return u.origin;
            }
            catch (e)
            {
                return "";
            }
        }
        
        const APP_ORIGIN = normalizeOrigin(APP_ORIGIN_RAW);
        const APP_HOST = (() =>
        {
            try
            {
                return APP_ORIGIN ? new URL(APP_ORIGIN).hostname : "";
            }
            catch
            {
                return "";
            }
        })();
        const APP_ORIGIN_ALT = (() =>
        {
            if (!APP_HOST) return "";
            if (APP_HOST.startsWith("www.")) return "https://" + APP_HOST.slice(4);
            return "https://www." + APP_HOST;
        })();
        
        const REQUEST_ORIGIN = url.origin;
        const allowedOrigins = new Set([REQUEST_ORIGIN, APP_ORIGIN, APP_ORIGIN_ALT].filter(Boolean));
        const origin = request.headers.get("Origin") || "";
        const corsAllowed = !origin || allowedOrigins.has(origin);
        const corsHeaders = corsAllowed ?
            (origin ?
            {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Max-Age": "86400",
                Vary: "Origin",
            } :
            {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Max-Age": "86400",
                Vary: "Origin",
            }) :
            {
                Vary: "Origin",
            };

        function getClientIp()
        {
            const h = request.headers;
            return (h.get("CF-Connecting-IP") || h.get("X-Forwarded-For") || "").split(",")[0].trim();
        }
        
        const __RL_FALLBACK = globalThis.__PICOTAG_RL_FALLBACK || (globalThis.__PICOTAG_RL_FALLBACK = new Map());

        function _rlFallbackAllow(prefix, ip, limit = 10, windowSec = 60)
        {
            const now = Math.floor(Date.now() / 1e3);
            const bucket = Math.floor(now / windowSec);
            const key = `_RLFB_${prefix}_${ip}_${bucket}`;
            const rec = __RL_FALLBACK.get(key);
            const count = rec ? rec.count : 0;
            
            if (count >= limit) return false;
            
            __RL_FALLBACK.set(key,
            {
                count: count + 1,
                exp: now + windowSec + 5
            });
            
            if (__RL_FALLBACK.size > 5000)
            {
                for (const [k, v] of __RL_FALLBACK.entries())
                {
                    if (!v || v.exp < now) __RL_FALLBACK.delete(k);
                }
            }
            return true;
        }
        
        async function rateLimit(prefix, limit, windowSec)
        {
            const ip = getClientIp() || "unknown";
            
            if (!kvOk)
            {
                return _rlFallbackAllow(prefix, ip, 10, 60);
            }
            try
            {
                const now = Math.floor(Date.now() / 1e3);
                const bucket = Math.floor(now / windowSec);
                const key = `_RL_${prefix}_${ip}_${bucket}`;
                const n = await env.KV.get(key);
                const count = n ? parseInt(n, 10) : 0;
                
                if (count >= limit)
                {
                    return false;
                }
                
                const next = count + 1;
                
                await env.KV.put(key, String(next),
                {
                    expirationTtl: windowSec + 5,
                });
                
                return true;
            }
            catch (e)
            {
                return _rlFallbackAllow(prefix, ip, 10, 60);
            }
        }

        async function getSecurityConfig()
        {
            if (!kvOk) 
            {
                return {
                    publicGetRateLimit: 10
                };
            }
            
            try
            {
                const raw = await env.KV.get("_SECURITY");
                
                if (!raw) 
                {
                    return {
                        publicGetRateLimit: 10
                    };
                }
                
                const obj = JSON.parse(raw);
                const v = obj && obj.publicGetRateLimit !== undefined ? parseInt(obj.publicGetRateLimit, 10) : 0;
                
                return {
                    publicGetRateLimit: Number.isFinite(v) ? v : 0
                };
            }
            catch (_)
            {
                return {
                    publicGetRateLimit: 10
                };
            }
        }
        if (request.method === "OPTIONS")
        {
            return corsAllowed ?
                new Response(null,
                {
                    status: 204,
                    headers: corsHeaders,
                }) :
                new Response("Forbidden",
                {
                    status: 403,
                    headers: corsHeaders,
                });
        }

        if (path === "/api/site" && request.method === "GET")
        {
            try
            {
                const raw = await env.KV.get("_SITE");
                let cfg = {};
                
                if (raw)
                {
                    try
                    {
                        cfg = JSON.parse(raw);
                    }
                    catch (_)
                    {
                        cfg = {};
                    }
                }
                
                const out = {
                    brandName: String(cfg.brandName || "Website Name"),
                    introTitle: String(cfg.introTitle || "Intro title"),
                    introText: String(cfg.introText || "Intro text"),
                    introMediaUrl: String(cfg.introMediaUrl || "/assets/img/demo_tag.jpg"),
                    bgImageUrl: String(cfg.bgImageUrl || "/assets/img/bg.gif"),
                    footerLinksHtml: String(cfg.footerLinksHtml || "")
                };
                
                return new Response(JSON.stringify(out),
                {
                    status: 200,
                    headers:
                    {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                        "Cache-Control": "public, max-age=60",
                    },
                });
            }
            catch (e)
            {
                return new Response(JSON.stringify(
                {
                    error: "Server error"
                }),
                {
                    status: 500,
                    headers:
                    {
                        ...corsHeaders,
                        "Content-Type": "application/json"
                    },
                });
            }
        }
        
        if (path === "/api/config/public" && request.method === "GET")
        {
            const DEFAULT_LANG = String(env.DEFAULT_LANG || "").trim();
            
            return new Response(
                JSON.stringify(
                {
                    turnstileSiteKey: TURNSTILE_SITEKEY,
                    createPassRequired: false,
                    defaultApiBase: "",
                    defaultLang: DEFAULT_LANG ? DEFAULT_LANG : "en",
                }),
                {
                    status: 200,
                    headers:
                    {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                        "Cache-Control": "public, max-age=3600",
                    },
                },
            );
        }
        
        if (path === "/api/tagid/check")
        {
            return json(
                {
                    error: "Not found",
                },
                404,
                corsHeaders,
            );
        }
        
        async function verifyTurnstile(token)
        {
            const secret = String(env.TURNSTILE_SECRET_KEY || "").trim();
            const siteKey = String(env.TURNSTILE_SITEKEY || "").trim();
            
            if (!secret)
            {
                if (siteKey)
                {
                    return {
                        ok: false,
                        status: 500,
                        error: "Server error",
                    };
                }
                
                return {
                    ok: true,
                    skipped: true,
                };
            }
            const t = String(token || "").trim();
            if (!t)
            {
                return {
                    ok: false,
                    status: 403,
                    error: "請先完成 Turnstile 驗證",
                };
            }
            
            const ip = request.headers.get("CF-Connecting-IP") || "";
            const form = new URLSearchParams();
            form.append("secret", secret);
            form.append("response", t);
            
            if (ip) form.append("remoteip", ip);
            
            const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",
            {
                method: "POST",
                headers:
                {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: form.toString(),
            });
            
            const data = await resp.json().catch(() => null);
            
            if (data && data.success)
            {
                return {
                    ok: true,
                    data: data,
                };
            }
            
            return {
                ok: false,
                status: 403,
                error: "Turnstile 驗證失敗",
            };
        }
        
        if (url.pathname === "/api/config/public")
        {
            const DEFAULT_LANG = String(env.DEFAULT_LANG || "").trim();
            return new Response(
                JSON.stringify(
                {
                    turnstileSiteKey: env.TURNSTILE_SITEKEY,
                    createPassRequired: false,

                    defaultLang: DEFAULT_LANG ? DEFAULT_LANG : "en",
                }),
                {
                    headers:
                    {
                        "Content-Type": "application/json",
                        "Cache-Control": "public, max-age=3600",
                    },
                },
            );
        }
        
        const ADMIN_ORIGIN = APP_ORIGIN;
        const adminHosts = (() =>
        {
            if (!APP_HOST) return [];
            if (APP_HOST.startsWith("www.")) return [APP_HOST, APP_HOST.slice(4)];
            return [APP_HOST, "www." + APP_HOST];
        })();
        
        const hostOk = adminHosts.includes(url.hostname);
        const referer = request.headers.get("Referer") || "";
        const secFetchSite = request.headers.get("Sec-Fetch-Site") || "";
        const refererOk = Array.from(allowedOrigins).some((o) => referer.startsWith(o + "/admin") || referer.startsWith(o + "/admin/"));
        const adminOriginOk = origin ? allowedOrigins.has(origin) : (refererOk || secFetchSite === "same-origin");

        function parseCookie(header)
        {
            const out = {};
            
            if (!header) return out;
            
            const parts = header.split(";");
            
            for (const p of parts)
            {
                const i = p.indexOf("=");
                if (i < 0) continue;
                const k = p.slice(0, i).trim();
                const v = p.slice(i + 1).trim();
                if (k) out[k] = v;
            }
            
            return out;
        }
        
        async function requireAdmin(request)
        {
            if (!hostOk || !adminOriginOk)
                return {
                    ok: false,
                    status: 403,
                    error: "Forbidden",
                };
            if (!kvOk)
                return {
                    ok: false,
                    status: 500,
                    error: "KV binding is not configured. Please bind a KV namespace as \"KV\" in your Cloudflare Pages project (Settings → Functions → KV bindings).",
                };
            
            const c = parseCookie(request.headers.get("Cookie") || "");
            const tok = String(c.pt_admin || "").trim();
            
            if (!tok)
                return {
                    ok: false,
                    status: 401,
                    error: "Unauthorized",
                };
                
            const raw = await env.KV.get("_ADMINSESS_" + tok);
            
            if (!raw)
                return {
                    ok: false,
                    status: 401,
                    error: "Unauthorized",
                };
            
            try
            {
                const sess = JSON.parse(raw);
                const reqUa = request.headers.get("User-Agent") || "";
                const sessUa = (sess && typeof sess.ua === "string") ? sess.ua : "";
                
                if (sessUa && reqUa && sessUa !== reqUa)
                {
                    await env.KV.delete("_ADMINSESS_" + tok);
                    
                    return {
                        ok: false,
                        status: 401,
                        error: "Unauthorized",
                    };
                }
            }
            catch (e)
            {
                await env.KV.delete("_ADMINSESS_" + tok);
                
                return {
                    ok: false,
                    status: 401,
                    error: "Unauthorized",
                };
            }
            
            return {
                ok: true,
                token: tok,
            };
        }

        function cookieClear()
        {
            return "pt_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0";
        }

        function cookieSet(token)
        {
            return `pt_admin=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`;
        }
        
        async function tokenHex(bytes = 32)
        {
            const u = new Uint8Array(bytes);
            crypto.getRandomValues(u);
            return [...u].map((b) => b.toString(16).padStart(2, "0")).join("");
        }
        
        if (path.startsWith("/api/admin/"))
        {
            if (path === "/api/admin/system-info" && request.method === "GET")
            {
                const auth = await requireAdmin(request);
                
                if (!auth.ok)
                    return json(
                        {
                            error: auth.error,
                        },
                        auth.status,
                    );
                
                const kvKeys = [
                    "_RACKET",
                    "_PATTERN",
                    "_STRING",
                    "_MACHINE",
                    "_STRINGER",
                    "_RACKET_T",
                    "_PATTERN_T",
                    "_STRING_T",
                ];
                
                const kvCounts = {};
                
                for (const k of kvKeys)
                {
                    try
                    {
                        const raw = await env.KV.get(k);
                        
                        if (!raw)
                        {
                            kvCounts[k] = 0;
                            continue;
                        }
                        
                        let obj = null;
                        
                        try
                        {
                            obj = JSON.parse(raw);
                        }
                        catch (e)
                        {
                            obj = null;
                        }
                        
                        if (Array.isArray(obj)) kvCounts[k] = obj.length;
                        else if (obj && typeof obj === "object")
                        {
                            if (Array.isArray(obj.items)) kvCounts[k] = obj.items.length;
                            else kvCounts[k] = Object.keys(obj).length;
                        }
                        else
                        {
                            kvCounts[k] = String(raw)
                                .split(/\r?\n/)
                                .filter((s) => s.trim().length > 0).length;
                        }
                    }
                    catch (e)
                    {
                        kvCounts[k] = 0;
                    }
                }
                let recCount = null;
                let recMax = null;
                let recExists = false;
                
                try
                {
                    const chk = await env.DB.prepare(
                        "SELECT name FROM sqlite_master WHERE type='table' AND name='records'",
                    ).first();
                    recExists = !!(chk && chk.name);
                }
                catch (e)
                {
                    recExists = false;
                }
                
                if (recExists)
                {
                    try
                    {
                        const r = await env.DB.prepare(
                            "SELECT COUNT(1) as n, MAX(created_at) as max_created_at FROM records",
                        ).first();
                        
                        if (r)
                        {
                            recCount = r.n;
                            recMax = r.max_created_at || null;
                        }
                    }
                    catch (e)
                    {}
                }
                const d1Tables = recExists ? [
                {
                    name: "records",
                    rows: recCount,
                    latestCreatedAt: recMax,
                    exists: true,
                }, ] : [];

                const turnstileSiteKey = String(env.TURNSTILE_SITEKEY || "").trim() || null;
                return json(
                    {
                        kvCounts: kvCounts,
                        d1Tables: d1Tables,
                        turnstileSiteKey: turnstileSiteKey,
                        appOrigin: String(env.APP_ORIGIN || "").trim(),
                    },
                    200,
                );
            }

            if (path === "/api/admin/security" && request.method === "GET")
            {
                const auth = await requireAdmin(request);
                
                if (!auth.ok) return json(
                {
                    error: auth.error
                }, auth.status);
                
                const cfg = await getSecurityConfig();
                const allowed = [0, 10, 30, 60];
                const v = allowed.includes(cfg.publicGetRateLimit) ? cfg.publicGetRateLimit : 0;
                
                return json(
                {
                    publicGetRateLimit: v
                }, 200);
            }

            if (path === "/api/admin/security" && request.method === "POST")
            {
                const auth = await requireAdmin(request);
                
                if (!auth.ok) return json(
                {
                    error: auth.error
                }, auth.status);
                
                const bodyRes = await readJsonWithLimits(request);
                
                if (!bodyRes.ok) return json(
                {
                    error: bodyRes.error
                }, bodyRes.status);
                
                const v0 = parseInt((bodyRes.value || {}).publicGetRateLimit, 10);
                const allowed = [0, 10, 30, 60];
                const v = allowed.includes(v0) ? v0 : 0;
                
                await env.KV.put("_SECURITY", JSON.stringify(
                {
                    publicGetRateLimit: v
                }));
                
                return json(
                {
                    ok: true,
                    publicGetRateLimit: v
                }, 200);
            }

            if (path === "/api/admin/site")
            {
                const auth = await requireAdmin(request);
                if (!auth.ok)
                    return json(
                        {
                            error: auth.error,
                        },
                        auth.status,
                    );
                    
                if (request.method === "GET")
                {
                    try
                    {
                        const raw = await env.KV.get("_SITE");
                        
                        if (!raw) return json({}, 200);
                        
                        return json(JSON.parse(raw) || {}, 200);
                    }
                    catch (e)
                    {
                        return json({}, 200);
                    }
                }
                if (request.method === "POST")
                {
                    const bodyRes = await readJsonWithLimits(request);
                    
                    if (!bodyRes.ok)
                        return json(
                            {
                                error: bodyRes.error,
                            },
                            bodyRes.status,
                        );
                    const v = bodyRes.value || {};

                    const obj = {
                        brandName: String(v.brandName || "").trim(),
                        introTitle: String(v.introTitle || "").trim(),
                        introText: String(v.introText || ""),
                        introMediaUrl: String(v.introMediaUrl || "").trim(),
                        bgImageUrl: String(v.bgImageUrl || "").trim(),
                        footerLinksHtml: String(v.footerLinksHtml || v.footerLinks || ""),
                        updatedAt: new Date().toISOString(),
                    };

                    if (_len(obj.brandName) > 64) return json(_tooLongResp("brandName", 64), 400);
                    if (_len(obj.introTitle) > 64) return json(_tooLongResp("introTitle", 64), 400);
                    if (_len(obj.introText) > 2048) return json(_tooLongResp("introText", 2048), 400);
                    if (_len(obj.introMediaUrl) > 256) return json(_tooLongResp("introMediaUrl", 256), 400);
                    if (_len(obj.bgImageUrl) > 256) return json(_tooLongResp("bgImageUrl", 256), 400);
                    if (_len(obj.footerLinksHtml) > 2048) return json(_tooLongResp("footerLinksHtml", 2048), 400);

                    if (_hasDisallowedCtl(obj.brandName)) return json(
                    {
                        error: "Invalid characters"
                    }, 400);
                    
                    if (_hasDisallowedCtl(obj.introTitle)) return json(
                    {
                        error: "Invalid characters"
                    }, 400);
                    
                    if (_hasDisallowedCtl(obj.introText,
                        {
                            allowNewlines: true
                        })) return json(
                    {
                        error: "Invalid characters"
                    }, 400);
                    
                    if (_hasDisallowedCtl(obj.footerLinksHtml,
                        {
                            allowNewlines: true
                        })) return json(
                    {
                        error: "Invalid characters"
                    }, 400);

                    obj.footerLinksHtml = _sanitizeFooterLinksHtml(obj.footerLinksHtml,
                    {
                        maxLen: 2048
                    });

                    const urlOk = (s) => !s || /^https?:\/\//i.test(s);
                    
                    if (!urlOk(obj.introMediaUrl)) return json(
                    {
                        error: "Invalid introMediaUrl"
                    }, 400);
                    
                    if (!urlOk(obj.bgImageUrl)) return json(
                    {
                        error: "Invalid bgImageUrl"
                    }, 400);

                    await env.KV.put("_SITE", JSON.stringify(obj));
                    
                    return json(
                    {
                        ok: true,
                        updatedAt: obj.updatedAt
                    }, 200);
                }
                
                return json(
                {
                    error: "Method not allowed"
                }, 405);
            }
            if (path === "/api/admin/login" && request.method === "POST")
            {
                if (!(await rateLimit("admin_login", 20, 60)))
                    return json(
                        {
                            error: "Too Many Requests",
                        },
                        429,
                        corsHeaders,
                    );
                    
                const missingEnvs = [];
                
                if (!String(env.APP_ORIGIN || "").trim()) missingEnvs.push("APP_ORIGIN");
                if (!String(env.TURNSTILE_SECRET_KEY || "").trim())
                    missingEnvs.push("TURNSTILE_SECRET_KEY");
                if (!String(env.TURNSTILE_SITEKEY || "").trim()) missingEnvs.push("TURNSTILE_SITEKEY");
                if (!String(env.ADMIN_PASSWORD || "").trim()) missingEnvs.push("ADMIN_PASSWORD");
                if (missingEnvs.length)
                    return json(
                        {
                            error: "Missing ENV: " + missingEnvs.join(", ")
                        },
                        503,
                        corsHeaders,
                    );

                if (!hostOk || !adminOriginOk)
                    return json(
                        {
                            error: "Forbidden",
                        },
                        403,
                    );
                    
                const ip = getClientIp() || "unknown";
                const lockKey = `_ALOCK_admin_${ip}`;
                
                if (await env.KV.get(lockKey))
                    return json(
                    {
                        error: "Too Many Attempts"
                    }, 429, corsHeaders);

                const bodyRes = await readJsonWithLimits(request);
                
                if (!bodyRes.ok)
                    return json(
                        {
                            error: bodyRes.error,
                        },
                        bodyRes.status,
                    );
                
                const pw = String((bodyRes.value || {}).password || "").trim();
                const ts = String((bodyRes.value || {}).turnstile || "").trim();
                const ver = await verifyTurnstile(ts);
                
                if (!ver.ok)
                    return json(
                        {
                            error: ver.error,
                        },
                        ver.status,
                    );
                
                const adminPw = String(env.ADMIN_PASSWORD || "").trim();
                
                if (!adminPw || !pw || !safeEq(pw, adminPw))
                {
                    const failKey = `_AFAIL_admin_${ip}`;
                    const n = parseInt((await env.KV.get(failKey)) || "0", 10) + 1;
                    
                    await env.KV.put(failKey, String(n),
                    {
                        expirationTtl: 600
                    });
                    
                    if (n >= 8) await env.KV.put(lockKey, "1",
                    {
                        expirationTtl: 600
                    });
                    
                    return json(
                    {
                        errorKey: "admin_access_invalid_password",
                        error: "Invalid password"
                    }, 403);
                }
                if (!kvOk)
                    return json(
                        {
                            error: "KV binding is not configured. Please bind a KV namespace as \"KV\" in your Cloudflare Pages project (Settings → Functions → KV bindings).",
                        },
                        500,
                    );
                
                const tok = await tokenHex(32);
                await env.KV.put(
                    "_ADMINSESS_" + tok,
                    JSON.stringify(
                    {
                        ts: Date.now(),
                        ip: request.headers.get("CF-Connecting-IP") || "",
                        ua: request.headers.get("User-Agent") || "",
                    }),
                    {
                        expirationTtl: 28800,
                    },
                );
                
                return json(
                    {
                        ok: true,
                    },
                    200,
                    {
                        "Set-Cookie": cookieSet(tok),
                    },
                );
            }
            
            if (path === "/api/admin/logout" && request.method === "POST")
            {
                const auth = await requireAdmin(request);
                
                if (!auth.ok)
                    return json(
                        {
                            error: auth.error,
                        },
                        auth.status,
                    );

                if (!hostOk || !adminOriginOk)
                    return json(
                        {
                            error: "Forbidden",
                        },
                        403,
                    );

                const c = parseCookie(request.headers.get("Cookie") || "");
                const tok = String(c.pt_admin || "").trim();
                
                if (tok) await env.KV.delete("_ADMINSESS_" + tok);
                
                return json(
                    {
                        ok: true,
                    },
                    200,
                    {
                        "Set-Cookie": cookieClear(),
                    },
                );
            }
            
            if (path === "/api/admin/me" && request.method === "GET")
            {
                const auth = await requireAdmin(request);
                
                if (!auth.ok)
                    return json(
                        {
                            error: auth.error,
                        },
                        auth.status,
                    );
                return json(
                    {
                        ok: true,
                    },
                    200,
                );
            }
            
            if (path.startsWith("/api/admin/dict/"))
            {
                const auth = await requireAdmin(request);
                
                if (!auth.ok)
                {
                    return json(
                        {
                            error: auth.error,
                        },
                        auth.status,
                    );
                }
                
                const name = decodeURIComponent(path.slice("/api/admin/dict/".length)).trim();
                const allowed = new Set([
                    "_RACKET",
                    "_PATTERN",
                    "_STRING",
                    "_MACHINE",
                    "_STRINGER",
                    "_RACKET_T",
                    "_PATTERN_T",
                    "_STRING_T",
                ]);
            
                if (!allowed.has(name))
                {
                    return json(
                        {
                            error: "Not found",
                        },
                        404,
                    );
                }
                
                if (request.method === "GET")
                {
                    const raw = await env.KV.get(name);
                    if (!raw) return json({}, 200);
                    try
                    {
                        return json(JSON.parse(raw) || {}, 200);
                    }
                    catch (e)
                    {
                        return json({}, 200);
                    }
                }
                if (request.method === "POST")
                {
                    const bodyRes = await readJsonWithLimits(request);
                    if (!bodyRes.ok)
                        return json(
                            {
                                error: bodyRes.error,
                            },
                            bodyRes.status,
                        );
                    const v = bodyRes.value || {};
                    let keys = [];
                    
                    if (Array.isArray(v)) keys = v;
                    else if (Array.isArray(v.keys)) keys = v.keys;
                    else if (v && typeof v === "object") keys = Object.keys(v);
                    
                    const seen = new Set();
                    const obj = {};
                    
                    for (const it of keys)
                    {
                        const n = String(it || "")
                            .replace(/\s+/g, " ")
                            .trim();
                        
                        if (!n) continue;
                        
                        const k = n.toLowerCase();
                        
                        if (seen.has(k)) continue;
                        
                        seen.add(k);
                        obj[n] = 1;
                    }
                    
                    await env.KV.put(name, JSON.stringify(obj));
                    
                    return json(
                        {
                            ok: true,
                            count: Object.keys(obj).length,
                        },
                        200,
                    );
                }
                
                return json(
                    {
                        error: "Method not allowed",
                    },
                    405,
                );
            }
            if (path === "/api/admin/records" && request.method === "GET")
            {
                const auth = await requireAdmin(request);
                
                if (!auth.ok)
                    return json(
                        {
                            error: auth.error,
                        },
                        auth.status,
                    );
                
                const limitRaw = parseInt(url.searchParams.get("limit") || "20", 10);
                const limit = Math.max(1, Math.min(100, isFinite(limitRaw) ? limitRaw : 20));
                const offsetRaw = parseInt(url.searchParams.get("offset") || "0", 10);
                const offset = Math.max(0, isFinite(offsetRaw) ? offsetRaw : 0);
                const qRaw = (url.searchParams.get("q") || "").trim();
                const q = qRaw ? qRaw : "";
                const sortAllow = new Set(["created_at", "id", "owner", "tension_setting"]);
                const sortRaw = (url.searchParams.get("sort") || "created_at").trim();
                const sort = sortAllow.has(sortRaw) ? sortRaw : "created_at";
                const dirRaw = (url.searchParams.get("dir") || "desc").toLowerCase();
                const dir = dirRaw === "asc" ? "ASC" : "DESC";
                const baseWhere = "WHERE LENGTH(id)=8 AND SUBSTR(id,1,1) != \'_\'";
                let where = baseWhere;
                const binds = [];
                
                if (q)
                {
                    where += " AND (id LIKE ?1 OR id LIKE ?2 OR owner LIKE ?3)";
                    binds.push(q + "%", "%" + q + "%", "%" + q + "%");
                }

                try
                {

                    const chk = await env.DB.prepare(
                        "SELECT name FROM sqlite_master WHERE type='table' AND name='records'",
                    ).first();
                    
                    if (!chk || !chk.name)
                    {
                        return json(
                            {
                                ok: true,
                                dbError: true,
                                code: "RECORDS_TABLE_MISSING",
                                message: "Database issue detected. Please go to Admin → System and initialize the database.",
                                total: 0,
                                total_all: 0,
                                limit: limit,
                                offset: offset,
                                sort: sort,
                                dir: dir.toLowerCase(),
                                rows: [],
                            },
                            200,
                        );
                    }

                    const totalRes = await env.DB.prepare(`SELECT COUNT(1) as n FROM records ${where}`)
                        .bind(...binds)
                        .first();
                    const total = Number(totalRes?.n || 0);
                    const totalAllRes = await env.DB.prepare(`SELECT COUNT(1) as n FROM records ${baseWhere}`).first();
                    const total_all = Number(totalAllRes?.n || 0);
                    const orderSql = `ORDER BY ${sort} ${dir}`;
                    const sql = `SELECT id, owner, tension_setting, created_at, view_protect, has_delpass FROM records ${where} ${orderSql} LIMIT ?${binds.length + 1} OFFSET ?${binds.length + 2}`;
                    const res = await env.DB.prepare(sql)
                        .bind(...binds, limit, offset)
                        .all();
                    const rows = (res.results || [])
                        .map((r) => (
                        {
                            id: String(r.id || ""),
                            owner: r.owner ?? "",
                            tension_setting: r.tension_setting ?? "",
                            created_at: r.created_at ?? "",
                            view_protect: Number(r.view_protect || 0),
                            has_delpass: Number(r.has_delpass || 0),
                        }))
                        .filter((x) => x.id && x.id.length === 8 && x.id[0] !== "_");
                    return json(
                        {
                            ok: true,
                            total: total,
                            total_all: total_all,
                            limit: limit,
                            offset: offset,
                            sort: sort,
                            dir: dir.toLowerCase(),
                            rows: rows,
                        },
                        200,
                    );
                }
                catch (e)
                {
                    return json(
                        {
                            ok: true,
                            dbError: true,
                            code: "D1_ERROR",
                            message: "Database issue detected. Please go to Admin → System and initialize the database.",
                            total: 0,
                            total_all: 0,
                            limit: limit,
                            offset: offset,
                            sort: sort,
                            dir: dir.toLowerCase(),
                            rows: [],
                        },
                        200,
                    );
                }
            }

            if (path === "/api/admin/d1/init" && request.method === "POST")
            {
                const auth = await requireAdmin(request);
                if (!auth.ok)
                    return json(
                        {
                            error: auth.error,
                        },
                        auth.status,
                    );

                try
                {

                    const chk = await env.DB.prepare(
                        "SELECT name FROM sqlite_master WHERE type='table' AND name='records'",
                    ).first();

                    if (chk && chk.name)
                    {
                        return json(
                        {
                            ok: true,
                            existed: true
                        }, 200);
                    }

                    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY,
  owner TEXT,
  date TEXT,
  date_format TEXT,
  tension_setting TEXT,
  tension_unit TEXT,
  tension_note TEXT,
  pattern TEXT,
  prestretch TEXT,
  racket_info TEXT,
  racket_serial TEXT,
  string_info TEXT,
  grommet TEXT,
  machine TEXT,
  stringer TEXT,
  fee TEXT,
  note TEXT,
  video TEXT,
  view_protect INTEGER DEFAULT 0,
  has_delpass INTEGER DEFAULT 0,
  delpass_salt TEXT,
  delpass_hash TEXT,
  created_at TEXT,
  remarks TEXT,
  sport TEXT
)`).run();

                    return json(
                    {
                        ok: true,
                        created: true
                    }, 200);
                }
                catch (e)
                {
                    return json(
                        {
                            error: e && e.message ? e.message : "Backend error",
                        },
                        500,
                    );
                }
            }
            
            if (path === "/api/admin/records/export" && request.method === "GET")
            {
                const auth = await requireAdmin(request);
                
                if (!auth.ok)
                    return json(
                        {
                            error: auth.error,
                        },
                        auth.status,
                    );
                
                const from = String(url.searchParams.get("from") || "").trim();
                const to = String(url.searchParams.get("to") || "").trim();
                
                if (!from || !to || !isValidDate(from) || !isValidDate(to))
                {
                    return json(
                        {
                            error: "Invalid date range",
                        },
                        400,
                    );
                }
                
                const fromN = normalizeDate(from);
                const toN = normalizeDate(to);
                
                if (fromN > toN)
                    return json(
                        {
                            error: "Invalid date range",
                        },
                        400,
                    );
                
                const header = [
                    "id",
                    "sport",
                    "owner",
                    "date",
                    "date_format",
                    "tension_setting",
                    "tension_unit",
                    "tension_note",
                    "pattern",
                    "prestretch",
                    "racket_info",
                    "racket_serial",
                    "string_info",
                    "grommet",
                    "machine",
                    "stringer",
                    "fee",
                    "note",
                    "video",
                    "view_protect",
                    "has_delpass",
                    "created_at",
                    "remarks",
                ];
                
                const where = "WHERE LENGTH(id)=8 AND SUBSTR(id,1,1) != '_' AND date >= ?1 AND date <= ?2";
                const sql = `SELECT ${header.join(",")} FROM records ${where} ORDER BY date ASC, created_at ASC`;
                const res = await env.DB.prepare(sql).bind(fromN, toN).all();
                const rows = res.results || [];
                const csvSafe = (v) =>
                {
                    const s = v === null || v === undefined ? "" : String(v);

                    if (/^[\s]*[=+\-@]/.test(s)) return "'" + s;
                    return s;
                };
                
                const csvEscape = (v) =>
                {
                    const s = csvSafe(v);
                    return '"' + s.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/"/g, '""') + '"';
                };
                
                const formatDateForCsv = (dateStr, fmt) =>
                {
                    const s = String(dateStr || "").trim();
                    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                    if (!m) return s;
                    const y = m[1];
                    const mo = m[2];
                    const d = m[3];
                    const f = String(fmt || "").trim().toUpperCase();
                    if (f === "DMY") return `${d}/${mo}/${y}`;
                    if (f === "MDY") return `${mo}/${d}/${y}`;
                    // default YMD
                    return `${y}/${mo}/${d}`;
                };
                
                const lines = [];
                lines.push(header.map(csvEscape).join(","));
                
                for (const r of rows)
                {
                    const out = header.map((k) =>
                    {
                        if (k === "date")
                        {
                            return csvEscape(formatDateForCsv(r.date, r.date_format));
                        }
                        if (k === "view_protect" || k === "has_delpass")
                        {
                            return csvEscape(r[k] ? 1 : 0);
                        }
                        return csvEscape(r[k]);
                    });
                    lines.push(out.join(","));
                }
                
                const body = "\ufeff" + lines.join("\n");
                const filename = `picotag_records_${fromN}_to_${toN}.csv`;
                
                return new Response(body,
                {
                    status: 200,
                    headers:
                    {
                        "Content-Type": "text/csv; charset=utf-8",
                        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
                        "Cache-Control": "no-store",
                    },
                });
            }
            
            if (path.startsWith("/api/admin/record/") && request.method === "GET")
            {
                const auth = await requireAdmin(request);
                
                if (!auth.ok)
                    return json(
                        {
                            error: auth.error,
                        },
                        auth.status,
                    );
                
                const id = decodeURIComponent(path.slice("/api/admin/record/".length)).trim();
                
                if (!id || id.length !== 8)
                    return json(
                        {
                            error: "Invalid ID",
                        },
                        400,
                    );
                
                const row = await env.DB.prepare("SELECT * FROM records WHERE id = ?1").bind(id).first();
                
                if (row === null)
                    return json(
                        {
                            error: "Not found",
                        },
                        404,
                    );
                return json(rowToRecord(row), 200);
            }
            
            if (path.startsWith("/api/admin/record/") && path.endsWith("/delete") && request.method === "POST")
            {
                const auth = await requireAdmin(request);
                
                if (!auth.ok)
                    return json(
                        {
                            error: auth.error,
                        },
                        auth.status,
                    );
                
                const id = decodeURIComponent(path.slice("/api/admin/record/".length, -"/delete".length)).trim();
                
                if (!id || id.length !== 8)
                    return json(
                        {
                            error: "Invalid id",
                        },
                        400,
                    );
                
                await env.DB.prepare("DELETE FROM records WHERE id = ?1").bind(id).run();
                
                return json(
                    {
                        ok: true,
                    },
                    200,
                );
            }
            
            return json(
                {
                    error: "Not found",
                },
                404,
            );
        }

        if (path.startsWith("/api/r/") && request.method === "POST")
        {
            if (!(await rateLimit("view_unlock", 60, 60)))
            {
                return json(
                    {
                        error: "Too Many Requests",
                    },
                    429,
                    corsHeaders,
                );
            }
            
            if (origin && !corsAllowed)
            {
                return json(
                    {
                        error: "Forbidden",
                    },
                    403,
                    corsHeaders,
                );
            }
            
            const id = path.slice("/api/r/".length).trim().slice(0, 32);
            
            if (!/^[A-Za-z0-9]{8}$/.test(id))
            {
                return json(
                    {
                        error: "Not found",
                    },
                    404,
                    corsHeaders,
                );
            }
            
            const row = await env.DB.prepare("SELECT * FROM records WHERE id = ?1").bind(id).first();
            
            if (!row)
            {
                return json(
                    {
                        error: "Not found",
                    },
                    404,
                    corsHeaders,
                );
            }
            
            const rec = rowToRecord(row);
            
            if (!rec || !rec.delpass_hash || !rec.delpass_salt)
            {
                return json(
                    {
                        error: "No password set",
                    },
                    403,
                    corsHeaders,
                );
            }
            
            const bodyRes = await readJsonWithLimits(request);
            
            if (!bodyRes.ok)
            {
                return json(
                    {
                        error: bodyRes.error,
                    },
                    bodyRes.status,
                    corsHeaders,
                );
            }
            
            const pw = String((bodyRes.value || {}).password || "").trim();
            
            if (!pw)
            {
                return json(
                    {
                        error: "Invalid password",
                    },
                    403,
                    corsHeaders,
                );
            }
            
            const hash = await sha256Hex(rec.delpass_salt + ":" + pw);
            
            if (!safeEq(hash, rec.delpass_hash))
            {
                return json(
                    {
                        error: "Invalid password",
                    },
                    403,
                    corsHeaders,
                );
            }
            
            const out = {
                ...rec,
            };
            
            delete out.delpass_hash;
            delete out.delpass_salt;
            out.has_delpass = true;
            return json(out, 200, corsHeaders);
        }
        
        if (path.startsWith("/api/r/") && request.method === "GET")
        {
            const sec = await getSecurityConfig();
            const allowed = new Set([0, 10, 30, 60]);
            const lim = allowed.has(sec.publicGetRateLimit) ? sec.publicGetRateLimit : 0;
            
            if (lim > 0)
            {
                if (!(await rateLimit("r_get", lim, 60)))
                {
                    return json(
                    {
                        error: "Too Many Requests"
                    }, 429, corsHeaders);
                }
            }
            
            if (origin && !corsAllowed)
            {
                return json(
                    {
                        error: "Forbidden",
                    },
                    403,
                    corsHeaders,
                );
            }
            
            const id = path.slice("/api/r/".length).trim().slice(0, 32);
            
            if (
                id === "_RACKET" ||
                id === "_PATTERN" ||
                id === "_STRING" ||
                id === "_MACHINE" ||
                id === "_STRINGER" ||
                id === "_RACKET_T" ||
                id === "_PATTERN_T" ||
                id === "_STRING_T"
            )
            {
                const raw = await env.KV.get(id);
                
                if (!raw) return json({}, 200, corsHeaders);
                
                try
                {
                    const obj = JSON.parse(raw);
                    return json(obj || {}, 200, corsHeaders);
                }
                catch (e)
                {
                    return json({}, 200, corsHeaders);
                }
            }
            
            if (!/^[A-Za-z0-9]{8}$/.test(id))
            {
                return json(
                    {
                        error: "Not found",
                    },
                    404,
                    corsHeaders,
                );
            }
            
            const row = await env.DB.prepare("SELECT * FROM records WHERE id = ?1").bind(id).first();
            
            if (!row)
            {
                return json(
                    {
                        error: "Not found",
                    },
                    404,
                    corsHeaders,
                );
            }
            
            const rec = rowToRecord(row);
            
            if (rec && rec.view_protect && rec.delpass_hash && rec.delpass_salt)
            {
                return json(
                    {
                        error: "Password required",
                    },
                    403,
                    corsHeaders,
                );
            }
            
            const out = {
                ...rec,
            };
            
            delete out.delpass_hash;
            delete out.delpass_salt;
            out.has_delpass = !!rec.delpass_hash;
            return json(out, 200, corsHeaders);
        }
        if (path.startsWith("/api/d/") && request.method === "POST")
        {
            if (!(await rateLimit("delete_req", 60, 60)))
            {
                return json(
                    {
                        error: "Too Many Requests",
                    },
                    429,
                    corsHeaders,
                );
            }
            
            if (origin && !corsAllowed)
            {
                return json(
                    {
                        error: "Forbidden",
                    },
                    403,
                    corsHeaders,
                );
            }
            
            const id = path.slice("/api/d/".length).trim().slice(0, 32);
            
            if (!/^[A-Za-z0-9]{8}$/.test(id))
            {
                return json(
                    {
                        error: "Not found",
                    },
                    404,
                    corsHeaders,
                );
            }
            
            const row = await env.DB.prepare("SELECT * FROM records WHERE id = ?1").bind(id).first();
            
            if (!row)
            {
                return json(
                    {
                        error: "Not found",
                    },
                    404,
                    corsHeaders,
                );
            }
            
            const rec = rowToRecord(row);
            
            if (!rec || !rec.delpass_hash || !rec.delpass_salt)
            {
                return json(
                    {
                        error: "No password set",
                    },
                    403,
                    corsHeaders,
                );
            }
            
            const bodyRes = await readJsonWithLimits(request);
            
            if (!bodyRes.ok)
            {
                return json(
                    {
                        error: bodyRes.error,
                    },
                    bodyRes.status,
                    corsHeaders,
                );
            }
            
            const pw = String((bodyRes.value || {}).password || "").trim();
            
            if (!pw)
            {
                return json(
                    {
                        error: "Invalid password",
                    },
                    403,
                    corsHeaders,
                );
            }
            
            const hash = await sha256Hex(rec.delpass_salt + ":" + pw);
            
            if (!safeEq(hash, rec.delpass_hash))
            {
                return json(
                    {
                        error: "Invalid password",
                    },
                    403,
                    corsHeaders,
                );
            }
            
            await env.DB.prepare("DELETE FROM records WHERE id = ?1").bind(id).run();
            
            return json(
                {
                    ok: true,
                },
                200,
                corsHeaders,
            );
        }
        
        if (path.startsWith("/api/remark/") && request.method === "POST")
        {
            if (!(await rateLimit("remark_req", 60, 60)))
            {
                return json(
                    {
                        error: "Too Many Requests",
                    },
                    429,
                    corsHeaders,
                );
            }
            
            if (origin && !corsAllowed)
            {
                return json(
                    {
                        error: "Forbidden",
                    },
                    403,
                    corsHeaders,
                );
            }
            
            const id = path.slice("/api/remark/".length).trim().slice(0, 32);
            
            if (!/^[A-Za-z0-9]{8}$/.test(id))
            {
                return json(
                    {
                        error: "Not found",
                    },
                    404,
                    corsHeaders,
                );
            }
            
            const row = await env.DB.prepare("SELECT * FROM records WHERE id = ?1").bind(id).first();
            
            if (!row)
            {
                return json(
                    {
                        error: "Not found",
                    },
                    404,
                    corsHeaders,
                );
            }
            
            const rec = rowToRecord(row);
            
            if (!rec || !rec.delpass_hash || !rec.delpass_salt)
            {
                return json(
                    {
                        error: "No password set",
                    },
                    403,
                    corsHeaders,
                );
            }
            
            const bodyRes = await readJsonWithLimits(request);
            
            if (!bodyRes.ok)
            {
                return json(
                    {
                        error: bodyRes.error,
                    },
                    bodyRes.status,
                    corsHeaders,
                );
            }
            
            const pw = String((bodyRes.value || {}).password || "").trim();
            const remarkText = String((bodyRes.value || {}).remark || "").trim();
            
            if (!pw)
            {
                return json(
                    {
                        error: "Invalid password",
                    },
                    403,
                    corsHeaders,
                );
            }
            
            if (!remarkText)
            {
                return json(
                    {
                        error: "Invalid remark",
                    },
                    400,
                    corsHeaders,
                );
            }
            
            if (_hasDisallowedCtl(remarkText,
                {
                    allowNewlines: true,
                    allowTabs: true
                }))
            {
                return json(
                    {
                        errorKey: "err_field_invalid_chars",
                        fieldLabelKey: "label_remarks",
                    },
                    400,
                    corsHeaders,
                );
            }
            
            if (remarkText.length > 256)
            {
                return json(
                    {
                        errorKey: "err_field_too_long",
                        fieldLabelKey: "label_remarks",
                        max: 256,
                    },
                    400,
                    corsHeaders,
                );
            }
            
            const hash = await sha256Hex(rec.delpass_salt + ":" + pw);
            
            if (!safeEq(hash, rec.delpass_hash))
            {
                return json(
                    {
                        error: "Invalid password",
                    },
                    403,
                    corsHeaders,
                );
            }
            
            let arr = [];
            
            try
            {
                if (rec.remarks)
                {
                    const tmp = JSON.parse(String(rec.remarks));
                    if (Array.isArray(tmp)) arr = tmp;
                }
            }
            catch (e)
            {}

            if (arr.length >= 10)
            {
                return json(
                    {
                        error: "Too many remarks",
                    },
                    400,
                    corsHeaders,
                );
            }
            
            const nowIso = new Date().toISOString();
            
            arr.push(
            {
                date: nowIso,
                text: remarkText,
            });
            
            await env.DB.prepare("UPDATE records SET remarks = ?2 WHERE id = ?1").bind(id, JSON.stringify(arr)).run();
            
            return json(
                {
                    ok: true,
                },
                200,
                corsHeaders,
            );
        }
        
        if (path === "/api/new" && request.method === "POST")
        {
            const adm = await requireAdmin(request);
            
            if (!adm.ok) return json(
            {
                error: adm.error
            }, adm.status, corsHeaders);

            if (!(await rateLimit("tag_create", 120, 60)))
            {
                return json(
                    {
                        error: "Too Many Requests",
                    },
                    429,
                    corsHeaders,
                );
            }
            
            if (origin && !corsAllowed)
            {
                return json(
                    {
                        error: "Forbidden",
                    },
                    403,
                    corsHeaders,
                );
            }
            
            const bodyRes = await readJsonWithLimits(request);
            
            if (!bodyRes.ok)
            {
                return json(
                    {
                        error: bodyRes.error,
                    },
                    bodyRes.status,
                    corsHeaders,
                );
            }
            
            const raw = bodyRes.value || {};
            let id;
            
            try
            {
                id = await generateUniqueId(env, 5);
            }
            catch
            {
                return json(
                    {
                        error: "Backend error",
                    },
                    500,
                    corsHeaders,
                );
            }
            
            const v = validateAndNormalizeRecord(raw);
            
            if (!v.ok)
            {
                return json(v.payload ? v.payload :
                {
                    error: v.error
                }, v.status || 400, corsHeaders);
            }
            
            const record = {
                id: id,
                ...v.value,
                created_at: new Date().toISOString(),
            };
            
            if (record["delpass"])
            {
                const salt = makeSalt();
                const hash = await sha256Hex(salt + ":" + record["delpass"]);
                delete record["delpass"];
                record["delpass_salt"] = salt;
                record["delpass_hash"] = hash;
                record["has_delpass"] = true;
                record["view_protect"] = !!record["view_protect"];
            }
            else
            {
                delete record["delpass"];
                record["has_delpass"] = false;
                record["view_protect"] = false;
                record["delpass_salt"] = "";
                record["delpass_hash"] = "";
            }
            
            try
            {
                await env.DB.prepare(
                        `INSERT INTO records (\n            id, owner, sport, date, date_format, tension_setting, tension_unit, tension_note,\n            pattern, prestretch, racket_info, racket_serial, string_info, grommet, machine,\n            stringer, fee, note, video, view_protect, has_delpass, delpass_salt, delpass_hash, created_at\n          ) VALUES (\n            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8,\n            ?9, ?10, ?11, ?12, ?13, ?14, ?15,\n            ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24\n          )`,
                    )
                    .bind(
                        record.id,
                        record.owner,
                        record.sport,
                        record.date,
                        record.date_format,
                        record.tension_setting,
                        record.tension_unit,
                        record.tension_note,
                        record.pattern,
                        record.prestretch,
                        record.racket_info,
                        record.racket_serial,
                        record.string_info,
                        record.grommet,
                        record.machine,
                        record.stringer,
                        record.fee,
                        record.note,
                        record.video,
                        record.view_protect ? 1 : 0,
                        record.has_delpass ? 1 : 0,
                        record.delpass_salt,
                        record.delpass_hash,
                        record.created_at,
                    )
                    .run();
            }
            catch (e)
            {
                return json(
                    {
                        error: "Backend error",
                    },
                    500,
                    corsHeaders,
                );
            }
            return json(
                {
                    ok: true,
                    id: id,
                },
                200,
                corsHeaders,
            );
        }
        
        const m = path.match(/^\/api\/r\/([A-Za-z]{8})$/);
        
        if (m && request.method === "GET")
        {
            const id = m[1];
            
            if (id === "_RACKET" || id === "_PATTERN" || id === "_STRING" || id === "_STRINGER")
            {
                const raw = await env.KV.get(id);
                let obj = {};
                
                if (raw)
                {
                    try
                    {
                        obj = JSON.parse(raw);
                    }
                    catch (e)
                    {
                        obj = {};
                    }
                }
                
                return json(obj, 200, corsHeaders);
            }
            
            let row;
            
            try
            {
                row = await env.DB.prepare("SELECT * FROM records WHERE id = ?1").bind(id).first();
            }
            catch (e)
            {
                return new Response("Backend Error",
                {
                    status: 500,
                    headers: corsHeaders,
                });
            }
            
            if (!row)
            {
                const ip = request.headers.get("CF-Connecting-IP") || "";

                return new Response("Not Found",
                {
                    status: 404,
                    headers: corsHeaders,
                });
            }
            
            const rec = rowToRecord(row);
            
            if (rec && rec.view_protect && rec.delpass_hash && rec.delpass_salt)
            {
                return json(
                    {
                        error: "Password required",
                    },
                    403,
                    corsHeaders,
                );
            }
            
            const out = {
                ...rec,
            };
            
            delete out.delpass_hash;
            delete out.delpass_salt;
            out.has_delpass = !!rec.delpass_hash;
            return json(out, 200, corsHeaders);
        }
        
        if (path.startsWith("/api/r/") && request.method === "GET")
        {
            const raw = path.slice("/api/r/".length);
            const ip = request.headers.get("CF-Connecting-IP") || "";
            
            return new Response("Bad Request",
            {
                status: 400,
                headers: corsHeaders,
            });
        }
        
        return new Response("Not Found",
        {
            status: 404,
            headers: corsHeaders,
        });
    },
};

function json(obj, status = 200, extraHeaders = {})
{
    return new Response(JSON.stringify(obj),
    {
        status: status,
        headers:
        {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            ...extraHeaders,
        },
    });
}

function randomId(len)
{
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const bytes = new Uint8Array(len);
    crypto.getRandomValues(bytes);
    let out = "";
    
    for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
    
    return out;
}

async function generateUniqueId(env, maxTries = 5)
{
    if (!env.DB) throw new Error("missing_d1_binding");
    
    for (let i = 0; i < maxTries; i++)
    {
        const id = randomId(8);
        const existed = await env.DB.prepare("SELECT 1 FROM records WHERE id = ?1").bind(id).first();
        if (!existed) return id;
    }
    
    throw new Error("id_collision");
}

async function readJsonWithLimits(request)
{
    const ct = (request.headers.get("Content-Type") || "").toLowerCase();
    
    if (!ct.includes("application/json"))
    {
        return {
            ok: false,
            status: 415,
            error: "Content-Type must be application/json",
            reason: "bad_content_type",
        };
    }
    
    const MAX_BYTES = 16 * 1024;
    const cl = Number(request.headers.get("Content-Length") || "0");
    
    if (Number.isFinite(cl) && cl > MAX_BYTES)
    {
        return {
            ok: false,
            status: 413,
            error: "Payload too large",
            reason: "body_too_large",
        };
    }
    
    let text;
    
    try
    {
        text = await request.text();
    }
    catch
    {
        return {
            ok: false,
            status: 400,
            error: "Invalid JSON",
            reason: "invalid_json",
        };
    }
    
    if (text.length > MAX_BYTES)
    {
        return {
            ok: false,
            status: 413,
            error: "Payload too large",
            reason: "body_too_large",
        };
    }
    
    try
    {
        const value = JSON.parse(text || "{}");
        return {
            ok: true,
            value: value,
        };
    }
    catch
    {
        return {
            ok: false,
            status: 400,
            error: "Invalid JSON",
            reason: "invalid_json",
        };
    }
}

function validateAndNormalizeRecord(body)
{
    const out = {};
    const eSport = _checkMax(body.sport, 16, "label_sport");
    
    if (eSport) 
    {
        return {
            ok: false,
            payload: eSport
        };
    }
    
    const eDateFmt = _checkMax(body.dateFormat ?? body.date_format, 16, "label_date_format");
    
    if (eDateFmt)
    {
        return {
            ok: false,
            payload: eDateFmt
        };
    }
    
    const eDate = _checkMax(body.date, 16, "label_date");
    
    if (eDate)
    {
        return {
            ok: false,
            payload: eDate
        };
    }
    
    const eFee = _checkMax(body.fee, 16, "label_fee");
    
    if (eFee)
    {
        return {
            ok: false,
            payload: eFee
        };
    }

    const eOwner = _checkMax(body.owner, 32, "label_owner");
    
    if (eOwner)
    {
        return {
            ok: false,
            payload: eOwner
        };
    }
    
    const ePrestretch = _checkMax(body.prestretch, 32, "label_prestretch");
    
    if (ePrestretch)
    {
        return {
            ok: false,
            payload: ePrestretch
        };
    }
    
    const ePattern = _checkMax(body.pattern, 32, "label_pattern");
    
    if (ePattern) 
    {
        return {
            ok: false,
            payload: ePattern
        };
    }
    
    const eRacket = _checkMax(body.racket_info, 32, "label_racket_info");
    
    if (eRacket) 
    {
        return {
            ok: false,
            payload: eRacket
        };
    }
    
    const eGrommet = _checkMax(body.grommet, 32, "label_grommet");
    
    if (eGrommet) 
    {
        return {
            ok: false,
            payload: eGrommet
        };
    }
    
    const eMachine = _checkMax(body.machine, 64, "label_machine");
    
    if (eMachine) 
    {
        return {
            ok: false,
            payload: eMachine
        };
    }
    
    const eStringer = _checkMax(body.stringer, 32, "label_stringer");
    
    if (eStringer) 
    {
        return {
            ok: false,
            payload: eStringer
        };
    }
    
    const eDelpass = _checkMax(body.delpass, 32, "label_delpass");
    
    if (eDelpass) 
    {
        return {
            ok: false,
            payload: eDelpass
        };
    }

    const eVideo = _checkMax(body.video, 64, "label_video");
    
    if (eVideo) 
    {
        return {
            ok: false,
            payload: eVideo
        };
    }

    const eNote = _checkMax(body.note, 256, "label_note");
    
    if (eNote) 
    {
        return {
            ok: false,
            payload: eNote
        };
    }

    const ctlChecks = [
        ["owner", "label_owner"],
        ["tension_note", "label_tension_note"],
        ["pattern", "label_pattern"],
        ["prestretch", "label_prestretch"],
        ["racket_info", "label_racket_info"],
        ["racket_serial", "label_racket_serial"],
        ["string_info", "label_string_info"],
        ["grommet", "label_grommet"],
        ["machine", "label_machine"],
        ["stringer", "label_stringer"],
        ["fee", "label_fee"],
        ["delpass", "label_delpass"],
    ];
    
    for (const [fk, lk] of ctlChecks)
    {
        if (_hasDisallowedCtl(body[fk])) 
        {
            return  {
            ok: false,
            payload: _badCharsResp(lk)
            };
        }
    }
    
    if (_hasDisallowedCtl(body.note,
        {
            allowNewlines: true,
            allowTabs: true
        }))
    {
        return {
            ok: false,
            payload: _badCharsResp("label_note")
        };
    }
    
    if (_hasDisallowedCtl(body.video)) 
    {
        return {
            ok: false,
            payload: _badCharsResp("label_video")
        };
    }

    function cleanStr(key, def = "")
    {
        return String(body[key] ?? def).trim();
    }
    
    const date = String(body.date || "").trim();
    const tension_setting_raw = String(body.tension_setting || "").trim();
    const tension_unit = String(body.tension_unit || "lbs")
        .trim()
        .slice(0, 8);
    const date_format = String(body.dateFormat || body.date_format || "YMD")
        .trim()
        .toUpperCase()
        .slice(0, 3);
    const sport_raw = String(body.sport || "badminton")
        .trim()
        .toLowerCase()
        .slice(0, 16);
    const sport = sport_raw === "tennis" ? "tennis" : "badminton";

    out.owner = cleanStr("owner");
    out.date = date;
    out.date_format = date_format;
    out.sport = sport;

    if (!["YMD", "DMY", "MDY"].includes(date_format))
    {
        return {
            ok: false,
            error: "Invalid date_format",
            reason: "invalid_date_format",
        };
    }
    
    if (!date)
    {
        return {
            ok: false,
            error: "date is required",
            reason: "missing_date",
        };
    }
    
    if (!isValidDate(date))
    {
        return {
            ok: false,
            error: "Invalid date format",
            reason: "invalid_date",
        };
    }
    
    if (!tension_setting_raw)
    {
        return {
            ok: false,
            error: "tension_setting is required",
            reason: "missing_tension",
        };
    }

    if (sport === "tennis")
    {
        const t = tension_setting_raw;
        
        if (!/^[A-Za-z0-9 \t./\\\-+:()]{1,24}$/.test(t))
        {
            return {
                ok: false,
                error: "Invalid tension_setting",
                reason: "invalid_tension_format",
            };
        }
        out.tension_setting = t;
    }
    else
    {
        if (!/^\d{1,3}(\.\d)?$/.test(tension_setting_raw))
        {
            return {
                ok: false,
                error: "Invalid tension_setting",
                reason: "invalid_tension_format",
            };
        }
        
        const tensionVal = Number(tension_setting_raw);
        
        if (!Number.isFinite(tensionVal) || tensionVal < 5 || tensionVal > 90)
        {
            return {
                ok: false,
                error: "Invalid tension_setting",
                reason: "invalid_tension_range",
            };
        }
        out.tension_setting = String(tensionVal % 1 === 0 ? Math.trunc(tensionVal) : tensionVal);
    }
    
    out.tension_unit = tension_unit || "lbs";
    out.tension_note = cleanStr("tension_note");
    out.pattern = cleanStr("pattern");
    out.prestretch = cleanStr("prestretch");
    out.racket_info = cleanStr("racket_info");
    out.racket_serial = cleanStr("racket_serial");
    out.string_info = cleanStr("string_info");
    out.grommet = cleanStr("grommet");
    out.machine = cleanStr("machine");
    out.stringer = cleanStr("stringer");
    out.fee = cleanStr("fee");
    out.note = cleanStr("note");
    let view_protect = false;
    
    try
    {
        view_protect = !!(body && body.view_protect);
    }
    catch (e)
    {}
    
    const delpass = cleanStr("delpass");
    
    if (delpass)
    {
        if (!/^[A-Za-z0-9]{4,12}$/.test(delpass))
        {
            return {
                ok: false,
                error: "Invalid delete password",
                reason: "invalid_delpass",
            };
        }
        
        out.delpass = delpass;
        out.view_protect = view_protect;
    }
    else
    {
        out.view_protect = false;
    }
    
    const video = cleanStr("video");
    
    if (video && !isValidHttpUrl(video))
    {
        return {
            ok: false,
            error: "Invalid video URL",
            reason: "invalid_video_url",
        };
    }
    
    out.video = video;
    
    return {
        ok: true,
        value: out,
    };
}

function rowToRecord(r)
{
    if (!r) return null;
    
    return {
        id: String(r.id || "").trim(),
        owner: String(r.owner || ""),
        sport: (function()
        {
            const s = String(r.sport || "")
                .trim()
                .toLowerCase();
            return s === "tennis" ? "tennis" : "badminton";
        })(),
        date: String(r.date || ""),
        date_format: String(r.date_format || "YMD"),
        tension_setting: String(r.tension_setting || ""),
        tension_unit: String(r.tension_unit || "lbs"),
        tension_note: String(r.tension_note || ""),
        pattern: String(r.pattern || ""),
        prestretch: String(r.prestretch || ""),
        racket_info: String(r.racket_info || ""),
        racket_serial: String(r.racket_serial || ""),
        string_info: String(r.string_info || ""),
        grommet: String(r.grommet || ""),
        machine: String(r.machine || ""),
        stringer: String(r.stringer || ""),
        fee: String(r.fee || ""),
        note: String(r.note || ""),
        video: String(r.video || ""),
        remarks: r.remarks === null || r.remarks === undefined ? "" : String(r.remarks),
        view_protect: !!r.view_protect,
        has_delpass: !!r.has_delpass,
        delpass_salt: String(r.delpass_salt || ""),
        delpass_hash: String(r.delpass_hash || ""),
        created_at: String(r.created_at || ""),
    };
}

function isValidHttpUrl(s)
{
    try
    {
        const raw = String(s || "");

        if (/\s/.test(raw)) return false;
        if (_hasDisallowedCtl(raw)) return false;
        
        const u = new URL(s);
        
        return u.protocol === "http:" || u.protocol === "https:";
    }
    catch
    {
        return false;
    }
}

function isValidDate(s)
{
    const m1 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const m2 = s.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    const m = m1 || m2;
    
    if (!m) return false;
    
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    
    if (mo < 1 || mo > 12) return false;
    if (d < 1 || d > 31) return false;
    
    const dt = new Date(Date.UTC(y, mo - 1, d));
    
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function normalizeDate(s)
{
    const m1 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    
    if (m1) return s;
    
    const m2 = s.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    
    if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
    
    return s;
}

function shouldLogFailure(ip, reason)
{
    const bucket = Math.floor(Date.now() / 6e4);
    const key = `${ip || "noip"}|${reason}|${bucket}`;
    const h = sha256ToUint(key);
    
    return h % 5 === 0;
}

function sha256ToUint(s)
{
    let h = 2166136261;
    
    for (let i = 0; i < s.length; i++)
    {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    
    return h >>> 0;
}

async function sha256Hex(str)
{
    const enc = new TextEncoder();
    const buf = enc.encode(str);
    const digest = await crypto.subtle.digest("SHA-256", buf);
    const arr = Array.from(new Uint8Array(digest));
    
    return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function makeSalt()
{
    const a = new Uint8Array(16);
    crypto.getRandomValues(a);
    let s = "";
    
    for (const b of a) s += String.fromCharCode(b);
    
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function safeEq(a, b)
{
    a = String(a || "");
    b = String(b || "");
    
    if (a.length !== b.length) return false;
    
    let r = 0;
    
    for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
    
    return r === 0;
}
