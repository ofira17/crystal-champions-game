// Israeli Ministry of Education elementary curriculum — grades 1–6, all subjects.
// Source of truth for question generation, AI prompts, and grade-level validation.
//
// Style/level references (do NOT copy text, use only as level guide):
//   Math:    שבילים, שבילים פלוס, ה.ש.ב.ח.ה
//   Hebrew:  מפתח הקסם (gr 1-2), בסוד העניינים (gr 3-4), מילה טובה (gr 5-6)
//   Science: במבט חדש
//   English: ECB / UPB beginner books
//   Bible:   grade-level Tanach curriculum
//   Geo/Hist: grades 1-3 = מולדת/סביבה קרובה; grades 4-6 = geography/history only

export interface SubjectGradeRule {
  grade:         number;
  subject:       string;       // canonical Hebrew subject name
  topics:        string[];     // grade-appropriate topics list for AI prompt
  forbidden:     string[];     // topics/concepts that must NOT appear at this grade
  languageLevel: string;       // expected vocabulary/sentence complexity
  exampleTopics: string[];     // concrete example question topics
}

// ─── HEBREW (עברית) ───────────────────────────────────────────────────────────
const HEBREW_RULES: SubjectGradeRule[] = [
  {
    grade: 1, subject: "עברית",
    topics: ["זיהוי אותיות", "קריאת מילים קצרות עם ניקוד", "מילים שכיחות מחיי יום-יום", "שמות של חיות ופירות", "הבנת משפט קצר אחד"],
    forbidden: ["דקדוק", "שורשים", "בניינים", "כינויי גוף", "ניתוח טקסט", "ריבוי ויחיד מורכב", "פועל עתיד", "ציורי לשון", "משלים"],
    languageLevel: "מילים של 1-3 הברות, משפט אחד קצר, ניקוד מלא, מילון לגיל 6-7",
    exampleTopics: ["איזו אות מתחילה המילה 'כלב'?", "מה שמה של החיה שגרה בים?", "מה הצבע של עלה עץ?"],
  },
  {
    grade: 2, subject: "עברית",
    topics: ["קריאת משפטים פשוטים", "אוצר מילים יסודי", "שמות עצם/פועל/תואר בסיסי", "יחיד ורבים פשוט", "הבנת קטע קצר"],
    forbidden: ["שורשים", "בניינים", "זמן עתיד מורכב", "ציורי לשון", "ניתוח ספרותי", "פסוקית תנאי"],
    languageLevel: "משפטים קצרים 5-8 מילים, אוצר מילים יסודי, ניקוד חלקי",
    exampleTopics: ["מה ההבדל בין יחיד לרבים?", "מה המילה ההפוכה של 'גדול'?", "מה עושה הגיבור בסיפור?"],
  },
  {
    grade: 3, subject: "עברית",
    topics: ["הבנת הנקרא קצרה", "דקדוק: שורש בסיסי, בניין פעל", "ניקוד וכתיב", "מילים נרדפות ומנוגדות", "סוגי משפטים"],
    forbidden: ["בניינים מורכבים (הפעיל/הופעל/פועל)", "ניתוח ספרותי מעמיק", "ציורי לשון מורכבים", "כתיבה יוצרת מורכבת"],
    languageLevel: "פסקאות של 3-5 משפטים, אוצר מילים חינוכי לגיל 8-9",
    exampleTopics: ["מה שורש המילה 'כותב'?", "מה ההבדל בין שאלה לקביעה?", "מהי מילה נרדפת ל'שמח'?"],
  },
  {
    grade: 4, subject: "עברית",
    topics: ["שורשים ובניינים (פעל, פיעל, הפעיל)", "הבנת הנקרא", "כינויי גוף", "זמנים (הווה/עבר/עתיד)", "כתיב חסר ומלא"],
    forbidden: ["בניינים: נפעל, הופעל, פועל (לא נלמדים בכיתה ד)", "ניתוח שירה מורכב", "רטוריקה"],
    languageLevel: "פסקאות 5-7 משפטים, אוצר מילים עשיר לגיל 9-10",
    exampleTopics: ["לאיזה בניין שייך הפועל 'ספרתי'?", "מה גוף הפועל 'הלכנו'?", "הסבר את מבנה המשפט הזה"],
  },
  {
    grade: 5, subject: "עברית",
    topics: ["כל הבניינים", "ציורי לשון (משל, מטאפורה, גוזמה)", "הבנת הנקרא מעמיקה", "פיגורות סגנון", "כתיבה יוצרת"],
    forbidden: ["ניתוח שיר ייחודי לתוכנית כיתה ו", "תחביר מורכב של כיתה ו"],
    languageLevel: "טקסטים של 7-10 משפטים, שפה ספרותית בסיסית",
    exampleTopics: ["מהו ציור הלשון במשפט זה?", "תן דוגמה למטאפורה", "מה הרגש המתבטא בקטע?"],
  },
  {
    grade: 6, subject: "עברית",
    topics: ["ניתוח ספרותי", "כל הבניינים והזמנים", "תחביר: פסוקיות שונות", "כתיבה יוצרת", "ריבוי ויחיד מורכב"],
    forbidden: ["לשון חז\"ל מתקדמת", "פרוזודיה שירית (לא נלמד בחטיבה)"],
    languageLevel: "שפה ספרותית, טקסטים מורכבים, אוצר מילים עשיר לגיל 11-12",
    exampleTopics: ["נתח את הדמות הראשית בסיפור", "מה הנושא הנסתר בקטע?", "כתוב משפט עם פסוקית זמן"],
  },
];

