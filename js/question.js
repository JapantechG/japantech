/* =============================================================
   BATLINGO - QUESTION ENGINE
   ============================================================= */


/* =============================================================
   MODE
   ============================================================= */

/**
 * Kiểm tra mode có phải Audio hay không
 */
export function isAudioMode(mode)
{
    return (mode === "audio_hiragana" || mode === "audio_meaning" || mode === "audio_kanji");
}

/* =============================================================
   QUESTION
   ============================================================= */
/**
 * Lấy nội dung hiển thị ở phía QUESTION.
 */
export function getQuestionText(data,mode)
{
    if (!data) 
    {
        return "";
    }

    switch (mode)
    {
        /*Kanji → Hiragana*/
        case "kanji_hiragana":
            return data.word;

        /*Hiragana → Meaning*/
        case "hiragana_meaning":
            return data.reading;

        /*Meaning → Kanji*/
        case "meaning_kanji":
            return data.meaning;

        /*Audio modes*/
        case "audio_hiragana":
        case "audio_meaning":
        case "audio_kanji":

            return "🔊";

        /* Default: Kanji → Meaning*/
        default:
            return data.word;
    }
}

/* =============================================================
   ANSWER FIELD
   ============================================================= */

/**
 * Field dùng làm đáp án chính.
 *
 * Ví dụ:
 *
 * kanji_hiragana
 * 促進 → そくしん
 *
 * meaning_kanji
 * thúc đẩy → 促進
 */
export function getAnswerField(mode)
{
    switch (mode)
    {
        case "kanji_hiragana":
        case "audio_hiragana":
            return "reading";

        case "meaning_kanji":
        case "audio_kanji":
            return "word";

        /*
            kanji_meaning
            hiragana_meaning
            audio_meaning
        */
        default:
            return "meaning";
    }
}

/**
 * Lấy đáp án chính.
 */
export function getAnswerText(data,mode)
{
    if (!data) 
    {
        return "";
    }

    const field = getAnswerField(mode);

    return data[field] ?? "";
}

/* =============================================================
   FLASHCARD BACK
   ============================================================= */

/**
 * Tạo dữ liệu mặt sau Flashcard.
 *
 * Không phụ thuộc UI.
 */
export function getFlashcardBack(data,mode)
{
    if (!data)
    {
        return {
            primary: "",
            secondary: "",
            extra: ""
        };
    }

    switch (mode)
    {
        /*
            促進
              ↓
            そくしん
            thúc đẩy
        */
        case "kanji_hiragana":
            return {
                primary: data.reading ?? "",
                secondary: data.meaning ?? "",
                extra: ""
            };

        /*
            そくしん
              ↓
            thúc đẩy
            促進
        */
        case "hiragana_meaning":

            return {
                primary: data.meaning ?? "",
                secondary: data.word ?? "",
                extra: ""
            };

        /*
            thúc đẩy
              ↓
            促進
            そくしん
        */
        case "meaning_kanji":
            return {
                primary: data.word ?? "",
                secondary: data.reading ?? "",
                extra: ""
            };

        /*
            🔊
             ↓
            そくしん
            促進
            thúc đẩy
        */
        case "audio_hiragana":

            return {
                primary: data.reading ?? "",
                secondary: data.word ?? "",
                extra: data.meaning ?? ""
            };

        /*
            🔊
             ↓
            thúc đẩy
            促進
            そくしん
        */
        case "audio_meaning":
            return {
                primary: data.meaning ?? "",
                secondary: data.word ?? "",
                extra: data.reading ?? ""
            };

        /*
            🔊
             ↓
            促進
            そくしん
            thúc đẩy
        */
        case "audio_kanji":
            return {
                primary: data.word ?? "",
                secondary: data.reading ?? "",
                extra: data.meaning ?? ""
            };

        /*
            Kanji → Meaning
        */
        default:
            return {
                primary: data.meaning ?? "",
                secondary: data.reading ?? "",
                extra: ""
            };
    }
}


/* =============================================================
   DATABASE
   ============================================================= */

/**
 * Tìm question bằng ID.
 */
export function getQuestionById(database,id)
{
    if (!Array.isArray(database))
    {
        return null;
    }

    return (database.find(item => String(item.id) === String(id))?? null);
}


/* =============================================================
   SHUFFLE
   ============================================================= */

/**
 * Shuffle nhưng không làm thay đổi array gốc.
 */
export function shuffleQuestions(database)
{
    if (!Array.isArray(database))
    {
        return [];
    }


    const result = [...database];

    for (let i = result.length - 1;i > 0;i--)
    {
        const j =Math.floor(Math.random() *(i + 1));

        [result[i],result[j]] =[result[j],result[i]];
    }

    return result;
}
