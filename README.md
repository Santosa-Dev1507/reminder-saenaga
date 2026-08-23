# SAENAGA Reminder

PWA pribadi untuk mengingatkan presensi SAENAGA tanpa WhatsApp API.

## Arsitektur

GitHub → Vercel → API SAENAGA → Web Push → Android.

## Status

UI/PWA, Web Push subscription, Supabase storage, dan Vercel Cron sudah disiapkan.

**Bagian yang wajib diverifikasi sebelum produksi:** autentikasi API SAENAGA saat ini. APK 3.0.6 yang diberikan menunjukkan endpoint `jadwalPresensiToday`, tetapi jangan memakai token/kredensial yang tertanam di APK debug.

## Setup

1. `npm install`
2. Salin `.env.example` menjadi `.env.local`
3. Generate VAPID:
   `npx web-push generate-vapid-keys`
4. Buat project Supabase dan jalankan `supabase.sql`.
5. Isi environment variables di Vercel.
6. Deploy ke Vercel.
7. Buka URL Vercel dari Android Chrome.
8. Aktifkan notifikasi.
9. Pilih "Add to Home screen"/"Instal aplikasi".

## Catatan Cron

Jadwal pada `vercel.json` menggunakan UTC:
- 06:45 WIB = 23:45 UTC hari sebelumnya
- 07:15 WIB = 00:15 UTC
- 07:45 WIB = 00:45 UTC

Untuk Vercel plan yang membatasi frekuensi Cron, gunakan scheduler eksternal atau ubah jadwal sesuai paket Vercel.

## Keamanan

- Jangan taruh NIP/password/token di frontend.
- Jangan commit `.env.local`.
- Jangan menggunakan token yang diekstrak dari APK debug.
- Untuk multi-user, tambahkan autentikasi aplikasi dan enkripsi/secret management.