// ─── ENGLISH (אנגלית) ────────────────────────────────────────────────────────
const ENGLISH_RULES: SubjectGradeRule[] = [
  {
    grade: 1, subject: "אנגלית",
    topics: ["אותיות ABC", "מילים בסיסיות: colors, animals, numbers 1-10, body parts, family", "ברכות: hello, goodbye, yes, no"],
    forbidden: ["past tense", "future tense", "questions with auxiliary verbs", "reading comprehension passages", "spelling rules"],
    languageLevel: "מילה בודדת או 2-3 מילים לכל היותר, vocabulary בסיסי מאוד",
    exampleTopics: ["What color is the sky?", "How many legs does a cat have?", "What letter starts the word 'dog'?"],
  },
  {
    grade: 2, subject: "אנגלית",
    topics: ["vocabulary: school, home, food, weather", "simple sentences: I am, I have, I like", "numbers 1-100", "days of week, months"],
    forbidden: ["past tense irregular", "reading comprehension long texts", "question formation", "adjective order"],
    languageLevel: "משפטים של 3-5 מילים, vocabulary יסודי ECB grade 2",
    exampleTopics: ["What do you do at school?", "How do you say 'ילד' in English?", "What comes after Monday?"],
  },
  {
    grade: 3, subject: "אנגלית",
    topics: ["reading simple sentences", "present tense", "basic question words: who, what, where, when", "common nouns and verbs"],
    forbidden: ["past tense irregular verbs", "conditionals", "passive voice", "complex sentence structures"],
    languageLevel: "משפטים של 5-8 מילים, קריאה בסיסית, ECB grade 3",
    exampleTopics: ["Where does the story take place?", "What is the child doing in the picture?", "Fill in: She ___ (to go) to school."],
  },
  {
    grade: 4, subject: "אנגלית",
    topics: ["present/past/future simple", "reading short texts", "vocabulary by topic: nature, sports, food", "question formation"],
    forbidden: ["perfect tenses", "passive voice", "conditionals", "reported speech"],
    languageLevel: "טקסטים קצרים, present/past simple, ECB grade 4",
    exampleTopics: ["What happened first in the story?", "Change to past tense: 'She walks to school'", "Find the adjective in the sentence"],
  },
  {
    grade: 5, subject: "אנגלית",
    topics: ["all simple tenses", "reading comprehension", "vocabulary enrichment", "comparatives/superlatives", "modal verbs: can/must/should"],
    forbidden: ["perfect tenses", "complex conditionals", "reported speech", "passive advanced forms"],
    languageLevel: "טקסטים של 6-10 משפטים, grammar ברמת כיתה ה",
    exampleTopics: ["Compare: this dog is ___ than that one (big)", "What is the main idea of the text?", "Use 'should' in a sentence about health"],
  },
  {
    grade: 6, subject: "אנגלית",
    topics: ["present perfect basic", "reading longer texts", "writing paragraphs", "advanced vocabulary", "all simple and continuous tenses"],
    forbidden: ["past perfect", "subjunctive", "complex reported speech"],
    languageLevel: "טקסטים מורכבים, grammar מלא לחטיבת ביניים, ECB grade 6",
    exampleTopics: ["Have you ever visited another country? (present perfect)", "Summarize the text in 2 sentences", "Find the metaphor in this passage"],
  },
];

