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

- **"Let search engines list the site."** The site is currently hidden from Google and other search engines because it still has placeholder text. It is one switch.
- **"Add a case study"** or **"add a testimonial"**: send the text and images.
- **"Here is my new resume"**: the Download PDF button fetches the PDF from your Google Drive. If you replace the file in Drive with **Manage versions** (right-click the file, **File information**, **Manage versions**, **Upload new version**), the button keeps working with nothing to publish. If you upload it as a brand new file instead, send Claude the new share link.
- **"Turn the sounds down"**, or off by default.

## Content the site is still waiting for

- Real quotes, names and roles for the three **Kind words** notes
- Results and metrics marked `[Add a result]` and `[Metric]`
- Case study text and visuals for Dukacards, Afemairide, the Govtech project and the confidential project
- Resume page: three images each for the ZST Technologies and Provenier entries
- Links for "Stigdata - Funding source", "Prototype", and each exploration
- Real photos and captions for the About page, and pictures or videos for the Exploration tiles

## Where everything lives

| What | Where |
|---|---|
| The live site | https://davidokunlola.com |
| The code | https://github.com/aboki-jay/Dave-O-portfolio |
| Hosting and publishing history | Cloudflare dashboard, **Workers & Pages**, **dave-o-portfolio** |
| The designs | Your Figma file "Our Portfolio", section "Main Design for my portfolio - Corrected" |
