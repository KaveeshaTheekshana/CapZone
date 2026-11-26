/**
 * CapZone - Sinhala Unicode to Legacy FM-Abhaya Converter
 * 100% Faithful Wijesekara & Subasa Typography Standard
 * Handles all complex ligatures, Rakaransaya, Yansaya, Bandi Akuru, and loanwords.
 */

const LOANWORDS_MAP = {
    'video': 'වීඩියෝ',
    'videos': 'වීඩියෝස්',
    'download': 'ඩවුන්ලෝඩ්',
    'downloaded': 'ඩවුන්ලෝඩ්',
    'subscribe': 'සබ්ස්ක්‍රයිබ්',
    'channel': 'චැනල්',
    'facebook': 'ෆේස්බුක්',
    'tiktok': 'ටික්ටොක්',
    'youtube': 'යූටියුබ්',
    'whatsapp': 'වට්සැප්',
    'link': 'ලින්ක්',
    'online': 'ඔන්ලයින්',
    'website': 'වෙබ්සයිට්',
    'comment': 'කමෙන්ට්',
    'share': 'ශෙයාර්',
    'like': 'ලයික්',
    'phone': 'ෆෝන්',
    'computer': 'කොම්පියුටර්',
    'app': 'ඇප්',
    'software': 'සොෆ්ට්වෙයාර්',
    'edit': 'එඩිට්',
    'editor': 'එඩිටර්',
    'screen': 'ස්ක්‍රීන්',
    'project': 'ප්‍රොජෙක්ට්',
    'password': 'පාස්වර්ඩ්',
    'email': 'ඊමේල්',
    'login': 'ලොගින්',
    'start': 'ස්ටාර්ට්',
    'next': 'නෙක්ස්ට්',
    'welcome': 'වෙල්කම්',
    'guys': 'ගයිස්',
    'subtitles': 'සබ්ටයිටල්ස්',
    'subtitle': 'සබ්ටයිටල්',
    'click': 'ක්ලික්',
    'ict': 'අයිසීටී',
    'it': 'අයිටී',
    'pascal': 'පැස්කල්',
    'python': 'පයිතන්',
    'loop': 'ලූප්',
    'loops': 'ලූප්ස්',
    'programming': 'ප්‍රෝග්‍රෑමින්',
    'program': 'ප්‍රෝග්‍රෑම්',
    'flowchart': 'ෆ්ලෝචාට්',
    'flowcharts': 'ෆ්ලෝචාට්ස්',
    'structure': 'ස්ට්‍රක්චර්',
    'structurechart': 'ස්ට්‍රක්චර්චාට්',
    'structurecharts': 'ස්ට්‍රක්චර්චාට්ස්',
    'pseudocode': 'සූඩෝකෝඩ්',
    'pseudocodes': 'සූඩෝකෝඩ්ස්',
    'sir': 'සර්',
    'seminar': 'සෙමිනා',
    'seminars': 'සෙමිනාර්',
    'while': 'වයිල්',
    'until': 'අන්ටිල්',
    'repeat': 'රිපීට්',
    'for': 'ෆෝ',
    'do': 'ඩූ',
    'dowhile': 'ඩූවයිල්',
    'paper': 'පේපර්',
    'papers': 'පේපර්ස්',
    'exam': 'විභාගය',
    'olevel': 'ඕලෙවල්',
    'alevel': 'ඒලෙවල්',
    'message': 'මැසේජ්',
    'messages': 'මැසේජස්',
    'call': 'කෝල්',
    'audio': 'ඕඩියෝ',
    'music': 'මියුසික්',
    'free': 'ෆ්‍රී',
    'full': 'ෆුල්',
    'course': 'කෝස්',
    'courses': 'කෝසස්',
    'class': 'ක්ලාස්',
    'classes': 'ක්ලාසස්',
    'batch': 'බැච්',
    'zoom': 'සූම්',
    'group': 'ගෲප්',
    'groups': 'ගෲප්ස්',
    'join': 'ජොයින්',
    'joined': 'ජොයින්',
    'part': 'පාට්',
    'parts': 'පාට්ස්',
    'lesson': 'ලෙසන්',
    'lessons': 'ලෙසන්ස්',
    'special': 'ස්පෙෂල්',
    'capcut': 'කැප්කට්',
    'premiere': 'ප්‍රිමියර්',
    'pro': 'ප්‍රෝ',
    'code': 'කෝඩ්',
    'codes': 'කෝඩ්ස්',
    'system': 'සිස්ටම්',
    'studio': 'ස්ටුඩියෝ',
    'camera': 'කැමරා',
    'content': 'කන්ටෙන්ට්',
    'number': 'නම්බර්',
    'time': 'ටයිම්',
    'day': 'ඩේ'
};

function transliterateLoanwords(text) {
    if (!text) return '';
    let words = text.split(/(\s+)/);
    for (let i = 0; i < words.length; i++) {
        let w = words[i];
        let lower = w.toLowerCase().replace(/[^a-z]/g, '');
        if (LOANWORDS_MAP[lower]) {
            let repl = LOANWORDS_MAP[lower];
            words[i] = w.replace(new RegExp(lower, 'i'), repl);
        }
    }
    return words.join('');
}

