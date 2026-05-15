export const YUK_XATI_STYLES = `
@page { size: A4 portrait; margin: 15mm 10mm 10mm 10mm; }
body { margin: 0; font-family: "Times New Roman", serif; font-size: 12pt; color: #000; }
.yx { width: 190mm; margin: 0 auto; }
.yx-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8mm; }
.yx-company { font-size: 16pt; font-weight: bold; font-style: italic; }
.yx-company-sub { font-size: 10pt; font-style: italic; color: #666; }
.yx-title { font-size: 18pt; font-weight: bold; text-align: right; }
.yx-docno { font-size: 12pt; margin-top: 2mm; text-align: right; }
.yx-docno span { display: inline-block; min-width: 40mm; border-bottom: 1px solid #000; }
.yx-info { margin: 5mm 0; font-size: 12pt; }
.yx-info .label { font-weight: normal; }
.yx-info .value { font-weight: bold; margin-left: 3mm; }
.yx-date { font-size: 11pt; text-decoration: underline; margin: 3mm 0 5mm; }
.yx-table { width: 100%; border-collapse: collapse; margin: 5mm 0; font-size: 10pt; }
.yx-table th { border: 1px solid #000; padding: 2mm; text-align: center; font-weight: bold; font-size: 9pt; background: #f5f5f5; vertical-align: middle; }
.yx-table td { border: 1px solid #000; padding: 1.5mm 2mm; text-align: center; vertical-align: middle; }
.yx-table td.name { text-align: left; padding-left: 3mm; }
.yx-table td.num { text-align: right; padding-right: 3mm; font-variant-numeric: tabular-nums; }
.yx-table tr.total-row td { font-weight: bold; border-top: 2px solid #000; font-size: 11pt; }
.yx-sigs { margin-top: 12mm; width: 100%; border-collapse: collapse; }
.yx-sigs td { padding: 4mm 5mm; font-size: 11pt; border-bottom: 1px solid #000; }
.yx-sigs .sig-label { font-weight: bold; width: 30%; background: #f9f9f9; border: 1px solid #000; }
.yx-sigs .sig-sign { width: 35%; text-align: center; color: #aaa; font-style: italic; border-bottom: 1px solid #000; }
.yx-sigs .sig-fio { width: 35%; text-align: center; border-bottom: 1px solid #000; }
`;
