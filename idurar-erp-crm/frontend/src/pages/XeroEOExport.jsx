import React, { useState } from 'react';
import { Card, DatePicker, Button, message, Space } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { request } from '@/request';

const { RangePicker } = DatePicker;

// 與 xero_bill_sample.csv 一致（PO/bill 格式）
const XERO_BILL_CSV_HEADER =
  'ContactName,EmailAddress,POAddressLine1,POAddressLine2,POAddressLine3,POAddressLine4,POCity,PORegion,POPostalCode,POCountry,InvoiceNumber,InvoiceDate,DueDate,Total,InventoryItemCode,Description,Quantity,UnitAmount,AccountCode,TaxType,TaxAmount,TrackingName1,TrackingOption1,TrackingName2,TrackingOption2,Currency';

function escapeCsvCell(val) {
  if (val == null || val === '') return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function XeroEOExport() {
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
        entity: 'project/export-xero-eo',
        params: { dateFrom, dateTo },
      });

      const projects = data?.result || [];
      if (projects.length === 0) {
        message.info('該日期範圍內沒有 EO 單資料（依 Project start date 篩選）');
        setLoading(false);
        return;
      }

      const rows = [XERO_BILL_CSV_HEADER];
      let eoRowCount = 0;

      for (const project of projects) {
        const contactName = project?.projectName || '';
        const used = project?.usedContractorFees || [];
        for (const fee of used) {
          if (!fee?.eoNumber) continue;

          const invoiceNumber = fee.eoNumber;
          const invoiceDate = fee.date ? dayjs(fee.date).format('YYYY-MM-DD') : '';
          const dueDate = invoiceDate;
          const description = fee.contractorName || '';

          const quantity = 1;
          const unitAmount = fee.amount != null ? fee.amount : 0;
          const accountCode = fee.accountCode || '';

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
              'Branch',
              'Supermax',
              '',
              '',
              'HKD',
            ].join(',')
          );
          eoRowCount += 1;
        }
      }

      if (eoRowCount === 0) {
        message.info('查到 Project 但沒有符合的 EO number 記錄');
        setLoading(false);
        return;
      }

      const csvContent = rows.join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xero_eo_export_${dateFrom}_${dateTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      message.success(`已滙出 ${eoRowCount} 條 EO 行`);
    } catch (err) {
      message.error(err?.message || '滙出失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Card title="Xero EO單滙出" style={{ maxWidth: 560 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8 }}>
              選擇日期範圍（依 Project management start date）
            </label>
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
          滙出內容：InvoiceNumber/InvoiceDate/DueDate/ContactName/AccountCode（來自承辦商），以及每條
          used判頭費對應 1 row（Description、Quantity=1、UnitAmount、Currency=HKD，TaxType=0%）。
        </p>
      </Card>
    </div>
  );
}

