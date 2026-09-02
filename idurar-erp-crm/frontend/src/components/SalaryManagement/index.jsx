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
import axios from 'axios';
import dayjs from 'dayjs';
import { useCanDeleteRecords } from '@/hooks/useCanDeleteRecords';

const { Option } = Select;

const isEmployedStatus = (employee) => (employee?.employmentStatus || '在職') === '在職';

export default function SalaryManagement({ projectId, workProgressList = [] }) {
  const showDelete = useCanDeleteRecords();
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
  const [editingAttendance, setEditingAttendance] = useState(null);
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
    const employee = record?.contractorEmployee || {};
    setEditingSalary(record);
    form.setFieldsValue({
      contractorEmployee: record.contractorEmployee._id,
      dailySalary: record.dailySalary,
      paidLeaveAmount: record.paidLeaveAmount ?? record.paidLeaveDays ?? 0,
      notes: record.notes,
      employmentStatus: employee.employmentStatus || '在職',
      resignationDate: employee.resignationDate ? dayjs(employee.resignationDate) : null,
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
        paidLeaveAmount: values.paidLeaveAmount || 0,
        notes: values.notes
      };

      if (editingSalary) {
        // 更新現有記錄
        const response = await request.patch({ 
          entity: `project/${projectId}/salary/${editingSalary._id}`, 
          jsonData: salaryData 
        });
        if (response.success) {
          // 同步更新判頭員工的離職狀態與日期
          const selectedEmployeeId = values.contractorEmployee;
          if (selectedEmployeeId) {
            await request.update({
              entity: 'contractoremployee',
              id: selectedEmployeeId,
              jsonData: {
                employmentStatus: values.employmentStatus || '在職',
                resignationDate:
                  values.employmentStatus === '離職' && values.resignationDate
                    ? values.resignationDate.toDate()
                    : null,
              },
            });
          }
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
    setEditingAttendance(null);
    attendanceForm.resetFields();
    attendanceForm.setFieldsValue({
      contractorEmployee: employee?._id,
      checkInDate: dayjs(),
      dayType: 'full',
    });
    setAttendanceModalVisible(true);
  };

  const handleEditAttendance = (record) => {
    setEditingAttendance(record);
    const empId = record.contractorEmployee?._id || record.contractorEmployee;
    attendanceForm.setFieldsValue({
      contractorEmployee: empId,
      checkInDate: record.checkInDate ? dayjs(record.checkInDate) : null,
      dayType: record.dayType === 'half' ? 'half' : 'full',
      notes: record.notes || '',
    });
    setAttendanceModalVisible(true);
  };

  const handleSaveAttendance = async (values) => {
    try {
      const dateKey = values.checkInDate.format('YYYY-MM-DD');
      const employeeId = values.contractorEmployee;
      const alreadyChecked = attendanceRecords.some((r) => {
        if (editingAttendance && String(r._id) === String(editingAttendance._id)) return false;
        const empId = r.contractorEmployee?._id || r.contractorEmployee;
        return (
          String(empId) === String(employeeId) &&
          dayjs(r.checkInDate).format('YYYY-MM-DD') === dateKey
        );
      });
      if (alreadyChecked) {
        message.error(`該員工在 ${dateKey} 已有打咭記錄，日期不可重複`);
        return;
      }

      const attendanceData = {
        contractorEmployee: employeeId,
        checkInDate: dateKey,
        dayType: values.dayType === 'half' ? 'half' : 'full',
        notes: values.notes,
      };

      let response;
      if (editingAttendance) {
        response = await request.patch({
          entity: `project/${projectId}/attendance/${editingAttendance._id}`,
          jsonData: attendanceData,
        });
      } else {
        response = await request.post({
          entity: `project/${projectId}/attendance`,
          jsonData: attendanceData,
        });
      }

      if (response.success) {
        message.success(editingAttendance ? '打咭記錄更新成功' : '打咭記錄添加成功');
        setAttendanceModalVisible(false);
        setEditingAttendance(null);
        fetchAttendanceRecords(selectedEmployee?._id);
        fetchSalaries();
      } else {
        message.error(
          response.message || (editingAttendance ? '更新打咭記錄失敗' : '添加打咭記錄失敗')
        );
      }
    } catch (error) {
      console.error('儲存打咭記錄失敗:', error);
      message.error(
        error?.response?.data?.message ||
          (editingAttendance ? '更新打咭記錄失敗' : '添加打咭記錄失敗')
      );
    }
  };

  const handleDeleteAttendance = async (attendanceId) => {
    try {
      const response = await axios.delete(
        `project/${projectId}/attendance/${attendanceId}`
      );
      if (response.data?.success) {
        message.success('打咭記錄刪除成功');
        fetchAttendanceRecords(selectedEmployee?._id);
        fetchSalaries();
      } else {
        message.error(response.data?.message || '刪除打咭記錄失敗');
      }
    } catch (error) {
      console.error('刪除打咭記錄失敗:', error);
      message.error(error?.response?.data?.message || '刪除打咭記錄失敗');
    }
  };

  const handleDelete = async (salaryId) => {
    try {
      const response = await axios.delete(`project/${projectId}/salary/${salaryId}`);
      if (response.data?.success) {
        message.success('人工記錄刪除成功');
        fetchSalaries();
      } else {
        message.error(response.data?.message || '刪除失敗');
      }
    } catch (error) {
      message.error(error?.response?.data?.message || '刪除失敗');
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
      title: '判頭員工是否離職',
      dataIndex: 'contractorEmployee',
      key: 'employmentStatus',
      render: (employee) => {
        const status = employee?.employmentStatus || '在職';
        const resigned = status === '離職';
        return (
          <Tag color={resigned ? 'red' : 'green'}>
            {resigned ? '離職' : '在職'}
          </Tag>
        );
      },
    },
    {
      title: '離職日期',
      dataIndex: 'contractorEmployee',
      key: 'resignationDate',
      render: (employee) => {
        if (!employee?.resignationDate) return '-';
        return dayjs(employee.resignationDate).format('YYYY-MM-DD');
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
      title: '有薪假期',
      dataIndex: 'paidLeaveAmount',
      key: 'paidLeaveAmount',
      render: (_, record) =>
        moneyFormatter({ amount: record.paidLeaveAmount ?? record.paidLeaveDays ?? 0 }),
      sorter: (a, b) =>
        (a.paidLeaveAmount ?? a.paidLeaveDays ?? 0) - (b.paidLeaveAmount ?? b.paidLeaveDays ?? 0),
    },
    {
      title: '工作天數',
      dataIndex: 'workDays',
      key: 'workDays',
      render: (days) => `${Number(days) || 0} 天`,
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
          {showDelete ? (
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
          ) : null}
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
              filterOption={(input, option) => {
                const q = String(input || '').toLowerCase();
                const text = option?.children != null ? String(option.children) : '';
                return text.toLowerCase().includes(q);
              }}
            >
              {contractorEmployees
                .filter((employee) => {
                  if (
                    editingSalary?.contractorEmployee &&
                    String(employee._id) === String(editingSalary.contractorEmployee._id)
                  ) {
                    return true;
                  }
                  return isEmployedStatus(employee);
                })
                .map((employee) => (
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
            name="paidLeaveAmount"
            label="有薪假期"
            initialValue={0}
            extra="總人工 = 日薪 × 工作天數 + 有薪假期"
          >
            <InputNumber
              placeholder="輸入有薪假期金額"
              min={0}
              precision={2}
              style={{ width: '100%' }}
              addonBefore="$"
            />
          </Form.Item>

          <Form.Item
            name="employmentStatus"
            label="判頭員工是否離職"
            initialValue="在職"
          >
            <Select
              options={[
                { value: '在職', label: '在職' },
                { value: '離職', label: '離職' },
              ]}
            />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.employmentStatus !== currentValues.employmentStatus
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('employmentStatus') === '離職' ? (
                <Form.Item
                  name="resignationDate"
                  label="離職日期"
                  rules={[{ required: true, message: '請選擇離職日期' }]}
                >
                  <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                </Form.Item>
              ) : (
                <Form.Item name="resignationDate" label="離職日期">
                  <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" disabled />
                </Form.Item>
              )
            }
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
            <List.Item
              actions={[
                <Button
                  key="edit"
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() => handleEditAttendance(record)}
                >
                  修改
                </Button>,
                ...(showDelete
                  ? [
                      <Popconfirm
                        key="delete"
                        title="確定刪除此打咭記錄？"
                        onConfirm={() => handleDeleteAttendance(record._id)}
                        okText="刪除"
                        cancelText="取消"
                      >
                        <Button type="link" danger icon={<DeleteOutlined />}>
                          刪除
                        </Button>
                      </Popconfirm>,
                    ]
                  : []),
              ]}
            >
              <List.Item.Meta
                avatar={<Badge status="success" />}
                title={
                  <div>
                    <CalendarOutlined style={{ marginRight: 8 }} />
                    {dayjs(record.checkInDate).format('YYYY-MM-DD')}
                    <Tag
                      style={{ marginLeft: 8 }}
                      color={record.dayType === 'half' ? 'orange' : 'blue'}
                    >
                      {record.dayType === 'half' ? '半日' : '全日'}
                    </Tag>
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

      {/* 添加／修改打咭記錄模態框 */}
      <Modal
        title={editingAttendance ? '修改打咭記錄' : '添加打咭記錄'}
        open={attendanceModalVisible}
        onCancel={() => {
          setAttendanceModalVisible(false);
          setEditingAttendance(null);
        }}
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
              disabled={!!editingAttendance}
              showSearch
              filterOption={(input, option) => {
                const q = String(input || '').toLowerCase();
                const text = option?.children != null ? String(option.children) : '';
                return text.toLowerCase().includes(q);
              }}
            >
              {contractorEmployees
                .filter((employee) => {
                  if (
                    selectedEmployee &&
                    String(employee._id) === String(selectedEmployee._id)
                  ) {
                    return true;
                  }
                  return isEmployedStatus(employee);
                })
                .map((employee) => (
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
            extra="同一員工同一日不可重複打咭"
          >
            <DatePicker
              style={{ width: '100%' }}
              disabledDate={(current) => {
                if (!current) return false;
                const employeeId =
                  attendanceForm.getFieldValue('contractorEmployee') ||
                  selectedEmployee?._id;
                if (!employeeId) return false;
                const dateKey = current.format('YYYY-MM-DD');
                return attendanceRecords.some((r) => {
                  if (editingAttendance && String(r._id) === String(editingAttendance._id)) {
                    return false;
                  }
                  const empId = r.contractorEmployee?._id || r.contractorEmployee;
                  return (
                    String(empId) === String(employeeId) &&
                    dayjs(r.checkInDate).format('YYYY-MM-DD') === dateKey
                  );
                });
              }}
            />
          </Form.Item>

          <Form.Item
            name="dayType"
            label="全日／半日"
            rules={[{ required: true, message: '請選擇全日或半日' }]}
            initialValue="full"
            extra="半日計 0.5 工作天；Mobile 打咭一律計全日"
          >
            <Select>
              <Option value="full">全日</Option>
              <Option value="half">半日</Option>
            </Select>
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