// ─── SCIENCE (מדעים) ─────────────────────────────────────────────────────────
const SCIENCE_RULES: SubjectGradeRule[] = [
  {
    grade: 1, subject: "מדעים",
    topics: ["חיות מוכרות (כלב, חתול, ציפור, דג)", "צמחים פשוטים (עץ, פרח, עלה)", "גוף האדם: ראש, ידיים, רגליים", "מזג אוויר: שמש, גשם, שלג", "חומרים: קשה/רך, חם/קר"],
    forbidden: ["פוטוסינתזה", "מחזור חיים מורכב", "מערכות גוף האדם", "אטומים ומולקולות", "כוח וחשמל", "כוכבים ופלנטות", "אקולוגיה"],
    languageLevel: "מילים פשוטות, תיאורים חושיים בסיסיים, גיל 6-7",
    exampleTopics: ["איזה חיה גרה בים?", "מה צבע השמיים כשיורד גשם?", "כמה רגליים לפרפר?"],
  },
  {
    grade: 2, subject: "מדעים",
    topics: ["בית גידול של חיות (יבשה/מים/אוויר)", "מחזור חיים פשוט של צמח", "חומרים: מוצק/נוזל/גז", "מזג אוויר ועונות השנה", "חושים"],
    forbidden: ["פוטוסינתזה", "מערכות גוף האדם", "אטומים", "כוח כבידה", "כוכבים", "אקולוגיה מתקדמת"],
    languageLevel: "משפטים קצרים, מושגים ויזואליים בסיסיים, גיל 7-8",
    exampleTopics: ["איפה גר דג? ביבשה / בים / בשמיים?", "בשלוש מילים תאר מה שהוא גז", "מה קורה לזרע שמשקים אותו?"],
  },
  {
    grade: 3, subject: "מדעים",
    topics: ["מחזור המים", "צמחים: חלקים ותפקידים בסיסיים", "חיות: עמוד שדרה/חסר עמוד שדרה", "צורות אנרגיה בסיסיות (חום, אור)", "חומר ותכונות"],
    forbidden: ["פוטוסינתזה ברמה כימית", "מערכת השמש מפורטת", "כוחות פיזיקה", "אטומים ומולקולות", "גנטיקה"],
    languageLevel: "הסברים של 2-3 משפטים, מושגים מדעיים בסיסיים, במבט חדש כיתה ג",
    exampleTopics: ["מה תפקיד השורש בצמח?", "מהו מחזור המים?", "מה ההבדל בין חרק לדג?"],
  },
  {
    grade: 4, subject: "מדעים",
    topics: ["מערכת השמש (כוכבים, פלנטות, ירח, שמש)", "מבנה גוף האדם: מערכות עיכול/שלד", "מצבי חומר ושינויים", "אקולוגיה: שרשרת מזון", "פוטוסינתזה בסיסית"],
    forbidden: ["כימיה מורכבת", "פיזיקה (כוח/תנע)", "גנטיקה", "תאים ב DNA"],
    languageLevel: "הסברים מדעיים ברורים, כיתה ד, במבט חדש כיתה ד",
    exampleTopics: ["מה פונקציית הכלורופיל?", "מה הפלנטה הקרובה ביותר לשמש?", "מהי שרשרת מזון?"],
  },
  {
    grade: 5, subject: "מדעים",
    topics: ["מערכות גוף האדם (לב-ריאה, עיכול, עצבים)", "תאים בסיסיים", "כוחות ותנועה פשוטה", "חשמל בסיסי", "תהליכים בטבע"],
    forbidden: ["כימיה: משוואות", "גנטיקה מורכבת", "פיזיקה גלים", "תרמודינמיקה"],
    languageLevel: "מונחים מדעיים, הסברים של 3-5 משפטים, כיתה ה",
    exampleTopics: ["מה תפקיד הריאות?", "כיצד עובד מעגל חשמלי פשוט?", "מה גורם לשינוי צבע עלים בסתיו?"],
  },
  {
    grade: 6, subject: "מדעים",
    topics: ["כימיה: חומרים, תגובות פשוטות, חומצות ובסיסים", "פיזיקה: כוח, מהירות, פשוט", "ביולוגיה: גנטיקה בסיסית", "בעיות סביבה ואקלים"],
    forbidden: ["משוואות כימיות מורכבות", "פיזיקה קוונטית", "ביולוגיה מולקולרית"],
    languageLevel: "שפה מדעית, הסברים מורכבים, כיתה ו",
    exampleTopics: ["מהי תגובה כימית?", "מה ה-pH של מים?", "הסבר את אפקט החממה"],
  },
];

