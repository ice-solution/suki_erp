import React, { useState } from 'react';
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
  Collapse
} from 'antd';
import { 
  FileTextOutlined, 
  DollarOutlined, 
  UserOutlined,
  CalendarOutlined,
  DownloadOutlined,
  PrinterOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { ErpLayout } from '@/layout';
import { useMoney, useDate } from '@/settings';
import { request } from '@/request';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { Panel } = Collapse;

const ProjectReport = () => {
  const { moneyFormatter } = useMoney();
  const { dateFormat } = useDate();
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

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
        entity: 'project/report',
        params: { startDate, endDate }
      });

      if (response.success) {
        setReportData(response.result);
        message.success('報告生成成功');
      } else {
        message.error('生成報告失敗: ' + (response.message || '未知錯誤'));
      }
    } catch (error) {
      console.error('Error generating report:', error);
      message.error('生成報告失敗: ' + (error.message || '未知錯誤'));
    } finally {
      setLoading(false);
    }
  };

  // 項目表格列定義
  const projectColumns = [
    {
      title: '項目名稱',
      dataIndex: 'name',
      key: 'name',
      width: '20%',
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      width: '20%',
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      width: '10%',
      render: (status) => {
        const statusMap = {
          draft: { color: 'default', text: '草稿' },
          pending: { color: 'processing', text: '待處理' },
          in_progress: { color: 'processing', text: '進行中' },
          completed: { color: 'success', text: '已完成' },
          cancelled: { color: 'error', text: '已取消' },
          'on hold': { color: 'warning', text: '暫停' },
        };
        const statusInfo = statusMap[status] || { color: 'default', text: status };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
    {
      title: '承包商',
      dataIndex: 'contractors',
      key: 'contractors',
      width: '15%',
      render: (contractors) => {
        if (!contractors || contractors.length === 0) return '-';
        return (
          <Space size="small" wrap>
            {contractors.map((contractor, index) => (
              <Tag key={index}>{contractor.name}</Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: '人工記錄數',
      dataIndex: 'salaries',
      key: 'salaryCount',
      width: '10%',
      render: (salaries) => salaries?.length || 0,
    },
    {
      title: '總人工成本',
      dataIndex: 'totalSalaries',
      key: 'totalSalaries',
      width: '15%',
      render: (amount) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
          {moneyFormatter({ amount: amount || 0 })}
        </span>
      ),
    },
    {
      title: '創建日期',
      dataIndex: 'created',
      key: 'created',
      width: '10%',
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
  ];

  // 人工表格列定義
  const salaryColumns = [
    {
      title: '員工',
      dataIndex: ['contractorEmployee', 'name'],
      key: 'employee',
      width: '20%',
      render: (name, record) => {
        const employee = record.contractorEmployee;
        if (!employee) return '-';
        return (
          <div>
            <div>{employee.name}</div>
            {employee.contractor && (
              <div style={{ fontSize: '12px', color: '#666' }}>
                {employee.contractor.name}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '日薪',
      dataIndex: 'dailySalary',
      key: 'dailySalary',
      width: '15%',
      render: (amount) => moneyFormatter({ amount: amount || 0 }),
    },
    {
      title: '工作天數',
      dataIndex: 'workDays',
      key: 'workDays',
      width: '10%',
      render: (days) => `${days || 0} 天`,
    },
    {
      title: '總工資',
      dataIndex: 'totalSalary',
      key: 'totalSalary',
      width: '15%',
      render: (amount) => (
        <span style={{ fontWeight: 'bold' }}>
          {moneyFormatter({ amount: amount || 0 })}
        </span>
      ),
    },
    {
      title: '備註',
      dataIndex: 'notes',
      key: 'notes',
      width: '25%',
      render: (notes) => notes || '-',
    },
    {
      title: '更新日期',
      dataIndex: 'updated',
      key: 'updated',
      width: '15%',
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
  ];

  return (
    <ErpLayout>
      <div style={{ padding: '24px' }}>
        <Card>
          <div style={{ marginBottom: '24px' }}>
            <Title level={2}>
              <FileTextOutlined style={{ marginRight: 8 }} />
              項目與人工報告
            </Title>
            
            <Row gutter={16} style={{ marginTop: '16px' }}>
              <Col span={8}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong>選擇時間範圍</Text>
                  <RangePicker
                    value={dateRange}
                    onChange={setDateRange}
                    style={{ width: '100%' }}
                    format={dateFormat}
                  />
                </Space>
              </Col>
              <Col span={8}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong>操作</Text>
                  <Space>
                    <Button
                      type="primary"
                      icon={<CalendarOutlined />}
                      onClick={generateReport}
                      loading={loading}
                    >
                      生成報告
                    </Button>
                    {reportData && (
                      <>
                        <Button icon={<DownloadOutlined />}>下載</Button>
                        <Button icon={<PrinterOutlined />}>列印</Button>
                      </>
                    )}
                  </Space>
                </Space>
              </Col>
            </Row>
          </div>

          {reportData && (
            <>
              {/* 統計摘要 */}
              <Card style={{ marginBottom: '24px' }}>
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic
                      title="項目總數"
                      value={reportData.summary.totalProjects}
                      prefix={<FileTextOutlined />}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="總人工成本"
                      value={reportData.summary.totalSalaries}
                      prefix={<DollarOutlined />}
                      formatter={(value) => moneyFormatter({ amount: value })}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="員工總數"
                      value={reportData.summary.totalEmployees}
                      prefix={<UserOutlined />}
                    />
                  </Col>
                </Row>
                <Divider />
                <Row>
                  <Col span={24}>
                    <Text type="secondary">
                      報告時間範圍: {dayjs(reportData.startDate).format('YYYY-MM-DD')} 至 {dayjs(reportData.endDate).format('YYYY-MM-DD')}
                    </Text>
                  </Col>
                </Row>
              </Card>

              {/* 項目列表 */}
              <Card title="項目列表" style={{ marginBottom: '24px' }}>
                <Table
                  dataSource={reportData.projects}
                  columns={projectColumns}
                  rowKey="_id"
                  pagination={{ pageSize: 10 }}
                  expandable={{
                    expandedRowRender: (record) => {
                      if (!record.salaries || record.salaries.length === 0) {
                        return <div style={{ padding: '16px' }}>該項目暫無人工記錄</div>;
                      }
                      return (
                        <div style={{ padding: '16px' }}>
                          <Text strong style={{ marginBottom: '8px', display: 'block' }}>
                            人工記錄列表
                          </Text>
                          <Table
                            dataSource={record.salaries}
                            columns={salaryColumns}
                            rowKey="_id"
                            pagination={false}
                            size="small"
                          />
                        </div>
                      );
                    },
                    rowExpandable: (record) => true,
                  }}
                />
              </Card>
            </>
          )}
        </Card>
      </div>
    </ErpLayout>
  );
};

export default ProjectReport;







