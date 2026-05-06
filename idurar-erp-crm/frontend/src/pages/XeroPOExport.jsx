import React, { useState } from 'react';
import { Card, DatePicker, Button, message, Space, Table } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { request } from '@/request';

const { RangePicker } = DatePicker;

// 與 xero_bill_sample.csv 一致（PO/bill 格式，無 Reference、Discount）
const XERO_PO_CSV_HEADER =
  'ContactName,EmailAddress,POAddressLine1,POAddressLine2,POAddressLine3,POAddressLine4,POCity,PORegion,POPostalCode,POCountry,InvoiceNumber,InvoiceDate,DueDate,Total,InventoryItemCode,Description,Quantity,UnitAmount,AccountCode,TaxType,TaxAmount,TrackingName1,TrackingOption1,TrackingName2,TrackingOption2,Currency';

function escapeCsvCell(val) {
  if (val == null || val === '') return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** 與表單一致：材料「減數」不列入 Xero 行（負總價／負數量／負單價） */
function isNegativeMaterialRow(row) {
  if (!row || typeof row !== 'object') return true;
  const q = row.quantity != null ? Number(row.quantity) : NaN;
  const unit = row.unitPrice != null ? Number(row.unitPrice) : null;
  const totalPrice = row.price != null ? Number(row.price) : null;
  let lineTotal = totalPrice;
  if (lineTotal == null || Number.isNaN(lineTotal)) {
    if (unit != null && !Number.isNaN(unit) && !Number.isNaN(q)) {
      lineTotal = unit * q;
    } else {
      lineTotal = NaN;
    }
  }
  if (!Number.isNaN(q) && q < 0) return true;
  if (unit != null && !Number.isNaN(unit) && unit < 0) return true;
  if (!Number.isNaN(lineTotal) && lineTotal < 0) return true;
  return false;
}

function getMaterialRowTotal(row) {
  if (!row || typeof row !== 'object') return null;
  const q = row.quantity != null ? Number(row.quantity) : NaN;
  const unit = row.unitPrice != null ? Number(row.unitPrice) : null;
  const totalPrice = row.price != null ? Number(row.price) : null;
  if (totalPrice != null && !Number.isNaN(totalPrice)) return totalPrice;
  if (unit != null && !Number.isNaN(unit) && !Number.isNaN(q)) return unit * q;
  return null;
}

function invoiceNumberSortKey(po) {
  const typeKey = po.type != null ? String(po.type).trim() : '';
  const poNo = `${po.numberPrefix || 'PO'}-${po.number || ''}`;
  // 依「Quote type + number」分組/排序
  return `${typeKey}__${poNo}`;
}

export default function XeroPOExport() {
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [csvContent, setCsvContent] = useState('');
  const [csvFilename, setCsvFilename] = useState('');

  const buildPreviewAndCsv = (list, dateFrom, dateTo) => {
    const rows = [XERO_PO_CSV_HEADER];
    const outPreviewRows = [];
    let rowIndex = 0;

    const sortedList = [...(list || [])].sort((a, b) => {
      const ka = invoiceNumberSortKey(a);
      const kb = invoiceNumberSortKey(b);
      const c = ka.localeCompare(kb, undefined, { numeric: true, sensitivity: 'base' });
      if (c !== 0) return c;
      const pa = `${a.numberPrefix || 'PO'}-${a.number || ''}`;
      const pb = `${b.numberPrefix || 'PO'}-${b.number || ''}`;
      return pa.localeCompare(pb, undefined, { numeric: true, sensitivity: 'base' });
    });

    for (const po of sortedList) {
      const contactName = po.supplier?.name || '';
      const accountCode = po.supplier?.accountCode || '';
      const poDisplayNumber = `${po.numberPrefix || 'PO'}-${po.number}`;
      const supplierInvoice =
        po.counterpartyInvoiceNumber != null ? String(po.counterpartyInvoiceNumber).trim() : '';
      /** Xero InvoiceNumber：以 PO 編號分組（對應「type + number」的 number） */
      const invoiceNumberForExport = poDisplayNumber;
      const invoiceDate = po.date ? dayjs(po.date).format('YYYY-MM-DD') : '';
      const dueDate = po.expiredDate
        ? dayjs(po.expiredDate).format('YYYY-MM-DD')
        : (po.date ? dayjs(po.date).format('YYYY-MM-DD') : '');

      const materials = po.materials || [];
      // 每張 PO 彙總成單一列（避免同一 PO 分多行）
      let poTotal = 0;
      let hasAny = false;
      for (const row of materials) {
        if (isNegativeMaterialRow(row)) continue;
        const t = getMaterialRowTotal(row);
        if (t == null || Number.isNaN(Number(t))) continue;
        poTotal += Number(t);
        hasAny = true;
      }
      if (!hasAny) continue;

      // Description：該 PO 的供應商 Invoice No.
      const description = supplierInvoice || '-';
      const quantity = 1;
      const unitAmount = poTotal;

      rows.push(
        [
          escapeCsvCell(contactName),
          '', // EmailAddress
          '', '', '', '', '', '', '', '', // PO address
          escapeCsvCell(invoiceNumberForExport),
          escapeCsvCell(invoiceDate),
          escapeCsvCell(dueDate),
          '', // Total
          '', // InventoryItemCode
          escapeCsvCell(description),
          escapeCsvCell(quantity),
          escapeCsvCell(unitAmount),
          escapeCsvCell(accountCode),
          'Tax Exempt (0%)', // TaxType
          '', // TaxAmount
          'Branch', 'Supermax', '', '', // TrackingName1, TrackingOption1, TrackingName2, TrackingOption2
          'HKD', // Currency
        ].join(',')
      );

      outPreviewRows.push({
        key: `row-${rowIndex}`,
        contactName,
        poNumber: poDisplayNumber,
        invoiceNumber: invoiceNumberForExport,
        invoiceDate,
        dueDate,
        accountCode,
        description,
        quantity,
        unitAmount,
        taxType: 'Tax Exempt (0%)',
      });
      rowIndex += 1;
    }

    const csv = rows.join('\n');
    return {
      csv,
      filename: `xero_po_export_${dateFrom}_${dateTo}.csv`,
      previewRows: outPreviewRows,
    };
  };

  const handlePreview = async () => {
    if (!dateRange || dateRange.length !== 2) {
      message.warning('請選擇日期範圍');
      return;
    }
    const dateFrom = dateRange[0].format('YYYY-MM-DD');
    const dateTo = dateRange[1].format('YYYY-MM-DD');
    setPreviewLoading(true);
    try {
      const data = await request.get({
        entity: 'supplierquote/export-xero-po',
        params: { dateFrom, dateTo },
      });
      const list = data?.result || [];
      if (list.length === 0) {
        message.info('該日期範圍內沒有符合條件的 PO 單（須為 PO 類型且 Completed = 是）');
        setPreviewRows([]);
        setCsvContent('');
        setCsvFilename('');
        return;
      }
      const { csv, filename, previewRows: outPreviewRows } = buildPreviewAndCsv(list, dateFrom, dateTo);
      setCsvContent(csv);
      setCsvFilename(filename);
      setPreviewRows(outPreviewRows);

      if (outPreviewRows.length === 0) {
        message.info('已找到 PO 單，但沒有可匯出的材料明細');
      } else {
        message.success(`已列出 ${outPreviewRows.length} 條明細（待你下載 CSV）`);
      }
    } catch (err) {
      message.error(err?.message || '滙出失敗');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!csvContent) {
      message.warning('請先列出資料');
      return;
    }
    setDownloadLoading(true);
    try {
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = csvFilename || 'xero_po_export.csv';
      a.click();
      URL.revokeObjectURL(url);
      message.success('CSV 下載已開始');
    } catch (err) {
      message.error(err?.message || 'CSV 下載失敗');
    } finally {
      setDownloadLoading(false);
    }
  };

  const columns = [
    { title: 'ContactName', dataIndex: 'contactName', key: 'contactName', width: 140 },
    { title: 'PO', dataIndex: 'poNumber', key: 'poNumber', width: 120 },
    { title: 'InvoiceNumber', dataIndex: 'invoiceNumber', key: 'invoiceNumber', width: 150 },
    { title: 'InvoiceDate', dataIndex: 'invoiceDate', key: 'invoiceDate', width: 110 },
    { title: 'DueDate', dataIndex: 'dueDate', key: 'dueDate', width: 110 },
    { title: 'AccountCode', dataIndex: 'accountCode', key: 'accountCode', width: 110 },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true, width: 220 },
    { title: 'Quantity', dataIndex: 'quantity', key: 'quantity', width: 90 },
    { title: 'UnitAmount', dataIndex: 'unitAmount', key: 'unitAmount', width: 110 },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card title="Xero PO單滙出" style={{ maxWidth: 1100 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8 }}>選擇日期範圍（依 S單日期，僅 PO 單且 Completed = 是）</label>
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                setDateRange(dates || []);
                setPreviewRows([]);
                setCsvContent('');
                setCsvFilename('');
              }}
              format="YYYY-MM-DD"
              style={{ width: '100%' }}
            />
          </div>
        </Space>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handlePreview} loading={previewLoading}>
            列出資料
          </Button>
          {previewRows.length > 0 && (
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleDownload}
              loading={downloadLoading}
            >
              下載 CSV
            </Button>
          )}
        </div>
        <p style={{ marginTop: 16, color: '#666', fontSize: 12 }}>
          僅滙出 S單中 Supplier type = PO 且<strong> Completed（已完成）= 是</strong>的紀錄。以<strong>PO</strong>為單位輸出材料列；整份列表依<strong>Quote type + PO 編號</strong>排序/分組。CSV 欄位 InvoiceNumber 為 PO 編號；材料<strong>減數</strong>（負數量／負單價／負總價）不輸出；Description 為該 PO 的「供應商 Invoice No.」。
        </p>

        {previewRows.length > 0 && (
          <>
            <div style={{ marginTop: 16 }}>
              <Table
                size="small"
                rowKey="key"
                columns={columns}
                dataSource={previewRows}
                pagination={{ pageSize: 10 }}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
