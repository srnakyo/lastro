/** A fictional store brief: the source every demo requirement quotes. */
export const SHOP_BRIEF = `# Shop

## Cart

The cart keeps the items for 7 days, even after the customer signs out.

## Shipping

Free shipping above R$ 300 for the South and Southeast regions.

## Checkout

The checkout accepts PIX and card, and shows the total before confirming.

## Coupon

Only one coupon per order. A coupon never brings the total below the shipping cost.

## Product page

The product page shows the stock per size, and "last units" when there are 3 or fewer.

## Dark theme

Every screen has to work in the dark theme and on the phone.

## Order history

The customer sees every order of the last 12 months, newest first.

## Invoice e-mail

The invoice goes by e-mail as soon as the payment is confirmed.
`;

export const SHOP_CONFIG = {
  project: "shop-demo",
  approval: { spec: ["dev"], require_final_source: true },
  commands: {
    lint: { run: "bun run lint:sarif", report: { sarif: ".lastro/.out/lint.sarif" } },
    unit: { run: "bun test --reporter=junit --reporter-outfile=.lastro/.out/unit.xml", report: { junit: ".lastro/.out/unit.xml" } },
    e2e: { run: "bunx playwright test", report: { junit: ".lastro/.out/e2e.xml" } },
  },
  conditions: {
    desktop: { env: { VIEWPORT: "1440x900" }, note: "Chrome, 1440 px" },
    mobile: { env: { VIEWPORT: "390x844" }, note: "Pixel 7 width" },
    dark: { env: { THEME: "dark" }, note: "dark theme" },
  },
  types: {
    calculation: { required: ["data_source", "examples"], flow: ["unit"] },
    behavior: { required: ["where"], flow: ["unit", { run: "e2e", conditions: ["desktop", "mobile"] }] },
    ui: { required: ["where"], flow: [{ run: "e2e", conditions: ["desktop", "mobile", "dark"] }, { check: "preview", manual: true, by: "client" }] },
  },
  global_flow: ["lint"],
};
