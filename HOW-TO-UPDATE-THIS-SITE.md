# How to update davidokunlola.com

You never need to edit code. You describe the change to Claude, check it on your own computer, and Claude publishes it.

## 1. Ask for a change

Open this project folder in Claude and say what you want. Any of these work:

- **Describe it:** "On the About page, make the photos smaller."
- **Point at Figma:** paste the link to the frame you changed and say "match this".
- **Show a reference:** paste a screenshot or a link to a site you like and say what you like about it.
- **Send content:** paste the real text, or drop in images, and say where they go.

Several changes in one message is fine.

## 2. Check it before it goes live

Ask Claude to "show me locally". It opens the site on your own computer at `http://localhost:8787`. Nobody else can see that address. Look it over on desktop and phone sizes, and ask for tweaks until you are happy.

## 3. Publish

Say "publish it" (or "upload it"). Claude sends the change to GitHub, and Cloudflare puts it on davidokunlola.com by itself, usually within two minutes. Claude waits and tells you when it is live.

If you ever see the old version after publishing, refresh the page once.

## 4. Undo something

Say "undo the last change" and Claude reverses it and publishes again. Every published version is kept, so nothing is lost.

## Write or edit a case study

Case studies live in Sanity, a form in your browser. You do not need Claude for the words or the pictures.

1. Go to https://davidokunlola.sanity.studio and sign in.
2. Click **Case studies**, then the one you want. To start a new one, click the pencil icon at the top of the list.
3. Fill in the four tabs: **Listing** (the home tile and the Work lists), **Overview** (the top of the page), **Sections** (everything below it) and **Search** (what Google shows).
4. Click **Publish** at the bottom. Until you do, your changes are a draft that only you can see. Publishing rebuilds the website by itself, and the change is live in about two minutes. If it has not appeared after five, refresh the page once, then ask Claude to check.

**Sections are yours to arrange.** Every case study can have different ones, in any order:

- Click **Add item** and pick a kind: **Text, pictures and video**, **Numbered list** (goals, steps) or **Numbers** (up to three big figures).
- Give it a **Section name**. This is the small label above the section and its entry in the contents list beside the page, so "First draft", "Research" or "Testing" all work.
- Drag a section by its handle to move it. Remove one and it disappears from the page and the contents list.
- **Pictures:** one picture shows on its own. Add two or more and visitors click through them with an arrow on a computer, or see them stacked on a phone. Each picture can have its own caption.
- **GIFs:** add one the same way as a picture. It stays animated.
- **Videos:** in the same list, choose **Video** and upload an MP4. It plays without sound on a loop, like a GIF, and only while it is on screen. Keep videos short and small (5 to 30 seconds, ideally under 15 MB): a screen recording as MP4 looks sharper than a GIF and is far lighter.
- A section with no pictures is fine. On a computer the previous section's picture stays on screen beside it.

Good to know:

- A field you leave empty simply does not show on the page.
- **Position on the Work page** decides the order, and which project is suggested as "Next project".
- A new case study gets its own page, a tile on the home page and a row on the Work page.
- To take a case study off the site, open it, click the arrow beside Publish, and choose **Unpublish**.
- The confidential case study is not in Sanity, because Sanity's free plan lets anyone read what is stored there. Ask Claude to change that one.
- Ask Claude if you want a new field, a different layout, or another kind of content managed this way.

## Add or remove photos on the About page

Once the Drive folder is connected, you do not need Claude for this.

- **Add a photo:** drop it into your photography folder in Google Drive. It appears on the About page within about five minutes. The newest 12 are shown, newest first, and the number in the Photography tab counts every photo in the folder.
- **Remove a photo:** delete it from the folder, or move it out.
- **The label on a photo:** it is the file's name, so rename the file to "Casio watch" and that is what the label says. Photos still called something like IMG_1234 show no label.
- **The icon beside the label:** it is picked from words in the name. "Flower" gets a plant, "Lagos" or "street" a city, "bird" a bird, "traffic" a car, "evening" a sunset, and so on (26 icons). A name that matches nothing gets a camera. Ask Claude to add a word or a new icon.
- **Quality:** your originals in Drive are never changed. The site shows smaller copies sized for the page so it loads quickly.
- **Careful:** anything in that folder is public on the site within minutes. Keep it only for photos you want shown.

