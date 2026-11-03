// ==================== SUPABASE CONFIG ====================
const SUPABASE_URL = 'https://jtljkppvbkpledyifsmj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_WhLiv2NiRpkgM9wOr2LfOg_4YtaREOF';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==================== STATE ====================
let currentUser = null;
let userProfile = null;
let products = [];
let customers = [];
let bills = [];
let billItems = [];
let editingProductId = null;
let invoiceCounter = 1;

// ==================== AUTH ====================
function switchAuthTab(tab) {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  
  document.getElementById('auth-error').classList.add('hidden');
  document.getElementById('auth-success').classList.add('hidden');
  
  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    tabLogin.className = 'flex-1 py-3 rounded-lg font-semibold text-sm transition-all bg-gradient-to-r from-sky-500 to-violet-500 text-white';
    tabSignup.className = 'flex-1 py-3 rounded-lg font-semibold text-sm transition-all text-gray-400 hover:text-white';
  } else {
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
    tabSignup.className = 'flex-1 py-3 rounded-lg font-semibold text-sm transition-all bg-gradient-to-r from-sky-500 to-violet-500 text-white';
    tabLogin.className = 'flex-1 py-3 rounded-lg font-semibold text-sm transition-all text-gray-400 hover:text-white';
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById('signup-name').value.trim();
  const business = document.getElementById('signup-business').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  
  const errEl = document.getElementById('auth-error');
  const successEl = document.getElementById('auth-success');
  errEl.classList.add('hidden');
  successEl.classList.add('hidden');
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, business_name: business }
      }
    });
    
    if (error) throw error;
    
    // Create profile
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: name,
        business_name: business,
        email: email,
        invoice_prefix: 'INV',
        created_at: new Date().toISOString()
      });
      
      if (profileError) {
        console.warn('Profile create:', profileError);
        // Continue anyway - profile might be created by trigger later
      }
    }
    
    successEl.textContent = 'Account created! Please check your email or try logging in.';
    successEl.classList.remove('hidden');
    
    // Auto switch to login after 2s
    setTimeout(() => switchAuthTab('login'), 2000);
    
  } catch (err) {
    errEl.textContent = err.message || 'Signup failed';
    errEl.classList.remove('hidden');
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  
  const errEl = document.getElementById('auth-error');
  errEl.classList.add('hidden');
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    currentUser = data.user;
    await loadUserProfile();
    showApp();
    
  } catch (err) {
    errEl.textContent = err.message || 'Login failed';
    errEl.classList.remove('hidden');
  }
}

async function handleLogout() {
  await supabase.auth.signOut();
  currentUser = null;
  userProfile = null;
  document.getElementById('app').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
}

async function loadUserProfile() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .single();
  
  if (data) {
    userProfile = data;
  } else {
    // Create default profile if missing
    const meta = currentUser.user_metadata || {};
    userProfile = {
      id: currentUser.id,
      full_name: meta.full_name || 'User',
      business_name: meta.business_name || 'My Business',
      email: currentUser.email,
      invoice_prefix: 'INV'
    };
    await supabase.from('profiles').upsert(userProfile);
  }
  
  // Update UI
  document.getElementById('business-name-display').textContent = userProfile.business_name || 'My Business';
  document.getElementById('user-name-display').textContent = userProfile.full_name || 'User';
  document.getElementById('user-avatar').textContent = (userProfile.full_name || 'U').charAt(0).toUpperCase();
  
  // Fill settings
  document.getElementById('settings-business-name').value = userProfile.business_name || '';
  document.getElementById('settings-phone').value = userProfile.phone || '';
  document.getElementById('settings-email').value = userProfile.email || '';
  document.getElementById('settings-address').value = userProfile.address || '';
  document.getElementById('settings-gstin').value = userProfile.gstin || '';
  document.getElementById('settings-invoice-prefix').value = userProfile.invoice_prefix || 'INV';
  document.getElementById('settings-bank-name').value = userProfile.bank_name || '';
  document.getElementById('settings-account-number').value = userProfile.account_number || '';
  document.getElementById('settings-ifsc').value = userProfile.ifsc || '';
  document.getElementById('settings-upi').value = userProfile.upi || '';
}

function showApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  loadAllData();
  navigate('dashboard');
  
  // Entrance animation
  gsap.from('#sidebar', { x: -100, opacity: 0, duration: 0.6, ease: 'power3.out' });
  gsap.from('header', { y: -30, opacity: 0, duration: 0.5, delay: 0.2 });
}