// ─── BIBLE (תנ"ך) ────────────────────────────────────────────────────────────
const BIBLE_RULES: SubjectGradeRule[] = [
  {
    grade: 1, subject: 'תנ"ך',
    topics: ["ששת ימי הבריאה", "שמות האבות (אברהם, יצחק, יעקב)", "סיפורי בראשית פשוטים", "יום השבת"],
    forbidden: ["פרשנות מורכבת", "נביאים", "כתובים", "דקדוק לשון המקרא", "קשרים היסטוריים מורכבים"],
    languageLevel: "שמות ומאורעות בסיסיים בלבד, גיל 6-7",
    exampleTopics: ["כמה ימים ברא אלוהים את העולם?", "מי הוא האב הראשון של עם ישראל?", "מה ייחודי ביום השבת?"],
  },
  {
    grade: 2, subject: 'תנ"ך',
    topics: ["בריאת העולם", "אברהם ושרה", "יצחק ורבקה", "עקדת יצחק", "יעקב ועשו"],
    forbidden: ["נביאים", "כתובים", "ניתוח פסוקים", "נבואות"],
    languageLevel: "סיפורי האבות הפשוטים, מאורעות עיקריים, גיל 7-8",
    exampleTopics: ["מי היתה אשת אברהם?", "מה שם שני הבנים של יצחק?", "מה נקרא המקום שם ביקש ה' מאברהם להקריב את בנו?"],
  },
  {
    grade: 3, subject: 'תנ"ך',
    topics: ["יוסף ואחיו", "יציאת מצרים (עיקרי הסיפור)", "משה רבנו (תולדות)", "עשר המכות"],
    forbidden: ["ניתוח פסוקים מעמיק", "נביאים", "כתובים", "שירת הים — ניתוח ספרותי"],
    languageLevel: "סיפור ומאורעות, שאלות 'מה קרה', גיל 8-9",
    exampleTopics: ["כמה מכות ירדו על מצרים?", "מי היה אחי משה?", "לאן יצאו בני ישראל ממצרים?"],
  },
  {
    grade: 4, subject: 'תנ"ך',
    topics: ["קבלת התורה בסיני", "מסע במדבר", "כניסה לארץ ישראל", "יהושע בן נון"],
    forbidden: ["ניתוח נבואי מורכב", "ספר שופטים מלא", "ספרי כתובים"],
    languageLevel: "מאורעות ועקרונות, שאלות 'למה' ו'כיצד', גיל 9-10",
    exampleTopics: ["כמה ספרי תורה יש?", "מה קרה במעמד הר סיני?", "מי הוביל את העם לארץ ישראל אחרי משה?"],
  },
  {
    grade: 5, subject: 'תנ"ך',
    topics: ["ספר שופטים (שמשון, דבורה)", "שמואל", "שאול המלך", "דוד המלך — חייו הראשונים"],
    forbidden: ["שלמה ומקדש מפורט", "ספרי נביאים אחרונים", "ספרי כתובים"],
    languageLevel: "סיפורים עם רקע היסטורי, שאלות הבנה ומסקנה, גיל 10-11",
    exampleTopics: ["מי ניצח את גלית?", "מה היה כוחו של שמשון?", "מי הייתה השופטת הראשונה?"],
  },
  {
    grade: 6, subject: 'תנ"ך',
    topics: ["דוד המלך — מלכות", "שלמה המלך", "בית המקדש", "פיצול הממלכה", "נביאים ראשונים (אליהו, אלישע)"],
    forbidden: ["ספרי נביאים אחרונים", "ספרי כתובים מורכבים", "ביקורת מקרא"],
    languageLevel: "הבנה עמוקה, קשרים בין אירועים, שאלות ניתוח, גיל 11-12",
    exampleTopics: ["מדוע נחלק הממלכה?", "מה בנה שלמה בירושלים?", "מי היה הנביא שהתעמת עם מלך אחאב?"],
  },
];

