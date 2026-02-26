(function()
{
    const $ = (id) => document.getElementById(id);
    const t = (key, fallback = "") =>
    {
        try
        {
            const v = window.i18n && typeof window.i18n.t === "function" ? window.i18n.t(key) : "";

            if (!v || v === key) return fallback;
            return v;
        }
        catch (e)
        {
            return fallback;
        }
    };
    
    const state = {
        authed: false,
        dict: "_RACKET",
        items: [],
        filtered: [],
        dirty: false,
        baselineSig: "",
        baselineSetLower: new Set(),
        currentSig: "",
        currentSetLower: new Set(),
        loading: false,
    };
    
    const batchPlaceholder = {
        _RACKET: "Example：\nYonex NF700\nYonex Astrox 99\n...",
        _PATTERN: "Example：\n2-Piece\nYonex Pattern\nAround The World\n...",
        _STRING: "Example：\nYonex BG66UM\nYonex BG80\nLi-Ning No.1\n...",
        _RACKET_T: "Example：\nWilson Pro Staff\nBabolat Pure Aero\nHead Speed\n...",
        _PATTERN_T: "Example：\n16x19\n18x20\nATW\n...",
        _STRING_T: "Example：\nLuxilon ALU Power\nRPM Blast\nVS Touch\n...",
        _MACHINE: "Example：\nPicoBETH\nYonex Precision 8\nBabolat Sensor\n...",
        _STRINGER: "Example：\nKuoKuo\nAlex\nStringLab\n...",
    };

    function getTurnstileToken()
    {
        const el = document.querySelector('[name="cf-turnstile-response"]');
        return el ? String(el.value || "").trim() : "";
    }

    function resetTurnstile()
    {
        try
        {
            if (window.turnstile && typeof window.turnstile.reset === "function")
            {
                window.turnstile.reset();
            }
        }
        catch (e)
        {}
    }

    function updateBatchPlaceholder()
    {
        const ph = batchPlaceholder[state.dict] || batchPlaceholder._RACKET;
        $("batch").setAttribute("placeholder", ph);
    }
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
        if (!okEl || !errEl) return false;
        okEl.textContent = "";
        errEl.textContent = "";
        okEl.style.display = "none";
        errEl.style.display = "none";
        okEl.classList.remove("show");
        errEl.classList.remove("show");
        const el = ok ? okEl : errEl;
        el.textContent = String(msg || "");
        el.style.display = "block";
        requestAnimationFrame(() => el.classList.add("show"));
        clearTimeout(_statusTimer);
        _statusTimer = setTimeout(() => _hideStatus(el), 3e3);
        return true;
    }

    function toast(msg, ok = true)
    {
        if (setStatus(!!ok, msg)) return;
        const t = $("toast");
        if (!t) return;
        t.textContent = String(msg || "");
        t.style.display = "block";
        clearTimeout(toast._tm);
        toast._tm = setTimeout(() => (t.style.display = "none"), 1800);
    }
    
    async function api(path, opt)
    {
        opt = opt || {};
        opt.headers = Object.assign(
            {
                "Content-Type": "application/json",
            },
            opt.headers || {},
        );
        opt.credentials = "include";
        const res = await fetch(path, opt);
        const ct = (res.headers.get("content-type") || "").toLowerCase();
        let data = null;
        if (ct.includes("application/json"))
        {
            try
            {
                data = await res.json();
            }
            catch (e)
            {
                data = null;
            }
        }
        else
        {
            try
            {
                data = await res.text();
            }
            catch (e)
            {
                data = null;
            }
        }
        if (!res.ok)
        {
            const msg = data && data.error ? data.error : typeof data === "string" ? data : "Request failed";
            const err = new Error(msg);
            err.status = res.status;
            err.data = data;
            throw err;
        }
        return data;
    }

    function setLoading(v)
    {
        state.loading = !!v;
        const ids = ["btnSave", "btnExport", "btnAddOne", "btnBatchAdd", "q", "addOne", "batch"];
        for (const id of ids)
        {
            const el = $(id);
            if (el) el.disabled = state.loading;
        }
        document.querySelectorAll(".dictPill").forEach((b) =>
        {
            b.disabled = state.loading;
        });
        const ov = $("loadingOverlay");
        if (ov)
        {
            ov.classList.toggle("isOpen", state.loading);
            ov.setAttribute("aria-hidden", state.loading ? "false" : "true");
        }
        const lt = $("loadingText");
        if (lt)
        {
            const msg = window.i18n && typeof window.i18n.t === "function" ? window.i18n.t("msg_loading") || "" : "";
            lt.textContent = msg || "Loading";
        }
    }
    
    const esc = (s) =>
        String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    const normalizeOne = (s) =>
        String(s || "")
        .replace(/\s+/g, " ")
        .trim();

    function canonicalizeItems(arr)
    {
        const seen = new Set();
        const out = [];
        for (const it of arr || [])
        {
            const n = normalizeOne(it);
            if (!n) continue;
            const k = n.toLowerCase();
            if (seen.has(k)) continue;
            seen.add(k);
            out.push(n);
        }
        out.sort((a, b) =>
            a.localeCompare(b, undefined,
            {
                sensitivity: "base",
            }),
        );
        return out;
    }

    function snapshotBaseline()
    {
        const canon = canonicalizeItems(state.items);
        state.baselineSig = JSON.stringify(canon);
        state.baselineSetLower = new Set(canon.map((v) => v.toLowerCase()));
    }

    function updateDirtyFromItems()
    {
        const canon = canonicalizeItems(state.items);
        state.currentSig = JSON.stringify(canon);
        state.currentSetLower = new Set(canon.map((v) => v.toLowerCase()));
        setDirty(state.currentSig !== state.baselineSig);
    }

    function markChanged()
    {
        updateDirtyFromItems();
    }

    function updateDirtyUI()
    {
        const el = $("dirtyHint");
        if (el) el.style.display = state.dirty ? "inline-flex" : "none";
    }

    function setDirty(v)
    {
        state.dirty = !!v;
        updateDirtyUI();
    }

    function normalizeAll()
    {
        const seen = new Set();
        const out = [];
        for (const it of state.items)
        {
            const n = normalizeOne(it);
            if (!n) continue;
            const k = n.toLowerCase();
            if (seen.has(k)) continue;
            seen.add(k);
            out.push(n);
        }
        state.items = out;
        markChanged();
    }

    function sortAZ()
    {
        state.items.sort((a, b) =>
            a.localeCompare(b, undefined,
            {
                sensitivity: "base",
            }),
        );
        markChanged();
    }

    function highlight(text, q)
    {
        if (!q) return esc(text);
        const t = String(text);
        const i = t.toLowerCase().indexOf(q.toLowerCase());
        if (i < 0) return esc(t);
        return esc(t.slice(0, i)) + "<mark>" + esc(t.slice(i, i + q.length)) + "</mark>" + esc(t.slice(i + q.length));
    }

    function renderList(q)
    {
        const list = $("list");
        list.innerHTML = "";
        if (!state.filtered.length)
        {
            list.innerHTML =
                '<div class="item"><div class="itemLeft muted">No matching items.</div><div class="itemActions"></div></div>';
            return;
        }
        const frag = document.createDocumentFragment();
        for (const idx of state.filtered)
        {
            const val = state.items[idx];
            const row = document.createElement("div");
            row.className = "item";
            row.dataset.idx = String(idx);
            if (state.dirty && !state.baselineSetLower.has(String(val || "").toLowerCase()))
                row.classList.add("itemDirty");
            const left = document.createElement("div");
            left.className = "itemLeft";
            const text = document.createElement("div");
            text.className = "itemText";
            text.innerHTML = highlight(val, q);
            text.addEventListener("click", () => startEdit(idx));
            left.appendChild(text);
            const actions = document.createElement("div");
            actions.className = "itemActions";
            const btnDel = document.createElement("button");
            btnDel.className = "btn btnDanger";
            btnDel.setAttribute("data-i18n", "btn_delete");
            btnDel.textContent = t("btn_delete", "Delete");
            btnDel.addEventListener("click", () =>
            {
                if (!confirm(`${t("admin_confirm_delete", "Confirm delete?")}\n\n${val}`)) return;
                state.items.splice(idx, 1);
                markChanged();
                computeFilter();
                toast(t("admin_deleted_not_saved", "Deleted. (Not saved yet.)"));
            });
            actions.appendChild(btnDel);
            row.appendChild(left);
            row.appendChild(actions);
            frag.appendChild(row);
        }
        list.appendChild(frag);
    }

    function computeFilter()
    {
        updateDirtyUI();
        const q = ($("q").value || "").trim();
        const idxs = [];
        if (!q)
        {
            for (let i = 0; i < state.items.length; i++) idxs.push(i);
        }
        else
        {
            const ql = q.toLowerCase();
            for (let i = 0; i < state.items.length; i++)
                if (state.items[i].toLowerCase().includes(ql)) idxs.push(i);
        }
        state.filtered = idxs;
        $("count").textContent = `${idxs.length} / ${state.items.length}`;
        renderList(q);
    }

    function startEdit(idx)
    {
        const row = $("list").querySelector(`.item[data-idx="${idx}"]`);
        if (!row) return;
        const val = state.items[idx];
        const left = row.querySelector(".itemLeft");
        left.innerHTML = "";
        const input = document.createElement("input");
        input.className = "itemInput itemInputInline";
        input.value = val;
        input.spellcheck = false;

        function commit()
        {
            const n = normalizeOne(input.value);
            if (!n)
            {
                toast(t("admin_ref_err_empty", "Cannot be empty."), false);
                input.focus();
                return;
            }
            const k = n.toLowerCase();
            for (let i = 0; i < state.items.length; i++)
            {
                if (i === idx) continue;
                if (state.items[i].toLowerCase() === k)
                {
                    toast(t("admin_ref_err_duplicate", "Duplicate item already exists."), false);
                    input.focus();
                    return;
                }
            }
            state.items[idx] = n;
            markChanged();
            computeFilter();
            toast(t("admin_ref_updated_not_saved", "Updated. (Not saved yet.)"));
        }
        input.addEventListener("keydown", (e) =>
        {
            if (e.key === "Enter")
            {
                e.preventDefault();
                commit();
            }
            if (e.key === "Escape")
            {
                computeFilter();
            }
        });
        input.addEventListener("blur", () => commit());
        left.appendChild(input);
        input.focus();
        input.select();
    }

    function addOne(v)
    {
        const n = normalizeOne(v);
        if (!n) return;
        const k = n.toLowerCase();
        for (const it of state.items)
            if (it.toLowerCase() === k)
            {
                toast(t("admin_ref_already_exists", "Already exists."), false);
                return;
            }
        state.items.unshift(n);
        markChanged();
        $("addOne").value = "";
        computeFilter();
        toast(t("admin_ref_added_not_saved", "Added. (Not saved yet.)"));
    }

    function batchAdd(text)
    {
        const lines = String(text || "")
            .split(/\r?\n/)
            .map(normalizeOne)
            .filter(Boolean);
        if (!lines.length)
        {
            toast(t("admin_ref_nothing_to_add", "Nothing to add."), false);
            return;
        }
        const set = new Set(state.items.map((x) => x.toLowerCase()));
        let added = 0;
        for (const l of lines)
        {
            const k = l.toLowerCase();
            if (set.has(k)) continue;
            set.add(k);
            state.items.push(l);
            added++;
        }
        if (added)
        {
            markChanged();
            computeFilter();
            toast(
                t("admin_ref_added_items_not_saved", "Added {n} items. (Not saved yet.)").replace("{n}", String(added)),
            );
        }
        else toast(t("admin_ref_no_new_items_all_exist", "No new items. (All items already exist.)"), false);
    }

    function setAuthed(on)
    {
        state.authed = !!on;
        const show = (id, yes, onDisp = "block", offDisp = "none") =>
        {
            const el = $(id);
            if (el) el.style.display = yes ? onDisp : offDisp;
        };
        show("loginCard", !on);
        show("menuCard", on);
        show("dictCard", on);
        show("btnLogout", on, "inline-flex", "none");
    }
    
    async function checkMe()
    {
        try
        {
            await api("/api/admin/me",
            {
                method: "GET",
            });
            setAuthed(true);
            return true;
        }
        catch (e)
        {
            setAuthed(false);
            return false;
        }
    }
    
    async function login()
    {
        const pw = ($("pw").value || "").trim();
        if (!pw)
        {
            $("loginMsg").textContent = "Please enter the password.";
            $("loginMsg").className = "msg err";
            return;
        }
        const ts = getTurnstileToken();
        if (!ts)
        {
            $("loginMsg").textContent = "Please complete the Turnstile challenge.";
            $("loginMsg").className = "msg err";
            return;
        }
        $("btnLogin").disabled = true;
        $("loginMsg").textContent = "Signing in...…";
        $("loginMsg").className = "msg";
        try
        {
            await api("/api/admin/login",
            {
                method: "POST",
                body: JSON.stringify(
                {
                    password: pw,
                    turnstile: ts,
                }),
            });
            $("pw").value = "";
            $("loginMsg").textContent = "";
            setAuthed(true);
            toast(t("admin_ref_signed_in", "Signed in."));
            await loadDict(state.dict);
        }
        catch (e)
        {
            $("loginMsg").textContent = e.message || "Sign-in failed.";
            $("loginMsg").className = "msg err";
            setAuthed(false);
            resetTurnstile();
        }
        finally
        {
            $("btnLogin").disabled = false;
        }
    }
    
    async function logout()
    {
        try
        {
            await api("/api/admin/logout",
            {
                method: "POST",
                body: "{}",
            });
        }
        catch (e)
        {}
        location.href = "../index.html";
    }

    function setDictButtons(dict)
    {
        document.querySelectorAll(".dictPill").forEach((b) => b.classList.toggle("active", b.dataset.dict === dict));
    }
    
    async function loadDict(dict)
    {
        state.dict = dict;
        setDictButtons(dict);
        $("q").value = "";
        $("batch").value = "";
        $("addOne").value = "";
        updateBatchPlaceholder();
        const countEl = $("count");
        const listEl = $("list");
        if (countEl) countEl.textContent = "";
        if (listEl) listEl.innerHTML = "";
        setLoading(true);
        try
        {
            const obj = await api("/api/admin/dict/" + encodeURIComponent(dict),
            {
                method: "GET",
            });
            const keys = Object.keys(obj || {})
                .map(normalizeOne)
                .filter(Boolean);
            keys.sort((a, b) =>
                a.localeCompare(b, undefined,
                {
                    sensitivity: "base",
                }),
            );
            state.items = keys;
            snapshotBaseline();
            updateDirtyFromItems();
            computeFilter();
        }
        catch (e)
        {
            toast(e.message || "Load failed.", false);
            setAuthed(false);
        }
        finally
        {
            setLoading(false);
        }
    }
    
    async function saveDict()
    {
        normalizeAll();
        sortAZ();
        const keys = state.items.slice(0);
        $("btnSave").disabled = true;
        try
        {
            await api("/api/admin/dict/" + encodeURIComponent(state.dict),
            {
                method: "POST",
                body: JSON.stringify(
                {
                    keys: keys,
                }),
            });
            snapshotBaseline();
            updateDirtyFromItems();
            toast(t("admin_ref_saved", "Saved."));
        }
        catch (e)
        {
            alert("Save failed.: " + (e.message || ""));
        }
        finally
        {
            $("btnSave").disabled = false;
            computeFilter();
        }
    }

    function exportJSON()
    {
        const payload = {
            dict: state.dict,
            keys: state.items.slice(0),
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)],
        {
            type: "application/json",
        });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${state.dict}_export.json`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() =>
        {
            URL.revokeObjectURL(a.href);
            a.remove();
        }, 1e3);
    }
    
    async function importJSON(file)
    {
        if (!file) return;
        try
        {
            const text = await file.text();
            const obj = JSON.parse(text);
            let keys = [];
            if (Array.isArray(obj)) keys = obj;
            else if (obj && Array.isArray(obj.keys)) keys = obj.keys;
            else if (obj && typeof obj === "object") keys = Object.keys(obj);
            if (!keys.length)
            {
                toast(t("admin_ref_json_no_keys", "JSON content has no keys."), false);
                return;
            }
            batchAdd(keys.join("\n"));
            toast(t("admin_ref_imported_not_saved", "Imported into the list. (Not saved yet.)"));
        }
        catch (e)
        {
            toast("Import failed.：JSON Invalid format.", false);
        }
        finally
        {
            $("fileImport").value = "";
        }
    }

    function wire()
    {
        const btnLogin = $("btnLogin");
        if (btnLogin) btnLogin.addEventListener("click", login);
        const pw = $("pw");
        if (pw)
            pw.addEventListener("keydown", (e) =>
            {
                if (e.key === "Enter") login();
            });
        const btnLogout = $("btnLogout");
        if (btnLogout) btnLogout.addEventListener("click", logout);
        document.querySelectorAll(".dictPill").forEach((b) =>
        {
            b.addEventListener("click", async () =>
            {
                if (!state.authed) return;
                if (
                    state.dirty &&
                    !confirm(
                        "You have unsaved changes.，Switching lists will discard unsaved changes.。\n\nContinue switching?？",
                    )
                )
                    return;
                await loadDict(b.dataset.dict);
            });
        });
        $("q").addEventListener("input", computeFilter);
        $("btnSave").addEventListener("click", saveDict);
        $("btnExport").addEventListener("click", exportJSON);
        $("fileImport").addEventListener("change", (e) => importJSON(e.target.files && e.target.files[0]));
        $("btnAddOne").addEventListener("click", () => addOne($("addOne").value));
        $("addOne").addEventListener("keydown", (e) =>
        {
            if (e.key === "Enter")
            {
                e.preventDefault();
                addOne($("addOne").value);
            }
            });
        $("btnBatchAdd").addEventListener("click", () => batchAdd($("batch").value));
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
        const ok = await checkMe();
        if (ok) await loadDict(state.dict);
    }
    init();
})();
