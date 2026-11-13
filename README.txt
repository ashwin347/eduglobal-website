Eduglobal International website
===============================

A static website: plain HTML, CSS and JavaScript. No build step, database or server code.

Pages
  index.html             Home
  colleges.html          Colleges (search + city filter)
  college-details.html   College details
  courses.html           Find a Course (search + stream filter)
  course-details.html    Course details
  about.html             About Us
  services.html          Our Services

Folders
  images/   Logo and sample stock photos (see images/IMAGE-CREDITS.txt; replace with real photos, keeping the same file names)
  assets/   runtime.js, the small script that powers menus, filters, search and the enquiry pop-up

Deploying
  Upload the whole folder (keep the structure as it is) to any static host,
  e.g. Netlify, Vercel, GitHub Pages, Cloudflare Pages, or your web hosting's public_html folder.
  index.html is the home page.

Before going live, replace the placeholders in square brackets, e.g. [PHONE], [info@youragency.com],
office addresses, [College name], fees and stats. Search the .html files for "[" to find them.

Note: the Quick Enquiry form is a design only. It does not send submissions anywhere yet;
it needs a form service (e.g. Formspree, Netlify Forms) or a backend connected to it.