// ─── GEOGRAPHY (גיאוגרפיה) ────────────────────────────────────────────────────
// Grades 1-3: only local environment (מולדת/סביבה קרובה); real geography starts grade 4
const GEOGRAPHY_RULES: SubjectGradeRule[] = [
  {
    grade: 1, subject: "גיאוגרפיה",
    topics: ["הבית ושכנים", "הרחוב והשכונה", "מקומות מוכרים: בית ספר, גן, חנות", "הגוף ומיקום: מעל/מתחת/שמאל/ימין"],
    forbidden: ["יבשות", "מדינות", "מפות", "נהרות גדולים", "כדור הארץ", "קטבים", "מדבר", "אוקיינוסים"],
    languageLevel: "מיקום בסיסי מחיי יום-יום, גיל 6-7, סביבה קרובה בלבד",
    exampleTopics: ["איפה נמצא גן המשחקים?", "מה ניתן למצוא בסוף הרחוב?", "מה מצד ימין של בית הספר?"],
  },
  {
    grade: 2, subject: "גיאוגרפיה",
    topics: ["שכונה ועיר", "מפת הבית/כיתה פשוטה", "סביבת המגורים", "מוסדות: בית חולים, דואר, עירייה", "עיר/כפר"],
    forbidden: ["יבשות", "מדינות זרות", "נהרות גדולים", "הרים", "אוקיינוסים", "כדור הארץ"],
    languageLevel: "סביבה קרובה, מקומות בעיר, גיל 7-8",
    exampleTopics: ["מה ההבדל בין עיר לכפר?", "מי עובד בבית חולים?", "מה מסמל שלט עצור?"],
  },
  {
    grade: 3, subject: "גיאוגרפיה",
    topics: ["ארץ ישראל: ים/הרים/בקעה/מדבר", "נהרות בישראל (ירדן, ירקון)", "ערי ישראל הגדולות", "אקלים בישראל"],
    forbidden: ["יבשות אחרות", "מדינות זרות", "ממשלות", "גבולות מדיניים", "כלכלה"],
    languageLevel: "ישראל בלבד, נוף ומיקום, גיל 8-9",
    exampleTopics: ["מה שם הנהר הגדול ביותר בישראל?", "איזה אזור בישראל הוא המדברי?", "איזה ים נמצא מערבית לישראל?"],
  },
  {
    grade: 4, subject: "גיאוגרפיה",
    topics: ["יבשות ואוקיינוסים", "מדינות שכנות לישראל", "קריאת מפה בסיסית", "תופעות טבע: הר געש, רעידת אדמה", "כדור הארץ: קווי רוחב/אורך (בסיסי)"],
    forbidden: ["כלכלה עולמית", "פוליטיקה בינלאומית", "גיאוגרפיה של דרום אמריקה/אסיה המפורטת"],
    languageLevel: "גיאוגרפיה ישראל + יסודות גיאוגרפיה עולמית, גיל 9-10",
    exampleTopics: ["כמה יבשות יש בעולם?", "איזו מדינה גובלת בישראל מצפון?", "מה הר הגעש?"],
  },
  {
    grade: 5, subject: "גיאוגרפיה",
    topics: ["גיאוגרפיה עולמית: יבשות, מדינות חשובות", "אקלים עולמי", "משאבי טבע", "אוכלוסייה ומגורים", "תצורות קרקע"],
    forbidden: ["כלכלה מתקדמת", "פוליטיקה גיאופוליטית", "גיאוגרפיה אנליטית"],
    languageLevel: "גיאוגרפיה עולמית יסודית, גיל 10-11",
    exampleTopics: ["איזו יבשת היא הגדולה ביותר?", "באיזה אקלים חי קנגורו?", "מה משאב הטבע הנפוץ בסעודיה?"],
  },
  {
    grade: 6, subject: "גיאוגרפיה",
    topics: ["גיאוגרפיה מתקדמת: משאבים, כלכלה, אוכלוסייה", "בעיות סביבה: כריתת יערות, זיהום", "אזורים גיאוגרפיים עולמיים", "מפות מורכבות"],
    forbidden: ["גיאוגרפיה אנליטית", "גיאוגרפיה פוליטית מורכבת"],
    languageLevel: "גיאוגרפיה עולמית מורכבת, גיל 11-12",
    exampleTopics: ["מה גורם לגשם חומצי?", "מדוע הגשם יורד יותר בצד המערבי של הרים?", "השווה אקלים קוטבי לאקלים טרופי"],
  },
];

