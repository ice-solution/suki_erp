import React, { useState } from 'react';
import { Card, DatePicker, Button, message, Space } from 'antd';
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

export default function XeroPOExport() {
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!dateRange || dateRange.length !== 2) {
      message.warning('請選擇日期範圍');
      return;
    }
    const dateFrom = dateRange[0].format('YYYY-MM-DD');
    const dateTo = dateRange[1].format('YYYY-MM-DD');
    setLoading(true);
    try {
      const data = await request.get({
        entity: 'supplierquote/export-xero-po',
        params: { dateFrom, dateTo },
      });
      const list = data?.result || [];
      if (list.length === 0) {
        message.info('該日期範圍內沒有符合條件的 PO 單（須為 PO 類型且 Completed = 是）');
        setLoading(false);
        return;
      }

      const rows = [XERO_PO_CSV_HEADER];
      for (const po of list) {
        const contactName = po.supplier?.name || '';
        const accountCode = po.supplier?.accountCode || '';
        const invoiceNumber = `${po.numberPrefix || 'PO'}-${po.number}`;
        const invoiceDate = po.date ? dayjs(po.date).format('YYYY-MM-DD') : '';
        const dueDate = po.expiredDate ? dayjs(po.expiredDate).format('YYYY-MM-DD') : (po.date ? dayjs(po.date).format('YYYY-MM-DD') : '');
        const materials = po.materials || [];
        for (const row of materials) {
          const description = row.itemName || '';
          const quantity = row.quantity != null ? row.quantity : 0;
          const unitAmount = row.unitPrice != null ? row.unitPrice : (row.price != null ? row.price : 0);
          rows.push(
            [
              escapeCsvCell(contactName),
              '', // EmailAddress
              '', '', '', '', '', '', '', '', // PO address
              escapeCsvCell(invoiceNumber),
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
        }
      }

      const csvContent = rows.join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xero_po_export_${dateFrom}_${dateTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      message.success(`已滙出 ${list.length} 張 PO 單`);
    } catch (err) {
      message.error(err?.message || '滙出失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Card title="Xero PO單滙出" style={{ maxWidth: 560 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8 }}>選擇日期範圍（依 S單日期，僅 PO 單且 Completed = 是）</label>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates || [])}
              format="YYYY-MM-DD"
              style={{ width: '100%' }}
            />
          </div>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExport}
            loading={loading}
          >
            滙出 CSV
          </Button>
        </Space>
        <p style={{ marginTop: 16, color: '#666', fontSize: 12 }}>
          僅滙出 S單中 Supplier type = PO 且<strong> Completed（已完成）= 是</strong>的紀錄。欄位：InvoiceNumber、InvoiceDate、DueDate、ContactName（供應商）、AccountCode、TaxType、每張 PO 的「材料及費用管理」列（Description、Quantity、UnitAmount）、Currency = HKD。
        </p>
      </Card>
    </div>
  );
}
