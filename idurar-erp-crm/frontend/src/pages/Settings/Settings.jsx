import {
  SettingOutlined,
  CreditCardOutlined,
  DollarOutlined,
  FileImageOutlined,
  TrophyOutlined,
  BuildOutlined,
  InboxOutlined,
  UserOutlined,
} from '@ant-design/icons';

import TabsContent from '@/components/TabsContent/TabsContent';

import CompanyLogoSettings from './CompanyLogoSettings';
import CompanyLogoByTypeSettings from './CompanyLogoByTypeSettings';
import GeneralSettings from './GeneralSettings';
import CompanySettings from './CompanySettings';
import FinanceSettings from './FinanceSettings';
import MoneyFormatSettings from './MoneyFormatSettings';
import ProjectItemSettings from './ProjectItemSettings';
import WarehouseSettings from './WarehouseSettings';
import ItemUnitSettings from './ItemUnitSettings';
import WarehouseItemCategorySettings from './WarehouseItemCategorySettings';
import AccountSettings from './AccountSettings';

import useLanguage from '@/locale/useLanguage';
import { useParams } from 'react-router-dom';

export default function Settings() {
  const translate = useLanguage();
  const { settingsKey } = useParams();
  const content = [
    {
      key: 'general_settings',
      label: translate('General Settings'),
      icon: <SettingOutlined />,
      children: <GeneralSettings />,
    },
    {
      key: 'company_settings',
      label: translate('Company Settings'),
      icon: <TrophyOutlined />,
      children: <CompanySettings />,
    },
    {
      key: 'company_logo',
      label: translate('Company Logo'),
      icon: <FileImageOutlined />,
      children: <CompanyLogoSettings />,
    },
    {
      key: 'company_logo_by_type',
      label: '依單據類型 Logo',
      icon: <FileImageOutlined />,
      children: <CompanyLogoByTypeSettings />,
    },
    {
      key: 'currency_settings',
      label: translate('Currency Settings'),
      icon: <DollarOutlined />,
      children: <MoneyFormatSettings />,
    },
    {
      key: 'finance_settings',
      label: translate('Finance Settings'),
      icon: <CreditCardOutlined />,
      children: <FinanceSettings />,
    },
    {
      key: 'project_items',
      label: '工程項目管理',
      icon: <BuildOutlined />,
      children: <ProjectItemSettings />,
    },
    {
      key: 'warehouse_settings',
      label: '倉庫設定',
      icon: <InboxOutlined />,
      children: <WarehouseSettings />,
    },
    {
      key: 'item_unit_settings',
      label: 'Items 單位',
      icon: <BuildOutlined />,
      children: <ItemUnitSettings />,
    },
    {
      key: 'warehouse_item_category_settings',
      label: '倉存類別',
      icon: <InboxOutlined />,
      children: <WarehouseItemCategorySettings />,
    },
    {
      key: 'account_settings',
      label: '登入帳號',
      icon: <UserOutlined />,
      children: <AccountSettings />,
    },
  ];

  const pageTitle = translate('Settings');

  return <TabsContent defaultActiveKey={settingsKey} content={content} pageTitle={pageTitle} />;
}
