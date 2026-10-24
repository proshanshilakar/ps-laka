# How to add or change content on your site

Everything you see on the site (text, jobs, case studies, skills, pictures) lives in **one file: `content.js`**.
You don't need to touch `index.html` or anything in `assets/`.

## Option 1: Use the editor (easiest)

1. Unzip the folder on your computer.
2. Double-click **`editor.html`**. It opens in your browser.
3. Fill in the sections on the left. The preview on the right updates as you type.
   - **+ Add** buttons add a job, case study, skill and so on.
   - **↑ ↓** change the order, **✕** removes an item.
   - **Phone** shows the mobile view.
4. Click **Download content.js**.
5. Move the downloaded `content.js` into your site folder, **replacing the old one**.
6. Upload to GitHub (see below).

Your changes stay saved in that browser until you download, so you can stop and come back later.

## What to fill in first (for a data analyst portfolio)

1. **Experience**: each job with a start date (e.g. `Mar 2023`) and a **Field** (Data, Insurance,
   Sales…). Dates draw the career timeline chart, and fields give it colours.
2. **Case studies**: 2–3 of your best data projects. For each one:
   - **Headline number**: the result in one figure, e.g. `+12%`, `3 hrs → 20 min`, `Rs 4.2M`
   - **Question**: what you were trying to find out
   - **Approach**: the data and method you used
   - **Result**: what changed because of it
   - **Tools**: e.g. `Excel, SQL, Power BI, Python`
   - A dashboard screenshot if you have one (blur or remove confidential numbers)
3. **Skills**: two short tag lists (Data analytics, Professional). Remove anything you
   don't actually use and add what's missing. No years are needed here.
4. **Toolkit**: the bar chart of tools with **years of use**. Add a **Data** group
   (Excel, SQL, Power BI, Python…) with honest years.
5. **Profile → CV file**: put your CV PDF in the `assets` folder (e.g. `assets/Proshan-Shilakar-CV.pdf`)
   and type that path. **Download CV** buttons appear at the top and in Contact.

## Sections that hide themselves

Experience and Case studies stay hidden until you add something. Skills hides if you remove every group, and Beyond data hides if you remove every side project.

## Animation

The animations live in `assets/js/motion.js` and need no editing. They switch off
automatically for visitors whose device is set to "reduce motion", and in the editor preview. Any list you empty also hides.

## Footer drawing size

The Nyatapola drawing's size is set at the top of the footer styles in `assets/css/site.css`:
`--temple-desktop: 46rem;` (desktop) and `--temple-mobile: 92vw;` (phones, as a share of the
screen width). Make the numbers smaller or bigger to adjust it.

## Adding pictures

1. Copy the picture into **`assets/img/`** (JPG, PNG or WEBP, ideally under 500 KB).
2. Type its path in the picture box, e.g. `assets/img/sales-dashboard.png`.

## Editing content.js by hand

Open it in any text editor. The rules are at the top of the file: keep text in "double quotes",
put commas between items, and an empty list `[]` hides a section.

## Publishing on GitHub Pages

1. Go to your repository on github.com.
2. **Add file → Upload files**, then drag in everything from this folder, replacing the old files.
3. Click **Commit changes**. proshanshilakar.com.np updates in a minute or two.

After the first upload, you usually only need to upload the new **content.js** (and any new pictures).
If a design change was made (files in `assets/`), upload the whole folder again, including `index.html`.
If you still see the old design, refresh with **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac).
