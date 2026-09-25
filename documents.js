/* ===== Wanx AI — Document Generator (internal tool) ===== */

(function () {
  'use strict';

  /* ---------------------------------------------------------------
     PASSCODE GATE
     Passcode is never stored in plaintext here — only its SHA-256
     hash. Default passcode: WanxAI2026
     To change it: compute a new hash and replace PASSCODE_HASH, e.g.
     in a browser console:
       crypto.subtle.digest('SHA-256', new TextEncoder().encode('yourNewPasscode'))
         .then(buf => console.log(Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')));
  --------------------------------------------------------------- */
  const PASSCODE_HASH = '9f8f167947f57dcb54f0296fa4738507076d0bc0dd5aac49c6389383edc4dfc5';
  const SESSION_KEY = 'wanxai_docs_unlocked';

  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  const gateScreen = document.getElementById('gateScreen');
  const docTool = document.getElementById('docTool');
  const gateInput = document.getElementById('gateInput');
  const gateSubmit = document.getElementById('gateSubmit');
  const gateError = document.getElementById('gateError');

  function unlock() {
    gateScreen.style.display = 'none';
    docTool.classList.add('active');
  }

  async function tryUnlock() {
    const val = gateInput.value || '';
    const hash = await sha256(val);
    if (hash === PASSCODE_HASH) {
      sessionStorage.setItem(SESSION_KEY, '1');
      unlock();
    } else {
      gateError.textContent = 'Incorrect passcode.';
      gateInput.value = '';
      gateInput.focus();
    }
  }

  gateSubmit.addEventListener('click', tryUnlock);
  gateInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tryUnlock();
  });

  if (sessionStorage.getItem(SESSION_KEY) === '1') {
    unlock();
  }

  /* ---------------------------------------------------------------
     STATE
  --------------------------------------------------------------- */
  let docType = 'quotation';
  let items = [{ desc: '', note: '', amount: '' }];

  const TYPE_LABELS = {
    quotation: { label: 'Quotation', title: 'Quotation', prefix: 'WX-Q' },
    invoice: { label: 'Invoice', title: 'Invoice', prefix: 'WX-INV' },
    receipt: { label: 'Receipt', title: 'Payment Receipt', prefix: 'WX-R' },
  };

  /* ---------------------------------------------------------------
     ELEMENTS
  --------------------------------------------------------------- */
  const typeSwitch = document.getElementById('typeSwitch');
  const itemsTable = document.getElementById('itemsTable');
  const addItemBtn = document.getElementById('addItemBtn');
  const generateBtn = document.getElementById('generateBtn');
  const generateStatus = document.getElementById('generateStatus');
  const pvDoc = document.getElementById('pvDoc');

  const el = {
    clientName: document.getElementById('clientName'),
    clientEmail: document.getElementById('clientEmail'),
    docNumber: document.getElementById('docNumber'),
    docDate: document.getElementById('docDate'),
    docDue: document.getElementById('docDue'),
    dueDateField: document.getElementById('dueDateField'),
    receivedVia: document.getElementById('receivedVia'),
    receivedViaField: document.getElementById('receivedViaField'),
    amountDueField: document.getElementById('amountDueField'),
    amountDueOverride: document.getElementById('amountDueOverride'),
    amountReceivedField: document.getElementById('amountReceivedField'),
    amountReceivedOverride: document.getElementById('amountReceivedOverride'),
    balanceNoteField: document.getElementById('balanceNoteField'),
    balanceNote: document.getElementById('balanceNote'),
    paymentMethod: document.getElementById('paymentMethod'),
    paymentNumber: document.getElementById('paymentNumber'),
    notes: document.getElementById('notes'),
  };

  /* ---------------------------------------------------------------
     INIT DEFAULTS
  --------------------------------------------------------------- */
  function todayISO() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }
  function formatDateNice(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function makeDocNumber(type) {
    const now = new Date();
    const y = now.getFullYear();
    const rand = String(Math.floor(Math.random() * 900) + 100);
    return `${TYPE_LABELS[type].prefix}-${y}-${rand}`;
  }

  el.docDate.value = todayISO();
  el.docNumber.value = makeDocNumber(docType);
  el.docDue.value = 'Valid for 30 days';

  /* ---------------------------------------------------------------
     TYPE SWITCH
  --------------------------------------------------------------- */
  typeSwitch.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-type]');
    if (!btn) return;
    docType = btn.dataset.type;
    [...typeSwitch.children].forEach((b) => b.classList.toggle('active', b === btn));
    el.docNumber.value = makeDocNumber(docType);

    el.dueDateField.style.display = docType === 'receipt' ? 'none' : '';
    el.receivedViaField.style.display = docType === 'receipt' ? '' : 'none';
    el.amountDueField.style.display = docType === 'invoice' ? '' : 'none';
    el.amountReceivedField.style.display = docType === 'receipt' ? '' : 'none';
    el.balanceNoteField.style.display = docType === 'invoice' || docType === 'receipt' ? '' : 'none';

    if (docType === 'quotation') el.docDue.value = 'Valid for 30 days';
    if (docType === 'invoice') el.docDue.value = 'Due on receipt';

    renderPreview();
  });

  /* ---------------------------------------------------------------
     ITEMS TABLE
  --------------------------------------------------------------- */
  function renderItems() {
    itemsTable.innerHTML = '';
    items.forEach((item, i) => {
      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <input type="text" placeholder="Item description" class="item-desc" data-i="${i}" value="${escAttr(item.desc)}">
        <input type="number" placeholder="Amount" class="item-amount" data-i="${i}" value="${escAttr(item.amount)}">
        <button type="button" class="remove-item" data-i="${i}" title="Remove item">&times;</button>
        <input type="text" placeholder="Note (optional, e.g. KES 3,000 discount applied)" class="item-note" data-i="${i}" value="${escAttr(item.note)}">
      `;
      itemsTable.appendChild(row);
    });
  }
  function escAttr(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  itemsTable.addEventListener('input', (e) => {
    const i = +e.target.dataset.i;
    if (e.target.classList.contains('item-desc')) items[i].desc = e.target.value;
    if (e.target.classList.contains('item-amount')) items[i].amount = e.target.value;
    if (e.target.classList.contains('item-note')) items[i].note = e.target.value;
    renderPreview();
  });
  itemsTable.addEventListener('click', (e) => {
    const btn = e.target.closest('.remove-item');
    if (!btn) return;
    const i = +btn.dataset.i;
    items.splice(i, 1);
    if (items.length === 0) items.push({ desc: '', note: '', amount: '' });
    renderItems();
    renderPreview();
  });
  addItemBtn.addEventListener('click', () => {
    items.push({ desc: '', note: '', amount: '' });
    renderItems();
  });

  renderItems();

  /* ---------------------------------------------------------------
     LIVE PREVIEW
  --------------------------------------------------------------- */
  function money(n) {
    return 'KES ' + (Number(n) || 0).toLocaleString('en-KE', { maximumFractionDigits: 0 });
  }
  function total() {
    return items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  }

  function renderPreview() {
    const t = total();
    const hasContent = el.clientName.value || items.some((it) => it.desc || it.amount);
    if (!hasContent) {
      pvDoc.innerHTML = '<div class="pv-empty">Fill in the form to see a preview here.</div>';
      return;
    }

    const rows = items
      .filter((it) => it.desc || it.amount)
      .map(
        (it) => `<tr><td>${escHtml(it.desc)}${it.note ? `<br><span class="pv-note">${escHtml(it.note)}</span>` : ''}</td><td style="text-align:right;">${money(it.amount)}</td></tr>`
      )
      .join('');

    let payAmount = t;
    let payLabel = 'Amount Due';
    let stamp = '';
    if (docType === 'invoice') {
      payAmount = el.amountDueOverride.value ? Number(el.amountDueOverride.value) : t;
      payLabel = 'Amount Due Now';
    } else if (docType === 'receipt') {
      payAmount = el.amountReceivedOverride.value ? Number(el.amountReceivedOverride.value) : t;
      payLabel = 'Amount Received';
      const full = payAmount >= t;
      stamp = `<span class="pv-stamp ${full ? 'paid' : 'partial'}">${full ? 'Paid in full' : 'Partial payment'}</span>`;
    }

    pvDoc.innerHTML = `
      <div class="pv-head">
        <div class="pv-brand">WANX<span class="ai">AI</span></div>
        <div class="pv-tag">${TYPE_LABELS[docType].label}<span class="num">${escHtml(el.docNumber.value)}</span></div>
      </div>
      <h4>${TYPE_LABELS[docType].title}</h4>
      <div class="pv-sub">${el.clientName.value ? `For ${escHtml(el.clientName.value)}` : ''}${el.clientEmail.value ? ` (${escHtml(el.clientEmail.value)})` : ''} &middot; ${formatDateNice(el.docDate.value)}</div>
      <table>
        <tr><th>Item</th><th style="text-align:right;">Amount</th></tr>
        ${rows}
        <tr class="pv-total"><td>Total</td><td style="text-align:right;">${money(t)}</td></tr>
      </table>
      <div class="pv-pay">
        <div style="font-size:10.5px; text-transform:uppercase; letter-spacing:1px; color:var(--muted);">${payLabel}</div>
        <div class="amt">${money(payAmount)}</div>
        <div style="margin-top:6px; font-size:11px;">${docType === 'receipt' ? 'Received via' : 'Pay via'} <b>${escHtml(el.paymentMethod.value)}</b> to <b>${escHtml(el.paymentNumber.value)}</b></div>
        ${stamp}
      </div>
      ${el.balanceNote.value ? `<div class="pv-note" style="margin-top:10px;">${escHtml(el.balanceNote.value)}</div>` : ''}
    `;
  }
  function escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  [el.clientName, el.clientEmail, el.docNumber, el.docDate, el.docDue, el.amountDueOverride, el.amountReceivedOverride, el.balanceNote, el.paymentMethod, el.paymentNumber].forEach((input) => {
    input.addEventListener('input', renderPreview);
  });

  /* ---------------------------------------------------------------
     PDF GENERATION
  --------------------------------------------------------------- */
  const COLORS = {
    ink: [43, 33, 22],
    gold: [173, 131, 36],
    goldBright: [227, 185, 78],
    rust: [139, 74, 31],
    muted: [107, 93, 69],
    panel: [241, 228, 200],
    panel2: [234, 217, 174],
    line: [221, 203, 160],
    bg: [250, 243, 228],
    green: [62, 107, 58],
    greenBg: [228, 238, 224],
  };

  function drawLogoMark(doc, x, y, size) {
    doc.setFillColor(...COLORS.ink);
    doc.roundedRect(x, y, size, size, size * 0.22, size * 0.22, 'F');
    doc.setDrawColor(...COLORS.goldBright);
    doc.setLineWidth(size * 0.08);
    doc.setLineCap('round');
    doc.setLineJoin('round');
    const s = size / 64;
    doc.lines(
      [
        [11 * s, 0],
        [6 * s, -18 * s],
        [6 * s, 34 * s],
        [6 * s, -34 * s],
        [11 * s, 0],
      ],
      x + 12 * s,
      y + 34 * s,
      [1, 1],
      'S'
    );
    doc.setFillColor(217, 119, 6);
    doc.circle(x + 29 * s, y + 16 * s, 1.8 * s, 'F');
  }

  function buildPdf() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const marginX = 54;
    let y = 48;

    // background
    doc.setFillColor(...COLORS.bg);
    doc.rect(0, 0, pageW, doc.internal.pageSize.getHeight(), 'F');

    // header
    drawLogoMark(doc, marginX, y, 26);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...COLORS.ink);
    doc.text('WANX', marginX + 34, y + 12);
    const wanxW = doc.getTextWidth('WANX');
    doc.setTextColor(...COLORS.gold);
    doc.text('AI', marginX + 34 + wanxW, y + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text('Nairobi, Kenya', marginX + 34, y + 23);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.gold);
    const label = TYPE_LABELS[docType].label.toUpperCase();
    doc.text(label, pageW - marginX, y + 8, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...COLORS.muted);
    doc.text(el.docNumber.value, pageW - marginX, y + 20, { align: 'right' });

    y += 44;
    doc.setDrawColor(...COLORS.gold);
    doc.setLineWidth(1.4);
    doc.line(marginX, y, pageW - marginX, y);
    y += 30;

    // title
    doc.setFont('times', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...COLORS.ink);
    doc.text(TYPE_LABELS[docType].title, marginX, y);
    y += 18;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(...COLORS.muted);
    const preparedBits = [];
    if (el.clientName.value) preparedBits.push(`For ${el.clientName.value}${el.clientEmail.value ? ' (' + el.clientEmail.value + ')' : ''}`);
    preparedBits.push(formatDateNice(el.docDate.value));
    doc.text(preparedBits.join('  ·  '), marginX, y);
    y += 26;

    // meta row
    const metaItems = [
      ['Document No.', el.docNumber.value],
      docType === 'receipt' ? ['Received Via', el.receivedVia.value] : ['Due / Validity', el.docDue.value],
    ];
    const metaColW = (pageW - marginX * 2) / metaItems.length;
    metaItems.forEach((m, i) => {
      const mx = marginX + i * metaColW;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.gold);
      doc.text(m[0].toUpperCase(), mx, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(...COLORS.ink);
      doc.text(String(m[1] || '—'), mx, y + 13);
    });
    y += 34;

    // items table
    const rows = items.filter((it) => it.desc || it.amount).map((it) => [
      it.note ? `${it.desc}\n${it.note}` : it.desc,
      money(it.amount),
    ]);
    const itemColWidth = pageW - marginX * 2 - 110;
    doc.autoTable({
      startY: y,
      head: [['Item', 'Amount (KES)']],
      body: rows,
      theme: 'plain',
      margin: { left: marginX, right: marginX },
      styles: { font: 'helvetica', fontSize: 10, textColor: COLORS.ink, cellPadding: { top: 7, bottom: 7, left: 9, right: 9 }, lineColor: COLORS.line, lineWidth: 0.6 },
      headStyles: { fillColor: COLORS.panel, textColor: COLORS.rust, fontStyle: 'bold', fontSize: 8.5 },
      columnStyles: { 1: { halign: 'right', cellWidth: 110 } },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 0 && data.cell.raw && data.cell.raw.includes('\n')) {
          const [main, note] = data.cell.raw.split('\n');
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          const wrapped = doc.splitTextToSize(note, itemColWidth - 18);
          data.cell.text = [main, ...wrapped.map(() => ' ')];
          data.cell._note = wrapped;
        }
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.cell._note) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          doc.setTextColor(...COLORS.muted);
          const lineH = 10;
          const startY = data.cell.y + data.cell.height - data.cell.padding('bottom') - (data.cell._note.length - 1) * lineH - 3;
          data.cell._note.forEach((ln, idx) => {
            doc.text(ln, data.cell.x + data.cell.padding('left'), startY + idx * lineH);
          });
        }
      },
    });
    y = doc.lastAutoTable.finalY;

    // total row
    const t = total();
    doc.setFillColor(...COLORS.panel2);
    doc.rect(marginX, y, pageW - marginX * 2, 26, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...COLORS.ink);
    doc.text('Total', marginX + 9, y + 17);
    doc.text(money(t), pageW - marginX - 9, y + 17, { align: 'right' });
    y += 46;

    // payment box
    let payAmount = t;
    let payLabel = 'AMOUNT DUE';
    if (docType === 'invoice') {
      payAmount = el.amountDueOverride.value ? Number(el.amountDueOverride.value) : t;
      payLabel = 'AMOUNT DUE NOW';
    } else if (docType === 'receipt') {
      payAmount = el.amountReceivedOverride.value ? Number(el.amountReceivedOverride.value) : t;
      payLabel = 'AMOUNT RECEIVED';
    } else {
      payLabel = 'TOTAL INVESTMENT';
    }

    const boxH = 64;
    doc.setFillColor(...COLORS.panel2);
    doc.roundedRect(marginX, y, pageW - marginX * 2, boxH, 8, 8, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.muted);
    doc.text(payLabel, marginX + 18, y + 22);
    doc.setFont('times', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...COLORS.rust);
    doc.text(money(payAmount), marginX + 18, y + 46);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.ink);
    const payVerb = docType === 'receipt' ? 'Received via' : 'Pay via';
    const payMethodText = `${payVerb} ${el.paymentMethod.value} to ${el.paymentNumber.value}`;
    doc.text(payMethodText, pageW - marginX - 18, y + 30, { align: 'right' });

    if (docType === 'receipt') {
      const full = payAmount >= t;
      const stampText = full ? 'PAID IN FULL' : 'PARTIAL PAYMENT';
      doc.setFillColor(...(full ? COLORS.greenBg : COLORS.panel));
      doc.setDrawColor(...(full ? COLORS.green : COLORS.line));
      const stampW = doc.getTextWidth(stampText) + 20;
      doc.roundedRect(pageW - marginX - stampW - 18, y + 38, stampW, 18, 9, 9, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...(full ? COLORS.green : COLORS.rust));
      doc.text(stampText, pageW - marginX - stampW / 2 - 18, y + 50, { align: 'center' });
    }
    y += boxH + 22;

    // balance note
    if (el.balanceNote.value) {
      doc.setFillColor(...COLORS.panel);
      const noteLines = doc.splitTextToSize(el.balanceNote.value, pageW - marginX * 2 - 28);
      const noteH = noteLines.length * 12 + 16;
      doc.rect(marginX, y, 3, noteH, 'F');
      doc.setFillColor(...COLORS.panel);
      doc.rect(marginX + 3, y, pageW - marginX * 2 - 3, noteH, 'F');
      doc.setDrawColor(...COLORS.gold);
      doc.setLineWidth(2);
      doc.line(marginX, y, marginX, y + noteH);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9.5);
      doc.setTextColor(...COLORS.muted);
      doc.text(noteLines, marginX + 16, y + 16);
      y += noteH + 20;
    }

    // notes / terms
    const notesText = el.notes.value.trim();
    if (notesText) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(...COLORS.rust);
      doc.text('NOTES', marginX, y);
      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.ink);
      notesText.split('\n').forEach((line) => {
        if (!line.trim()) return;
        const wrapped = doc.splitTextToSize('•  ' + line.trim(), pageW - marginX * 2);
        doc.text(wrapped, marginX, y);
        y += wrapped.length * 13 + 3;
      });
      y += 10;
    }

    // footer
    const pageH = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...COLORS.line);
    doc.setLineWidth(0.6);
    doc.line(marginX, pageH - 46, pageW - marginX, pageH - 46);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.muted);
    doc.text('Wanx AI — Nairobi, Kenya', marginX, pageH - 32);
    doc.text('invoices@wan-xai.com  ·  github.com/wanxai', pageW - marginX, pageH - 32, { align: 'right' });

    return doc;
  }

  generateBtn.addEventListener('click', () => {
    if (!items.some((it) => it.desc && it.amount)) {
      generateStatus.textContent = 'Add at least one item with a description and amount.';
      generateStatus.style.color = '#8B4A1F';
      return;
    }
    try {
      const doc = buildPdf();
      const safeClient = (el.clientName.value || 'client').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      const fileName = `Wanx-AI-${TYPE_LABELS[docType].label}-${safeClient}-${el.docNumber.value}.pdf`;
      doc.save(fileName);
      generateStatus.textContent = 'Downloaded ' + fileName;
      generateStatus.style.color = '';
    } catch (err) {
      console.error(err);
      generateStatus.textContent = 'Something went wrong generating the PDF.';
      generateStatus.style.color = '#8B4A1F';
    }
  });

  // initial state
  el.dueDateField.style.display = '';
  el.receivedViaField.style.display = 'none';
  el.amountDueField.style.display = 'none';
  el.amountReceivedField.style.display = 'none';
  el.balanceNoteField.style.display = 'none';
  renderPreview();
})();
