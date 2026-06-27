# עמוד 1 — Upload Panel (העלאת קבצים)

## קובץ
`src/components/UploadPanel.jsx`

---

## מטרה
מסך הכניסה היחיד של האפליקציה. מאפשר למשתמש לבחור ולהעלות קובצי XML של מנהלי פנסיה לניתוח.

---

## רכיבים ויזואליים

| רכיב | תיאור |
|------|--------|
| כותרת | "מערכת ניתוח תיק פנסיה" — `font-size: 22px` |
| תת-כותרת | "העלה קובצי XML של הלקוח לניתוח מלא" — `color: var(--color-text-muted)` |
| Drop Zone | אזור גרירה/לחיצה לבחירת קבצים |
| רשימת קבצים | כל קובץ שנבחר עם כפתור הסרה (×) |
| כפתור שגיאה | הודעה אדומה אם הועלה קובץ לא XML |
| כפתור שליחה | "נתח קבצים" — `width: 100%` |

---

## עיצוב

```
רקע מסך:    var(--color-bg)       = #f5f7fa
כרטיס:      var(--color-surface)  = #ffffff
border-radius: 16px
padding: 40px
width: 540px
box-shadow: 0 4px 24px rgba(0,0,0,0.1)
direction: rtl
```

### Drop Zone — מצבים
| מצב | border | background | אייקון |
|-----|--------|------------|--------|
| ריק | `var(--color-border)` (#e2e8f0) | `#f8fafc` | 📂 |
| Dragging | `var(--color-primary)` (#2563eb) | `var(--color-primary-light)` | 📂 |
| עם קבצים | `#22c55e` | `#f0fdf4` | ✅ |

### כפתור שליחה — מצבים
| מצב | background | cursor |
|-----|------------|--------|
| לא פעיל | `#cbd5e1` | `not-allowed` |
| פעיל | `var(--color-primary)` (#2563eb) | `pointer` |
| טוען | `#cbd5e1` + טקסט "מנתח..." | `not-allowed` |

---

## לוגיקה

### `addFiles(newFiles)`
- מסנן רק קבצי `.xml`
- אם אין XML → מציג שגיאה
- מוסיף קבצים חדשים למצב תוך מניעת כפילויות (לפי `f.name`)

### `removeFile(name)`
- מסיר קובץ בודד מהרשימה לפי שם

### `handleDrop(e)`
- מקבל קבצים מ-Drag & Drop
- קורא ל-`addFiles`

### `handleSubmit(e)`
- קורא ל-`onParse(files)` עם מערך ה-`File` objects
- מציג שגיאה אם הניתוח נכשל

---

## Props

| Prop | Type | תיאור |
|------|------|--------|
| `onParse` | `async (File[]) => void` | קולבק לניתוח — מקבל מערך קבצים |
| `loading` | `boolean` | האם כרגע בניתוח |

---

## זרימת נתונים
```
משתמש בוחר XML → addFiles() → state: files[]
↓
לחיצה "נתח קבצים" → handleSubmit() → onParse(files)
↓
App.jsx → parseXmlFiles(files) → analytics → Dashboard
```
