/**
 * 豬絲馬跡 — report page
 * Embeds the Google Forms sighting-report form (configured in config.js),
 * with a friendly "coming soon" state while no form is configured.
 */

import "./site.js";
import { SITE_CONFIG } from "./config.js";
import { currentLang, t } from "./i18n.js";

function render() {
  const mount = document.querySelector("[data-form-mount]");
  const openLink = document.querySelector("[data-form-open]");
  if (!mount) return;

  const embed = SITE_CONFIG.googleFormEmbedUrl;
  const link = SITE_CONFIG.googleFormLinkUrl;
  const lang = currentLang();
  const formTitle = lang === "en" ? "Wild boar sighting report form" : "野豬出沒報告表單";

  if (embed) {
    mount.innerHTML = "";
    const iframe = document.createElement("iframe");
    iframe.src = embed;
    iframe.title = formTitle;
    iframe.className = "form-embed";
    iframe.loading = "lazy";
    mount.appendChild(iframe);
  } else {
    mount.innerHTML = `<div class="note warn form-unavailable">${t("report.form.unavailable")}</div>`;
  }

  if (openLink) {
    if (link) {
      openLink.hidden = false;
      openLink.href = link;
    } else {
      openLink.hidden = true;
    }
  }
}

render();
document.addEventListener("langchange", render);
