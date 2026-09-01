# Expiya İkinci El — PostgreSQL Tenant İzolasyonu ve RLS Tasarımı v0.1

Durum: `DESIGN ONLY / NOT A MIGRATION / NO DATABASE WRITE`
Tarih: `2026-09-01`

## 1. Amaç ve sınır

Bu belge Expiya İkinci El için PostgreSQL veri erişim sınırını tanımlar. Çalıştırılabilir migration değildir. Production veritabanına uygulanması; hukukça onaylı saklama matrisi, identity sağlayıcısı, connection-pool transaction modeli, backup silme yaklaşımı ve bağımsız güvenlik incelemesi tamamlanmadan yasaktır.

Sıfır araç tabloları ve mevcut migration'lar değiştirilmez. İkinci el tabloları ayrı `used_cars` şemasında tasarlanır. Partner uygulaması mevcut sıfır araç DB rolünü kullanmaz.

## 2. Güvenlik varsayımları

- Uygulama tarafından gönderilen `tenant_id` tek başına otorite değildir.
- Tenant context, doğrulanmış session'dan server-side türetilir.
- Her transaction başında `SET LOCAL app.tenant_id`, `app.actor_id`, `app.actor_role`, `app.branch_ids` uygulanır.
- Pool bağlantısı transaction dışında tenant context taşımaz; `SET` yerine `SET LOCAL` zorunludur.
- Uygulama rolü tablo sahibi, superuser veya `BYPASSRLS` olamaz.
- Tablolarda `ENABLE ROW LEVEL SECURITY` ve `FORCE ROW LEVEL SECURITY` birlikte kullanılır.
- RLS uygulama authorization'ının yerine geçmez; ikinci bağımsız kontroldür.
- Eksik veya geçersiz session setting hata/boş sonuçla fail-closed olur.

## 3. Ayrı veritabanı rolleri

| Rol | Yetki |
|---|---|
| `used_cars_partner_app` | Yalnız tenant RLS kapsamındaki partner işlemleri |
| `used_cars_public_reader` | Yalnız materialized/public projection view'ları |
| `used_cars_moderation_app` | Görev atanmış moderasyon view/function'ları; ham lead erişimi yok |
| `used_cars_worker` | Amaç bazlı import/media/freshness işleri; job claim üzerinden |
| `used_cars_migration_owner` | Deployment sırasında; runtime login kapalı |
| `used_cars_audit_reader` | Salt okunur, gerekçeli ve izlenen erişim |

Partner, public, moderator ve worker aynı credential'ı paylaşamaz. Sistem yöneticisi rolü uygulama üzerinden keyfi tenant impersonation yapamaz; break-glass ayrı süreçtir.

## 4. Tablo sınıfları

### Tenant-owned

`dealers`, `dealer_branches`, `dealer_users`, `memberships`, `inventory_units`, `inventory_revisions`, `listing_revisions`, `media_objects`, `documents`, `leads`, `lead_actions`, `import_batches`, `import_rows`.

Her satırda `tenant_id uuid not null`; şube bağlı kaynaklarda `branch_id uuid not null`. Composite foreign key ile `(tenant_id, branch_id)` ve `(tenant_id, parent_id)` aynı tenant içinde kalır. Yalnız global ID foreign key'i tenant izolasyonu için yeterli kabul edilmez.

### Platform-owned

`taxonomy_entities`, `taxonomy_releases`, `taxonomy_assertions`, `moderation_tasks`, `moderation_events`, `fraud_cases`, `audit_events`.

Platform tabloları partner rolüne doğrudan açılmaz. Taxonomy için yalnız onaylı release view'ı public/partner okumasına açılır. Moderasyon ve audit yazımı doğrudan client CRUD değil, kontrollü security-definer olmayan service transaction'larıyla yapılır.

### Public projection

Public uygulama `inventory_units` veya `listing_revisions` okuyamaz. Yalnız VIN/plaka/tenant/internal source içermeyen `published_listing_projection` okur. Projection üretimi aşağıdaki kapıları atomik uygular:

- listing `PUBLISHED`,
- firma `PUBLISHING_ELIGIBLE`,
- kimlik/sözleşme/ödeme/operasyon/moderasyon kapıları açık,
- stok freshness geçerli,
- kritik çelişki yok,
- yalnız public media rendition.

## 5. Session context sözleşmesi

Örnek tasarım; doğrudan migration olarak çalıştırılmaz:

```sql
begin;
select set_config('app.tenant_id', :verified_tenant_id, true);
select set_config('app.actor_id', :verified_actor_id, true);
select set_config('app.actor_role', :verified_role, true);
select set_config('app.branch_ids', :verified_branch_ids_json, true);
-- aynı transaction içinde sorgular
commit;
```

`verified_*` değerleri request body/query/header'dan değil, doğrulanmış server session claim'lerinden gelir. Tenant değiştirme işlemi yeni session/authorization kontrolü gerektirir.

## 6. Politika şablonları

### 6.1 Tenant okuma

```sql
using (
  tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  and used_cars.actor_is_active()
)
```

### 6.2 Şube kapsamı

Owner/admin için tenant çapı; diğer roller için şube üyeliği:

```sql
using (
  tenant_id = used_cars.current_tenant_id()
  and (
    used_cars.current_actor_role() in ('DEALER_OWNER', 'DEALER_ADMIN')
    or branch_id = any(used_cars.current_branch_ids())
  )
)
```

### 6.3 Yazma

`USING` mevcut satıra erişimi, `WITH CHECK` yeni satırın tenant/branch bağını ayrı denetler. Her INSERT/UPDATE policy'sinde ikisi de bulunur. Client'ın `tenant_id` değiştirdiği UPDATE reddedilir.

