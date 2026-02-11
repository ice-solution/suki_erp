import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, message, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { PageHeader } from '@ant-design/pro-layout';
import { settingsAction } from '@/redux/settings/actions';
import { selectCompanySettings } from '@/redux/settings/selectors';
import { BASE_URL } from '@/config/serverApiConfig';

const LOGO_OPTIONS = [
  { key: 'company_logo', label: '預設 / 通用', desc: 'Invoice、Quote 等未指定類型時使用' },
  { key: 'company_logo_no', label: '永順 (NO)', desc: 'S單 類型 NO' },
  { key: 'company_logo_po', label: '永順 (PO)', desc: 'S單 類型 PO' },
  { key: 'company_logo_s', label: '超越 (S)', desc: 'S單 類型 S、Ship Quote 租貨' },
  { key: 'company_logo_swp', label: '超越 (SWP)', desc: 'S單 類型 SWP' },
  { key: 'company_logo_e', label: '廠用 (E)', desc: 'S單 類型 E' },
  { key: 'company_logo_y', label: '有榮 (Y)', desc: 'S單 類型 Y' },
  { key: 'company_logo_sml', label: 'SML 報價', desc: 'Quote SML、Ship Quote 續租' },
];

function logoImageSrc(path) {
  if (!path) return null;
  const p = path.startsWith('public/') ? path.replace('public/', '') : path;
  return `${BASE_URL}${p}`;
}

export default function CompanyLogoByTypeSettingsModule() {
  const dispatch = useDispatch();
  const companySettings = useSelector(selectCompanySettings) || {};

  useEffect(() => {
    dispatch(settingsAction.list({ entity: 'setting' }));
  }, [dispatch]);

  const handleUpload = (settingKey, file) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgOrPng) {
      message.error('只能上傳 JPG/PNG 檔案');
      return;
    }
    if (file.size / 1024 / 1024 >= 5) {
      message.error('圖片須小於 5MB');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    dispatch(
      settingsAction.upload({
        entity: 'setting',
        settingKey,
        jsonData: formData,
      })
    );
  };

  return (
    <>
      <PageHeader
        title="依單據類型設定公司 Logo"
        subTitle="不同 S單 類型或報價類型可對應不同 Logo，產生 PDF 時會自動使用對應的 Logo"
        style={{ padding: '20px 0' }}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {LOGO_OPTIONS.map(({ key, label, desc }) => {
          const path = companySettings[key];
          const src = logoImageSrc(path);
          return (
            <Card
              key={key}
              title={label}
              size="small"
              style={{ width: 220 }}
              extra={
                <Upload
                  accept="image/png, image/jpeg"
                  showUploadList={false}
                  beforeUpload={(file) => {
                    handleUpload(key, file);
                    return false;
                  }}
                >
                  <span style={{ cursor: 'pointer', fontSize: 12 }}>
                    <UploadOutlined /> 上傳
                  </span>
                </Upload>
              }
            >
              <div style={{ textAlign: 'center', marginBottom: 8 }}>
                {src ? (
                  <img
                    src={src}
                    alt={label}
                    style={{ maxWidth: '100%', maxHeight: 80, objectFit: 'contain' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div style={{ height: 80, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#999' }}>
                    尚未上傳
                  </div>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#666' }}>{desc}</div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