// ==================== NAVIGATION ====================
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
  
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');
  
  const sideItem = document.querySelector(`.sidebar-item[data-page="${page}"]`);
  if (sideItem) sideItem.classList.add('active');
  
  const titles = {
    dashboard: ['Dashboard', 'Overview of your business'],
    'create-bill': ['Create Bill', 'Generate a new invoice'],
    products: ['Products', 'Manage your product catalog'],
    customers: ['Customers', 'Your customer list'],
    history: ['Bill History', 'All past invoices'],
    settings: ['Settings', 'Company profile & preferences']
  };
  
  document.getElementById('page-title').textContent = titles[page]?.[0] || page;
  document.getElementById('page-subtitle').textContent = titles[page]?.[1] || '';
  
  if (page === 'create-bill') {
    resetBillForm();
    addBillItem();
  }
  if (page === 'products') renderProducts();
  if (page === 'customers') renderCustomers();
  if (page === 'history') loadBills();
  if (page === 'dashboard') updateDashboard();
}

// ==================== DATA LOADING ====================
async function loadAllData() {
  await Promise.all([loadProducts(), loadCustomers(), loadBills()]);
  updateDashboard();
}

async function loadProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });
  
  products = data || [];
  renderProducts();
  updateProductDropdowns();
}

async function loadCustomers() {
  const { data } = await supabase
    .from('customers')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('name');
  
  customers = data || [];
  renderCustomers();
  updateCustomerDropdown();
}

async function loadBills() {
  const filter = document.getElementById('history-filter')?.value || 'all';
  let query = supabase
    .from('bills')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });
  
  if (filter !== 'all') query = query.eq('payment_status', filter);
  
  const { data } = await query;
  bills = data || [];
  renderBills();
  updateDashboard();
}

