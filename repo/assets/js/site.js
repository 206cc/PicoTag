function tr(key)
{
    try
    {
        return (window.i18n && typeof window.i18n.t === 'function') ? window.i18n.t(key) : key;
    }
    catch (_)
    {
        return key;
    }
}

function showLoadingOverlay(text)
{
    const ov = document.getElementById('loadingOverlay');
    const t = document.getElementById('loadingText');
    
    if (t && text) t.textContent = text;
    if (ov) ov.classList.add('isOpen');
}

function hideLoadingOverlay()
{
    const ov = document.getElementById('loadingOverlay');
    
    if (ov) ov.classList.remove('isOpen');
}

function _hideStatus(el)
{
    try
    {
        el.classList.remove('show');
        setTimeout(() =>
        {
            el.style.display = 'none';
        }, 220);
    }
    catch (_)
    {}
}

function setStatus(ok, msg)
{
    const okEl = document.getElementById('statusOk');
    const errEl = document.getElementById('statusErr');
    
    if (!okEl || !errEl) return false;
    
    okEl.classList.remove('show');
    errEl.classList.remove('show');
    const el = ok ? okEl : errEl;
    el.textContent = String(msg || '');
    el.style.display = 'block';
    requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(setStatus._tm);
    setStatus._tm = setTimeout(() => _hideStatus(el), 1800);
    
    return true;
}

function toast(msg, ok = true)
{
    setStatus(!!ok, msg);
}

