import { useEffect, useState } from 'react';
import { Modal, Select, Input, Checkbox, Table, message, Typography, Space, Alert } from 'antd';
import { request } from '@/request';

const { Text } = Typography;

/**
 * 報價單／吊船報價 Read 頁：同步更新 P.O number 至 Project Management、報價、S 單、Invoice
 */
export default function PoNumberSyncModal({
  open,
  onClose,
  entity,
  documentId,
  poOptions = [],
  onSuccess,
}) {
  const [oldPoNumber, setOldPoNumber] = useState(null);
  const [newPoNumber, setNewPoNumber] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [syncProjects, setSyncProjects] = useState(true);
  const [syncQuote, setSyncQuote] = useState(true);
  const [syncSupplierQuotes, setSyncSupplierQuotes] = useState(true);
  const [syncInvoices, setSyncInvoices] = useState(true);

  const reset = () => {
    setOldPoNumber(null);
    setNewPoNumber('');
    setPreview(null);
    setSyncProjects(true);
    setSyncQuote(true);
    setSyncSupplierQuotes(true);
    setSyncInvoices(true);
  };

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open]);

  useEffect(() => {
    if (!open || !documentId || !oldPoNumber) {
      setPreview(null);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setPreviewLoading(true);
      try {
        const res = await request.get({
          entity: `${entity}/po-sync-preview/${documentId}`,
          params: { oldPoNumber },
        });
        if (cancelled) return;
        if (res?.success) {
          setPreview(res.result);
        } else {
          setPreview(null);
          message.error(res?.message || '無法載入預覽');
        }
      } catch {
        if (!cancelled) setPreview(null);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, entity, documentId, oldPoNumber]);

  const handleSubmit = async () => {
    const oldPo = String(oldPoNumber || '').trim();
    const newPo = String(newPoNumber || '').trim();
    if (!oldPo) {
      message.warning('請選擇舊 P.O number');
      return;
    }
    if (!newPo) {
      message.warning('請填寫新 P.O number');
      return;
    }
    if (oldPo === newPo) {
      message.warning('新 P.O number 不可與舊 P.O 相同');
      return;
    }
    if (!syncProjects && !syncQuote && !syncSupplierQuotes && !syncInvoices) {
      message.warning('請至少選擇一項要同步更新的範圍');
      return;
    }

    setSubmitLoading(true);
    try {
      const res = await request.post({
        entity: `${entity}/po-sync/${documentId}`,
        jsonData: {
          oldPoNumber: oldPo,
          newPoNumber: newPo,
          syncProjects,
          syncQuote,
          syncSupplierQuotes,
          syncInvoices,
        },
      });
      if (res?.success) {
        message.success('P.O number 已同步更新');
        onSuccess?.(res.result);
        onClose?.();
      } else {
        message.error(res?.message || '同步失敗');
      }
    } catch (e) {
      message.error(e?.message || '同步失敗');
    } finally {
      setSubmitLoading(false);
    }
  };

  const quoteImpact = preview?.quote;
  const projectRows = preview?.projects || [];
  const supplierRows = preview?.supplierQuotes || [];
  const invoiceRows = preview?.invoices || [];

  return (
    <Modal
      title="同步更新 P.O number"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="確認同步"
      cancelText="取消"
      confirmLoading={submitLoading}
      width={720}
      destroyOnClose
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div>
          <Text type="secondary">舊 P.O number</Text>
          <Select
            style={{ width: '100%', marginTop: 8 }}
            placeholder="選擇要替換的舊 P.O"
            value={oldPoNumber}
            onChange={setOldPoNumber}
            options={poOptions.map((po) => ({ value: po, label: po }))}
            showSearch
            optionFilterProp="label"
          />
        </div>

        <div>
          <Text type="secondary">新 P.O number</Text>
          <Input
            style={{ marginTop: 8 }}
            placeholder="輸入新 P.O number"
            value={newPoNumber}
            onChange={(e) => setNewPoNumber(e.target.value)}
          />
        </div>

        {previewLoading ? (
          <Text type="secondary">載入影響範圍…</Text>
        ) : preview ? (
          <>
            <Alert
              type="info"
              showIcon
              message={
                <>
                  報價 <strong>{preview.quoteNumber || '-'}</strong>：舊 P.O{' '}
                  <strong>{preview.oldPoNumber}</strong>
                </>
              }
              description={
                <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                  <li>
                    報價單表頭／行項目：{quoteImpact?.headerMatches ? '表頭有匹配' : '表頭無匹配'}
                    {quoteImpact?.lineCount > 0 ? `，${quoteImpact.lineCount} 個行項目` : ''}
                  </li>
                  <li>Project Management：{projectRows.length} 個項目</li>
                  <li>S 單：{supplierRows.length} 張</li>
                  <li>Invoice：{invoiceRows.length} 張</li>
                </ul>
              }
            />

            {projectRows.length > 0 ? (
              <div>
                <Text strong>將更新的 Project Management</Text>
                <Table
                  size="small"
                  rowKey="_id"
                  pagination={false}
                  dataSource={projectRows}
                  columns={[
                    { title: '項目名稱', dataIndex: 'name', key: 'name' },
                    { title: '關聯單號', dataIndex: 'invoiceNumber', key: 'inv' },
                    { title: 'P.O', dataIndex: 'poNumber', key: 'po' },
                  ]}
                  style={{ marginTop: 8 }}
                />
              </div>
            ) : null}

            {supplierRows.length > 0 ? (
              <div>
                <Text strong>將更新的 S 單</Text>
                <Table
                  size="small"
                  rowKey="_id"
                  pagination={false}
                  dataSource={supplierRows}
                  columns={[
                    { title: 'S 單編號', dataIndex: 'supplierQuoteNumber', key: 'no' },
                    { title: 'P.O', dataIndex: 'poNumber', key: 'po' },
                    { title: '上單 P.O', dataIndex: 'orderFromPoNumber', key: 'orderPo' },
                  ]}
                  style={{ marginTop: 8 }}
                />
              </div>
            ) : null}

            {invoiceRows.length > 0 ? (
              <div>
                <Text strong>將更新的 Invoice</Text>
                <Table
                  size="small"
                  rowKey="_id"
                  pagination={false}
                  dataSource={invoiceRows}
                  columns={[
                    { title: 'Invoice No.', dataIndex: 'invoiceNumber', key: 'no' },
                    { title: 'P.O', dataIndex: 'poNumber', key: 'po' },
                    { title: '來源 P.O', dataIndex: 'orderFromPoNumber', key: 'orderPo' },
                  ]}
                  style={{ marginTop: 8 }}
                />
              </div>
            ) : null}
          </>
        ) : oldPoNumber ? (
          <Text type="secondary">此 P.O 在報價、S 單、Invoice 均無匹配記錄</Text>
        ) : null}

        <div>
          <Text strong>同步範圍</Text>
          <div style={{ marginTop: 8 }}>
            <Checkbox checked={syncProjects} onChange={(e) => setSyncProjects(e.target.checked)}>
              更新 Project Management P.O number
            </Checkbox>
          </div>
          <div>
            <Checkbox checked={syncQuote} onChange={(e) => setSyncQuote(e.target.checked)}>
              更新報價單 P.O number
            </Checkbox>
          </div>
          <div>
            <Checkbox
              checked={syncSupplierQuotes}
              onChange={(e) => setSyncSupplierQuotes(e.target.checked)}
            >
              更新已轉換 S 單 P.O number
            </Checkbox>
          </div>
          <div>
            <Checkbox checked={syncInvoices} onChange={(e) => setSyncInvoices(e.target.checked)}>
              更新 Invoice P.O number
            </Checkbox>
          </div>
        </div>
      </Space>
    </Modal>
  );
}
