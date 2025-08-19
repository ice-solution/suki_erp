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
  DatePicker, 
  Tag, 
  Space,
  Card,
  Row,
  Col,
  Statistic,
  Tabs,
  Divider
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  CheckOutlined,
  UndoOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Option } = Select;
const { TabPane } = Tabs;

const JournalEntries = () => {
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchEntries();
    fetchAccounts();
    fetchPeriods();
  }, []);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/journal-entry');
      setEntries(res.data.result.docs || []);
    } catch (err) {
      message.error('載入會計分錄失敗');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await axios.get('/chart-of-accounts?isDetailAccount=true&limit=1000');
      setAccounts(res.data.result.docs || []);
    } catch (err) {
      message.error('載入會計科目失敗');
    }
  };

  const fetchPeriods = async () => {
    try {
      // 這裡需要會計期間的API
      setPeriods([]);
    } catch (err) {
      console.log('No periods API yet');
    }
  };

  const handleCreate = () => {
    setEditingEntry(null);
    setModalVisible(true);
    form.resetFields();
    form.setFieldsValue({
      transactionDate: dayjs(),
      entryType: 'manual',
      entries: [{ debitAccount: null, creditAccount: null, amount: 0, description: '' }]
    });
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setModalVisible(true);
    form.setFieldsValue({
      ...entry,
      transactionDate: dayjs(entry.transactionDate),
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const submitData = {
        ...values,
        transactionDate: values.transactionDate.toDate(),
      };
      
      if (editingEntry) {
        await axios.put(`/journal-entry/${editingEntry._id}`, submitData);
        message.success('分錄更新成功');
      } else {
        await axios.post('/journal-entry', submitData);
        message.success('分錄創建成功');
      }
      
      setModalVisible(false);
      fetchEntries();
    } catch (err) {
      message.error('操作失敗: ' + (err.response?.data?.message || err.message));
    }
  };

  const handlePost = async (id) => {
    try {
      await axios.patch(`/journal-entry/${id}/post`);
      message.success('分錄過帳成功');
      fetchEntries();
    } catch (err) {
      message.error('過帳失敗: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleReverse = async (id) => {
    Modal.confirm({
      title: '沖銷分錄',
      content: (
        <div>
          <p>確定要沖銷此分錄嗎？</p>
          <Input.TextArea 
            placeholder="請輸入沖銷原因" 
            onChange={(e) => {
              Modal.destroyAll();
              Modal.confirm({
                title: '確認沖銷',
                content: `沖銷原因：${e.target.value}`,
                onOk: async () => {
                  try {
                    await axios.patch(`/journal-entry/${id}/reverse`, { reason: e.target.value });
                    message.success('分錄沖銷成功');
                    fetchEntries();
                  } catch (err) {
                    message.error('沖銷失敗: ' + (err.response?.data?.message || err.message));
                  }
                }
              });
            }}
          />
        </div>
      ),
    });
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/journal-entry/${id}`);
      message.success('分錄刪除成功');
      fetchEntries();
    } catch (err) {
      message.error('刪除失敗: ' + (err.response?.data?.message || err.message));
    }
  };

  const statusMap = {
    draft: { text: '草稿', color: 'orange' },
    posted: { text: '已過帳', color: 'green' },
    reversed: { text: '已沖銷', color: 'red' },
    cancelled: { text: '已取消', color: 'gray' }
  };

  const entryTypeMap = {
    manual: '手動',
    automatic: '自動',
    adjustment: '調整',
    closing: '結帳'
  };

  const columns = [
    {
      title: '分錄編號',
      dataIndex: 'entryNumber',
      key: 'entryNumber',
      width: 150,
    },
    {
      title: '交易日期',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      width: 120,
      render: (date) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '類型',
      dataIndex: 'entryType',
      key: 'entryType',
      width: 80,
      render: (type) => entryTypeMap[type] || type,
    },
    {
      title: '摘要',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '總金額',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      align: 'right',
      render: (amount) => amount?.toLocaleString() || '0',
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const statusInfo = statusMap[status];
        return <Tag color={statusInfo?.color}>{statusInfo?.text}</Tag>;
      },
    },
    {
      title: '創建者',
      dataIndex: ['createdBy', 'name'],
      key: 'createdBy',
      width: 100,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          {record.status === 'draft' && (
            <>
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
                icon={<CheckOutlined />}
                onClick={() => handlePost(record._id)}
              >
                過帳
              </Button>
              <Button 
                type="link" 
                size="small" 
                danger
                icon={<DeleteOutlined />}
                onClick={() => {
                  Modal.confirm({
                    title: '確認刪除',
                    content: `確定要刪除分錄「${record.entryNumber}」嗎？`,
                    onOk: () => handleDelete(record._id),
                  });
                }}
              >
                刪除
              </Button>
            </>
          )}
          {record.status === 'posted' && (
            <Button 
              type="link" 
              size="small" 
              icon={<UndoOutlined />}
              onClick={() => handleReverse(record._id)}
            >
              沖銷
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>會計分錄管理</h2>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleCreate}
          >
            新增分錄
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={entries}
          rowKey="_id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 項，共 ${total} 項`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 創建/編輯Modal */}
      <Modal
        title={editingEntry ? '編輯分錄' : '新增分錄'}
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
                label="交易日期" 
                name="transactionDate" 
                rules={[{ required: true, message: '請選擇交易日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                label="分錄類型" 
                name="entryType" 
                rules={[{ required: true, message: '請選擇分錄類型' }]}
              >
                <Select>
                  <Option value="manual">手動</Option>
                  <Option value="automatic">自動</Option>
                  <Option value="adjustment">調整</Option>
                  <Option value="closing">結帳</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item 
            label="摘要" 
            name="description" 
            rules={[{ required: true, message: '請輸入摘要' }]}
          >
            <Input placeholder="分錄摘要說明" />
          </Form.Item>

          <Divider>分錄明細</Divider>

          <Form.List name="entries">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Card key={key} size="small" style={{ marginBottom: 16 }}>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          name={[name, 'debitAccount']}
                          label="借方科目"
                        >
                          <Select 
                            placeholder="選擇借方科目" 
                            showSearch
                            optionFilterProp="children"
                            allowClear
                          >
                            {accounts.map(account => (
                              <Option key={account._id} value={account._id}>
                                {account.accountCode} - {account.accountName}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          name={[name, 'creditAccount']}
                          label="貸方科目"
                        >
                          <Select 
                            placeholder="選擇貸方科目" 
                            showSearch
                            optionFilterProp="children"
                            allowClear
                          >
                            {accounts.map(account => (
                              <Option key={account._id} value={account._id}>
                                {account.accountCode} - {account.accountName}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'amount']}
                          label="金額"
                          rules={[{ required: true, message: '請輸入金額' }]}
                        >
                          <InputNumber 
                            style={{ width: '100%' }} 
                            min={0} 
                            precision={2}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={2}>
                        <Form.Item label=" ">
                          <Button type="link" onClick={() => remove(name)} danger>
                            刪除
                          </Button>
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item
                      {...restField}
                      name={[name, 'description']}
                      label="說明"
                      rules={[{ required: true, message: '請輸入說明' }]}
                    >
                      <Input placeholder="分錄說明" />
                    </Form.Item>
                  </Card>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    新增分錄行
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Form.Item label="備註" name="notes">
            <Input.TextArea rows={2} placeholder="其他備註" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default JournalEntries;