The folder link is not stored in this project. It is saved in Cloudflare as a secret called `PHOTOS_DRIVE_FOLDER`, next to a Google key called `GOOGLE_DRIVE_API_KEY`. To point the site at a different folder, change `PHOTOS_DRIVE_FOLDER` the same way as the password below.

## See who visits and what they do

Two free tools, each opened in its own dashboard. Neither shows anything on the site itself.

- **Cloudflare Web Analytics** (dash.cloudflare.com, **Analytics & Logs**, **Web Analytics**): where visits come from, countries, devices, and the most visited pages. It uses no cookies.
- **Microsoft Clarity** (clarity.microsoft.com): heatmaps, how far people scroll, and replays of visits, to see where people spend their time on a page.

How they are set up on this site:

- Clarity is told not to use cookies, so there is no cookie banner. Because of that it measures each page separately and cannot follow one visitor from page to page.
- Clarity is skipped for visitors whose browser asks not to be tracked, and it never loads on the confidential case study.
- The preview on your own computer is not counted. Your own visits to the live site are.
- To switch either tool off, ask Claude. The two IDs are in `site-source/content/site-details.json`.

## Things only you can do

These live in your own accounts, so Claude will tell you where to click and wait for you.

**Set or change the password for the confidential case study**

1. Go to dash.cloudflare.com and click **Workers & Pages** in the left sidebar.
2. Click **dave-o-portfolio**, then **Settings**.
3. Under **Variables and Secrets**, click **Add**.
4. Choose type **Secret**, name it exactly `CONFIDENTIAL_PROJECT_PASSWORD`, type the password as the value, and click **Deploy**.

Until this is set, nobody can open that case study. Changing it later signs out everyone who had the old one.

**Remove a note someone left on the About page**

1. In the Cloudflare dashboard, open **Storage & Databases**, then **D1**.
2. Click `david-okunlola-portfolio-notes`, open the **notes** table, and delete the row.

Or ask Claude which notes are there and it will guide you.

## Things to ask Claude for when you are ready

- **"Let search engines list the site."** Most of the site is hidden from Google and other search engines because it still has placeholder text. Opening the whole site is one switch. Until then, pages are opened one by one:
  - **A case study in Sanity opens by itself** once it has a **Search description** and no placeholder text in square brackets. To keep a finished one out of Google, turn on **Hide from search engines** in its Search tab.
  - **Any other page** (Home, About, Resume and so on): ask Claude to "let search engines list the About page".
  - Google finds new pages faster if you tell it. Ask Claude for the steps to add the site to Google Search Console.
- **"Add a case study"** or **"add a testimonial"**: send the text and images.
- **"Here is my new resume"**: the Download PDF button fetches the PDF from your Google Drive. If you replace the file in Drive with **Manage versions** (right-click the file, **File information**, **Manage versions**, **Upload new version**), the button keeps working with nothing to publish. If you upload it as a brand new file instead, send Claude the new share link.
- **"Turn the sounds down"**, or off by default.

## Content the site is still waiting for

- Real quotes, names and roles for the three **Kind words** notes
- Results and metrics marked `[Add a result]` and `[Metric]`
- Case study text and visuals for Dukacards, Afemairide, the Govtech project and the confidential project
- Links for "Stigdata - Funding source", "Prototype", and each exploration
- Real photos and captions for the About page, and pictures or videos for the Exploration tiles

## Where everything lives

| What | Where |
|---|---|
| The live site | https://davidokunlola.com |
| The code | https://github.com/aboki-jay/Dave-O-portfolio |
| Hosting and publishing history | Cloudflare dashboard, **Workers & Pages**, **dave-o-portfolio** |
| The designs | Your Figma file "Our Portfolio", section "Main Design for my portfolio - Corrected" |
