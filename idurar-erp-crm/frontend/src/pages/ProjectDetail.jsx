import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Table, Button, message, Modal, Form, Select, Card, Row, Col, Tag, InputNumber, Input, DatePicker, Tabs, Statistic, TimePicker, Progress } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [outboundRecords, setOutboundRecords] = useState([]);
  const [returnRecords, setReturnRecords] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventoryDetails, setInventoryDetails] = useState(null);
  const [projectEmployees, setProjectEmployees] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [contractorEmployees, setContractorEmployees] = useState([]);
  const [workProcessStats, setWorkProcessStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [outboundModalVisible, setOutboundModalVisible] = useState(false);
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [employeeModalVisible, setEmployeeModalVisible] = useState(false);
  const [modalType, setModalType] = useState(''); // 'invoice' or 'quote'
  const [form] = Form.useForm();
  const [outboundForm] = Form.useForm();
  const [returnForm] = Form.useForm();
  const [attendanceForm] = Form.useForm();
  const [employeeForm] = Form.useForm();

  useEffect(() => {
    fetchProject();
    fetchInvoices();
    fetchQuotes();
    fetchOutboundRecords();
    fetchReturnRecords();
    fetchInventoryItems();
    fetchProjectEmployees();
    fetchAttendanceRecords();
    fetchContractorEmployees();
    fetchWorkProcessStats();
  }, [id]);

  const fetchProject = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/project/${id}`);
      setProject(res.data);
    } catch (err) {
      message.error('載入項目失敗');
    }
    setLoading(false);
  };

  const fetchInvoices = async () => {
    try {
      const res = await axios.get('/invoice/listAll');
      setInvoices(res.data.result || []);
    } catch (err) {
      message.error('載入發票失敗');
    }
  };

  const fetchQuotes = async () => {
    try {
      const res = await axios.get('/quote/listAll');
      setQuotes(res.data.result || []);
    } catch (err) {
      message.error('載入報價單失敗');
    }
  };

  const fetchOutboundRecords = async () => {
    try {
      const res = await axios.get(`/project-outbound/project/${id}`);
      setOutboundRecords(res.data.result || []);
    } catch (err) {
      message.error('載入出庫記錄失敗');
    }
  };

  const fetchReturnRecords = async () => {
    try {
      const res = await axios.get(`/project-return/project/${id}`);
      setReturnRecords(res.data.result || []);
    } catch (err) {
      message.error('載入退回記錄失敗');
    }
  };

  const fetchInventoryItems = async () => {
    try {
      const res = await axios.get('/inventory');
      setInventoryItems(res.data || []);
    } catch (err) {
      message.error('載入庫存項目失敗');
    }
  };

  const fetchInventoryDetails = async () => {
    try {
      const res = await axios.get(`/project-inventory/project/${id}/details`);
      setInventoryDetails(res.data.result);
    } catch (err) {
      message.error('載入庫存明細失敗');
    }
  };

  const fetchProjectEmployees = async () => {
    try {
      const res = await axios.get(`/project-employee/project/${id}`);
      setProjectEmployees(res.data.result || []);
    } catch (err) {
      message.error('載入項目員工失敗');
    }
  };

  const fetchAttendanceRecords = async () => {
    try {
      const res = await axios.get(`/attendance/project/${id}`);
      setAttendanceRecords(res.data.result?.records || []);
    } catch (err) {
      message.error('載入考勤記錄失敗');
    }
  };

  const fetchContractorEmployees = async () => {
    try {
      const res = await axios.get('/contractor-employee');
      setContractorEmployees(res.data || []);
    } catch (err) {
      message.error('載入員工列表失敗');
    }
  };

  const fetchWorkProcessStats = async () => {
    try {
      const res = await axios.get(`/work-process/project/${id}`);
      setWorkProcessStats(res.data.result?.statistics || {});
    } catch (err) {
      // 如果沒有工序數據，不顯示錯誤
      setWorkProcessStats({});
    }
  };

  const handleLinkInvoice = () => {
    setModalType('invoice');
    setModalVisible(true);
    form.resetFields();
  };

  const handleLinkQuote = () => {
    setModalType('quote');
    setModalVisible(true);
    form.resetFields();
  };

  const handleCreateOutbound = () => {
    setOutboundModalVisible(true);
    outboundForm.resetFields();
    outboundForm.setFieldsValue({
      outboundDate: dayjs(),
      items: [{}]
    });
  };

  const handleOutboundSubmit = async () => {
    try {
      const values = await outboundForm.validateFields();
      const outboundData = {
        project: id,
        outboundDate: values.outboundDate.toDate(),
        items: values.items.filter(item => item.inventory && item.quantity > 0),
        notes: values.notes || ''
      };

      await axios.post('/project-outbound', outboundData);
      message.success('出庫記錄創建成功');
      setOutboundModalVisible(false);
      fetchOutboundRecords();
    } catch (err) {
      message.error('創建出庫記錄失敗: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleConfirmOutbound = async (recordId) => {
    try {
      await axios.patch(`/project-outbound/${recordId}/confirm`);
      message.success('出庫確認成功，庫存已扣減');
      fetchOutboundRecords();
    } catch (err) {
      message.error('確認出庫失敗: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleCreateReturn = () => {
    setReturnModalVisible(true);
    returnForm.resetFields();
    returnForm.setFieldsValue({
      returnDate: dayjs(),
      items: [{}]
    });
  };

  const handleReturnSubmit = async () => {
    try {
      const values = await returnForm.validateFields();
      const returnData = {
        project: id,
        returnDate: values.returnDate.toDate(),
        items: values.items.filter(item => item.inventory && item.quantity > 0),
        notes: values.notes || ''
      };

      await axios.post('/project-return', returnData);
      message.success('退回記錄創建成功');
      setReturnModalVisible(false);
      fetchReturnRecords();
    } catch (err) {
      message.error('創建退回記錄失敗: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleConfirmReturn = async (recordId) => {
    try {
      await axios.patch(`/project-return/${recordId}/confirm`);
      message.success('退回確認成功，庫存已增加');
      fetchReturnRecords();
    } catch (err) {
      message.error('確認退回失敗: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleViewDetails = async () => {
    setDetailsModalVisible(true);
    await fetchInventoryDetails();
  };

  const handleViewWorkProcess = () => {
    navigate(`/work-process/${id}`);
  };

  // 當從工序頁面返回時，刷新統計數據
  useEffect(() => {
    const handleFocus = () => {
      fetchWorkProcessStats();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [id]);

  const handleAddEmployee = () => {
    setEmployeeModalVisible(true);
    employeeForm.resetFields();
  };

  const handleEmployeeSubmit = async () => {
    try {
      const values = await employeeForm.validateFields();
      const employeeData = {
        project: id,
        employee: values.employee,
        position: values.position,
        dailyWage: values.dailyWage,
        startDate: values.startDate?.toDate() || new Date(),
        notes: values.notes || ''
      };

      await axios.post('/project-employee', employeeData);
      message.success('員工添加成功');
      setEmployeeModalVisible(false);
      fetchProjectEmployees();
    } catch (err) {
      message.error('添加員工失敗: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleAddAttendance = () => {
    setAttendanceModalVisible(true);
    attendanceForm.resetFields();
    attendanceForm.setFieldsValue({
      date: dayjs(),
    });
  };

  const handleAttendanceSubmit = async () => {
    try {
      const values = await attendanceForm.validateFields();
      const attendanceData = {
        projectEmployee: values.projectEmployee,
        date: values.date.toDate(),
        status: values.status,
        clockIn: values.clockIn?.toDate(),
        clockOut: values.clockOut?.toDate(),
        workDescription: values.workDescription || '',
        notes: values.notes || ''
      };

      await axios.post('/attendance', attendanceData);
      message.success('考勤記錄創建成功');
      setAttendanceModalVisible(false);
      fetchAttendanceRecords();
    } catch (err) {
      message.error('創建考勤記錄失敗: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleConfirmAttendance = async (recordId) => {
    try {
      await axios.patch(`/attendance/${recordId}/confirm`);
      message.success('考勤記錄確認成功');
      fetchAttendanceRecords();
    } catch (err) {
      message.error('確認考勤記錄失敗: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSubmit = async () => {
    form.validateFields().then(async (values) => {
      try {
        if (modalType === 'invoice') {
          await axios.patch(`/invoice/linkProject/${values.documentId}`, {
            project: id
          });
          message.success('發票關聯成功');
        } else {
          await axios.patch(`/quote/linkProject/${values.documentId}`, {
            project: id
          });
          message.success('報價單關聯成功');
        }
        setModalVisible(false);
        fetchInvoices();
        fetchQuotes();
      } catch (err) {
        console.error('關聯失敗:', err);
        message.error('關聯失敗: ' + (err.response?.data?.message || err.message));
      }
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'in_progress': return 'blue';
      case 'completed': return 'green';
      case 'cancelled': return 'red';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return '待處理';
      case 'in_progress': return '進行中';
      case 'completed': return '已完成';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  const invoiceColumns = [
    { title: '發票編號', dataIndex: 'number', key: 'number' },
    { title: '客戶', dataIndex: 'client', key: 'client', render: (client) => client?.name || '-' },
    { title: '日期', dataIndex: 'date', key: 'date', render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '-' },
    { title: '總額', dataIndex: 'total', key: 'total', render: (total) => total?.toLocaleString() },
    { title: '狀態', dataIndex: 'paymentStatus', key: 'paymentStatus' },
  ];

  const quoteColumns = [
    { title: '報價單編號', dataIndex: 'number', key: 'number' },
    { title: '客戶', dataIndex: 'client', key: 'client', render: (client) => client?.name || '-' },
    { title: '日期', dataIndex: 'date', key: 'date', render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '-' },
    { title: '總額', dataIndex: 'total', key: 'total', render: (total) => total?.toLocaleString() },
    { title: '狀態', dataIndex: 'status', key: 'status' },
  ];

  const outboundColumns = [
    { title: '出庫單號', dataIndex: 'outboundNumber', key: 'outboundNumber' },
    { title: '出庫日期', dataIndex: 'outboundDate', key: 'outboundDate', render: (date) => dayjs(date).format('YYYY-MM-DD') },
    { title: '總金額', dataIndex: 'totalAmount', key: 'totalAmount', render: (amount) => `$${amount?.toLocaleString()}` },
    { 
      title: '狀態', 
      dataIndex: 'status', 
      key: 'status', 
      render: (status) => {
        const statusMap = {
          pending: { color: 'orange', text: '待確認' },
          confirmed: { color: 'green', text: '已確認' },
          cancelled: { color: 'red', text: '已取消' }
        };
        const statusInfo = statusMap[status] || { color: 'default', text: status };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        record.status === 'pending' && (
          <Button 
            type="primary" 
            size="small" 
            onClick={() => handleConfirmOutbound(record._id)}
          >
            確認出庫
          </Button>
        )
      ),
    },
  ];

  const returnColumns = [
    { title: '退回單號', dataIndex: 'returnNumber', key: 'returnNumber' },
    { title: '退回日期', dataIndex: 'returnDate', key: 'returnDate', render: (date) => dayjs(date).format('YYYY-MM-DD') },
    { title: '總金額', dataIndex: 'totalAmount', key: 'totalAmount', render: (amount) => `$${amount?.toLocaleString()}` },
    { 
      title: '狀態', 
      dataIndex: 'status', 
      key: 'status', 
      render: (status) => {
        const statusMap = {
          pending: { color: 'orange', text: '待確認' },
          confirmed: { color: 'green', text: '已確認' },
          cancelled: { color: 'red', text: '已取消' }
        };
        const statusInfo = statusMap[status] || { color: 'default', text: status };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        record.status === 'pending' && (
          <Button 
            type="primary" 
            size="small" 
            onClick={() => handleConfirmReturn(record._id)}
          >
            確認退回
          </Button>
        )
      ),
    },
  ];

  const employeeColumns = [
    { title: '員工姓名', dataIndex: ['employee', 'name'], key: 'employeeName' },
    { title: '職位', dataIndex: 'position', key: 'position' },
    { title: '日工資', dataIndex: 'dailyWage', key: 'dailyWage', render: (wage) => `$${wage?.toLocaleString()}` },
    { title: '開始日期', dataIndex: 'startDate', key: 'startDate', render: (date) => dayjs(date).format('YYYY-MM-DD') },
    { 
      title: '狀態', 
      dataIndex: 'status', 
      key: 'status', 
      render: (status) => {
        const statusMap = {
          active: { color: 'green', text: '在職' },
          inactive: { color: 'red', text: '離職' },
          completed: { color: 'blue', text: '完成' }
        };
        const statusInfo = statusMap[status] || { color: 'default', text: status };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      }
    },
  ];

  const attendanceColumns = [
    { title: '日期', dataIndex: 'date', key: 'date', render: (date) => dayjs(date).format('YYYY-MM-DD') },
    { title: '員工', dataIndex: ['projectEmployee', 'employee', 'name'], key: 'employeeName' },
    { 
      title: '狀態', 
      dataIndex: 'status', 
      key: 'status', 
      render: (status) => {
        const statusMap = {
          present: { color: 'green', text: '出席' },
          absent: { color: 'red', text: '缺席' },
          half_day: { color: 'orange', text: '半天' },
          overtime: { color: 'blue', text: '加班' },
          sick: { color: 'yellow', text: '病假' },
          vacation: { color: 'purple', text: '假期' }
        };
        const statusInfo = statusMap[status] || { color: 'default', text: status };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      }
    },
    { title: '工作時數', dataIndex: 'hoursWorked', key: 'hoursWorked', render: (hours) => hours ? `${hours}小時` : '-' },
    { title: '總薪資', dataIndex: 'totalPay', key: 'totalPay', render: (pay) => `$${pay?.toLocaleString()}` },
    { 
      title: '已確認', 
      dataIndex: 'confirmed', 
      key: 'confirmed', 
      render: (confirmed) => 
        <Tag color={confirmed ? 'green' : 'orange'}>{confirmed ? '已確認' : '待確認'}</Tag>
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        !record.confirmed && (
          <Button 
            type="primary" 
            size="small" 
            onClick={() => handleConfirmAttendance(record._id)}
          >
            確認
          </Button>
        )
      ),
    },
  ];

  if (!project) return <div>載入中...</div>;

  const projectInvoices = invoices.filter(invoice => invoice.project === id);
  const projectQuotes = quotes.filter(quote => quote.project === id);

  return (
    <div>
      <h2>項目詳情</h2>
      
      <Card title="項目資訊" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <p><strong>訂單編號:</strong> {project.orderNumber}</p>
            <p><strong>類型:</strong> {project.type}</p>
            <p><strong>承辦商:</strong> {project.contractor?.name}</p>
          </Col>
          <Col span={8}>
            <p><strong>開始日期:</strong> {project.startDate ? dayjs(project.startDate).format('YYYY-MM-DD') : '-'}</p>
            <p><strong>結束日期:</strong> {project.endDate ? dayjs(project.endDate).format('YYYY-MM-DD') : '-'}</p>
            <p><strong>成本:</strong> {project.cost?.toLocaleString()}</p>
          </Col>
          <Col span={8}>
            <p><strong>承辦商成本:</strong> {project.contractorCost?.toLocaleString()}</p>
            <p><strong>創建者:</strong> {project.createdBy?.name}</p>
            <p><strong>狀態:</strong> <Tag color={getStatusColor(project.status)}>{getStatusText(project.status)}</Tag></p>
          </Col>
        </Row>
        
        {/* 項目進度條 */}
        {workProcessStats.total > 0 && (
          <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#fafafa', borderRadius: '6px' }}>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '16px', fontWeight: '500' }}>工程進度</span>
              <Button 
                type="link" 
                size="small" 
                style={{ float: 'right', padding: 0 }}
                onClick={handleViewWorkProcess}
              >
                查看詳細 →
              </Button>
            </div>
            <Progress 
              percent={workProcessStats.averageProgress || 0}
              strokeWidth={8}
              status={workProcessStats.overdue > 0 ? 'exception' : workProcessStats.averageProgress === 100 ? 'success' : 'active'}
              format={(percent) => `${percent}%`}
            />
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginTop: '8px',
              fontSize: '12px',
              color: '#666'
            }}>
              <span>已完成 {workProcessStats.completed || 0}/{workProcessStats.total || 0} 個工序</span>
              <span>
                {workProcessStats.overdue > 0 && (
                  <span style={{ color: '#ff4d4f' }}>
                    {workProcessStats.overdue} 個超期
                  </span>
                )}
                {workProcessStats.overdue === 0 && workProcessStats.averageProgress === 100 && (
                  <span style={{ color: '#52c41a' }}>已完成</span>
                )}
                {workProcessStats.overdue === 0 && workProcessStats.averageProgress < 100 && workProcessStats.averageProgress > 0 && (
                  <span style={{ color: '#1890ff' }}>進行中</span>
                )}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* 發票和報價單行 */}
      <Row gutter={16} style={{ marginBottom: '16px' }}>
        <Col span={12}>
          <Card 
            title="關聯發票" 
            extra={<Button type="primary" onClick={handleLinkInvoice}>關聯發票</Button>}
          >
            <Table
              columns={invoiceColumns}
              dataSource={projectInvoices}
              rowKey="_id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card 
            title="關聯報價單" 
            extra={<Button type="primary" onClick={handleLinkQuote}>關聯報價單</Button>}
          >
            <Table
              columns={quoteColumns}
              dataSource={projectQuotes}
              rowKey="_id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      {/* 出庫和退回行 */}
      <Row gutter={16}>
        <Col span={12}>
          <Card 
            title="項目出庫" 
            extra={<Button type="primary" onClick={handleCreateOutbound}>新增出庫</Button>}
          >
            <Table
              columns={outboundColumns}
              dataSource={outboundRecords}
              rowKey="_id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card 
            title="項目退回" 
            extra={<Button type="primary" onClick={handleCreateReturn}>新增退回</Button>}
          >
            <Table
              columns={returnColumns}
              dataSource={returnRecords}
              rowKey="_id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      {/* 管理功能行 */}
      <Row gutter={16} style={{ marginTop: '16px' }}>
        <Col span={12}>
          <Card 
            title="庫存流動管理" 
            extra={<Button type="default" onClick={handleViewDetails}>查看詳細記錄</Button>}
          >
            <p>點擊「查看詳細記錄」可查看項目的完整出入庫明細和統計信息</p>
          </Card>
        </Col>
        <Col span={12}>
          <Card 
            title="工程進度管理" 
            extra={<Button type="primary" onClick={handleViewWorkProcess}>管理工程進度</Button>}
          >
            <p>點擊「管理工程進度」可查看和管理項目的工序進度、時間安排和完成情況</p>
          </Card>
        </Col>
      </Row>

      {/* 考勤管理行 */}
      <Row gutter={16} style={{ marginTop: '16px' }}>
        <Col span={12}>
          <Card 
            title="項目員工" 
            extra={<Button type="primary" onClick={handleAddEmployee}>添加員工</Button>}
          >
            <Table
              columns={employeeColumns}
              dataSource={projectEmployees}
              rowKey="_id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card 
            title="考勤記錄" 
            extra={<Button type="primary" onClick={handleAddAttendance}>新增考勤</Button>}
          >
            <Table
              columns={attendanceColumns}
              dataSource={attendanceRecords}
              rowKey="_id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title={`關聯${modalType === 'invoice' ? '發票' : '報價單'}`}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText="關聯"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item 
            label={`選擇${modalType === 'invoice' ? '發票' : '報價單'}`} 
            name="documentId" 
            rules={[{ required: true, message: `請選擇${modalType === 'invoice' ? '發票' : '報價單'}` }]}
          > 
            <Select placeholder={`請選擇${modalType === 'invoice' ? '發票' : '報價單'}`}>
              {(modalType === 'invoice' ? invoices : quotes)
                .filter(doc => !doc.project || doc.project === id)
                .map(doc => (
                  <Select.Option key={doc._id} value={doc._id}>
                    {doc.number} - {doc.client?.name}
                  </Select.Option>
                ))
              }
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="新增出庫記錄"
        open={outboundModalVisible}
        onCancel={() => setOutboundModalVisible(false)}
        onOk={handleOutboundSubmit}
        okText="創建出庫"
        cancelText="取消"
        width={800}
      >
        <Form form={outboundForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                label="出庫日期" 
                name="outboundDate" 
                rules={[{ required: true, message: '請選擇出庫日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="備註" name="notes">
                <Input.TextArea rows={2} placeholder="出庫備註..." />
              </Form.Item>
            </Col>
          </Row>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Row key={key} gutter={16} align="middle">
                    <Col span={8}>
                      <Form.Item
                        {...restField}
                        name={[name, 'inventory']}
                        label="庫存項目"
                        rules={[{ required: true, message: '請選擇庫存項目' }]}
                      >
                        <Select
                          placeholder="選擇庫存項目"
                          showSearch
                          filterOption={(input, option) =>
                            option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                          }
                        >
                          {inventoryItems.map(item => (
                            <Select.Option key={item._id} value={item._id}>
                              {item.name} (庫存: {item.quantity} {item.unit})
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item
                        {...restField}
                        name={[name, 'quantity']}
                        label="出庫數量"
                        rules={[{ required: true, message: '請輸入出庫數量' }]}
                      >
                        <InputNumber min={0.01} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        {...restField}
                        name={[name, 'notes']}
                        label="備註"
                      >
                        <Input placeholder="項目備註..." />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Button 
                        type="link" 
                        danger 
                        onClick={() => remove(name)}
                        style={{ marginTop: '30px' }}
                      >
                        刪除
                      </Button>
                    </Col>
                  </Row>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block>
                    + 添加出庫項目
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      <Modal
        title="新增退回記錄"
        open={returnModalVisible}
        onCancel={() => setReturnModalVisible(false)}
        onOk={handleReturnSubmit}
        okText="創建退回"
        cancelText="取消"
        width={800}
      >
        <Form form={returnForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                label="退回日期" 
                name="returnDate" 
                rules={[{ required: true, message: '請選擇退回日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="備註" name="notes">
                <Input.TextArea rows={2} placeholder="退回備註..." />
              </Form.Item>
            </Col>
          </Row>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Row key={key} gutter={16} align="middle">
                    <Col span={8}>
                      <Form.Item
                        {...restField}
                        name={[name, 'inventory']}
                        label="庫存項目"
                        rules={[{ required: true, message: '請選擇庫存項目' }]}
                      >
                        <Select
                          placeholder="選擇庫存項目"
                          showSearch
                          filterOption={(input, option) =>
                            option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                          }
                        >
                          {inventoryItems.map(item => (
                            <Select.Option key={item._id} value={item._id}>
                              {item.name} (庫存: {item.quantity} {item.unit})
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item
                        {...restField}
                        name={[name, 'quantity']}
                        label="退回數量"
                        rules={[{ required: true, message: '請輸入退回數量' }]}
                      >
                        <InputNumber min={0.01} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        {...restField}
                        name={[name, 'notes']}
                        label="備註"
                      >
                        <Input placeholder="項目備註..." />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Button 
                        type="link" 
                        danger 
                        onClick={() => remove(name)}
                        style={{ marginTop: '30px' }}
                      >
                        刪除
                      </Button>
                    </Col>
                  </Row>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block>
                    + 添加退回項目
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* 庫存明細Modal */}
      <Modal
        title="項目庫存流動明細"
        open={detailsModalVisible}
        onCancel={() => setDetailsModalVisible(false)}
        footer={null}
        width={1200}
      >
        {inventoryDetails && (
          <Tabs defaultActiveKey="1">
            <Tabs.TabPane tab="流動明細" key="1">
              <Table
                columns={[
                  { title: '日期', dataIndex: 'date', key: 'date', render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm') },
                  { title: '類型', dataIndex: 'typeName', key: 'typeName', render: (type, record) => 
                    <Tag color={record.type === 'outbound' ? 'red' : 'green'}>{type}</Tag> 
                  },
                  { title: '單據號', dataIndex: 'recordNumber', key: 'recordNumber' },
                  { title: '物料名稱', dataIndex: ['inventory', 'name'], key: 'inventoryName' },
                  { title: '數量', dataIndex: 'quantity', key: 'quantity', render: (qty, record) => 
                    `${record.type === 'outbound' ? '-' : '+'}${qty} ${record.inventory.unit}` 
                  },
                  { title: '單價', dataIndex: 'unitCost', key: 'unitCost', render: (cost) => `$${cost?.toLocaleString()}` },
                  { title: '總額', dataIndex: 'totalCost', key: 'totalCost', render: (cost) => `$${cost?.toLocaleString()}` },
                  { title: '操作人', dataIndex: 'operator', key: 'operator' },
                  { title: '備註', dataIndex: 'notes', key: 'notes' },
                ]}
                dataSource={inventoryDetails.details}
                rowKey={(record) => `${record.recordId}-${record.inventory._id}`}
                pagination={{ pageSize: 10 }}
                size="small"
              />
            </Tabs.TabPane>
            <Tabs.TabPane tab="統計匯總" key="2">
              <Row gutter={16} style={{ marginBottom: '16px' }}>
                <Col span={6}>
                  <Statistic title="總出庫次數" value={inventoryDetails.summary.totalOutbound} />
                </Col>
                <Col span={6}>
                  <Statistic title="總退回次數" value={inventoryDetails.summary.totalReturn} />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="總出庫金額" 
                    value={inventoryDetails.summary.totalOutboundAmount} 
                    prefix="$" 
                    precision={2}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="總退回金額" 
                    value={inventoryDetails.summary.totalReturnAmount} 
                    prefix="$" 
                    precision={2}
                  />
                </Col>
              </Row>
              <Table
                columns={[
                  { title: '物料名稱', dataIndex: ['inventory', 'name'], key: 'inventoryName' },
                  { title: '類別', dataIndex: ['inventory', 'category'], key: 'category' },
                  { title: '單位', dataIndex: ['inventory', 'unit'], key: 'unit' },
                  { title: '出庫數量', dataIndex: 'outboundQuantity', key: 'outboundQuantity', render: (qty, record) => 
                    `${qty} ${record.inventory.unit}` 
                  },
                  { title: '退回數量', dataIndex: 'returnQuantity', key: 'returnQuantity', render: (qty, record) => 
                    `${qty} ${record.inventory.unit}` 
                  },
                  { title: '淨使用量', dataIndex: 'netQuantity', key: 'netQuantity', render: (qty, record) => 
                    <span style={{ color: qty > 0 ? '#f5222d' : qty < 0 ? '#52c41a' : '#000' }}>
                      {qty > 0 ? '-' : qty < 0 ? '+' : ''}{Math.abs(qty)} {record.inventory.unit}
                    </span>
                  },
                  { title: '出庫金額', dataIndex: 'outboundAmount', key: 'outboundAmount', render: (amount) => 
                    `$${amount?.toLocaleString()}` 
                  },
                  { title: '退回金額', dataIndex: 'returnAmount', key: 'returnAmount', render: (amount) => 
                    `$${amount?.toLocaleString()}` 
                  },
                  { title: '淨金額', dataIndex: 'netAmount', key: 'netAmount', render: (amount) => 
                    <span style={{ color: amount > 0 ? '#f5222d' : amount < 0 ? '#52c41a' : '#000' }}>
                      ${amount?.toLocaleString()}
                    </span>
                  },
                ]}
                dataSource={inventoryDetails.summary.inventoryItems}
                rowKey={(record) => record.inventory._id}
                pagination={false}
                size="small"
              />
            </Tabs.TabPane>
          </Tabs>
        )}
      </Modal>

      {/* 添加員工Modal */}
      <Modal
        title="添加項目員工"
        open={employeeModalVisible}
        onCancel={() => setEmployeeModalVisible(false)}
        onOk={handleEmployeeSubmit}
        okText="添加員工"
        cancelText="取消"
      >
        <Form form={employeeForm} layout="vertical">
          <Form.Item 
            label="選擇員工" 
            name="employee" 
            rules={[{ required: true, message: '請選擇員工' }]}
          >
            <Select placeholder="請選擇員工">
              {contractorEmployees.map(emp => (
                <Select.Option key={emp._id} value={emp._id}>
                  {emp.name} - {emp.position || '未指定職位'}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item 
            label="項目職位" 
            name="position" 
            rules={[{ required: true, message: '請輸入項目職位' }]}
          >
            <Input placeholder="如：工程師、項目經理等" />
          </Form.Item>
          <Form.Item 
            label="日工資" 
            name="dailyWage" 
            rules={[{ required: true, message: '請輸入日工資' }]}
          >
            <InputNumber 
              min={0} 
              style={{ width: '100%' }} 
              placeholder="每日工資金額"
              prefix="$"
            />
          </Form.Item>
          <Form.Item 
            label="開始日期" 
            name="startDate"
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="備註" name="notes">
            <Input.TextArea rows={3} placeholder="其他說明..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* 新增考勤Modal */}
      <Modal
        title="新增考勤記錄"
        open={attendanceModalVisible}
        onCancel={() => setAttendanceModalVisible(false)}
        onOk={handleAttendanceSubmit}
        okText="創建考勤"
        cancelText="取消"
      >
        <Form form={attendanceForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                label="選擇員工" 
                name="projectEmployee" 
                rules={[{ required: true, message: '請選擇員工' }]}
              >
                <Select placeholder="請選擇項目員工">
                  {projectEmployees.filter(emp => emp.status === 'active').map(emp => (
                    <Select.Option key={emp._id} value={emp._id}>
                      {emp.employee?.name} - {emp.position}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                label="考勤日期" 
                name="date" 
                rules={[{ required: true, message: '請選擇考勤日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item 
                label="出席狀態" 
                name="status" 
                rules={[{ required: true, message: '請選擇出席狀態' }]}
              >
                <Select placeholder="選擇狀態">
                  <Select.Option value="present">出席</Select.Option>
                  <Select.Option value="absent">缺席</Select.Option>
                  <Select.Option value="half_day">半天</Select.Option>
                  <Select.Option value="overtime">加班</Select.Option>
                  <Select.Option value="sick">病假</Select.Option>
                  <Select.Option value="vacation">假期</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="上班時間" name="clockIn">
                <TimePicker style={{ width: '100%' }} format="HH:mm" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="下班時間" name="clockOut">
                <TimePicker style={{ width: '100%' }} format="HH:mm" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="工作描述" name="workDescription">
            <Input.TextArea rows={3} placeholder="今日工作內容..." />
          </Form.Item>
          <Form.Item label="備註" name="notes">
            <Input.TextArea rows={2} placeholder="其他備註..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectDetail; 