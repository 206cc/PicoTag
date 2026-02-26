(function()
{
    "use strict";

    function ensureLabelFontLoaded()
    {
        try
        {
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

    function _getEl(id)
    {
        return document.getElementById(id);
    }

    function downloadCanvasPng(canvas, filename)
    {
        if (!canvas) return;
        
        var a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = filename || "qr.png";
        
        document.body.appendChild(a);
        
        a.click();
        a.remove();
    }

    function _setDownloadLinkReady(opts)
    {
        var linkId = opts && opts.downloadLinkId ? opts.downloadLinkId : "downloadPngLink";
        var link = _getEl(linkId);
        
        if (!link) return;

        var ready = !!(opts && opts.canvas);
        var filename = opts && opts.filename ? opts.filename : "qr.png";

        try
        {
            if (ready) document.body.classList.add("hasQr");
            else document.body.classList.remove("hasQr");
        }
        catch (e)
        {}

        if (ready)
        {
            link.style.display = "inline-block";
            
            try
            {
                if (typeof window._syncBtnsLater === "function") window._syncBtnsLater();
            }
            catch (e)
            {}
            
            link.onclick = function(e)
            {
                e.preventDefault();
                downloadCanvasPng(opts.canvas, filename);
            };
        }
        else
        {
            link.style.display = "none";
            
            link.onclick = function(e)
            {
                e.preventDefault();
            };
        }
    }

    function makeQR(url, tensionText, dateText, idText, options)
    {
        options = options || {};
        
        var FONT_WEIGHT = String(options.fontWeight || "300");
        var targetId = options.targetId || "qrcode";
        var box = _getEl(targetId);
        
        if (!box) return null;

        if (typeof window.qrcode !== "function")
        {
            return null;
        }

        var qr = window.qrcode(0, "H");
        qr.addData(url);
        qr.make();

        var quiet = 1;
        var cells = qr.getModuleCount();
        var total = cells + quiet * 2;

        var scale = 7;
        
        if (typeof options.scale === "number" && options.scale > 0) scale = options.scale;
        if (typeof options.scale === "number" && options.scale > 0) scale = options.scale;
        
        var qrPx = total * scale;
        var header = ("PicoTag-" + (tensionText || "").trim()).trim();
        var d = (dateText || "").trim();
        var id = (idText || "").trim();
        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext("2d");
        var fontStack =
            '"JetBrainsMono","Bahnschrift","DIN 1451","DIN Alternate","DIN Condensed","Arial Narrow","Roboto Condensed","Segoe UI","Noto Sans TC","Microsoft JhengHei",sans-serif';
        var HEADER_SIZE = 42;
        var SIDE_SIZE = 40;
        var headerPadY = 6;
        var headerH = header ? Math.ceil(HEADER_SIZE + headerPadY * 2) : 0;

        function stripWidthFor(text)
        {
            if (!text) return 0;
            
            ctx.font = FONT_WEIGHT + " " + SIDE_SIZE + "px " + fontStack;
            var m = ctx.measureText(text);
            var asc = m.actualBoundingBoxAscent || SIDE_SIZE * 0.8;
            var desc = m.actualBoundingBoxDescent || SIDE_SIZE * 0.25;
            var pad = 6;
            
            return Math.ceil(asc + desc + pad * 2);
        }

        var stripL = stripWidthFor(d);
        var stripR = stripWidthFor(id);
        var gap = 2;
        var leftGap = stripL ? gap : 0;
        var rightGap = stripR ? gap : 0;
        var qrX = stripL + leftGap;
        var qrY = headerH;
        var logicalW = stripL + leftGap + qrPx + rightGap + stripR;
        var logicalH = headerH + qrPx;
        var dpr = typeof options.dpr === "number" && options.dpr > 0 ? options.dpr : window.devicePixelRatio || 1;
        var pxW = Math.max(1, Math.round(logicalW * dpr));
        var pxH = Math.max(1, Math.round(logicalH * dpr));

        canvas.width = pxW;
        canvas.height = pxH;
        canvas.style.width = logicalW + "px";

        var sx = pxW / logicalW;
        var sy = pxH / logicalH;
        
        if (ctx.setTransform) ctx.setTransform(sx, 0, 0, sy, 0, 0);
        else ctx.scale(sx, sy);

        function _snapHalf(v)
        {
            return Math.round(v * 2) / 2;
        }

        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, logicalW, logicalH);
        ctx.fillStyle = "#000";
        
        for (var r = 0; r < cells; r++)
        {
            for (var c = 0; c < cells; c++)
            {
                if (qr.isDark(r, c))
                {
                    ctx.fillRect(qrX + (c + quiet) * scale, qrY + (r + quiet) * scale, scale, scale);
                }
            }
        }

        if (header)
        {
            ctx.font = FONT_WEIGHT + " " + HEADER_SIZE + "px " + fontStack;
            ctx.fillStyle = "#111";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(header, logicalW / 2, headerH / 2);
        }

        if (d && stripL)
        {
            ctx.save();
            var xL = _snapHalf(stripL / 2);
            ctx.translate(xL, qrY + qrPx / 2);
            ctx.rotate(Math.PI / 2);
            ctx.fillStyle = "#111";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = FONT_WEIGHT + " " + SIDE_SIZE + "px " + fontStack;
            ctx.fillText(d, 0, 0);
            ctx.restore();
        }

        if (id && stripR)
        {
            ctx.save();
            var xR = _snapHalf(stripL + leftGap + qrPx + rightGap + stripR / 2);
            ctx.translate(xR, qrY + qrPx / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillStyle = "#111";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = FONT_WEIGHT + " " + SIDE_SIZE + "px " + fontStack;
            ctx.fillText(id, 0, 0);
            ctx.restore();
        }

        box.innerHTML = "";
        box.appendChild(canvas);

        window.PicoTagQR = window.PicoTagQR || {};
        window.PicoTagQR.lastCanvas = canvas;

        var filename = options.filename || window._qrSuggestedFilename || "qr_" + Date.now() + ".png";
        window._qrSuggestedFilename = "";

        _setDownloadLinkReady(
        {
            downloadLinkId: options.downloadLinkId || "downloadPngLink",
            canvas: canvas,
            filename: filename,
        });

        if (typeof options.onReady === "function")
        {
            try
            {
                options.onReady(canvas, filename);
            }
            catch (e)
            {}
        }

        return canvas;
    }

    function makeQRTennis(url, tensionText, dateText, idText, options)
    {
        options = options || {};
        
        var FONT_WEIGHT = String(options.fontWeight || "300");
        var targetId = options.targetId || "qrcode";
        var box = _getEl(targetId);
        
        if (!box) return null;

        if (typeof window.qrcode !== "function")
        {
            return null;
        }

        var qr = window.qrcode(0, "H");
        
        qr.addData(url);
        qr.make();

        var quiet = 1;
        var cells = qr.getModuleCount();
        var total = cells + quiet * 2;
        var scale = 7;
        
        if (typeof options.scale === "number" && options.scale > 0) scale = options.scale;
        if (typeof options.scale === "number" && options.scale > 0) scale = options.scale;
        
        var qrPx = total * scale;
        var id = (idText || "").trim();
        var tension = (tensionText || "").trim();
        var d = (dateText || "").trim();
        var lineTop = "PicoTag";
        var lineMid = id;
        var lineBot = tension;
        var line4 = d;
        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext("2d");
        var fontStack =
            '"JetBrainsMono","Bahnschrift","DIN 1451","DIN Alternate","DIN Condensed","Arial Narrow","Roboto Condensed","Segoe UI","Noto Sans TC","Microsoft JhengHei",sans-serif';
        var TOP_SIZE = 40;
        var MID_SIZE = 40;
        var BOT_SIZE = 40;
        var LINE4_SIZE = 40;
        var padX = 18;
        var gap = 14;

        function textW(text, size)
        {
            if (!text) return 0;
            
            ctx.font = FONT_WEIGHT + " " + size + "px " + fontStack;
            var m = ctx.measureText(text);
            
            return Math.ceil(m.width);
        }

        var wTop = textW(lineTop, TOP_SIZE);
        var wMid = textW(lineMid, MID_SIZE);
        var wBot = textW(lineBot, BOT_SIZE);
        var w4 = textW(line4, LINE4_SIZE);
        var panelW = Math.max(wTop, wMid, wBot, w4) + padX * 2;
        var logicalW = qrPx + gap + panelW;
        var logicalH = qrPx;
        var dpr = typeof options.dpr === "number" && options.dpr > 0 ? options.dpr : window.devicePixelRatio || 1;
        
        canvas.width = Math.max(1, Math.round(logicalW * dpr));
        canvas.height = Math.max(1, Math.round(logicalH * dpr));
        canvas.style.width = logicalW + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, logicalW, logicalH);
        ctx.fillStyle = "#000";
        
        for (var r = 0; r < cells; r++)
        {
            for (var c = 0; c < cells; c++)
            {
                if (qr.isDark(r, c))
                {
                    ctx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
                }
            }
        }

        var panelX = qrPx + gap;
        
        ctx.fillStyle = "#111";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";

        var topY = Math.round(logicalH * 0.18);
        var midY = Math.round(logicalH * 0.4);
        var botY = Math.round(logicalH * 0.62);
        var y4 = Math.round(logicalH * 0.84);
        
        ctx.font = FONT_WEIGHT + " " + TOP_SIZE + "px " + fontStack;
        ctx.fillText(lineTop, panelX + padX, topY);
        ctx.font = FONT_WEIGHT + " " + MID_SIZE + "px " + fontStack;
        ctx.fillText(lineMid, panelX + padX, midY);
        ctx.font = FONT_WEIGHT + " " + BOT_SIZE + "px " + fontStack;
        ctx.fillText(lineBot, panelX + padX, botY);
        ctx.font = FONT_WEIGHT + " " + LINE4_SIZE + "px " + fontStack;
        ctx.fillText(line4, panelX + padX, y4);
        box.innerHTML = "";
        box.appendChild(canvas);

        window.PicoTagQR = window.PicoTagQR || {};
        
        window.PicoTagQR.lastCanvas = canvas;

        var filename = options.filename || window._qrSuggestedFilename || "qr_" + Date.now() + ".png";
        
        window._qrSuggestedFilename = "";

        _setDownloadLinkReady(
        {
            downloadLinkId: options.downloadLinkId || "downloadPngLink",
            canvas: canvas,
            filename: filename,
        });

        if (typeof options.onReady === "function")
        {
            try
            {
                options.onReady(canvas, filename);
            }
            catch (e)
            {}
        }

        return canvas;
    }

    window.PicoTagQR = window.PicoTagQR || {};
    
    window.PicoTagQR.makeQR = makeQR;
    window.PicoTagQR.makeQRTennis = makeQRTennis;
    window.PicoTagQR.downloadCanvasPng = downloadCanvasPng;
    window.PicoTagQR.ensureLabelFontLoaded = ensureLabelFontLoaded;

    if (typeof window.makeQR !== "function") window.makeQR = makeQR;
    if (typeof window.makeQRTennis !== "function") window.makeQRTennis = makeQRTennis;
})();
