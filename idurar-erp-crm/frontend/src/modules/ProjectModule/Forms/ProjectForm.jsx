import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { Form, Input, InputNumber, Button, Select, Divider, Row, Col, DatePicker, Card, Typography, AutoComplete, Modal, message } from 'antd';
import { PlusOutlined, SearchOutlined, ExclamationCircleOutlined, DeleteOutlined } from '@ant-design/icons';

import { useDate, useMoney } from '@/settings';
import useLanguage from '@/locale/useLanguage';
import calculate from '@/utils/calculate';
import { request } from '@/request';

const { Title, Text } = Typography;

export default function ProjectForm({ current = null }) {
  const translate = useLanguage();
  const { dateFormat } = useDate();
  const { moneyFormatter } = useMoney();

  const form = Form.useFormInstance(); // 使用父組件的form實例
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [invoiceOptions, setInvoiceOptions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [contractors, setContractors] = useState([]);
  const [contractorsLoading, setContractorsLoading] = useState(false);
  const [invoiceNumberChangeWarning, setInvoiceNumberChangeWarning] = useState(null);
  const [originalInvoiceNumber, setOriginalInvoiceNumber] = useState('');

  // 檢查 Invoice Number 變更
  const checkInvoiceNumberChange = async (newInvoiceNumber) => {
    if (!current || !newInvoiceNumber || newInvoiceNumber === originalInvoiceNumber) {
      setInvoiceNumberChangeWarning(null);
      return;
    }

    try {
      const response = await request.get({ 
        entity: `project/check-invoice-change?projectId=${current._id}&newInvoiceNumber=${newInvoiceNumber}` 
      });
      
      if (response.success && response.invoiceNumberChanged) {
        setInvoiceNumberChangeWarning(response);
      } else {
        setInvoiceNumberChangeWarning(null);
      }
    } catch (error) {
      console.error('Error checking Invoice Number change:', error);
    }
  };

  // 搜索 Quote Numbers：至少 3 個字元才搜尋，支援子字串匹配（如 400 可匹配 QU-400、SML-4000）
  const searchInvoiceNumbers = async (searchText) => {
    const trimmed = searchText ? searchText.trim() : '';
    if (trimmed.length < 3) {
      setInvoiceOptions([]);
      return;
    }

    setSearchLoading(true);
    try {
      // 只從 Quote 中搜索 Quote Numbers（後端支援子字串匹配，如 400 可匹配 QU-400、SML-4000）
      const quoteResponse = await request.search({ 
        entity: 'quote', 
        options: { q: trimmed, fields: 'numberPrefix,number,status' } 
      });

      const quoteNumbers = new Set();
      
      // 只顯示 status = accepted 的 Quote
      const acceptedQuotes = quoteResponse?.result?.filter(q => q.status === 'accepted') || [];
      acceptedQuotes.forEach(quote => {
        if (quote.numberPrefix && quote.number) {
          const quoteNumber = `${quote.numberPrefix}-${quote.number}`;
          quoteNumbers.add(quoteNumber);
        } else if (quote.invoiceNumber) {
          quoteNumbers.add(quote.invoiceNumber);
        }
      });

      // 轉換為AutoComplete選項格式
      const options = Array.from(quoteNumbers).map(quoteNumber => ({
        value: quoteNumber,
        label: quoteNumber,
      }));

      setInvoiceOptions(options);
    } catch (error) {
      console.error('搜索 Quote Number 失敗:', error);
      setInvoiceOptions([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // 預覽 Quote Number 相關資料（只從 Quote 搜索）
  const previewInvoiceNumber = async (quoteNum) => {
    if (!quoteNum) {
      setPreviewData(null);
      return;
    }

    setLoading(true);
    try {
      // 只從 Quote 中查找相關資料（使用 Quote Type 和 number 搜索）
      const quotations = await request.search({ 
        entity: 'quote', 
        options: { q: quoteNum, fields: 'numberPrefix,number,status,address,poNumber' } 
      });
      
      // 從 Quote 的 invoiceNumber 查找相關的 supplier quotes 和 invoices
      const [supplierQuotations, invoices] = await Promise.all([
        request.search({ 
          entity: 'supplierquote', 
          options: { q: quoteNum, fields: 'invoiceNumber' } 
        }),
        request.search({ 
          entity: 'invoice', 
          options: { q: quoteNum, fields: 'invoiceNumber' } 
        })
      ]);

      // 計算總額
      let totalCost = 0;
      let totalSupplierCost = 0;
      const suppliers = new Set();

      // 檢查是否匹配 quote number (Quote Type + number) - 用於 Quote
      const matchesQuoteNumber = (record) => {
        if (record.numberPrefix && record.number) {
          const recordQuoteNumber = `${record.numberPrefix}-${record.number}`;
          return recordQuoteNumber === quoteNum;
        }
        // 向後兼容：如果沒有 numberPrefix 和 number，使用 invoiceNumber
        return record.invoiceNumber === quoteNum;
      };

      // 檢查 invoiceNumber 是否匹配 - 用於 SupplierQuote 和 Invoice
      const matchesInvoiceNumber = (record) => {
        return record.invoiceNumber === quoteNum;
      };

      if (quotations?.result) {
        quotations.result.forEach(quote => {
          if (matchesQuoteNumber(quote) && quote.total) {
            totalCost = calculate.add(totalCost, quote.total);
          }
          // 收集供應商
          if (quote.clients) {
            quote.clients.forEach(client => {
              if (client.name) suppliers.add(client.name);
            });
          }
        });
      }

      if (supplierQuotations?.result) {
        supplierQuotations.result.forEach(sq => {
          if (matchesInvoiceNumber(sq) && sq.total) {
            totalSupplierCost = calculate.add(totalSupplierCost, sq.total);
          }
          // 收集供應商
          if (sq.clients) {
            sq.clients.forEach(client => {
              if (client.name) suppliers.add(client.name);
            });
          }
        });
      }

      if (invoices?.result) {
        invoices.result.forEach(inv => {
          if (matchesInvoiceNumber(inv) && inv.total) {
            // Invoices 可能也需要計算到總成本中
          }
        });
      }

      const estimatedProfit = calculate.sub(totalCost, totalSupplierCost);

      const previewData = {
        quotations: quotations?.result?.filter(q => matchesQuoteNumber(q)) || [],
        supplierQuotations: supplierQuotations?.result?.filter(sq => matchesInvoiceNumber(sq)) || [],
        invoices: invoices?.result?.filter(i => matchesInvoiceNumber(i)) || [],
        totalCost,
        totalSupplierCost,
        estimatedProfit,
        suppliers: Array.from(suppliers)
      };
      
      setPreviewData(previewData);

      // 用第一個匹配的 Quote 自動填入：Project name = Quote 的 Project Address，P.O Number = Quote 的 P.O Number
      const matchedQuotes = quotations?.result?.filter(q => matchesQuoteNumber(q)) || [];
      const firstQuote = matchedQuotes[0];
      const updateValues = {};
      if (firstQuote) {
        if (firstQuote.address != null && firstQuote.address !== '') {
          updateValues.name = firstQuote.address;
        }
        if (firstQuote.poNumber != null && firstQuote.poNumber !== '') {
          updateValues.poNumber = firstQuote.poNumber;
        }
      }
      if (Object.keys(updateValues).length > 0) {
        form.setFieldsValue(updateValues);
      }
      // 若沒有匹配的 Quote 或沒有 address，且 Project name 仍為空，則用 Quote Number 作為備用
      if (!form.getFieldValue('name')) {
        form.setFieldsValue({ name: quoteNum });
      }
    } catch (error) {
      console.error('預覽失敗:', error);
      setPreviewData(null);
    } finally {
      setLoading(false);
    }
  };


  // 獲取承包商列表
  const fetchContractors = async () => {
    try {
      setContractorsLoading(true);
      console.log('🔍 Project: 開始獲取承包商列表...');
      const response = await request.listAll({ entity: 'contractor' });
      console.log('📋 Project: 承包商API響應:', response);
      
      const contractorData = response?.result;
      if (Array.isArray(contractorData)) {
        const contractorOptions = contractorData.map(contractor => ({
          value: contractor._id,
          label: contractor.name,
        }));
        console.log('✅ Project: 承包商選項:', contractorOptions);
        setContractors(contractorOptions);
      } else {
        console.warn('⚠️ Project: 承包商數據不是數組格式:', contractorData);
        setContractors([]);
      }
    } catch (error) {
      console.error('❌ Project: 獲取承包商列表失敗:', error);
      setContractors([]);
    } finally {
      setContractorsLoading(false);
    }
  };

  // 計算毛利（支持 contractorFees 數組）
  const calculateGrossProfit = (costPrice, sPrice, contractorFees) => {
    let totalContractorFee = 0;
    if (Array.isArray(contractorFees)) {
      totalContractorFee = contractorFees.reduce((sum, fee) => {
        return calculate.add(sum, fee?.amount || 0);
      }, 0);
    } else if (typeof contractorFees === 'number') {
      // 向後兼容：如果傳入的是數字
      totalContractorFee = contractorFees || 0;
    }
    const profit = calculate.sub(calculate.sub(costPrice, sPrice), totalContractorFee);
    return Number.parseFloat(profit);
  };


  useEffect(() => {
    // 載入承包商列表
    fetchContractors();
  }, []);

  // 處理現有項目的承包商數據，確保選項正確顯示
  useEffect(() => {
    if (current && current.contractors && Array.isArray(current.contractors)) {
      console.log('🔧 Project: 處理現有承包商數據:', current.contractors);
      // 添加現有承包商到選項列表中（如果還沒有的話）
      const contractorsToAdd = [];
      
      current.contractors.forEach(contractor => {
        if (contractor && contractor._id && contractor.name) {
          contractorsToAdd.push({
            value: contractor._id,
            label: contractor.name
          });
        }
      });
      
      console.log('📝 Project: 需要添加的承包商:', contractorsToAdd);
      
      // 如果有需要添加的承包商選項，合併到現有選項中
      if (contractorsToAdd.length > 0) {
        setContractors(prevContractors => {
          const existingIds = prevContractors.map(c => c.value);
          const newContractors = contractorsToAdd.filter(c => !existingIds.includes(c.value));
          console.log('🔄 Project: 合併後的承包商選項:', [...prevContractors, ...newContractors]);
          return [...prevContractors, ...newContractors];
        });
      }
    }
  }, [current]);

  // 延遲設置表單值，確保contractors選項已經載入
  useEffect(() => {
    if (current && contractors.length > 0) {
      console.log('💾 Project: 設置表單值，contractors選項數量:', contractors.length);
      console.log('📄 Project: 當前項目數據:', current);
      
      const timer = setTimeout(() => {
        // 處理contractors字段 - 需要轉換為ID數組
        let contractorIds = [];
        if (current.contractors && Array.isArray(current.contractors)) {
          contractorIds = current.contractors.map(contractor => contractor._id || contractor);
        }
        
        // 處理 contractorFees：支持新格式（數組）和舊格式（單一值）
        let contractorFees = [];
        if (current.contractorFees && Array.isArray(current.contractorFees)) {
          // 新格式：contractorFees 數組
          contractorFees = current.contractorFees.map(fee => ({
            projectName: fee.projectName || '',
            amount: fee.amount || 0,
          }));
        } else if (current.contractorFee !== undefined && current.contractorFee !== null) {
          // 舊格式：單一 contractorFee 值（向後兼容）
          if (current.contractorFee > 0) {
            contractorFees = [{
              projectName: '判頭費',
              amount: current.contractorFee,
            }];
          }
        }
        
        const formData = {
          ...current,
          contractors: contractorIds,  // 確保使用ID數組
          contractorFees: contractorFees,  // 使用處理後的 contractorFees 數組
          startDate: current.startDate ? dayjs(current.startDate) : null,
          endDate: current.endDate ? dayjs(current.endDate) : null,
        };
        
        console.log('📝 Project: 設置的表單數據:', formData);
        console.log('👥 Project: Contractors IDs:', contractorIds);
        console.log('🏷️ Project: 當前承包商選項:', contractors);
        
        // 檢查ID是否在選項中存在
        contractorIds.forEach(id => {
          const found = contractors.find(opt => opt.value === id);
          console.log(`🔍 Project: ID ${id} 在選項中${found ? '存在' : '不存在'}:`, found);
        });
        
        form.setFieldsValue(formData);
        setInvoiceNumber(current.invoiceNumber || '');
        setOriginalInvoiceNumber(current.invoiceNumber || '');
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [current, form, contractors]);

  // Invoice Number 變更警告模態框
  const showInvoiceNumberChangeWarning = () => {
    if (!invoiceNumberChangeWarning) return null;

    const { affectedRecords } = invoiceNumberChangeWarning;
    const totalAffected = affectedRecords.quotes.count + affectedRecords.supplierQuotes.count + affectedRecords.invoices.count;

    return (
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ExclamationCircleOutlined style={{ color: '#faad14' }} />
            <span>Invoice Number 變更警告</span>
          </div>
        }
        open={!!invoiceNumberChangeWarning}
        onCancel={() => setInvoiceNumberChangeWarning(null)}
        footer={[
          <Button key="cancel" onClick={() => setInvoiceNumberChangeWarning(null)}>
            取消
          </Button>,
          <Button 
            key="confirm" 
            type="primary" 
            danger
            onClick={() => {
              setInvoiceNumberChangeWarning(null);
              // 這裡可以觸發表單提交
            }}
          >
            確認變更並同步相關記錄
          </Button>
        ]}
        width={600}
      >
        <div style={{ marginBottom: '16px' }}>
          <p>
            <strong>您正在將 Invoice Number 從 "{invoiceNumberChangeWarning.oldInvoiceNumber}" 更改為 "{invoiceNumberChangeWarning.newInvoiceNumber}"</strong>
          </p>
          <p style={{ color: '#666' }}>
            此變更將自動同步更新以下相關記錄：
          </p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <h4>受影響的記錄 ({totalAffected} 項)：</h4>
          
          {affectedRecords.quotes.count > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <strong>報價單 ({affectedRecords.quotes.count} 項)：</strong>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                {affectedRecords.quotes.records.map((quote, index) => (
                  <li key={index}>
                    {quote.number} - {quote.status} ({dayjs(quote.date).format('YYYY-MM-DD')})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {affectedRecords.supplierQuotes.count > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <strong>供應商報價 ({affectedRecords.supplierQuotes.count} 項)：</strong>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                {affectedRecords.supplierQuotes.records.map((sq, index) => (
                  <li key={index}>
                    {sq.number} - {sq.status} ({dayjs(sq.date).format('YYYY-MM-DD')})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {affectedRecords.invoices.count > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <strong>發票 ({affectedRecords.invoices.count} 項)：</strong>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                {affectedRecords.invoices.records.map((invoice, index) => (
                  <li key={index}>
                    {invoice.number} - {invoice.status} ({dayjs(invoice.date).format('YYYY-MM-DD')})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div style={{ 
          padding: '12px', 
          backgroundColor: '#fff7e6', 
          border: '1px solid #ffd591',
          borderRadius: '6px'
        }}>
          <p style={{ margin: 0, color: '#d46b08' }}>
            ⚠️ 請確認您要繼續此操作。所有相關記錄的 Invoice Number 將被自動更新。
          </p>
        </div>
      </Modal>
    );
  };

  return (
    <>
      {showInvoiceNumberChangeWarning()}
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card title="項目基本信息" size="small">
            <Row gutter={[12, 0]}>
              <Col span={24}>
                <Form.Item
                  label="Project Name"
                  name="name"
                  rules={[{ required: true, message: 'Project Name is required' }]}
                >
                  <Input placeholder="輸入項目名稱" allowClear />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  label="Quote Number (Quote Type + Number)"
                  name="invoiceNumber"
                  rules={[{ required: true, message: 'Quote Number is required' }]}
                >
                  <AutoComplete
                    placeholder="輸入至少 3 個字元搜索 (例如: 400 可匹配 QU-400、SML-4000)"
                    value={invoiceNumber}
                    options={invoiceOptions}
                    onSearch={searchInvoiceNumbers}
                    onSelect={(value) => {
                      setInvoiceNumber(value);
                      previewInvoiceNumber(value);
                      form.setFieldsValue({ invoiceNumber: value });
                    }}
                    onChange={(value) => {
                      setInvoiceNumber(value);
                      if (!value) {
                        setPreviewData(null);
                        setInvoiceNumberChangeWarning(null);
                      } else {
                        // 檢查 Quote Number 變更
                        checkInvoiceNumberChange(value);
                      }
                    }}
                    style={{ width: '100%' }}
                    filterOption={false}
                    notFoundContent={
                      searchLoading
                        ? "搜索中..."
                        : (invoiceNumber && invoiceNumber.trim().length > 0 && invoiceNumber.trim().length < 3)
                          ? "請輸入至少 3 個字元以搜索"
                          : "無匹配的 Quote Number"
                    }
                  />
                </Form.Item>
              </Col>
              
              <Col span={12}>
                <Form.Item
                  label={translate('P.O Number')}
                  name="poNumber"
                >
                  <Input placeholder="輸入P.O Number" allowClear />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item
                  label={translate('Cost By')}
                  name="costBy"
                  rules={[{ required: true }]}
                  initialValue="對方"
                >
                  <Select
                    options={[
                      { value: '對方', label: '對方' },
                      { value: '我方', label: '我方' },
                    ]}
                  />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item
                  label={translate('Status')}
                  name="status"
                  initialValue="draft"
                >
                  <Select
                    options={[
                      { value: 'draft', label: translate('Draft') },
                      { value: 'pending', label: translate('Pending') },
                      { value: 'in_progress', label: translate('In Progress') },
                      { value: 'completed', label: translate('Completed') },
                      { value: 'cancelled', label: translate('Cancelled') },
                      { value: 'on hold', label: translate('On Hold') },
                    ]}
                  />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item
                  label={translate('Start Date')}
                  name="startDate"
                >
                  <DatePicker style={{ width: '100%' }} format={dateFormat} />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item
                  label={translate('End Date')}
                  name="endDate"
                >
                  <DatePicker style={{ width: '100%' }} format={dateFormat} />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  label={translate('Description')}
                  name="description"
                >
                  <Input.TextArea rows={3} placeholder="項目描述" />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  label={translate('Address')}
                  name="address"
                >
                  <Input placeholder="項目地址" />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  label={translate('Contractors')}
                  name="contractors"
                  rules={[{ required: false }]}
                >
                  <Select
                    mode="multiple"
                    placeholder="選擇承包商"
                    showSearch
                    filterOption={(input, option) =>
                      option?.label?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                    }
                    options={contractors}
                    loading={contractorsLoading}
                    style={{ width: '100%' }}
                    notFoundContent="無承包商資料"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="財務信息" size="small">
            <Row gutter={[12, 0]}>
              <Col span={24}>
                <Form.Item label="判頭費">
                  <Form.List name="contractorFees" initialValue={[]}>
                    {(fields, { add, remove }) => (
                      <>
                        {fields.map(({ key, name, ...restField }) => (
                          <Row key={key} gutter={8} style={{ marginBottom: 8 }}>
                            <Col span={10}>
                              <Form.Item
                                {...restField}
                                name={[name, 'projectName']}
                                rules={[{ required: true, message: '請輸入工程名' }]}
                                style={{ marginBottom: 0 }}
                              >
                                <Input placeholder="工程名" />
                              </Form.Item>
                            </Col>
                            <Col span={10}>
                              <Form.Item
                                {...restField}
                                name={[name, 'amount']}
                                rules={[{ required: true, message: '請輸入金額' }]}
                                style={{ marginBottom: 0 }}
                              >
                                <InputNumber
                                  min={0}
                                  precision={2}
                                  style={{ width: '100%' }}
                                  addonBefore="$"
                                  placeholder="0.00"
                                />
                              </Form.Item>
                            </Col>
                            <Col span={4}>
                              <Button
                                type="link"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => remove(name)}
                                style={{ paddingLeft: 0 }}
                              >
                                刪除
                              </Button>
                            </Col>
                          </Row>
                        ))}
                        <Form.Item style={{ marginBottom: 0 }}>
                          <Button
                            type="dashed"
                            onClick={() => add({ projectName: '', amount: 0 })}
                            icon={<PlusOutlined />}
                            block
                          >
                            添加判頭費項目
                          </Button>
                        </Form.Item>
                      </>
                    )}
                  </Form.List>
                </Form.Item>
              </Col>

              {previewData && (
                <>
                  <Col span={24}>
                    <Divider>預覽數據</Divider>
                  </Col>
                  
                  <Col span={8}>
                    <Text strong>Quotations: </Text>
                    <Text>{previewData.quotations.length}</Text>
                  </Col>
                  
                  <Col span={8}>
                    <Text strong>Supplier Quotations: </Text>
                    <Text>{previewData.supplierQuotations.length}</Text>
                  </Col>
                  
                  <Col span={8}>
                    <Text strong>Invoices: </Text>
                    <Text>{previewData.invoices.length}</Text>
                  </Col>
                  
                  <Col span={12}>
                    <Text strong>成本價: </Text>
                    <Text>{moneyFormatter({ amount: previewData.totalCost })}</Text>
                  </Col>
                  
                  <Col span={12}>
                    <Text strong>S_price: </Text>
                    <Text>{moneyFormatter({ amount: previewData.totalSupplierCost })}</Text>
                  </Col>
                  
                  <Col span={24}>
                    <Text strong>預計毛利: </Text>
                    <span style={{ color: previewData.estimatedProfit >= 0 ? '#52c41a' : '#ff4d4f' }}>
                      {moneyFormatter({ amount: previewData.estimatedProfit || 0 })}
                    </span>
                  </Col>
                  
                  {previewData.suppliers.length > 0 && (
                    <Col span={24}>
                      <Text strong>相關供應商: </Text>
                      <Text>{previewData.suppliers.join(', ')}</Text>
                    </Col>
                  )}
                </>
              )}
            </Row>
          </Card>
        </Col>
      </Row>
    </>
  );
}
