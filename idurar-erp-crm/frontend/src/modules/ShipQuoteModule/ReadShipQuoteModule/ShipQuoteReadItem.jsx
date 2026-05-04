import { useState, useEffect } from 'react';
import { Divider } from 'antd';
import dayjs from 'dayjs';

import { Button, Row, Col, Descriptions, Statistic, Tag, Modal, message, Table, Checkbox, Space } from 'antd';
import { PageHeader } from '@ant-design/pro-layout';
import {
  EditOutlined,
  FilePdfOutlined,
  CloseCircleOutlined,
  RetweetOutlined,
  ArrowUpOutlined,
} from '@ant-design/icons';

import { useSelector, useDispatch } from 'react-redux';
import useLanguage from '@/locale/useLanguage';
import { erp } from '@/redux/erp/actions';

import { selectCurrentItem } from '@/redux/erp/selectors';

import { DOWNLOAD_BASE_URL, API_BASE_URL } from '@/config/serverApiConfig';
import { useMoney, useDate } from '@/settings';
import { useNavigate, useLocation } from 'react-router-dom';
import { request } from '@/request';
import { multilineStyle, renderMultilineText } from '@/utils/renderMultilineText';
import axios from 'axios';
import storePersist from '@/redux/storePersist';
import {
  DEFAULT_SHIP_RENTAL_EXTRA_ITEMS,
  DEFAULT_SHIP_PDF_PAYMENT_METHOD,
} from '@/modules/ShipQuoteModule/Forms/ShipQuoteTableForm';

function defaultShipPdfQuoteValidityLine(erp) {
  if (!erp) return '90天';
  if (erp.expiredDate) {
    return `${dayjs(erp.expiredDate).format('DD-MM-YYYY')} 或 90天`;
  }
  return '90天';
}

// 表格欄位順序：項目, Description, 數量, 單價, 總計
const Item = ({ item, currentErp }) => {
  const { moneyFormatter } = useMoney();
  return (
    <Row gutter={[12, 0]} key={item._id}>
      <Col className="gutter-row" span={5}>
        <p style={{ marginBottom: 0 }}>{item.itemName || '-'}</p>
      </Col>
      <Col className="gutter-row" span={8}>
        <p style={{ marginBottom: 0, ...multilineStyle }}>{item.description || '-'}</p>
      </Col>
      <Col className="gutter-row" span={3}>
        <p style={{ textAlign: 'right', marginBottom: 0 }}>{item.quantity ?? '-'}</p>
      </Col>
      <Col className="gutter-row" span={4}>
        <p style={{ textAlign: 'right', marginBottom: 0 }}>
          {item.price != null ? moneyFormatter({ amount: item.price, currency_code: currentErp.currency }) : '-'}
        </p>
      </Col>
      <Col className="gutter-row" span={4}>
        <p style={{ textAlign: 'right', fontWeight: '700', marginBottom: 0 }}>
          {item.total != null ? moneyFormatter({ amount: item.total, currency_code: currentErp.currency }) : '-'}
        </p>
      </Col>
      <Divider dashed style={{ marginTop: 0, marginBottom: 15 }} />
    </Row>
  );
};

