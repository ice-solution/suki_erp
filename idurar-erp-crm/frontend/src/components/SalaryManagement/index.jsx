import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  InputNumber, 
  Select, 
  message, 
  Space, 
  Tag, 
  Row, 
  Col, 
  Statistic,
  Divider,
  Popconfirm,
  DatePicker,
  Drawer,
  List,
  Badge
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  DollarOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useMoney } from '@/settings';
import { request } from '@/request';
import dayjs from 'dayjs';

const { Option } = Select;

export default function SalaryManagement({ projectId, workProgressList = [] }) {
  const { moneyFormatter } = useMoney();
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSalary, setEditingSalary] = useState(null);
  const [form] = Form.useForm();
  const [contractorEmployees, setContractorEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  
  // 打咭記錄相關狀態
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceDrawerVisible, setAttendanceDrawerVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [attendanceForm] = Form.useForm();
  const [recalculating, setRecalculating] = useState(false);

  // 從 WorkProgress 中提取已分配的員工
  const assignedEmployees = workProgressList
    .filter(wp => wp.contractorEmployee)
    .map(wp => wp.contractorEmployee)
    .filter((employee, index, self) => 
      index === self.findIndex(e => e._id === employee._id)
    );

  useEffect(() => {
    if (projectId) {
      fetchSalaries();
      fetchContractorEmployees();
    }
  }, [projectId]);

  const fetchSalaries = async () => {
    try {
      setLoading(true);
      const response = await request.read({ entity: 'project', id: projectId });
      if (response.success) {
        setSalaries(response.result.salaries || []);
      }
    } catch (error) {
      console.error('Error fetching salaries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContractorEmployees = async () => {
    try {
      setEmployeesLoading(true);
      const response = await request.listAll({ entity: 'contractoremployee' });
      if (response.success) {
        setContractorEmployees(response.result || []);
      }
    } catch (error) {
      console.error('Error fetching contractor employees:', error);
    } finally {
      setEmployeesLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingSalary(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingSalary(record);
    form.setFieldsValue({
      contractorEmployee: record.contractorEmployee._id,
      dailySalary: record.dailySalary,
      notes: record.notes
      // 工作天數會根據打咭記錄自動計算，不需要設置
    });
    setModalVisible(true);
  };

  const handleSave = async (values) => {
    try {
      // 工作天數和總工資會根據打咭記錄自動計算，不需要前端傳送
      const salaryData = {
        contractorEmployee: values.contractorEmployee,
        dailySalary: values.dailySalary,
        notes: values.notes
      };

      if (editingSalary) {
        // 更新現有記錄
        const response = await request.patch({ 
          entity: `project/${projectId}/salary/${editingSalary._id}`, 
          jsonData: salaryData 
        });
        if (response.success) {
          message.success('人工記錄更新成功');
        }
      } else {
        // 創建新記錄
        const response = await request.post({ 
          entity: `project/${projectId}/salary`, 
          jsonData: salaryData 
        });
        if (response.success) {
          message.success('人工記錄創建成功');
        }
      }
      
      setModalVisible(false);
      fetchSalaries();
    } catch (error) {
      message.error(editingSalary ? '更新失敗' : '創建失敗');
      console.error('Error saving salary:', error);
    }
  };

  // 打咭記錄相關函數
  const fetchAttendanceRecords = async (employeeId = null) => {
    try {
      const params = employeeId ? { contractorEmployee: employeeId } : {};
      const response = await request.get({ 
        entity: `project/${projectId}/attendance`,
        params 
      });
      if (response.success) {
        setAttendanceRecords(response.result);
      }
    } catch (error) {
      console.error('獲取打咭記錄失敗:', error);
    }
  };

  const handleViewAttendance = async (employee) => {
    setSelectedEmployee(employee);
    await fetchAttendanceRecords(employee._id);
    setAttendanceDrawerVisible(true);
  };

  const handleAddAttendance = (employee = null) => {
    setSelectedEmployee(employee);
    attendanceForm.resetFields();
    attendanceForm.setFieldsValue({
      contractorEmployee: employee?._id,
      checkInDate: dayjs()
    });
    setAttendanceModalVisible(true);
  };

  const handleSaveAttendance = async (values) => {
    try {
      const attendanceData = {
        contractorEmployee: values.contractorEmployee,
        checkInDate: values.checkInDate.format('YYYY-MM-DD'),
        notes: values.notes
      };

      const response = await request.post({ 
        entity: `project/${projectId}/attendance`, 
        jsonData: attendanceData 
      });
      
      if (response.success) {
        message.success('打咭記錄添加成功');
        setAttendanceModalVisible(false);
        // 刷新打咭記錄列表
        fetchAttendanceRecords(selectedEmployee?._id);
        // 刷新工資列表以更新工作天數
        fetchSalaries();
      }
    } catch (error) {
      console.error('添加打咭記錄失敗:', error);
      message.error('添加打咭記錄失敗');
    }
  };

  const handleDelete = async (salaryId) => {
    try {
      const response = await request.delete({ 
        entity: `project/${projectId}/salary/${salaryId}` 
      });
      if (response.success) {
        message.success('人工記錄刪除成功');
        fetchSalaries();
      }
    } catch (error) {
      message.error('刪除失敗');
      console.error('Error deleting salary:', error);
    }
  };

  // 重新計算工作天數
  const handleRecalculateWorkDays = async () => {
    try {
      setRecalculating(true);
      const response = await request.post({ 
        entity: `project/${projectId}/recalculate-workdays` 
      });
      if (response.success) {
        message.success('工作天數重新計算成功');
        fetchSalaries();
      } else {
        message.error('重新計算失敗：' + (response.message || '未知錯誤'));
      }
    } catch (error) {
      console.error('重新計算工作天數失敗:', error);
      message.error('重新計算失敗');
    } finally {
      setRecalculating(false);
    }
  };

  // 計算總人工成本
  const totalSalaryCost = salaries.reduce((sum, salary) => sum + (salary.totalSalary || 0), 0);

  // 表格列定義
  const columns = [
    {
      title: '員工',
      dataIndex: 'contractorEmployee',
      key: 'contractorEmployee',
      render: (employee) => {
        if (!employee) return '-';
        return (
          <div>
            <Tag 
              color="blue" 
              icon={<UserOutlined />}
              style={{ cursor: 'pointer' }}
              onClick={() => handleViewAttendance(employee)}
            >
              {employee.name}
            </Tag>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {employee.contractor?.name || ''}
            </div>
            <div style={{ fontSize: '11px', color: '#1890ff', marginTop: '2px' }}>
              點擊查看打咭記錄
            </div>
          </div>
        );
      },
    },
    {
      title: '日薪',
      dataIndex: 'dailySalary',
      key: 'dailySalary',
      render: (amount) => moneyFormatter({ amount }),
      sorter: (a, b) => a.dailySalary - b.dailySalary,
    },
    {
      title: '工作天數',
      dataIndex: 'workDays',
      key: 'workDays',
      render: (days) => `${days} 天`,
      sorter: (a, b) => a.workDays - b.workDays,
    },
    {
      title: '總人工',
      dataIndex: 'totalSalary',
      key: 'totalSalary',
      render: (amount) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
          {moneyFormatter({ amount })}
        </span>
      ),
      sorter: (a, b) => a.totalSalary - b.totalSalary,
    },
    {
      title: '備註',
      dataIndex: 'notes',
      key: 'notes',
      render: (notes) => notes || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
            size="small"
          >
            編輯
          </Button>
          <Button 
            type="link" 
            icon={<ClockCircleOutlined />} 
            onClick={() => handleAddAttendance(record.contractorEmployee)}
            size="small"
          >
            打咭
          </Button>
          <Popconfirm
            title="確定要刪除這條人工記錄嗎？"
            onConfirm={() => handleDelete(record._id)}
            okText="確定"
            cancelText="取消"
          >
            <Button 
              type="link" 
              danger 
              icon={<DeleteOutlined />} 
              size="small"
            >
              刪除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card 
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DollarOutlined />
          <span>人工管理</span>
        </div>
      }
      size="small"
      extra={
        <Space>
          <Button 
            icon={<ClockCircleOutlined />} 
            onClick={handleRecalculateWorkDays}
            size="small"
            loading={recalculating}
          >
            重新計算工作天數
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleCreate}
            size="small"
          >
            添加人工記錄
          </Button>
        </Space>
      }
    >
      {/* 統計信息 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col span={8}>
          <Statistic 
            title="總人工成本" 
            value={totalSalaryCost} 
            formatter={(value) => moneyFormatter({ amount: value })}
            valueStyle={{ color: '#1890ff' }}
          />
        </Col>
        <Col span={8}>
          <Statistic 
            title="記錄數量" 
            value={salaries.length} 
            suffix="條"
          />
        </Col>
        <Col span={8}>
          <Statistic 
            title="已分配員工" 
            value={assignedEmployees.length} 
            suffix="人"
          />
        </Col>
      </Row>

      <Divider />

      {/* 已分配員工列表 */}
      {assignedEmployees.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h4>已分配員工列表：</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {assignedEmployees.map((employee) => {
              const hasSalary = salaries.some(s => s.contractorEmployee._id === employee._id);
              return (
                <Tag 
                  key={employee._id}
                  color={hasSalary ? 'green' : 'orange'}
                  icon={hasSalary ? <DollarOutlined /> : <UserOutlined />}
                >
                  {employee.name} {hasSalary ? '(已設人工)' : '(未設人工)'}
                </Tag>
              );
            })}
          </div>
        </div>
      )}

      {/* 人工記錄表格 */}
      <Table
        dataSource={salaries}
        columns={columns}
        loading={loading}
        pagination={false}
        size="small"
        rowKey="_id"
        locale={{ emptyText: '暫無人工記錄' }}
      />

      {/* 添加/編輯模態框 */}
      <Modal
        title={editingSalary ? '編輯人工記錄' : '添加人工記錄'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Form.Item
            name="contractorEmployee"
            label="選擇員工"
            rules={[{ required: true, message: '請選擇員工' }]}
          >
            <Select
              placeholder="選擇員工"
              loading={employeesLoading}
              showSearch
              filterOption={(input, option) =>
                option?.children?.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {contractorEmployees.map(employee => (
                <Option key={employee._id} value={employee._id}>
                  {employee.name} ({employee.contractor?.name || '無承包商'})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="dailySalary"
            label="日薪"
            rules={[{ required: true, message: '請輸入日薪' }]}
          >
            <InputNumber
              placeholder="輸入日薪"
              min={0}
              precision={2}
              style={{ width: '100%' }}
              addonBefore="$"
            />
          </Form.Item>

          <Form.Item
            name="notes"
            label="備註"
          >
            <Input.TextArea
              placeholder="輸入備註（可選）"
              rows={3}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 打咭記錄抽屜 */}
      <Drawer
        title={`${selectedEmployee?.name || ''} 的打咭記錄`}
        placement="right"
        width={600}
        open={attendanceDrawerVisible}
        onClose={() => setAttendanceDrawerVisible(false)}
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => handleAddAttendance(selectedEmployee)}
          >
            添加打咭記錄
          </Button>
        }
      >
        <List
          dataSource={attendanceRecords}
          renderItem={(record) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Badge status="success" />}
                title={
                  <div>
                    <CalendarOutlined style={{ marginRight: 8 }} />
                    {dayjs(record.checkInDate).format('YYYY-MM-DD')}
                  </div>
                }
                description={
                  <div>
                    {record.workHours > 0 && (
                      <div style={{ color: '#1890ff' }}>
                        工作時數: {record.workHours.toFixed(1)} 小時
                      </div>
                    )}
                    {record.notes && (
                      <div style={{ color: '#666', fontSize: '12px' }}>
                        備註: {record.notes}
                      </div>
                    )}
                  </div>
                }
              />
            </List.Item>
          )}
          locale={{ emptyText: '暫無打咭記錄' }}
        />
      </Drawer>

      {/* 添加打咭記錄模態框 */}
      <Modal
        title="添加打咭記錄"
        open={attendanceModalVisible}
        onCancel={() => setAttendanceModalVisible(false)}
        onOk={() => attendanceForm.submit()}
        width={500}
      >
        <Form
          form={attendanceForm}
          layout="vertical"
          onFinish={handleSaveAttendance}
        >
          <Form.Item
            name="contractorEmployee"
            label="員工"
            rules={[{ required: true, message: '請選擇員工' }]}
          >
            <Select
              placeholder="選擇員工"
              loading={employeesLoading}
              showSearch
              filterOption={(input, option) =>
                option?.children?.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {contractorEmployees.map(employee => (
                <Option key={employee._id} value={employee._id}>
                  {employee.name} ({employee.contractor?.name || '無承包商'})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="checkInDate"
            label="打咭日期"
            rules={[{ required: true, message: '請選擇打咭日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="notes"
            label="備註"
          >
            <Input.TextArea
              placeholder="輸入備註（可選）"
              rows={3}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
