# دليل النسخ الاحتياطي والاستعادة

## إنشاء نسخة احتياطية

من مجلد المشروع، شغّل:

```powershell
npm run backup
```

يُنشأ الملف `backups/apdf-backup-YYYY-MM-DD.zip`. يستبعد السكربت مجلدات `.git` و`node_modules` و`.next` وملفات ZIP، ويعرض مسار النسخة وحجمها بعد اكتمالها.

## الاستعادة التلقائية

لاستعادة أحدث نسخة من مجلد `backups` إلى مجلد المشروع الحالي، شغّل:

```powershell
npm run restore
```

أو مرّر مسار نسخة محددة مباشرةً:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/restore.ps1 -ArchivePath "C:\path\to\apdf-backup-YYYY-MM-DD.zip"
```

يمكن تحديد مجلد استعادة آخر بتمرير `-DestinationPath`. بعد فك الملفات، يثبت السكربت الاعتماديات باستخدام `npm install` ويتحقق من البناء باستخدام `npm run build`.

## الاستعادة اليدوية من الصفر

1. فك ضغط ملف النسخة الاحتياطية إلى مجلد جديد، مع التأكد من وجود `package.json` في جذر المجلد.
2. افتح الطرفية داخل ذلك المجلد وثبّت الاعتماديات:

   ```powershell
   npm install
   ```

3. شغّل الموقع محلياً:

   ```powershell
   npm run dev
   ```

4. افتح `http://localhost:3000` في المتصفح.
