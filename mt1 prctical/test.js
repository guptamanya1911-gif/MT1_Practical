const assert = require('assert');
const app = require('./server');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}/api/products`;

async function request(method, path = '', body = undefined) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body !== undefined) {
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  const response = await fetch(`${BASE_URL}${path}`, options);
  const data = await response.json();
  return { status: response.status, data };
}

async function runTests() {
  const server = app.listen(PORT);
  const results = [];

  function record(name, passed, details) {
    results.push({ name, passed, details });
    console.log(`${passed ? '✅ PASS' : '❌ FAIL'} | ${name} -> ${details}`);
  }

  try {
    console.log('====================================================');
    console.log('   STARTING AUTOMATED API TEST SUITE (PORT 3000)    ');
    console.log('====================================================\n');

    {
      const res = await request('GET');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(Array.isArray(res.data), true);
      assert.strictEqual(res.data.length, 3);
      record('GET /api/products (Fetch all products)', true, `HTTP ${res.status} (${res.data.length} items returned)`);
    }

    {
      const newProduct = { name: 'USB-C Hub', price: 34.99, category: 'Electronics' };
      const res = await request('POST', '', newProduct);
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.id, 4);
      assert.strictEqual(res.data.name, 'USB-C Hub');
      assert.strictEqual(res.data.price, 34.99);
      assert.strictEqual(res.data.category, 'Electronics');
      record('POST /api/products (Create new product)', true, `HTTP ${res.status} (Created ID: ${res.data.id})`);
    }

    {
      const res = await request('GET', '/4');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.id, 4);
      assert.strictEqual(res.data.name, 'USB-C Hub');
      record('GET /api/products/:id (Fetch product by valid ID)', true, `HTTP ${res.status} (Found "${res.data.name}")`);
    }

    {
      const updatedData = { name: 'USB-C Multiport Hub', price: 39.99, category: 'Electronics' };
      const res = await request('PUT', '/4', updatedData);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.id, 4);
      assert.strictEqual(res.data.name, 'USB-C Multiport Hub');
      assert.strictEqual(res.data.price, 39.99);
      record('PUT /api/products/:id (Update existing product)', true, `HTTP ${res.status} (Updated name & price)`);
    }

    {
      const sameNameUpdate = { name: 'USB-C Multiport Hub', price: 42.00, category: 'Accessories' };
      const res = await request('PUT', '/4', sameNameUpdate);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.price, 42.00);
      assert.strictEqual(res.data.category, 'Accessories');
      record('PUT /api/products/:id (Update same name on self allowed)', true, `HTTP ${res.status} (No false 409 on self)`);
    }

    {
      const dupProduct = { name: 'Wireless Mouse', price: 19.99, category: 'Electronics' };
      const res = await request('POST', '', dupProduct);
      assert.strictEqual(res.status, 409);
      record('POST /api/products (Duplicate product name -> 409)', true, `HTTP ${res.status} (${res.data.error})`);
    }

    {
      const dupUpdate = { name: 'Mechanical Keyboard', price: 45.00, category: 'Electronics' };
      const res = await request('PUT', '/4', dupUpdate);
      assert.strictEqual(res.status, 409);
      record('PUT /api/products/:id (Duplicate name of another product -> 409)', true, `HTTP ${res.status} (${res.data.error})`);
    }

    {
      const missingName = await request('POST', '', { price: 10, category: 'Books' });
      assert.strictEqual(missingName.status, 400);

      const invalidPrice = await request('POST', '', { name: 'Book', price: -5, category: 'Books' });
      assert.strictEqual(invalidPrice.status, 400);

      const missingCategory = await request('PUT', '/1', { name: 'Wireless Mouse', price: 25.99 });
      assert.strictEqual(missingCategory.status, 400);

      record('POST & PUT Validation (Missing/Invalid fields -> 400)', true, 'HTTP 400 verified for missing name, negative price, missing category');
    }

    {
      const res = await request('GET', '?category=Electronics');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.length, 2);
      assert.strictEqual(res.data.every((p) => p.category === 'Electronics'), true);
      record('GET /api/products?category=Electronics (Category filtering)', true, `HTTP ${res.status} (${res.data.length} Electronics products returned)`);
    }

    {
      const res = await request('DELETE', '/4');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.product.id, 4);
      record('DELETE /api/products/:id (Delete product)', true, `HTTP ${res.status} (Deleted ID: ${res.data.product.id})`);
    }

    {
      const get404 = await request('GET', '/999');
      assert.strictEqual(get404.status, 404);

      const put404 = await request('PUT', '/999', { name: 'Ghost', price: 10, category: 'None' });
      assert.strictEqual(put404.status, 404);

      const del404 = await request('DELETE', '/999');
      assert.strictEqual(del404.status, 404);

      const nonNumeric404 = await request('GET', '/abc');
      assert.strictEqual(nonNumeric404.status, 404);

      record('GET, PUT, DELETE /api/products/:id (Non-existent/Invalid ID -> 404)', true, 'HTTP 404 verified for ID 999 and non-numeric ID');
    }

    console.log('\n====================================================');
    console.log(`   ALL ${results.length}/${results.length} TESTS PASSED SUCCESSFULLY!`);
    console.log('====================================================');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('❌ Test Suite Failed:', err);
  process.exit(1);
});