// ==================== PRODUCTS ====================
function renderProducts() {
  const tbody = document.getElementById('products-table');
  if (!products.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-12 text-center text-gray-500">No products yet. Add your first product!</td></tr>`;
    return;
  }
  
  tbody.innerHTML = products.map(p => `
    <tr class="table-row border-b border-white/5">
      <td class="px-6 py-4 font-medium">${escapeHtml(p.name)}</td>
      <td class="px-6 py-4">₹${Number(p.price).toFixed(2)}</td>
      <td class="px-6 py-4 text-gray-400">${p.unit || 'Pcs'}</td>
      <td class="px-6 py-4">
        <span class="text-xs px-2 py-1 rounded-full ${p.tax_type === 'none' ? 'bg-gray-500/20 text-gray-400' : 'bg-sky-500/20 text-sky-300'}">
          ${p.tax_type === 'gst' ? 'CGST+SGST' : p.tax_type === 'flat' ? 'Flat' : 'None'}
        </span>
      </td>
      <td class="px-6 py-4">${p.tax_rate || 0}%</td>
      <td class="px-6 py-4">
        <button onclick="editProduct('${p.id}')" class="text-sky-400 hover:text-sky-300 mr-3"><i class="fas fa-edit"></i></button>
        <button onclick="deleteProduct('${p.id}')" class="text-red-400 hover:text-red-300"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function openProductModal(product = null) {
  editingProductId = product ? product.id : null;
  document.getElementById('product-modal-title').textContent = product ? 'Edit Product' : 'Add Product';
  document.getElementById('product-name').value = product?.name || '';
  document.getElementById('product-price').value = product?.price || '';
  document.getElementById('product-unit').value = product?.unit || 'Pcs';
  document.getElementById('product-tax-type').value = product?.tax_type || 'none';
  document.getElementById('product-tax-rate').value = product?.tax_rate || 0;
  
  const modal = document.getElementById('product-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  gsap.from(modal.querySelector('div'), { scale: 0.9, opacity: 0, duration: 0.3 });
}

function closeProductModal() {
  document.getElementById('product-modal').classList.add('hidden');
  document.getElementById('product-modal').classList.remove('flex');
  editingProductId = null;
}

async function saveProduct() {
  const name = document.getElementById('product-name').value.trim();
  const price = parseFloat(document.getElementById('product-price').value);
  const unit = document.getElementById('product-unit').value;
  const tax_type = document.getElementById('product-tax-type').value;
  const tax_rate = parseFloat(document.getElementById('product-tax-rate').value) || 0;
  
  if (!name || isNaN(price)) {
    showToast('Please fill name and price', 'error');
    return;
  }
  
  const payload = {
    user_id: currentUser.id,
    name,
    price,
    unit,
    tax_type,
    tax_rate,
    updated_at: new Date().toISOString()
  };
  
  try {
    if (editingProductId) {
      const { error } = await supabase.from('products').update(payload).eq('id', editingProductId);
      if (error) throw error;
      showToast('Product updated!');
    } else {
      payload.created_at = new Date().toISOString();
      const { error } = await supabase.from('products').insert(payload);
      if (error) throw error;
      showToast('Product added!');
    }
    closeProductModal();
    await loadProducts();
  } catch (err) {
    showToast(err.message || 'Error saving product', 'error');
  }
}

function editProduct(id) {
  const product = products.find(p => p.id === id);
  if (product) openProductModal(product);
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) showToast(error.message, 'error');
  else {
    showToast('Product deleted');
    await loadProducts();
  }
}

// ==================== CUSTOMERS ====================
function renderCustomers() {
  const tbody = document.getElementById('customers-table');
  if (!customers.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-12 text-center text-gray-500">No customers yet.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = customers.map(c => `
    <tr class="table-row border-b border-white/5">
      <td class="px-6 py-4 font-medium">${escapeHtml(c.name)}</td>
      <td class="px-6 py-4 text-gray-400">${c.phone || '—'}</td>
      <td class="px-6 py-4">${c.bill_count || 0}</td>
      <td class="px-6 py-4">
        <button onclick="deleteCustomer('${c.id}')" class="text-red-400 hover:text-red-300"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function openCustomerModal() {
  document.getElementById('customer-name').value = '';
  document.getElementById('customer-phone').value = '';
  const modal = document.getElementById('customer-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeCustomerModal() {
  document.getElementById('customer-modal').classList.add('hidden');
  document.getElementById('customer-modal').classList.remove('flex');
}

async function saveCustomer() {
  const name = document.getElementById('customer-name').value.trim();
  const phone = document.getElementById('customer-phone').value.trim();
  
  if (!name) {
    showToast('Name is required', 'error');
    return;
  }
  
  try {
    const { error } = await supabase.from('customers').insert({
      user_id: currentUser.id,
      name,
      phone,
      created_at: new Date().toISOString()
    });
    if (error) throw error;
    showToast('Customer saved!');
    closeCustomerModal();
    await loadCustomers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteCustomer(id) {
  if (!confirm('Delete this customer?')) return;
  await supabase.from('customers').delete().eq('id', id);
  showToast('Customer deleted');
  await loadCustomers();
}

function updateCustomerDropdown() {
  const select = document.getElementById('saved-customers');
  if (!select) return;
  select.innerHTML = '<option value="">— Select saved customer —</option>' +
    customers.map(c => `<option value="${c.id}">${escapeHtml(c.name)} ${c.phone ? '('+c.phone+')' : ''}</option>`).join('');
}

function selectSavedCustomer() {
  const id = document.getElementById('saved-customers').value;
  const c = customers.find(x => x.id === id);
  if (c) {
    document.getElementById('bill-customer-name').value = c.name;
    document.getElementById('bill-customer-phone').value = c.phone || '';
  }
}

// ==================== BILL CREATION ====================
function resetBillForm() {
  billItems = [];
  document.getElementById('bill-customer-name').value = '';
  document.getElementById('bill-customer-phone').value = '';
  document.getElementById('bill-discount').value = 0;
  document.getElementById('bill-payment-status').value = 'pending';
  document.getElementById('bill-payment-mode').value = 'Cash';
  document.getElementById('bill-amount-paid').value = 0;
  document.getElementById('paid-amount-section').classList.add('hidden');
  document.getElementById('bill-items').innerHTML = '';
  calculateTotals();
}

function addBillItem() {
  const id = Date.now() + Math.random();
  billItems.push({ id, product_id: '', name: '', price: 0, qty: 1, unit: 'Pcs', tax_type: 'none', tax_rate: 0 });
  renderBillItems();
}

function renderBillItems() {
  const container = document.getElementById('bill-items');
  container.innerHTML = billItems.map((item, idx) => `
    <div class="glass rounded-xl p-4 flex flex-wrap gap-3 items-end">
      <div class="flex-1 min-w-[180px]">
        <label class="block text-xs text-gray-500 mb-1">Product</label>
        <select onchange="onProductSelect(${idx}, this.value)" class="input-field w-full px-3 py-2.5 rounded-lg text-sm">
          <option value="">Select or type below</option>
          ${products.map(p => `<option value="${p.id}" ${item.product_id === p.id ? 'selected' : ''}>${escapeHtml(p.name)} — ₹${p.price}</option>`).join('')}
        </select>
      </div>
      <div class="w-28">
        <label class="block text-xs text-gray-500 mb-1">Qty</label>
        <input type="number" value="${item.qty}" min="0.01" step="0.01" onchange="updateBillItem(${idx}, 'qty', this.value)" class="input-field w-full px-3 py-2.5 rounded-lg text-sm">
      </div>
      <div class="w-28">
        <label class="block text-xs text-gray-500 mb-1">Price</label>
        <input type="number" value="${item.price}" min="0" step="0.01" onchange="updateBillItem(${idx}, 'price', this.value)" class="input-field w-full px-3 py-2.5 rounded-lg text-sm">
      </div>
      <div class="w-20">
        <label class="block text-xs text-gray-500 mb-1">Unit</label>
        <input type="text" value="${item.unit}" onchange="updateBillItem(${idx}, 'unit', this.value)" class="input-field w-full px-3 py-2.5 rounded-lg text-sm">
      </div>
      <button onclick="removeBillItem(${idx})" class="text-red-400 hover:text-red-300 p-2.5">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `).join('');
  calculateTotals();
}

function onProductSelect(idx, productId) {
  const p = products.find(x => x.id === productId);
  if (p) {
    billItems[idx].product_id = p.id;
    billItems[idx].name = p.name;
    billItems[idx].price = p.price;
    billItems[idx].unit = p.unit || 'Pcs';
    billItems[idx].tax_type = p.tax_type || 'none';
    billItems[idx].tax_rate = p.tax_rate || 0;
    renderBillItems();
  }
}

function updateBillItem(idx, field, value) {
  if (field === 'qty' || field === 'price') billItems[idx][field] = parseFloat(value) || 0;
  else billItems[idx][field] = value;
  calculateTotals();
}

function removeBillItem(idx) {
  billItems.splice(idx, 1);
  renderBillItems();
}

function togglePaidAmount() {
  const status = document.getElementById('bill-payment-status').value;
  const section = document.getElementById('paid-amount-section');
  if (status === 'half') section.classList.remove('hidden');
  else section.classList.add('hidden');
  calculateTotals();
}

function calculateTotals() {
  let subtotal = 0;
  let tax = 0;
  
  billItems.forEach(item => {
    const line = (item.price || 0) * (item.qty || 0);
    subtotal += line;
    
    if (item.tax_type === 'flat' && item.tax_rate) {
      tax += line * (item.tax_rate / 100);
    } else if (item.tax_type === 'gst' && item.tax_rate) {
      // CGST + SGST = full rate (user enters total GST % or half? we treat as total)
      tax += line * (item.tax_rate / 100);
    }
  });
  
  const discount = parseFloat(document.getElementById('bill-discount').value) || 0;
  const total = Math.max(0, subtotal + tax - discount);
  
  document.getElementById('summary-subtotal').textContent = '₹' + subtotal.toFixed(2);
  document.getElementById('summary-tax').textContent = '₹' + tax.toFixed(2);
  document.getElementById('summary-discount').textContent = '- ₹' + discount.toFixed(2);
  document.getElementById('summary-total').textContent = '₹' + total.toFixed(2);
  
  const status = document.getElementById('bill-payment-status').value;
  const remainingEl = document.getElementById('summary-remaining');
  if (status === 'half') {
    const paid = parseFloat(document.getElementById('bill-amount-paid').value) || 0;
    remainingEl.classList.remove('hidden');
    remainingEl.classList.add('flex');
    document.getElementById('summary-remaining-amount').textContent = '₹' + Math.max(0, total - paid).toFixed(2);
  } else {
    remainingEl.classList.add('hidden');
  }
  
  return { subtotal, tax, discount, total };
}

async function saveBill() {
  const customerName = document.getElementById('bill-customer-name').value.trim();
  if (!customerName) {
    showToast('Customer name is required', 'error');
    return;
  }
  if (!billItems.length || billItems.every(i => !i.price && !i.name)) {
    showToast('Add at least one item', 'error');
    return;
  }
  
  const totals = calculateTotals();
  const paymentStatus = document.getElementById('bill-payment-status').value;
  const paymentMode = document.getElementById('bill-payment-mode').value;
  const amountPaid = paymentStatus === 'paid' ? totals.total : 
                     paymentStatus === 'half' ? (parseFloat(document.getElementById('bill-amount-paid').value) || 0) : 0;
  
  const prefix = userProfile?.invoice_prefix || 'INV';
  const invoiceNo = `${prefix}-${Date.now().toString().slice(-8)}`;
  
  // Save customer if new
  let customerId = null;
  const existing = customers.find(c => c.name.toLowerCase() === customerName.toLowerCase());
  if (existing) {
    customerId = existing.id;
  } else {
    const { data: newCust } = await supabase.from('customers').insert({
      user_id: currentUser.id,
      name: customerName,
      phone: document.getElementById('bill-customer-phone').value.trim(),
      created_at: new Date().toISOString()
    }).select().single();
    if (newCust) {
      customerId = newCust.id;
      await loadCustomers();
    }
  }
  
  const billData = {
    user_id: currentUser.id,
    invoice_no: invoiceNo,
    customer_id: customerId,
    customer_name: customerName,
    customer_phone: document.getElementById('bill-customer-phone').value.trim(),
    items: billItems,
    subtotal: totals.subtotal,
    tax: totals.tax,
    discount: totals.discount,
    total: totals.total,
    amount_paid: amountPaid,
    payment_status: paymentStatus,
    payment_mode: paymentMode,
    created_at: new Date().toISOString()
  };
  
  try {
    const { data, error } = await supabase.from('bills').insert(billData).select().single();
    if (error) throw error;
    
    showToast('Bill saved successfully!');
    await generatePDF(billData);
    await loadBills();
    navigate('history');
  } catch (err) {
    showToast(err.message || 'Error saving bill', 'error');
  }
}

// ==================== PDF GENERATION ====================
function generatePDF(bill) {
  const profile = userProfile || {};
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Watermark
  doc.setTextColor(230, 230, 230);
  doc.setFontSize(42);
  doc.setFont('helvetica', 'bold');
  const watermark = (profile.business_name || 'BILLIFY').toUpperCase();
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.12 }));
  // Diagonal watermark - carefully placed
  doc.text(watermark, pageWidth / 2, pageHeight / 2, {
    align: 'center',
    angle: 45
  });
  doc.restoreGraphicsState();
  
  // Header
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(profile.business_name || 'My Business', 15, 20);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  let y = 27;
  if (profile.address) { doc.text(profile.address, 15, y); y += 5; }
  if (profile.phone) { doc.text(`Phone: ${profile.phone}`, 15, y); y += 5; }
  if (profile.email) { doc.text(`Email: ${profile.email}`, 15, y); y += 5; }
  if (profile.gstin) { doc.text(`GSTIN: ${profile.gstin}`, 15, y); y += 5; }
  
  // Invoice title
  doc.setFontSize(16);
  doc.setTextColor(14, 165, 233);
  doc.setFont('helvetica', 'bold');
  doc.text('TAX INVOICE', pageWidth - 15, 20, { align: 'right' });
  
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice #: ${bill.invoice_no}`, pageWidth - 15, 28, { align: 'right' });
  doc.text(`Date: ${new Date(bill.created_at || Date.now()).toLocaleDateString('en-IN')}`, pageWidth - 15, 34, { align: 'right' });
  
  // Customer
  y = Math.max(y + 8, 45);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(15, y, pageWidth - 30, 22, 2, 2, 'F');
  
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text('Bill To:', 20, y + 7);
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(bill.customer_name, 20, y + 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80);
  if (bill.customer_phone) doc.text(`Phone: ${bill.customer_phone}`, 20, y + 18);
  
  // Items table
  y += 30;
  const colX = [15, 75, 100, 125, 155];
  
  doc.setFillColor(14, 165, 233);
  doc.rect(15, y, pageWidth - 30, 9, 'F');
  doc.setTextColor(255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Item', 18, y + 6);
  doc.text('Qty', 78, y + 6);
  doc.text('Rate', 103, y + 6);
  doc.text('Tax', 130, y + 6);
  doc.text('Amount', pageWidth - 20, y + 6, { align: 'right' });
  
  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30);
  
  (bill.items || []).forEach((item, i) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    const lineTotal = (item.price || 0) * (item.qty || 0);
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y - 4, pageWidth - 30, 9, 'F');
    }
    doc.setFontSize(9);
    doc.text((item.name || 'Item').substring(0, 30), 18, y + 2);
    doc.text(String(item.qty) + ' ' + (item.unit || ''), 78, y + 2);
    doc.text('₹' + Number(item.price).toFixed(2), 103, y + 2);
    doc.text((item.tax_rate || 0) + '%', 130, y + 2);
    doc.text('₹' + lineTotal.toFixed(2), pageWidth - 20, y + 2, { align: 'right' });
    y += 9;
  });
  
  // Totals
  y += 8;
  doc.setDrawColor(200);
  doc.line(120, y, pageWidth - 15, y);
  y += 7;
  
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text('Subtotal:', 130, y);
  doc.text('₹' + Number(bill.subtotal).toFixed(2), pageWidth - 20, y, { align: 'right' });
  y += 6;
  doc.text('Tax / GST:', 130, y);
  doc.text('₹' + Number(bill.tax).toFixed(2), pageWidth - 20, y, { align: 'right' });
  y += 6;
  if (bill.discount > 0) {
    doc.setTextColor(220, 38, 38);
    doc.text('Discount:', 130, y);
    doc.text('- ₹' + Number(bill.discount).toFixed(2), pageWidth - 20, y, { align: 'right' });
    y += 6;
  }
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Grand Total:', 130, y + 2);
  doc.setTextColor(14, 165, 233);
  doc.text('₹' + Number(bill.total).toFixed(2), pageWidth - 20, y + 2, { align: 'right' });
  
  // Payment status
  y += 14;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  const statusLabel = bill.payment_status === 'paid' ? 'Fully Paid' : bill.payment_status === 'half' ? 'Half Paid' : 'Pending';
  doc.text(`Payment Status: ${statusLabel} (${bill.payment_mode || 'Cash'})`, 15, y);
  if (bill.payment_status === 'half') {
    doc.text(`Paid: ₹${Number(bill.amount_paid).toFixed(2)} | Remaining: ₹${(bill.total - bill.amount_paid).toFixed(2)}`, 15, y + 5);
  }
  
  // Bank details
  if (profile.bank_name || profile.upi) {
    y += 14;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Bank Details:', 15, y);
    y += 4;
    if (profile.bank_name) { doc.text(`${profile.bank_name} | A/C: ${profile.account_number || ''} | IFSC: ${profile.ifsc || ''}`, 15, y); y += 4; }
    if (profile.upi) doc.text(`UPI: ${profile.upi}`, 15, y);
  }
  
  // Footer
  doc.setFontSize(10);
  doc.setTextColor(14, 165, 233);
  doc.setFont('helvetica', 'bold');
  doc.text('Thank you for purchasing, visit again!', pageWidth / 2, pageHeight - 15, { align: 'center' });
  
  doc.save(`${bill.invoice_no}.pdf`);
  showToast('PDF Downloaded!');
}

