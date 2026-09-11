(function(){
'use strict';

const STRIPE_URL = '#';
const FREE_LIMIT = 5;
const CURRENCY_SYM = {USD:'$',EUR:'€',GBP:'£',CAD:'C$',AUD:'A$',INR:'₹',JPY:'¥',CNY:'¥',BRL:'R$',MXN:'MX$',CHF:'CHF',NZD:'NZ$',SGD:'S$',SEK:'kr',NOK:'kr',DKK:'kr',PLN:'zł',AED:'AED'};

let invoices = [];
let settings = { fromName:'', fromEmail:'', fromPhone:'', fromAddress:'', fromLogo:'', nextNumber:1, defaultCurrency:'USD' };
let plan = { tier:'free' };
let editingId = null;
let draftItems = [];

const $ = id => document.getElementById(id);
const uid = () => 'inv_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);

function load(){
  try{ invoices = JSON.parse(localStorage.getItem('ip_invoices'))||[]; }catch(e){ invoices=[]; }
  try{ settings = Object.assign(settings, JSON.parse(localStorage.getItem('ip_settings'))); }catch(e){}
  try{ plan = Object.assign(plan, JSON.parse(localStorage.getItem('ip_plan'))); }catch(e){}
}
function saveInvoices(){ localStorage.setItem('ip_invoices', JSON.stringify(invoices)); }
function saveSettings(){ localStorage.setItem('ip_settings', JSON.stringify(settings)); }
function savePlan(){ localStorage.setItem('ip_plan', JSON.stringify(plan)); }

function fmt(currency, amount){
  const sym = CURRENCY_SYM[currency]||currency;
  try{ return new Intl.NumberFormat(navigator.language,{style:'currency',currency:currency,maximumFractionDigits:2}).format(amount); }
  catch(e){ return sym+amount.toFixed(2); }
}
function dueDate(inv){
  const d = new Date(inv.createdAt);
  d.setDate(d.getDate()+(inv.dueDays||14));
  return d.toLocaleDateString(navigator.language,{year:'numeric',month:'short',day:'numeric'});
}
function subtotal(inv){ return inv.items.reduce((s,i)=>s+(i.qty||0)*(i.rate||0),0); }
function calc(inv){
  const sub = subtotal(inv);
  const discAmt = sub*(inv.discount||0)/100;
  const taxable = sub-discAmt;
  const taxAmt = taxable*(inv.taxRate||0)/100;
  return {sub,discAmt,taxAmt,total:taxable+taxAmt};
}

function checkUpgrade(){
  const p = new URLSearchParams(location.search);
  if(p.get('upgrade')==='success'){
    plan.tier = 'pro';
    savePlan();
    history.replaceState(null,'',location.pathname);
    showModal('<h2>Welcome to Pro!</h2><p>Your account is now unlocked. Unlimited invoices, no watermark — enjoy InvoicePal.</p><button class="btn btn-primary" onclick="closeModal()">Start building invoices</button>');
  }
}

function isOverLimit(){ return plan.tier!=='pro' && invoices.length>=FREE_LIMIT; }

function renderPlanBadge(){
  const b = $('plan-badge');
  const u = $('btn-upgrade');
  if(plan.tier==='pro'){ b.textContent='Pro ✓'; b.classList.add('pro'); u.style.display='none'; }
  else{ b.textContent='Free plan'; b.classList.remove('pro'); u.style.display=''; }
}

function renderPlanHint(){
  const h = $('plan-hint');
  if(plan.tier==='pro'||invoices.length<FREE_LIMIT){ h.hidden=true; return; }
  const left = FREE_LIMIT-invoices.length;
  h.hidden=false;
  h.innerHTML = left===0
    ? `<strong>You've used all ${FREE_LIMIT} free invoices.</strong> Upgrade to Pro for unlimited invoices, no watermark, and more. <a href="${STRIPE_URL}" style="color:inherit;font-weight:700;text-decoration:underline">Upgrade now →</a>`
    : `You have <strong>${left}</strong> free invoice${left>1?'s':''} remaining. <a href="${STRIPE_URL}" style="color:inherit;text-decoration:underline">Upgrade for unlimited</a>.`;
}

window.openEditor = function(id){ openEditor(id); };

function renderList(){
  const list = $('invoice-list');
  const empty = $('empty-state');
  const view = $('list-view');
  const editor = $('editor-view');
  const backBtn = $('btn-view');
  const newBtn = $('btn-new');

  view.hidden = false;
  editor.hidden = true;
  backBtn.hidden = true;
  newBtn.hidden = false;

  renderPlanBadge();
  renderPlanHint();

  if(!invoices.length){
    list.innerHTML='';
    empty.hidden=false;
    return;
  }
  empty.hidden=true;
  const sorted = [...invoices].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  list.innerHTML = sorted.map(inv=>{
    const c = calc(inv);
    return `<div class="inv-row" data-id="${inv.id}">
      <div class="inv-num">${esc(inv.number)}</div>
      <div class="inv-client">${esc(inv.to?.name||'No client')}</div>
      <div class="inv-date">${new Date(inv.createdAt).toLocaleDateString()}</div>
      <div class="inv-total">${fmt(inv.currency,c.total)}</div>
      <div class="inv-actions">
        <span class="inv-status ${inv.status}">${inv.status}</span>
        <button onclick="openEditor('${inv.id}')" title="Edit">✏️</button>
        <button onclick="printInv('${inv.id}')" title="Download PDF">📥</button>
        <button onclick="duplicateInv('${inv.id}')" title="Duplicate">📋</button>
        <button class="del" onclick="deleteInv('${inv.id}')" title="Delete">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

function esc(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

function seedDemo(){
  const demo = {
    id: uid(),
    number: 'INV-0001',
    createdAt: new Date().toISOString(),
    from:{name:'Acme Studio',email:'hello@acme.co',phone:'+1 555 0100',address:'100 Market St, San Francisco, CA',logo:''},
    to:{name:'Client Co.',email:'billing@clientco.com',address:'200 Oak Ave, Austin, TX'},
    items:[
      {desc:'Website design & build',qty:1,rate:1200},
      {desc:'Hosting setup',qty:1,rate:60},
      {desc:'Revisions (2 rounds)',qty:2,rate:40}
    ],
    taxRate:0, discount:0, currency:'USD', dueDays:14,
    notes:'Payment due within 14 days. Thank you for your business!',
    status:'unpaid'
  };
  invoices = [demo];
  saveInvoices();
  showModal(`<h2>Here's a sample invoice</h2><p>Edit any field, add rows, then hit <strong>Download PDF</strong> to see the output. This is a live demo — everything works.</p><button class="btn btn-primary" onclick="closeModal()">Explore it</button>`);
  openEditor(demo.id);
}

function newInvoice(){
  if(isOverLimit()){
    showModal(`<h2>Free plan limit reached</h2><p>You've created ${FREE_LIMIT} invoices on the free plan. Upgrade to Pro for unlimited invoices, no watermark, and more features.</p><a class="btn btn-primary" href="${STRIPE_URL}">Upgrade to Pro — $9/mo</a>`);
    return;
  }
  const id = uid();
  const inv = {
    id,
    number: 'INV-'+String(settings.nextNumber).padStart(4,'0'),
    createdAt: new Date().toISOString(),
    from:{name:settings.fromName,email:settings.fromEmail,phone:settings.fromPhone,address:settings.fromAddress,logo:settings.fromLogo},
    to:{name:'',email:'',address:''},
    items:[{desc:'',qty:1,rate:0}],
    taxRate:0, discount:0, currency:settings.defaultCurrency, dueDays:14, notes:'Payment due within 14 days.', status:'unpaid'
  };
  settings.nextNumber++;
  saveSettings();
  invoices.unshift(inv);
  saveInvoices();
  openEditor(id);
}

function openEditor(id){
  const inv = invoices.find(i=>i.id===id);
  if(!inv) return;
  editingId = id;
  draftItems = inv.items.map(i=>({...i}));

  $('list-view').hidden = true;
  $('editor-view').hidden = false;
  $('btn-view').hidden = false;
  $('btn-new').hidden = true;
  $('btn-delete').hidden = false;

  $('f-from-name').value = inv.from?.name||'';
  $('f-from-email').value = inv.from?.email||'';
  $('f-from-phone').value = inv.from?.phone||'';
  $('f-from-logo').value = inv.from?.logo||'';
  $('f-from-address').value = inv.from?.address||'';
  $('f-to-name').value = inv.to?.name||'';
  $('f-to-email').value = inv.to?.email||'';
  $('f-to-address').value = inv.to?.address||'';
  $('f-currency').value = inv.currency||'USD';
  $('f-tax').value = inv.taxRate||0;
  $('f-discount').value = inv.discount||0;
  $('f-due').value = inv.dueDays||14;
  $('f-notes').value = inv.notes||'';
  $('f-status').value = inv.status||'unpaid';

  renderItems();
  updateSummary();
}

function renderItems(){
  const el = $('items-table');
  el.innerHTML = `<table style="width:100%;border-collapse:collapse"><thead><tr>
    <th style="text-align:left;padding:0 .625rem .5rem;font-size:.75rem;color:#9ca3af;text-transform:uppercase;letter-spacing:.04em">Description</th>
    <th style="width:90px;text-align:right;padding:0 .625rem .5rem;font-size:.75rem;color:#9ca3af;text-transform:uppercase;letter-spacing:.04em">Qty</th>
    <th style="width:110px;text-align:right;padding:0 .625rem .5rem;font-size:.75rem;color:#9ca3af;text-transform:uppercase;letter-spacing:.04em">Rate</th>
    <th style="width:110px;text-align:right;padding:0 .625rem .5rem;font-size:.75rem;color:#9ca3af;text-transform:uppercase;letter-spacing:.04em">Amount</th>
    <th style="width:30px"></th>
  </tr></thead><tbody>${draftItems.map((item,i)=>`<tr>
    <td style="padding:.375rem .625rem;border-bottom:1px solid #f3f4f6"><input value="${esc(item.desc)}" onchange="updItem(${i},'desc',this.value)" placeholder="Service or product…"></td>
    <td style="padding:.375rem .625rem;border-bottom:1px solid #f3f4f6"><input type="number" min="0" step="0.01" value="${item.qty}" onchange="updItem(${i},'qty',this.value)" style="text-align:right"></td>
    <td style="padding:.375rem .625rem;border-bottom:1px solid #f3f4f6"><input type="number" min="0" step="0.01" value="${item.rate}" onchange="updItem(${i},'rate',this.value)" style="text-align:right"></td>
    <td style="padding:.375rem .625rem;border-bottom:1px solid #f3f4f6"><span style="font-weight:600;font-size:.875rem;color:#374151">${fmt($('f-currency').value,(item.qty||0)*(item.rate||0))}</span></td>
    <td style="padding:.375rem .25rem;border-bottom:1px solid #f3f4f6;text-align:center"><button class="del-row" onclick="rmItem(${i})" title="Remove">✕</button></td>
  </tr>`).join('')}</tbody></table>`;
}

window.updItem = function(i,key,val){
  if(key==='desc') draftItems[i][key]=val;
  else draftItems[i][key]=parseFloat(val)||0;
  renderItems();
  updateSummary();
};

window.rmItem = function(i){
  draftItems.splice(i,1);
  if(!draftItems.length) draftItems.push({desc:'',qty:1,rate:0});
  renderItems();
  updateSummary();
};

$('btn-add-item').onclick = function(){
  draftItems.push({desc:'',qty:1,rate:0});
  renderItems();
  window.scrollTo({top:document.querySelector('.items-table').offsetTop-100,behavior:'smooth'});
};

function readForm(){
  return {
    from:{ name:$('f-from-name').value.trim(), email:$('f-from-email').value.trim(), phone:$('f-from-phone').value.trim(), address:$('f-from-address').value.trim(), logo:$('f-from-logo').value.trim() },
    to:{ name:$('f-to-name').value.trim(), email:$('f-to-email').value.trim(), address:$('f-to-address').value.trim() },
    items: draftItems.filter(i=>i.desc||i.rate),
    taxRate: parseFloat($('f-tax').value)||0,
    discount: parseFloat($('f-discount').value)||0,
    currency: $('f-currency').value,
    dueDays: parseInt($('f-due').value)||14,
    notes: $('f-notes').value.trim(),
    status: $('f-status').value
  };
}

function updateSummary(){
  const form = readForm();
  const inv = Object.assign({items:form.items}, form);
  const c = calc(inv);
  $('s-number').textContent = editingId?invoices.find(i=>i.id===editingId)?.number||'INV-0000':'INV-0000';
  $('s-subtotal').textContent = fmt(form.currency, c.sub);
  const dRow = $('s-discount-row');
  if(form.discount>0){ dRow.hidden=false; $('s-discount').textContent='-'+fmt(form.currency,c.discAmt); }
  else dRow.hidden=true;
  const tRow = $('s-tax-row');
  if(form.taxRate>0){ tRow.hidden=false; $('s-tax').textContent='+'+fmt(form.currency,c.taxAmt); }
  else tRow.hidden=true;
  $('s-total').textContent = fmt(form.currency, c.total);
}

function saveInvoice(){
  const inv = invoices.find(i=>i.id===editingId);
  if(!inv) return;
  const form = readForm();
  Object.assign(inv, form);
  // persist business profile to settings for next invoice
  settings.fromName = form.from.name;
  settings.fromEmail = form.from.email;
  settings.fromPhone = form.from.phone;
  settings.fromAddress = form.from.address;
  settings.fromLogo = form.from.logo;
  saveSettings();
  saveInvoices();
  showModal('<h2>Invoice saved</h2><button class="btn btn-primary" onclick="closeModal()">OK</button>');
  renderList();
}

window.deleteInv = function(id){
  if(!confirm('Delete this invoice? This cannot be undone.')) return;
  invoices = invoices.filter(i=>i.id!==id);
  saveInvoices();
  renderList();
};

window.duplicateInv = function(id){
  if(isOverLimit()){
    showModal(`<h2>Free plan limit reached</h2><p>Upgrade to Pro for unlimited invoices.</p><a class="btn btn-primary" href="${STRIPE_URL}">Upgrade — $9/mo</a>`);
    return;
  }
  const src = invoices.find(i=>i.id===id);
  if(!src) return;
  const dup = JSON.parse(JSON.stringify(src));
  dup.id = uid();
  dup.number = 'INV-'+String(settings.nextNumber).padStart(4,'0');
  dup.createdAt = new Date().toISOString();
  dup.status = 'draft';
  settings.nextNumber++;
  saveSettings();
  invoices.unshift(dup);
  saveInvoices();
  renderList();
};

function renderPrintHTML(inv){
  const c = calc(inv);
  const showWatermark = plan.tier!=='pro';
  const invDate = new Date(inv.createdAt).toLocaleDateString(navigator.language,{year:'numeric',month:'long',day:'numeric'});
  const due = dueDate(inv);
  const logoHTML = inv.from?.logo ? `<img src="${esc(inv.from.logo)}" style="width:48px;height:48px;object-fit:contain;border-radius:8px" alt="Logo">` : `<div class="pi-logo">I</div>`;

  return `<div class="pi">
    ${showWatermark?'<div class="watermark">INVOICEPAL FREE PLAN</div>':''}
    <div class="pi-head">
      <div style="display:flex;align-items:center;gap:.75rem">
        ${logoHTML}
        <div>
          <div class="pi-label">Invoice</div>
          <div class="pi-num">${esc(inv.number)}</div>
        </div>
      </div>
      <div style="text-align:right;font-size:12px;color:#6b7280">
        <div><strong>Date:</strong> ${invDate}</div>
        <div><strong>Due:</strong> ${due}</div>
      </div>
    </div>
    <div class="pi-from-to">
      <div class="pi-section">
        <h3>From</h3>
        <p><strong>${esc(inv.from?.name||'')}</strong></p>
        ${inv.from?.address?`<p>${esc(inv.from.address)}</p>`:''}
        ${inv.from?.email?`<p>${esc(inv.from.email)}</p>`:''}
        ${inv.from?.phone?`<p>${esc(inv.from.phone)}</p>`:''}
      </div>
      <div class="pi-section">
        <h3>Bill to</h3>
        <p><strong>${esc(inv.to?.name||'')}</strong></p>
        ${inv.to?.address?`<p>${esc(inv.to.address)}</p>`:''}
        ${inv.to?.email?`<p>${esc(inv.to.email)}</p>`:''}
      </div>
    </div>
    <hr class="pi-divider">
    <table class="pi-table">
      <thead><tr><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${(inv.items||[]).map(i=>`<tr><td>${esc(i.desc||'')}</td><td style="text-align:right">${i.qty||0}</td><td style="text-align:right">${fmt(inv.currency,i.rate||0)}</td><td style="text-align:right">${fmt(inv.currency,(i.qty||0)*(i.rate||0))}</td></tr>`).join('')}</tbody>
    </table>
    <div class="pi-totals">
      <table>
        <tr><td>Subtotal</td><td>${fmt(inv.currency,c.sub)}</td></tr>
        ${c.discAmt>0?`<tr><td>Discount</td><td>-${fmt(inv.currency,c.discAmt)}</td></tr>`:''}
        ${c.taxAmt>0?`<tr><td>Tax (${inv.taxRate}%)</td><td>+${fmt(inv.currency,c.taxAmt)}</td></tr>`:''}
        <tr class="pi-grand"><td>Total due</td><td>${fmt(inv.currency,c.total)}</td></tr>
      </table>
    </div>
    <div style="clear:both"></div>
    ${inv.notes?`<div class="pi-notes">${esc(inv.notes)}</div>`:''}
    ${showWatermark?`<div class="pi-free-badge">Created with InvoicePal — nyiringangomike-ops.github.io/invoicepal</div>`:''}
  </div>`;
}

window.printInv = function(id){
  const inv = invoices.find(i=>i.id===id);
  if(!inv) return;
  if(typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF === 'function'){
    try{ buildPDF(inv); return; }catch(e){ console.error(e); }
  }
  $('print-area').innerHTML = renderPrintHTML(inv);
  setTimeout(()=>window.print(), 100);
};

function buildPDF(inv){
  const { jsPDF } = window.jspdf;
  const GStateCls = window.jspdf.GState || null;
  const doc = new jsPDF({unit:'pt', format:'a4'});
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  const c = calc(inv);
  const showWm = plan.tier!=='pro';
  const invDate = new Date(inv.createdAt).toLocaleDateString(navigator.language,{year:'numeric',month:'long',day:'numeric'});
  const due = dueDate(inv);

  doc.setFillColor(79,70,229);
  doc.rect(0,0,W,8,'F');

  if(showWm){
    if(GStateCls){
      doc.setGState(new GStateCls({opacity:0.10}));
    }else{
      doc.setFillColor(79,70,229); doc.setTextColor(79,70,229);
    }
    doc.setFontSize(46);
    doc.setFont('helvetica','bold');
    doc.setTextColor(79,70,229);
    doc.text('INVOICEPAL FREE PLAN', W/2, H/2, {angle:35, align:'center'});
    if(GStateCls) doc.setGState(new GStateCls({opacity:1}));
  }

  let y = 52;

  doc.setFillColor(79,70,229);
  doc.roundedRect(M, y, 42, 42, 7, 7, 'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(21);
  doc.setFont('helvetica','bold');
  doc.text('I', M+14, y+28);

  doc.setTextColor(17,24,39);
  doc.setFontSize(17);
  doc.text('INVOICE', M+56, y+18);
  doc.setFont('helvetica','normal');
  doc.setFontSize(10);
  doc.setTextColor(107,114,128);
  doc.text(inv.number||'', M+56, y+32);

  doc.setTextColor(55,65,81);
  doc.setFont('helvetica','bold');
  doc.setFontSize(10);
  doc.text('Date:', W-M, y+14, {align:'right'});
  doc.text('Due:', W-M, y+28, {align:'right'});
  doc.setFont('helvetica','normal');
  doc.setTextColor(107,114,128);
  const dateLabel = invDate.split(',').join('');
  const dueLabel = due.split(',').join('');
  doc.text(dateLabel, W-M-64, y+14, {align:'right'});
  doc.text(dueLabel, W-M-64, y+28, {align:'right'});

  y += 84;
  doc.setFontSize(9);
  doc.setFont('helvetica','bold');
  doc.setTextColor(156,163,175);
  doc.text('FROM', M, y);
  doc.text('BILL TO', W/2, y);

  doc.setFontSize(12);
  doc.setFont('helvetica','bold');
  doc.setTextColor(17,24,39);
  doc.text(inv.from?.name||'Your business', M, y+18);
  doc.text(inv.to?.name||'Client', W/2, y+18);

  doc.setFontSize(10);
  doc.setFont('helvetica','normal');
  doc.setTextColor(55,65,81);
  let fy = y+33;
  if(inv.from?.address){ doc.text(inv.from.address, M, fy); fy+=14; }
  if(inv.from?.email){ doc.text(inv.from.email, M, fy); fy+=14; }
  if(inv.from?.phone){ doc.text(inv.from.phone, M, fy); }

  let ty = y+33;
  if(inv.to?.address){ doc.text(inv.to.address, W/2, ty); ty+=14; }
  if(inv.to?.email){ doc.text(inv.to.email, W/2, ty); }

  const tableY = Math.max(fy, ty) + 24;

  const rows = (inv.items||[]).map(i=>[
    i.desc||'',
    String(i.qty||0),
    fmt(inv.currency, i.rate||0),
    fmt(inv.currency, (i.qty||0)*(i.rate||0))
  ]);
  if(!rows.length) rows.push(['', '1', fmt(inv.currency,0), fmt(inv.currency,0)]);

  doc.autoTable({
    startY: tableY,
    head:[['Description','Qty','Rate','Amount']],
    body: rows,
    theme:'grid',
    margin:{left:M, right:M},
    headStyles:{fillColor:[79,70,229], textColor:255, fontStyle:'bold', halign:'left'},
    styles:{fontSize:10, cellPadding:7, textColor:[55,65,81], lineColor:[229,231,235], lineWidth:0.5},
    alternateRowStyles:{fillColor:[245,246,250]},
    columnStyles:{
      0:{cellWidth:200},
      1:{halign:'right', cellWidth:60},
      2:{halign:'right', cellWidth:90},
      3:{halign:'right', cellWidth:90}
    }
  });

  let ty2 = doc.lastAutoTable.finalY + 20;
  const valX = W - M;
  const labelX = M;
  const line = (label, value, big) => {
    doc.setFontSize(big?12:10);
    doc.setFont('helvetica', big?'bold':'normal');
    doc.setTextColor(big?17:55, big?24:65, big?39:81);
    doc.text(label, labelX, ty2);
    doc.text(value, valX, ty2, {align:'right'});
    ty2 += big?22:16;
  };
  line('Subtotal', fmt(inv.currency,c.sub));
  if(c.discAmt>0) line('Discount', '-'+fmt(inv.currency,c.discAmt));
  if(c.taxAmt>0) line(inv.taxRate+'% Tax', '+'+fmt(inv.currency,c.taxAmt));

  ty2 += 4;
  doc.setDrawColor(17,24,39);
  doc.setLineWidth(1.4);
  doc.line(M, ty2-8, W-M, ty2-8);
  line('Total due', fmt(inv.currency, c.total), true);

  if(inv.notes){
    let ny = Math.min(ty2+24, H-80);
    doc.setDrawColor(229,231,235);
    doc.setLineWidth(0.7);
    doc.line(M, ny-10, W-M, ny-10);
    doc.setFontSize(9);
    doc.setFont('helvetica','bold');
    doc.setTextColor(156,163,175);
    doc.text('NOTES', M, ny);
    doc.setFont('helvetica','normal');
    doc.setTextColor(107,114,128);
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(inv.notes, W-2*M), M, ny+16);
  }

  if(showWm){
    doc.setFontSize(9);
    doc.setFont('helvetica','italic');
    doc.setTextColor(156,163,175);
    doc.text('Created with InvoicePal', W/2, H-24, {align:'center'});
  }

  doc.save((inv.number||'invoice')+'.pdf');
}

$('btn-new').onclick = newInvoice;
$('btn-new-empty').onclick = newInvoice;
$('btn-save').onclick = saveInvoice;
$('btn-view').onclick = renderList;
$('btn-delete').onclick = function(){
  if(editingId && confirm('Delete this invoice?')) window.deleteInv(editingId);
};

$('f-currency').onchange = function(){
  renderItems(); updateSummary();
};
['f-tax','f-discount'].forEach(function(id){ $(id).oninput = updateSummary; });

$('btn-upgrade').onclick = function(e){
  e.preventDefault();
  if(STRIPE_URL==='#'){
    showModal(`<h2>Upgrade to Pro</h2><p>To set up payments, create a Stripe Payment Link at <a href="https://dashboard.stripe.com/payment-links" target="_blank">dashboard.stripe.com/payment-links</a> with a success redirect URL of <code>your-domain.com/app.html?upgrade=success</code>, then paste the link into the STRIPE_URL constant in <strong>js/app.js</strong>.</p><p>During checkout, collect $9/month recurring. The user will be automatically unlocked on return.</p>`);
    return;
  }
  location.href = STRIPE_URL;
};

$('btn-settings').onclick = showSettings;

function showSettings(){
  const html = `<h2>Settings</h2>
    <div class="field"><label>Your business name</label><input id="m-name" value="${esc(settings.fromName)}"></div>
    <div class="field"><label>Email</label><input id="m-email" value="${esc(settings.fromEmail)}"></div>
    <div class="field"><label>Phone</label><input id="m-phone" value="${esc(settings.fromPhone)}"></div>
    <div class="field"><label>Address</label><input id="m-address" value="${esc(settings.fromAddress)}"></div>
    <div class="field"><label>Default currency</label><select id="m-currency">${Object.keys(CURRENCY_SYM).map(c=>`<option value="${c}" ${settings.defaultCurrency===c?'selected':''}>${c}</option>`).join('')}</select></div>
    <div class="field"><label>Next invoice number</label><input id="m-next" type="number" min="1" value="${settings.nextNumber}"></div>
    <hr class="pi-divider" style="margin:1.25rem 0">
    <h3 style="font-size:1rem;margin-bottom:.75rem">Data</h3>
    <div style="display:flex;gap:.625rem;flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm" onclick="exportData()">Export backup (JSON)</button>
      <label class="btn btn-ghost btn-sm" style="margin:0">Import backup<input type="file" accept=".json" style="display:none" onchange="importData(event)"></label>
      <button class="btn btn-danger btn-sm" onclick="if(confirm('Clear ALL invoices and settings? This is irreversible.')){localStorage.clear();location.reload();}">Clear all data</button>
    </div>
    <div style="margin-top:1.25rem">
      <p style="font-size:.8125rem;color:#6b7280">Plan: <strong>${plan.tier==='pro'?'Pro ✓':'Free'}</strong>${plan.tier==='free'?` — ${invoices.length}/${FREE_LIMIT} invoices used`:''}</p>
    </div>`;
  showModal(html);
  $('m-name').oninput = ()=>{ settings.fromName=$('m-name').value; saveSettings(); };
  $('m-email').oninput = ()=>{ settings.fromEmail=$('m-email').value; saveSettings(); };
  $('m-phone').oninput = ()=>{ settings.fromPhone=$('m-phone').value; saveSettings(); };
  $('m-address').oninput = ()=>{ settings.fromAddress=$('m-address').value; saveSettings(); };
  $('m-currency').onchange = ()=>{ settings.defaultCurrency=$('m-currency').value; saveSettings(); };
  $('m-next').oninput = ()=>{ settings.nextNumber=parseInt($('m-next').value)||1; saveSettings(); };
}

window.exportData = function(){
  const data = JSON.stringify({invoices,settings,plan}, null, 2);
  const blob = new Blob([data],{type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'invoicepal-backup-'+new Date().toISOString().slice(0,10)+'.json';
  a.click();
  URL.revokeObjectURL(a.href);
};

window.importData = function(e){
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(ev){
    try{
      const data = JSON.parse(ev.target.result);
      if(data.invoices) invoices = data.invoices;
      if(data.settings) settings = Object.assign(settings, data.settings);
      if(data.plan) plan = Object.assign(plan, data.plan);
      saveInvoices(); saveSettings(); savePlan();
      closeModal();
      renderList();
    }catch(err){ alert('Invalid file.'); }
  };
  reader.readAsText(file);
};

function showModal(html){
  $('modal-content').innerHTML = html;
  $('modal').hidden = false;
}
window.closeModal = function(){ $('modal').hidden = true; };
$('modal').onclick = function(e){ if(e.target===this) closeModal(); };
$('modal-close').onclick = closeModal;

// sync from fields back to settings on change
['f-from-name','f-from-email','f-from-phone','f-from-address','f-from-logo'].forEach(function(id){
  const key = id.replace('f-from-','from').replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
  $(id).addEventListener('input', function(){ settings[key]=this.value; });
});

// init
load();
if(new URLSearchParams(location.search).get('demo')==='1'){
  seedDemo();
  renderList();
  return;
}
checkUpgrade();
renderPlanBadge();
if(location.search.indexOf('invoice=')>-1){
  const p = new URLSearchParams(location.search);
  const id = p.get('invoice');
  const inv = invoices.find(i=>i.id===id);
  if(inv) openEditor(id);
  else renderList();
} else {
  renderList();
}

})();
