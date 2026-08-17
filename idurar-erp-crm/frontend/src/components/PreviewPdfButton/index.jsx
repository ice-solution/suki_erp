import { useState } from 'react';
import { Button, Modal } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { DOWNLOAD_BASE_URL } from '@/config/serverApiConfig';
import useLanguage from '@/locale/useLanguage';

/**
 * @param {{ entity: string, id: string, variant?: 'finish'|null, modifiedAt?: any, preview?: boolean }} opts
 */
export function buildDocumentPdfUrl({ entity, id, variant = null, modifiedAt, preview = false }) {
  const v = encodeURIComponent(String(modifiedAt || Date.now()));
  const file =
    variant === 'finish' ? `${entity}-finish-${id}.pdf` : `${entity}-${id}.pdf`;
  const qs = preview ? `v=${v}&preview=1` : `v=${v}`;
  return `${DOWNLOAD_BASE_URL}${entity}/${file}?${qs}`;
}

/**
 * Read 頁：下載旁邊的 PDF 預覽（Modal + iframe）
 */
export default function PreviewPdfButton({
  entity,
  id,
  variant = null,
  modifiedAt,
  label,
}) {
  const translate = useLanguage();
  const [open, setOpen] = useState(false);
  const title = label || translate('preview_pdf');
  const url = buildDocumentPdfUrl({
    entity,
    id,
    variant,
    modifiedAt,
    preview: true,
  });

  if (!entity || !id) return null;

  return (
    <>
      <Button icon={<EyeOutlined />} onClick={() => setOpen(true)}>
        {title}
      </Button>
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width="92%"
        style={{ top: 16 }}
        styles={{ body: { height: '82vh', padding: 0 } }}
        destroyOnClose
        title={title}
      >
        <iframe
          title={title}
          src={url}
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </Modal>
    </>
  );
}
