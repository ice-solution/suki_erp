import React, { useEffect, useMemo, useState } from 'react';
import { Card, Row, Col, Select, Button, Table, Space, Statistic, Typography, message, DatePicker } from 'antd';
import { FileExcelOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
import { ErpLayout } from '@/layout';
import { request } from '@/request';
import * as XLSX from 'xlsx';

const { Text } = Typography;

/** 讓儲存格長文換行顯示、避免 Ant Design Table 出現 … 省略 */
const wrapCell = (maxWidth) => () => ({
  style: {
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    verticalAlign: 'top',
    ...(maxWidth ? { maxWidth } : {}),
  },
});

export default function ContractorEmployeeReport() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(undefined);
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);

  useEffect(() => {
    const loadEmployees = async () => {
      setLoading(true);
      try {
        const res = await request.listAll({ entity: 'contractoremployee' });
        if (res?.success) {
          const options = (res.result || []).map((e) => {
            const cname =
              e.contractor && typeof e.contractor === 'object'
                ? e.contractor.name
                : '';
            const label = cname ? `${e.name || '-'}（${cname}）` : e.name || '-';
            return { value: e._id, label };
          });
          setEmployees(options);
        }
      } catch (err) {
        message.error('載入承辦商員工失敗');
      } finally {
        setLoading(false);
      }
    };
    loadEmployees();
  }, []);

  const loadReport = async () => {
    if (!selectedEmployeeId) {
      message.warning('請先選擇承辦商員工');
      return;
    }
    if (!dateRange?.[0] || !dateRange?.[1]) {
      message.warning('請選擇項目開始日期範圍（由／至）');
      return;
    }
    setReportLoading(true);
    try {
      const res = await request.get({
        entity: 'project/contractor-employee-report',
        params: {
          contractorEmployeeId: selectedEmployeeId,
          dateFrom: dateRange[0].format('YYYY-MM-DD'),
          dateTo: dateRange[1].format('YYYY-MM-DD'),
        },
      });
      if (res?.success) {
        setReportData(res.result);
      } else {
        setReportData(null);
        message.error(res?.message || '查詢失敗');
      }
    } catch (err) {
      setReportData(null);
      message.error('查詢失敗');
    } finally {
      setReportLoading(false);
    }
  };

  const exportXlsx = () => {
    if (!reportData?.projects?.length) {
      message.warning('沒有可下載資料');
      return;
    }

    const emp = reportData.employee;
    const contractorName = emp?.contractor?.name || '-';
    const rows = (reportData.projects || []).map((project) => ({
      承辦商員工: emp?.name || '-',
      承辦商: contractorName,
      項目名稱: project.projectName || '-',
      開始日期: project.startDate ? dayjs(project.startDate).format('YYYY-MM-DD') : '-',
      QuoteNumber: project.quoteNumber || '-',
      PO_Number: project.poNumber || '-',
      上班總天數: project.totalWorkDays ?? 0,
      詳細日期: (project.workDates || []).join(', '),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '承辦商員工報告');
    const filename = `承辦商員工報告_${emp?.name || 'report'}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const projectColumns = useMemo(
    () => [
      {
        title: '項目名稱',
        dataIndex: 'projectName',
        key: 'projectName',
        ellipsis: false,
        minWidth: 220,
        onCell: wrapCell(520),
        render: (text) => text || '-',
      },
      {
        title: '開始日期',
        dataIndex: 'startDate',
        key: 'startDate',
        width: 120,
        ellipsis: false,
        onCell: wrapCell(),
        render: (d) => (d ? dayjs(d).format('YYYY-MM-DD') : '-'),
      },
      {
        title: 'Quote Number',
        dataIndex: 'quoteNumber',
        key: 'quoteNumber',
        width: 130,
        ellipsis: false,
        onCell: wrapCell(),
      },
      {
        title: 'P.O Number',
        dataIndex: 'poNumber',
        key: 'poNumber',
        width: 120,
        ellipsis: false,
        onCell: wrapCell(),
      },
      {
        title: '上班總天數',
        dataIndex: 'totalWorkDays',
        key: 'totalWorkDays',
        width: 100,
        ellipsis: false,
        onCell: wrapCell(),
      },
      {
        title: '詳細日期',
        dataIndex: 'workDates',
        key: 'workDates',
        ellipsis: false,
        minWidth: 280,
        onCell: wrapCell(640),
        render: (dates) => (dates && dates.length ? dates.join(', ') : '-'),
      },
    ],
    []
  );

  return (
    <ErpLayout>
      <div style={{ padding: 24 }}>
        <Card title="承辦商員工報告" extra={<UserOutlined />} style={{ maxWidth: '100%' }}>
          <Row gutter={16} align="bottom">
            <Col span={8}>
              <Text strong>1) 選擇承辦商員工</Text>
              <Select
                style={{ width: '100%', marginTop: 8 }}
                placeholder="請選擇承辦商員工"
                options={employees}
                value={selectedEmployeeId}
                onChange={setSelectedEmployeeId}
                loading={loading}
                showSearch
                optionFilterProp="label"
                allowClear
              />
            </Col>
            <Col span={8}>
              <Text strong>項目開始日期（由 — 至）</Text>
              <div style={{ marginTop: 8 }}>
                <RangePicker
                  style={{ width: '100%' }}
                  value={dateRange}
                  onChange={(v) => setDateRange(v)}
                  format="YYYY-MM-DD"
                />
              </div>
            </Col>
            <Col>
              <Space>
                <Button type="primary" icon={<SearchOutlined />} onClick={loadReport} loading={reportLoading}>
                  列出報告
                </Button>
                <Button icon={<FileExcelOutlined />} onClick={exportXlsx} disabled={!reportData}>
                  下載 XLSX
                </Button>
              </Space>
            </Col>
          </Row>

          {reportData && (
            <>
              <Row gutter={16} style={{ marginTop: 20, marginBottom: 16 }}>
                <Col span={24} style={{ marginBottom: 8 }}>
                  <Text type="secondary">
                    員工：{reportData.employee?.name || '-'}（承辦商：{reportData.employee?.contractor?.name || '-'}
                    ）｜篩選：項目開始日期介於 {reportData.summary?.dateFrom} 至 {reportData.summary?.dateTo}
                  </Text>
                </Col>
                <Col span={8}>
                  <Statistic title="參與項目數" value={reportData.summary?.totalProjects || 0} />
                </Col>
                <Col span={8}>
                  <Statistic title="上班總天數（各項目相加）" value={reportData.summary?.totalWorkDays || 0} />
                </Col>
              </Row>

              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                2) 該員工參與的項目
              </Text>

              <Table
                rowKey="projectId"
                loading={reportLoading}
                dataSource={reportData.projects || []}
                columns={projectColumns}
                pagination={{ pageSize: 10 }}
                tableLayout="fixed"
                style={{ width: '100%' }}
              />
            </>
          )}
        </Card>
      </div>
    </ErpLayout>
  );
}