// ─── HISTORY (היסטוריה) ────────────────────────────────────────────────────────
// Grades 1-3: only local/Israeli roots (מולדת); real world history starts grade 4
const HISTORY_RULES: SubjectGradeRule[] = [
  {
    grade: 1, subject: "היסטוריה",
    topics: ["חגי ישראל ומשמעותם", "מסורות משפחה וסבא/סבתא", "ספורי עם ישראל ממגוון עדות"],
    forbidden: ["היסטוריה עולמית", "מלחמות", "מהפכות", "שושלות מלכים", "ציר זמן"],
    languageLevel: "סיפורי עם וחגים, גיל 6-7",
    exampleTopics: ["מה חוגגים בחנוכה?", "מהי משמעות יום העצמאות?", "מה הסיפור של פסח?"],
  },
  {
    grade: 2, subject: "היסטוריה",
    topics: ["חגי ישראל מעמיק", "תרומות תרבותיות של עדות ישראל", "גיבורים מקומיים (דמויות חיוביות)"],
    forbidden: ["היסטוריה עולמית", "מלחמות", "מהפכות", "ציר זמן מורכב"],
    languageLevel: "חגים ומנהגים, גיל 7-8",
    exampleTopics: ["מה מדליקים בחנוכה ולמה?", "מהו ט\"ו בשבט?", "מה חשיבות יום הזיכרון?"],
  },
  {
    grade: 3, subject: "היסטוריה",
    topics: ["ציונות בסיסית", "עלייה ראשונה ושנייה (פשוט)", "ייסוד תל אביב וערים", "חלוצים"],
    forbidden: ["היסטוריה עולמית", "מלחמות עולם", "השואה (לא עד כיתה ד-ה בדרך כלל)", "קיסרויות"],
    languageLevel: "ארץ ישראל בעת החדשה, גיל 8-9",
    exampleTopics: ["מי היה הרצל?", "מתי הוקמה תל אביב?", "מה הם 'חלוצים'?"],
  },
  {
    grade: 4, subject: "היסטוריה",
    topics: ["קום המדינה 1948", "מלחמת העצמאות", "עלייה המונית", "השואה — הכרה בסיסית", "ציונות מפורטת"],
    forbidden: ["היסטוריה עתיקה מחוץ לארץ ישראל", "היסטוריה עולמית שאינה קשורה לישראל", "מהפכות אירופאיות"],
    languageLevel: "מדינת ישראל המודרנית, גיל 9-10",
    exampleTopics: ["מתי הוקמה מדינת ישראל?", "מי הכריז על הקמת המדינה?", "מה היה מבצע 'ספינת מעפילים'?"],
  },
  {
    grade: 5, subject: "היסטוריה",
    topics: ["מצרים העתיקה", "יוון ורומא העתיקות", "ימי הביניים", "מסעי הצלב"],
    forbidden: ["מהפכה תעשייתית", "מלחמות עולם", "קולוניאליזם מתקדם"],
    languageLevel: "היסטוריה עולמית עתיקה, גיל 10-11",
    exampleTopics: ["מה בנו הפרעונים?", "מה היה פורום רומי?", "מהם מסעי הצלב?"],
  },
  {
    grade: 6, subject: "היסטוריה",
    topics: ["מהפכה תעשייתית", "מלחמת העולם הראשונה והשנייה (עיקרים)", "השואה", "תנועות שחרור לאומיות"],
    forbidden: ["מלחמה קרה מפורטת", "היסטוריה עכשווית (אחרי 1950)"],
    languageLevel: "היסטוריה עולמית מודרנית, ניתוח סיבה ותוצאה, גיל 11-12",
    exampleTopics: ["מה גרם למלחמת העולם הראשונה?", "מה היה המנשר בלפור?", "מתי הסתיימה מלחמת העולם השנייה?"],
  },
];

// ─── GENERAL KNOWLEDGE (ידע כללי) ────────────────────────────────────────────
const GENERAL_KNOWLEDGE_RULES: SubjectGradeRule[] = [
  {
    grade: 1, subject: "ידע כללי",
    topics: ["צבעים וצורות", "בעלי חיים מוכרים", "ספירה עד 20", "ימי שבוע", "חגי ישראל עיקריים", "גוף האדם הבסיסי", "מזון"],
    forbidden: ["שאלות מופשטות", "טכנולוגיה", "פוליטיקה", "גיאוגרפיה רחוקה", "מדע מתקדם"],
    languageLevel: "שאלות קצרות ופשוטות מאוד, גיל 6-7",
    exampleTopics: ["איזה פרי צהוב וארוך?", "כמה ימים יש בשבוע?", "מה קורה בפסח?"],
  },
  {
    grade: 2, subject: "ידע כללי",
    topics: ["חיות ובית גידולן", "עונות השנה", "חגים ומנהגים", "מקצועות", "ירקות ופירות", "אמצעי תחבורה"],
    forbidden: ["שאלות מדעיות מתקדמות", "גיאוגרפיה עולמית", "היסטוריה מורכבת"],
    languageLevel: "שאלות יסודיות, גיל 7-8",
    exampleTopics: ["איפה גר פנגווין?", "מה עושה טבח?", "איזה רכב נוסע על מסילה?"],
  },
  {
    grade: 3, subject: "ידע כללי",
    topics: ["טבע ישראל", "ספורט ופנאי", "ממציאים ידועים (פשוט)", "חיות מסוכנות", "חידות לוגיות פשוטות", "גוף האדם"],
    forbidden: ["פוליטיקה", "כלכלה", "טכנולוגיה מתקדמת"],
    languageLevel: "ידע כללי לגיל 8-9",
    exampleTopics: ["מהו היונק הגדול בעולם?", "מה הספורט שמשחקים עם רקטה?", "כמה עצמות יש בגוף אדם?"],
  },
  {
    grade: 4, subject: "ידע כללי",
    topics: ["ממציאים ותגליות", "מדינות וערים מפורסמות", "ספורט עולמי", "טכנולוגיה בסיסית", "רשימת שיאים (הגבוה ביותר, הארוך ביותר)"],
    forbidden: ["פוליטיקה", "כלכלה מורכבת"],
    languageLevel: "ידע כללי לגיל 9-10",
    exampleTopics: ["מי המציא את הטלפון?", "מה ההר הגבוה בעולם?", "כמה שחקנים בקבוצת כדורגל?"],
  },
  {
    grade: 5, subject: "ידע כללי",
    topics: ["מדע ופיסיקה פשוטה", "גיאוגרפיה כללית", "אמנות ומוסיקה (בסיסי)", "היסטוריה כללית", "חידות מדעיות"],
    forbidden: ["פוליטיקה שוטפת", "כלכלה"],
    languageLevel: "ידע כללי עשיר, גיל 10-11",
    exampleTopics: ["כמה פלנטות במערכת השמש?", "מי צייר את המונה ליזה?", "מהי הריאה הגדולה ביותר?"],
  },
  {
    grade: 6, subject: "ידע כללי",
    topics: ["מדע וטכנולוגיה", "ספרות ואמנות", "גיאוגרפיה ותרבות", "היסטוריה עולמית", "חידות לוגיות"],
    forbidden: ["פוליטיקה עכשווית"],
    languageLevel: "ידע כללי רחב, גיל 11-12",
    exampleTopics: ["מי כתב 'רומיאו ויולייט'?", "מה הפכה העיר רומא?", "מהו כוח הכבידה?"],
  },
];

