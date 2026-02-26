(function()
{
    const $ = (id) => document.getElementById(id);

    const t = (key, fallback = "", vars) =>
    {
        try
        {
            if (window.i18n && typeof window.i18n.t === "function")
            {
                const v = window.i18n.t(key, vars);
                if (v && v !== key) return v;
            }
        }
        catch (e)
        {}
        
        return fallback;
    };
    const esc = (s) =>
        String(s ?? "").replace(
            /[&<>"']/g,
            (ch) =>
            (
            {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            })[ch],
        );

    function toast(msg, isErr)
    {
        const okEl = $("statusOk");
        const errEl = $("statusErr");
        const el = isErr ? errEl : okEl;
        
        if (el)
        {
            el.textContent = String(msg || "");
            el.style.display = "block";
            el.classList.add("show");
            clearTimeout(toast._tm);
            
            toast._tm = setTimeout(() =>
            {
                el.classList.remove("show");
                setTimeout(() =>
                {
                    el.style.display = "none";
                }, 240);
            }, 1600);
            
            return;
        }
        
        const t = $("toast");
        
        if (!t) return;
        
        t.textContent = String(msg || "");
        t.style.display = "block";
        clearTimeout(toast._tm);
        
        toast._tm = setTimeout(() =>
        {
            t.style.display = "none";
        }, 1600);
    }

    async function copyText(text)
    {
        try
        {
            if (navigator.clipboard && navigator.clipboard.writeText)
            {
                await navigator.clipboard.writeText(text);
                return true;
            }
        }
        catch (e)
        {}
        
        try
        {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.setAttribute("readonly", "");
            ta.style.position = "fixed";
            ta.style.left = "-9999px";
            ta.style.top = "0";
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand("copy");
            ta.remove();
            return !!ok;
        }
        catch (e)
        {}
        
        return false;
    }

    function fmtCreated(v)
    {
        if (v == null || v === "") return "—";
        
        try
        {
            const d = new Date(v);
            if (isNaN(d.getTime())) return esc(String(v));
            const y = d.getFullYear();
            const mo = String(d.getMonth() + 1).padStart(2, "0");
            const da = String(d.getDate()).padStart(2, "0");
            const hh = String(d.getHours()).padStart(2, "0");
            const mm = String(d.getMinutes()).padStart(2, "0");
            return `${y}-${mo}-${da} ${hh}:${mm}`;
        }
        catch (e)
        {
            return "—";
        }
    }

    async function api(path, opt)
    {
        const r = await fetch(
            path,
            Object.assign(
                {
                    headers:
                    {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                },
                opt || {},
            ),
        );
        
        const txt = await r.text();
        let data;
        
        try
        {
            data = txt ? JSON.parse(txt) : {};
        }
        catch (_)
        {
            data = {
                error: txt || "Bad JSON"
            };
        }
        
        if (!r.ok || data?.ok === false)
        {
            const msg = data?.error || data?.message || `Database issue detected. Please go to Admin → System and initialize the database.`;
            throw new Error(msg);
        }
        
        return data;
    }

    function setAuthed(isAuthed, name)
    {
        const btnLogout = $("btnLogout");
        
        if (btnLogout)
        {
            btnLogout.style.display = isAuthed ? "inline-flex" : "none";
            btnLogout.classList.toggle("u-hidden", !isAuthed);
        }
        
        const card = $("recordsCard");
        
        if (card) card.style.display = isAuthed ? "" : "none";
        
        const loginCard = $("loginCard");
        
        if (loginCard) loginCard.style.display = isAuthed ? "none" : "";

        try
        {
            setExportEnabled(!!isAuthed);
        }
        catch (_)
        {}
    }

    const state = {
        authed: false,
        me: null,
        q: "",
        limit: 20,
        offset: 0,
        total: 0,
        totalAll: 0,
        sort: "created_at",
        dir: "desc",
        rows: [],
        loading: false,
    };

    function getLimit()
    {
        const el = $("pageSize");
        const n = parseInt(el?.value || "20", 10);
        
        return Math.max(1, Math.min(100, isFinite(n) ? n : 20));
    }

    function setLoading(v)
    {
        state.loading = !!v;
        const btnR = $("btnRefresh");
        const btnPrev = $("btnPrev");
        const btnNext = $("btnNext");
        
        if (btnR) btnR.disabled = state.loading;
        if (btnPrev) btnPrev.disabled = state.loading || state.offset <= 0;
        if (btnNext) btnNext.disabled = state.loading || state.offset + state.limit >= state.total;

        const ov = $("loadingOverlay");
        
        if (ov)
        {
            ov.classList.toggle("isOpen", state.loading);
            ov.setAttribute("aria-hidden", state.loading ? "false" : "true");
        }
        const lt = $("loadingText");
        
        if (lt) lt.textContent = (typeof t === "function" ? t("msg_loading") || "" : "") || "Loading";
    }

    function setStatus(msg, isErr)
    {
        const el = document.querySelector(".listStatus");
        
        if (!el) return;
        
        el.textContent = msg || "";
        
        if (!msg)
        {
            el.style.display = "none";
            el.style.padding = "";
            el.style.marginTop = "";
            el.style.borderRadius = "";
            el.style.fontWeight = "";
            el.style.border = "";
            el.style.background = "";
            el.style.color = "";
            return;
        }
        
        el.style.display = "block";
        el.style.padding = "10px 12px";
        el.style.marginTop = "10px";
        el.style.borderRadius = "12px";
        el.style.fontWeight = "700";
        
        if (isErr)
        {
            el.style.border = "1px solid rgba(239,68,68,.35)";
            el.style.background = "rgba(239,68,68,.08)";
            el.style.color = "#b91c1c";
        }
        else
        {
            el.style.border = "1px solid rgba(34,197,94,.35)";
            el.style.background = "rgba(34,197,94,.08)";
            el.style.color = "#166534";
        }
    }

    function setCount()
    {
        const el = $("count");
        
        if (!el) return;
        
        const a = state.total ? state.offset + 1 : 0;
        const b = Math.min(state.total, state.offset + state.limit);
        
        el.textContent = state.total ?
            window.i18n && typeof window.i18n.t === "function" ?
            window.i18n.t("admin_records_count",
            {
                a,
                b,
                n: state.total
            }) :
            `Showing ${a}–${b} / Total ${state.total} items` :
            window.i18n && typeof window.i18n.t === "function" ?
            window.i18n.t("admin_records_no_data") :
            "No data.";
    }

    function setDbTotal()
    {
        const el = $("dbTotal");
        
        if (!el) return;
        if (!state.totalAll)
        {
            el.textContent = "";
            return;
        }
        
        const msg =
            window.i18n && typeof window.i18n.t === "function" ?
            window.i18n.t("admin_records_db_total",
            {
                n: state.totalAll
            }) :
            `Database total: ${state.totalAll} records`;
        el.textContent = msg;
    }

    function render()
    {
        const tbody = $("list");
        
        if (!tbody) return;
        
        tbody.innerHTML = "";
        
        if (!state.rows.length)
        {
            tbody.innerHTML = `<tr><td colspan="7" class="muted u-p14">No data.</td></tr>`;
            return;
        }
        
        const start = state.offset + 1;
        
        for (let i = 0; i < state.rows.length; i++)
        {
            const r = state.rows[i];
            const id = r.id;
            const owner = r.owner ? esc(r.owner) : "—";
            const tension = r.tension_setting != null && r.tension_setting !== "" ? esc(r.tension_setting) : "—";
            const created = fmtCreated(r.created_at);
            const hasKey = Number(r.has_delpass || 0) === 1;
            const hasLock = Number(r.view_protect || 0) === 1;
            let flagsHtml = "";
            
            if (hasKey)
                flagsHtml += `<span class="flagIcon" title="${t("admin_records_flag_password_set", "Password set")}">🔑</span>`;
            
            if (hasLock)
                flagsHtml += `<span class="flagIcon" title="${t("admin_records_flag_protect", "View protection enabled")}">🔒</span>`;
            
            if (!flagsHtml) flagsHtml = `<span class="muted">—</span>`;
            
            const tr = document.createElement("tr");
            tr.className = "recordsRow";
            tr.dataset.id = id;
            tr.innerHTML = `
        <td class="tdIdx" data-label="#">${start + i}</td>
        <td class="tdId" data-label="${t("admin_records_th_tag_id", "Tag ID")}">
          <div class="idCell">
            <div class="idLine">${esc(id)}</div>
            <button class="iconBtn" data-act="copyurl" type="button" title="${t("admin_records_copy_url", "Copy URL")}">⧉</button>
          </div>
        </td>
        <td class="tdFlags" data-label="${t("admin_records_th_protection", "Protection")}"><div class="flagCell">${flagsHtml}</div></td>
        <td class="tdOwner" data-label="${t("admin_records_th_tag_name", "Tag Name")}">${owner}</td>
        <td class="tdTension" data-label="${t("admin_records_th_tension", "Tension")}">${tension}</td>
        <td class="tdCreated" data-label="${t("admin_records_th_created", "Created")}">${created}</td>
        <td class="tdActions" data-label="${t("admin_records_th_actions", "Actions")}">
          <div class="btnGroup">
            <a class="btn btnGhost btnSm" href="../?id=${encodeURIComponent(id)}" target="_blank" rel="noopener">${t("admin_records_btn_view", "View")}</a>
            <button class="btn btnDanger btnSm" data-act="delete" type="button">${t("btn_delete", "Delete")}</button>
          </div>
        </td>
      `;
            tbody.appendChild(tr);
        }
    }

    async function load()
    {
        state.limit = getLimit();
        const qs = new URLSearchParams();
        qs.set("limit", String(state.limit));
        qs.set("offset", String(state.offset));
        qs.set("sort", state.sort);
        qs.set("dir", state.dir);
        const q = ($("q")?.value || "").trim();
        state.q = q;
        
        if (q) qs.set("q", q);

        setLoading(true);
        setStatus("");
        
        try
        {
            const data = await api(`/api/admin/records?${qs.toString()}`,
            {
                method: "GET"
            });
            
            if (data && data.dbError)
            {
                state.dbIssue = true;
                setStatus((window.i18n && typeof window.i18n.t === "function" ? (window.i18n.t("admin_db_issue_detected") || "") : "") || "Database issue detected. Please go to Admin → System and initialize the database.", true);
                
                try
                {
                    if (window.i18n && window.i18n.ready) await window.i18n.ready;
                }
                catch (_)
                {}
                
                setStatus((window.i18n && typeof window.i18n.t === "function" ? (window.i18n.t("admin_db_issue_detected") || "") : "") || "Database issue detected. Please go to Admin → System and initialize the database.", true);
                state.total = 0;
                state.totalAll = 0;
                state.rows = [];
                setCount();
                setDbTotal();
                render();
                
                return;
            }

            state.dbIssue = false;
            state.total = Number(data.total || 0);
            state.totalAll = Number(data.total_all || 0);
            state.rows = Array.isArray(data.rows) ? data.rows : [];
            setStatus("");
            setCount();
            setDbTotal();
            render();
        }
        catch (e)
        {
            const m = String((e && e.message) ? e.message : e);
            
            if (m.includes("HTTP 500") || m.includes("Internal Server Error") || m.includes("Backend error") || m.includes("D1"))
            {
                setStatus((window.i18n && typeof window.i18n.t === "function" ? (window.i18n.t("admin_db_issue_detected") || "") : "") || "Database issue detected. Please go to Admin → System and initialize the database.", true);
            }
            else
            {
                setStatus(m, true);
            }
            
            state.rows = [];
            state.total = 0;
            state.totalAll = 0;
            setCount();
            setDbTotal();
            render();
        }
        finally
        {
            setLoading(false);
        }
    }

    async function checkMe()
    {
        try
        {
            const me = await api("/api/admin/me",
            {
                method: "GET"
            });
            
            state.authed = true;
            state.me = me;
            setAuthed(true, me?.name || "");
            
            await load();
        }
        catch (_)
        {
            state.authed = false;
            state.me = null;
            setAuthed(false);
        }
    }

    async function doLogin()
    {
        const pass = $("pw")?.value || "";
        
        try
        {
            const r = await api("/api/admin/login",
            {
                method: "POST",
                body: JSON.stringify(
                {
                    password: pass
                })
            });
            
            if ($("pw")) $("pw").value = "";
            
            try
            {
                if (window.i18n && window.i18n.ready) await window.i18n.ready;
            }
            catch (_)
            {}
            
            await checkMe();
        }
        catch (e)
        {
            const m = $("loginMsg");
            
            if (m)
            {
                m.textContent = e?.message || "Login failed";
            }
            else
            {
                alert(e?.message || "Login failed");
            }
        }
    }

    async function doLogout()
    {
        try
        {
            await api("/api/admin/logout",
            {
                method: "POST"
            });
        }
        catch (_)
        {}
        
        location.href = "../index.html";
    }

    async function doDelete(id)
    {
        if (!id) return;
        
        if (
            !confirm(
                t(
                    "admin_records_confirm_delete",
                    `Are you sure you want to delete ${id}? This action cannot be undone.`,
                    {
                        id
                    },
                ),
            )
        )
            return;
        
        try
        {
            await api(`/api/admin/record/${encodeURIComponent(id)}/delete`,
            {
                method: "POST"
            });
            if (state.offset >= Math.max(0, state.total - 1)) state.offset = Math.max(0, state.offset - state.limit);
            await load();
        }
        catch (e)
        {
            alert(e?.message || t("admin_records_delete_failed", t("admin_records_delete_failed", "Delete failed")));
        }
    }

    function exportPage()
    {
        const ids = state.rows.map((r) => r.id).filter(Boolean);
        
        const blob = new Blob([ids.join("\n")],
        {
            type: "text/plain;charset=utf-8"
        });
        
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `picotag_ids_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() =>
        {
            URL.revokeObjectURL(a.href);
            a.remove();
        }, 0);
    }

    function pad2(n)
    {
        return String(n).padStart(2, "0");
    }

    function ymdLocal(d)
    {
        const y = d.getFullYear();
        const m = pad2(d.getMonth() + 1);
        const da = pad2(d.getDate());
        
        return `${y}-${m}-${da}`;
    }

    function addDays(d, n)
    {
        const x = new Date(d.getTime());
        x.setDate(x.getDate() + n);
        
        return x;
    }

    function startOfMonth(d)
    {
        return new Date(d.getFullYear(), d.getMonth(), 1);
    }

    function endOfPrevMonth(d)
    {
        return new Date(d.getFullYear(), d.getMonth(), 0);
    }

    function startOfPrevMonth(d)
    {
        return new Date(d.getFullYear(), d.getMonth() - 1, 1);
    }

    function calcRange(preset)
    {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (preset === "last_month")
        {
            const from = startOfPrevMonth(today);
            const to = endOfPrevMonth(today);
            return {
                from: ymdLocal(from),
                to: ymdLocal(to)
            };
        }
        
        if (preset === "last_7")
        {
            const from = addDays(today, -6);
            return {
                from: ymdLocal(from),
                to: ymdLocal(today)
            };
        }
        
        if (preset === "last_30")
        {
            const from = addDays(today, -29);
            return {
                from: ymdLocal(from),
                to: ymdLocal(today)
            };
        }
        
        const from = startOfMonth(today);
        
        return {
            from: ymdLocal(from),
            to: ymdLocal(today)
        };
    }

    function getExportEls()
    {
        return {
            preset: $("exportPreset"),
            from: $("exportFrom"),
            to: $("exportTo"),
            btn: $("btnExportCsv"),
        };
    }

    function setExportEnabled(on)
    {
        const
        {
            btn,
            preset,
            from,
            to
        } = getExportEls();
        
        if (btn) btn.disabled = !on;
        if (preset) preset.disabled = !on;
        if (from) from.disabled = !on;
        if (to) to.disabled = !on;
    }

    function initExportDefaults()
    {
        const
        {
            preset,
            from,
            to
        } = getExportEls();
        
        if (!preset || !from || !to) return;
        
        const r = calcRange("this_month");
        preset.value = "this_month";
        from.value = r.from;
        to.value = r.to;
    }

    function normalizeYmd(s)
    {
        const v = String(s || "").trim();
        return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "";
    }

    async function exportCsv()
    {
        if (!state.authed)
        {
            alert(t("admin_signin_required", "Please sign in as admin first."));
            return;
        }
        
        const
        {
            from,
            to
        } = getExportEls();
        
        const a = normalizeYmd(from?.value);
        const b = normalizeYmd(to?.value);
        
        if (!a || !b)
        {
            alert(t("admin_records_select_valid_range", "Please select a valid date range."));
            return;
        }
        
        if (a > b)
        {
            alert(t("admin_records_invalid_range", "Invalid date range: From must be earlier than To."));
            return;
        }

        const qs = new URLSearchParams();
        qs.set("from", a);
        qs.set("to", b);

        const btn = $("btnExportCsv");
        const oldText = btn ? btn.textContent : "";
        
        if (btn)
        {
            btn.disabled = true;
            btn.textContent = t("admin_records_exporting", "Exporting...");
        }

        try
        {
            const r = await fetch(`/api/admin/records/export?${qs.toString()}`,
            {
                method: "GET",
                credentials: "include",
            });
            
            if (!r.ok)
            {
                const ct = (r.headers.get("Content-Type") || "").toLowerCase();
                if (ct.includes("application/json"))
                {
                    const j = await r.json().catch(() => null);
                    throw new Error(j?.error || `HTTP ${r.status}`);
                }
                const t = await r.text().catch(() => "");
                throw new Error(t || `HTTP ${r.status}`);
            }
            
            const blob = await r.blob();
            const disp = r.headers.get("Content-Disposition") || "";
            let filename = "";
            const m = disp.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
            
            if (m) filename = decodeURIComponent(m[1] || m[2] || "");
            if (!filename) filename = `picotag_records_${a}_to_${b}.csv`;

            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            setTimeout(() =>
            {
                URL.revokeObjectURL(link.href);
                link.remove();
            }, 0);
        }
        catch (e)
        {
            alert(e?.message || t("admin_records_export_failed", "Export failed"));
        }
        finally
        {
            if (btn)
            {
                btn.disabled = false;
                btn.textContent = oldText || "Export CSV";
            }
        }
    }

    function wire()
    {
        const btnLogin = $("btnLogin");
        
        if (btnLogin) btnLogin.addEventListener("click", doLogin);
        
        const pw = $("pw");
        
        if (pw)
        {
            pw.addEventListener("keydown", (e) =>
            {
                if (e.key === "Enter") doLogin();
            });
        }

        const btnLogout = $("btnLogout");
        
        if (btnLogout) btnLogout.addEventListener("click", doLogout);

        const btnRefresh = $("btnRefresh");
        
        if (btnRefresh)
        {
            btnRefresh.addEventListener("click", () =>
            {
                state.offset = 0;
                load();
            });
        }

        const pageSize = $("pageSize");
        
        if (pageSize)
        {
            pageSize.addEventListener("change", () =>
            {
                state.offset = 0;
                load();
            });
        }

        const q = $("q");
        
        if (q)
        {
            let t = null;
            
            q.addEventListener("input", () =>
            {
                clearTimeout(t);
                t = setTimeout(() =>
                {
                    state.offset = 0;
                    load();
                }, 250);
            });
        }

        const btnPrev = $("btnPrev");
        
        if (btnPrev)
        {
            btnPrev.addEventListener("click", () =>
            {
                state.offset = Math.max(0, state.offset - state.limit);
                load();
            });
        }

        const btnNext = $("btnNext");
        
        if (btnNext)
        {
            btnNext.addEventListener("click", () =>
            {
                if (state.offset + state.limit < state.total)
                {
                    state.offset += state.limit;
                    load();
                }
            });
        }

        const btnExport = $("btnExport");
        
        if (btnExport) btnExport.addEventListener("click", exportPage);

        const ex = getExportEls();
        
        if (ex.preset)
        {
            ex.preset.addEventListener("change", () =>
            {
                const v = ex.preset.value;
                
                if (v === "custom") return;
                
                const r = calcRange(v);
                
                if (ex.from) ex.from.value = r.from;
                if (ex.to) ex.to.value = r.to;
            });
        }
        
        if (ex.from)
        {
            ex.from.addEventListener("click", () =>
            {
                try
                {
                    ex.from.showPicker?.();
                }
                catch (_)
                {}
            });
            
            ex.from.addEventListener("change", () =>
            {
                if (ex.preset) ex.preset.value = "custom";
            });
        }
        
        if (ex.to)
        {
            ex.to.addEventListener("click", () =>
            {
                try
                {
                    ex.to.showPicker?.();
                }
                catch (_)
                {}
            });
            
            ex.to.addEventListener("change", () =>
            {
                if (ex.preset) ex.preset.value = "custom";
            });
        }
        
        if (ex.btn) ex.btn.addEventListener("click", exportCsv);

        document.querySelectorAll(".thBtn").forEach((btn) =>
        {
            btn.addEventListener("click", () =>
            {
                const k = btn.getAttribute("data-sort");
                
                if (!k) return;
                if (state.sort === k)
                {
                    state.dir = state.dir === "asc" ? "desc" : "asc";
                }
                else
                {
                    state.sort = k;
                    state.dir = k === "created_at" ? "desc" : "asc";
                }
                
                state.offset = 0;
                load();
            });
        });

        const tbody = $("list");
        
        if (tbody)
        {
            tbody.addEventListener("click", (e) =>
            {
                const act = e.target?.getAttribute?.("data-act");
                
                if (!act) return;
                
                const tr = e.target.closest("tr");
                const id = tr?.dataset?.id;
                
                if (!id) return;
                if (act === "delete") doDelete(id);
                if (act === "copyurl")
                {
                    const url = `${location.origin}/?id=${id}`;
                    
                    copyText(url).then((ok) =>
                        toast(
                            ok ?
                            t("toast_copied", t("btn_copied", "Copied!")) :
                            t("toast_copy_failed", t("admin_records_copy_failed", "Copy failed.")),
                        ),
                    );
                }
            });
        }
    }

    async function init()
    {
        try
        {
            if (window.__ADMIN_GUARD__ && !(await window.__ADMIN_GUARD__)) return;
        }
        catch (_)
        {}
        
        wire();
        initExportDefaults();
        
        document.addEventListener("i18n:changed", function()
        {
            try
            {
                if (state.dbIssue)
                {
                    setStatus((window.i18n && typeof window.i18n.t === "function" ? (window.i18n.t("admin_db_issue_detected") || "") : "") || "Database issue detected. Please go to Admin → System and initialize the database.", true);
                }
            }
            catch (_)
            {}
            
            try
            {
                setCount();
            }
            catch (_)
            {}
            
            try
            {
                setDbTotal();
            }
            catch (_)
            {}
        });
        await checkMe();
    }

    document.addEventListener("DOMContentLoaded", init);
})();