if (typeof window.sanitizeLinksHtml !== 'function')
{
    window.sanitizeLinksHtml = function(input)
    {
        const tpl = document.createElement('template');
        tpl.innerHTML = String(input || '');
        const out = document.createElement('div');
        const anchors = tpl.content.querySelectorAll('a');
        
        anchors.forEach(a =>
        {
            const clean = document.createElement('a');
            const href = (a.getAttribute('href') || '').trim();
            
            if (!/^https?:\/\//i.test(href) && !/^mailto:/i.test(href)) return;
            
            clean.setAttribute('href', href);
            const target = (a.getAttribute('target') || '').trim();
            
            if (target === '_blank')
            {
                clean.setAttribute('target', '_blank');
                clean.setAttribute('rel', 'noopener noreferrer');
            }
            
            clean.textContent = (a.textContent || '').trim() || href;
            out.appendChild(clean);
        });
        
        return out.innerHTML;
    };
}

var sanitizeLinksHtml = window.sanitizeLinksHtml;

async function getImageSizeKB(url)
{
    try
    {
        const u = String(url || '');
        
        if (!u) return null;

        let r = await fetch(u,
        {
            method: 'HEAD',
            mode: 'cors'
        });
        
        if (!r.ok) return null;
        
        const len = r.headers.get('content-length');
        
        if (!len) return null;
        
        const bytes = parseInt(len, 10);
        
        if (!isFinite(bytes) || bytes <= 0) return null;
        
        return Math.round(bytes / 1024);
    }
    catch (e)
    {
        return null;
    }
}

function looksLikeCompleteImageUrl(u)
{
    const s = String(u || '').trim();
    
    if (!s) return false;
    if (/^data:image\//i.test(s)) return true;
    
    const seg = s.split('?')[0].split('#')[0].split('/').pop() || '';
    
    return seg.includes('.') && seg.replace(/\./g, '').length > 0;
}

function wireImgPreview(inputId, imgId, msgId, fallback, opts)
{
    opts = opts || {};
    
    const deferInitial = !!opts.deferInitial;
    const input = document.getElementById(inputId);
    const img = document.getElementById(imgId);
    const msg = document.getElementById(msgId);
    
    if (!input || !img) return;
    
    const info = document.getElementById(String(msgId || '').replace('Msg', 'Info')) || document.getElementById((imgId || '') + 'Info') || null;

    function setInfo(t)
    {
        if (!info) return;
        
        info.textContent = t || '';
        info.style.display = t ? 'block' : 'none';
    }

    function setMsg(t, kind)
    {
        if (!msg) return;
        
        msg.textContent = t || '';
        msg.style.display = t ? 'inline-flex' : 'none';
        msg.classList.remove('muted', 'err', 'ok');
        msg.classList.add(kind || 'muted');
    }

    let tm = null;

    function applyNow()
    {
        const raw = String(input.value || '').trim();

        if (!raw)
        {
            setMsg('');
            img.style.display = '';
            img.src = fallback;
            
            if (typeof fitPreviewImg === 'function') fitPreviewImg(img);
            
            return;
        }

        if (typeof window.isAllowedMediaUrl === 'function' && !window.isAllowedMediaUrl(raw))
        {
            setMsg('Invalid URL. Use http/https or /assets/...', 'err');
            img.style.display = 'none';
            
            return;
        }

        if (!looksLikeCompleteImageUrl(raw))
        {
            setMsg('Keep typing… (URL not complete yet)', 'muted');
            img.style.display = 'none';
            
            return;
        }

        setMsg('');
        img.style.display = '';
        img.src = raw;
        
        if (typeof fitPreviewImg === 'function') fitPreviewImg(img);
    }

    input._applyPreview = applyNow;

    function schedule()
    {
        clearTimeout(tm);
        tm = setTimeout(applyNow, 450);
    }

    input.addEventListener('input', schedule);
    input.addEventListener('change', applyNow);
    input.addEventListener('blur', applyNow);

    img.addEventListener('load', async () =>
    {
        setMsg('', 'muted');
        img.style.display = '';
        
        if (typeof fitPreviewImg === 'function') fitPreviewImg(img);
        
        try
        {
            const w = img.naturalWidth || 0;
            const h = img.naturalHeight || 0;
            const meta = (w && h) ? `${w}×${h}px` : '';
            
            if (!meta)
            {
                setInfo('');
                return;
            }

            const kb = await getImageSizeKB(img.currentSrc || img.src);
            
            if (kb != null)
            {
                setInfo(`${meta} · ${kb} KB`);
            }
            else
            {
                setInfo(meta);
            }
        }
        catch (e)
        {
            setInfo('');
        }
    });
    
    img.addEventListener('error', () =>
    {
        setInfo('');

        setMsg('Image not found (404) or blocked by browser/CSP.', 'err');
        img.style.display = 'none';
    });

    if (!deferInitial)
    {
        applyNow();
    }
    else
    {

        try
        {
            setMsg(tr('msg_loading') + '...', 'muted');
        }
        catch (_)
        {}
        
        img.style.display = 'none';
        setInfo('');
    }

}

function sanitizeLinksHtml(input)
{
    const raw = String(input || '').trim();
    
    if (!raw) return '';

    const isSafeHref = (href) =>
    {
        const h = String(href || '').trim();
        
        if (!h) return false;
        if (/^(javascript|data|vbscript):/i.test(h)) return false;
        if (/^https?:\/\//i.test(h)) return true;
        if (/^mailto:/i.test(h)) return true;
        if (/^\//.test(h)) return true; 
        if (/^#/.test(h)) return true; 
        if (/^\.\//.test(h) || /^\.\.\//.test(h)) return true; 
        
        return false;
    };

    const tpl = document.createElement('template');
    tpl.innerHTML = raw;
    const out = document.createElement('div');
    const anchors = tpl.content.querySelectorAll('a');
    
    anchors.forEach(a =>
    {
        const href = (a.getAttribute('href') || '').trim();
        
        if (!isSafeHref(href)) return;

        const clean = document.createElement('a');
        clean.setAttribute('href', href);

        const target = (a.getAttribute('target') || '').trim();
        
        if (target === '_blank' && /^https?:\/\//i.test(href))
        {
            clean.setAttribute('target', '_blank');
            clean.setAttribute('rel', 'noopener noreferrer');
        }

        clean.textContent = (a.textContent || '').trim() || href;
        out.appendChild(clean);
    });

    if (!out.childNodes.length)
    {
        const lines = raw.split(/[\r\n]+/).map(s => s.trim()).filter(Boolean);
        const urlRe = /(https?:\/\/[^\s]+)|([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/ig;

        lines.forEach(line =>
        {
            let m;
            let added = 0;
            while ((m = urlRe.exec(line)) !== null)
            {
                const token = m[0];
                const href = token.includes('@') ? ('mailto:' + token) : token;
                
                if (!isSafeHref(href)) continue;

                const a = document.createElement('a');
                a.setAttribute('href', href);
                
                if (/^https?:\/\//i.test(href))
                {
                    a.setAttribute('target', '_blank');
                    a.setAttribute('rel', 'noopener noreferrer');
                }
                
                a.textContent = token;
                out.appendChild(a);
                out.appendChild(document.createTextNode(' '));
                added++;
            }
            
            if (!added)
            {
                out.appendChild(document.createTextNode(line));
                out.appendChild(document.createTextNode(' '));
            }
        });
    }

    return out.innerHTML.trim();
}

window.sanitizeLinksHtml = sanitizeLinksHtml;

function isAllowedMediaUrl(u)
{
    const s = String(u || '').trim();
    
    if (!s) return true;
    if (/^https?:\/\//i.test(s)) return true;
    if (/^\/assets\//i.test(s)) return true;
    if (/^assets\//i.test(s)) return true;
    if (/^\.\.\/assets\//i.test(s)) return true;
    
    return false;
}

window.isAllowedMediaUrl = isAllowedMediaUrl;

function resolveMediaUrl(u, fallback)
{
    const s = String(u || '').trim();
    
    if (!s) return fallback;
    
    return isAllowedMediaUrl(s) ? s : fallback;
}

window.resolveMediaUrl = resolveMediaUrl;

function fitPreviewImg(img)
{
    if (!img) return;

    function apply()
    {
        try
        {
            var w = img.naturalWidth || 0;
            
            if (!w) return;
            
            var target = w > 520 ? 520 : w;
            img.style.width = target + "px";
            img.style.maxWidth = "100%";
            img.style.height = "auto";
        }
        catch (e)
        {}
    }
    
    if (img.complete) apply();
    
    img.onload = apply;
}
// --- End helper functions ---

function renderFooterLinksPreview()
{
    const input = document.getElementById('footerLinks');
    const box = document.getElementById('footerLinksPreview');
    
    if (!input || !box) return;
    
    const v = String(input.value || '');

    box.innerHTML = v;
    box.classList.toggle('isEmpty', v.trim() === '');
}

document.addEventListener('DOMContentLoaded', () =>
{
    const fl = document.getElementById('footerLinks');
    
    if (fl)
    {
        fl.addEventListener('input', renderFooterLinksPreview);
        fl.addEventListener('change', renderFooterLinksPreview);
        fl.addEventListener('blur', renderFooterLinksPreview);
        renderFooterLinksPreview();
    }
});

async function loadSiteConfig()
{
    try
    {
        const r = await fetch('/api/admin/site',
        {
            credentials: 'include'
        });
        
        if (!r.ok) return;
        
        const d = await r.json();
        
        if (!d || typeof d !== 'object') return;
        
        const set = (id, val) =>
        {
            const el = document.getElementById(id);
            if (el) el.value = (val == null ? '' : String(val));
        };
        
        set('brandName', d.brandName);
        set('introTitle', d.introTitle);
        set('introText', d.introText);
        set('introMediaUrl', d.introMediaUrl);
        set('bgImageUrl', d.bgImageUrl);
        set('footerLinks', (d.footerLinksHtml != null ? d.footerLinksHtml : d.footerLinks));

        renderFooterLinksPreview && renderFooterLinksPreview();
        updateIntroMediaPreview && updateIntroMediaPreview();
        updateBgImagePreview && updateBgImagePreview();
    }
    catch (e)
    {}
}

if (typeof window.isAllowedMediaUrl !== 'function')
{
    window.isAllowedMediaUrl = function(u)
    {
        const s = String(u || '').trim();
        
        if (!s) return true;
        if (/^https?:\/\//i.test(s)) return true;
        if (/^\/assets\//i.test(s)) return true;
        if (/^assets\//i.test(s)) return true;
        if (/^\.\.\/assets\//i.test(s)) return true;
        
        return false;
    };
}

async function saveSiteConfig()
{
    showLoadingOverlay(tr('admin_site_saving'));
    
    try
    {
        showLoadingOverlay(tr('admin_site_saving'));

        const payload = {
            brandName: (document.getElementById('brandName')?.value || '').trim(),
            introTitle: (document.getElementById('introTitle')?.value || '').trim(),
            introText: (document.getElementById('introText')?.value || ''),
            introMediaUrl: (document.getElementById('introMediaUrl')?.value || '').trim(),
            bgImageUrl: (document.getElementById('bgImageUrl')?.value || '').trim(),
            footerLinksHtml: (document.getElementById('footerLinks')?.value || ''),
        };

        if (payload.introMediaUrl && !window.isAllowedMediaUrl(payload.introMediaUrl))
        {
            toast(tr('admin_site_intro_url_invalid'), false);
            
            return;
        }
        
        if (payload.bgImageUrl && !window.isAllowedMediaUrl(payload.bgImageUrl))
        {
            toast(tr('admin_site_bg_url_invalid'), false);
            
            return;
        }
        
        try
        {
            const r = await fetch('/api/admin/site',
            {
                method: 'POST',
                credentials: 'include',
                headers:
                {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            const d = await r.json().catch(() => null);
            
            if (!r.ok)
            {
                if (d && d.errorKey === 'err_field_too_long')
                {
                    toast(`Too long: ${d.fieldLabelKey || 'field'} (max ${d.max}, false)`);
                }
                else
                {
                    toast((d && (d.error || d.errorKey, false)) ? (d.error || d.errorKey) : 'Save failed.');
                }
                return;
            }
            
            toast(tr('admin_site_saved'), true);
        }
        catch (e)
        {
            toast(tr('admin_site_save_failed'), false);
        }

    }
    finally
    {
        hideLoadingOverlay();
    }
}

document.addEventListener('DOMContentLoaded', () =>
{
    const btn = document.getElementById('btnSaveSite');
    
    if (btn) btn.addEventListener('click', saveSiteConfig);
    
    loadSiteConfig();
});

document.addEventListener('DOMContentLoaded', () =>
{
    wireImgPreview('introMediaUrl', 'introMediaPreview', 'introMediaMsg', '/assets/img/demo_tag.jpg',
    {
        deferInitial: true
    });
    
    wireImgPreview('bgImageUrl', 'bgImagePreview', 'bgImageMsg', '/assets/img/bg.gif',
    {
        deferInitial: true
    });

    (async () =>
    {
        try
        {
            const r = await fetch('/api/site',
            {
                cache: 'no-store'
            });
            
            if (!r.ok) return;
            
            const cfg = await r.json();
            const setVal = (id, v) =>
            {
                const el = document.getElementById(id);
                
                if (!el) return;
                if (v === undefined || v === null) return;
                
                el.value = String(v);
            };

            setVal('brandName', cfg.brandName && cfg.brandName !== 'Brand name' ? cfg.brandName : '');
            setVal('introTitle', cfg.introTitle && cfg.introTitle !== 'Intro title' ? cfg.introTitle : '');
            setVal('introText', cfg.introText && cfg.introText !== 'Intro text' ? cfg.introText : '');
            setVal('introMediaUrl', cfg.introMediaUrl && cfg.introMediaUrl !== '/assets/img/demo_tag.jpg' ? cfg.introMediaUrl : '');
            setVal('bgImageUrl', cfg.bgImageUrl && cfg.bgImageUrl !== '/assets/img/bg.gif' ? cfg.bgImageUrl : '');
            setVal('footerLinks', cfg.footerLinksHtml || '');

            const introInput = document.getElementById('introMediaUrl');
            
            if (introInput && typeof introInput._applyPreview === 'function') introInput._applyPreview();
            
            const bgInput = document.getElementById('bgImageUrl');
            
            if (bgInput && typeof bgInput._applyPreview === 'function') bgInput._applyPreview();
            if (typeof renderFooterLinksPreview === 'function') renderFooterLinksPreview();
        }
        catch (_)
        {}
    })();

});

(function()
{
    function _maybeUpdate(e)
    {
        const t = e && e.target;
        
        if (!t || t.id !== 'footerLinks') return;
        
        try
        {
            renderFooterLinksPreview();
        }
        catch (_)
        {}
    }
    document.addEventListener('input', _maybeUpdate, true);
    document.addEventListener('change', _maybeUpdate, true);
    document.addEventListener('blur', _maybeUpdate, true);
    document.addEventListener('DOMContentLoaded', () =>
    {
        try
        {
            renderFooterLinksPreview();
        }
        catch (_)
        {}
    });
})();
