import { Layout, Typography } from 'antd';
import logo from '@/style/images/supermax-logo.png';

const { Content } = Layout;
const { Title, Text } = Typography;

export default function SideContent() {
  return (
    <Content
      style={{
        padding: '150px 30px 30px',
        width: '100%',
        maxWidth: '450px',
        margin: '0 auto',
      }}
      className="sideContent"
    >
      <div style={{ width: '100%' }}>
        <img
          src={logo}
          alt="Supermax"
          style={{
            margin: '0 0 40px',
            display: 'block',
            height: 120,
            width: 'auto',
            objectFit: 'contain',
            borderRadius: 10,
          }}
        />

        <Title level={1} style={{ fontSize: 28 }}>
          Supermax ERP 工程管理系統
        </Title>
        <Text>
          專業的工程項目管理平台 <b /> 提供完整的項目追蹤和管理解決方案
        </Text>

        <div className="space20"></div>
      </div>
    </Content>
  );
}
