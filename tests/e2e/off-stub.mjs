// A stand-in for Open Food Facts so tests are repeatable (the real one rate-limits searches).
// Start: node tests/e2e/off-stub.mjs 4010   then run the app with OFF_BASE_URL=http://localhost:4010
import http from "node:http";

export const PRODUCTS = {
  "5000000000012": {
    code: "5000000000012",
    product_name: "Greek Style Yogurt",
    brands: "Testbrand",
    quantity: "500 g",
    serving_quantity: 150,
    serving_size: "1 pot (150 g)",
    nutriments: { "energy-kcal_100g": 60, proteins_100g: 10, carbohydrates_100g: 4, fat_100g: 0.5 },
  },
  "5000000000036": {
    code: "5000000000036",
    product_name: "Busy Day Oat Bar",
    brands: ["xx:oatco"],
    quantity: "45 g",
    serving_quantity: 45,
    serving_size: "1 bar (45 g)",
    nutriments: { "energy-kcal_100g": 400, proteins_100g: 10, carbohydrates_100g: 60, fat_100g: 12 },
  },
  "5000000000029": {
    code: "5000000000029",
    product_name: "Chocolate Protein Bar",
    brands: "Barbrand",
    quantity: "60 g",
    serving_quantity: 60,
    serving_size: "1 bar (60 g)",
    nutriments: { "energy-kcal_100g": 350, proteins_100g: 30, carbohydrates_100g: 35, fat_100g: 9 },
  },
};

const port = Number(process.argv[2] || 4010);
http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    const json = (code, body) => {
      res.writeHead(code, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (url.pathname === "/cgi/search.pl") {
      const q = (url.searchParams.get("search_terms") || "").toLowerCase();
      if (q.includes("busy")) {
        res.writeHead(503, { "Content-Type": "text/html" });
        return res.end("<html>Page temporarily unavailable</html>");
      }
      const products = Object.values(PRODUCTS).filter((p) => `${p.product_name} ${p.brands}`.toLowerCase().includes(q.split(" ")[0]));
      return json(200, { count: products.length, products });
    }
    if (url.pathname === "/search") {
      const q = (url.searchParams.get("q") || "").toLowerCase().split(" ")[0];
      const hits = Object.values(PRODUCTS).filter((p) => p.product_name.toLowerCase().includes(q));
      return json(200, { hits, count: hits.length });
    }
    const m = url.pathname.match(/^\/api\/v2\/product\/(\d+)$/);
    if (m) return PRODUCTS[m[1]] ? json(200, { status: 1, product: PRODUCTS[m[1]] }) : json(404, { status: 0, status_verbose: "product not found" });
    json(404, {});
  })
  .listen(port, () => console.log(`OFF stub on ${port}`));
