import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, DatePicker, Button, message, Space, Table } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { request } from '@/request';
import { getAccountCodeByServiceType } from '@/utils/serviceTypeAccountCode';

const { RangePicker } = DatePicker;

const XERO_CSV_HEADER =
  'ContactName,EmailAddress,POAddressLine1,POAddressLine2,POAddressLine3,POAddressLine4,POCity,PORegion,POPostalCode,POCountry,InvoiceNumber,Reference,InvoiceDate,DueDate,Total,InventoryItemCode,Description,Quantity,UnitAmount,Discount,AccountCode,TaxType,TaxAmount,TrackingName1,TrackingOption1,TrackingName2,TrackingOption2,Currency,BrandingTheme';

function escapeCsvCell(val) {
  if (val == null || val === '') return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function XeroExport() {
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [csvContent, setCsvContent] = useState('');
  const [csvFilename, setCsvFilename] = useState('');

  const resolveInvoiceTotal = (inv) => {
    if (inv.total != null && !Number.isNaN(Number(inv.total))) {
      return Number(inv.total);
    }
    const items = inv.items || [];
    return items.reduce((sum, item) => {
      const line =
        item.total != null
          ? Number(item.total)
          : (item.price != null && item.quantity != null
              ? Number(item.price) * Number(item.quantity)
              : 0);
      return sum + (Number.isFinite(line) ? line : 0);
    }, 0);
  };

  /** 工程／專案地址：優先關聯 Project，否則用發票上的 address */
  const resolveProjectAddress = (inv) => {
    const fromProject = inv.project && typeof inv.project === 'object' ? inv.project.address : '';
    if (fromProject != null && String(fromProject).trim() !== '') {
      return String(fromProject).trim();
    }
    return inv.address != null ? String(inv.address).trim() : '';
  };

  const buildPreviewAndCsv = (invoices, dateFrom, dateTo) => {
    const branchByInvoiceType = { SMI: 'Supermax', WSE: 'Wing Shun', SP: 'supermax' };

    const rows = [XERO_CSV_HEADER];
    const outPreviewRows = [];
    let rowIndex = 0;

    for (const inv of invoices) {
      const client = inv.client || (inv.clients && inv.clients[0]);
      const contactName = client?.name || '';
      const accountCode = getAccountCodeByServiceType(inv.type) || '';
      const invoiceNumber = `${inv.numberPrefix || 'SMI'}-${inv.number}`;
      const invoiceDate = inv.date ? dayjs(inv.date).format('YYYY-MM-DD') : '';
      const dueDate = inv.paymentDueDate ? dayjs(inv.paymentDueDate).format('YYYY-MM-DD') : '';

      const trackingOption1 = branchByInvoiceType[inv.numberPrefix] || '';
      const description = resolveProjectAddress(inv);
      const quantity = 1;
      const unitAmount = resolveInvoiceTotal(inv);

      rows.push(
        [
          escapeCsvCell(contactName),
          '', // EmailAddress
          '', '', '', '', '', '', '', '', // PO address
          escapeCsvCell(invoiceNumber),
          '', // Reference
          escapeCsvCell(invoiceDate),
          escapeCsvCell(dueDate),
          '', // Total
          '', // InventoryItemCode
          escapeCsvCell(description),
          escapeCsvCell(quantity),
          escapeCsvCell(unitAmount),
          '', // Discount
          escapeCsvCell(accountCode),
          'Tax Exempt (0%)', // TaxType
          '', // TaxAmount
          'branch', // TrackingName1
          escapeCsvCell(trackingOption1), // TrackingOption1
          '', '', // TrackingName2, TrackingOption2
          'HKD', // Currency
          '', // BrandingTheme
        ].join(',')
      );

      outPreviewRows.push({
        key: inv._id ? String(inv._id) : `row-${rowIndex}`,
        invoiceId: inv._id,
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

    const csv = rows.join('\n');
    return {
      csv,
      filename: `xero_export_${dateFrom}_${dateTo}.csv`,
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
        entity: 'invoice/export-xero',
        params: { dateFrom, dateTo },
      });
      const invoices = data?.result || [];
      if (invoices.length === 0) {
        message.info('該日期範圍內沒有發票');
        setPreviewRows([]);
        setCsvContent('');
        setCsvFilename('');
        return;
      }
      const { csv, filename, previewRows: outPreviewRows } = buildPreviewAndCsv(invoices, dateFrom, dateTo);
      setCsvContent(csv);
      setCsvFilename(filename);
      setPreviewRows(outPreviewRows);

      message.success(`已列出 ${outPreviewRows.length} 張發票（待你下載 CSV）`);
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
      a.download = csvFilename || 'xero_export.csv';
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
    {
      title: 'InvoiceNumber',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      width: 150,
      render: (text, record) =>
        record.invoiceId ? (
          <Link to={`/invoice/read/${record.invoiceId}`} onClick={(e) => e.stopPropagation()}>
            {text}
          </Link>
        ) : (
          text
        ),
    },
    { title: 'InvoiceDate', dataIndex: 'invoiceDate', key: 'invoiceDate', width: 110 },
    { title: 'DueDate', dataIndex: 'dueDate', key: 'dueDate', width: 110 },
    { title: 'AccountCode', dataIndex: 'accountCode', key: 'accountCode', width: 110 },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true, width: 220 },
    { title: 'Quantity', dataIndex: 'quantity', key: 'quantity', width: 90 },
    { title: 'UnitAmount', dataIndex: 'unitAmount', key: 'unitAmount', width: 110 },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card title="Xero 發票滙出" style={{ maxWidth: 1100 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8 }}>選擇日期範圍（依發票日期）</label>
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
          每張發票一列：Description 為專案／工程地址（優先 Project.address，否則發票 address）；Quantity=1；UnitAmount
          為該張發票總額。
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
