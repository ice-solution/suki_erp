import { ErpContextProvider } from '@/context/erp';

import { Layout } from 'antd';

const { Content } = Layout;

/** 預設 1100；報價／吊船報價可傳 maxWidth 加闊（唔影響其他模組） */
export default function ErpLayout({ children, maxWidth = 1100 }) {
  return (
    <ErpContextProvider>
      <Content
        className="whiteBox shadow layoutPadding"
        style={{
          margin: '30px auto',
          width: '100%',
          maxWidth,
          minHeight: '600px',
        }}
      >
        {children}
      </Content>
    </ErpContextProvider>
  );
}
