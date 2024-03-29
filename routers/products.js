const express = require("express");
const router = new express.Router();
const db = require("../db/index");
const upload = require("../utiles/multer");

const formatProducts = (products, fullUrl) =>
  products.map((product) => ({
    id: product.product_id,
    shopId: product.shop_id,
    image: product.product_image,
    name: product.product_name,
    price: product.price,
    quantity: product.quantity,
    baseLink: fullUrl,
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  }));

router.post("/api/products", upload.single("image"), async (req, res) => {
  const fullUrl = `${req.protocol}://${req.get("host")}`;

  const { shop_id, product_name, price, quantity } = JSON.parse(
    req.body.document
  );
  const file = req.file;

  try {
    const data = await db.query(
      "INSERT INTO products (shop_id, product_name, product_image, price, quantity ) values ($1, $2, $3, $4, $5) returning *",
      [shop_id, product_name, file.filename, price, quantity]
    );
    const products = formatProducts(data.rows, fullUrl);

    console.log(products);

    res.status(200).json({
      status: "success",
      results: products.length,
      products: products,
    });
  } catch (err) {
    console.log(err);
  }
});

router.get("/api/:storeName/products", async (req, res) => {
  const fullUrl = `${req.protocol}://${req.get("host")}`;

  const page = parseInt(req.query.page);
  const limit = parseInt(req.query.limit);
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const results = {};

  console.log(req.params.storeName);
  try {
    const getStore = await db.query(
      "SELECT shop_id FROM shops WHERE shop_name = $1 ",
      [req.params.storeName]
    );
    console.log(getStore);
    const data = await db.query(
      "SELECT *, count(*) OVER( )  AS full_count FROM products   WHERE shop_id = $1  ORDER BY  product_id OFFSET $2 ROWS FETCH first $3 ROW ONLY",
      [getStore.rows[0].shop_id, startIndex, limit]
    );

    const fullCount = data.rows.length > 0 ? data.rows[0].full_count : 0;

    if (endIndex < fullCount) {
      results.next = {
        page: page + 1,
        limit: limit,
      };
    }

    const products = formatProducts(data.rows, fullUrl);

    res.status(200).json({
      status: "success",
      results: products.length,
      products: products,
    });
  } catch (err) {
    console.log(err);
  }
});

module.exports = router;
