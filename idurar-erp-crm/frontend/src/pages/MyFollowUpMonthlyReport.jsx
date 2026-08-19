import React, { useEffect, useState } from 'react';
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
} from 'antd';
import { CalendarOutlined, FileExcelOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';

import { ErpLayout } from '@/layout';
import { useMoney, useDate } from '@/settings';
import { request } from '@/request';
import { followUpDisplayName } from '@/utils/adminDisplayName';
import { selectCurrentAdmin } from '@/redux/auth/selectors';
import * as XLSX from 'xlsx';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const formatDocNo = (r) =>
  r && r.numberPrefix != null && r.number != null ? `${r.numberPrefix}-${r.number}` : r?.invoiceNumber || '—';

const clientNames = (record) => {
  if (record.clients && Array.isArray(record.clients) && record.clients.length > 0) {
    return record.clients.map((c) => c.name).filter(Boolean).join('、');
  }
  if (record.client?.name) return record.client.name;
  return '—';
};

const poNumbersText = (record) => {
  if (record?.poNumber != null && String(record.poNumber).trim()) return String(record.poNumber).trim();
  return '—';
};

const MyFollowUpMonthlyReport = () => {
  const { moneyFormatter } = useMoney();
  const { dateFormat } = useDate();
  const currentAdmin = useSelector(selectCurrentAdmin) || {};
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  const generateReport = async () => {
    if (!dateRange?.[0] || !dateRange?.[1]) {
      message.warning('請選擇開始日期和結束日期');
      return;
    }

    setLoading(true);
    try {
      const response = await request.get({
        entity: 'quote/my-follow-up-report',
        params: {
          startDate: dateRange[0].format('YYYY-MM-DD'),
          endDate: dateRange[1].format('YYYY-MM-DD'),
        },
      });
      if (response?.success) {
        setReportData(response.result);
      } else {
        message.error(response?.message || '生成報告失敗');
      }
    } catch (error) {
      console.error(error);
      message.error('生成報告失敗: ' + (error.message || '未知錯誤'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void generateReport();
  }, []);

  const exportXlsx = () => {
    if (!reportData) {
      message.warning('請先生成報告');
      return;
    }

    const formatDate = (d) => (d ? dayjs(d).format('YYYY-MM-DD') : '');
    const rowOf = (type, r) => ({
      類別: type,
      單號: formatDocNo(r) === '—' ? '' : formatDocNo(r),
      Quote_Number: r?.invoiceNumber || '',
      PO_Number: poNumbersText(r) === '—' ? '' : poNumbersText(r),
      客戶: clientNames(r) === '—' ? '' : clientNames(r),
      跟單人: followUpDisplayName(r) === '-' ? '' : followUpDisplayName(r),
      總計: Number(r?.total) || 0,
      貨幣: r?.currency || 'HKD',
      狀態: r?.status || '',
      日期: formatDate(r?.date),
      已完成: r?.isCompleted ? '是' : '否',
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet((reportData.quotes || []).map((r) => rowOf('報價單', r))),
      '報價單'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet((reportData.shipQuotes || []).map((r) => rowOf('吊船報價', r))),
      '吊船報價'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet((reportData.supplierQuotes || []).map((r) => rowOf('S單', r))),
      'S單'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet((reportData.invoices || []).map((r) => rowOf('發票', r))),
      '發票'
    );

    XLSX.writeFile(
      wb,
      `我的跟單月報_${dayjs(reportData.startDate).format('YYYYMMDD')}-${dayjs(reportData.endDate).format(
        'YYYYMMDD'
      )}.xlsx`
    );
  };

  const docColumns = (type) => {
    const pathMap = {
      quote: '/quote/read/',
      shipquote: '/shipquote/read/',
      supplierquote: '/supplierquote/read/',
      invoice: '/invoice/read/',
    };
    return [
      {
        title: '單號',
        key: 'docNo',
        render: (_, r) => <Link to={`${pathMap[type]}${r._id}`}>{formatDocNo(r)}</Link>,
      },
      ...(type === 'invoice'
        ? [
            {
              title: '報價編號',
              dataIndex: 'invoiceNumber',
              key: 'invoiceNumber',
              render: (v) => v || '—',
            },
          ]
        : []),
      {
        title: 'P.O Number',
        key: 'poNumber',
        render: (_, r) => poNumbersText(r),
      },
      {
        title: '客戶',
        key: 'clients',
        render: (_, r) => clientNames(r),
      },
      {
        title: '跟單人',
        key: 'followUpBy',
        render: (_, r) => followUpDisplayName(r),
      },
      {
        title: '總計',
        dataIndex: 'total',
        key: 'total',
        align: 'right',
        render: (t, r) => moneyFormatter({ amount: t ?? 0, currency_code: r.currency }),
      },
      {
        title: '狀態',
        dataIndex: 'status',
        key: 'status',
        render: (v) => <Tag>{v || '—'}</Tag>,
      },
      {
        title: '日期',
        dataIndex: 'date',
        key: 'date',
        render: (d) => (d ? dayjs(d).format('YYYY-MM-DD') : '—'),
      },
    ];
  };

  const rangeText = reportData
    ? `${dayjs(reportData.startDate).format('YYYY-MM-DD')} 至 ${dayjs(reportData.endDate).format('YYYY-MM-DD')}`
    : '';

  const tabItems = [
    {
      key: 'quotes',
      label: '報價單',
      children: <Table dataSource={reportData?.quotes || []} columns={docColumns('quote')} rowKey="_id" pagination={{ pageSize: 10 }} size="small" />,
    },
    {
      key: 'shipQuotes',
      label: '吊船報價',
      children: <Table dataSource={reportData?.shipQuotes || []} columns={docColumns('shipquote')} rowKey="_id" pagination={{ pageSize: 10 }} size="small" />,
    },
    {
      key: 'supplierQuotes',
      label: 'S單',
      children: <Table dataSource={reportData?.supplierQuotes || []} columns={docColumns('supplierquote')} rowKey="_id" pagination={{ pageSize: 10 }} size="small" />,
    },
    {
      key: 'invoices',
      label: '發票',
      children: <Table dataSource={reportData?.invoices || []} columns={docColumns('invoice')} rowKey="_id" pagination={{ pageSize: 10 }} size="small" />,
    },
  ];

  return (
    <ErpLayout>
      <div style={{ padding: '24px' }}>
        <Card>
          <div style={{ marginBottom: '24px' }}>
            <Title level={2}>我的跟單月報</Title>
            <Text type="secondary">
              顯示登入用戶 {currentAdmin?.name || currentAdmin?.email || '—'} 於所選期間的報價、吊船報價、S單、發票
            </Text>

            <Row gutter={[16, 12]} style={{ marginTop: 16 }}>
              <Col span={24}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong>選擇時間範圍</Text>
                  <RangePicker
                    value={dateRange}
                    onChange={setDateRange}
                    style={{ width: '100%', maxWidth: 420 }}
                    format={dateFormat}
                  />
                </Space>
              </Col>

              <Col span={24}>
                <Space wrap>
                  <Button type="primary" icon={<CalendarOutlined />} onClick={generateReport} loading={loading}>
                    重新整理
                  </Button>
                  {reportData ? (
                    <Button icon={<FileExcelOutlined />} onClick={exportXlsx}>
                      下載 XLSX
                    </Button>
                  ) : null}
                </Space>
              </Col>
            </Row>
          </div>

          {reportData ? (
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
                    <Statistic title="報價單" value={reportData.summary.quotes} prefix={<FileTextOutlined />} />
                  </Col>
                  <Col xs={12} md={4}>
                    <Statistic title="吊船報價" value={reportData.summary.shipQuotes} prefix={<FileTextOutlined />} />
                  </Col>
                  <Col xs={12} md={4}>
                    <Statistic title="S單" value={reportData.summary.supplierQuotes} prefix={<FileTextOutlined />} />
                  </Col>
                  <Col xs={12} md={4}>
                    <Statistic title="發票" value={reportData.summary.invoices} prefix={<FileTextOutlined />} />
                  </Col>
                  <Col xs={12} md={4}>
                    <Statistic title="總數" value={reportData.summary.total} />
                  </Col>
                </Row>
              </Card>

              <Tabs defaultActiveKey="quotes" items={tabItems} />
            </>
          ) : null}
        </Card>
      </div>
    </ErpLayout>
  );
};

export default MyFollowUpMonthlyReport;
