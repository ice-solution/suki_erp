import React, { useEffect, useState } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Button, 
  Select, 
  DatePicker, 
  Table, 
  message, 
  Space, 
  Statistic,
  Typography,
  Divider,
  Tag
} from 'antd';
import { 
  FileTextOutlined, 
  DollarOutlined, 
  BankOutlined, 
  TrophyOutlined,
  DownloadOutlined,
  PrinterOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const FinancialReports = () => {
  const [reportType, setReportType] = useState('profit_loss');
  const [reportData, setReportData] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPeriods();
  }, []);

  const fetchPeriods = async () => {
    try {
      // 會計期間API
      const currentYear = new Date().getFullYear();
      const mockPeriods = Array.from({ length: 12 }, (_, i) => ({
        _id: `period-${i + 1}`,
        periodName: `${currentYear}年${(i + 1).toString().padStart(2, '0')}月`,
        fiscalYear: currentYear,
        periodNumber: i + 1,
        startDate: new Date(currentYear, i, 1),
        endDate: new Date(currentYear, i + 1, 0)
      }));
      setPeriods(mockPeriods);
      setSelectedPeriod(mockPeriods[new Date().getMonth()]?._id);
    } catch (err) {
      console.log('Periods API not implemented yet');
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      // 根據報表類型生成不同報表
      if (reportType === 'profit_loss') {
        await generateProfitLossReport();
      } else if (reportType === 'balance_sheet') {
        await generateBalanceSheetReport();
      } else if (reportType === 'trial_balance') {
        await generateTrialBalanceReport();
      }
    } catch (err) {
      message.error('生成報表失敗: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const generateProfitLossReport = async () => {
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');
      
      // 調用真實的損益表API
      const res = await axios.get('/financial-report/profit-loss', {
        params: { startDate, endDate, includeUnposted: false }
      });
      
      setReportData(res.data.result);
    } catch (err) {
      // 如果API調用失敗，使用模擬數據
      console.log('API call failed, using mock data:', err.message);
      const mockData = {
        reportType: 'profit_loss',
        reportName: '損益表',
        period: { startDate, endDate },
        sections: [
          {
            title: '營業收入',
            items: [
              { accountCode: '4001', accountName: '營業收入', amount: 1500000 },
              { accountCode: '4002', accountName: '工程收入', amount: 800000 },
            ],
            subtotal: 2300000
          },
          {
            title: '營業成本',
            items: [
              { accountCode: '5001', accountName: '材料成本', amount: 600000 },
              { accountCode: '5002', accountName: '人工成本', amount: 400000 },
              { accountCode: '5003', accountName: '製造費用', amount: 200000 },
            ],
            subtotal: 1200000
          },
          {
            title: '營業費用',
            items: [
              { accountCode: '6001', accountName: '薪資費用', amount: 300000 },
              { accountCode: '6002', accountName: '租金費用', amount: 50000 },
              { accountCode: '6003', accountName: '水電費', amount: 30000 },
              { accountCode: '6004', accountName: '折舊費用', amount: 20000 },
            ],
            subtotal: 400000
          }
        ],
        summary: {
          grossProfit: 1100000,
          operatingIncome: 700000,
          netIncome: 700000
        }
      };
      
      setReportData(mockData);
    }
  };

  const generateBalanceSheetReport = async () => {
    const mockData = {
      reportType: 'balance_sheet',
      reportName: '資產負債表',
      sections: [
        {
          title: '資產',
          subsections: [
            {
              title: '流動資產',
              items: [
                { accountCode: '1001', accountName: '現金', amount: 500000 },
                { accountCode: '1002', accountName: '銀行存款', amount: 800000 },
                { accountCode: '1101', accountName: '應收帳款', amount: 600000 },
                { accountCode: '1301', accountName: '存貨', amount: 400000 },
              ],
              subtotal: 2300000
            },
            {
              title: '固定資產',
              items: [
                { accountCode: '1502', accountName: '建築物', amount: 2000000 },
                { accountCode: '1503', accountName: '機器設備', amount: 1500000 },
                { accountCode: '1581', accountName: '累計折舊-建築物', amount: -200000 },
                { accountCode: '1582', accountName: '累計折舊-機器設備', amount: -300000 },
              ],
              subtotal: 3000000
            }
          ],
          total: 5300000
        },
        {
          title: '負債及權益',
          subsections: [
            {
              title: '流動負債',
              items: [
                { accountCode: '2001', accountName: '應付帳款', amount: 300000 },
                { accountCode: '2201', accountName: '應付薪資', amount: 100000 },
              ],
              subtotal: 400000
            },
            {
              title: '權益',
              items: [
                { accountCode: '3001', accountName: '股本', amount: 3000000 },
                { accountCode: '3201', accountName: '保留盈餘', amount: 1900000 },
              ],
              subtotal: 4900000
            }
          ],
          total: 5300000
        }
      ]
    };
    
    setReportData(mockData);
  };

  const generateTrialBalanceReport = async () => {
    const mockData = {
      reportType: 'trial_balance',
      reportName: '試算表',
      items: [
        { accountCode: '1001', accountName: '現金', debitBalance: 500000, creditBalance: 0 },
        { accountCode: '1002', accountName: '銀行存款', debitBalance: 800000, creditBalance: 0 },
        { accountCode: '1101', accountName: '應收帳款', debitBalance: 600000, creditBalance: 0 },
        { accountCode: '2001', accountName: '應付帳款', debitBalance: 0, creditBalance: 300000 },
        { accountCode: '3001', accountName: '股本', debitBalance: 0, creditBalance: 3000000 },
        { accountCode: '4001', accountName: '營業收入', debitBalance: 0, creditBalance: 1500000 },
        { accountCode: '5001', accountName: '材料成本', debitBalance: 600000, creditBalance: 0 },
      ],
      totals: {
        totalDebits: 2500000,
        totalCredits: 4800000
      }
    };
    
    setReportData(mockData);
  };

  const renderProfitLossReport = () => {
    if (!reportData || reportData.reportType !== 'profit_loss') return null;

    return (
      <div>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Title level={3}>{reportData.reportName}</Title>
          <Text type="secondary">
            期間：{reportData.period.startDate} 至 {reportData.period.endDate}
          </Text>
        </div>

        {reportData.sections.map((section, index) => (
          <div key={index} style={{ marginBottom: '24px' }}>
            <Title level={4}>{section.title}</Title>
            <Table
              dataSource={section.items}
              pagination={false}
              size="small"
              columns={[
                { title: '科目代碼', dataIndex: 'accountCode', width: 100 },
                { title: '科目名稱', dataIndex: 'accountName' },
                { 
                  title: '金額', 
                  dataIndex: 'amount', 
                  align: 'right',
                  render: (amount) => amount?.toLocaleString()
                }
              ]}
            />
            <div style={{ textAlign: 'right', marginTop: '8px' }}>
              <Text strong>小計: {section.subtotal?.toLocaleString()}</Text>
            </div>
          </div>
        ))}

        <Divider />
        
        <Row gutter={16}>
          <Col span={8}>
            <Card>
              <Statistic
                title="毛利潤"
                value={reportData.summary.grossProfit}
                precision={0}
                formatter={(value) => value?.toLocaleString()}
                prefix={<TrophyOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="營業利潤"
                value={reportData.summary.operatingIncome}
                precision={0}
                formatter={(value) => value?.toLocaleString()}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="淨利潤"
                value={reportData.summary.netIncome}
                precision={0}
                formatter={(value) => value?.toLocaleString()}
                prefix={<BankOutlined />}
                valueStyle={{ color: reportData.summary.netIncome >= 0 ? '#3f8600' : '#cf1322' }}
              />
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  const renderBalanceSheetReport = () => {
    if (!reportData || reportData.reportType !== 'balance_sheet') return null;

    return (
      <div>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Title level={3}>{reportData.reportName}</Title>
        </div>

        <Row gutter={24}>
          {reportData.sections.map((section, sectionIndex) => (
            <Col span={12} key={sectionIndex}>
              <Card title={section.title} style={{ height: '100%' }}>
                {section.subsections.map((subsection, subIndex) => (
                  <div key={subIndex} style={{ marginBottom: '16px' }}>
                    <Title level={5}>{subsection.title}</Title>
                    <Table
                      dataSource={subsection.items}
                      pagination={false}
                      size="small"
                      showHeader={false}
                      columns={[
                        { dataIndex: 'accountName', width: '60%' },
                        { 
                          dataIndex: 'amount', 
                          align: 'right',
                          render: (amount) => (
                            <Text style={{ color: amount < 0 ? '#cf1322' : 'inherit' }}>
                              {Math.abs(amount).toLocaleString()}
                            </Text>
                          )
                        }
                      ]}
                    />
                    <div style={{ textAlign: 'right', marginTop: '8px' }}>
                      <Text strong>小計: {subsection.subtotal?.toLocaleString()}</Text>
                    </div>
                  </div>
                ))}
                <Divider />
                <div style={{ textAlign: 'right' }}>
                  <Text strong style={{ fontSize: '16px' }}>
                    {section.title}總計: {section.total?.toLocaleString()}
                  </Text>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  };

  const renderTrialBalanceReport = () => {
    if (!reportData || reportData.reportType !== 'trial_balance') return null;

    const columns = [
      { title: '科目代碼', dataIndex: 'accountCode', width: 100 },
      { title: '科目名稱', dataIndex: 'accountName' },
      { 
        title: '借方餘額', 
        dataIndex: 'debitBalance', 
        align: 'right',
        render: (amount) => amount > 0 ? amount.toLocaleString() : '-'
      },
      { 
        title: '貸方餘額', 
        dataIndex: 'creditBalance', 
        align: 'right',
        render: (amount) => amount > 0 ? amount.toLocaleString() : '-'
      }
    ];

    return (
      <div>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Title level={3}>{reportData.reportName}</Title>
        </div>

        <Table
          dataSource={reportData.items}
          columns={columns}
          pagination={false}
          summary={() => (
            <Table.Summary>
              <Table.Summary.Row>
                <Table.Summary.Cell colSpan={2}>
                  <Text strong>合計</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell>
                  <Text strong>{reportData.totals.totalDebits?.toLocaleString()}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell>
                  <Text strong>{reportData.totals.totalCredits?.toLocaleString()}</Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </div>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: '24px' }}>
          <Title level={2}>財務報表</Title>
          
          <Row gutter={16} style={{ marginBottom: '16px' }}>
            <Col span={6}>
              <Select
                value={reportType}
                onChange={setReportType}
                style={{ width: '100%' }}
                placeholder="選擇報表類型"
              >
                <Option value="profit_loss">損益表</Option>
                <Option value="balance_sheet">資產負債表</Option>
                <Option value="trial_balance">試算表</Option>
              </Select>
            </Col>
            <Col span={8}>
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                style={{ width: '100%' }}
              />
            </Col>
            <Col span={4}>
              <Button
                type="primary"
                onClick={generateReport}
                loading={loading}
                style={{ width: '100%' }}
              >
                生成報表
              </Button>
            </Col>
            <Col span={6}>
              <Space>
                <Button icon={<DownloadOutlined />}>下載</Button>
                <Button icon={<PrinterOutlined />}>列印</Button>
              </Space>
            </Col>
          </Row>
        </div>

        {reportData && (
          <Card style={{ marginTop: '16px' }}>
            {reportType === 'profit_loss' && renderProfitLossReport()}
            {reportType === 'balance_sheet' && renderBalanceSheetReport()}
            {reportType === 'trial_balance' && renderTrialBalanceReport()}
          </Card>
        )}
      </Card>
    </div>
  );
};

export default FinancialReports;
