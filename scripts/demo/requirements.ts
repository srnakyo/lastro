import type { RequirementInput } from "@lastro/shared";

const cite = (source: string, section: string, quote: string) => [{ source, anchor: `@brief.md#${section}`, quote }];

/** Eight requirements across four modules; the seed moves them to different states. */
export const shopRequirements = (src: string): RequirementInput[] => [
  {
    code: "REQ-CRT01", title: "Cart keeps items for 7 days", type: "behavior", reach: { modules: ["cart"] },
    statement: "Items stay in the cart for 7 days, also after sign-out, and come back on the next sign-in.", where: "Cart drawer and cart page",
    citations: cite(src, "cart", "The cart keeps the items for 7 days, even after the customer signs out."),
    criteria: [
      { code: "AC-1", text: "Items added 6 days ago are still in the cart after sign-out and sign-in.", tests: ["tests/cart.test.ts::keeps items for 7 days"] },
      { code: "AC-2", text: "Items added 8 days ago are gone.", tests: ["tests/cart.test.ts::drops items after 7 days"] },
    ],
  },
  {
    code: "REQ-SHP01", title: "Free shipping above R$ 300 in the South and Southeast", type: "calculation", reach: { modules: ["checkout"] },
    statement: "Orders above R$ 300 shipped to the South or Southeast pay no shipping.", dataSource: "cart subtotal after coupon; region from the ZIP code",
    examples: [{ given: "R$ 301 to Curitiba", expect: "shipping R$ 0" }, { given: "R$ 301 to Recife", expect: "regular shipping" }],
    citations: cite(src, "shipping", "Free shipping above R$ 300 for the South and Southeast regions."),
    criteria: [
      { code: "AC-1", text: "R$ 301 to a South ZIP code has free shipping.", tests: ["tests/shipping.test.ts::free above 300 in the south"] },
      { code: "AC-2", text: "R$ 301 to a Northeast ZIP code pays shipping.", tests: ["tests/shipping.test.ts::charges outside south and southeast"] },
    ],
  },
  {
    code: "REQ-PAY01", title: "Checkout accepts PIX and card and shows the total first", type: "behavior", reach: { modules: ["checkout"] },
    statement: "The payment step offers PIX and card and shows the order total before the confirm button.", where: "Checkout, payment step",
    citations: cite(src, "checkout", "The checkout accepts PIX and card, and shows the total before confirming."),
    criteria: [
      { code: "AC-1", text: "PIX and card are both offered.", tests: ["tests/e2e/checkout.spec.ts::offers pix and card"] },
      { code: "AC-2", text: "The total is visible before confirming, on the phone too.", tests: ["tests/e2e/checkout.spec.ts::shows the total before confirming"] },
    ],
  },
  {
    code: "REQ-CPN01", title: "One coupon per order, never below the shipping cost", type: "calculation", reach: { modules: ["checkout"] },
    statement: "An order takes one coupon; the discounted total is never lower than the shipping cost.", dataSource: "coupon table; shipping quote",
    examples: [{ given: "R$ 50 order, R$ 60 coupon, R$ 20 shipping", expect: "total R$ 20" }],
    citations: cite(src, "coupon", "Only one coupon per order. A coupon never brings the total below the shipping cost."),
    criteria: [
      { code: "AC-1", text: "A second coupon is refused.", tests: ["tests/coupon.test.ts::refuses a second coupon"] },
      { code: "AC-2", text: "The total never goes below the shipping cost.", tests: ["tests/coupon.test.ts::floors the total at shipping"] },
    ],
  },
  {
    code: "REQ-STK01", title: "Stock per size and \"last units\" on the product page", type: "ui", reach: { modules: ["catalog"] },
    statement: "The size picker shows the stock of each size and a \"last units\" tag at 3 or fewer.", where: "Product page, size picker",
    citations: cite(src, "product-page", "The product page shows the stock per size, and \"last units\" when there are 3 or fewer."),
    criteria: [{ code: "AC-1", text: "A size with 3 units shows \"last units\".", tests: ["tests/e2e/product.spec.ts::last units at 3 or fewer"] }],
  },
  {
    code: "REQ-DRK01", title: "Every screen works in the dark theme and on the phone", type: "ui", reach: { modules: ["design"] },
    statement: "All screens are usable in the dark theme and at phone width.", where: "Every screen",
    citations: cite(src, "dark-theme", "Every screen has to work in the dark theme and on the phone."),
    criteria: [{ code: "AC-1", text: "No text below 4.5:1 contrast in the dark theme.", tests: ["tests/e2e/a11y.spec.ts::dark theme contrast"] }],
  },
  {
    code: "REQ-HST01", title: "Order history of the last 12 months", type: "behavior", reach: { modules: ["account"] },
    statement: "The account shows every order of the last 12 months, newest first.", where: "Account, orders tab",
    citations: cite(src, "order-history", "The customer sees every order of the last 12 months, newest first."),
    criteria: [{ code: "AC-1", text: "Orders are listed newest first.", tests: [] }],
  },
  {
    code: "REQ-NVC01", title: "Invoice by e-mail once the payment is confirmed", type: "behavior", reach: { modules: ["account"] },
    statement: "The invoice e-mail goes out when the payment is confirmed.",
    citations: cite(src, "invoice-e-mail", "The invoice goes by e-mail as soon as the payment is confirmed."),
    criteria: [{ code: "AC-1", text: "Confirming a payment sends the invoice e-mail.", tests: [] }],
  },
];
