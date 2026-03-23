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

    for (const po of list) {
      const contactName = po.supplier?.name || '';
      const accountCode = po.supplier?.accountCode || '';
      const invoiceNumber = `${po.numberPrefix || 'PO'}-${po.number}`;
      const invoiceDate = po.date ? dayjs(po.date).format('YYYY-MM-DD') : '';
      const dueDate = po.expiredDate
        ? dayjs(po.expiredDate).format('YYYY-MM-DD')
        : (po.date ? dayjs(po.date).format('YYYY-MM-DD') : '');

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

        outPreviewRows.push({
          key: `row-${rowIndex}`,
          contactName,
          invoiceNumber,
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
      <Card title="Xero PO單滙出" style={{ maxWidth: 560 }}>
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
          僅滙出 S單中 Supplier type = PO 且<strong> Completed（已完成）= 是</strong>的紀錄。欄位：InvoiceNumber、InvoiceDate、DueDate、ContactName（供應商）、AccountCode、TaxType、每張 PO 的「材料及費用管理」列（Description、Quantity、UnitAmount）、Currency = HKD。
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
