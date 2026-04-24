import { useState, useEffect } from 'react';
import { Divider } from 'antd';
import dayjs from 'dayjs';

import { Button, Row, Col, Descriptions, Statistic, Tag, Modal, message } from 'antd';
import { PageHeader } from '@ant-design/pro-layout';
import {
  EditOutlined,
  FilePdfOutlined,
  CloseCircleOutlined,
  RetweetOutlined,
  MailOutlined,
  DeleteOutlined,
} from '@ant-design/icons';

import { useSelector, useDispatch } from 'react-redux';
import useLanguage from '@/locale/useLanguage';
import { erp } from '@/redux/erp/actions';

import { generate as uniqueId } from 'shortid';

import { selectCurrentItem } from '@/redux/erp/selectors';
import { selectWarehouseOptions } from '@/redux/settings/selectors';

import { DOWNLOAD_BASE_URL } from '@/config/serverApiConfig';
import { useMoney, useDate } from '@/settings';
import useMail from '@/hooks/useMail';
import { useNavigate, useLocation } from 'react-router-dom';
import { request } from '@/request';
import { multilineStyle } from '@/utils/renderMultilineText';

const Item = ({ item, currentErp }) => {
  return (
    <Row gutter={[12, 0]} key={item._id}>
      <Col className="gutter-row" span={15}>
        <p style={{ marginBottom: 5 }}>
          <strong>{item.itemName}</strong>
        </p>
        <p style={multilineStyle}>{item.description}</p>
      </Col>
      <Col className="gutter-row" span={9}>
        <p
          style={{
            textAlign: 'right',
          }}
        >
          {item.quantity}
        </p>
      </Col>
      <Divider dashed style={{ marginTop: 0, marginBottom: 15 }} />
    </Row>
  );
};

const MaterialRow = ({ material, moneyFormatter, currency, warehouseOptions }) => {
  const warehouseLabel = material.warehouse
    ? (warehouseOptions?.find((o) => o.value === material.warehouse)?.label || `${material.warehouse} / -`)
    : '-';
  return (
  <Row gutter={[12, 0]}>
    <Col span={4}>{warehouseLabel}</Col>
    <Col span={8}><strong>{material.itemName}</strong></Col>
    <Col span={4} style={{ textAlign: 'right' }}>{material.quantity != null ? Number(material.quantity).toFixed(2) : '-'}</Col>
    <Col span={8} style={{ textAlign: 'right', color: (material.price || 0) < 0 ? '#ff4d4f' : undefined }}>
      {moneyFormatter({ amount: material.price ?? 0, currency_code: currency })}
    </Col>
    <Divider dashed style={{ marginTop: 0, marginBottom: 15 }} />
  </Row>
  );
};

