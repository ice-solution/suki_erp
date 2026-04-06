import React, { useState } from 'react';
import { Card, DatePicker, Button, message, Space, Table } from 'antd';
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
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [csvContent, setCsvContent] = useState('');
  const [csvFilename, setCsvFilename] = useState('');

  const buildPreviewAndCsv = (projects, dateFrom, dateTo) => {
    const rows = [XERO_BILL_CSV_HEADER];
    const outPreviewRows = [];
    let eoRowCount = 0;
    let rowIndex = 0;

    for (const project of projects) {
      const projectDescription = project?.projectName || '';
      const used = project?.usedContractorFees || [];

      for (const fee of used) {
        if (!fee?.eoNumber) continue;

        const invoiceNumber = fee.eoNumber;
        const invoiceDate = fee.date ? dayjs(fee.date).format('YYYY-MM-DD') : '';
        const dueDate = invoiceDate;
        // ContactName = 承辦商；Description = 專案名稱／工程地址（與 Xero 欄位語意一致）
        const contactName = fee.contractorName || '';
        const description = projectDescription;

        const quantity = 1;
        const unitAmount = fee.amount != null ? fee.amount : 0;
        const accountCode = fee.accountCode || '';

        rows.push(
          [
            escapeCsvCell(contactName),
            '', // EmailAddress
            '', '', '', '', '', '', '', '', // POAddressLine1–4, POCity, PORegion, POPostalCode, POCountry（8 欄，須與表頭一致）
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
        eoRowCount += 1;
      }
    }

    const csv = rows.join('\n');
    return {
      csv,
      filename: `xero_eo_export_${dateFrom}_${dateTo}.csv`,
      previewRows: outPreviewRows,
      eoRowCount,
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
        entity: 'project/export-xero-eo',
        params: { dateFrom, dateTo },
      });

      const projects = data?.result || [];
      if (projects.length === 0) {
        message.info('該日期範圍內沒有 EO 單資料（依 Project start date 篩選）');
        setPreviewRows([]);
        setCsvContent('');
        setCsvFilename('');
        return;
      }
      const { csv, filename, previewRows: outPreviewRows, eoRowCount } = buildPreviewAndCsv(projects, dateFrom, dateTo);
      if (eoRowCount === 0) {
        message.info('查到 Project 但沒有符合的 EO number 記錄');
        setPreviewRows([]);
        setCsvContent('');
        setCsvFilename('');
        return;
      }

      setCsvContent(csv);
      setCsvFilename(filename);
      setPreviewRows(outPreviewRows);
      message.success(`已列出 ${eoRowCount} 條 EO 行（待你下載 CSV）`);
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
      a.download = csvFilename || 'xero_eo_export.csv';
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
      <Card title="Xero EO單滙出" style={{ maxWidth: 560 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8 }}>
              選擇日期範圍（依 判頭費日期）
            </label>
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
          ContactName 為承辦商名稱；Description 為專案名稱／工程地址。每條判頭費 1 row（Quantity=1、UnitAmount、Currency=HKD，TaxType=0%）。
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

