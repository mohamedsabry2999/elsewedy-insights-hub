# Elsewedy Insights Hub

Create a complete Arabic RTL web app for Elsewedy Print House named “Elsewedy Client Intelligence Hub”. It is an internal customer transaction analytics system for a printing and packaging company. The user uploads Excel or CSV sheets for each client and year, then the app analyzes customer orders, products, sales growth, reorder cycles, execution time, stopped products, and sales opportunities.

Branding:
- Arabic first, RTL layout, professional Egyptian business Arabic.
- Use Cairo font for Arabic.
- Colors: dark navy #0B1220, red accent #D71920, gold accent #C9A24D, ivory background #F7F3EA, white cards, graphite text #2F3640, soft gray #E6E8EC, success green #16A085.
- Premium executive dashboard style with clean cards, charts, tables, filters, and polished spacing.

Main pages:
1. Login screen with brand name and subtitle: تحليل ذكي لمعاملات العملاء وفرص النمو.
2. Main dashboard showing total sales, orders, clients, average order value, growth rate, top client, top product, urgent opportunities, charts by year/month, top products, and recent uploads.
3. Clients page with searchable table: client name, code, sector, last order, total sales, orders count, growth rate, health score, status.
4. Upload Center: select client, select year, upload Excel/CSV, preview rows, map columns, validate data, import transactions.
5. Data Cleaning page: merge duplicate product names, normalize client names, map categories and printing types, show suspected duplicates.
6. Client Dashboard: client KPIs, yearly sales chart, monthly sales chart, top products by revenue/frequency, recent orders, lost products, sales recommendations, health score.
7. Annual Analysis: choose client and year, show total yearly sales, orders, products, best month, weakest month, top products, new products, disappeared products, comparison with previous year.
8. Product Intelligence: search product, show first order, last order, total revenue, order count, average order value, average reorder cycle, execution duration, price movement, product status.
9. Reorder Cycle Analysis: calculate average days between repeated orders for the same client/product, last order date, expected next order date, delay days, and status: طبيعي، اقترب موعد المتابعة، متأخر، متوقف.
10. Growth Analysis: compare several years, show year over year growth, orders growth, product diversity growth, average order value growth, and trend label.
11. Sales Opportunities and Alerts: cards for reorder follow-up, lost product, growth slowdown, cross-sell, upsell, seasonal reminder, high dependency risk, and client reactivation.
12. Reports: printable/exportable Arabic reports including client annual report, multi-year growth report, product reorder report, lost products report, sales visit report, and executive summary.

Upload columns to support:
client_name, client_code, order_date, delivery_date, invoice_date, job_order_number, invoice_number, product_name, product_category, printing_type, quantity, unit_price, total_value, material, finishing, salesperson, status, notes. Support Arabic column names too.

Analytics calculations:
- Total sales from total_value, or quantity multiplied by unit_price when total_value is missing.
- Orders count by unique job_order_number when available, otherwise rows count.
- Average order value.
- Product frequency.
- Last product order date.
- Reorder interval: differences between consecutive order dates for same client and normalized product.
- Average reorder cycle in days.
- Expected next order date.
- Execution duration from delivery_date minus order_date.
- Year over year growth.
- Product revenue share.
- Client health score out of 100 based on recency, frequency, revenue, growth, and product diversity.
- Client status: VIP, Growth, Risk, Lost, Seasonal, Product Limited.

Data models:
users, clients, uploads, transactions, product_aliases, alerts, settings. Use Supabase if available, otherwise implement a clean frontend storage demo that can later be connected to Supabase.

Demo data:
Add realistic sample transactions for 2023, 2024, 2025, and 2026 for printing and packaging clients. Include repeated products like علبة تغليف شوكولاتة 250 جم، علبة تغليف تمور 500 جم، استيكر ورق، ليبل شفاف، Sleeve Packaging، بروشور، علبة مستحضرات تجميل. Include varied dates, quantities, unit prices, totals, delivery dates, and repeat cycles so dashboards work immediately.

Reports and insights:
Generate Arabic written summaries from the numbers without requiring an external AI API. Example style: العميل حقق إجمالي مبيعات كذا خلال الفترة، أعلى سنة كانت كذا، أكثر منتج متكرر هو كذا، متوسط إعادة الطلب كذا يوم، وآخر طلب كان منذ كذا يوم، ويوصى بالتواصل مع العميل بخصوص كذا.

Business recommendations should mention Elsewedy Print House services when relevant: الطباعة الديجيتال، الأوفست، علب التغليف، الاستيكرات والليبلز، تشطيبات فاخرة، العينات قبل الكميات، وحلول التغليف للقطاعات المختلفة.

Make the product polished and functional, not generic. Focus on Excel upload, preview, mapping, analytics, charts, alerts, and reports. The UI must look like a serious internal executive analytics system for a printing and packaging business.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/74844be1-30cb-4102-8880-01b8efb8c31c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
