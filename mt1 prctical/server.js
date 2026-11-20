const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

const products = [
  { id: 1, name: 'Wireless Mouse', price: 25.99, category: 'Electronics' },
  { id: 2, name: 'Mechanical Keyboard', price: 79.99, category: 'Electronics' },
  { id: 3, name: 'Coffee Mug', price: 12.50, category: 'Kitchen' }
];

let nextId = 4;

function validateProductData(body) {
  if (!body || typeof body !== 'object') {
    return 'Request body is required.';
  }

  const { name, price, category } = body;

  if (typeof name !== 'string' || name.trim() === '') {
    return 'Valid product "name" (non-empty string) is required.';
  }

  if (typeof price !== 'number' || Number.isNaN(price) || price <= 0) {
    return 'Valid product "price" (positive number) is required.';
  }

  if (typeof category !== 'string' || category.trim() === '') {
    return 'Valid product "category" (non-empty string) is required.';
  }

  return null;
}

app.post('/api/products', (req, res) => {
  const validationError = validateProductData(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const trimmedName = req.body.name.trim();
  const trimmedCategory = req.body.category.trim();
  const price = req.body.price;

  const isDuplicate = products.some(
    (product) => product.name.toLowerCase() === trimmedName.toLowerCase()
  );

  if (isDuplicate) {
    return res.status(409).json({
      error: `Product with name "${trimmedName}" already exists.`
    });
  }

  const newProduct = {
    id: nextId++,
    name: trimmedName,
    price,
    category: trimmedCategory
  };

  products.push(newProduct);
  return res.status(201).json(newProduct);
});

app.get('/api/products', (req, res) => {
  const { category } = req.query;

  if (category !== undefined) {
    const filteredProducts = products.filter(
      (product) => product.category.toLowerCase() === category.trim().toLowerCase()
    );
    return res.status(200).json(filteredProducts);
  }

  return res.status(200).json(products);
});

app.get('/api/products/:id', (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  const product = products.find((p) => p.id === id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  return res.status(200).json(product);
});

app.put('/api/products/:id', (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  const productIndex = products.findIndex((p) => p.id === id);
  if (productIndex === -1) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  const validationError = validateProductData(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const trimmedName = req.body.name.trim();
  const trimmedCategory = req.body.category.trim();
  const price = req.body.price;

  const isDuplicate = products.some(
    (p) => p.id !== id && p.name.toLowerCase() === trimmedName.toLowerCase()
  );

  if (isDuplicate) {
    return res.status(409).json({
      error: `Product with name "${trimmedName}" already exists.`
    });
  }

  const updatedProduct = {
    id,
    name: trimmedName,
    price,
    category: trimmedCategory
  };

  products[productIndex] = updatedProduct;
  return res.status(200).json(updatedProduct);
});

app.delete('/api/products/:id', (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  const productIndex = products.findIndex((p) => p.id === id);
  if (productIndex === -1) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  const [deletedProduct] = products.splice(productIndex, 1);
  return res.status(200).json({
    message: 'Product deleted successfully.',
    product: deletedProduct
  });
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON payload.' });
  }
  next(err);
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;
