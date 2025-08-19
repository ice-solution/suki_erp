import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Table, 
  Button, 
  message, 
  Modal, 
  Form, 
  Input, 
  DatePicker, 
  Select, 
  InputNumber, 
  Progress, 
  Tag, 
  Row, 
  Col, 
  Card, 
  Statistic,
  Upload,
  Image,
  List,
  Avatar,
  Tabs,
  Space
} from 'antd';
import { PlusOutlined, EyeOutlined, UploadOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const WorkProcessList = () => {
  const { projectId } = useParams();
  const [workProcesses, setWorkProcesses] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [projectEmployees, setProjectEmployees] = useState([]);
  const [progressRecords, setProgressRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [progressModalVisible, setProgressModalVisible] = useState(false);
  const [progressRecordModalVisible, setProgressRecordModalVisible] = useState(false);
  const [progressDetailModalVisible, setProgressDetailModalVisible] = useState(false);
  const [editingProcess, setEditingProcess] = useState(null);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [imageList, setImageList] = useState([]);
  const [form] = Form.useForm();
  const [progressForm] = Form.useForm();
  const [progressRecordForm] = Form.useForm();

  useEffect(() => {
    if (projectId) {
      fetchWorkProcesses();
      fetchProjectEmployees();
    }
  }, [projectId]);

  const fetchWorkProcesses = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/work-process/project/${projectId}`);
      setWorkProcesses(res.data.result?.processes || []);
      setStatistics(res.data.result?.statistics || {});
    } catch (err) {
      message.error('載入工序列表失敗');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectEmployees = async () => {
    try {
      const res = await axios.get(`/project-employee/project/${projectId}`);
      setProjectEmployees(res.data.result || []);
    } catch (err) {
      message.error('載入項目員工失敗');
    }
  };

  const handleCreate = () => {
    setEditingProcess(null);
    setModalVisible(true);
    form.resetFields();
    form.setFieldsValue({
      plannedStartDate: dayjs(),
      plannedEndDate: dayjs().add(7, 'day'),
      category: 'other',
      priority: 'medium',
      progress: 0
    });
  };

  const handleEdit = (process) => {
    setEditingProcess(process);
    setModalVisible(true);
    form.setFieldsValue({
      ...process,
      plannedStartDate: dayjs(process.plannedStartDate),
      plannedEndDate: dayjs(process.plannedEndDate),
      actualStartDate: process.actualStartDate ? dayjs(process.actualStartDate) : null,
      actualEndDate: process.actualEndDate ? dayjs(process.actualEndDate) : null,
      assignedTo: process.assignedTo?.map(emp => emp._id) || [], // 正確設置負責人員ID陣列
    });
  };

  const handleDelete = async (processId) => {
    try {
      await axios.delete(`/work-process/${processId}`);
      message.success('工序刪除成功');
      fetchWorkProcesses();
    } catch (err) {
      message.error('刪除工序失敗: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const processData = {
        ...values,
        project: projectId,
        plannedStartDate: values.plannedStartDate.toDate(),
        plannedEndDate: values.plannedEndDate.toDate(),
        actualStartDate: values.actualStartDate?.toDate(),
        actualEndDate: values.actualEndDate?.toDate(),
      };

      if (editingProcess) {
        await axios.put(`/work-process/${editingProcess._id}`, processData);
        message.success('工序更新成功');
      } else {
        await axios.post('/work-process', processData);
        message.success('工序創建成功');
      }
      
      setModalVisible(false);
      fetchWorkProcesses();
    } catch (err) {
      message.error(editingProcess ? '更新工序失敗' : '創建工序失敗');
    }
  };

  const handleProgressUpdate = (process) => {
    setEditingProcess(process);
    setProgressModalVisible(true);
    progressForm.setFieldsValue({
      progress: process.progress,
      actualHours: process.actualHours,
      actualCost: process.actualCost,
      notes: process.notes
    });
  };

  const handleProgressSubmit = async () => {
    try {
      const values = await progressForm.validateFields();
      await axios.patch(`/work-process/${editingProcess._id}/progress`, values);
      message.success('進度更新成功');
      setProgressModalVisible(false);
      fetchWorkProcesses();
    } catch (err) {
      message.error('更新進度失敗: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleCreateProgressRecord = (process) => {
    setSelectedProcess(process);
    setProgressRecordModalVisible(true);
    setImageList([]);
    progressRecordForm.resetFields();
    progressRecordForm.setFieldsValue({
      recordDate: dayjs(),
      submittedBy: projectEmployees.find(emp => emp.status === 'active')?._id,
    });
  };

  const handleProgressRecordSubmit = async () => {
    try {
      const values = await progressRecordForm.validateFields();
      const recordData = {
        workProcess: selectedProcess._id,
        project: projectId,
        recordDate: values.recordDate.toDate(),
        submittedBy: values.submittedBy,
        workDescription: values.workDescription,
        completedWork: values.completedWork,
        progressIncrement: values.progressIncrement || 0,
        hoursWorked: values.hoursWorked,
        materialsUsed: values.materialsUsed || [],
        location: values.location || '',
        qualityCheck: values.qualityCheck || { status: 'not_applicable' },
      };

      const response = await axios.post('/work-progress-record', recordData);
      
      // 如果有圖片，上傳圖片
      if (imageList.length > 0) {
        const formData = new FormData();
        imageList.forEach(file => {
          formData.append('images', file.originFileObj);
        });
        
        await axios.post(`/work-progress-record/${response.data.result._id}/upload-images`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      message.success('進度記錄提交成功');
      setProgressRecordModalVisible(false);
      fetchWorkProcesses();
    } catch (err) {
      message.error('提交進度記錄失敗: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleViewProgressDetails = async (process) => {
    setSelectedProcess(process);
    try {
      const res = await axios.get(`/work-progress-record/work-process/${process._id}`);
      setProgressRecords(res.data.result?.records || []);
      setProgressDetailModalVisible(true);
    } catch (err) {
      message.error('載入進度記錄失敗');
    }
  };

  const columns = [
    {
      title: '序號',
      dataIndex: 'sequence',
      key: 'sequence',
      width: 80,
      sorter: (a, b) => a.sequence - b.sequence,
    },
    {
      title: '工序名稱',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '計劃開始',
      dataIndex: 'plannedStartDate',
      key: 'plannedStartDate',
      render: (date) => dayjs(date).format('YYYY-MM-DD'),
      width: 110,
    },
    {
      title: '計劃完成',
      dataIndex: 'plannedEndDate',
      key: 'plannedEndDate',
      render: (date) => dayjs(date).format('YYYY-MM-DD'),
      width: 110,
    },
    {
      title: '進度',
      dataIndex: 'progress',
      key: 'progress',
      width: 120,
      render: (progress) => (
        <Progress 
          percent={progress} 
          size="small" 
          status={progress === 100 ? 'success' : 'active'}
        />
      ),
    },
    {
      title: '負責人員',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
      width: 150,
      render: (assignedTo) => {
        if (!assignedTo || assignedTo.length === 0) return '-';
        return (
          <div>
            {assignedTo.map((emp, index) => (
              <Tag key={emp._id || index} size="small" style={{ marginBottom: '2px' }}>
                {emp.employee?.name || '未知'}
              </Tag>
            ))}
          </div>
        );
      },
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status, record) => {
        const statusMap = {
          pending: { color: 'default', text: '待開始' },
          in_progress: { color: 'processing', text: '進行中' },
          completed: { color: 'success', text: '已完成' },
          delayed: { color: 'error', text: '延遲' },
          cancelled: { color: 'default', text: '已取消' }
        };
        const statusInfo = statusMap[status] || { color: 'default', text: status };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
    {
      title: '優先級',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority) => {
        const priorityMap = {
          low: { color: 'default', text: '低' },
          medium: { color: 'processing', text: '中' },
          high: { color: 'warning', text: '高' },
          critical: { color: 'error', text: '緊急' }
        };
        const priorityInfo = priorityMap[priority] || { color: 'default', text: priority };
        return <Tag color={priorityInfo.color}>{priorityInfo.text}</Tag>;
      },
    },
    {
      title: '剩餘天數',
      key: 'remainingDays',
      width: 100,
      render: (_, record) => {
        if (record.status === 'completed') return '-';
        const remaining = record.remainingDays;
        return (
          <span style={{ color: remaining < 0 ? '#ff4d4f' : remaining <= 3 ? '#faad14' : '#52c41a' }}>
            {remaining < 0 ? `超期${Math.abs(remaining)}天` : `${remaining}天`}
          </span>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 300,
      render: (_, record) => (
        <Space size="small" wrap>
          <Button size="small" onClick={() => handleEdit(record)}>
            編輯
          </Button>
          <Button 
            size="small" 
            onClick={() => handleProgressUpdate(record)}
          >
            更新進度
          </Button>
          <Button 
            size="small" 
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleCreateProgressRecord(record)}
          >
            記錄進度
          </Button>
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleViewProgressDetails(record)}
          >
            查看記錄
          </Button>
          <Button 
            size="small" 
            danger 
            onClick={() => handleDelete(record._id)}
          >
            刪除
          </Button>
        </Space>
      ),
    },
  ];

  // 獲取行樣式，超期的行顯示紅色背景
  const getRowClassName = (record) => {
    if (record.isOverdue && record.status !== 'completed') {
      return 'overdue-row';
    }
    return '';
  };

  return (
    <div style={{ padding: '24px' }}>
      <style>
        {`
          .overdue-row {
            background-color: #fff2f0 !important;
          }
          .overdue-row:hover {
            background-color: #ffe7e0 !important;
          }
        `}
      </style>
      
      {/* 整體進度條 */}
      <Card style={{ marginBottom: '16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0 }}>項目整體進度</h3>
        </div>
        <Progress 
          percent={statistics.averageProgress || 0}
          size="large"
          strokeWidth={12}
          status={statistics.overdue > 0 ? 'exception' : statistics.averageProgress === 100 ? 'success' : 'active'}
          format={(percent) => (
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
              {percent}%
            </span>
          )}
        />
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginTop: '8px',
          fontSize: '14px',
          color: '#666'
        }}>
          <span>已完成: {statistics.completed || 0}/{statistics.total || 0} 個工序</span>
          <span>
            {statistics.overdue > 0 && (
              <span style={{ color: '#ff4d4f' }}>
                {statistics.overdue} 個工序超期
              </span>
            )}
            {statistics.overdue === 0 && statistics.averageProgress === 100 && (
              <span style={{ color: '#52c41a' }}>
                項目已完成！
              </span>
            )}
            {statistics.overdue === 0 && statistics.averageProgress < 100 && (
              <span style={{ color: '#1890ff' }}>
                進行中
              </span>
            )}
          </span>
        </div>
      </Card>

      <Row gutter={16} style={{ marginBottom: '16px' }}>
        <Col span={6}>
          <Card>
            <Statistic title="總工序數" value={statistics.total} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="整體進度" 
              value={statistics.averageProgress} 
              suffix="%" 
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="已完成" 
              value={statistics.completed} 
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="超期工序" 
              value={statistics.overdue} 
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="工程進度列表"
        extra={
          <Button type="primary" onClick={handleCreate}>
            新增工序
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={workProcesses}
          rowKey="_id"
          loading={loading}
          rowClassName={getRowClassName}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 項，共 ${total} 項`,
          }}
          scroll={{ x: 1600 }}
        />
      </Card>

      {/* 創建/編輯工序Modal */}
      <Modal
        title={editingProcess ? '編輯工序' : '新增工序'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        width={800}
        okText={editingProcess ? '更新' : '創建'}
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                label="工序名稱" 
                name="name" 
                rules={[{ required: true, message: '請輸入工序名稱' }]}
              >
                <Input placeholder="輸入工序名稱" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                label="序號" 
                name="sequence" 
                rules={[{ required: true, message: '請輸入序號' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} placeholder="工序詳細描述" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                label="計劃開始日期" 
                name="plannedStartDate" 
                rules={[{ required: true, message: '請選擇計劃開始日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                label="計劃完成日期" 
                name="plannedEndDate" 
                rules={[{ required: true, message: '請選擇計劃完成日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="類別" name="category">
                <Select>
                  <Select.Option value="design">設計</Select.Option>
                  <Select.Option value="construction">施工</Select.Option>
                  <Select.Option value="testing">測試</Select.Option>
                  <Select.Option value="documentation">文檔</Select.Option>
                  <Select.Option value="other">其他</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="優先級" name="priority">
                <Select>
                  <Select.Option value="low">低</Select.Option>
                  <Select.Option value="medium">中</Select.Option>
                  <Select.Option value="high">高</Select.Option>
                  <Select.Option value="critical">緊急</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="預計工時" name="estimatedHours">
                <InputNumber min={0} style={{ width: '100%' }} addonAfter="小時" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="預算成本" name="budgetCost">
                <InputNumber min={0} style={{ width: '100%' }} prefix="$" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="負責人員" name="assignedTo">
                <Select mode="multiple" placeholder="選擇負責人員">
                  {projectEmployees.filter(emp => emp.status === 'active').map(emp => (
                    <Select.Option key={emp._id} value={emp._id}>
                      {emp.employee?.name} - {emp.position}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="備註" name="notes">
            <Input.TextArea rows={2} placeholder="其他說明" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 更新進度Modal */}
      <Modal
        title="更新工序進度"
        open={progressModalVisible}
        onCancel={() => setProgressModalVisible(false)}
        onOk={handleProgressSubmit}
        okText="更新"
        cancelText="取消"
      >
        <Form form={progressForm} layout="vertical">
          <Form.Item 
            label="進度 (%)" 
            name="progress" 
            rules={[{ required: true, message: '請輸入進度' }]}
          >
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="實際工時" name="actualHours">
            <InputNumber min={0} style={{ width: '100%' }} addonAfter="小時" />
          </Form.Item>
          <Form.Item label="實際成本" name="actualCost">
            <InputNumber min={0} style={{ width: '100%' }} prefix="$" />
          </Form.Item>
          <Form.Item label="備註" name="notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 進度記錄Modal */}
      <Modal
        title={`記錄工序進度 - ${selectedProcess?.name}`}
        open={progressRecordModalVisible}
        onCancel={() => setProgressRecordModalVisible(false)}
        onOk={handleProgressRecordSubmit}
        okText="提交記錄"
        cancelText="取消"
        width={800}
      >
        <Form form={progressRecordForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                label="記錄日期" 
                name="recordDate" 
                rules={[{ required: true, message: '請選擇記錄日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                label="提交人員" 
                name="submittedBy" 
                rules={[{ required: true, message: '請選擇提交人員' }]}
              >
                <Select placeholder="選擇負責人員">
                  {projectEmployees.filter(emp => emp.status === 'active').map(emp => (
                    <Select.Option key={emp._id} value={emp._id}>
                      {emp.employee?.name} - {emp.position}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item 
            label="工作描述" 
            name="workDescription" 
            rules={[{ required: true, message: '請輸入工作描述' }]}
          >
            <Input.TextArea rows={2} placeholder="簡述今天的主要工作內容" />
          </Form.Item>

          <Form.Item 
            label="完成的工作" 
            name="completedWork" 
            rules={[{ required: true, message: '請輸入完成的工作' }]}
          >
            <Input.TextArea rows={3} placeholder="詳細描述已完成的具體工作項目" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                label="進度增量 (%)" 
                name="progressIncrement"
              >
                <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="本次完成的進度百分比" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                label="工作時數" 
                name="hoursWorked" 
                rules={[{ required: true, message: '請輸入工作時數' }]}
              >
                <InputNumber min={0} max={24} step={0.5} style={{ width: '100%' }} addonAfter="小時" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="工作地點" name="location">
            <Input placeholder="工作地點" />
          </Form.Item>





          <Form.Item label="上傳工程照片">
            <Upload
              listType="picture-card"
              fileList={imageList}
              onChange={({ fileList }) => setImageList(fileList)}
              beforeUpload={() => false} // 禁止自動上傳
              accept="image/*"
            >
              {imageList.length >= 10 ? null : (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>上傳照片</div>
                </div>
              )}
            </Upload>
            <div style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}>
              支持 JPG、PNG 格式，最多上傳 10 張照片，每張不超過 5MB
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* 進度詳細記錄查看Modal */}
      <Modal
        title={`工序進度記錄 - ${selectedProcess?.name}`}
        open={progressDetailModalVisible}
        onCancel={() => setProgressDetailModalVisible(false)}
        footer={null}
        width={1000}
      >
        <List
          dataSource={progressRecords}
          renderItem={(record) => (
            <List.Item key={record._id}>
              <List.Item.Meta
                avatar={
                  <Avatar style={{ backgroundColor: '#1890ff' }}>
                    {record.submittedBy?.employee?.name?.charAt(0)}
                  </Avatar>
                }
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>
                      {record.submittedBy?.employee?.name} - {record.submittedBy?.position}
                    </span>
                    <div>
                      <Tag color={record.status === 'approved' ? 'green' : record.status === 'rejected' ? 'red' : 'orange'}>
                        {record.status === 'approved' ? '已審核' : record.status === 'rejected' ? '已拒絕' : '待審核'}
                      </Tag>
                      <span style={{ color: '#666', fontSize: '12px' }}>
                        {dayjs(record.recordDate).format('YYYY-MM-DD')}
                      </span>
                    </div>
                  </div>
                }
                description={
                  <div>
                    <p><strong>工作描述：</strong>{record.workDescription}</p>
                    <p><strong>完成工作：</strong>{record.completedWork}</p>
                    <Row gutter={16} style={{ marginTop: '8px' }}>
                      <Col span={6}>
                        <Statistic title="進度增量" value={record.progressIncrement} suffix="%" />
                      </Col>
                      <Col span={6}>
                        <Statistic title="工作時數" value={record.hoursWorked} suffix="小時" />
                      </Col>
                      <Col span={12}>
                        <Statistic title="工作地點" value={record.location || '-'} />
                      </Col>
                    </Row>


                    {record.images && record.images.length > 0 && (
                      <div style={{ marginTop: '8px' }}>
                        <strong>工程照片：</strong>
                        <div style={{ marginTop: '4px' }}>
                          <Image.PreviewGroup>
                            {record.images.map((image, index) => (
                              <Image
                                key={index}
                                width={60}
                                height={60}
                                src={image.path}
                                style={{ marginRight: '8px', objectFit: 'cover' }}
                              />
                            ))}
                          </Image.PreviewGroup>
                        </div>
                      </div>
                    )}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
};

export default WorkProcessList;
