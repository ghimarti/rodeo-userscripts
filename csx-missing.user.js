// ==UserScript==
// @name         Rodeo - Missing CSX (All Sites)
// @namespace    http://tampermonkey.net/
// @version      21.0
// @description  CSX Crossdock raggruppati per destinazione con QR toggle - funziona su qualsiasi sito Rodeo
// @match        https://rodeo-dub.amazon.com/*/ExSD*
// @grant        none
// @run-at       document-idle
// @updateURL    https://gist.githubusercontent.com/YOUR_USERNAME/YOUR_GIST_ID/raw/csx-missing.user.js
// @downloadURL  https://gist.githubusercontent.com/YOUR_USERNAME/YOUR_GIST_ID/raw/csx-missing.user.js
// @require      https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js
// ==/UserScript==

(function() {
    "use strict";

    function fetchItemList(callback) {
        var links = document.querySelectorAll("a[href*='ItemList']");
        var url = null;
        for (var i = 0; i < links.length; i++) {
            if (links[i].href.indexOf("WorkPool=Crossdock") !== -1 && links[i].textContent.trim() !== "0") {
                url = links[i].href;
                break;
            }
        }
        if (!url) {
            callback([]);
            return;
        }
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.onload = function() {
            if (xhr.status === 200) {
                var parser = new DOMParser();
                var doc = parser.parseFromString(xhr.responseText, "text/html");
                var rows = doc.querySelectorAll("table tbody tr");
                var items = [];
                var found = {};
                for (var k = 0; k < rows.length; k++) {
                    var cells = rows[k].querySelectorAll("td");
                    var csx = null;
                    var dest = null;
                    for (var c = 0; c < cells.length; c++) {
                        var text = cells[c].textContent.trim();
                        if (text.match(/^csX[a-zA-Z][a-zA-Z0-9]+$/)) {
                            csx = text;
                        }
                        if (text.match(/^[A-Z]{2,4}\d{1,2}$/) && !dest) {
                            dest = text;
                        }
                    }
                    if (csx && !found[csx]) {
                        found[csx] = true;
                        items.push({ csx: csx, dest: dest || "?" });
                    }
                }
                callback(items);
            } else {
                callback([]);
            }
        };
        xhr.onerror = function() {
            callback([]);
        };
        xhr.send();
    }

    function showPanel() {
        var panel = document.createElement("div");
        panel.id = "csx-panel";
        panel.style.cssText = "position:fixed;top:10px;right:10px;z-index:99999;background:#fff;padding:15px;border:2px solid #333;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.3);max-height:90vh;overflow-y:auto;width:370px;resize:both;";
        panel.innerHTML = "<p>Loading...</p>";
        document.body.appendChild(panel);

        fetchItemList(function(items) {
            if (items.length === 0) {
                panel.innerHTML = "<p>Nessun CSX trovato in Crossdock</p>";
                var cb = document.createElement("button");
                cb.textContent = "Chiudi";
                cb.style.cssText = "margin-top:10px;padding:5px 10px;cursor:pointer;";
                cb.addEventListener("click", function() { panel.remove(); });
                panel.appendChild(cb);
                return;
            }
            renderPanel(panel, items);
        });
    }

    function renderPanel(panel, items) {
        panel.innerHTML = "";

        // Mostra il sito corrente nell'header
        var siteName = window.location.pathname.split("/")[1] || "?";

        var header = document.createElement("h3");
        header.style.cssText = "margin:0 0 5px;font-size:14px;";
        header.textContent = siteName + " - Crossdock (" + items.length + ")";
        panel.appendChild(header);

        var byDest = {};
        for (var i = 0; i < items.length; i++) {
            var key = items[i].dest;
            if (!byDest[key]) {
                byDest[key] = [];
            }
            byDest[key].push(items[i]);
        }

        var dests = Object.keys(byDest).sort();

        for (var d = 0; d < dests.length; d++) {
            var dest = dests[d];
            var destItems = byDest[dest];

            var sectionHeader = document.createElement("h4");
            sectionHeader.style.cssText = "margin:12px 0 5px;font-size:13px;color:#fff;background:#232f3e;padding:5px 8px;border-radius:4px;";
            sectionHeader.textContent = dest + " (" + destItems.length + ")";
            panel.appendChild(sectionHeader);

            for (var j = 0; j < destItems.length; j++) {
                (function(item) {
                    var wrapper = document.createElement("div");

                    var row = document.createElement("div");
                    row.style.cssText = "padding:8px 10px;margin:3px 0;background:#f0f0f0;border-radius:4px;cursor:pointer;font-family:monospace;font-size:12px;";
                    row.textContent = item.csx;

                    row.addEventListener("mouseenter", function() { row.style.background = "#fff3cd"; });
                    row.addEventListener("mouseleave", function() { row.style.background = "#f0f0f0"; });

                    var qrBox = document.createElement("div");
                    qrBox.style.cssText = "display:none;text-align:center;padding:10px;margin:3px 0;background:#fafafa;border:1px solid #ddd;border-radius:4px;";

                    row.addEventListener("click", function() {
                        if (qrBox.style.display === "none") {
                            qrBox.style.display = "block";
                            qrBox.innerHTML = "";
                            new QRCode(qrBox, { text: item.csx, width: 150, height: 150 });
                        } else {
                            qrBox.style.display = "none";
                            qrBox.innerHTML = "";
                        }
                    });

                    wrapper.appendChild(row);
                    wrapper.appendChild(qrBox);
                    panel.appendChild(wrapper);
                })(destItems[j]);
            }
        }

        var closeBtn = document.createElement("button");
        closeBtn.textContent = "Chiudi";
        closeBtn.style.cssText = "margin-top:10px;padding:5px 10px;cursor:pointer;display:block;";
        closeBtn.addEventListener("click", function() { panel.remove(); });
        panel.appendChild(closeBtn);
    }

    // Mostra il sito nel bottone
    var siteName = window.location.pathname.split("/")[1] || "?";

    var btn = document.createElement("button");
    btn.textContent = "Missing CSX (" + siteName + ")";
    btn.style.cssText = "position:fixed;bottom:10px;right:10px;z-index:99999;padding:5px 10px;background:#ff9900;color:#000;font-weight:bold;border:none;border-radius:4px;cursor:pointer;font-size:10px;";
    btn.addEventListener("click", function() {
        var existing = document.getElementById("csx-panel");
        if (existing) {
            existing.remove();
            return;
        }
        showPanel();
    });
    document.body.appendChild(btn);
})();