export default function SupplierQuoteReadItem({ config, selectedItem }) {
  const translate = useLanguage();
  const { entity, ENTITY_NAME } = config;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const fromProject = location.state?.fromProject;

  const { moneyFormatter } = useMoney();
  const { send, isLoading: mailInProgress } = useMail({ entity });

  const { result: currentResult } = useSelector(selectCurrentItem);
  const warehouseOptions = useSelector(selectWarehouseOptions);

  const resetErp = {
    status: '',
    clients: [],
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
    
    // Debug file data
    if (currentErp?.dmFiles?.length > 0) {
      console.log('🔍 DM Files received in frontend:', currentErp.dmFiles);
      currentErp.dmFiles.forEach((file, index) => {
        console.log(`📄 DM File ${index + 1}:`, file);
        console.log(`  fileName: ${file.fileName} (type: ${typeof file.fileName})`);
      });
    }
    if (currentErp?.invoiceFiles?.length > 0) {
      console.log('🔍 Invoice Files received in frontend:', currentErp.invoiceFiles);
      currentErp.invoiceFiles.forEach((file, index) => {
        console.log(`📄 Invoice File ${index + 1}:`, file);
        console.log(`  fileName: ${file.fileName} (type: ${typeof file.fileName})`);
      });
    }
  }, [currentErp]);

  useEffect(() => {
    if (currentErp?.items) {
      setItemsList(currentErp.items);
    }
  }, [currentErp]);

  // 處理文件名編碼
  const decodeFileName = (fileName) => {
    try {
      // Try to decode if it's URL encoded
      if (fileName.includes('%')) {
        return decodeURIComponent(fileName);
      }
      
      // Try to fix common encoding issues
      if (fileName.includes('�')) {
        // This indicates encoding issues, try to decode from latin1
        const bytes = [];
        for (let i = 0; i < fileName.length; i++) {
          bytes.push(fileName.charCodeAt(i));
        }
        const buffer = new Uint8Array(bytes);
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(buffer);
      }
      
      return fileName;
    } catch (error) {
      console.log('Filename decoding error:', error);
      return fileName;
    }
  };

  // 處理文件刪除
  const handleDeleteFile = (fileId, fileType, fileName) => {
    Modal.confirm({
      title: '確認刪除文件',
      content: (
        <div>
          <p>您確定要刪除此文件嗎？</p>
          <p><strong>文件名：</strong>{fileName}</p>
          <p style={{ color: '#ff4d4f', marginTop: 12 }}>⚠️ 此操作不可撤銷</p>
        </div>
      ),
      okText: '確認刪除',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          const response = await request.deleteFile({ 
            entity: 'supplierquote', 
            id: currentErp._id, 
            fileId, 
            fileType 
          });
          
          if (response && response.success) {
            message.success('文件刪除成功！');
            // 重新載入數據
            dispatch(erp.read({ entity, id: currentErp._id }));
          } else {
            message.error('刪除失敗：' + (response?.message || '未知錯誤'));
          }
        } catch (error) {
          console.error('刪除文件錯誤:', error);
          message.error('刪除過程中發生錯誤');
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
        title={`${entity === 'supplierquote' ? (currentErp.numberPrefix || 'S') + '單' : ENTITY_NAME} # ${currentErp.number}/${currentErp.year || ''}`}
        ghost={false}
        tags={[
          <Tag key="status" color={currentErp.status === 'draft' ? 'blue' : 'green'}>
            {currentErp.status && translate(currentErp.status)}
          </Tag>,
        ]}
        extra={[
          <Button
            key={`${uniqueId()}`}
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
          </Button>,
          <Button
            key={`${uniqueId()}`}
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
          </Button>,
          <Button
            key={`${uniqueId()}`}
            loading={mailInProgress}
            onClick={() => {
              send(currentErp._id);
            }}
            icon={<MailOutlined />}
          >
            {translate('Send by Email')}
          </Button>,
          <Button
            key={`${uniqueId()}`}
            onClick={() => {
              dispatch(erp.convert({ entity, id: currentErp._id }));
            }}
            icon={<RetweetOutlined />}
            style={{ display: entity === 'supplierquote' ? 'inline-block' : 'none' }}
          >
            {translate('Convert to Invoice')}
          </Button>,

          <Button
            key={`${uniqueId()}`}
            onClick={() => {
              dispatch(
                erp.currentAction({
                  actionType: 'update',
                  data: currentErp,
                })
              );
              // 使用table form的編輯URL
              navigate(`/${entity.toLowerCase()}/table/update/${currentErp._id}`);
            }}
            type="primary"
            icon={<EditOutlined />}
          >
            {translate('Edit')}
          </Button>,
        ]}
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
      
      <Descriptions title={translate('Supplier Quote Details')}>
        <Descriptions.Item label="Supplier Type">{currentErp.numberPrefix && currentErp.numberPrefix !== 'XX' ? currentErp.numberPrefix : '-'}</Descriptions.Item>
        <Descriptions.Item label={translate('Number')}>{currentErp.number}</Descriptions.Item>
        <Descriptions.Item label={translate('Year')}>{currentErp.year}</Descriptions.Item>
        <Descriptions.Item label={translate('Type')}>{currentErp.type}</Descriptions.Item>
        {currentErp.type === '吊船' && currentErp.shipType && (
          <Descriptions.Item label={translate('Ship Type')}>{currentErp.shipType}</Descriptions.Item>
        )}
        <Descriptions.Item label="Quote Number">{currentErp.invoiceNumber || '-'}</Descriptions.Item>
        <Descriptions.Item label="對方Invoice Number">{currentErp.counterpartyInvoiceNumber || '-'}</Descriptions.Item>
        <Descriptions.Item label="簽收單聯絡人">{currentErp.contactPerson || '-'}</Descriptions.Item>
        <Descriptions.Item label="簽收單收貨人地址">
          <span style={{ whiteSpace: 'pre-wrap' }}>{currentErp.receiver || '-'}</span>
        </Descriptions.Item>
        <Descriptions.Item label="簽收單顯示名稱">{currentErp.receiptDisplayName || '-'}</Descriptions.Item>
        <Descriptions.Item label="裝箱方式">{currentErp.packingMethod || '-'}</Descriptions.Item>
        <Descriptions.Item label={translate('Subcontractor Count')}>{currentErp.subcontractorCount || '-'}</Descriptions.Item>
        <Descriptions.Item label={translate('Cost Price')}>{currentErp.costPrice != null && currentErp.costPrice !== '' ? moneyFormatter({ amount: currentErp.costPrice }) : '-'}</Descriptions.Item>
        <Descriptions.Item label={translate('Completed')}>{currentErp.isCompleted ? translate('Yes') : translate('No')}</Descriptions.Item>
        <Descriptions.Item label={translate('Warehouse')}>
          {currentErp.warehouse
            ? (warehouseOptions?.find((o) => o.value === currentErp.warehouse)?.label || `${currentErp.warehouse} / -`)
            : '-'}
        </Descriptions.Item>
        {currentErp.ship && (
          <Descriptions.Item label="船隻">
            <Tag color="blue">{currentErp.ship.registrationNumber || '—'}</Tag>
          </Descriptions.Item>
        )}
        {currentErp.winch && (
          <Descriptions.Item label="爬攬器">
            <Tag color="green">{currentErp.winch.serialNumber || '—'}</Tag>
          </Descriptions.Item>
        )}
        <Descriptions.Item label="修改時間">{currentErp.modified_at ? dayjs(currentErp.modified_at).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
        <Descriptions.Item label="修改人">{currentErp.updatedBy ? (currentErp.updatedBy.name + (currentErp.updatedBy.surname ? ' ' + currentErp.updatedBy.surname : '') || currentErp.updatedBy.email || '-') : '-'}</Descriptions.Item>
      </Descriptions>
      
      <Row gutter={[12, 0]} style={{ marginTop: 16, marginBottom: 16 }}>
        <Col span={12}>
          <p><strong>{translate('Project Address')}:</strong></p>
          <p>{currentErp.address || '-'}</p>
        </Col>
        <Col span={12}>
          <p><strong>倉庫:</strong></p>
          <p>
            {currentErp.warehouse
              ? (warehouseOptions?.find((o) => o.value === currentErp.warehouse)?.label || `${currentErp.warehouse} / -`)
              : '-'}
          </p>
        </Col>
      </Row>
      
      <Descriptions title="文件信息">
        <Descriptions.Item label="DN文件" span={3}>
          {currentErp.dmFiles && currentErp.dmFiles.length > 0 ? (
            <div>
              {currentErp.dmFiles.map((file, index) => (
                <div key={index} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Tag style={{ marginBottom: 0 }}>
                    <a href={`http://localhost:8888/uploads/supplierquote/${file.fileName || file.path?.split('/').pop()}`} target="_blank" rel="noopener noreferrer">
                      {decodeFileName(file.name)}
                    </a>
                  </Tag>
                  <Button 
                    type="text" 
                    size="small" 
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteFile(file.id, 'dm', file.name)}
                    title="刪除文件"
                  />
                </div>
              ))}
            </div>
          ) : (
            '-'
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Invoice文件" span={3}>
          {currentErp.invoiceFiles && currentErp.invoiceFiles.length > 0 ? (
            <div>
              {currentErp.invoiceFiles.map((file, index) => (
                <div key={index} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Tag style={{ marginBottom: 0 }}>
                    <a href={`http://localhost:8888/uploads/supplierquote/${file.fileName || file.path?.split('/').pop()}`} target="_blank" rel="noopener noreferrer">
                      {decodeFileName(file.name)} ({file.fileType?.toUpperCase()})
                    </a>
                  </Tag>
                  <Button 
                    type="text" 
                    size="small" 
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteFile(file.id, 'invoice', file.name)}
                    title="刪除文件"
                  />
                </div>
              ))}
            </div>
          ) : (
            '-'
          )}
        </Descriptions.Item>
      </Descriptions>
      <Divider />
      <Row gutter={[12, 0]}>
        <Col className="gutter-row" span={15}>
          <p>
            <strong>{translate('Product')}</strong>
          </p>
        </Col>
        <Col className="gutter-row" span={9}>
          <p
            style={{
              textAlign: 'right',
            }}
          >
            <strong>{translate('Quantity')}</strong>
          </p>
        </Col>
      </Row>
      {itemslist.map((item) => (
        <Item key={item._id} item={item} currentErp={currentErp} />
      ))}
      {(currentErp?.materials?.length ?? 0) > 0 && (
        <>
          <Divider orientation="left">材料及費用管理</Divider>
          <Row gutter={[12, 0]} style={{ marginBottom: 16 }}>
            <Col span={4}><strong>{translate('Warehouse')}</strong></Col>
            <Col span={8}><strong>{translate('Item')}</strong></Col>
            <Col span={4} style={{ textAlign: 'right' }}><strong>{translate('Quantity')}</strong></Col>
            <Col span={8} style={{ textAlign: 'right' }}><strong>{translate('Price')}</strong></Col>
          </Row>
          {currentErp.materials.map((material, index) => (
            <MaterialRow
              key={material.key ?? material._id ?? index}
              material={{ ...material, key: material.key ?? material._id ?? index }}
              moneyFormatter={moneyFormatter}
              currency={currentErp.currency}
              warehouseOptions={warehouseOptions}
            />
          ))}
        </>
      )}
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
    </>
  );
}