// ─── ARTS (אמנות) ────────────────────────────────────────────────────────────
const ARTS_RULES: SubjectGradeRule[] = [
  {
    grade: 1, subject: "אמנות",
    topics: ["צבעים ראשוניים ומשניים", "צורות: עיגול, משולש, ריבוע", "ציירים ישראלים ידועים (שם + ציור פשוט)", "יצירת אמנות בסיסית"],
    forbidden: ["פרספקטיבה", "טכניקות מתקדמות", "היסטוריה של אמנות"],
    languageLevel: "שמות צבעים וצורות, גיל 6-7",
    exampleTopics: ["אילו שני צבעים מעורבבים עושים ירוק?", "כמה צלעות למשולש?", "מה שם הצייר שצייר את הכוכבים?"],
  },
  {
    grade: 2, subject: "אמנות",
    topics: ["צבעים חמים/קרים", "טקסטורה", "פסלים מפורסמים", "מוסיקה: נגינה/שירה בסיסי"],
    forbidden: ["ניתוח אמנות מורכב", "היסטוריה של אמנות"],
    languageLevel: "מושגי אמנות בסיסיים, גיל 7-8",
    exampleTopics: ["אלו צבעים נחשבים 'חמים'?", "מהי טקסטורה?", "מה שם הפסל שעשה מיכלאנג'לו?"],
  },
  {
    grade: 3, subject: "אמנות",
    topics: ["ציירים ידועים: ון גוך, פיקאסו (יסודי)", "סגנונות: ריאליזם, אימפרסיוניזם (פשוט)", "מוסיקה: נוטים ותוים", "עיצוב"],
    forbidden: ["ניתוח סגנונות מורכב", "היסטוריה של אמנות עתיקה"],
    languageLevel: "ידע על ציירים ויצירות, גיל 8-9",
    exampleTopics: ["מה צייר ון גוך?", "מה ההבדל בין ריאליזם לאימפרסיוניזם?", "מה הכלי המיתרי הנפוץ?"],
  },
  {
    grade: 4, subject: "אמנות",
    topics: ["רנסנס: לאונרדו, מיכלאנג'לו", "מוסיקה: מוצרט, בטהובן (בסיסי)", "אמנות עברית/ישראלית"],
    forbidden: ["ניתוח פורמלי מורכב", "מוסיקולוגיה"],
    languageLevel: "ידע על אמנות ותרבות, גיל 9-10",
    exampleTopics: ["מי צייר את התקרה של הקפלה הסיסטינית?", "מה שמו של הסימפוני ה-5 של בטהובן?", "מי הוא ציייר ישראלי ידוע?"],
  },
  {
    grade: 5, subject: "אמנות",
    topics: ["תנועות אמנותיות", "מוסיקה: סוגים וסגנונות", "ארכיטקטורה פשוטה", "צילום ועיצוב גרפי"],
    forbidden: ["ניתוח תיאורטי עמוק"],
    languageLevel: "תרבות ואמנות, גיל 10-11",
    exampleTopics: ["מה הסגנון האמנותי של דאלי?", "מה ההבדל בין ג'אז לקלאסי?", "מי בנה את הקולוסיאום?"],
  },
  {
    grade: 6, subject: "אמנות",
    topics: ["אמנות מודרנית ועכשווית", "מוסיקה עולמית ופופ", "קולנוע ותיאטרון (יסוד)", "עיצוב ואדריכלות"],
    forbidden: ["ניתוח ביקורתי מורכב"],
    languageLevel: "תרבות ואמנות עשירה, גיל 11-12",
    exampleTopics: ["מה מאפיין אמנות אבסטרקטית?", "מי ביים את 'שינדלר'ס ליסט'?", "מהו גראפיטי כאמנות?"],
  },
];