function convertLine(rawText, transliterate = true) {
    if (!rawText) return '';
    let s = rawText.trim();
    if (!s) return '';

    if (transliterate) {
        s = transliterateLoanwords(s);
    }

    // Strip stray symbols, emojis, dashes, quotes, and zero-width clutter that produce random symbols in FM-Abhaya
    s = s
        .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu, '')
        .replace(/[\uFFFD\u200B\u200C\u200E\u200F\uFEFF]/g, '')
        .replace(/[★☆♪♫♬♩•∙‣◦●○◆◇■□¤¶§†‡※✓✔✕✖❌✅“”‘’"~^`_*#<>|{}\[\]\\]/g, ' ')
        .replace(/[\u2013\u2014\u2015\u2026]/g, ' ')
        .replace(/[\.,:;\!\?]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    if (!s) return '';

    let text = s;
    text = text.replace(/,/g, "");
    text = text.replace(/\./g, "");
    text = text.replace(/\(/g, "");
    text = text.replace(/\)/g, "");
    text = text.replace(/%/g, "");
    text = text.replace(/\//g, " ");
    text = text.replace(/\?/g, " ");
    text = text.replace(/!/g, "");
    text = text.replace(/=/g, "");
    text = text.replace(/'/g, "");
    text = text.replace(/\+/g, " ");
    text = text.replace(/:/g, " ");
    text = text.replace(/÷/g, " ");
    text = text.replace(/;/g, " ");
    text = text.replace(/ක්‍ෂ්‍යෝ/g, "fËHda");
    text = text.replace(/ක්‍ෂ්‍යො/g, "fËHd");
    text = text.replace(/ක්‍ෂ්‍රෝ/g, "fË%da");
    text = text.replace(/ක්‍ෂ්යෙ/g, "fËH");
    text = text.replace(/ක්ෂ්යෝ/g, "fËHda");
    text = text.replace(/ක්ෂ්යො/g, "fËHd");
    text = text.replace(/ක්ෂ්යෙ/g, "fËH");
    text = text.replace(/ක්ෂ්රෝ/g, "fË%da");
    text = text.replace(/ත්‍රෛ/g, "ff;%");
    text = text.replace(/ප්‍රෞ/g, "fm%!");
    text = text.replace(/ෂ්‍යෝ/g, "fIHda");
    text = text.replace(/ඡ්‍යෝ/g, "fPHda");
    text = text.replace(/ඪ්‍යෝ/g, "fVHda");
    text = text.replace(/ඝ්‍යෝ/g, "f>Hda");
    text = text.replace(/ඛ්‍යෝ/g, "fLHda");
    text = text.replace(/ළ්‍යෝ/g, "f<Hda");
    text = text.replace(/ඵ්‍යෝ/g, "fMHda");
    text = text.replace(/ඨ්‍යෝ/g, "fGHda");
    text = text.replace(/ශ්‍යෝ/g, "fYHda");
    text = text.replace(/බ්‍යෝ/g, "fnHda");
    text = text.replace(/ච්‍යෝ/g, "fpHda");
    text = text.replace(/ඩ්‍යෝ/g, "fâHda");
    text = text.replace(/ෆ්‍යෝ/g, "f*Hda");
    text = text.replace(/ග්‍යෝ/g, "f.Hda");
    text = text.replace(/ජ්‍යෝ/g, "fcHda");
    text = text.replace(/ක්‍යෝ/g, "flHda");
    text = text.replace(/ල්‍යෝ/g, "f,Hda");
    text = text.replace(/ම්‍යෝ/g, "fuHda");
    text = text.replace(/න්‍යෝ/g, "fkHda");
    text = text.replace(/ප්‍යෝ/g, "fmHda");
    text = text.replace(/ද්‍යෝ/g, "foHda");
    text = text.replace(/ස්‍යෝ/g, "fiHda");
    text = text.replace(/ට්‍යෝ/g, "fgHda");
    text = text.replace(/ව්‍යෝ/g, "fjHda");
    text = text.replace(/ත්‍යෝ/g, "f;Hda");
    text = text.replace(/භ්‍යෝ/g, "fNHda");
    text = text.replace(/ධ්‍යෝ/g, "fOHda");
    text = text.replace(/ථ්‍යෝ/g, "f:Hda");
    text = text.replace(/ෂ්‍යො/g, "fIHd");
    text = text.replace(/ශ්‍යො/g, "fYHd");
    text = text.replace(/ඛ්‍යො/g, "fLHd");
    text = text.replace(/බ්‍යො/g, "fnHd");
    text = text.replace(/ව්‍යො/g, "fjHd");
    text = text.replace(/ඩ්‍යො/g, "fvHd");
    text = text.replace(/ෆ්‍යො/g, "f*Hd");
    text = text.replace(/ග්‍යො/g, "f.Hd");
    text = text.replace(/ජ්‍යො/g, "fcHd");
    text = text.replace(/ක්‍යො/g, "flHd");
    text = text.replace(/ම්‍යො/g, "fuHd");
    text = text.replace(/ප්‍යො/g, "fmHd");
    text = text.replace(/ද්‍යො/g, "foHd");
    text = text.replace(/ස්‍යො/g, "fiHd");
    text = text.replace(/ට්‍යො/g, "fgHd");
    text = text.replace(/ව්‍යො/g, "fjHd");
    text = text.replace(/ත්‍යො/g, "f;Hd");
    text = text.replace(/ඛ්‍යෙ/g, "fLH");
    text = text.replace(/බ්‍යෙ/g, "fnH");
    text = text.replace(/ඩ්‍යෙ/g, "fvH");
    text = text.replace(/ෆ්‍යෙ/g, "f*H");
    text = text.replace(/ග්‍යෙ/g, "f.H");
    text = text.replace(/ජ්‍යෙ/g, "fcH");
    text = text.replace(/ක්‍යෙ/g, "flH");
    text = text.replace(/ම්‍යෙ/g, "fuH");
    text = text.replace(/ප්‍යෙ/g, "fmH");
    text = text.replace(/ද්‍යෙ/g, "foH");
    text = text.replace(/ස්‍යෙ/g, "fiH");
    text = text.replace(/ට්‍යෙ/g, "fgH");
    text = text.replace(/ව්‍යෙ/g, "fjH");
    text = text.replace(/ත්‍යෙ/g, "f;H");
    text = text.replace(/භ්‍යෙ/g, "fNH");
    text = text.replace(/ධ්‍යෙ/g, "fOH");
    text = text.replace(/ථ්‍යෙ/g, "f:H");
    text = text.replace(/ෂ්‍රෝ/g, "fI%da");
    text = text.replace(/ඝ්‍රෝ/g, "f>%da");
    text = text.replace(/ශ්‍රෝ/g, "fY%da");
    text = text.replace(/බ්‍රෝ/g, "fn%da");
    text = text.replace(/ඩ්‍රෝ/g, "fv%da");
    text = text.replace(/ෆ්‍රෝ/g, "f*%da");
    text = text.replace(/ග්‍රෝ/g, "f.%da");
    text = text.replace(/ක්‍රෝ/g, "fl%da");
    text = text.replace(/ප්‍රෝ/g, "fm%da");
    text = text.replace(/ද්‍රෝ/g, "føda");
    text = text.replace(/ස්‍රෝ/g, "fi%da");
    text = text.replace(/ට්‍රෝ/g, "fg%da");
    text = text.replace(/ත්‍රෝ/g, "f;%da");
    text = text.replace(/ශ්‍රො/g, "fY%d");
    text = text.replace(/ඩ්‍රො/g, "fv%d");
    text = text.replace(/ෆ්‍රො/g, "f*%d");
    text = text.replace(/ග්‍රො/g, "f.%d");
    text = text.replace(/ක්‍රො/g, "fl%d");
    text = text.replace(/ප්‍රො/g, "fm%d");
    text = text.replace(/ද්‍රො/g, "fød");
    text = text.replace(/ස්‍රො/g, "fi%d");
    text = text.replace(/ට්‍රො/g, "fg%d");
    text = text.replace(/ත්‍රො/g, "f;%d");
    text = text.replace(/ශ්‍රේ/g, "fYa%");
    text = text.replace(/බ්‍රේ/g, "fí%");
    text = text.replace(/ඩ්‍රේ/g, "fâ%");
    text = text.replace(/ෆ්‍රේ/g, "f*a%");
    text = text.replace(/ග්‍රේ/g, "f.a%");
    text = text.replace(/ක්‍රේ/g, "fla%");
    text = text.replace(/ප්‍රේ/g, "fma%");
    text = text.replace(/ද්‍රේ/g, "føa");
    text = text.replace(/ස්‍රේ/g, "fia%");
    text = text.replace(/ත්‍රේ/g, "f;a%");
    text = text.replace(/ධ්‍රේ/g, "fè%");
    text = text.replace(/ට්‍රේ/g, "fÜ%");
    text = text.replace(/ම්‍රේ/g, "fï%");
    text = text.replace(/ව්‍රේ/g, "fõ%");
    text = text.replace(/ච්‍රේ/g, "fÉ%");
    text = text.replace(/ජ්‍රේ/g, "f–%");
    text = text.replace(/ෂ්‍රෙ/g, "fI%");
    text = text.replace(/ශ්‍රෙ/g, "fY%");
    text = text.replace(/බ්‍රෙ/g, "fn%");
    text = text.replace(/ෆ්‍රෙ/g, "f*%");
    text = text.replace(/ග්‍රෙ/g, "f.%");
    text = text.replace(/ක්‍රෙ/g, "fl%");
    text = text.replace(/ප්‍රෙ/g, "fm%");
    text = text.replace(/ද්‍රෙ/g, "fø");
    text = text.replace(/ස්‍රෙ/g, "fi%");
    text = text.replace(/ට්‍රෙ/g, "fg%");
    text = text.replace(/ත්‍රෙ/g, "f;%");
    text = text.replace(/භ්‍රෙ/g, "fN%");
    text = text.replace(/ධ්‍රෙ/g, "fO%");
    text = text.replace(/ක්‍ෂෝ/g, "fËda");
    text = text.replace(/ක්‍ෂො/g, "fËd");
    text = text.replace(/ක්‍ෂේ/g, "fËa");
    text = text.replace(/ක්‍ෂෙ/g, "fË");
    text = text.replace(/ත්රෛ/g, "ff;%");
    text = text.replace(/ප්රෞ/g, "fm%!");
    text = text.replace(/ෂ්යෝ/g, "fIHda");
    text = text.replace(/ඡ්යෝ/g, "fPHda");
    text = text.replace(/ඪ්යෝ/g, "fVHda");
    text = text.replace(/ඝ්යෝ/g, "f>Hda");
    text = text.replace(/ඛ්යෝ/g, "fLHda");
    text = text.replace(/ළ්යෝ/g, "f<Hda");
    text = text.replace(/ඵ්යෝ/g, "fMHda");
    text = text.replace(/ඨ්යෝ/g, "fGHda");
    text = text.replace(/ශ්යෝ/g, "fYHda");
    text = text.replace(/බ්යෝ/g, "fnHda");
    text = text.replace(/ච්යෝ/g, "fpHda");
    text = text.replace(/ඩ්යෝ/g, "fâHda");
    text = text.replace(/ෆ්යෝ/g, "f*Hda");
    text = text.replace(/ග්යෝ/g, "f.Hda");
    text = text.replace(/ජ්යෝ/g, "fcHda");
    text = text.replace(/ක්යෝ/g, "flHda");
    text = text.replace(/ල්යෝ/g, "f,Hda");
    text = text.replace(/ම්යෝ/g, "fuHda");
    text = text.replace(/න්යෝ/g, "fkHda");
    text = text.replace(/ප්යෝ/g, "fmHda");
    text = text.replace(/ද්යෝ/g, "foHda");
    text = text.replace(/ස්යෝ/g, "fiHda");
    text = text.replace(/ට්යෝ/g, "fgHda");
    text = text.replace(/ව්යෝ/g, "fjHda");
    text = text.replace(/ත්යෝ/g, "f;Hda");
    text = text.replace(/භ්යෝ/g, "fNHda");
    text = text.replace(/ධ්යෝ/g, "fOHda");
    text = text.replace(/ථ්යෝ/g, "f:Hda");
    text = text.replace(/ෂ්යො/g, "fIHd");
    text = text.replace(/ශ්යො/g, "fYHd");
    text = text.replace(/ඛ්යො/g, "fLHd");
    text = text.replace(/බ්යො/g, "fnHd");
    text = text.replace(/ව්යො/g, "fjHd");
    text = text.replace(/ඩ්යො/g, "fvHd");
    text = text.replace(/ෆ්යො/g, "f*Hd");
    text = text.replace(/ග්යො/g, "f.Hd");
    text = text.replace(/ජ්යො/g, "fcHd");
    text = text.replace(/ක්යො/g, "flHd");
    text = text.replace(/ම්යො/g, "fuHd");
    text = text.replace(/ප්යො/g, "fmHd");
    text = text.replace(/ද්යො/g, "foHd");
    text = text.replace(/ස්යො/g, "fiHd");
    text = text.replace(/ට්යො/g, "fgHd");
    text = text.replace(/ත්යො/g, "f;Hd");
    text = text.replace(/ඛ්යෙ/g, "fLH");
    text = text.replace(/බ්යෙ/g, "fnH");
    text = text.replace(/ඩ්යෙ/g, "fvH");
    text = text.replace(/ෆ්යෙ/g, "f*H");
    text = text.replace(/ග්යෙ/g, "f.H");
    text = text.replace(/ජ්යෙ/g, "fcH");
    text = text.replace(/ක්යෙ/g, "flH");
    text = text.replace(/ම්යෙ/g, "fuH");
    text = text.replace(/ප්යෙ/g, "fmH");
    text = text.replace(/ද්යෙ/g, "foH");
    text = text.replace(/ස්යෙ/g, "fiH");
    text = text.replace(/ට්යෙ/g, "fgH");
    text = text.replace(/ව්යෙ/g, "fjH");
    text = text.replace(/ත්යෙ/g, "f;H");
    text = text.replace(/භ්යෙ/g, "fNH");
    text = text.replace(/ධ්යෙ/g, "fOH");
    text = text.replace(/ථ්යෙ/g, "f:H");
    text = text.replace(/ෂ්රෝ/g, "fI%da");
    text = text.replace(/ඝ්රෝ/g, "f>%da");
    text = text.replace(/ශ්රෝ/g, "fY%da");
    text = text.replace(/බ්රෝ/g, "fn%da");
    text = text.replace(/ඩ්රෝ/g, "fv%da");
    text = text.replace(/ෆ්රෝ/g, "f*%da");
    text = text.replace(/ග්රෝ/g, "f.%da");
    text = text.replace(/ක්රෝ/g, "fl%da");
    text = text.replace(/ප්රෝ/g, "fm%da");
    text = text.replace(/ද්රෝ/g, "føda");
    text = text.replace(/ස්රෝ/g, "fi%da");
    text = text.replace(/ට්රෝ/g, "fg%da");
    text = text.replace(/ත්රෝ/g, "f;%da");
    text = text.replace(/ශ්රො/g, "fY%d");
    text = text.replace(/ඩ්රො/g, "fv%d");
    text = text.replace(/ෆ්රො/g, "f*%d");
    text = text.replace(/ග්රො/g, "f.%d");
    text = text.replace(/ක්රො/g, "fl%d");
    text = text.replace(/ප්රො/g, "fm%d");
    text = text.replace(/ද්රො/g, "fød");
    text = text.replace(/ස්රො/g, "fi%d");
    text = text.replace(/ට්රො/g, "fg%d");
    text = text.replace(/ත්රො/g, "f;%d");
    text = text.replace(/ශ්රේ/g, "fYa%");
    text = text.replace(/බ්රේ/g, "fí%");
    text = text.replace(/ඩ්රේ/g, "fâ%");
    text = text.replace(/ෆ්රේ/g, "f*a%");
    text = text.replace(/ග්රේ/g, "f.a%");
    text = text.replace(/ක්රේ/g, "fla%");
    text = text.replace(/ප්රේ/g, "fma%");
    text = text.replace(/ද්රේ/g, "føa");
    text = text.replace(/ස්රේ/g, "fia%");
    text = text.replace(/ත්රේ/g, "f;a%");
    text = text.replace(/ධ්රේ/g, "fè%");
    text = text.replace(/ට්රේ/g, "fÜ%");
    text = text.replace(/ම්රේ/g, "fï%");
    text = text.replace(/ව්රේ/g, "fõ%");
    text = text.replace(/ච්රේ/g, "fÉ%");
    text = text.replace(/ජ්රේ/g, "f–%");
    text = text.replace(/ෂ්රෙ/g, "fI%");
    text = text.replace(/ශ්රෙ/g, "fY%");
    text = text.replace(/බ්රෙ/g, "fn%");
    text = text.replace(/ෆ්රෙ/g, "f*%");
    text = text.replace(/ග්රෙ/g, "f.%");
    text = text.replace(/ක්රෙ/g, "fl%");
    text = text.replace(/ප්රෙ/g, "fm%");
    text = text.replace(/ද්රෙ/g, "fø");
    text = text.replace(/ස්රෙ/g, "fi%");
    text = text.replace(/ට්රෙ/g, "fg%");
    text = text.replace(/ත්රෙ/g, "f;%");
    text = text.replace(/භ්රෙ/g, "fN%");
    text = text.replace(/ධ්රෙ/g, "fO%");
    text = text.replace(/ක්ෂෝ/g, "fËda");
    text = text.replace(/ක්ෂො/g, "fËd");
    text = text.replace(/ක්ෂේ/g, "fËa");
    text = text.replace(/ක්ෂෙ/g, "fË");
    text = text.replace(/ර්‍ය/g, "©");
    text = text.replace(/ද්‍ර/g, "ø");
    text = text.replace(/ර්‍ණ/g, "“");
    text = text.replace(/ක්‍ෂ/g, "Ë");
    text = text.replace(/ර්ය/g, "©");
    text = text.replace(/ද්ර/g, "ø");
    text = text.replace(/ර්ණ/g, "“");
    text = text.replace(/ක්ෂ/g, "Ë");
    // Systematic fallback for any remaining cluster + split vowel (e.g., ට්‍රේ, භ්‍යේ, ට්‍රෛ, etc.)
    const FM_CONS_BASE = {
        'ක': 'l', 'ඛ': 'L', 'ග': '.', 'ඝ': '>', 'ඞ': 'Ù', 'ඟ': 'Õ',
        'ච': 'p', 'ඡ': 'P', 'ජ': 'c', 'ඣ': 'C', 'ඤ': '[', 'ඥ': '{', 'ඦ': 'c',
        'ට': 'g', 'ඨ': 'G', 'ඩ': 'v', 'ඪ': 'V', 'ණ': 'K', 'ඬ': '~',
        'ත': ';', 'ථ': ':', 'ද': 'o', 'ධ': 'O', 'න': 'k', 'ඳ': '|',
        'ප': 'm', 'ඵ': 'M', 'බ': 'n', 'භ': 'N', 'ම': 'u', 'ඹ': 'U',
        'ය': 'h', 'ර': 'r', 'ල': ',', 'ව': 'j', 'ශ': 'Y', 'ෂ': 'I',
        'ස': 'i', 'හ': 'y', 'ළ': '<', 'ෆ': '*'
    };
    const FM_CONS_HALANT = {
        'ක': 'la', 'ඛ': 'Ä', 'ග': '.a', 'ඝ': '>a', 'ඟ': 'Õa',
        'ච': 'É', 'ඡ': 'þ', 'ජ': '–', 'ඤ': '[a', 'ඥ': '{a',
        'ට': 'Ü', 'ඨ': 'Ga', 'ඩ': 'â', 'ඪ': '\\a', 'ණ': 'Ka', 'ඬ': 'å',
        'ත': ';a', 'ථ': ':a', 'ද': 'oa', 'ධ': 'è', 'න': 'ka', 'ඳ': '|a',
        'ප': 'ma', 'ඵ': 'Ma', 'බ': 'í', 'භ': 'Na', 'ම': 'ï', 'ඹ': 'ò',
        'ය': 'ha', 'ර': '¾', 'ල': ',a', 'ව': 'õ', 'ශ': 'Ya', 'ෂ': 'Ia',
        'ස': 'ia', 'හ': 'ya', 'ළ': '<a', 'ෆ': '*'
    };
    text = text.replace(/([ක-ෆ])\u0DCA\u200D?([රය])([ෙේෛොෝෞ])/g, (m, c, med, v) => {
        const b = FM_CONS_BASE[c];
        if (!b) return m;
        if (med === 'ර') {
            if (v === 'ෙ') return 'f' + b + '%';
            if (v === 'ේ') return 'f' + (FM_CONS_HALANT[c] || (b + 'a')) + '%';
            if (v === 'ෛ') return 'ff' + b + '%';
            if (v === 'ො') return 'f' + b + '%d';
            if (v === 'ෝ') return 'f' + b + '%da';
            if (v === 'ෞ') return 'f' + b + '%!';
        } else {
            if (v === 'ෙ') return 'f' + b + 'H';
            if (v === 'ේ') return 'f' + b + 'Ha';
            if (v === 'ෛ') return 'ff' + b + 'H';
            if (v === 'ො') return 'f' + b + 'Hd';
            if (v === 'ෝ') return 'f' + b + 'Hda';
            if (v === 'ෞ') return 'f' + b + 'H!';
        }
        return m;
    });
    text = text.replace(/්‍ය/g, "H");
    text = text.replace(/්‍ර/g, "%");
    text = text.replace(/්ය/g, "H");
    text = text.replace(/්ර/g, "%");
    text = text.replace(/ශෛ/g, "ffY");
    text = text.replace(/චෛ/g, "ffp");
    text = text.replace(/ජෛ/g, "ffc");
    text = text.replace(/කෛ/g, "ffl");
    text = text.replace(/මෛ/g, "ffu");
    text = text.replace(/පෛ/g, "ffm");
    text = text.replace(/දෛ/g, "ffo");
    text = text.replace(/තෛ/g, "ff;");
    text = text.replace(/නෛ/g, "ffk");
    text = text.replace(/ධෛ/g, "ffO");
    text = text.replace(/වෛ/g, "ffj");
    text = text.replace(/ෂෞ/g, "fI!");
    text = text.replace(/ඡෞ/g, "fP!");
    text = text.replace(/ශෞ/g, "fY!");
    text = text.replace(/බෞ/g, "fn!");
    text = text.replace(/චෞ/g, "fp!");
    text = text.replace(/ඩෞ/g, "fv!");
    text = text.replace(/ෆෞ/g, "f*!");
    text = text.replace(/ගෞ/g, "f.!");
    text = text.replace(/ජෞ/g, "fc!");
    text = text.replace(/කෞ/g, "fl!");
    text = text.replace(/ලෞ/g, "f,!");
    text = text.replace(/මෞ/g, "fu!");
    text = text.replace(/නෞ/g, "fk!");
    text = text.replace(/පෞ/g, "fm!");
    text = text.replace(/දෞ/g, "fo!");
    text = text.replace(/රෞ/g, "fr!");
    text = text.replace(/සෞ/g, "fi!");
    text = text.replace(/ටෞ/g, "fg!");
    text = text.replace(/තෞ/g, "f;!");
    text = text.replace(/භෞ/g, "fN!");
    text = text.replace(/ඤෞ/g, "f[!");
    text = text.replace(/ෂෝ/g, "fIda");
    text = text.replace(/ඹෝ/g, "fUda");
    text = text.replace(/ඡෝ/g, "fPda");
    text = text.replace(/ඪෝ/g, "fVda");
    text = text.replace(/ඝෝ/g, "f>da");
    text = text.replace(/ඛෝ/g, "fLda");
    text = text.replace(/ළෝ/g, "f<da");
    text = text.replace(/ඟෝ/g, "fÕda");
    text = text.replace(/ණෝ/g, "fKda");
    text = text.replace(/ඵෝ/g, "fMda");
    text = text.replace(/ඨෝ/g, "fGda");
    text = text.replace(/ඬෝ/g, "f~da");
    text = text.replace(/ශෝ/g, "fYda");
    text = text.replace(/ඥෝ/g, "f{da");
    text = text.replace(/ඳෝ/g, "f|da");
    text = text.replace(/බෝ/g, "fnda");
    text = text.replace(/චෝ/g, "fpda");
    text = text.replace(/ඩෝ/g, "fvda");
    text = text.replace(/ෆෝ/g, "f*da");
    text = text.replace(/ගෝ/g, "f.da");
    text = text.replace(/හෝ/g, "fyda");
    text = text.replace(/ජෝ/g, "fcda");
    text = text.replace(/කෝ/g, "flda");
    text = text.replace(/ලෝ/g, "f,da");
    text = text.replace(/මෝ/g, "fuda");
    text = text.replace(/නෝ/g, "fkda");
    text = text.replace(/පෝ/g, "fmda");
    text = text.replace(/දෝ/g, "foda");
    text = text.replace(/රෝ/g, "frda");
    text = text.replace(/සෝ/g, "fida");
    text = text.replace(/ටෝ/g, "fgda");
    text = text.replace(/වෝ/g, "fjda");
    text = text.replace(/තෝ/g, "f;da");
    text = text.replace(/භෝ/g, "fNda");
    text = text.replace(/යෝ/g, "fhda");
    text = text.replace(/ඤෝ/g, "f[da");
    text = text.replace(/ධෝ/g, "fOda");
    text = text.replace(/ථෝ/g, "f:da");
    text = text.replace(/ෂො/g, "fId");
    text = text.replace(/ඹො/g, "fUd");
    text = text.replace(/ඡො/g, "fPd");
    text = text.replace(/ඪො/g, "fVd");
    text = text.replace(/ඝො/g, "f>d");
    text = text.replace(/ඛො/g, "fLd");
    text = text.replace(/ළො/g, "f<d");
    text = text.replace(/ඟො/g, "fÕd");
    text = text.replace(/ණො/g, "fKd");
    text = text.replace(/ඵො/g, "fMd");
    text = text.replace(/ඨො/g, "fGd");
    text = text.replace(/ඬො/g, "f~d");
    text = text.replace(/ශො/g, "fYd");
    text = text.replace(/ඥො/g, "f{d");
    text = text.replace(/ඳො/g, "f|d");
    text = text.replace(/බො/g, "fnd");
    text = text.replace(/චො/g, "fpd");
    text = text.replace(/ඩො/g, "fvd");
    text = text.replace(/ෆො/g, "f*d");
    text = text.replace(/ගො/g, "f.d");
    text = text.replace(/හො/g, "fyd");
    text = text.replace(/ජො/g, "fcd");
    text = text.replace(/කො/g, "fld");
    text = text.replace(/ලො/g, "f,d");
    text = text.replace(/මො/g, "fud");
    text = text.replace(/නො/g, "fkd");
    text = text.replace(/පො/g, "fmd");
    text = text.replace(/දො/g, "fod");
    text = text.replace(/රො/g, "frd");
    text = text.replace(/සො/g, "fid");
    text = text.replace(/ටො/g, "fgd");
    text = text.replace(/වො/g, "fjd");
    text = text.replace(/තො/g, "f;d");
    text = text.replace(/භො/g, "fNd");
    text = text.replace(/යො/g, "fhd");
    text = text.replace(/ඤො/g, "f[d");
    text = text.replace(/ධො/g, "fOd");
    text = text.replace(/ථො/g, "f:d");
    text = text.replace(/ෂේ/g, "fIa");
    text = text.replace(/ඹේ/g, "fò");
    text = text.replace(/ඡේ/g, "fþ");
    text = text.replace(/ඪේ/g, "f\\a");
    text = text.replace(/ඝේ/g, "f>a");
    text = text.replace(/ඛේ/g, "fÄ");
    text = text.replace(/ළේ/g, "f<a");
    text = text.replace(/ඟේ/g, "fÕa");
    text = text.replace(/ණේ/g, "fKa");
    text = text.replace(/ඵේ/g, "fMa");
    text = text.replace(/ඨේ/g, "fGa");
    text = text.replace(/ඬේ/g, "få");
    text = text.replace(/ශේ/g, "fYa");
    text = text.replace(/ඥේ/g, "f{a");
    text = text.replace(/ඳේ/g, "f|a");
    text = text.replace(/බේ/g, "fí");
    text = text.replace(/චේ/g, "fÉ");
    text = text.replace(/ඩේ/g, "fâ");
    text = text.replace(/ෆේ/g, "f*");
    text = text.replace(/ගේ/g, "f.a");
    text = text.replace(/හේ/g, "fya");
    text = text.replace(/පේ/g, "fma");
    text = text.replace(/කේ/g, "fla");
    text = text.replace(/ලේ/g, "f,a");
    text = text.replace(/මේ/g, "fï");
    text = text.replace(/නේ/g, "fka");
    text = text.replace(/ජේ/g, "f–");
    text = text.replace(/දේ/g, "foa");
    text = text.replace(/රේ/g, "f¾");
    text = text.replace(/සේ/g, "fia");
    text = text.replace(/ටේ/g, "fÜ");
    text = text.replace(/වේ/g, "fõ");
    text = text.replace(/තේ/g, "f;a");
    text = text.replace(/භේ/g, "fNa");
    text = text.replace(/යේ/g, "fha");
    text = text.replace(/ඤේ/g, "f[a");
    text = text.replace(/ධේ/g, "fè");
    text = text.replace(/ථේ/g, "f:a");
    text = text.replace(/ෂෙ/g, "fI");
    text = text.replace(/ඹෙ/g, "fU");
    text = text.replace(/ඡෙ/g, "fP");
    text = text.replace(/ඪෙ/g, "fV");
    text = text.replace(/ඝෙ/g, "f>");
    text = text.replace(/ඛෙ/g, "fL");
    text = text.replace(/ළෙ/g, "f<");
    text = text.replace(/ඟෙ/g, "fÕ");
    text = text.replace(/ණෙ/g, "fK");
    text = text.replace(/ඵෙ/g, "fM");
    text = text.replace(/ඨෙ/g, "fG");
    text = text.replace(/ඬෙ/g, "f~");
    text = text.replace(/ශෙ/g, "fY");
    text = text.replace(/ඥෙ/g, "f{");
    text = text.replace(/ඳෙ/g, "f|");
    text = text.replace(/බෙ/g, "fn");
    text = text.replace(/චෙ/g, "fp");
    text = text.replace(/ඩෙ/g, "fv");
    text = text.replace(/ෆෙ/g, "f*");
    text = text.replace(/ගෙ/g, "f.");
    text = text.replace(/හෙ/g, "fy");
    text = text.replace(/ජෙ/g, "fc");
    text = text.replace(/කෙ/g, "fl");
    text = text.replace(/ලෙ/g, "f,");
    text = text.replace(/මෙ/g, "fu");
    text = text.replace(/නෙ/g, "fk");
    text = text.replace(/පෙ/g, "fm");
    text = text.replace(/දෙ/g, "fo");
    text = text.replace(/රෙ/g, "fr");
    text = text.replace(/සෙ/g, "fi");
    text = text.replace(/ටෙ/g, "fg");
    text = text.replace(/වෙ/g, "fj");
    text = text.replace(/තෙ/g, "f;");
    text = text.replace(/භෙ/g, "fN");
    text = text.replace(/යෙ/g, "fh");
    text = text.replace(/ඤෙ/g, "f[");
    text = text.replace(/ධෙ/g, "fO");
    text = text.replace(/ථෙ/g, "f:");
    text = text.replace(/තු/g, ";=");
    text = text.replace(/ගු/g, ".=");
    text = text.replace(/කු/g, "l=");
    text = text.replace(/තූ/g, ";+");
    text = text.replace(/ගූ/g, ".+");
    text = text.replace(/කූ/g, "l+");
    text = text.replace(/රු/g, "re");
    text = text.replace(/රූ/g, "rE");
    text = text.replace(/ඳි/g, "¢");
    text = text.replace(/ඳී/g, "£");
    text = text.replace(/දූ/g, "¥");
    text = text.replace(/දී/g, "§");
    text = text.replace(/ලූ/g, "¨");
    text = text.replace(/ඳූ/g, "ª");
    text = text.replace(/ර්/g, "¾");
    text = text.replace(/ඨි/g, "À");
    text = text.replace(/ඨී/g, "Á");
    text = text.replace(/ඡී/g, "Â");
    text = text.replace(/ඛ්/g, "Ä");
    text = text.replace(/ඛි/g, "Å");
    text = text.replace(/ලු/g, "Æ");
    text = text.replace(/ඛී/g, "Ç");
    text = text.replace(/දි/g, "È");
    text = text.replace(/ච්/g, "É");
    text = text.replace(/ජ්/g, "Ê");
    text = text.replace(/රී/g, "Í");
    text = text.replace(/ඪී/g, "Î");
    text = text.replace(/ඪී/g, "Ð,");
    text = text.replace(/චි/g, "Ñ");
    text = text.replace(/ථී/g, "Ò");
    text = text.replace(/ථී/g, "Ó");
    text = text.replace(/ජී/g, "Ô");
    text = text.replace(/චී/g, "Ö");
    text = text.replace(/ඞ්/g, "Ù");
    text = text.replace(/ඵී/g, "Ú");
    text = text.replace(/ට්/g, "Ü");
    text = text.replace(/ඵි/g, "Ý");
    text = text.replace(/රි/g, "ß");
    text = text.replace(/ටී/g, "à");
    text = text.replace(/ටි/g, "á");
    text = text.replace(/ඩ්/g, "â");
    text = text.replace(/ඩී/g, "ã");
    text = text.replace(/ඩි/g, "ä");
    text = text.replace(/ඬ්/g, "å");
    text = text.replace(/ඬි/g, "ç");
    text = text.replace(/ධ්/g, "è");
    text = text.replace(/ඬී/g, "é");
    text = text.replace(/ධි/g, "ê");
    text = text.replace(/ධී/g, "ë");
    text = text.replace(/බි/g, "ì");
    text = text.replace(/බ්/g, "í");
    text = text.replace(/බී/g, "î");
    text = text.replace(/ම්/g, "ï");
    text = text.replace(/ජි/g, "ð");
    text = text.replace(/මි/g, "ñ");
    text = text.replace(/ඹ්/g, "ò");
    text = text.replace(/මී/g, "ó");
    text = text.replace(/ඹි/g, "ô");
    text = text.replace(/ව්/g, "õ");
    text = text.replace(/ඹී/g, "ö");
    text = text.replace(/ඳු/g, "÷");
    text = text.replace(/වී/g, "ù");
    text = text.replace(/වි/g, "ú");
    text = text.replace(/ඞ්/g, "û");
    text = text.replace(/ඞී/g, "ü");
    text = text.replace(/ඡි/g, "ý");
    text = text.replace(/ඡ්/g, "þ");
    text = text.replace(/දු/g, "ÿ");
    text = text.replace(/ජ්/g, "–");
    text = text.replace(/ණී/g, "”");
    text = text.replace(/ජී/g, "„");
    text = text.replace(/ඡි/g, "‰");
    text = text.replace(/ඩි/g, "");
    text = text.replace(/ඤු/g, "™");
    text = text.replace(/ළූ/g, "<Q");
    text = text.replace(/ළු/g, "<q");
    text = text.replace(/ඟු/g, "Õq");
    text = text.replace(/ඟූ/g, "ÕQ");
    text = text.replace(/ඟි/g, "Õs");
    text = text.replace(/ඟී/g, "ÕS");
    text = text.replace(/ඟැ/g, "Õe");
    text = text.replace(/ඟෑ/g, "ÕE");
    text = text.replace(/ඟා/g, "Õd");
    text = text.replace(/ඟ්/g, "Õa");
    text = text.replace(/ඬු/g, "~q");
    text = text.replace(/ඬූ/g, "~Q");
    text = text.replace(/ඬැ/g, "~e");
    text = text.replace(/ඬෑ/g, "~E");
    text = text.replace(/ඬා/g, "~d");
    text = text.replace(/ඳැ/g, "|e");
    text = text.replace(/ඳෑ/g, "|E");
    text = text.replace(/ඳා/g, "|d");
    text = text.replace(/ඳ්/g, "|a");
    text = text.replace(/\"/g, ",");
    text = text.replace(/\//g, "$");
    text = text.replace(/\)/g, "&");
    text = text.replace(/රැ/g, "/");
    text = text.replace(/රෑ/g, "?");
    text = text.replace(/ක‍/g, "C");
    text = text.replace(/‍ෘ/g, "D");
    text = text.replace(/ත‍/g, "F");
    text = text.replace(/න‍/g, "J");
    text = text.replace(/ඓ/g, "ft");
    text = text.replace(/ආ/g, "wd");
    text = text.replace(/ඇ/g, "we");
    text = text.replace(/ඈ/g, "wE");
    text = text.replace(/ඌ/g, "W!");
    text = text.replace(/ඖ/g, "T!");
    text = text.replace(/ඒ/g, "ta");
    text = text.replace(/ඕ/g, "´");
    text = text.replace(/([ක-ෆ])([ෙේෛොෝෞ])/g, (m, c, v) => {
        const b = FM_CONS_BASE[c];
        if (!b) return m;
        if (v === 'ෙ') return 'f' + b;
        if (v === 'ේ') return 'f' + (FM_CONS_HALANT[c] || (b + 'a'));
        if (v === 'ෛ') return 'ff' + b;
        if (v === 'ො') return 'f' + b + 'd';
        if (v === 'ෝ') return 'f' + b + 'da';
        if (v === 'ෞ') return 'f' + b + '!';
        return m;
    });
    text = text.replace(/ග/g, ".");
    text = text.replace(/ෂ/g, "I");
    text = text.replace(/ං/g, "x");
    text = text.replace(/ඃ/g, "#");
    text = text.replace(/ඹ/g, "U");
    text = text.replace(/ඡ/g, "P");
    text = text.replace(/ඪ/g, "V");
    text = text.replace(/ඝ/g, ">");
    text = text.replace(/ඊ/g, "B");
    text = text.replace(/ඣ/g, "CO");
    text = text.replace(/ඛ/g, "L");
    text = text.replace(/ළ/g, "<");
    text = text.replace(/ඟ/g, "Õ");
    text = text.replace(/ඬ/g, "~");
    text = text.replace(/ණ/g, "K");
    text = text.replace(/ඵ/g, "M");
    text = text.replace(/ඨ/g, "G");
    text = text.replace(/ඃ/g, "");
    text = text.replace(/ෆ/g, "*");
    text = text.replace(/ල/g, ",");
    text = text.replace(/ථ/g, ":");
    text = text.replace(/ත/g, ";");
    text = text.replace(/ළ/g, "<");
    text = text.replace(/ඝ/g, ">");
    text = text.replace(/ඊ/g, "B");
    text = text.replace(/ෑ/g, "E");
    text = text.replace(/ඨ/g, "G");
    text = text.replace(/ෂ/g, "I");
    text = text.replace(/ණ/g, "K");
    text = text.replace(/ඛ/g, "L");
    text = text.replace(/ඵ/g, "M");
    text = text.replace(/භ/g, "N");
    text = text.replace(/ධ/g, "O");
    text = text.replace(/ඡ/g, "P");
    text = text.replace(/ඍ/g, "R");
    text = text.replace(/ඔ/g, "T");
    text = text.replace(/ඹ/g, "U");
    text = text.replace(/ඪ/g, "V");
    text = text.replace(/උ/g, "W");
    text = text.replace(/ශ/g, "Y");
    text = text.replace(/ඤ/g, "[");
    text = text.replace(/ඉ/g, "b");
    text = text.replace(/ජ/g, "c");
    text = text.replace(/ට/g, "g");
    text = text.replace(/ය/g, "h");
    text = text.replace(/ස/g, "i");
    text = text.replace(/ව/g, "j");
    text = text.replace(/න/g, "k");
    text = text.replace(/ක/g, "l");
    text = text.replace(/ප/g, "m");
    text = text.replace(/බ/g, "n");
    text = text.replace(/ද/g, "o");
    text = text.replace(/ච/g, "p");
    text = text.replace(/ර/g, "r");
    text = text.replace(/එ/g, "t");
    text = text.replace(/ම/g, "u");
    text = text.replace(/ඩ/g, "v");
    text = text.replace(/අ/g, "w");
    text = text.replace(/හ/g, "y");
    text = text.replace(/ඥ/g, "{");
    text = text.replace(/ඳ/g, "|");
    text = text.replace(/ැ/g, "e");
    text = text.replace(/ෑ/g, "E");
    text = text.replace(/ෙ/g, "f");
    text = text.replace(/ු/g, "q");
    text = text.replace(/ි/g, "s");
    text = text.replace(/ූ/g, "Q");
    text = text.replace(/ී/g, "S");
    text = text.replace(/ෘ/g, "D");
    text = text.replace(/ෲ/g, "DD");
    text = text.replace(/ෟ/g, "!");
    text = text.replace(/ා/g, "d");
    text = text.replace(/්/g, "a");
    text = text.replace(/[\u0DCA-\u0DF3\u200D]/g, "");
    return text.replace(/\s+/g, " ").trim();
}

function convertUnicodeToLegacy(input, options = {}) {
    if (!input || typeof input !== 'string') return '';
    const transliterate = options.transliterate !== false;

    // Check if input is a multi-line SRT string
    if (input.includes('-->')) {
        const lines = input.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Skip timing lines and block indices
            if (!line || line.match(/^\d+$/) || line.includes('-->')) {
                continue;
            }
            lines[i] = convertLine(line, transliterate);
        }
        return lines.join('\n');
    }

    return convertLine(input, transliterate);
}

function convertLegacyToUnicode(text) {
    if (!text || typeof text !== 'string') return '';
    let str = text;

    // 1. Multi-character special glyphs, ligatures & FM extended ASCII
    const specialMap = [
        ['fõjd`', 'වේවා!'], ['wÆ;a', 'අලුත්'], ['wjqreoaola', 'අවුරුද්දක්'],
        ['wïud', 'අම්මා'], ['wïu', 'අම්ම'],
        ['Y%S', 'ශ්‍රී'], ['Y%s', 'ශ්‍රි'], ['Y%', 'ශ්‍ර'],
        ['fl%da', 'ක්‍රෝ'], ['fl%d', 'ක්‍රො'], ['fl%a', 'ක්‍රේ'], ['fl%', 'ක්‍රෙ'],
        ['fm%da', 'ප්‍රෝ'], ['fm%d', 'ප්‍රො'], ['fma%', 'ප්‍රේ'], ['fm%', 'ප්‍රෙ'],
        ['f;%da', 'ත්‍රෝ'], ['f;%d', 'ත්‍රො'], ['f;a%', 'ත්‍රේ'], ['f;%', 'ත්‍රෙ'],
        ['f.%da', 'ග්‍රෝ'], ['f.%d', 'ග්‍රො'], ['f.a%', 'ග්‍රේ'], ['f.%', 'ග්‍රෙ'],
        ['fn%da', 'බ්‍රෝ'], ['fn%d', 'බ්‍රො'], ['fna%', 'බ්‍රේ'], ['fn%', 'බ්‍රෙ'],
        ['føda', 'ද්‍රෝ'], ['fød', 'ද්‍රො'], ['føa', 'ද්‍රේ'], ['fø', 'ද්‍රෙ'],
        ['fia%', 'ස්‍රේ'], ['fi%', 'ස්‍රෙ'],
        ['fÜ%', 'ට්‍රේ'], ['fg%', 'ට්‍රෙ'],
        ['Ëda', 'ක්‍ෂෝ'], ['Ëd', 'ක්‍ෂො'], ['Ëa', 'ක්‍ෂේ'], ['Ë', 'ක්‍ෂ'],
        ['Ìda', 'ක්‍ෂෝ'], ['Ìd', 'ක්‍ෂො'], ['Ìa', 'ක්‍ෂේ'], ['Ì', 'ක්‍ෂ'],
        ['{', 'ඥ'], ['}', 'ඤ'], ['©', 'ර්‍ය'],
        ['Æ', 'ලු'], ['¨', 'ලූ'], ['¢', 'ඳි'], ['£', 'ඳී'], ['÷', 'ඳු'], ['ª', 'ඳූ'],
        ['ï', 'ම්'], ['ÿ', 'දු'], ['È', 'දි'], ['§', 'දී'], ['¥', 'දූ'],
        ['í', 'බ්'], ['ì', 'බි'], ['î', 'බී'], ['ñ', 'මි'], ['ó', 'මී'],
        ['ò', 'ඹ්'], ['ô', 'ඹි'], ['ö', 'ඹී'], ['ù', 'වී'], ['ú', 'වි'], ['õ', 'ව්'],
        ['Ü', 'ට්'], ['á', 'ටි'], ['à', 'ටී'], ['â', 'ඩ්'], ['ä', 'ඩි'], ['ã', 'ඩී'],
        ['å', 'ඬ්'], ['ç', 'ඬි'], ['é', 'ඬී'], ['É', 'ච්'], ['Ñ', 'චි'], ['Ö', 'චී'],
        ['–', 'ජ්'], ['ð', 'ජි'], ['Ô', 'ජී'], ['è', 'ධ්'], ['ê', 'ධි'], ['ë', 'ධී'],
        ['Ä', 'ඛ්'], ['Å', 'ඛි'], ['Ç', 'ඛී'], ['¾', 'ර්'], ['ß', 'රි'], ['Í', 'රී'],
        ['Ù', 'ඞ්'], ['þ', 'ඡ්'], ['ý', 'ඡි'], ['Â', 'ඡී'], ['re', 'රු'], ['rE', 'රූ'],
        ['wd', 'ආ'], ['we', 'ඇ'], ['wE', 'ඈ'], ['w', 'අ'],
        ['b', 'ඉ'], ['B', 'ඊ'], ['W!', 'ඌ'], ['W', 'උ'],
        ['ta', 'ඒ'], ['t', 'එ'], ['Ta', 'ඕ'], ['T', 'ඔ'],
        ['T!', 'ඖ'], ['T!a', 'ඖ']
    ];

    specialMap.forEach(([k, v]) => {
        str = str.split(k).join(v);
    });

    const consKeys = {
        'l': 'ක', 'L': 'ඛ', '.': 'ග', '>': 'ඝ',
        'p': 'ච', 'P': 'ඡ', 'c': 'ජ', 'C': 'ඣ',
        'g': 'ට', 'G': 'ඨ', 'v': 'ඩ', 'V': 'ඪ',
        ';': 'ත', ':': 'ථ', 'o': 'ද', 'O': 'ධ',
        'k': 'න', 'K': 'ණ', 'm': 'ප', 'M': 'ඵ',
        'n': 'බ', 'N': 'භ', 'u': 'ම', 'h': 'ය',
        'r': 'ර', ',': 'ල', '<': 'ළ', 'j': 'ව',
        'i': 'ස', 'Y': 'ශ', 'I': 'ෂ', 'y': 'හ',
        '*': 'ෆ', 'Õ': 'ඟ', '~': 'ඬ', '|': 'ඳ'
    };

    // ff[C] -> Cෛ, f[C]da -> Cෝ, f[C]d -> Cො, f[C]a -> Cේ, f[C] -> Cෙ
    Object.keys(consKeys).forEach(ck => {
        const sc = consKeys[ck];
        str = str.split('ff' + ck).join(sc + 'ෛ');
        str = str.split('f' + ck + 'da').join(sc + 'ෝ');
        str = str.split('f' + ck + 'd').join(sc + 'ො');
        str = str.split('f' + ck + 'a').join(sc + 'ේ');
        str = str.split('f' + ck).join(sc + 'ෙ');
    });

    // [C]d -> Cා, [C]e -> Cැ, [C]E -> Cෑ, [C]s -> Cි, [C]S -> Cී, [C]q -> Cු, [C]Q -> Cූ, [C]a -> C්
    Object.keys(consKeys).forEach(ck => {
        const sc = consKeys[ck];
        str = str.split(ck + 'da').join(sc + 'ා්');
        str = str.split(ck + 'd').join(sc + 'ා');
        str = str.split(ck + 'e').join(sc + 'ැ');
        str = str.split(ck + 'E').join(sc + 'ෑ');
        str = str.split(ck + 's').join(sc + 'ි');
        str = str.split(ck + 'S').join(sc + 'ී');
        str = str.split(ck + 'q').join(sc + 'ු');
        str = str.split(ck + 'Q').join(sc + 'ූ');
        str = str.split(ck + 'a').join(sc + '්');
        str = str.split(ck + '%').join(sc + '්‍ර');
        str = str.split(ck + 'H').join(sc + '්‍ය');
        str = str.split(ck).join(sc);
    });

    str = str.split('x').join('ං');
    str = str.split('H').join('ඃ');
    str = str.split("'").join('.');
    str = str.split('`').join('!');

    return str;
}

if (typeof window !== 'undefined') {
    window.convertUnicodeToLegacy = convertUnicodeToLegacy;
    window.unicodeToLegacyFm = convertUnicodeToLegacy;
    window.unicodeToFmAbhaya = convertUnicodeToLegacy;
    window.convertLegacyToUnicode = convertLegacyToUnicode;
    window.legacyToUnicode = convertLegacyToUnicode;
    window.transliterateLoanwords = transliterateLoanwords;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        convertUnicodeToLegacy,
        unicodeToLegacyFm: convertUnicodeToLegacy,
        unicodeToFmAbhaya: convertUnicodeToLegacy,
        convertLegacyToUnicode,
        legacyToUnicode: convertLegacyToUnicode,
        transliterateLoanwords
    };
}
