import React, { useEffect, useMemo, useState } from 'react';
import { Card, Row, Col, Select, Button, Table, Space, Statistic, Typography, message, DatePicker } from 'antd';
import { FileExcelOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
import { ErpLayout } from '@/layout';
import { request } from '@/request';
import * as XLSX from 'xlsx';

const { Text } = Typography;

export default function ContractorReport() {
  const [contractors, setContractors] = useState([]);
  const [selectedContractor, setSelectedContractor] = useState(undefined);
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);

  useEffect(() => {
    const loadContractors = async () => {
      setLoading(true);
      try {
        const res = await request.listAll({ entity: 'contractor' });
        if (res?.success) {
          const options = (res.result || []).map((c) => ({
            value: c._id,
            label: c.accountCode ? `${c.name} (${c.accountCode})` : c.name,
          }));
          setContractors(options);
        }
      } catch (err) {
        message.error('載入承辦商失敗');
      } finally {
        setLoading(false);
      }
    };
    loadContractors();
  }, []);

  const loadReport = async () => {
    if (!selectedContractor) {
      message.warning('請先選擇承辦商');
      return;
    }
    if (!dateRange?.[0] || !dateRange?.[1]) {
      message.warning('請選擇項目開始日期範圍（由／至）');
      return;
    }
    setReportLoading(true);
    try {
      const res = await request.get({
        entity: 'project/contractor-report',
        params: {
          contractorId: selectedContractor,
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

    const rows = [];
    reportData.projects.forEach((project) => {
      if (!project.employees?.length) {
        rows.push({
          承辦商: reportData.contractor?.name || '-',
          項目名稱: project.projectName || '-',
          開始日期: project.startDate ? dayjs(project.startDate).format('YYYY-MM-DD') : '-',
          QuoteNumber: project.quoteNumber || '-',
          PO_Number: project.poNumber || '-',
          員工: '-',
          上班總天數: 0,
          詳細日期: '-',
        });
        return;
      }

      project.employees.forEach((emp) => {
        rows.push({
          承辦商: reportData.contractor?.name || '-',
          項目名稱: project.projectName || '-',
          開始日期: project.startDate ? dayjs(project.startDate).format('YYYY-MM-DD') : '-',
          QuoteNumber: project.quoteNumber || '-',
          PO_Number: project.poNumber || '-',
          員工: emp.employeeName || '-',
          上班總天數: emp.totalWorkDays || 0,
          詳細日期: (emp.workDates || []).join(', '),
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '承辦商報告');
    const filename = `承辦商報告_${reportData.contractor?.name || 'report'}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const projectColumns = useMemo(
    () => [
      { title: '項目名稱', dataIndex: 'projectName', key: 'projectName' },
      {
        title: '開始日期',
        dataIndex: 'startDate',
        key: 'startDate',
        width: 120,
        render: (d) => (d ? dayjs(d).format('YYYY-MM-DD') : '-'),
      },
      { title: 'Quote Number', dataIndex: 'quoteNumber', key: 'quoteNumber' },
      { title: 'P.O Number', dataIndex: 'poNumber', key: 'poNumber' },
      { title: '員工數', dataIndex: 'employeeCount', key: 'employeeCount', width: 100 },
      { title: '上班總天數', dataIndex: 'totalWorkDays', key: 'totalWorkDays', width: 120 },
    ],
    []
  );

  const employeeColumns = useMemo(
    () => [
      { title: '員工', dataIndex: 'employeeName', key: 'employeeName' },
      { title: '上班總天數', dataIndex: 'totalWorkDays', key: 'totalWorkDays', width: 120 },
      {
        title: '詳細日期',
        dataIndex: 'workDates',
        key: 'workDates',
        render: (dates) => (dates && dates.length ? dates.join(', ') : '-'),
      },
    ],
    []
  );

  return (
    <ErpLayout>
      <div style={{ padding: 24 }}>
        <Card title="承辦商報告" extra={<TeamOutlined />}>
          <Row gutter={16} align="bottom">
            <Col span={8}>
              <Text strong>1) 選擇想查詢的承辦商</Text>
              <Select
                style={{ width: '100%', marginTop: 8 }}
                placeholder="請選擇承辦商"
                options={contractors}
                value={selectedContractor}
                onChange={setSelectedContractor}
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
                    篩選條件：項目開始日期介於 {reportData.summary?.dateFrom} 至 {reportData.summary?.dateTo}
                  </Text>
                </Col>
                <Col span={8}>
                  <Statistic title="相關項目數" value={reportData.summary?.totalProjects || 0} />
                </Col>
                <Col span={8}>
                  <Statistic title="員工數" value={reportData.summary?.totalEmployees || 0} />
                </Col>
                <Col span={8}>
                  <Statistic title="上班總天數" value={reportData.summary?.totalWorkDays || 0} />
                </Col>
              </Row>

              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                2) 列出相關承辦商的項目
              </Text>

              <Table
                rowKey="projectId"
                loading={reportLoading}
                dataSource={reportData.projects || []}
                columns={projectColumns}
                pagination={{ pageSize: 10 }}
                expandable={{
                  expandedRowRender: (record) => (
                    <div>
                      <Text strong style={{ display: 'block', marginBottom: 8 }}>
                        3) 該項目員工上班總天數與詳細日期
                      </Text>
                      <Table
                        rowKey={(r) => r.employeeId}
                        size="small"
                        dataSource={record.employees || []}
                        columns={employeeColumns}
                        pagination={false}
                      />
                    </div>
                  ),
                }}
              />
            </>
          )}
        </Card>
      </div>
    </ErpLayout>
  );
}

