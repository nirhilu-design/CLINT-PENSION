# לוגואים של גופים מנהלים

הנח כאן את קבצי הלוגו בשמות המדויקים הבאים (המערכת מזהה כל חברה לפי שם/וריאציה
וממפה אותה לקובץ שלה ב-`src/components/CompanyLogo.tsx`). כל עוד קובץ חסר —
הכרטיס מציג מונוגרמה צבעונית (fallback) עם האות הראשונה של שם הגוף, לעולם לא
אייקון שבור.

| מפתח | קובץ | מקור מומלץ |
|---|---|---|
| migdal | `migdal.svg` | Wikimedia Commons (Migdal Insurance logo 2024) |
| harel | `harel.png` | אתר הראל הרשמי |
| menora | `menora.jpg` | Wikimedia Commons (Menora Mivtachim) |
| clal | `clal.svg` | Wikimedia Commons (לוגו כלל ביטוח) |
| phoenix | `phoenix.svg` | Wikimedia Commons (Phoenix Insurance 2021) |
| meitav | `meitav.png` | companieslogo.com |
| altshuler | `altshuler-shaham.png` | אתר אלטשולר שחם הרשמי |
| more | `more.png` | אתר מור הרשמי |
| analyst | `analyst.png` | אתר אנליסט הרשמי |
| yelin-lapidot | `yelin-lapidot.png` | אתר ילין לפידות הרשמי |
| hachshara | `hachshara.svg` | Wikimedia Commons (CC0) |
| ayalon | `ayalon.png` | אתר איילון הרשמי |

הערות:
- מומלץ SVG כשיש מקור אמין, אחרת PNG שקוף.
- הלוגואים הם סימני מסחר של החברות — לשימוש לזיהוי הגוף בתוך המערכת בלבד,
  ובכפוף לתנאי השימוש של המקור.
- וריאציות שם ממופות אוטומטית: מקפת→מגדל, מבטחים→מנורה, "מיטב דש"→מיטב,
  אקסלנס→הפניקס, וכו' (ראו `logo-map.json` / `CompanyLogo.tsx`).