```sql
using (tenant_id = used_cars.current_tenant_id() and used_cars.can('INVENTORY_WRITE'))
with check (
  tenant_id = used_cars.current_tenant_id()
  and branch_id = any(used_cars.current_branch_ids_for_write())
  and used_cars.can('INVENTORY_WRITE')
)
```

### 6.4 Lead

Lead erişimi yalnız alıcı tenant + hedef şube + `LEAD_READ/LEAD_MANAGE` yetkisi ile mümkündür. `REPORT_VIEWER` lead tablosuna erişemez. Analitik view minimum eşik altında satır üretmez ve kişi/listing düzeyi export sunmaz.

### 6.5 Moderasyon

Moderatör tenant kullanıcısı değildir. Atanmış `moderation_task_id` üzerinden subject projection görür. Görev kapsamı dışında sorgu sonuç üretmez. Belge görüntüleme ayrıca kısa ömürlü grant ve audit olayı gerektirir. Moderatör doğrudan tenant satırını UPDATE etmez; karar olayı ekler, kontrollü projector yeni durumu üretir.

## 7. VIN, plaka, belge ve medya

- VIN/plaka kolonları application-envelope encryption ile ciphertext tutulur; arama/duplicate için ayrı keyed-HMAC fingerprint kullanılır.
- Düz SHA-256 düşük entropili plaka için uygun değildir.
- Encryption key/veri anahtarı veritabanı ile aynı yetki alanında tutulmaz.
- Uygulama foundation'ında sağlayıcıdan bağımsız `IdentifierEncryptionProvider`, tenant/alan bağlamlı keyed-HMAC fingerprint ve identifier-free public projection kontratları hazırdır; gerçek KMS key yönetimi henüz bağlı değildir.
- Public view ciphertext, fingerprint veya maskeli tanımlayıcıyı bile yayınlamaz.
- Object storage key'i `tenant/{tenant_id}/private/...` namespace taşır; presigned URL üretmeden önce DB authorization yeniden yapılır.
- Orijinal belge private/quarantine bucket'ta; public yalnız güvenli türetilmiş görsel rendition olabilir.
- Dosya metadata tablosundaki RLS, object storage policy'si ve CDN cache key'i aynı tenant/public sınıfını uygular.

## 8. Audit ve immutable kayıt yaklaşımı

Audit tablosu append-only'dir. Runtime rollerinde UPDATE/DELETE grant'i yoktur. Hash zinciri tenant/aggregate shard'ına göre uygulanabilir; sequence DB constraint ile tekil olmalıdır. Hash, database immutability'nin yerine geçmez; ikisi birlikte kullanılır.

Audit payload ham VIN, plaka, telefon, e-posta, belge içeriği veya request body taşımaz. Subject ID, action, reason code, actor pseudonymous ID, timestamp ve önceki hash yeterlidir.

## 9. Silme, kapatma ve fail-closed

- Firma `SUSPENDED/CLOSED` olduğunda public projection aynı transaction/event zincirinde geçersizleşir.
- Public read her istekte dealer gate'i doğrular veya yalnız gate-aware atomik projector çıktısını okur.
- Kapanma sırasında asenkron CDN temizliği tek kontrol değildir; authorization kaynağında görünürlük hemen kapanır.
- Foundation kapanma planı session, public projection, lead grant, import job, private media URL ve channel handoff erişimlerini birlikte revoke eder; retention incelemesini ayrı açar ve otomatik kişisel veri silme varsaymaz.
- KVKK silme talebi tenant kapatma ile aynı değildir. Finansal/audit/legal-hold kayıtları ayrı retention sınıflarıdır.
- Silinen VIN/plaka fingerprint'inin duplicate/fraud bastırma amacıyla tutulması hukukça ayrıca gerekçelendirilir.

## 10. Zorunlu test matrisi

1. Her dealer rolü × her action × aynı/farklı tenant.
2. Her şube rolü × atanmış/atanmamış şube.
3. MFA/session iptalinde bütün mutasyonların reddi.
4. INSERT/UPDATE ile tenant ve branch değiştirme denemesi.
5. Foreign key üzerinden başka tenant parent'a bağlanma.
6. Bulk import satırında tenant spoofing.
7. Moderator görev dışı subject ve belge erişimi.
8. Public reader ile base table ve private kolon erişimi.
9. Firma kapatma transaction'ında bütün public stokların sıfıra inmesi.
10. Pool bağlantısının önceki request tenant setting'ini taşımaması.
11. Backup/replica/export rollerinin RLS ve redaction sınırları.
12. `BYPASSRLS`, table owner ve security-definer fonksiyon audit'i.

## 11. Migration öncesi onay kapıları

- Identity/session claim sözleşmesi ve connection-pool transaction testi.
- Tenant/branch composite key ERD'si.
- Hukukça onaylı retention ve deletion matrisi.
- KMS/HMAC key yönetimi ve rotasyon planı.
- Public projection freshness ve fail-closed SLA'sı.
- Foundation'daki atomik tenant publication projector; dealer gate, listing lifecycle, freshness, conflict, tenant ownership ve public media kontrollerini tek snapshot kararında uygular. Firma gate'i kapanınca tenant'ın bütün public sonuçlarını boşaltan negatif test hazırdır.
- Moderatör görev/grant modeli.
- DBA/güvenlik bağımsız review.
- Staging'de gerçek migration için rollback ve RLS negatif test paketi.

Bu kapılar tamamlanmadan `database/migrations` altında ikinci el migration'ı oluşturulmamalıdır.