export default function ShipQuoteReadItem({ config, selectedItem }) {
  const translate = useLanguage();
  const { entity, ENTITY_NAME } = config;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const fromProject = location.state?.fromProject;

  const { moneyFormatter } = useMoney();
  const { result: currentResult } = useSelector(selectCurrentItem);

  const resetErp = {
    status: '',
    client: {
      name: '',
      email: '',
      phone: '',
      address: '',
    },
    subTotal: 0,
    discountTotal: 0,
    discount: 0,
    total: 0,
    credit: 0,
    number: 0,
    year: 0,
  };

  const [itemslist, setItemsList] = useState([]);
  const [currentErp, setCurrentErp] = useState(selectedItem ?? resetErp);
  const [client, setClient] = useState({});
  const [convertLoading, setConvertLoading] = useState(false);
  const [convertShipQuoteToSLoading, setConvertShipQuoteToSLoading] = useState(false);
  const [convertToInvoiceModalVisible, setConvertToInvoiceModalVisible] = useState(false);
  const [selectedItemIndices, setSelectedItemIndices] = useState([]);

  const displayNumber = currentErp?.numberPrefix && currentErp?.number
    ? `${currentErp.numberPrefix}-${currentErp.number}`
    : (currentErp?.number != null ? String(currentErp.number) : '-');

  const convertedInvoiceIds = new Set();
  (currentErp?.converted?.invoices || []).forEach((id) => {
    if (id) convertedInvoiceIds.add(String(id));
  });
  const invRef = currentErp?.converted?.invoice;
  if (invRef) convertedInvoiceIds.add(String(invRef._id || invRef));
  const convertedInvoiceCount = convertedInvoiceIds.size;

  useEffect(() => {
    const controller = new AbortController();
    if (currentResult) {
      const { invoice, _id, ...others } = currentResult;
      setCurrentErp({ ...others, ...invoice, _id });
    }
    return () => controller.abort();
  }, [currentResult]);

  useEffect(() => {
    if (currentErp?.clients && currentErp.clients.length > 0) {
      // 設置第一個客戶作為主要客戶，用於顯示聯絡信息
      setClient(currentErp.clients[0]);
    } else if (currentErp?.client) {
      // 向後兼容，如果還有舊的client字段
      setClient(currentErp.client);
    }
  }, [currentErp]);

  useEffect(() => {
    if (currentErp?.items) {
      setItemsList(currentErp.items);
    }
  }, [currentErp]);

  // 吊船 Quote 轉 Invoice（與報價單相同：可重複轉換、可選項目）
  const handleConvertToInvoice = () => {
    if (!currentErp.items || currentErp.items.length === 0) {
      message.warning('此 Quote 沒有項目，無法轉換');
      return;
    }
    setSelectedItemIndices(currentErp.items.map((_, i) => i));
    setConvertToInvoiceModalVisible(true);
  };

  const executeConvertToInvoice = async () => {
    if (selectedItemIndices.length === 0) {
      message.warning('請至少選擇一項項目');
      return;
    }
    setConvertToInvoiceModalVisible(false);
    setConvertLoading(true);
    try {
      axios.defaults.baseURL = API_BASE_URL;
      axios.defaults.withCredentials = true;
      const auth = storePersist.get('auth');
      if (auth) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${auth.current.token}`;
      }
      const query =
        selectedItemIndices.length === currentErp.items.length
          ? ''
          : `?itemIndices=${selectedItemIndices.join(',')}`;
      const response = await axios.get(`shipquote/convert/${currentErp._id}${query}`);
      if (response?.data?.success) {
        message.success('Quote 已成功轉換成 Invoice！');
        navigate(`/invoice/read/${response.data.result._id}`);
        dispatch(erp.read({ entity, id: currentErp._id }));
      } else {
        message.error('轉換失敗：' + (response?.data?.message || '未知錯誤'));
      }
    } catch (error) {
      console.error('轉換錯誤:', error);
      message.error('轉換過程中發生錯誤：' + (error.response?.data?.message || error.message));
    } finally {
      setConvertLoading(false);
    }
  };

  // Ship Quote 轉 S單（整單轉換，無需選 P.O，可重覆上單）
  const handleConvertShipQuoteToS = async () => {
    // 與 Quote 上單一致：須先在 Project Management 建立對應 SML 編號
    const quoteNumber =
      currentErp.numberPrefix && currentErp.number
        ? `${currentErp.numberPrefix}-${currentErp.number}`
        : currentErp.invoiceNumber;
    if (!quoteNumber) {
      message.warning('無法取得 Quote 編號');
      return;
    }
    try {
      const checkResult = await request.checkProject({ invoiceNumber: quoteNumber });
      if (!checkResult?.success || !checkResult?.result) {
        message.error('請先在 Project Management 建立此 Quote Number 的項目，方可上單');
        return;
      }
    } catch {
      message.error('請先在 Project Management 建立此 Quote Number 的項目，方可上單');
      return;
    }

    Modal.confirm({
      title: '確認轉換到 S單',
      content: (
        <div>
          <p>您確定要將此 Ship Quote 轉換成 S單（Supplier Quote）嗎？</p>
          <p><strong>編號：</strong>{`${currentErp.numberPrefix || ''}-${currentErp.number}/${currentErp.year || ''}`}</p>
          <p><strong>總金額：</strong>{moneyFormatter({ amount: currentErp.total, currency_code: currentErp.currency })}</p>
          <p style={{ color: '#ff4d4f', marginTop: 12 }}>轉換後將建立新的 S單，此操作不可撤銷</p>
        </div>
      ),
      okText: '確認轉換',
      cancelText: '取消',
      okType: 'primary',
      onOk: async () => {
        setConvertShipQuoteToSLoading(true);
        try {
          axios.defaults.baseURL = API_BASE_URL;
          axios.defaults.withCredentials = true;
          const auth = storePersist.get('auth');
          if (auth) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${auth.current.token}`;
          }
          const response = await axios.get(`shipquote/convertToSupplierQuote/${currentErp._id}`);
          if (response?.data?.success) {
            message.success('Ship Quote 已成功轉換成 S單！');
            navigate(`/supplierquote/read/${response.data.result._id}`);
          } else {
            message.error('轉換失敗：' + (response?.data?.message || '未知錯誤'));
          }
        } catch (error) {
          console.error('轉換錯誤:', error);
          message.error('轉換過程中發生錯誤：' + (error.response?.data?.message || error.message));
        } finally {
          setConvertShipQuoteToSLoading(false);
        }
      },
    });
  };

  return (
    <>
      <PageHeader
        onBack={() => {
          if (fromProject) {
            navigate(-1);
          } else {
            navigate(`/${entity.toLowerCase()}`);
          }
        }}
        title={`吊船Quote # ${displayNumber}`}
        ghost={false}
        tags={[
          <Tag key="status" color={currentErp.status === 'draft' ? 'blue' : 'green'}>
            {currentErp.status && translate(currentErp.status)}
          </Tag>,
        ]}
        extra={
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 8,
            }}
          >
            <Space wrap size="small">
              <Button
                key="sq-close"
                onClick={() => {
                  if (fromProject) {
                    navigate(-1);
                  } else {
                    navigate(`/${entity.toLowerCase()}`);
                  }
                }}
                icon={<CloseCircleOutlined />}
              >
                {translate('Close')}
              </Button>
              <Button
                key="sq-pdf"
                onClick={() => {
                  const v = encodeURIComponent(
                    String(currentErp?.modified_at || currentErp?.updated || Date.now())
                  );
                  window.open(
                    `${DOWNLOAD_BASE_URL}${entity}/${entity}-${currentErp._id}.pdf?v=${v}`,
                    '_blank'
                  );
                }}
                icon={<FilePdfOutlined />}
              >
                {translate('Download PDF')}
              </Button>
            </Space>
            <Space wrap size="small">
              <Button
                key="sq-to-s"
                onClick={handleConvertShipQuoteToS}
                loading={convertShipQuoteToSLoading}
                icon={<ArrowUpOutlined />}
                style={{
                  backgroundColor:
                    currentErp.converted && currentErp.converted.supplierQuote ? '#52c41a' : undefined,
                  borderColor:
                    currentErp.converted && currentErp.converted.supplierQuote ? '#52c41a' : undefined,
                  color: currentErp.converted && currentErp.converted.supplierQuote ? '#fff' : undefined,
                }}
              >
                {currentErp.converted && currentErp.converted.supplierQuote
                  ? '已轉S單 / 重覆上單'
                  : '轉換到S單'}
              </Button>
              <Button
                key="sq-convert-inv"
                onClick={handleConvertToInvoice}
                loading={convertLoading}
                icon={<RetweetOutlined />}
                style={{
                  backgroundColor: convertedInvoiceCount > 0 ? '#52c41a' : undefined,
                  borderColor: convertedInvoiceCount > 0 ? '#52c41a' : undefined,
                  color: convertedInvoiceCount > 0 ? '#fff' : undefined,
                }}
              >
                {convertedInvoiceCount > 0
                  ? `轉換成 Invoice (已轉 ${convertedInvoiceCount} 個)`
                  : translate('Convert to Invoice')}
              </Button>
              <Button
                key="sq-edit"
                onClick={() => {
                  dispatch(
                    erp.currentAction({
                      actionType: 'update',
                      data: currentErp,
                    })
                  );
                  navigate(`/${entity.toLowerCase()}/table/update/${currentErp._id}`);
                }}
                type="primary"
                icon={<EditOutlined />}
              >
                {translate('Edit')}
              </Button>
            </Space>
          </div>
        }
        style={{
          padding: '20px 0px',
        }}
      >
        <Row>
          <Statistic title="Status" value={currentErp.status} />
          <Statistic
            title={translate('SubTotal')}
            value={moneyFormatter({
              amount: currentErp.subTotal,
              currency_code: currentErp.currency,
            })}
            style={{
              margin: '0 32px',
            }}
          />
          <Statistic
            title={translate('Total')}
            value={moneyFormatter({ amount: currentErp.total, currency_code: currentErp.currency })}
            style={{
              margin: '0 32px',
            }}
          />
          <Statistic
            title={translate('Paid')}
            value={moneyFormatter({
              amount: currentErp.credit,
              currency_code: currentErp.currency,
            })}
            style={{
              margin: '0 32px',
            }}
          />
        </Row>
      </PageHeader>
      <Divider dashed />
      <Descriptions title={translate('Clients Information')}>
        <Descriptions.Item label={translate('Clients')} span={3}>
          {currentErp.clients && currentErp.clients.length > 0 ? (
            <div>
              {currentErp.clients.map((client, index) => (
                <Tag key={client._id || index} style={{ marginBottom: 4, marginRight: 4 }}>
                  {client.name}
                </Tag>
              ))}
            </div>
          ) : (
            currentErp.client?.name || '-'
          )}
        </Descriptions.Item>
        <Descriptions.Item label={translate('suppliers')}>{currentErp.supplier?.name || '-'}</Descriptions.Item>
        <Descriptions.Item label={translate('Primary Contact Address')}>{client.address}</Descriptions.Item>
        <Descriptions.Item label={translate('Primary Contact Email')}>{client.email}</Descriptions.Item>
        <Descriptions.Item label={translate('Primary Contact Phone')}>{client.phone}</Descriptions.Item>
      </Descriptions>
      
      <Descriptions title={translate('Quote Details')}>
        <Descriptions.Item label="Quote Type">{currentErp.numberPrefix}</Descriptions.Item>
        <Descriptions.Item label={translate('Number')}>{currentErp.number}</Descriptions.Item>
        <Descriptions.Item label="報價日期">{currentErp.date ? dayjs(currentErp.date).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
        <Descriptions.Item label={translate('Type')}>{currentErp.type}</Descriptions.Item>
        {currentErp.type === '吊船' && currentErp.shipType && (
          <Descriptions.Item label={translate('Ship Type')}>{currentErp.shipType}</Descriptions.Item>
        )}
        <Descriptions.Item label="Quote Number">{currentErp.invoiceNumber}</Descriptions.Item>
        <Descriptions.Item label={translate('Contact Person')}>{currentErp.contactPerson || '-'}</Descriptions.Item>
        <Descriptions.Item label={translate('Subcontractor Count')}>{currentErp.subcontractorCount || '-'}</Descriptions.Item>
        <Descriptions.Item label={translate('Cost Price')}>{currentErp.costPrice ? `$${currentErp.costPrice}` : '-'}</Descriptions.Item>
        <Descriptions.Item label={translate('Completed')}>{currentErp.isCompleted ? translate('Yes') : translate('No')}</Descriptions.Item>
        <Descriptions.Item label="制單人">
          {currentErp.createdBy
            ? ((currentErp.createdBy.name + (currentErp.createdBy.surname ? ' ' + currentErp.createdBy.surname : '')).trim() ||
                currentErp.createdBy.email ||
                '-')
            : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="修改時間">{currentErp.modified_at ? dayjs(currentErp.modified_at).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
        <Descriptions.Item label="修改人">{currentErp.updatedBy ? (currentErp.updatedBy.name + (currentErp.updatedBy.surname ? ' ' + currentErp.updatedBy.surname : '') || currentErp.updatedBy.email || '-') : '-'}</Descriptions.Item>
      </Descriptions>
      
      <Row gutter={[12, 0]} style={{ marginTop: 16, marginBottom: 16 }}>
        <Col span={12}>
          <p><strong>{translate('Project Address')}:</strong></p>
          <p>{currentErp.address || '-'}</p>
        </Col>
      </Row>

      {currentErp.shipType === '租賃' && (
        <>
          <Divider orientation="left">租賃附加項目（PDF「附加項目」）</Divider>
          <Table
            size="small"
            pagination={false}
            rowKey={(_, i) => `rental-extra-${i}`}
            style={{ marginBottom: 16 }}
            columns={[
              {
                title: '摘要',
                dataIndex: 'description',
                ellipsis: false,
                render: (t) => (t ? renderMultilineText(t) : '-'),
              },
              {
                title: '單價 HKD',
                dataIndex: 'unitPrice',
                width: 160,
                align: 'right',
                render: (v, row) =>
                  v != null && v !== '' && !Number.isNaN(Number(v))
                    ? moneyFormatter({ amount: Number(v), currency_code: currentErp.currency })
                    : '-',
              },
            ]}
            dataSource={
              currentErp.rentalExtraItems && currentErp.rentalExtraItems.length > 0
                ? currentErp.rentalExtraItems
                : DEFAULT_SHIP_RENTAL_EXTRA_ITEMS
            }
          />
          {(!currentErp.rentalExtraItems || currentErp.rentalExtraItems.length === 0) && (
            <p style={{ color: '#888', fontSize: 12, marginTop: -8, marginBottom: 16 }}>
              （尚未儲存自訂列時，PDF 使用與系統預設相同之附加項目表）
            </p>
          )}
          <Divider orientation="left">租賃說明（PDF「租賃說明」）</Divider>
          {currentErp.rentalDescription && String(currentErp.rentalDescription).trim() ? (
            <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 16 }}>
              {String(currentErp.rentalDescription).trim()}
            </p>
          ) : (
            <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
              （未自訂：PDF 使用與系統預設相同之租賃說明條款）
            </p>
          )}
          <Divider orientation="left">付款方法、報價有效期（PDF）</Divider>
          <p style={{ marginBottom: 8 }}>
            <strong>付款方法</strong>
          </p>
          {currentErp.pdfPaymentMethod != null && String(currentErp.pdfPaymentMethod).trim() ? (
            <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 16 }}>
              {String(currentErp.pdfPaymentMethod).trim()}
            </p>
          ) : (
            <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
              （未自訂：PDF 使用預設）{DEFAULT_SHIP_PDF_PAYMENT_METHOD}
            </p>
          )}
          <p style={{ marginBottom: 8 }}>
            <strong>報價有效期</strong>
          </p>
          {currentErp.pdfQuoteValidity != null && String(currentErp.pdfQuoteValidity).trim() ? (
            <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 16 }}>
              {String(currentErp.pdfQuoteValidity).trim()}
            </p>
          ) : (
            <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
              （未自訂：PDF 依報價失效日期顯示）{defaultShipPdfQuoteValidityLine(currentErp)}
            </p>
          )}
        </>
      )}

      <Divider />
      <Row gutter={[12, 0]}>
        <Col className="gutter-row" span={5}>
          <p><strong>項目</strong></p>
        </Col>
        <Col className="gutter-row" span={8}>
          <p><strong>Description</strong></p>
        </Col>
        <Col className="gutter-row" span={3}>
          <p style={{ textAlign: 'right' }}><strong>數量</strong></p>
        </Col>
        <Col className="gutter-row" span={4}>
          <p style={{ textAlign: 'right' }}><strong>單價</strong></p>
        </Col>
        <Col className="gutter-row" span={4}>
          <p style={{ textAlign: 'right' }}><strong>總計</strong></p>
        </Col>
      </Row>
      {itemslist.map((item) => (
        <Item key={item._id} item={item} currentErp={currentErp} />
      ))}
      <div
        style={{
          width: '300px',
          float: 'right',
          textAlign: 'right',
          fontWeight: '700',
        }}
      >
        <Row gutter={[12, -5]}>
          <Col className="gutter-row" span={12}>
            <p>{translate('Sub Total')} :</p>
          </Col>

          <Col className="gutter-row" span={12}>
            <p>
              {moneyFormatter({ amount: currentErp.subTotal, currency_code: currentErp.currency })}
            </p>
          </Col>
          <Col className="gutter-row" span={12}>
            <p>
              {translate('Discount')} ({Math.round(currentErp.discount || 0)} %) :
            </p>
          </Col>
          <Col className="gutter-row" span={12}>
            <p>
              {moneyFormatter({ amount: currentErp.discountTotal, currency_code: currentErp.currency })}
            </p>
          </Col>
          <Col className="gutter-row" span={12}>
            <p>{translate('Total')} :</p>
          </Col>
          <Col className="gutter-row" span={12}>
            <p>
              {moneyFormatter({ amount: currentErp.total, currency_code: currentErp.currency })}
            </p>
          </Col>
        </Row>
      </div>

      <Modal
        title="選擇要轉換的項目"
        open={convertToInvoiceModalVisible}
        onOk={executeConvertToInvoice}
        onCancel={() => {
          setConvertToInvoiceModalVisible(false);
        }}
        okText="確認轉換"
        cancelText="取消"
        okButtonProps={{ disabled: selectedItemIndices.length === 0 }}
        width={560}
      >
        <div style={{ marginBottom: 12 }}>
          <p>請勾選要轉換到 Invoice 的項目（可重複轉換）：</p>
          <Checkbox
            style={{ marginBottom: 8 }}
            checked={
              currentErp.items?.length > 0 && selectedItemIndices.length === currentErp.items.length
            }
            indeterminate={
              selectedItemIndices.length > 0 &&
              selectedItemIndices.length < (currentErp.items?.length || 0)
            }
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedItemIndices(currentErp.items?.map((_, i) => i) || []);
              } else {
                setSelectedItemIndices([]);
              }
            }}
          >
            全選
          </Checkbox>
        </div>
        <div
          style={{
            maxHeight: 320,
            overflow: 'auto',
            border: '1px solid #f0f0f0',
            padding: 8,
            borderRadius: 4,
          }}
        >
          {(currentErp.items || []).map((item, index) => (
            <div key={item._id || index} style={{ marginBottom: 8 }}>
              <Checkbox
                checked={selectedItemIndices.includes(index)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedItemIndices((prev) => [...prev, index].sort((a, b) => a - b));
                  } else {
                    setSelectedItemIndices((prev) => prev.filter((i) => i !== index));
                  }
                }}
              >
                <span style={{ marginRight: 8 }}>
                  <strong>{item.itemName}</strong>
                </span>
                {item.description ? (
                  <span
                    style={{
                      display: 'block',
                      color: '#666',
                      fontSize: 12,
                      marginTop: 2,
                      ...multilineStyle,
                    }}
                  >
                    {item.description}
                  </span>
                ) : null}
                <span style={{ color: '#888', fontSize: 12, display: 'block', marginTop: 2 }}>
                  {item.quantity} ×{' '}
                  {moneyFormatter({ amount: item.price, currency_code: currentErp.currency })} ={' '}
                  {moneyFormatter({ amount: item.total, currency_code: currentErp.currency })}
                </span>
              </Checkbox>
            </div>
          ))}
        </div>
        <p style={{ color: '#1890ff', fontSize: '12px', marginTop: 12 }}>
          ℹ️ 只會將所選項目轉成新 Invoice，可多次轉換
        </p>
      </Modal>
    </>
  );
}
