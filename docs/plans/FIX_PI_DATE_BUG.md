# Bug Fix: Purchase Invoice sanasi o'zgarmayapti

## Muammo
Purchase Invoice yaratganda foydalanuvchi eski sana tanlaydi (masalan, 2025-03-15), lekin invoice bugungi sana bilan yaratiladi. Xatolik xabari chiqmaydi — sana shunchaki o'zgarmaydi. Muammo faqat Next.js UI'da (ERPNext web UI'da to'g'ri ishlaydi).

## Diagnostika qadamlari

### 1. Formadagi sana input componentini toping
```bash
grep -r "posting_date\|transaction_date\|invoice_date" src/ --include="*.tsx" --include="*.ts" -l
```
Tekshiring:
- Date picker component `posting_date` ni form state'ga to'g'ri yozayaptimi?
- `onChange` handler sana qiymatini o'zgartib yuboryaptimi?
- Default value `new Date()` yoki `today()` bilan har safar ustiga yozilyaptimi?

### 2. API ga yuborilayotgan payload'ni tekshiring
```bash
grep -rn "Purchase Invoice\|purchase.invoice\|purchaseInvoice" src/ --include="*.tsx" --include="*.ts" -l
```
Tekshiring:
- API call qayerda bo'lyapti? (`fetch`, `useMutation`, yoki custom hook)
- `posting_date` payload'ga qo'shilyaptimi?
- Payload'da `posting_date` hardcode qilingan yoki form'dan olingan?

### 3. Eng ko'p uchraydigan xatolar

**Xato A — Default value override:**
```typescript
// XATO: har safar bugungi sanani qo'yadi
const payload = {
  ...formData,
  posting_date: new Date().toISOString().split('T')[0], // BU MUAMMO!
};
```

**To'g'ri:**
```typescript
// TO'G'RI: form'dan kelgan sanani ishlatadi
const payload = {
  ...formData,
  posting_date: formData.posting_date, // foydalanuvchi tanlagan sana
};
```

**Xato B — Date picker format muammosi:**
```typescript
// XATO: flatpickr yoki react-day-picker noto'g'ri format qaytaradi
// ERPNext kutadi: "2025-03-15" (YYYY-MM-DD string)
// Lekin component qaytaradi: Date object yoki "03/15/2025"
```

**To'g'ri:**
```typescript
import { format } from "date-fns";
const payload = {
  posting_date: format(selectedDate, "yyyy-MM-dd"),
};
```

**Xato C — React Hook Form default values:**
```typescript
// XATO: useForm defaultValues har safar bugungi sana bilan init bo'ladi
const form = useForm({
  defaultValues: {
    posting_date: format(new Date(), "yyyy-MM-dd"), // faqat default
  },
});
// Lekin submit paytida formData.posting_date eski qiymatda qoladi
// chunki date picker onChange form.setValue() ni chaqirmayapti
```

**To'g'ri:**
```typescript
// Date picker onChange da form state yangilanishi kerak:
<DatePicker
  onChange={(date) => form.setValue("posting_date", format(date, "yyyy-MM-dd"))}
  value={form.watch("posting_date")}
/>
```

### 4. Tuzatgandan keyin test
- [ ] Eski sana (masalan, 1 hafta oldin) bilan PI yarating
- [ ] Console.log bilan payload'ni tekshiring — posting_date to'g'ri ekanini
- [ ] ERPNext'da yaratilgan PI'ning sanasini tekshiring
- [ ] Kelajak sana bilan ham test qiling (bu odatda ERPNext tomonidan bloklanishi kerak)

### 5. Qo'shimcha tekshirish
Agar yuqoridagilar muammoni topolmasa:
```bash
# API interceptor yoki middleware'da sana o'zgartirilayotganini tekshiring
grep -rn "posting_date\|date.*new Date\|Date.now\|today" src/lib/ src/utils/ src/middleware/ --include="*.ts" --include="*.tsx"

# Zustand store'da default sana bor-yo'qligini tekshiring
grep -rn "posting_date\|invoiceDate" src/stores/ --include="*.ts"
```
