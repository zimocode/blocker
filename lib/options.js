let config;

const blo = {
    init: async () => {
        ["click", "input", "keydown"].forEach(eventType => 
            window.addEventListener(eventType, blo.handleEvent, false)
        );

        const configMap = {
            placeholders: {
                "#passwd-last": chrome.i18n.getMessage("title_last_passwd"),
                "#passwd-new": chrome.i18n.getMessage("title_new_passwd"),
                "#passwd-new-check": chrome.i18n.getMessage("title_new_check_passwd"),
            },
            textContent: {
                "#passwd-title": config?.passwd 
                    ? chrome.i18n.getMessage("title_change_passwd") 
                    : chrome.i18n.getMessage("title_set_passwd"),
                "#btn-save": chrome.i18n.getMessage("btn_save"),
                "#link-review": chrome.i18n.getMessage("link_review"),
                "#link-source": chrome.i18n.getMessage("link_source"),
            },
            htmlContent:{
                "#user-first": chrome.i18n.getMessage("notif_first")
            },
            attributes: {
                "#link-review": { href: `https://chromewebstore.google.com/detail/${chrome.runtime.id}/reviews` },
                "#link-source": { href: "https://github.com/zimocode/blocker" },
            },
            styles: {
                "#group-passwd-last": { display: config?.passwd ? "flex" : "none" },
                "#user-first": { display: config?.passwd ? "none" : "flex" },
            },
        };
        Object.entries(configMap.placeholders).forEach(([selector, message]) => {
            document.querySelector(selector).placeholder = message;
        });
        Object.entries(configMap.textContent).forEach(([selector, message]) => {
            document.querySelector(selector).innerText = message;
        });
        Object.entries(configMap.htmlContent).forEach(([selector, message]) => {
            document.querySelector(selector).innerHTML = message;
        });
        Object.entries(configMap.attributes).forEach(([selector, attributes]) => {
            const element = document.querySelector(selector);
            Object.entries(attributes).forEach(([attr, value]) => element.setAttribute(attr, value));
        });
        Object.entries(configMap.styles).forEach(([selector, styles]) => {
            Object.assign(document.querySelector(selector).style, styles);
        });

        // set i18n labels for show/hide password buttons with fallbacks
        const showLabel = chrome.i18n.getMessage("show_password") || "Show password";
        const hideLabel = chrome.i18n.getMessage("hide_password") || "Hide password";
        document.querySelectorAll('.toggle-visibility').forEach(btn => {
            btn.setAttribute('data-label-show', showLabel);
            btn.setAttribute('data-label-hide', hideLabel);
            btn.setAttribute('title', showLabel);
            btn.setAttribute('aria-label', showLabel);
            // remove from tab order per requirement: icon reacts only to mouse/touch
            btn.setAttribute('tabindex', '-1');
        });

    },
    handleEvent: event => {
        if (event.type === "click" && event.target.id === "btn-save") {
            blo.passwd();
        } else if (event.type === "click") {
            const toggleBtn = event.target.closest && event.target.closest('.toggle-visibility');
            if (toggleBtn) {
                const targetSelector = toggleBtn.getAttribute("data-target");
                const input = document.querySelector(targetSelector);
                if (input) {
                    const isHidden = input.type === "password";
                    input.type = isHidden ? "text" : "password";
                    const newLabel = isHidden
                        ? (toggleBtn.getAttribute('data-label-hide') || "Hide password")
                        : (toggleBtn.getAttribute('data-label-show') || "Show password");
                    toggleBtn.setAttribute("aria-label", newLabel);
                    toggleBtn.setAttribute("title", newLabel);
                }
                return; // prevent falling through
            }
        } else if (event.type === "input") {
            event.target.value = event.target.value.trim();
        } else if (event.type === "keydown" && ["passwd-last", "passwd-new", "passwd-new-check"].includes(event.target.id) && event.keyCode === 13) {
            blo.passwd();
        }
    },
    passwd: async () => {
        const [domPasswdLast, domPasswdNew, domPasswdCheck] = ["#passwd-last", "#passwd-new", "#passwd-new-check"].map(id => document.querySelector(id));
        const [passwdLast, passwdNew, passwdCheck] = [domPasswdLast.value, domPasswdNew.value, domPasswdCheck.value].map(val => val.trim());

        const domNotif = document.querySelector("notif");
        if (passwdNew && passwdNew === passwdCheck) {
            const response = await chrome.runtime.sendMessage({ type: "passwd", data: { passwdNew, passwdLast } });
            domNotif.innerText = response?.success ? chrome.i18n.getMessage("notif_set_passwd") : chrome.i18n.getMessage("notif_last_wrong_passwd");
            if (response?.success) {
                setTimeout(async () => {
                    domNotif.innerText = "";
                    await chrome.runtime.reload();
                    window.close();
                }, 3000);
            } else {
                domPasswdLast.value = "";
                setTimeout(() => domNotif.innerText = "", 3000);
            }
        } else {
            domNotif.innerText = chrome.i18n.getMessage("notif_not_match_passwd");
            setTimeout(() => domNotif.innerText = "", 3000);
        }
    }
};

chrome.runtime.sendMessage({ type: "config" }, response => {
    if (response.success) {
        config = response.data;
        blo.init();
    }
});