// ─── MASTER INDEX ─────────────────────────────────────────────────────────────
type SubjectKey = "עברית" | "אנגלית" | "מדעים" | 'תנ"ך' | "גיאוגרפיה" | "היסטוריה" | "ידע כללי" | "אמנות";

const ALL_SUBJECT_RULES: Record<SubjectKey, SubjectGradeRule[]> = {
  "עברית":      HEBREW_RULES,
  "אנגלית":     ENGLISH_RULES,
  "מדעים":      SCIENCE_RULES,
  'תנ"ך':       BIBLE_RULES,
  "גיאוגרפיה":  GEOGRAPHY_RULES,
  "היסטוריה":   HISTORY_RULES,
  "ידע כללי":   GENERAL_KNOWLEDGE_RULES,
  "אמנות":      ARTS_RULES,
};

export function getSubjectGradeRule(subject: string, grade: number): SubjectGradeRule | null {
  const rules = ALL_SUBJECT_RULES[subject as SubjectKey];
  if (!rules) return null;
  return rules.find(r => r.grade === grade) ?? null;
}

/**
 * Build a per-subject instruction block to inject into AI prompts.
 * Returns a string listing grade-appropriate topics and forbidden topics for each subject.
 */
export function buildAllSubjectsInstruction(grade: number): string {
  const lines: string[] = [`--- כללי תוכן לפי מקצוע לכיתה ${grade} ---`];

  for (const [subject, rules] of Object.entries(ALL_SUBJECT_RULES)) {
    const rule = rules.find(r => r.grade === grade);
    if (!rule) continue;
    lines.push(`\n${subject}:`);
    lines.push(`  נושאים מתאימים: ${rule.topics.join(", ")}`);
    lines.push(`  אסור להכליל: ${rule.forbidden.join(", ")}`);
    lines.push(`  רמת שפה: ${rule.languageLevel}`);
  }

  lines.push("\n---");
  return lines.join("\n");
}

/**
 * Validate that a question on a given subject is appropriate for the grade.
 * Uses keyword heuristics to detect forbidden topics.
 * Returns true if the question passes, false if it should be rejected.
 */
export function validateSubjectQuestion(questionText: string, subject: string, grade: number): boolean {
  const rule = getSubjectGradeRule(subject, grade);
  if (!rule) return true;

  const text = questionText.toLowerCase();

  // Keyword map for forbidden concepts across subjects
  const forbiddenKeywordMap: Record<string, string[]> = {
    // General forbidden for young grades
    "פוטוסינתזה":          ["פוטוסינתזה", "כלורופיל", "פחמן דו חמצני"],
    "יבשות":               ["יבשת", "יבשות", "אוסטרליה", "אנטרקטיקה", "אפריקה", "אמריקה", "אסיה", "אירופה"],
    "אטומים ומולקולות":    ["אטום", "מולקולה", "אלקטרון"],
    "כפל":                 ["כפל", "מכפלה", "לכפול", "×"],
    "חילוק":               ["חילוק", "לחלק", "מחולק", "÷"],
    "אחוזים":              ["אחוז", "%"],
    "עשרוניות":            ["עשרוני", "נקודה עשרונית"],
    "אלגברה":              ["אלגברה", "משוואה", "נעלם"],
    "דקדוק":               ["שורש", "בניין", "כינוי גוף", "פועל בהפעיל"],
    "ציורי לשון":          ["ציור לשון", "מטאפורה", "גוזמה"],
    "past tense irregular": ["irregular", "past perfect", "had been", "were doing"],
    "perfect tenses":      ["present perfect", "past perfect", "have been", "has been"],
    "מהפכות":              ["מהפכה", "מהפכת"],
    "מלחמות עולם":         ["מלחמת עולם", "נאצי", "היטלר"],
    "קולוניאליזם":         ["קולוניאליזם", "קולוניה"],
    "כלכלה מורכבת":        ["תוצר לאומי גולמי", "GDP", "אינפלציה", "רצסיה"],
    "נפח":                 ["נפח", "קוביה"],
    "שברים":               ["שבר", "מכנה", "מונה"],
  };

  for (const forbidden of rule.forbidden) {
    const keywords = forbiddenKeywordMap[forbidden];
    if (!keywords) continue;
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) return false;
    }
  }

  return true;
}
