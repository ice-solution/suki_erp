import SetingsSection from '../components/SetingsSection';
import UpdateSettingModule from '../components/UpdateSettingModule';
import LastNumberSettingsForm from './SettingsForm';
import useLanguage from '@/locale/useLanguage';

export default function LastNumberSettingsModule({ config }) {
  const translate = useLanguage();
  return (
    <UpdateSettingModule config={config}>
      <SetingsSection
        title="最後號碼"
        description="管理報價單、SMI／WSE 發票與 S 單各類型的最後編號，以及報價預設供應商"
      >
        <LastNumberSettingsForm />
      </SetingsSection>
    </UpdateSettingModule>
  );
}
