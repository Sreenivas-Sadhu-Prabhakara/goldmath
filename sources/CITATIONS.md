# Sources & citations — goldmath corpus

All 14 corpus facts in `data/facts.js` were verified at authoring time on **2026-07-22**.
Each fact carries `source_name`, `source_url`, `verified_how`, and `as_of` in the data file.
This document records the primary sources and exactly what was confirmed.

## A. BIS purity grades (IS 1417:2016) — facts `purity-14k` … `purity-24k`

- **Bureau of Indian Standards — Hallmarking FAQ**
  <https://www.bis.gov.in/hallmarking-overview/hallmarking-faqs/hallmarking-faq/>
  Verbatim confirmed: *"IS 1417:2016 permits hallmarking of six caratage (fineness in ppt)
  of gold jewellery/artefacts, viz. 14K(585), 18K(750), 20K(833), 22K(916), 23K(958) and
  24KS(995)."*
- **Wikipedia — BIS hallmark** (cross-check for 14K585 / 18K750 / 22K916)
  <https://en.wikipedia.org/wiki/BIS_hallmark>
- **BIS — Brief on Hallmarking (PDF)** (background)
  <https://www.bis.gov.in/wp-content/uploads/2020/12/brief-on-Hallmarking.pdf>

The six fineness numbers 585 / 750 / 833 / 916 / 958 / 995 were confirmed against the BIS
FAQ. The engine reads these from the corpus; a Node self-test asserts each of 14K–23K is
within 2‰ of karat/24, and 24K995 is asserted **separately** as exactly 995 (it is ~5‰ from
24/24, so a blanket 2‰ rule is false for it — this was the adversarial-review blocker).

## B. GST treatments — facts `gst-gold`, `gst-making`, `gst-composite`

- **CBIC — GST rate schedule (goods & services)**
  <https://cbic-gst.gov.in/gst-goods-services-rates.html>
  Confirmed at authoring time:
  - Gold and articles of jewellery (**HSN 7113**) attract **3% GST** (1.5% CGST + 1.5% SGST).
  - Making charges billed separately as **job-work (SAC 9988)** attract **5% GST**.
  - A retail sale of finished jewellery may be treated as a **composite supply** taxed at
    **3%** on the full transaction value.

Because both the "composite 3%" and "split 3% + 5%" structures appear on real bills, goldmath
exposes both as a user-selectable convention and prints the active assumption on the breakdown.
GST rates change; the `as_of` date (2026-07-22) is surfaced in-app on the reference card.

## C. Unit facts — facts `unit-tola`, `unit-per10g`

- **1 tola = 11.6638 g** — standard Indian bullion unit.
  <https://en.wikipedia.org/wiki/Tola_(unit)>
- **Board rates commonly quoted per 10 g** — Indian bullion-market convention.
  <https://en.wikipedia.org/wiki/Gold_as_an_investment>

## D. Billing conventions — facts `conv-wastage`, `conv-making`, `conv-stamped-fineness`

- **BIS / Department of Consumer Affairs — buying hallmarked jewellery guidance**
  <https://www.bis.gov.in/hallmarking-overview/hallmarking-faqs/hallmarking-faq/>
  <https://consumeraffairs.nic.in/>
  Wastage / value-addition is charged as an extra weight-percentage priced at the metal rate;
  making charges are quoted either as ₹/gram on gross weight or as a percentage of metal value;
  hallmarked fineness is a certified minimum, so metal value uses the stamped fineness (916),
  never karat/24 (916.67).

## Honesty notes

- No live or historical gold rate is fetched or stored — the CSP (`connect-src 'none'`)
  makes that a physical guarantee, and typing the shop's board rate is the feature.
- Every fact that feeds a formula is exercised by at least one `node --test` assertion;
  every citation-only claim carries `source_url` + `as_of`.
- This is a negotiation reference, not financial, investment, or tax advice.
