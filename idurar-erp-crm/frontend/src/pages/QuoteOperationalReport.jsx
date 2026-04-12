import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  DatePicker,
  Table,
  message,
  Space,
  Statistic,
  Typography,
  Divider,
  Tag,
  Tabs,
  Select,
} from 'antd';
import { FileTextOutlined, CalendarOutlined, DownloadOutlined, PrinterOutlined, FileExcelOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import { ErpLayout } from '@/layout';
import { useMoney, useDate } from '@/settings';
import { request } from '@/request';
import * as XLSX from 'xlsx';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const formatQuoteNo = (r) =>
  r && r.numberPrefix != null && r.number != null ? `${r.numberPrefix}-${r.number}` : '—';

const formatInvoiceNo = (r) =>
  r && r.numberPrefix != null && r.number != null ? `${r.numberPrefix}-${r.number}` : '—';

const clientNames = (record) => {
  if (record.clients && Array.isArray(record.clients) && record.clients.length > 0) {
    return record.clients.map((c) => c.name).filter(Boolean).join('、');
  }
  if (record.client?.name) return record.client.name;
  return '—';
};

const poNumbersText = (record) => {
  const list = record?.poNumbers;
  if (Array.isArray(list) && list.length > 0) {
    const cleaned = list
      .map((x) => (x == null ? '' : String(x).trim()))
      .filter(Boolean);
    if (cleaned.length) return cleaned.join('、');
  }
  // 向後相容：有些單可能只有單一 poNumber
  if (record?.poNumber != null && String(record.poNumber).trim()) return String(record.poNumber).trim();
  return '—';
};

const QuoteOperationalReport = () => {
  const { moneyFormatter } = useMoney();
  const { dateFormat } = useDate();
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [creatorId, setCreatorId] = useState(null);
  const [clientId, setClientId] = useState(null);

  const [adminOptions, setAdminOptions] = useState([]);
  const [clientOptions, setClientOptions] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [clientLoading, setClientLoading] = useState(false);
  const [adminSearchText, setAdminSearchText] = useState('');
  const [clientSearchText, setClientSearchText] = useState('');
  const adminSearchTimer = useRef(null);
  const clientSearchTimer = useRef(null);

  const adminLabel = (a) => {
    const name = (a?.name || '').trim();
    const email = (a?.email || '').trim();
    if (name && email) return `${name} (${email})`;
    return name || email || '—';
  };

  const preloadAdmins = async () => {
    setAdminLoading(true);
    try {
      const res = await request.get({ entity: 'admin' });
      const rows = (res?.result || [])
        .slice(0, 20)
        .map((a) => ({ value: a._id, label: adminLabel(a) }));
      setAdminOptions(rows);
    } catch (e) {
      console.error(e);
      setAdminOptions([]);
    } finally {
      setAdminLoading(false);
    }
  };

  const onSearchAdmin = (text) => {
    setAdminSearchText(text || '');
    if (adminSearchTimer.current) clearTimeout(adminSearchTimer.current);
    adminSearchTimer.current = setTimeout(async () => {
      const q = String(text || '').trim();
      if (!q) {
        // 未輸入時：顯示預設清單
        await preloadAdmins();
        return;
      }
      setAdminLoading(true);
      try {
        const res = await request.get({
          entity: 'admin/search',
          params: { q, fields: 'name,email' },
        });
        const rows = (res?.result || []).map((a) => ({ value: a._id, label: adminLabel(a) }));
        setAdminOptions(rows);
      } catch (e) {
        console.error(e);
        setAdminOptions([]);
      } finally {
        setAdminLoading(false);
      }
    }, 300);
  };

  const preloadClients = async () => {
    setClientLoading(true);
    try {
      const res = await request.list({ entity: 'client', options: { items: 20 } });
      const rows = (res?.result?.items || []).map((c) => ({ value: c._id, label: c.name || '—' }));
      setClientOptions(rows);
    } catch (e) {
      console.error(e);
      setClientOptions([]);
    } finally {
      setClientLoading(false);
    }
  };

  const onSearchClient = (text) => {
    setClientSearchText(text || '');
    if (clientSearchTimer.current) clearTimeout(clientSearchTimer.current);
    clientSearchTimer.current = setTimeout(async () => {
      const q = String(text || '').trim();
      if (!q) {
        // 未輸入時：顯示預設清單
        await preloadClients();
        return;
      }
      setClientLoading(true);
      try {
        const res = await request.search({
          entity: 'client',
          options: { q, fields: 'name' },
        });
        const rows = (res?.result || []).map((c) => ({ value: c._id, label: c.name || '—' }));
        setClientOptions(rows);
      } catch (e) {
        console.error(e);
        setClientOptions([]);
      } finally {
        setClientLoading(false);
      }
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (adminSearchTimer.current) clearTimeout(adminSearchTimer.current);
      if (clientSearchTimer.current) clearTimeout(clientSearchTimer.current);
    };
  }, []);

  const exportXlsx = () => {
    if (!reportData) {
      message.warning('請先生成報告');
      return;
    }

    const formatDate = (d) => (d ? dayjs(d).format('YYYY-MM-DD') : '');
    const quoteRow = (r) => ({
      報價編號: formatQuoteNo(r),
      PO_Number: poNumbersText(r) === '—' ? '' : poNumbersText(r),
      客戶: clientNames(r) === '—' ? '' : clientNames(r),
      總計: Number(r?.total) || 0,
      貨幣: r?.currency || 'HKD',
      日期: formatDate(r?.date),
      已完成: r?.isCompleted ? '是' : '否',
    });

    const sheet1Rows = (reportData.acceptedNotInvoiced || []).map(quoteRow);
    const sheet2Rows = (reportData.acceptedNotCompleted || []).map(quoteRow);

    const invoiceRows = [];
    const pushInv = (categoryLabel, inv) => {
      invoiceRows.push({
        分類: categoryLabel,
        發票編號: formatInvoiceNo(inv),
        報價編號: inv?.invoiceNumber || '',
        客戶: clientNames(inv) === '—' ? '' : clientNames(inv),
        總計: Number(inv?.total) || 0,
        '已付(部份付款)': Number(inv?.credit) || 0,
        付款狀態: inv?.paymentStatus || '',
        FullPaid: inv?.fullPaid === true ? 'Y' : '',
        日期: formatDate(inv?.date),
        貨幣: inv?.currency || 'HKD',
      });
    };
    (reportData.invoicesUnpaid || []).forEach((inv) => pushInv('未付', inv));
    (reportData.invoicesPaidPartial || []).forEach((inv) => pushInv('已付(部份≠0)且未FullPaid', inv));
    (reportData.invoicesPaidFullPaid || []).forEach((inv) => pushInv('已付且FullPaid', inv));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet1Rows), '已接受-未轉Invoice');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet2Rows), '已接受-未完成');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invoiceRows), 'Invoice付款');

    const filename = `報價_發票營運報告_${dayjs(reportData.startDate).format('YYYYMMDD')}-${dayjs(
      reportData.endDate
    ).format('YYYYMMDD')}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const generateReport = async () => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      message.warning('請選擇開始日期和結束日期');
      return;
    }

    setLoading(true);
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');

      const response = await request.get({
        entity: 'quote/operational-report',
        params: {
          startDate,
          endDate,
          ...(creatorId ? { creatorId } : {}),
          ...(clientId ? { clientId } : {}),
        },
      });

      if (response.success) {
        setReportData(response.result);
        message.success('報告生成成功');
      } else {
        message.error('生成報告失敗: ' + (response.message || '未知錯誤'));
      }
    } catch (error) {
      console.error(error);
      message.error('生成報告失敗: ' + (error.message || '未知錯誤'));
    } finally {
      setLoading(false);
    }
  };

  const quoteColumns = [
    {
      title: '報價編號',
      key: 'qno',
      render: (_, r) => (
        <Link to={`/quote/read/${r._id}`}>{formatQuoteNo(r)}</Link>
      ),
    },
    {
      title: 'P.O Number',
      key: 'poNumbers',
      render: (_, r) => poNumbersText(r),
    },
    {
      title: '客戶',
      key: 'clients',
      render: (_, r) => clientNames(r),
    },
    {
      title: '總計',
      dataIndex: 'total',
      key: 'total',
      align: 'right',
      render: (t, r) => moneyFormatter({ amount: t, currency_code: r.currency }),
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      render: (d) => (d ? dayjs(d).format('YYYY-MM-DD') : '—'),
    },
    {
      title: '已完成',
      dataIndex: 'isCompleted',
      key: 'isCompleted',
      render: (v) => (v ? <Tag color="success">是</Tag> : <Tag>否</Tag>),
    },
  ];

  const invoiceColumns = [
    {
      title: '發票編號',
      key: 'ino',
      render: (_, r) => (
        <Link to={`/invoice/read/${r._id}`}>{formatInvoiceNo(r)}</Link>
      ),
    },
    {
      title: '報價編號',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      render: (v) => v || '—',
    },
    {
      title: '客戶',
      key: 'clients',
      render: (_, r) => clientNames(r),
    },
    {
      title: '總計',
      dataIndex: 'total',
      key: 'total',
      align: 'right',
      render: (t, r) => moneyFormatter({ amount: t, currency_code: r.currency }),
    },
    {
      title: '部份付款',
      dataIndex: 'credit',
      key: 'credit',
      align: 'right',
      render: (c, r) => moneyFormatter({ amount: c ?? 0, currency_code: r.currency }),
    },
    {
      title: '付款狀態',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      render: (s) => {
        const map = { unpaid: { c: 'red', t: '未付' }, paid: { c: 'green', t: '已付款' } };
        const x = map[s] || { c: 'default', t: s || '—' };
        return <Tag color={x.c}>{x.t}</Tag>;
      },
    },
    {
      title: 'Full paid',
      dataIndex: 'fullPaid',
      key: 'fullPaid',
      render: (v) => (v === true ? <Tag color="blue">Y</Tag> : <Tag>—</Tag>),
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      render: (d) => (d ? dayjs(d).format('YYYY-MM-DD') : '—'),
    },
  ];

  const rangeText = reportData
    ? `${dayjs(reportData.startDate).format('YYYY-MM-DD')} 至 ${dayjs(reportData.endDate).format('YYYY-MM-DD')}`
    : '';

  const tabItems = [
    {
      key: 'tab1',
      label: '已接受 · 未轉 Invoice',
      children: (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Statistic title="筆數" value={reportData?.summary?.acceptedNotInvoiced ?? 0} prefix={<FileTextOutlined />} />
            </Col>
          </Row>
          <Table
            dataSource={reportData?.acceptedNotInvoiced || []}
            columns={quoteColumns}
            rowKey="_id"
            pagination={{ pageSize: 10 }}
            size="small"
          />
        </>
      ),
    },
    {
      key: 'tab2',
      label: '已接受 · 未完成',
      children: (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Statistic title="筆數" value={reportData?.summary?.acceptedNotCompleted ?? 0} prefix={<FileTextOutlined />} />
            </Col>
          </Row>
          <Table
            dataSource={reportData?.acceptedNotCompleted || []}
            columns={quoteColumns}
            rowKey="_id"
            pagination={{ pageSize: 10 }}
            size="small"
          />
        </>
      ),
    },
    {
      key: 'tab3',
      label: 'Invoice 付款',
      children: (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Card size="small" title="1) 付款狀態 = 未付">
            <Row gutter={16} style={{ marginBottom: 8 }}>
              <Col>
                <Text type="secondary">筆數：{reportData?.summary?.invoicesUnpaid ?? 0}</Text>
              </Col>
            </Row>
            <Table
              dataSource={reportData?.invoicesUnpaid || []}
              columns={invoiceColumns}
              rowKey="_id"
              pagination={{ pageSize: 8 }}
              size="small"
            />
          </Card>
          <Card size="small" title="2) 已付款 · 部份付款 ≠ 0 · 未勾 Full paid">
            <Row gutter={16} style={{ marginBottom: 8 }}>
              <Col>
                <Text type="secondary">筆數：{reportData?.summary?.invoicesPaidPartial ?? 0}</Text>
              </Col>
            </Row>
            <Table
              dataSource={reportData?.invoicesPaidPartial || []}
              columns={invoiceColumns}
              rowKey="_id"
              pagination={{ pageSize: 8 }}
              size="small"
            />
          </Card>
          <Card size="small" title="3) 已付款 · 已勾 Full paid">
            <Row gutter={16} style={{ marginBottom: 8 }}>
              <Col>
                <Text type="secondary">筆數：{reportData?.summary?.invoicesPaidFullPaid ?? 0}</Text>
              </Col>
            </Row>
            <Table
              dataSource={reportData?.invoicesPaidFullPaid || []}
              columns={invoiceColumns}
              rowKey="_id"
              pagination={{ pageSize: 8 }}
              size="small"
            />
          </Card>
        </Space>
      ),
    },
  ];

  return (
    <ErpLayout>
      <div style={{ padding: '24px' }}>
        <Card>
          <div style={{ marginBottom: '24px' }}>
            <Title level={2}>
              <FileTextOutlined style={{ marginRight: 8 }} />
              報價／發票營運報告
            </Title>

            {/* 三行 layout：時間範圍 / 搜尋 / 操作 */}
            <Row gutter={[16, 12]} style={{ marginTop: 16 }}>
              <Col span={24}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong>選擇時間範圍（Quote／Invoice 的日期）</Text>
                  <RangePicker
                    value={dateRange}
                    onChange={setDateRange}
                    style={{ width: '100%', maxWidth: 420 }}
                    format={dateFormat}
                  />
                </Space>
              </Col>

              <Col span={24}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong>搜尋（可選）</Text>
                  <div style={{ width: '100%', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Select
                      showSearch
                      allowClear
                      placeholder="制單人"
                      filterOption={false}
                      onSearch={onSearchAdmin}
                      onChange={(v) => setCreatorId(v || null)}
                      options={adminOptions}
                      loading={adminLoading}
                      style={{ flex: '1 1 320px', minWidth: 320 }}
                      notFoundContent={
                        adminLoading
                          ? '搜尋中...'
                          : (String(adminSearchText || '').trim() ? '無此資料' : '請輸入或直接選擇')
                      }
                      onDropdownVisibleChange={(open) => {
                        if (open && !String(adminSearchText || '').trim() && adminOptions.length === 0) {
                          preloadAdmins();
                        }
                      }}
                      onClear={() => {
                        setCreatorId(null);
                        setAdminSearchText('');
                        setAdminOptions([]);
                      }}
                    />
                    <Select
                      showSearch
                      allowClear
                      placeholder="客戶"
                      filterOption={false}
                      onSearch={onSearchClient}
                      onChange={(v) => setClientId(v || null)}
                      options={clientOptions}
                      loading={clientLoading}
                      style={{ flex: '1 1 320px', minWidth: 320 }}
                      notFoundContent={
                        clientLoading
                          ? '搜尋中...'
                          : (String(clientSearchText || '').trim() ? '無此資料' : '請輸入或直接選擇')
                      }
                      onDropdownVisibleChange={(open) => {
                        if (open && !String(clientSearchText || '').trim() && clientOptions.length === 0) {
                          preloadClients();
                        }
                      }}
                      onClear={() => {
                        setClientId(null);
                        setClientSearchText('');
                        setClientOptions([]);
                      }}
                    />
                  </div>
                </Space>
              </Col>

              <Col span={24}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong>操作</Text>
                  <Space wrap>
                    <Button type="primary" icon={<CalendarOutlined />} onClick={generateReport} loading={loading}>
                      生成報告
                    </Button>
                    {reportData && (
                      <>
                        <Button icon={<FileExcelOutlined />} onClick={exportXlsx}>
                          下載 XLSX
                        </Button>
                        <Button icon={<PrinterOutlined />} disabled>
                          列印
                        </Button>
                      </>
                    )}
                  </Space>
                </Space>
              </Col>
            </Row>
          </div>

          {reportData && (
            <>
              <Card style={{ marginBottom: '24px' }}>
                <Row gutter={16}>
                  <Col span={24}>
                    <Text type="secondary">報告時間範圍: {rangeText}</Text>
                  </Col>
                </Row>
                <Divider />
                <Row gutter={16}>
                  <Col xs={12} md={4}>
                    <Statistic title="Tab1 筆數" value={reportData.summary.acceptedNotInvoiced} />
                  </Col>
                  <Col xs={12} md={4}>
                    <Statistic title="Tab2 筆數" value={reportData.summary.acceptedNotCompleted} />
                  </Col>
                  <Col xs={12} md={4}>
                    <Statistic title="未付" value={reportData.summary.invoicesUnpaid} />
                  </Col>
                  <Col xs={12} md={4}>
                    <Statistic title="已付(部份≠0)" value={reportData.summary.invoicesPaidPartial} />
                  </Col>
                  <Col xs={12} md={4}>
                    <Statistic title="Full paid" value={reportData.summary.invoicesPaidFullPaid} />
                  </Col>
                </Row>
              </Card>

              <Tabs defaultActiveKey="tab1" items={tabItems} />
            </>
          )}
        </Card>
      </div>
    </ErpLayout>
  );
};

export default QuoteOperationalReport;
