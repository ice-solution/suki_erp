import React, { useEffect, useState } from 'react';
import { 
  Table, 
  Button, 
  message, 
  Modal, 
  Form, 
  Input, 
  Select, 
  InputNumber, 
  Switch, 
  Tag, 
  Space,
  Card,
  Row,
  Col,
  Statistic,
  Tree,
  Tabs
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  BankOutlined,
  AccountBookOutlined,
  CalculatorOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;
const { TabPane } = Tabs;

const ChartOfAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [hierarchy, setHierarchy] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('list');

  useEffect(() => {
    fetchAccounts();
    fetchHierarchy();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/chart-of-accounts');
      setAccounts(res.data.result.docs || []);
    } catch (err) {
      message.error('載入會計科目失敗');
    } finally {
      setLoading(false);
    }
  };

  const fetchHierarchy = async () => {
    try {
      const res = await axios.get('/chart-of-accounts/hierarchy');
      setHierarchy(res.data.result.hierarchy || []);
      setSummary(res.data.result.summary || {});
    } catch (err) {
      message.error('載入科目階層失敗');
    }
  };

  const handleCreate = () => {
    setEditingAccount(null);
    setModalVisible(true);
    form.resetFields();
    form.setFieldsValue({
      level: 1,
      isDetailAccount: true,
      allowManualEntry: true,
      showInBalanceSheet: true,
      showInIncomeStatement: true,
      status: 'active',
      openingBalance: 0
    });
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setModalVisible(true);
    form.setFieldsValue({
      ...account,
      parentAccount: account.parentAccount?._id,
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingAccount) {
        await axios.put(`/chart-of-accounts/${editingAccount._id}`, values);
        message.success('科目更新成功');
      } else {
        await axios.post('/chart-of-accounts', values);
        message.success('科目創建成功');
      }
      
      setModalVisible(false);
      fetchAccounts();
      fetchHierarchy();
    } catch (err) {
      message.error('操作失敗: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/chart-of-accounts/${id}`);
      message.success('科目刪除成功');
      fetchAccounts();
      fetchHierarchy();
    } catch (err) {
      message.error('刪除失敗: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleCreateDefault = async () => {
    try {
      await axios.post('/chart-of-accounts/create-default');
      message.success('預設科目表創建成功');
      fetchAccounts();
      fetchHierarchy();
    } catch (err) {
      message.error('創建失敗: ' + (err.response?.data?.message || err.message));
    }
  };

  const accountTypeMap = {
    asset: { text: '資產', color: 'blue' },
    liability: { text: '負債', color: 'red' },
    equity: { text: '權益', color: 'green' },
    revenue: { text: '收入', color: 'cyan' },
    expense: { text: '費用', color: 'orange' }
  };

  const accountSubTypeMap = {
    current_asset: '流動資產',
    fixed_asset: '固定資產',
    intangible_asset: '無形資產',
    investment: '投資',
    current_liability: '流動負債',
    long_term_liability: '長期負債',
    owner_equity: '業主權益',
    retained_earnings: '保留盈餘',
    operating_revenue: '營業收入',
    other_revenue: '其他收入',
    cost_of_goods_sold: '銷貨成本',
    operating_expense: '營業費用',
    financial_expense: '財務費用',
    other_expense: '其他費用'
  };

  const columns = [
    {
      title: '科目代碼',
      dataIndex: 'accountCode',
      key: 'accountCode',
      width: 120,
      sorter: (a, b) => a.accountCode.localeCompare(b.accountCode),
    },
    {
      title: '科目名稱',
      dataIndex: 'accountName',
      key: 'accountName',
      width: 200,
    },
    {
      title: '科目類型',
      dataIndex: 'accountType',
      key: 'accountType',
      width: 100,
      render: (type) => {
        const typeInfo = accountTypeMap[type];
        return <Tag color={typeInfo?.color}>{typeInfo?.text || type}</Tag>;
      },
    },
    {
      title: '子類型',
      dataIndex: 'accountSubType',
      key: 'accountSubType',
      width: 120,
      render: (subType) => accountSubTypeMap[subType] || subType,
    },
    {
      title: '正常餘額',
      dataIndex: 'normalBalance',
      key: 'normalBalance',
      width: 100,
      render: (balance) => (
        <Tag color={balance === 'debit' ? 'green' : 'blue'}>
          {balance === 'debit' ? '借方' : '貸方'}
        </Tag>
      ),
    },
    {
      title: '當前餘額',
      dataIndex: 'currentBalance',
      key: 'currentBalance',
      width: 120,
      align: 'right',
      render: (balance) => balance?.toLocaleString() || '0',
    },
    {
      title: '層級',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      align: 'center',
    },
    {
      title: '明細科目',
      dataIndex: 'isDetailAccount',
      key: 'isDetailAccount',
      width: 100,
      render: (isDetail) => (
        <Tag color={isDetail ? 'green' : 'orange'}>
          {isDetail ? '是' : '否'}
        </Tag>
      ),
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status) => {
        const statusMap = {
          active: { text: '啟用', color: 'green' },
          inactive: { text: '停用', color: 'red' },
          archived: { text: '封存', color: 'gray' }
        };
        const statusInfo = statusMap[status];
        return <Tag color={statusInfo?.color}>{statusInfo?.text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="link" 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            編輯
          </Button>
          <Button 
            type="link" 
            size="small" 
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              Modal.confirm({
                title: '確認刪除',
                content: `確定要刪除科目「${record.accountName}」嗎？`,
                onOk: () => handleDelete(record._id),
              });
            }}
          >
            刪除
          </Button>
        </Space>
      ),
    },
  ];

  // 轉換階層數據為樹形結構
  const convertToTreeData = (accounts) => {
    return accounts.map(account => ({
      key: account._id,
      title: (
        <span>
          <strong>{account.accountCode}</strong> - {account.accountName}
          <Tag color={accountTypeMap[account.accountType]?.color} style={{ marginLeft: 8 }}>
            {accountTypeMap[account.accountType]?.text}
          </Tag>
          {account.currentBalance !== 0 && (
            <span style={{ marginLeft: 8, color: '#666' }}>
              餘額: {account.currentBalance?.toLocaleString()}
            </span>
          )}
        </span>
      ),
      children: account.children && account.children.length > 0 ? convertToTreeData(account.children) : undefined
    }));
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>會計科目管理</h2>
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleCreate}
            >
              新增科目
            </Button>
            <Button 
              icon={<AccountBookOutlined />} 
              onClick={handleCreateDefault}
            >
              創建預設科目表
            </Button>
          </Space>
        </div>

        {/* 統計卡片 */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="科目總數"
                value={summary.totalAccounts || 0}
                prefix={<CalculatorOutlined />}
              />
            </Card>
          </Col>
          {Object.entries(summary.accountTypes || {}).map(([type, data]) => (
            <Col span={4} key={type}>
              <Card>
                <Statistic
                  title={accountTypeMap[type]?.text}
                  value={data.count}
                  suffix={`項`}
                  valueStyle={{ color: accountTypeMap[type]?.color === 'blue' ? '#1890ff' : '#3f8600' }}
                />
              </Card>
            </Col>
          ))}
        </Row>

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="科目列表" key="list">
            <Table
              columns={columns}
              dataSource={accounts}
              rowKey="_id"
              loading={loading}
              pagination={{
                pageSize: 50,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 項，共 ${total} 項`,
              }}
              scroll={{ x: 1200 }}
            />
          </TabPane>
          <TabPane tab="科目階層" key="hierarchy">
            <Tree
              treeData={convertToTreeData(hierarchy)}
              defaultExpandAll
              showLine={{ showLeafIcon: false }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* 創建/編輯Modal */}
      <Modal
        title={editingAccount ? '編輯科目' : '新增科目'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        width={800}
        okText="確定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                label="科目代碼" 
                name="accountCode" 
                rules={[{ required: true, message: '請輸入科目代碼' }]}
              >
                <Input placeholder="例如：1001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                label="科目名稱" 
                name="accountName" 
                rules={[{ required: true, message: '請輸入科目名稱' }]}
              >
                <Input placeholder="例如：現金" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                label="科目類型" 
                name="accountType" 
                rules={[{ required: true, message: '請選擇科目類型' }]}
              >
                <Select placeholder="選擇科目類型">
                  {Object.entries(accountTypeMap).map(([key, value]) => (
                    <Option key={key} value={key}>{value.text}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                label="子類型" 
                name="accountSubType" 
                rules={[{ required: true, message: '請選擇子類型' }]}
              >
                <Select placeholder="選擇子類型">
                  {Object.entries(accountSubTypeMap).map(([key, value]) => (
                    <Option key={key} value={key}>{value}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                label="正常餘額方向" 
                name="normalBalance" 
                rules={[{ required: true, message: '請選擇正常餘額方向' }]}
              >
                <Select placeholder="選擇餘額方向">
                  <Option value="debit">借方</Option>
                  <Option value="credit">貸方</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="期初餘額" name="openingBalance">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="層級" name="level">
                <InputNumber min={1} max={5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="明細科目" name="isDetailAccount" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="允許手動記帳" name="allowManualEntry" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="描述" name="description">
            <Input.TextArea rows={2} placeholder="科目描述" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ChartOfAccounts;