function previewBill() {
  // Simple preview using same data
  const totals = calculateTotals();
  if (!document.getElementById('bill-customer-name').value.trim()) {
    showToast('Enter customer name first', 'error');
    return;
  }
  showToast('Use Save & Generate PDF for full invoice');
}

// ==================== BILL HISTORY ====================
function renderBills() {
  const tbody = document.getElementById('history-table');
  if (!bills.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-12 text-center text-gray-500">No bills found.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = bills.map(b => {
    const statusColors = {
      pending: 'bg-amber-500/20 text-amber-300',
      half: 'bg-sky-500/20 text-sky-300',
      paid: 'bg-emerald-500/20 text-emerald-300'
    };
    const statusLabel = { pending: 'Pending', half: 'Half Paid', paid: 'Paid' };
    
    return `
      <tr class="table-row border-b border-white/5">
        <td class="px-6 py-4 font-mono text-sm">${b.invoice_no}</td>
        <td class="px-6 py-4">${escapeHtml(b.customer_name)}</td>
        <td class="px-6 py-4 text-gray-400 text-sm">${new Date(b.created_at).toLocaleDateString('en-IN')}</td>
        <td class="px-6 py-4 font-semibold">₹${Number(b.total).toFixed(2)}</td>
        <td class="px-6 py-4">
          <span class="text-xs px-2.5 py-1 rounded-full ${statusColors[b.payment_status] || ''}">${statusLabel[b.payment_status] || b.payment_status}</span>
        </td>
        <td class="px-6 py-4">
          <button onclick='reprintBill(${JSON.stringify(b).replace(/'/g, "&#39;")})' class="text-sky-400 hover:text-sky-300 mr-3" title="Download PDF">
            <i class="fas fa-file-pdf"></i>
          </button>
          <button onclick="deleteBill('${b.id}')" class="text-red-400 hover:text-red-300" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function reprintBill(bill) {
  generatePDF(bill);
}

async function deleteBill(id) {
  if (!confirm('Delete this bill permanently?')) return;
  await supabase.from('bills').delete().eq('id', id);
  showToast('Bill deleted');
  await loadBills();
}

// ==================== DASHBOARD ====================
function updateDashboard() {
  const today = new Date().toDateString();
  const todayBills = bills.filter(b => new Date(b.created_at).toDateString() === today);
  const todaySales = todayBills.reduce((s, b) => s + (b.total || 0), 0);
  const pending = bills.filter(b => b.payment_status !== 'paid').reduce((s, b) => s + ((b.total || 0) - (b.amount_paid || 0)), 0);
  
  document.getElementById('stat-today-sales').textContent = '₹' + todaySales.toLocaleString('en-IN');
  document.getElementById('stat-pending').textContent = '₹' + pending.toLocaleString('en-IN');
  document.getElementById('stat-total-bills').textContent = bills.length;
  document.getElementById('stat-products').textContent = products.length;
  
  // Recent bills
  const recent = document.getElementById('recent-bills');
  if (!bills.length) {
    recent.innerHTML = `<p class="text-gray-500 text-center py-8">No bills yet. Create your first bill!</p>`;
  } else {
    recent.innerHTML = bills.slice(0, 5).map(b => `
      <div class="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all">
        <div>
          <p class="font-medium">${escapeHtml(b.customer_name)}</p>
          <p class="text-xs text-gray-500">${b.invoice_no} • ${new Date(b.created_at).toLocaleDateString('en-IN')}</p>
        </div>
        <div class="text-right">
          <p class="font-bold">₹${Number(b.total).toFixed(0)}</p>
          <p class="text-xs ${b.payment_status === 'paid' ? 'text-emerald-400' : 'text-amber-400'}">${b.payment_status === 'paid' ? 'Paid' : 'Pending'}</p>
        </div>
      </div>
    `).join('');
  }
}

// ==================== SETTINGS ====================
async function saveSettings() {
  const updates = {
    business_name: document.getElementById('settings-business-name').value.trim(),
    phone: document.getElementById('settings-phone').value.trim(),
    email: document.getElementById('settings-email').value.trim(),
    address: document.getElementById('settings-address').value.trim(),
    gstin: document.getElementById('settings-gstin').value.trim(),
    invoice_prefix: document.getElementById('settings-invoice-prefix').value.trim() || 'INV',
    bank_name: document.getElementById('settings-bank-name').value.trim(),
    account_number: document.getElementById('settings-account-number').value.trim(),
    ifsc: document.getElementById('settings-ifsc').value.trim(),
    upi: document.getElementById('settings-upi').value.trim(),
    updated_at: new Date().toISOString()
  };
  
  try {
    const { error } = await supabase.from('profiles').update(updates).eq('id', currentUser.id);
    if (error) throw error;
    userProfile = { ...userProfile, ...updates };
    document.getElementById('business-name-display').textContent = updates.business_name;
    showToast('Settings saved!');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==================== HELPERS ====================
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  const icon = document.getElementById('toast-icon');
  const message = document.getElementById('toast-message');
  
  message.textContent = msg;
  icon.className = type === 'error' ? 'fas fa-exclamation-circle text-red-400 text-xl' : 'fas fa-check-circle text-emerald-400 text-xl';
  
  toast.classList.remove('hidden');
  gsap.fromTo(toast, { x: 100, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4 });
  
  setTimeout(() => {
    gsap.to(toast, { x: 100, opacity: 0, duration: 0.3, onComplete: () => toast.classList.add('hidden') });
  }, 3000);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function updateProductDropdowns() {
  // Already handled in renderBillItems
}

// ==================== INIT ====================
async function init() {
  // Check existing session
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
    await loadUserProfile();
    showApp();
  }
  
  // Auth state listener
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      currentUser = session.user;
      await loadUserProfile();
      showApp();
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      document.getElementById('app').classList.add('hidden');
      document.getElementById('auth-screen').classList.remove('hidden');
    }
  });
}

init();
