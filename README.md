# M3U/M3U8 Streamer Bilal  
*صفحة فيسبوك:* https://www.facebook.com/profile.php?id=100087155439924  
*هذا المشروع ليس للبيع، وأشكر كل من ساهم في تعليمه.* 
مشروع Node.js بسيط لبث روابط M3U/M3U8 عبر RTMPS إلى Facebook باستخدام FFmpeg مع واجهة ويب مدمجة.

## الميزات

- بث روابط M3U/M3U8 مباشرة إلى Facebook Live
- واجهة ويب مدمجة في ملف واحد
- إعدادات قابلة للتخصيص عبر ملف JSON
- مراقبة أخطاء FFmpeg وعرضها
- دعم النشر على Render مع Docker
- هيكل ملفات مبسط (4 ملفات فقط)

## هيكل المشروع

```
stream_project_js/
├── config.json       # ملف الإعدادات
├── index.js          # التطبيق الرئيسي + الواجهة
├── package.json      # تبعيات Node.js
└── Dockerfile        # ملف Docker للنشر
```

## الإعداد والتشغيل

### 1. إعداد ملف الإعدادات

قم بتحرير ملف `config.json` وأدخل بياناتك:

```json
{
    "m3u8_url": "https://example.com/your_stream.m3u8",
    "rtmps_url": "rtmps://live-api-s.facebook.com:443/rtmp/",
    "stream_key": "YOUR-FACEBOOK-STREAM-KEY"
}
```

### 2. التشغيل المحلي

```bash
# تثبيت التبعيات
npm install

# تشغيل التطبيق
npm start
```

ثم افتح المتصفح على `http://localhost:5000`

### 3. النشر على Render

1. ارفع المشروع إلى GitHub
2. في Render، اختر "Web Service"
3. اربط المستودع
4. اختر "Docker" كنوع البناء
5. سيتم النشر تلقائياً باستخدام Dockerfile

## استخدام التطبيق

1. **بدء البث**: اضغط على زر "Start Stream"
2. **مراقبة الحالة**: ستظهر حالة البث في الوقت الفعلي
3. **إيقاف البث**: اضغط على زر "Stop Stream"
4. **عرض الأخطاء**: ستظهر أي أخطاء في منطقة الإخراج

## إعدادات FFmpeg

- **Video Codec**: libx264
- **Preset**: veryfast
- **Bitrate**: 2500k
- **Audio Codec**: AAC
- **Audio Bitrate**: 128k

## استكشاف الأخطاء

### مشاكل شائعة:

1. **"FFmpeg not found"**: تأكد من تثبيت FFmpeg
2. **"Connection refused"**: تحقق من رابط RTMPS ومفتاح البث
3. **"Invalid M3U8 URL"**: تأكد من صحة الرابط

### حلول:

- تحقق من ملف `config.json`
- راجع رسائل الخطأ في الواجهة
- تأكد من اتصال الإنترنت

## الأمان

- لا تشارك مفتاح البث
- استخدم HTTPS في الإنتاج
- قم بتحديث التبعيات بانتظام

## الترخيص

مفتوح المصدر للاستخدام الشخصي والتجاري.

